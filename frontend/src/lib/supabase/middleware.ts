import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const IP_CHECK_CACHE_TTL_MS = 5 * 60 * 1000;
const IP_CHECK_COOKIE_NAME = "_ip_ck";

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
): Promise<{ blocked: boolean; shouldCache: boolean }> {
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
    return { blocked: data.blocked === true, shouldCache: true };
  } catch (error) {
    console.error("IP block check failed:", error);
    return { blocked: false, shouldCache: false };
  }
}

function getCachedIPCheck(request: NextRequest, ipAddress: string): { valid: boolean; allowed: boolean } {
  const cookie = request.cookies.get(IP_CHECK_COOKIE_NAME);
  if (!cookie?.value) return { valid: false, allowed: false };
  
  try {
    const { ip, ts, ok } = JSON.parse(cookie.value);
    if (ip === ipAddress && Date.now() - ts < IP_CHECK_CACHE_TTL_MS) {
      return { valid: true, allowed: ok };
    }
  } catch {
    // Invalid cookie
  }
  return { valid: false, allowed: false };
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

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (isBlockCheckRequired) {
    const cached = getCachedIPCheck(request, ipAddress);
    
    if (cached.valid) {
      if (!cached.allowed) {
        return new NextResponse(
          JSON.stringify({ error: "Access denied" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
    } else {
      const { blocked, shouldCache } = await checkIPBlocked(request, ipAddress);
      
      if (blocked) {
        return new NextResponse(
          JSON.stringify({ error: "Access denied" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
      
      if (shouldCache) {
        supabaseResponse.cookies.set(IP_CHECK_COOKIE_NAME, JSON.stringify({
          ip: ipAddress,
          ts: Date.now(),
          ok: true,
        }), {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: IP_CHECK_CACHE_TTL_MS / 1000,
          path: "/",
        });
      }
    }
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({
              request: { headers: requestHeaders },
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
      },
    }
  );

  const authCookie = request.cookies.get("sb-mcmqzwgaojgmrcmdsygh-auth-token");
  const hasAuthCookie = !!authCookie?.value;

  let user = null;
  if (hasAuthCookie) {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        user = data.user;
      }
    } catch {
      // Auth check failed silently
    }
  }

  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isProtectedRoute = pathname.startsWith("/app");
  const isPlatformAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/platform");
  const isTerminalStatePage = pathname === "/org-blocked" || pathname === "/pending";

  if (!user && (isProtectedRoute || isPlatformAdminRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (!user && isTerminalStatePage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
