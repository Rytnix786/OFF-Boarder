import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
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
  try {
    // Create an admin client to check IP blocks directly in the database
    // This avoids the internal fetch timeout and AbortError
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
        }
      }
    );

    const now = new Date().toISOString();
    
    // Direct query to BlockedIP table
    const { data: block, error } = await supabaseAdmin
      .from("BlockedIP")
      .select("id, organizationId")
      .eq("ipAddress", ipAddress)
      .eq("isActive", true)
      .or(`expiresAt.is.null,expiresAt.gt.${now}`)
      .order("scope", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[Middleware] IP check query failed:", error);
      return { blocked: false, error: true };
    }

    if (block) {
      // Background recording of the attempt
      supabaseAdmin
        .from("BlockedIPAttempt")
        .insert({
          ipAddress,
          blockedIPId: block.id,
          path: pathname,
          method: request.method,
          userAgent: request.headers.get("user-agent"),
        })
        .then(({ error: insertError }) => {
          if (insertError) console.error("[Middleware] Failed to record blocked attempt:", insertError);
        });

      return { blocked: true, error: false };
    }

    return { blocked: false, error: false };
  } catch (error) {
    console.error("[Middleware] IP check logic failed:", error);
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
      (pathname.startsWith("/api/") && !pathname.startsWith("/api/blocked-ips/check") && !pathname.startsWith("/api/platform/auth/sign-out"));

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
                  systemRole,
                  organization:Organization (
                    id,
                    status,
                    slug,
                    isSetupComplete
                  )
                ),

              employeeUserLinks:EmployeeUserLink (
                status,
                organizationId,
                accessExpiresAt
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

                    // Check for revoked access
                    // We only block if they have a revoked link AND they are trying to access the employee portal
                    // or if they have a revoked membership and are trying to access the admin dashboard.
                    // A user might be revoked in one org but active in another, so we must be careful.
                    const isEmployeePortal = pathname.startsWith("/app/employee");
                      const hasRevokedEmployeeLink = employeeLinks.some((l: any) => {
                        if (l.status !== "REVOKED") return false;
                        // If it's revoked but has a future expiry, it's NOT considered "revoked" for blocking purposes
                        // Add a 30-second buffer to prevent flickering near the expiration boundary
                        if (l.accessExpiresAt) {
                          const expiryDate = new Date(l.accessExpiresAt);
                          const nowWithBuffer = new Date(Date.now() - 30000); // 30 second buffer
                          if (expiryDate > nowWithBuffer) return false;
                        }
                        return true;
                      });
                    const hasActiveEmployeeLink = employeeLinks.some((l: any) => l.status === "VERIFIED" || l.status === "PENDING_VERIFICATION");
                    const hasRevokedMembership = memberships.some((m) => m.status === "REVOKED");
                    const hasActiveMembership = memberships.some((m) => m.status === "ACTIVE" && m.organization?.status === "ACTIVE");
                    
                    // Compliance routes allowed even for revoked users (grace period for attestation/asset return)
                    const complianceGraceRoutes = [
                      "/app/employee/attestation",
                      "/app/employee/assets",
                      "/app/access-suspended",
                    ];
                    const isComplianceGraceRoute = complianceGraceRoutes.some(route => pathname.startsWith(route));
                    
                    // If they are on employee portal, check their employee link status
                    if (isEmployeePortal && !isComplianceGraceRoute) {
                      // Only block if they have NO active/verified link and have a revoked link
                      if (hasRevokedEmployeeLink && !hasActiveEmployeeLink) {
                        const url = request.nextUrl.clone();
                        url.pathname = "/app/access-suspended";
                        return NextResponse.redirect(url);
                      }
                    }
                    
                    // If they are on admin app (not employee portal), check membership status
                    if (!isEmployeePortal && !pathname.startsWith("/admin") && !isComplianceGraceRoute && !isStatusPageRoute) {
                      // Only block if they have NO active membership and have a revoked/suspended one
                      if (!hasActiveMembership && (hasRevokedMembership || memberships.some(m => m.status === "SUSPENDED"))) {
                        const url = request.nextUrl.clone();
                        url.pathname = "/app/access-suspended";
                        return NextResponse.redirect(url);
                      }
                    }

                    // Original logic for organization status and pending state
                    if (isEmployeePortal) {
                        // Employee portal access is handled above
                    } else {
                      // Admin app specific checks
                      const hasSuspendedOrg = memberships.some((m) => m.organization?.status === "SUSPENDED");
                      if (hasSuspendedOrg && !hasActiveMembership) {
                        if (pathname !== "/org-blocked") {
                          const url = request.nextUrl.clone();
                          url.pathname = "/org-blocked";
                          return NextResponse.redirect(url);
                        }
                      }
  
                      if (!hasActiveMembership) {
                        if (pathname !== "/app/pending" && pathname !== "/app/setup" && pathname !== "/app/access-suspended" && pathname !== "/app/access-denied") {
                          const url = request.nextUrl.clone();
                          url.pathname = "/app/pending";
                          return NextResponse.redirect(url);
                        }
                      } else {
                        // Check if setup is complete for owners
                        const activeMembership = memberships.find(m => m.status === "ACTIVE" && m.organization?.status === "ACTIVE");
                        if (activeMembership && !activeMembership.organization?.isSetupComplete && activeMembership.systemRole === "OWNER") {
                          const isSetupRoute = pathname.startsWith("/app/setup");
                          const isProfileRoute = pathname.startsWith("/app/settings/profile");
                          
                          if (!isSetupRoute && !isProfileRoute && pathname.startsWith("/app")) {
                            const url = request.nextUrl.clone();
                            url.pathname = "/app/setup";
                            return NextResponse.redirect(url);
                          }
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
