import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Invalid invitation link" }, { status: 400 });
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { organization: { select: { id: true, name: true, slug: true } } },
  });

  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  if (invitation.status !== "PENDING") {
    return NextResponse.json({ error: "Invitation is no longer valid" }, { status: 400 });
  }

  if (new Date() > invitation.expiresAt) {
    await prisma.invitation.update({ where: { id: invitation.id }, data: { status: "EXPIRED" } });
    return NextResponse.json({ error: "Invitation has expired" }, { status: 400 });
  }

  return NextResponse.json({ invitation });
}

export async function POST(request: NextRequest) {
  const { token } = await request.json();

  if (!token) {
    return NextResponse.json({ error: "Invalid invitation link" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in to accept an invitation" }, { status: 401 });
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { organization: true },
  });

  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  if (invitation.status !== "PENDING") {
    return NextResponse.json({ error: "Invitation is no longer valid" }, { status: 400 });
  }

  if (new Date() > invitation.expiresAt) {
    await prisma.invitation.update({ where: { id: invitation.id }, data: { status: "EXPIRED" } });
    return NextResponse.json({ error: "Invitation has expired" }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) {
    return NextResponse.json({ error: "User not found. Please complete registration first." }, { status: 400 });
  }

  if (dbUser.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return NextResponse.json({ error: "This invitation was sent to a different email address" }, { status: 403 });
  }

  const existingMembership = await prisma.membership.findFirst({
    where: { userId: dbUser.id, organizationId: invitation.organizationId },
  });

  if (existingMembership) {
    return NextResponse.json({ error: "You are already a member of this organization" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.membership.create({
      data: {
        userId: dbUser.id,
        organizationId: invitation.organizationId,
        systemRole: invitation.systemRole,
        status: "PENDING",
        invitedBy: invitation.invitedById,
      },
    }),
    prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        acceptedByUserId: dbUser.id,
      },
    }),
    prisma.auditLog.create({
      data: {
        action: "member.joined",
        entityType: "Membership",
        newData: { email: dbUser.email, role: invitation.systemRole },
        organizationId: invitation.organizationId,
        userId: dbUser.id,
      },
    }),
  ]);

  return NextResponse.json({ success: true, organizationSlug: invitation.organization.slug });
}
