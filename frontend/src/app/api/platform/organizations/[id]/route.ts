import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { requirePlatformAdmin } from "@/lib/platform-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;

    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        _count: {
          select: {
            employees: true,
            offboardings: true,
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Get Employee aggregates by status
    const employeeStats = await prisma.employee.groupBy({
      by: ["status"],
      where: { organizationId: id },
      _count: { id: true },
    });

    const statusCounts = {
      ACTIVE: 0,
      OFFBOARDING: 0,
      TERMINATED: 0,
      ARCHIVED: 0,
      ON_LEAVE: 0,
    };

    employeeStats.forEach((stat) => {
      if (stat.status in statusCounts) {
        statusCounts[stat.status as keyof typeof statusCounts] = stat._count.id;
      }
    });

    // Identify creator (first membership)
    const creatorId = organization.memberships[0]?.user.id;

    return NextResponse.json({
      organization: {
        ...organization,
        creatorId,
        employeeStats: {
          total: organization._count.employees,
          active: statusCounts.ACTIVE + statusCounts.ON_LEAVE,
          offboarding: statusCounts.OFFBOARDING,
          offboarded: statusCounts.TERMINATED + statusCounts.ARCHIVED,
        },
      },
    });
  } catch (error) {
    console.error("Platform organization detail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
