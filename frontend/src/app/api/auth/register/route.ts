import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const JOIN_REQUEST_EXPIRY_DAYS = 14;

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50) + "-" + Math.random().toString(36).substring(2, 8);
}

export async function POST(request: NextRequest) {
  try {
    const { 
      email, 
      password, 
      name, 
      orgName, 
      invitationToken,
      joinOrganizationId,
      requestedRole,
    } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Email, password, and name are required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase().replace(/['"]/g, "");

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json({ 
        error: "An account with this email already exists. Please sign in instead.",
        code: "user_exists"
      }, { status: 400 });
    }

    // Determine registration mode
    let invitation = null;
    let joinOrg = null;

    // Mode 1: Invitation-based registration
    if (invitationToken) {
      invitation = await prisma.invitation.findUnique({
        where: { token: invitationToken },
        include: { organization: true },
      });

      if (!invitation) {
        return NextResponse.json({ error: "Invitation not found" }, { status: 400 });
      }

      if (invitation.status !== "PENDING") {
        return NextResponse.json({ 
          error: "This invitation has already been used or is no longer valid",
          code: "invitation_used"
        }, { status: 400 });
      }

      if (new Date() > invitation.expiresAt) {
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: "EXPIRED" },
        });
        return NextResponse.json({ 
          error: "This invitation has expired. Please request a new one.",
          code: "invitation_expired"
        }, { status: 400 });
      }

      if (invitation.email.toLowerCase() !== normalizedEmail) {
        return NextResponse.json({ 
          error: "This invitation was sent to a different email address",
          code: "email_mismatch"
        }, { status: 403 });
      }
    } 
    // Mode 2: Join existing organization
    else if (joinOrganizationId) {
      if (!requestedRole || !["MEMBER", "ADMIN", "CONTRIBUTOR"].includes(requestedRole)) {
        return NextResponse.json({ error: "Invalid requested role" }, { status: 400 });
      }

      joinOrg = await prisma.organization.findUnique({
        where: { id: joinOrganizationId },
      });

      if (!joinOrg || joinOrg.status !== "ACTIVE") {
        return NextResponse.json({ error: "Organization not found or not active" }, { status: 400 });
      }
    }
    // Mode 3: Create new organization
    else {
      // Check for pending invitations
      const pendingInvitation = await prisma.invitation.findFirst({
        where: {
          email: { equals: normalizedEmail, mode: "insensitive" },
          status: "PENDING",
          expiresAt: { gt: new Date() },
        },
        include: { organization: true },
      });

      if (pendingInvitation) {
        return NextResponse.json({ 
          error: `You have a pending invitation to join ${pendingInvitation.organization.name}. Please use your invitation link.`,
          code: "has_invitation",
          organizationName: pendingInvitation.organization.name,
        }, { status: 400 });
      }

      if (!orgName?.trim()) {
        return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
      }
    }

    // Create Supabase user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        org_name: invitation ? null : orgName,
        invitation_token: invitationToken || null,
        join_organization_id: joinOrganizationId || null,
        requested_role: requestedRole || null,
      },
    });

    if (authError) {
      console.error("Supabase admin createUser error:", authError);
      if (authError.message.includes("already been registered")) {
        return NextResponse.json({ 
          error: "An account with this email already exists. Please sign in instead.",
          code: "user_exists"
        }, { status: 400 });
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }

    // Mode 1: Process invitation-based registration
    if (invitation) {
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            supabaseId: authData.user.id,
            email: normalizedEmail,
            name,
            isPlatformAdmin: false,
          },
        });

          const membership = await tx.membership.create({
            data: {
              userId: user.id,
              organizationId: invitation.organizationId,
              systemRole: invitation.systemRole,
              status: "ACTIVE",
              invitedBy: invitation.invitedById,
            },
          });

        await tx.invitation.update({
          where: { id: invitation.id },
          data: {
            status: "ACCEPTED",
            acceptedAt: new Date(),
            acceptedByUserId: user.id,
          },
        });

        await tx.auditLog.create({
          data: {
            action: "member.joined",
            entityType: "Membership",
            entityId: membership.id,
            newData: { email: user.email, role: invitation.systemRole, invitedBy: invitation.invitedById },
            organizationId: invitation.organizationId,
            userId: user.id,
          },
        });

        await tx.auditLog.create({
          data: {
            action: "user.registered",
            entityType: "User",
            entityId: user.id,
            newData: { email: user.email, name: user.name, joinedViaInvitation: true },
            organizationId: invitation.organizationId,
            userId: user.id,
          },
        });

        return { user, membership, organization: invitation.organization };
      });

        return NextResponse.json({ 
          success: true, 
          user: result.user,
          organization: result.organization,
          joinedViaInvitation: true,
          redirectTo: "/app"
        });
    }

    // Mode 2: Process join request registration
    if (joinOrg) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + JOIN_REQUEST_EXPIRY_DAYS);

      // Normalize MEMBER to CONTRIBUTOR
      const normalizedRole = requestedRole === "MEMBER" ? "CONTRIBUTOR" : requestedRole;
      const status = normalizedRole === "ADMIN" ? "REQUESTED_ADMIN" : "REQUESTED_MEMBER";

      // Check if org has active admins
      const activeAdmins = await prisma.membership.count({
        where: {
          organizationId: joinOrg.id,
          status: "ACTIVE",
          systemRole: { in: ["OWNER", "ADMIN"] },
        },
      });

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            supabaseId: authData.user.id,
            email: normalizedEmail,
            name,
            isPlatformAdmin: false,
          },
        });

        const joinRequest = await tx.joinRequest.create({
          data: {
            organizationId: joinOrg.id,
            requesterUserId: user.id,
            requesterEmail: normalizedEmail,
            requestedRole: normalizedRole as "CONTRIBUTOR" | "ADMIN",
            status: status as "REQUESTED_MEMBER" | "REQUESTED_ADMIN",
            expiresAt,
            escalatedAt: activeAdmins === 0 ? new Date() : null,
            escalationReason: activeAdmins === 0 ? "No active admins/owners in organization" : null,
          },
        });

        await tx.auditLog.create({
          data: {
            action: "user.registered",
            entityType: "User",
            entityId: user.id,
            newData: { email: user.email, name: user.name, joinRequestOrg: joinOrg.name },
            organizationId: joinOrg.id,
            userId: user.id,
          },
        });

        await tx.auditLog.create({
          data: {
            action: "join_request.created",
            entityType: "JoinRequest",
            entityId: joinRequest.id,
            newData: { requestedRole: normalizedRole, status, organizationId: joinOrg.id },
            organizationId: joinOrg.id,
            userId: user.id,
          },
        });

        return { user, joinRequest };
      });

      // Create escalation signal if no approvers
      if (activeAdmins === 0) {
        await prisma.platformSignal.create({
          data: {
            signalType: "ORG_COMPLIANCE_ISSUE",
            severity: "HIGH",
            title: "Join Request Escalated - No Approvers",
            description: `User ${normalizedEmail} requested to join ${joinOrg.name} but the organization has no active admins/owners.`,
            organizationId: joinOrg.id,
            metadata: { joinRequestId: result.joinRequest.id, userId: result.user.id },
          },
        });
      } else {
        // Notify approvers
        const notifyRoles = normalizedRole === "ADMIN" ? ["OWNER"] : ["OWNER", "ADMIN"];
        const approvers = await prisma.membership.findMany({
          where: {
            organizationId: joinOrg.id,
            status: "ACTIVE",
            systemRole: { in: notifyRoles as any },
          },
          select: { userId: true },
        });

        if (approvers.length > 0) {
          await prisma.notification.createMany({
            data: approvers.map((approver) => ({
              userId: approver.userId,
              organizationId: joinOrg.id,
              type: "join_request",
              title: "New Join Request",
              message: `${name || normalizedEmail} has requested to join as ${normalizedRole === "CONTRIBUTOR" ? "Contributor" : "Admin"}`,
              link: "/app/settings/members",
            })),
          });
        }
      }

      return NextResponse.json({ 
        success: true, 
        user: result.user,
        joinRequest: result.joinRequest,
        organization: joinOrg,
        redirectTo: "/pending"
      });
    }

    // Mode 3: Create new organization
    const slug = generateSlug(orgName);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          supabaseId: authData.user.id,
          email: normalizedEmail,
          name,
          isPlatformAdmin: false,
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: orgName,
          slug,
          status: "PENDING",
        },
      });

      await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          systemRole: "OWNER",
          status: "ACTIVE",
        },
      });

      await tx.auditLog.create({
        data: {
          action: "organization.created",
          entityType: "Organization",
          entityId: organization.id,
          newData: { name: organization.name, slug: organization.slug, status: "PENDING" },
          organizationId: organization.id,
          userId: user.id,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "user.registered",
          entityType: "User",
          entityId: user.id,
          newData: { email: user.email, name: user.name },
          organizationId: organization.id,
          userId: user.id,
        },
      });

      return { user, organization };
    });

    return NextResponse.json({ 
      success: true, 
      user: result.user,
      organization: result.organization,
      redirectTo: "/pending"
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Failed to register" }, { status: 500 });
  }
}
