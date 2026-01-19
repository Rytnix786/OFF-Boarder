import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true },
    });

    if (existingUser) {
      return NextResponse.json({
        hasAccount: true,
        message: "An account with this email already exists. Please sign in instead.",
      });
    }

    const invitation = await prisma.invitation.findFirst({
      where: {
        email: { equals: email.toLowerCase(), mode: "insensitive" },
        status: "PENDING",
      },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!invitation) {
      return NextResponse.json({
        hasInvitation: false,
        canCreateOrg: true,
      });
    }

    if (new Date() > invitation.expiresAt) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json({
        hasInvitation: false,
        invitationExpired: true,
        organizationName: invitation.organization.name,
        message: `Your invitation to ${invitation.organization.name} has expired. Please contact the administrator to request a new invitation.`,
      });
    }

    return NextResponse.json({
      hasInvitation: true,
      canCreateOrg: false,
      invitation: {
        id: invitation.id,
        token: invitation.token,
        email: invitation.email,
        systemRole: invitation.systemRole,
        organizationId: invitation.organizationId,
        organizationName: invitation.organization.name,
        organizationSlug: invitation.organization.slug,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error("Check invitation error:", error);
    return NextResponse.json({ error: "Failed to check invitation" }, { status: 500 });
  }
}
