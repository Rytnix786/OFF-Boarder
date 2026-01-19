import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createHash } from "crypto";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function GET(request: NextRequest) {
  try {
    const deviceSessionToken = request.cookies.get("device_session")?.value;
    
    if (!deviceSessionToken) {
      return NextResponse.json({ valid: false, reason: "NO_SESSION" });
    }

    const sessionTokenHash = hashToken(deviceSessionToken);

    const session = await prisma.userSession.findUnique({
      where: { sessionToken: sessionTokenHash },
      include: {
        user: {
          select: {
            id: true,
            passwordVersion: true,
            roleVersion: true,
            forceReauthAt: true,
          },
        },
      },
    });

    if (!session) {
      const response = NextResponse.json({ valid: false, reason: "SESSION_NOT_FOUND" });
      response.cookies.delete("device_session");
      response.cookies.delete("refresh_token");
      return response;
    }

    if (session.revokedAt) {
      const response = NextResponse.json({ 
        valid: false, 
        reason: "SESSION_REVOKED",
        revokedReason: session.revokedReason,
      });
      response.cookies.delete("device_session");
      response.cookies.delete("refresh_token");
      return response;
    }

    if (session.expiresAt && session.expiresAt < new Date()) {
      const response = NextResponse.json({ valid: false, reason: "SESSION_EXPIRED" });
      response.cookies.delete("device_session");
      response.cookies.delete("refresh_token");
      return response;
    }

    if (session.passwordVersion !== session.user.passwordVersion) {
      await prisma.userSession.update({
        where: { id: session.id },
        data: {
          revokedAt: new Date(),
          revokedBy: "system",
          revokedReason: "Password changed",
        },
      });
      const response = NextResponse.json({ valid: false, reason: "PASSWORD_CHANGED" });
      response.cookies.delete("device_session");
      response.cookies.delete("refresh_token");
      return response;
    }

    if (session.roleVersion !== session.user.roleVersion) {
      await prisma.userSession.update({
        where: { id: session.id },
        data: {
          revokedAt: new Date(),
          revokedBy: "system",
          revokedReason: "Role changed",
        },
      });
      const response = NextResponse.json({ valid: false, reason: "ROLE_CHANGED" });
      response.cookies.delete("device_session");
      response.cookies.delete("refresh_token");
      return response;
    }

    if (session.user.forceReauthAt && session.createdAt < session.user.forceReauthAt) {
      await prisma.userSession.update({
        where: { id: session.id },
        data: {
          revokedAt: new Date(),
          revokedBy: "system",
          revokedReason: "Security policy requires re-authentication",
        },
      });
      const response = NextResponse.json({ valid: false, reason: "REAUTH_REQUIRED" });
      response.cookies.delete("device_session");
      response.cookies.delete("refresh_token");
      return response;
    }

    if (session.organizationId) {
      const membership = await prisma.membership.findFirst({
        where: {
          userId: session.userId,
          organizationId: session.organizationId,
          status: "ACTIVE",
        },
      });

      if (!membership) {
        await prisma.userSession.update({
          where: { id: session.id },
          data: {
            revokedAt: new Date(),
            revokedBy: "system",
            revokedReason: "User offboarded or access revoked",
          },
        });
        const response = NextResponse.json({ valid: false, reason: "ACCESS_REVOKED" });
        response.cookies.delete("device_session");
        response.cookies.delete("refresh_token");
        return response;
      }
    }

    await prisma.userSession.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() },
    });

    return NextResponse.json({
      valid: true,
      sessionId: session.id,
      userId: session.userId,
      organizationId: session.organizationId,
      rememberDevice: session.rememberDevice,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error("Failed to validate session:", error);
    return NextResponse.json({ valid: false, reason: "ERROR" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get("refresh_token")?.value;
    
    if (!refreshToken) {
      return NextResponse.json({ success: false, reason: "NO_REFRESH_TOKEN" });
    }

    const refreshTokenHash = hashToken(refreshToken);

    const session = await prisma.userSession.findFirst({
      where: { 
        refreshToken: refreshTokenHash,
        revokedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            passwordVersion: true,
            roleVersion: true,
            forceReauthAt: true,
          },
        },
      },
    });

    if (!session) {
      const response = NextResponse.json({ success: false, reason: "INVALID_REFRESH_TOKEN" });
      response.cookies.delete("refresh_token");
      return response;
    }

    if (session.refreshExpiresAt && session.refreshExpiresAt < new Date()) {
      const response = NextResponse.json({ success: false, reason: "REFRESH_TOKEN_EXPIRED" });
      response.cookies.delete("device_session");
      response.cookies.delete("refresh_token");
      return response;
    }

    if (session.passwordVersion !== session.user.passwordVersion) {
      const response = NextResponse.json({ success: false, reason: "PASSWORD_CHANGED" });
      response.cookies.delete("device_session");
      response.cookies.delete("refresh_token");
      return response;
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error || !data.session) {
      return NextResponse.json({ success: false, reason: "SUPABASE_REFRESH_FAILED" });
    }

    const { randomBytes } = await import("crypto");
    const newSessionToken = randomBytes(32).toString("hex");
    const newSessionTokenHash = hashToken(newSessionToken);

    const longExpiry = 30 * 24 * 60 * 60 * 1000;
    const newExpiresAt = new Date(Date.now() + longExpiry);

    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        sessionToken: newSessionTokenHash,
        expiresAt: newExpiresAt,
        lastActiveAt: new Date(),
        passwordVersion: session.user.passwordVersion,
        roleVersion: session.user.roleVersion,
      },
    });

    const response = NextResponse.json({
      success: true,
      sessionId: session.id,
    });

    response.cookies.set("device_session", newSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: longExpiry / 1000,
    });

    return response;
  } catch (error) {
    console.error("Failed to refresh session:", error);
    return NextResponse.json({ success: false, reason: "ERROR" }, { status: 500 });
  }
}
