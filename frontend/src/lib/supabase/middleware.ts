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
  supabase: any,
  ipAddress: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("BlockedIP")
      .select("id")
      .eq("ipAddress", ipAddress)
      .eq("isActive", true)
      .or("expiresAt.is.null,expiresAt.gt.now()")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("IP block query error:", error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error("IP block check failed:", error);
    return false;
  }
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

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
    pathname.startsWith("/invite") ||
    pathname.startsWith("/app") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/invitations");

  if (isBlockCheckRequired) {
    const isBlocked = await checkIPBlocked(supabase, ipAddress);
    if (isBlocked) {
      return new NextResponse(
        JSON.stringify({ error: "Access denied" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  const isProtectedRoute = pathname.startsWith("/app");
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
        // Fix 2: Redirect suspended users directly in middleware to avoid hops
        const { data: userData } = await supabase
          .from("User")
          .select(`
            id,
            memberships:Membership (
              status,
              organization:Organization (
                status,
                slug
              )
            )
          `)
          .eq("supabaseId", user.id)
          .single();

        if (userData?.memberships?.length > 0) {
          // Find active membership or first one
          const membership = userData.memberships.find((m: any) => m.status === "ACTIVE") || userData.memberships[0];
          const orgStatus = membership.organization.status;
          const memStatus = membership.status;

          if (memStatus === "SUSPENDED" || memStatus === "REVOKED") {
            if (pathname !== "/app/access-suspended") {
              const url = request.nextUrl.clone();
              url.pathname = "/app/access-suspended";
              return NextResponse.redirect(url);
            }
          } else if (orgStatus === "SUSPENDED") {
            if (pathname !== "/org-blocked") {
              const url = request.nextUrl.clone();
              url.pathname = "/org-blocked";
              return NextResponse.redirect(url);
            }
          } else if (orgStatus !== "ACTIVE") {
            if (pathname !== "/app/pending" && pathname !== "/app/setup") {
              const url = request.nextUrl.clone();
              url.pathname = "/app/pending";
              return NextResponse.redirect(url);
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

