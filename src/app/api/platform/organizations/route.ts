import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { requirePlatformAdmin, logPlatformAction } from "@/lib/platform-auth";

export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {};
    if (status && status !== "all") {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }

    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        include: {
          _count: {
            select: {
              employees: true,
              offboardings: true,
              memberships: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.organization.count({ where }),
    ]);

    const orgIds = organizations.map((o) => o.id);
    const riskScores = await prisma.riskScore.groupBy({
      by: ["organizationId", "level"],
      where: { organizationId: { in: orgIds } },
      _count: { id: true },
    });

    const lastActivityMap = await prisma.auditLog.groupBy({
      by: ["organizationId"],
      where: { organizationId: { in: orgIds } },
      _max: { createdAt: true },
    });

    const orgsWithMetrics = organizations.map((org) => {
      const orgRisks = riskScores.filter((r) => r.organizationId === org.id);
      const highRisk = orgRisks.find((r) => r.level === "HIGH")?._count.id || 0;
      const criticalRisk = orgRisks.find((r) => r.level === "CRITICAL")?._count.id || 0;
      const lastActivity = lastActivityMap.find((a) => a.organizationId === org.id)?._max.createdAt;

      return {
        ...org,
        riskSummary: { high: highRisk, critical: criticalRisk },
        lastActivity,
      };
    });

    return NextResponse.json({
      organizations: orgsWithMetrics,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Platform admin access required" }, { status: 403 });
      }
    }
    console.error("Platform organizations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requirePlatformAdmin();
    const body = await request.json();
    const { organizationId, action, reason } = body;

    if (!organizationId || !action) {
      return NextResponse.json({ error: "Organization ID and action required" }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    let newStatus: "ACTIVE" | "SUSPENDED" | "REJECTED" | "PENDING";
    let auditAction: string;

    switch (action) {
      case "approve":
        if (org.status !== "PENDING") {
          return NextResponse.json({ error: "Organization is not pending approval" }, { status: 400 });
        }
        newStatus = "ACTIVE";
        auditAction = "ORG_APPROVED";
        break;

      case "suspend":
        if (org.status === "SUSPENDED") {
          return NextResponse.json({ error: "Organization is already suspended" }, { status: 400 });
        }
        if (!reason) {
          return NextResponse.json({ error: "Reason required for suspension" }, { status: 400 });
        }
        newStatus = "SUSPENDED";
        auditAction = "ORG_SUSPENDED";
        break;

      case "reactivate":
        if (org.status !== "SUSPENDED") {
          return NextResponse.json({ error: "Only suspended organizations can be reactivated. Use 'accept_rejected' for rejected organizations." }, { status: 400 });
        }
        newStatus = "ACTIVE";
        auditAction = "ORG_REACTIVATED";
        break;

      case "reject":
        if (org.status !== "PENDING") {
          return NextResponse.json({ error: "Organization is not pending" }, { status: 400 });
        }
        if (!reason) {
          return NextResponse.json({ error: "Reason required for rejection" }, { status: 400 });
        }
        newStatus = "REJECTED";
        auditAction = "ORG_REJECTED";
        break;

      case "accept_rejected":
        if (org.status !== "REJECTED") {
          return NextResponse.json({ error: "Organization is not rejected" }, { status: 400 });
        }
        newStatus = "ACTIVE";
        auditAction = "ORG_APPROVED"; // Treating as an approval
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const updatedOrg = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        status: newStatus,
        approvedAt: action === "approve" || action === "reactivate" ? new Date() : org.approvedAt,
        approvedBy: action === "approve" || action === "reactivate" ? session.user.id : org.approvedBy,
        rejectionReason: action === "reject" || action === "suspend" ? reason : action === "reactivate" ? null : org.rejectionReason,
      },
    });

    if (action === "suspend" || action === "reject") {
      await prisma.membership.updateMany({
        where: { organizationId, status: "ACTIVE" },
        data: { status: "SUSPENDED" },
      });
    } else if (action === "approve" || action === "reactivate") {
      await prisma.membership.updateMany({
        where: { organizationId, status: "SUSPENDED" },
        data: { status: "ACTIVE" },
      });

      if (action === "reactivate") {
        const adminMembers = await prisma.membership.findMany({
          where: {
            organizationId,
            status: "ACTIVE",
            systemRole: { in: ["OWNER", "ADMIN"] },
          },
          select: { userId: true },
        });

        if (adminMembers.length > 0) {
          await prisma.notification.createMany({
            data: adminMembers.map((member) => ({
              userId: member.userId,
              organizationId,
              type: "ORG_REACTIVATED",
              title: "Organization Reactivated",
              message: `Your organization "${org.name}" has been reactivated by the platform administrator. You can now access all features and continue your work.`,
              link: "/app",
            })),
          });
        }
      }
    }

    await logPlatformAction({
      action: auditAction,
      entityType: "Organization",
      entityId: organizationId,
      organizationId,
      targetOrgName: org.name,
      oldData: { status: org.status },
      newData: { status: newStatus, reason },
      userId: session.user.id,
      userName: session.user.name || session.user.email,
      severity: action === "suspend" || action === "reject" ? "WARNING" : "INFO",
    });

    return NextResponse.json({ organization: updatedOrg });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Platform admin access required" }, { status: 403 });
      }
    }
    console.error("Platform organization update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
