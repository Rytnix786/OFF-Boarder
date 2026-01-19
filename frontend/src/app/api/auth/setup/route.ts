import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50) + "-" + Math.random().toString(36).substring(2, 8);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { supabaseId, email, name, orgName, invitationToken } = body;

    if (!supabaseId || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { supabaseId },
      include: { memberships: { include: { organization: true } } },
    });

    if (existingUser) {
      return NextResponse.json({ user: existingUser, isExisting: true });
    }

    if (invitationToken) {
      const invitation = await prisma.invitation.findUnique({
        where: { token: invitationToken },
        include: { organization: true },
      });

      if (!invitation) {
        return NextResponse.json(
          { error: "Invitation not found" },
          { status: 400 }
        );
      }

      if (invitation.status !== "PENDING") {
        return NextResponse.json(
          { error: "This invitation has already been used or is no longer valid" },
          { status: 400 }
        );
      }

      if (new Date() > invitation.expiresAt) {
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: "EXPIRED" },
        });
        return NextResponse.json(
          { error: "This invitation has expired. Please request a new one." },
          { status: 400 }
        );
      }

      if (invitation.email.toLowerCase() !== email.toLowerCase()) {
        return NextResponse.json(
          { error: "This invitation was sent to a different email address" },
          { status: 403 }
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            supabaseId,
            email: email.toLowerCase(),
            name: name || null,
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
              approvedAt: new Date(),
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

      return NextResponse.json({ ...result, isNew: true, joinedViaInvitation: true });
    }

    const pendingInvitation = await prisma.invitation.findFirst({
      where: {
        email: { equals: email.toLowerCase(), mode: "insensitive" },
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
      include: { organization: true },
    });

    if (pendingInvitation) {
      return NextResponse.json(
        { 
          error: `You have a pending invitation to join ${pendingInvitation.organization.name}. Please use your invitation link or register with the invitation.`,
          hasInvitation: true,
          organizationName: pendingInvitation.organization.name,
        },
        { status: 400 }
      );
    }

    if (!orgName) {
      return NextResponse.json(
        { error: "Organization name is required for new accounts" },
        { status: 400 }
      );
    }

    const slug = generateSlug(orgName);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          supabaseId,
          email: email.toLowerCase(),
          name: name || null,
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

      const membership = await tx.membership.create({
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

      return { user, organization, membership };
    });

    return NextResponse.json({ ...result, isNew: true });
  } catch (error) {
    console.error("Auth setup error:", error);
    return NextResponse.json(
      { error: "Failed to set up account" },
      { status: 500 }
    );
  }
}
