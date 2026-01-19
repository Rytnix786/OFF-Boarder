import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-auth";

export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const action = searchParams.get("action");
    const entityType = searchParams.get("entityType");
    const severity = searchParams.get("severity");
    const organizationId = searchParams.get("organizationId");
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (severity) where.severity = severity;
    if (organizationId) where.organizationId = organizationId;
    if (userId) where.userId = userId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, Date>).gte = new Date(startDate);
      if (endDate) (where.createdAt as Record<string, Date>).lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { action: { contains: search, mode: "insensitive" } },
        { entityType: { contains: search, mode: "insensitive" } },
        { entityId: { contains: search, mode: "insensitive" } },
        { userName: { contains: search, mode: "insensitive" } },
        { targetOrgName: { contains: search, mode: "insensitive" } },
      ];
    }

    const [logs, total, actionCounts, severityCounts] = await Promise.all([
      prisma.platformAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.platformAuditLog.count({ where }),
      prisma.platformAuditLog.groupBy({
        by: ["action"],
        _count: { id: true },
        where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      prisma.platformAuditLog.groupBy({
        by: ["severity"],
        _count: { id: true },
        where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    const uniqueActions = await prisma.platformAuditLog.findMany({
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" },
    });

    const uniqueEntityTypes = await prisma.platformAuditLog.findMany({
      distinct: ["entityType"],
      select: { entityType: true },
      orderBy: { entityType: "asc" },
    });

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        actionCounts: actionCounts.map((a) => ({ action: a.action, count: a._count.id })),
        severityCounts: severityCounts.map((s) => ({ severity: s.severity, count: s._count.id })),
      },
      filters: {
        actions: uniqueActions.map((a) => a.action),
        entityTypes: uniqueEntityTypes.map((e) => e.entityType),
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
    console.error("Platform audit error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
