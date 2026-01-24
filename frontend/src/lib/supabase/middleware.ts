import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function getClientIPFromRequest(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map((ip) => ip.trim());
    return ips[0];
  }
  const realIP = request.headers.get("x-real-ip");
  if (realIP) return realIP;
  const cfConnectingIP = request.headers.get("cf-connecting-ip");
  if (cfConnectingIP) return cfConnectingIP;
  return "127.0.0.1";
}

async function checkIPBlocked(
  request: NextRequest, 
  ipAddress: string, 
  pathname: string
): Promise<{ blocked: boolean; error: boolean }> {
  // Use absolute URL for fetch in middleware
  const url = new URL("/api/blocked-ips/check", request.url);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-skip-middleware": "true",
      },
      body: JSON.stringify({
        ipAddress,
        path: pathname,
        method: request.method,
        userAgent: request.headers.get("user-agent"),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[Middleware] IP check failed with status: ${response.status}`);
      return { blocked: false, error: true };
    }

    const result = await response.json();
    return { blocked: !!result.blocked, error: false };
  } catch (error) {
    console.error("[Middleware] IP check fetch failed:", error);
    return { blocked: false, error: true };
  }
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip middleware for internal checks or the IP check API itself
  if (pathname.startsWith("/api/blocked-ips/check") || request.headers.get("x-internal-skip-middleware") === "true") {
    return NextResponse.next({ request });
  }

  const ipAddress = getClientIPFromRequest(request);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Use Anon Key instead of Service Role Key in Edge Runtime
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, {
              ...options,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax" as const,
              path: "/",
            });
          });
        },
      },
    }
  );

  const isBlockCheckRequired =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/invite") ||
    pathname.startsWith("/app") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/invitations");

    if (isBlockCheckRequired) {
      const { blocked, error } = await checkIPBlocked(request, ipAddress, pathname);
      
      // Fail-closed for /admin and /app routes if check fails or errors
      const isPrivilegedRoute = pathname.startsWith("/admin") || pathname.startsWith("/app");
      
      // Relaxed check for development or localhost to prevent being locked out
      const isDevelopment = process.env.NODE_ENV === "development";
      const isLocalhost = ipAddress === "127.0.0.1" || ipAddress === "::1" || ipAddress === "localhost";
      const shouldFailClosed = !isDevelopment || !isLocalhost;
      
      if (blocked || (error && isPrivilegedRoute && shouldFailClosed)) {
        console.warn(`[Middleware] Blocking request for IP ${ipAddress} on ${pathname}. Reason: ${blocked ? 'IP Blocked' : 'Security Check Error (Fail-Closed)'}`);
        return new NextResponse(
          JSON.stringify({ 
            error: "Access denied", 
            message: blocked ? "Your IP has been blocked." : "Security check failed. Please try again later." 
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      } else if (error && isPrivilegedRoute) {
        console.warn(`[Middleware] Security check failed for IP ${ipAddress} but allowed due to development/localhost bypass.`);
      }
    }

  const isProtectedRoute = pathname.startsWith("/app") || pathname.startsWith("/admin");
  const isStatusPageRoute = 
    pathname === "/org-blocked" || 
    pathname === "/app/pending" || 
    pathname === "/app/access-suspended";

  const hasSupabaseCookie = request.cookies.getAll().some(
    (cookie) => cookie.name.includes("sb-")
  );
  const hasDeviceSession = request.cookies.has("device_session");
  const hasAnyAuthCookie = hasSupabaseCookie || hasDeviceSession;

  if (isProtectedRoute && !isStatusPageRoute) {
    if (!hasAnyAuthCookie) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    if (hasSupabaseCookie) {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (!user || error) {
        if (!hasDeviceSession) {
          const url = request.nextUrl.clone();
          url.pathname = "/login";
          url.searchParams.set("redirect", pathname);
          
          const redirectResponse = NextResponse.redirect(url);
          supabaseResponse.cookies.getAll().forEach((cookie) => {
            redirectResponse.cookies.set(cookie.name, cookie.value, {
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax" as const,
              path: "/",
            });
          });
          return redirectResponse;
        }
      } else {
        // Fetch user metadata/status using the authenticated supabase client
          const { data: userData } = await supabase
            .from("User")
            .select(`
              id,
              isPlatformAdmin,
              memberships:Membership (
                status,
                organization:Organization (
                  id,
                  status,
                  slug
                )
              ),
              employeeUserLinks:EmployeeUserLink (
                status,
                organizationId
              )
            `)
            .eq("supabaseId", user.id)
            .single();

            if (userData) {
              // Enforce platform admin for /admin routes
              if (pathname.startsWith("/admin")) {
                if (!userData.isPlatformAdmin) {
                  const url = request.nextUrl.clone();
                  url.pathname = "/app/access-denied";
                  return NextResponse.redirect(url);
                }
                // Platform admins can always access /admin routes
                return supabaseResponse;
              }

                const memberships = (userData.memberships || []) as any[];
                const employeeLinks = (userData.employeeUserLinks || []) as any[];

                // Check for revoked access globally
                const hasRevokedEmployeeLink = employeeLinks.some((l: any) => l.status === "REVOKED");
                const hasRevokedMembership = memberships.some((m) => m.status === "REVOKED");
                
                if ((hasRevokedEmployeeLink || hasRevokedMembership) && pathname !== "/app/access-suspended") {
                  const url = request.nextUrl.clone();
                  url.pathname = "/app/access-suspended";
                  return NextResponse.redirect(url);
                }

                const isEmployeePortal = pathname.startsWith("/app/employee");

                if (isEmployeePortal) {
                  // For employee portal, check if their employee link is revoked (already handled globally above, but keeping for safety)
                  if (hasRevokedEmployeeLink && pathname !== "/app/access-suspended") {
                    const url = request.nextUrl.clone();
                    url.pathname = "/app/access-suspended";
                    return NextResponse.redirect(url);
                  }
                } else {
                  // For admin dashboard, check if their membership is revoked
                  // Only block if ALL memberships are revoked or if we can identify the current one
                  // For now, if they have at least one ACTIVE membership, let them through to the app
                  const hasActiveMembership = memberships.some((m) => m.status === "ACTIVE" && m.organization?.status === "ACTIVE");
                  const hasSuspendedMembership = memberships.some((m) => m.status === "SUSPENDED" || m.status === "REVOKED");
                  
                  // If they have NO active memberships but have suspended ones, block them (revoked already handled globally)
                  if (!hasActiveMembership && hasSuspendedMembership && pathname !== "/app/access-suspended") {
                    const url = request.nextUrl.clone();
                    url.pathname = "/app/access-suspended";
                    return NextResponse.redirect(url);
                  }

                const hasSuspendedOrg = memberships.some((m) => m.organization?.status === "SUSPENDED");
                if (hasSuspendedOrg && !hasActiveMembership) {
                  if (pathname !== "/org-blocked") {
                    const url = request.nextUrl.clone();
                    url.pathname = "/org-blocked";
                    return NextResponse.redirect(url);
                  }
                }

                if (!hasActiveMembership) {
                  if (pathname !== "/app/pending" && pathname !== "/app/setup" && pathname !== "/app/access-suspended") {
                    const url = request.nextUrl.clone();
                    url.pathname = "/app/pending";
                    return NextResponse.redirect(url);
                  }
                }
              }
            }
      }
    }
  } else if (hasSupabaseCookie) {
    await supabase.auth.getUser();
  }

  return supabaseResponse;
}
