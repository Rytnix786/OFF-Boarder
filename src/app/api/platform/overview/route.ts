import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { requirePlatformAdmin } from "@/lib/platform-auth";

export async function GET() {
  try {
    await requirePlatformAdmin();

    const [
      platformStatus,
      orgStats,
      offboardingStats,
      riskStats,
      recentSignals,
      securityEvents,
      globalPolicies,
      lastAuditActions,
    ] = await Promise.all([
      prisma.platformStatus.findFirst({ orderBy: { updatedAt: "desc" } }),

      prisma.organization.groupBy({
        by: ["status"],
        _count: { id: true },
      }),

      prisma.offboarding.groupBy({
        by: ["status"],
        _count: { id: true },
      }),

      prisma.riskScore.groupBy({
        by: ["level"],
        _count: { id: true },
      }),

      prisma.platformSignal.findMany({
        where: { acknowledged: false },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),

      prisma.securityEvent.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          resolved: false,
        },
      }),

      prisma.globalSecurityPolicy.findMany({
        select: {
          id: true,
          isActive: true,
          isMandatory: true,
          updatedAt: true,
        },
      }),

      prisma.platformAuditLog.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 72 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const totalOrgs = orgStats.reduce((sum, s) => sum + s._count.id, 0);
    const activeOrgs = orgStats.find((s) => s.status === "ACTIVE")?._count.id || 0;
    const pendingOrgs = orgStats.find((s) => s.status === "PENDING")?._count.id || 0;
    const suspendedOrgs = orgStats.find((s) => s.status === "SUSPENDED")?._count.id || 0;

    const totalOffboardings = offboardingStats.reduce((sum, s) => sum + s._count.id, 0);
    const activeOffboardings =
      (offboardingStats.find((s) => s.status === "IN_PROGRESS")?._count.id || 0) +
      (offboardingStats.find((s) => s.status === "PENDING")?._count.id || 0) +
      (offboardingStats.find((s) => s.status === "PENDING_APPROVAL")?._count.id || 0);

    const highRiskCount = riskStats.find((s) => s.level === "HIGH")?._count.id || 0;
    const criticalRiskCount = riskStats.find((s) => s.level === "CRITICAL")?._count.id || 0;

    const unresolvedSignals = recentSignals.filter((s) => !s.resolvedAt).length;
    const criticalSignals = recentSignals.filter((s) => s.severity === "CRITICAL").length;

    const totalPolicies = globalPolicies.length;
    const activePolicies = globalPolicies.filter((p) => p.isActive).length;
    const mandatoryPolicies = globalPolicies.filter((p) => p.isMandatory && p.isActive).length;
    const lastPolicyUpdate = globalPolicies.length > 0 
      ? globalPolicies.reduce((latest, p) => p.updatedAt > latest ? p.updatedAt : latest, globalPolicies[0].updatedAt)
      : null;

    const hasRiskDrift = criticalRiskCount > 0 || highRiskCount > 3 || suspendedOrgs > 0;
    const lastIncident = platformStatus?.incidentStarted || null;

    return NextResponse.json({
      platform: {
        status: platformStatus?.status || "OPERATIONAL",
        message: platformStatus?.message,
        incidentMode: platformStatus?.incidentMode || false,
        incidentReason: platformStatus?.incidentReason,
        incidentStarted: platformStatus?.incidentStarted,
      },
      organizations: {
        total: totalOrgs,
        active: activeOrgs,
        pending: pendingOrgs,
        suspended: suspendedOrgs,
      },
      offboardings: {
        total: totalOffboardings,
        active: activeOffboardings,
        highRisk: highRiskCount,
        critical: criticalRiskCount,
      },
      signals: {
        unresolved: unresolvedSignals,
        critical: criticalSignals,
        recent: recentSignals,
      },
      security: {
        unresolvedEvents: securityEvents,
      },
      governance: {
        totalPolicies,
        activePolicies,
        mandatoryPolicies,
        lastPolicyUpdate,
        hasRiskDrift,
        lastIncident,
        recentActions: lastAuditActions.map((a) => ({
          id: a.id,
          action: a.action,
          entityType: a.entityType,
          createdAt: a.createdAt,
          userName: a.userName || "System",
        })),
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
    console.error("Platform overview error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
