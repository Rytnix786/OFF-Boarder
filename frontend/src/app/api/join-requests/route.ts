import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { getSupabaseUser } from "@/lib/auth.server";
import { createAuditLog } from "@/lib/audit.server";

const JOIN_REQUEST_EXPIRY_DAYS = 14;

export async function POST(request: NextRequest) {
  try {
    const supabaseUser = await getSupabaseUser();
    if (!supabaseUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId, requestedRole } = await request.json();

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
    }

    if (!requestedRole || !["MEMBER", "ADMIN", "CONTRIBUTOR"].includes(requestedRole)) {
      return NextResponse.json({ error: "Invalid requested role. Must be CONTRIBUTOR or ADMIN" }, { status: 400 });
    }

    // Normalize MEMBER to CONTRIBUTOR for consistency
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
      return NextResponse.json({ error: "Organization not found or not active" }, { status: 404 });
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
        message: "You already have a pending request for this organization",
        joinRequest: existingRequest 
      });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + JOIN_REQUEST_EXPIRY_DAYS);

    const status = normalizedRole === "ADMIN" ? "REQUESTED_ADMIN" : "REQUESTED_MEMBER";

    const activeAdmins = await prisma.membership.count({
      where: {
        organizationId,
        status: "ACTIVE",
        systemRole: { in: ["OWNER", "ADMIN"] },
      },
    });

    const joinRequest = await prisma.joinRequest.create({
      data: {
        organizationId,
        requesterUserId: dbUser.id,
        requesterEmail: dbUser.email,
        requestedRole: normalizedRole as "CONTRIBUTOR" | "ADMIN",
        status: status as "REQUESTED_MEMBER" | "REQUESTED_ADMIN",
        expiresAt,
        escalatedAt: activeAdmins === 0 ? new Date() : null,
        escalationReason: activeAdmins === 0 ? "No active admins/owners in organization" : null,
      },
      include: {
        organization: { select: { name: true, slug: true } },
      },
    });

    const dummySession = {
      user: dbUser,
      memberships: [],
      currentMembership: null,
      currentOrgId: organizationId,
    };

    await createAuditLog(dummySession as any, organizationId, {
      action: "join_request.created",
      entityType: "JoinRequest",
      entityId: joinRequest.id,
      newData: { requestedRole: normalizedRole, status, escalated: activeAdmins === 0 },
    });

    if (activeAdmins === 0) {
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
    console.error("Create join request error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabaseUser = await getSupabaseUser();
    if (!supabaseUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User record not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("organizationId");

    if (orgId) {
      const membership = await prisma.membership.findFirst({
        where: { userId: dbUser.id, organizationId: orgId, status: "ACTIVE" },
      });

      if (!membership || !["OWNER", "ADMIN"].includes(membership.systemRole)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      await prisma.joinRequest.updateMany({
        where: {
          organizationId: orgId,
          status: { in: ["REQUESTED_MEMBER", "REQUESTED_ADMIN"] },
          expiresAt: { lt: new Date() },
        },
        data: { status: "EXPIRED" },
      });

      const isOwner = membership.systemRole === "OWNER";
      const statusFilter = isOwner 
        ? ["REQUESTED_MEMBER", "REQUESTED_ADMIN"] 
        : ["REQUESTED_MEMBER"];

      const joinRequests = await prisma.joinRequest.findMany({
        where: {
          organizationId: orgId,
          status: { in: statusFilter as any },
        },
        include: {
          requester: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ joinRequests, canApproveAdmin: isOwner });
    }

    const joinRequests = await prisma.joinRequest.findMany({
      where: { requesterUserId: dbUser.id },
      include: {
        organization: { select: { id: true, name: true, slug: true, logoUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ joinRequests });
  } catch (error) {
    console.error("Get join requests error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
