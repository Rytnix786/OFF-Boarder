import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { createClient } from "@/lib/supabase/server";
import { randomBytes, createHash } from "crypto";

function generateSecureToken(): string {
  return randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function parseUserAgent(ua: string | null): {
  browserName: string | null;
  browserVersion: string | null;
  osName: string | null;
  osVersion: string | null;
  deviceName: string | null;
} {
  if (!ua) return { browserName: null, browserVersion: null, osName: null, osVersion: null, deviceName: null };

  let browserName = null;
  let browserVersion = null;
  let osName = null;
  let osVersion = null;
  let deviceName = null;

  if (ua.includes("Chrome")) {
    browserName = "Chrome";
    const match = ua.match(/Chrome\/(\d+\.\d+)/);
    browserVersion = match?.[1] || null;
  } else if (ua.includes("Firefox")) {
    browserName = "Firefox";
    const match = ua.match(/Firefox\/(\d+\.\d+)/);
    browserVersion = match?.[1] || null;
  } else if (ua.includes("Safari") && !ua.includes("Chrome")) {
    browserName = "Safari";
    const match = ua.match(/Version\/(\d+\.\d+)/);
    browserVersion = match?.[1] || null;
  } else if (ua.includes("Edge")) {
    browserName = "Edge";
    const match = ua.match(/Edge\/(\d+\.\d+)/);
    browserVersion = match?.[1] || null;
  }

  if (ua.includes("Windows")) {
    osName = "Windows";
    if (ua.includes("Windows NT 10")) osVersion = "10";
    else if (ua.includes("Windows NT 6.3")) osVersion = "8.1";
  } else if (ua.includes("Mac OS X")) {
    osName = "macOS";
    const match = ua.match(/Mac OS X (\d+[._]\d+)/);
    osVersion = match?.[1]?.replace("_", ".") || null;
  } else if (ua.includes("Linux")) {
    osName = "Linux";
  } else if (ua.includes("Android")) {
    osName = "Android";
    const match = ua.match(/Android (\d+\.?\d*)/);
    osVersion = match?.[1] || null;
  } else if (ua.includes("iPhone") || ua.includes("iPad")) {
    osName = "iOS";
    const match = ua.match(/OS (\d+_\d+)/);
    osVersion = match?.[1]?.replace("_", ".") || null;
  }

  if (ua.includes("Mobile")) deviceName = "Mobile Device";
  else if (ua.includes("Tablet") || ua.includes("iPad")) deviceName = "Tablet";
  else deviceName = "Desktop";

  return { browserName, browserVersion, osName, osVersion, deviceName };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();
    
    if (!supabaseUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentSessionToken = request.cookies.get("device_session")?.value;
    const currentSessionHash = currentSessionToken ? hashToken(currentSessionToken) : null;

    const sessions = await prisma.userSession.findMany({
      where: {
        userId: user.id,
        revokedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { lastActiveAt: "desc" },
      select: {
        id: true,
        deviceName: true,
        browserName: true,
        browserVersion: true,
        osName: true,
        osVersion: true,
        ipAddress: true,
        city: true,
        country: true,
        lastActiveAt: true,
        createdAt: true,
        rememberDevice: true,
        sessionToken: true,
      },
    });

    const formattedSessions = sessions.map((session) => ({
      id: session.id,
      deviceName: session.deviceName || "Unknown Device",
      browser: session.browserName 
        ? `${session.browserName}${session.browserVersion ? ` ${session.browserVersion}` : ""}`
        : "Unknown Browser",
      os: session.osName
        ? `${session.osName}${session.osVersion ? ` ${session.osVersion}` : ""}`
        : "Unknown OS",
      location: session.city && session.country
        ? `${session.city}, ${session.country}`
        : session.country || "Unknown Location",
      ipAddress: session.ipAddress,
      lastActive: session.lastActiveAt,
      createdAt: session.createdAt,
      rememberDevice: session.rememberDevice,
      isCurrent: session.sessionToken === currentSessionHash,
    }));

    return NextResponse.json({ sessions: formattedSessions });
  } catch (error) {
    console.error("Failed to get sessions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function resolveOrganizationId(userId: string, requestedOrgId?: string): Promise<string | null> {
  if (requestedOrgId) {
    const org = await prisma.organization.findFirst({
      where: { id: requestedOrgId, status: "ACTIVE" },
      select: { id: true },
    });
    if (org) return org.id;
  }

  const activeMembership = await prisma.membership.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      organization: { status: "ACTIVE" },
    },
    include: { organization: { select: { id: true } } },
  });

  return activeMembership?.organization.id || null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();
    
    if (!supabaseUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { rememberDevice = false, organizationId: requestedOrgId } = body;

    const resolvedOrgId = await resolveOrganizationId(user.id, requestedOrgId);

    const userAgent = request.headers.get("user-agent");
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
    
    const { browserName, browserVersion, osName, osVersion, deviceName } = parseUserAgent(userAgent);

    const deviceId = createHash("sha256")
      .update(`${userAgent || ""}:${ipAddress}`)
      .digest("hex")
      .substring(0, 32);

    const sessionToken = generateSecureToken();
    const refreshToken = rememberDevice ? generateSecureToken() : null;
    const sessionTokenHash = hashToken(sessionToken);
    const refreshTokenHash = refreshToken ? hashToken(refreshToken) : null;

    const shortExpiry = 30 * 60 * 1000;
    const longExpiry = 30 * 24 * 60 * 60 * 1000;
    const refreshExpiry = 90 * 24 * 60 * 60 * 1000;

    const expiresAt = new Date(Date.now() + (rememberDevice ? longExpiry : shortExpiry));
    const refreshExpiresAt = refreshToken ? new Date(Date.now() + refreshExpiry) : null;

    await prisma.userSession.updateMany({
      where: { userId: user.id },
      data: { isCurrent: false },
    });

    const session = await prisma.userSession.create({
      data: {
        userId: user.id,
        organizationId: resolvedOrgId,
        sessionToken: sessionTokenHash,
        refreshToken: refreshTokenHash,
        deviceId,
        deviceName,
        browserName,
        browserVersion,
        osName,
        osVersion,
        ipAddress,
        userAgent,
        rememberDevice,
        expiresAt,
        refreshExpiresAt,
        passwordVersion: user.passwordVersion,
        roleVersion: user.roleVersion,
        isCurrent: true,
        lastActiveAt: new Date(),
      },
    });

    try {
      await prisma.auditLog.create({
        data: {
          action: "SESSION_CREATED",
          entityType: "UserSession",
          entityId: session.id,
          organizationId: resolvedOrgId,
          scope: resolvedOrgId ? "ORGANIZATION" : "PLATFORM",
          userId: user.id,
          ipAddress,
          userAgent,
          metadata: {
            rememberDevice,
            deviceName,
            browserName,
            osName,
          },
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log for session (non-fatal):", auditError);
    }

    const response = NextResponse.json({
      success: true,
      sessionId: session.id,
    });

    response.cookies.set("device_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: rememberDevice ? longExpiry / 1000 : undefined,
    });

    if (refreshToken) {
      response.cookies.set("refresh_token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: refreshExpiry / 1000,
      });
    }

    return response;
  } catch (error) {
    console.error("Failed to create session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();
    
    if (!supabaseUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const revokeAll = searchParams.get("revokeAll") === "true";
    const reason = searchParams.get("reason") || "User revoked session";

    const userAgent = request.headers.get("user-agent");
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || "unknown";

    const currentSessionToken = request.cookies.get("device_session")?.value;
    const currentSessionHash = currentSessionToken ? hashToken(currentSessionToken) : null;

    if (revokeAll) {
      const revokedSessions = await prisma.userSession.updateMany({
          where: {
            userId: user.id,
            revokedAt: null,
            sessionToken: { not: currentSessionHash || undefined },
          },
          data: {
            revokedAt: new Date(),
            revokedBy: user.id,
            revokedReason: reason,
          },
        });

        const resolvedOrgId = await resolveOrganizationId(user.id);
        
        try {
          await prisma.auditLog.create({
            data: {
              action: "ALL_SESSIONS_REVOKED",
              entityType: "UserSession",
              organizationId: resolvedOrgId,
              scope: resolvedOrgId ? "ORGANIZATION" : "PLATFORM",
              userId: user.id,
              ipAddress,
              userAgent,
              metadata: {
                revokedCount: revokedSessions.count,
                reason,
              },
            },
          });
        } catch (auditError) {
          console.error("Failed to create audit log (non-fatal):", auditError);
        }

        return NextResponse.json({
        success: true,
        message: `Revoked ${revokedSessions.count} sessions`,
      });
    }

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    const session = await prisma.userSession.findFirst({
      where: {
        id: sessionId,
        userId: user.id,
        revokedAt: null,
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    await prisma.userSession.update({
        where: { id: sessionId },
        data: {
          revokedAt: new Date(),
          revokedBy: user.id,
          revokedReason: reason,
        },
      });

      try {
        await prisma.auditLog.create({
          data: {
            action: "SESSION_REVOKED",
            entityType: "UserSession",
            entityId: sessionId,
            organizationId: session.organizationId || null,
            scope: session.organizationId ? "ORGANIZATION" : "PLATFORM",
            userId: user.id,
            ipAddress,
            userAgent,
            metadata: {
              revokedSessionId: sessionId,
              reason,
            },
          },
        });
      } catch (auditError) {
        console.error("Failed to create audit log (non-fatal):", auditError);
      }

    const response = NextResponse.json({
      success: true,
      message: "Session revoked",
    });

    if (session.sessionToken === currentSessionHash) {
      response.cookies.delete("device_session");
      response.cookies.delete("refresh_token");
    }

    return response;
  } catch (error) {
    console.error("Failed to revoke session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
