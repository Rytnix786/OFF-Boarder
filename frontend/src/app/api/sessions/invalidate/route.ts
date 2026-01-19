import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { createClient } from "@/lib/supabase/server";

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
    const { reason, targetUserId, organizationId } = body;

    const userAgent = request.headers.get("user-agent");
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || "unknown";

    let targetUser = user;
    const isAdmin = user.isPlatformAdmin;

    if (targetUserId && isAdmin && targetUserId !== user.id) {
      const foundUser = await prisma.user.findUnique({
        where: { id: targetUserId },
      });
      if (!foundUser) {
        return NextResponse.json({ error: "Target user not found" }, { status: 404 });
      }
      targetUser = foundUser;
    }

    switch (reason) {
      case "PASSWORD_CHANGED":
        await prisma.user.update({
          where: { id: targetUser.id },
          data: {
            passwordVersion: { increment: 1 },
            lastPasswordChangeAt: new Date(),
          },
        });

        await prisma.userSession.updateMany({
          where: {
            userId: targetUser.id,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
            revokedBy: user.id,
            revokedReason: "Password changed",
          },
        });

        await prisma.auditLog.create({
          data: {
            action: "ALL_SESSIONS_INVALIDATED",
            entityType: "UserSession",
            organizationId: organizationId || "system",
            userId: user.id,
            ipAddress,
            userAgent,
            metadata: {
              targetUserId: targetUser.id,
              reason: "Password changed",
              sessionCount: "all",
            },
          },
        });
        break;

      case "ROLE_CHANGED":
        await prisma.user.update({
          where: { id: targetUser.id },
          data: { roleVersion: { increment: 1 } },
        });

        await prisma.userSession.updateMany({
          where: {
            userId: targetUser.id,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
            revokedBy: user.id,
            revokedReason: "Role changed - re-authentication required",
          },
        });

        await prisma.auditLog.create({
          data: {
            action: "ALL_SESSIONS_INVALIDATED",
            entityType: "UserSession",
            organizationId: organizationId || "system",
            userId: user.id,
            ipAddress,
            userAgent,
            metadata: {
              targetUserId: targetUser.id,
              reason: "Role changed",
              sessionCount: "all",
            },
          },
        });
        break;

      case "USER_OFFBOARDED":
        await prisma.userSession.updateMany({
          where: {
            userId: targetUser.id,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
            revokedBy: user.id,
            revokedReason: "User offboarded",
          },
        });

        await prisma.auditLog.create({
          data: {
            action: "ALL_SESSIONS_INVALIDATED",
            entityType: "UserSession",
            organizationId: organizationId || "system",
            userId: user.id,
            ipAddress,
            userAgent,
            metadata: {
              targetUserId: targetUser.id,
              reason: "User offboarded",
              sessionCount: "all",
            },
          },
        });
        break;

      case "ADMIN_REVOKE":
        if (!isAdmin) {
          return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        await prisma.userSession.updateMany({
          where: {
            userId: targetUser.id,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
            revokedBy: user.id,
            revokedReason: "Admin revoked all sessions",
          },
        });

        await prisma.auditLog.create({
          data: {
            action: "ADMIN_REVOKED_ALL_SESSIONS",
            entityType: "UserSession",
            organizationId: organizationId || "system",
            userId: user.id,
            ipAddress,
            userAgent,
            metadata: {
              targetUserId: targetUser.id,
              reason: "Admin revoked sessions",
              sessionCount: "all",
            },
          },
        });
        break;

      case "SECURITY_POLICY":
        await prisma.user.update({
          where: { id: targetUser.id },
          data: { forceReauthAt: new Date() },
        });

        await prisma.auditLog.create({
          data: {
            action: "FORCE_REAUTH_SET",
            entityType: "User",
            entityId: targetUser.id,
            organizationId: organizationId || "system",
            userId: user.id,
            ipAddress,
            userAgent,
            metadata: {
              reason: "Security policy requires re-authentication",
            },
          },
        });
        break;

      default:
        return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
    }

    return NextResponse.json({ success: true, reason });
  } catch (error) {
    console.error("Failed to invalidate sessions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
