import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { requirePlatformAdmin, logPlatformAction } from "@/lib/platform-auth";

export async function GET() {
  try {
    await requirePlatformAdmin();

    const status = await prisma.platformStatus.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      incidentMode: status?.incidentMode || false,
      status: status?.status || "OPERATIONAL",
      message: status?.message,
      incidentReason: status?.incidentReason,
      incidentStarted: status?.incidentStarted,
      incidentEndedAt: status?.incidentEndedAt,
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePlatformAdmin();
    const body = await request.json();
    const { enable, reason } = body;

    if (enable && !reason) {
      return NextResponse.json({ error: "Reason required to enable incident mode" }, { status: 400 });
    }

    const currentStatus = await prisma.platformStatus.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    let status;
    if (currentStatus) {
      status = await prisma.platformStatus.update({
        where: { id: currentStatus.id },
        data: {
          incidentMode: enable,
          status: enable ? "INCIDENT" : "OPERATIONAL",
          incidentReason: enable ? reason : null,
          incidentStarted: enable ? new Date() : null,
          incidentEndedAt: !enable && currentStatus.incidentMode ? new Date() : null,
          updatedBy: session.user.id,
        },
      });
    } else {
      status = await prisma.platformStatus.create({
        data: {
          incidentMode: enable,
          status: enable ? "INCIDENT" : "OPERATIONAL",
          incidentReason: enable ? reason : null,
          incidentStarted: enable ? new Date() : null,
          updatedBy: session.user.id,
        },
      });
    }

    await logPlatformAction({
      action: enable ? "INCIDENT_MODE_ENABLED" : "INCIDENT_MODE_DISABLED",
      entityType: "PlatformStatus",
      entityId: status.id,
      newData: { incidentMode: enable, reason },
      userId: session.user.id,
      userName: session.user.name || session.user.email,
      severity: "CRITICAL",
    });

    return NextResponse.json({
      incidentMode: status.incidentMode,
      status: status.status,
      incidentReason: status.incidentReason,
      incidentStarted: status.incidentStarted,
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
    console.error("Incident mode error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
