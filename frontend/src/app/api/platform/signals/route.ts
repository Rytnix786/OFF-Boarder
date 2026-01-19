import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { requirePlatformAdmin, getCurrentPlatformAdmin, logPlatformAction } from "@/lib/platform-auth";

export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const signalType = searchParams.get("signalType");
    const severity = searchParams.get("severity");
    const acknowledged = searchParams.get("acknowledged");

    const where: Record<string, unknown> = {};

    if (signalType) where.signalType = signalType;
    if (severity) where.severity = severity;
    if (acknowledged !== null && acknowledged !== "") {
      where.acknowledged = acknowledged === "true";
    }

    const [signals, total, stats] = await Promise.all([
      prisma.platformSignal.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.platformSignal.count({ where }),
      prisma.platformSignal.groupBy({
        by: ["severity"],
        _count: { id: true },
        where: { acknowledged: false },
      }),
    ]);

    const unacknowledgedBySeverity = stats.reduce((acc, s) => {
      acc[s.severity] = s._count.id;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      signals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        unacknowledged: {
          critical: unacknowledgedBySeverity["CRITICAL"] || 0,
          high: unacknowledgedBySeverity["HIGH"] || 0,
          medium: unacknowledgedBySeverity["MEDIUM"] || 0,
          low: unacknowledgedBySeverity["LOW"] || 0,
        },
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
    console.error("Platform signals error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await getCurrentPlatformAdmin();
    const body = await request.json();
    const { id, acknowledge, resolve, resolution } = body;

    if (!id) {
      return NextResponse.json({ error: "Signal ID required" }, { status: 400 });
    }

    const signal = await prisma.platformSignal.findUnique({ where: { id } });
    if (!signal) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};

    if (acknowledge) {
      updates.acknowledged = true;
      updates.acknowledgedBy = admin.id;
      updates.acknowledgedAt = new Date();
    }

    if (resolve) {
      updates.resolvedAt = new Date();
      updates.resolvedBy = admin.id;
      updates.resolution = resolution || "Resolved by platform admin";
    }

    const updated = await prisma.platformSignal.update({
      where: { id },
      data: updates,
    });

    await logPlatformAction({
      action: resolve ? "SIGNAL_RESOLVED" : "SIGNAL_ACKNOWLEDGED",
      entityType: "PlatformSignal",
      entityId: id,
      oldData: { acknowledged: signal.acknowledged, resolvedAt: signal.resolvedAt },
      newData: updates,
      userId: admin.id,
      userName: admin.name || admin.email,
      severity: signal.severity === "CRITICAL" ? "WARNING" : "INFO",
    });

    return NextResponse.json({ signal: updated });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Platform admin access required" }, { status: 403 });
      }
    }
    console.error("Platform signal update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
