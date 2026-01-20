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
  ipAddress: string
): Promise<boolean> {
  try {
    const baseUrl = request.nextUrl.origin;
    const response = await fetch(`${baseUrl}/api/blocked-ips/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ipAddress,
        path: request.nextUrl.pathname,
        method: request.method,
        userAgent: request.headers.get("user-agent") || undefined,
      }),
    });
    const data = await response.json();
    return data.blocked === true;
  } catch (error) {
    console.error("IP block check failed:", error);
    return false;
  }
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api/blocked-ips/check")) {
    return NextResponse.next({ request });
  }

  const ipAddress = getClientIPFromRequest(request);

  const isBlockCheckRequired =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/invite") ||
    pathname.startsWith("/app") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/invitations");

  if (isBlockCheckRequired) {
    const isBlocked = await checkIPBlocked(request, ipAddress);
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

  const { data: { user } } = await supabase.auth.getUser();

  const isProtectedRoute = pathname.startsWith("/app");

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Don't redirect authenticated users away from /login - they may need to log out

  return supabaseResponse;
}
