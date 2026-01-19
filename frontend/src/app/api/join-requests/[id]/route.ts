import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSupabaseUser } from "@/lib/auth.server";
import { createAuditLog } from "@/lib/audit";

const TERMINAL_STATUSES = ["APPROVED", "DENIED", "EXPIRED"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseUser = await getSupabaseUser();
    if (!supabaseUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { action, reason } = await request.json();

    if (!action || !["approve", "deny"].includes(action)) {
      return NextResponse.json({ error: "Invalid action. Must be 'approve' or 'deny'" }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User record not found" }, { status: 404 });
    }

    const joinRequest = await prisma.joinRequest.findUnique({
      where: { id },
      include: {
        organization: true,
        requester: true,
      },
    });

    if (!joinRequest) {
      return NextResponse.json({ error: "Join request not found" }, { status: 404 });
    }

    if (TERMINAL_STATUSES.includes(joinRequest.status)) {
      return NextResponse.json({ 
        error: `Cannot ${action} a request that is already ${joinRequest.status}` 
      }, { status: 400 });
    }

    if (new Date() > joinRequest.expiresAt) {
      await prisma.joinRequest.update({
        where: { id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json({ error: "This request has expired" }, { status: 400 });
    }

    if (joinRequest.requesterUserId === dbUser.id) {
      return NextResponse.json({ error: "You cannot approve/deny your own request" }, { status: 403 });
    }

    const approverMembership = await prisma.membership.findFirst({
      where: {
        userId: dbUser.id,
        organizationId: joinRequest.organizationId,
        status: "ACTIVE",
      },
    });

    if (!approverMembership) {
      return NextResponse.json({ error: "You are not a member of this organization" }, { status: 403 });
    }

    const isAdminRequest = joinRequest.status === "REQUESTED_ADMIN";
    
    if (isAdminRequest) {
      if (approverMembership.systemRole !== "OWNER") {
        return NextResponse.json({ 
          error: "Only organization owners can approve/deny admin requests" 
        }, { status: 403 });
      }
    } else {
      if (!["OWNER", "ADMIN"].includes(approverMembership.systemRole)) {
        return NextResponse.json({ 
          error: "Only organization admins or owners can approve/deny member requests" 
        }, { status: 403 });
      }
    }

    const now = new Date();

    if (action === "approve") {
      const targetRole = joinRequest.requestedRole === "ADMIN" ? "ADMIN" : "CONTRIBUTOR";

      await prisma.$transaction(async (tx) => {
        await tx.joinRequest.update({
          where: { id },
          data: {
            status: "APPROVED",
            resolvedAt: now,
            resolvedByUserId: dbUser.id,
            resolutionReason: reason || "Approved by organization administrator",
          },
        });

        await tx.membership.upsert({
          where: {
            organizationId_userId: {
              organizationId: joinRequest.organizationId,
              userId: joinRequest.requesterUserId,
            },
          },
          update: {
            status: "ACTIVE",
            systemRole: targetRole,
            approvedAt: now,
            approvedBy: dbUser.id,
          },
          create: {
            organizationId: joinRequest.organizationId,
            userId: joinRequest.requesterUserId,
            systemRole: targetRole,
            status: "ACTIVE",
            approvedAt: now,
            approvedBy: dbUser.id,
          },
        });

        await tx.notification.create({
          data: {
            userId: joinRequest.requesterUserId,
            organizationId: joinRequest.organizationId,
            type: "join_request_approved",
            title: "Join Request Approved",
            message: `Your request to join ${joinRequest.organization.name} as ${targetRole} has been approved.`,
            link: "/app",
          },
        });
      });

      const session = {
        user: dbUser,
        memberships: [approverMembership],
        currentMembership: approverMembership,
        currentOrgId: joinRequest.organizationId,
      };

      await createAuditLog(session as any, joinRequest.organizationId, {
        action: "join_request.approved",
        entityType: "JoinRequest",
        entityId: id,
        newData: { 
          requestedRole: joinRequest.requestedRole,
          grantedRole: targetRole,
          requesterEmail: joinRequest.requesterEmail,
        },
      });

      return NextResponse.json({ 
        success: true, 
        message: `Request approved. User is now a ${targetRole} of the organization.` 
      });
    }

    if (action === "deny") {
      await prisma.$transaction(async (tx) => {
        await tx.joinRequest.update({
          where: { id },
          data: {
            status: "DENIED",
            resolvedAt: now,
            resolvedByUserId: dbUser.id,
            resolutionReason: reason || "Denied by organization administrator",
          },
        });

        await tx.notification.create({
          data: {
            userId: joinRequest.requesterUserId,
            organizationId: joinRequest.organizationId,
            type: "join_request_denied",
            title: "Join Request Denied",
            message: reason 
              ? `Your request to join ${joinRequest.organization.name} was denied: ${reason}`
              : `Your request to join ${joinRequest.organization.name} was denied.`,
            link: "/pending",
          },
        });
      });

      const session = {
        user: dbUser,
        memberships: [approverMembership],
        currentMembership: approverMembership,
        currentOrgId: joinRequest.organizationId,
      };

      await createAuditLog(session as any, joinRequest.organizationId, {
        action: "join_request.denied",
        entityType: "JoinRequest",
        entityId: id,
        newData: { 
          requestedRole: joinRequest.requestedRole,
          requesterEmail: joinRequest.requesterEmail,
          reason: reason || "No reason provided",
        },
      });

      return NextResponse.json({ 
        success: true, 
        message: "Request denied." 
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Process join request error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseUser = await getSupabaseUser();
    if (!supabaseUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User record not found" }, { status: 404 });
    }

    const joinRequest = await prisma.joinRequest.findUnique({
      where: { id },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        requester: { select: { id: true, name: true, email: true, avatarUrl: true } },
        resolvedBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!joinRequest) {
      return NextResponse.json({ error: "Join request not found" }, { status: 404 });
    }

    const isRequester = joinRequest.requesterUserId === dbUser.id;
    const membership = await prisma.membership.findFirst({
      where: {
        userId: dbUser.id,
        organizationId: joinRequest.organizationId,
        status: "ACTIVE",
        systemRole: { in: ["OWNER", "ADMIN"] },
      },
    });

    if (!isRequester && !membership && !dbUser.isPlatformAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ joinRequest });
  } catch (error) {
    console.error("Get join request error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
