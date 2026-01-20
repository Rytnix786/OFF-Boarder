import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const invite = await prisma.employeePortalInvite.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: "insensitive" },
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
      include: {
        organization: {
          select: { id: true, name: true, slug: true, status: true },
        },
        employee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!invite) {
      return NextResponse.json({ found: false });
    }

    if (invite.organization.status !== "ACTIVE") {
      return NextResponse.json({ 
        found: false, 
        error: "Organization is not active" 
      });
    }

    return NextResponse.json({
      found: true,
      invite: {
        id: invite.id,
        token: invite.token,
        email: invite.email,
        portalType: invite.portalType,
        organizationId: invite.organizationId,
        organizationName: invite.organization.name,
        employeeId: invite.employeeId,
        employeeDisplayName: `${invite.employee.firstName} ${invite.employee.lastName}`,
        expiresAt: invite.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Employee invite lookup error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
