import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSupabaseUser } from "@/lib/auth.server";
import { createAuditLog } from "@/lib/audit";

const JOIN_REQUEST_EXPIRY_DAYS = 14;

export async function POST(request: NextRequest) {
  try {
    const supabaseUser = await getSupabaseUser();
    if (!supabaseUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId, requestedRole } = await request.json();

    if (!organizationId || !requestedRole) {
      return NextResponse.json({ error: "Organization ID and requested role are required" }, { status: 400 });
    }

    const validRoles = ["ADMIN", "MEMBER", "CONTRIBUTOR"];
    if (!validRoles.includes(requestedRole)) {
      return NextResponse.json({ error: "Invalid requested role" }, { status: 400 });
    }

    // Normalize MEMBER to CONTRIBUTOR
    const normalizedRole = requestedRole === "MEMBER" ? "CONTRIBUTOR" : requestedRole;

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User record not found" }, { status: 404 });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization || organization.status !== "ACTIVE") {
      return NextResponse.json({ error: "Organization not found or inactive" }, { status: 404 });
    }

    const existingMembership = await prisma.membership.findFirst({
      where: { userId: dbUser.id, organizationId, status: "ACTIVE" },
    });

    if (existingMembership) {
      return NextResponse.json({ error: "You are already an active member of this organization" }, { status: 400 });
    }

    const existingRequest = await prisma.joinRequest.findFirst({
      where: {
        requesterUserId: dbUser.id,
        organizationId,
        status: { in: ["REQUESTED_MEMBER", "REQUESTED_ADMIN"] },
      },
    });

    if (existingRequest) {
      return NextResponse.json({ 
        error: "You already have a pending join request for this organization",
        joinRequest: existingRequest
      }, { status: 400 });
    }

    const activeAdmins = await prisma.membership.count({
      where: {
        organizationId,
        status: "ACTIVE",
        systemRole: { in: ["OWNER", "ADMIN"] },
      },
    });

    const isEscalated = activeAdmins === 0;
    const status = normalizedRole === "ADMIN" ? "REQUESTED_ADMIN" : "REQUESTED_MEMBER";
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + JOIN_REQUEST_EXPIRY_DAYS);

    const joinRequest = await prisma.joinRequest.create({
      data: {
        organizationId,
        requesterUserId: dbUser.id,
        requesterEmail: dbUser.email,
        requestedRole: normalizedRole as "CONTRIBUTOR" | "ADMIN",
        status: status as "REQUESTED_MEMBER" | "REQUESTED_ADMIN",
        expiresAt,
        escalatedAt: isEscalated ? new Date() : null,
        escalationReason: isEscalated ? "No active admins/owners in organization" : null,
      },
      include: {
        organization: { select: { name: true, slug: true } },
      },
    });

    const session = {
      user: dbUser,
      memberships: [],
      currentMembership: null,
      currentOrgId: organizationId,
    };

    await createAuditLog(session as any, organizationId, {
      action: "join_request.created",
      entityType: "JoinRequest",
      entityId: joinRequest.id,
      newData: { requestedRole: normalizedRole, status, escalated: isEscalated },
    });

    if (isEscalated) {
      await prisma.platformSignal.create({
        data: {
          signalType: "ORG_COMPLIANCE_ISSUE",
          severity: "HIGH",
          title: "Join Request Escalated - No Approvers",
          description: `User ${dbUser.email} requested to join ${organization.name} but the organization has no active admins/owners.`,
          organizationId,
          metadata: { joinRequestId: joinRequest.id, userId: dbUser.id },
        },
      });
    } else {
      const notifyRoles = normalizedRole === "ADMIN" ? ["OWNER"] : ["OWNER", "ADMIN"];
      const approvers = await prisma.membership.findMany({
        where: {
          organizationId,
          status: "ACTIVE",
          systemRole: { in: notifyRoles as any },
        },
        select: { userId: true },
      });

      if (approvers.length > 0) {
        await prisma.notification.createMany({
          data: approvers.map((approver) => ({
            userId: approver.userId,
            organizationId,
            type: "join_request",
            title: "New Join Request",
            message: `${dbUser.name || dbUser.email} has requested to join as ${normalizedRole === "CONTRIBUTOR" ? "Contributor" : "Admin"}`,
            link: "/app/settings/members",
          })),
        });
      }
    }

    return NextResponse.json({ success: true, joinRequest });
  } catch (error) {
    console.error("Join request error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
