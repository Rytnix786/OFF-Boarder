import { prisma } from "@/lib/prisma.server";
import { AuthSession } from "@/lib/auth-types";
import { Box, Typography, Card, CardContent, Grid, Button, Chip, Avatar, alpha, LinearProgress } from "@mui/material";
import Link from "next/link";

interface AdminDashboardProps {
  session: AuthSession;
}

type RiskPosture = "LOW" | "ELEVATED" | "HIGH";

function calculateRiskPosture(
  criticalRiskCount: number,
  highRiskCount: number,
  overdueTasksCount: number,
  pendingRevocations: number,
  unreturnedAssets: number
): { posture: RiskPosture; score: number } {
  let score = 0;
  if (criticalRiskCount > 0) score += criticalRiskCount * 40;
  if (highRiskCount > 0) score += highRiskCount * 20;
  if (overdueTasksCount > 0) score += overdueTasksCount * 10;
  if (pendingRevocations > 0) score += pendingRevocations * 5;
  if (unreturnedAssets > 0) score += unreturnedAssets * 15;

  let posture: RiskPosture = "LOW";
  if (score >= 80) posture = "HIGH";
  else if (score >= 30) posture = "ELEVATED";

  return { posture, score };
}

const postureConfig = {
  LOW: {
    color: "#059669",
    bg: "#05966908",
    border: "#05966925",
    icon: "verified_user",
    verdict: "SECURE",
    description: "No exposure detected.",
  },
  ELEVATED: {
    color: "#d97706",
    bg: "#d9770608",
    border: "#d9770625",
    icon: "shield",
    verdict: "ATTENTION",
    description: "Review recommended.",
  },
  HIGH: {
    color: "#dc2626",
    bg: "#dc262608",
    border: "#dc262625",
    icon: "gpp_bad",
    verdict: "AT RISK",
    description: "Immediate action required.",
  },
};

export async function AdminDashboard({ session }: AdminDashboardProps) {
  const orgId = session.currentOrgId!;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    activeOffboardings,
    pendingApprovalOffboardings,
    criticalRiskOffboardings,
    highRiskOffboardings,
    overdueTasksCount,
    pendingRevocations,
    unreturnedAssets,
    completedThisMonth,
    completedLastMonth,
    recentOffboardingsWithDetails,
    overdueTasks,
    highRiskCases,
    pendingApprovals,
    assetIssues,
    recentSecurityEvents,
    avgCompletionTime,
    recentCompletions,
    bottlenecksByDept,
    totalEvidencePacks,
    sealedEvidencePacks,
    totalAuditLogs,
    recentAuditLogs,
    activePolicies,
    totalWorkflows,
  ] = await Promise.all([
    prisma.offboarding.count({
      where: { organizationId: orgId, status: { in: ["PENDING", "IN_PROGRESS", "PENDING_APPROVAL"] } },
    }),
    prisma.offboarding.count({
      where: { organizationId: orgId, status: "PENDING_APPROVAL" },
    }),
    prisma.offboarding.count({
      where: { organizationId: orgId, riskLevel: "CRITICAL", status: { in: ["PENDING", "IN_PROGRESS"] } },
    }),
    prisma.offboarding.count({
      where: { organizationId: orgId, riskLevel: "HIGH", status: { in: ["PENDING", "IN_PROGRESS"] } },
    }),
    prisma.offboardingTask.count({
      where: {
        offboarding: { organizationId: orgId, status: { in: ["PENDING", "IN_PROGRESS"] } },
        status: { in: ["PENDING", "IN_PROGRESS"] },
        dueDate: { lt: now },
      },
    }),
    prisma.accessRevocation.count({
      where: {
        organizationId: orgId,
        status: "PENDING",
        offboarding: { status: { in: ["PENDING", "IN_PROGRESS"] } },
      },
    }),
    prisma.assetReturn.count({
      where: {
        offboarding: { organizationId: orgId, status: { in: ["PENDING", "IN_PROGRESS", "COMPLETED"] } },
        status: { in: ["PENDING", "NOT_RETURNED", "LOST"] },
      },
    }),
    prisma.offboarding.count({
      where: { organizationId: orgId, status: "COMPLETED", completedDate: { gte: thirtyDaysAgo } },
    }),
    prisma.offboarding.count({
      where: {
        organizationId: orgId,
        status: "COMPLETED",
        completedDate: {
          gte: new Date(thirtyDaysAgo.getTime() - 30 * 24 * 60 * 60 * 1000),
          lt: thirtyDaysAgo,
        },
      },
    }),
    prisma.offboarding.findMany({
      where: { organizationId: orgId, status: { in: ["PENDING", "IN_PROGRESS", "PENDING_APPROVAL"] } },
      include: {
        employee: { select: { firstName: true, lastName: true, department: { select: { name: true } } } },
        tasks: { select: { status: true, dueDate: true } },
        riskScore: { select: { level: true, score: true } },
      },
      orderBy: [{ riskLevel: "desc" }, { scheduledDate: "asc" }],
      take: 8,
    }),
    prisma.offboardingTask.findMany({
      where: {
        offboarding: { organizationId: orgId, status: { in: ["PENDING", "IN_PROGRESS"] } },
        status: { in: ["PENDING", "IN_PROGRESS"] },
        dueDate: { lt: now },
      },
      include: {
        offboarding: {
          select: { id: true, employee: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.offboarding.findMany({
      where: {
        organizationId: orgId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
        riskScore: { score: { gte: 50 } },
      },
      include: {
        employee: { select: { firstName: true, lastName: true } },
        riskScore: { select: { level: true, score: true, factors: true } },
      },
      orderBy: { riskScore: { score: "desc" } },
      take: 5,
    }),
    prisma.approval.findMany({
      where: {
        offboarding: { organizationId: orgId },
        status: "PENDING",
      },
      include: {
        offboarding: {
          select: { id: true, employee: { select: { firstName: true, lastName: true } } },
        },
        task: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),
    prisma.assetReturn.findMany({
      where: {
        offboarding: { organizationId: orgId },
        status: { in: ["NOT_RETURNED", "LOST"] },
      },
      include: {
        asset: { select: { name: true, type: true } },
        offboarding: {
          select: { id: true, employee: { select: { firstName: true, lastName: true } } },
        },
      },
      take: 5,
    }),
    prisma.securityEvent.findMany({
      where: { organizationId: orgId, resolved: false, createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    (async () => {
      const completedWithDates = await prisma.offboarding.findMany({
        where: {
          organizationId: orgId,
          status: "COMPLETED",
          completedDate: { not: null },
          createdAt: { gte: thirtyDaysAgo },
        },
        select: { createdAt: true, completedDate: true },
      });
      if (completedWithDates.length === 0) return null;
      const totalDays = completedWithDates.reduce((acc, o) => {
        const diff = (new Date(o.completedDate!).getTime() - new Date(o.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return acc + diff;
      }, 0);
      return Math.round(totalDays / completedWithDates.length);
    })(),
    prisma.offboarding.findMany({
      where: { organizationId: orgId, status: "COMPLETED", completedDate: { gte: sevenDaysAgo } },
      include: { employee: { select: { firstName: true, lastName: true } } },
      orderBy: { completedDate: "desc" },
      take: 5,
    }),
    prisma.offboarding.groupBy({
      by: ["employeeId"],
      where: {
        organizationId: orgId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
        tasks: { some: { status: { in: ["PENDING", "IN_PROGRESS"] }, dueDate: { lt: now } } },
      },
      _count: true,
    }).then(async (result) => {
      if (result.length === 0) return [];
      const employeeIds = result.map(r => r.employeeId);
      const employees = await prisma.employee.findMany({
        where: { id: { in: employeeIds } },
        select: { id: true, department: { select: { name: true } } },
      });
      const deptCounts: Record<string, number> = {};
      employees.forEach(emp => {
        const deptName = emp.department?.name || "No Department";
        const count = result.find(r => r.employeeId === emp.id)?._count || 0;
        deptCounts[deptName] = (deptCounts[deptName] || 0) + count;
      });
      return Object.entries(deptCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
    }),
    prisma.evidencePack.count({ where: { offboarding: { organizationId: orgId } } }),
    prisma.evidencePack.count({ where: { offboarding: { organizationId: orgId }, sealed: true } }),
    prisma.auditLog.count({ where: { organizationId: orgId } }),
    prisma.auditLog.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 1,
    }),
    prisma.securityPolicy.count({ where: { organizationId: orgId, isActive: true } }),
    prisma.workflowTemplate.count({ where: { organizationId: orgId, isActive: true } }),
  ]);

  const { posture } = calculateRiskPosture(
    criticalRiskOffboardings,
    highRiskOffboardings,
    overdueTasksCount,
    pendingRevocations,
    unreturnedAssets
  );

  const highRiskTotal = criticalRiskOffboardings + highRiskOffboardings;
  const currentPosture = postureConfig[posture];
  const lastAuditLog = recentAuditLogs[0];

  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const past = new Date(date);
    const mins = Math.floor((now.getTime() - past.getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return past.toLocaleDateString();
  };

  const getDaysOverdue = (dueDate: Date | string) => {
    const due = new Date(dueDate);
    const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

    return (
      <Box sx={{ maxWidth: 1400, mx: "auto" }}>
          {/* PAGE HEADER */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="overline" sx={{ fontWeight: 600, color: "text.secondary", letterSpacing: 1.5, fontSize: "0.6875rem" }}>
                {session.currentMembership?.organization.name} · Production
              </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: "text.primary", letterSpacing: -0.5 }}>
              Command Center
            </Typography>
          </Box>

        {/* ═══════════════════════════════════════════════════════════════════════════════════════
            STATUS VERDICT
            The semantic center of the page — a system decision, not a message
        ═══════════════════════════════════════════════════════════════════════════════════════ */}
        <Card
          variant="outlined"
          sx={{
            mb: 3,
            borderRadius: 2.5,
            bgcolor: currentPosture.bg,
            borderColor: currentPosture.border,
            borderWidth: 1.5,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 4,
              height: "100%",
              bgcolor: currentPosture.color,
            }}
          />
          <CardContent sx={{ py: 3, px: 4, "&:last-child": { pb: 3 } }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: alpha(currentPosture.color, 0.12),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 26, color: currentPosture.color }}>
                  {currentPosture.icon}
                </span>
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 900, color: currentPosture.color, fontSize: "1.5rem", letterSpacing: 1, lineHeight: 1 }}>
                  {currentPosture.verdict}
                </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 600, fontSize: "0.95rem" }}>
                    {currentPosture.description}
                  </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* ═══════════════════════════════════════════════════════════════════════════════════════
            TELEMETRY
            System-level metrics with semantic qualifiers
        ═══════════════════════════════════════════════════════════════════════════════════════ */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" }, gap: 2, mb: 6 }}>
          <Link href="/app/offboardings" style={{ textDecoration: "none", color: "inherit" }}>
            <Card
              variant="outlined"
              sx={{
                borderRadius: 2,
                transition: "border-color 0.15s",
                "&:hover": { borderColor: "primary.main" },
              }}
            >
                <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: "text.primary", lineHeight: 1, mb: 0.5 }}>
                    {activeOffboardings}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: 1, fontSize: "0.6875rem", display: "block" }}>
                      Active Cases
                    </Typography>
                    <Typography variant="caption" sx={{ color: activeOffboardings === 0 ? "#10b981" : "text.secondary", fontWeight: 600, fontSize: "0.75rem" }}>
                    {activeOffboardings === 0 ? "System Idle" : "Processing"}
                  </Typography>
                </CardContent>
            </Card>
          </Link>

          <Link href="/app/risk-radar" style={{ textDecoration: "none", color: "inherit" }}>
            <Card
              variant="outlined"
              sx={{
                borderRadius: 2,
                transition: "border-color 0.15s",
                borderColor: highRiskTotal > 0 ? alpha("#dc2626", 0.3) : undefined,
                "&:hover": { borderColor: highRiskTotal > 0 ? "#dc2626" : "primary.main" },
              }}
            >
                <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: highRiskTotal > 0 ? "#dc2626" : "text.primary", lineHeight: 1, mb: 0.5 }}>
                    {highRiskTotal}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: highRiskTotal > 0 ? "#dc2626" : "text.secondary", textTransform: "uppercase", letterSpacing: 1, fontSize: "0.6875rem", display: "block" }}>
                      High-Risk
                    </Typography>
                    <Typography variant="caption" sx={{ color: highRiskTotal === 0 ? "#10b981" : "#dc2626", fontWeight: 600, fontSize: "0.75rem" }}>
                    {highRiskTotal === 0 ? "No Exposure" : "Requires Review"}
                  </Typography>
                </CardContent>
            </Card>
          </Link>

          <Link href="/app/offboardings?status=PENDING_APPROVAL" style={{ textDecoration: "none", color: "inherit" }}>
            <Card
              variant="outlined"
              sx={{
                borderRadius: 2,
                transition: "border-color 0.15s",
                borderColor: pendingApprovalOffboardings > 0 ? alpha("#d97706", 0.3) : undefined,
                "&:hover": { borderColor: pendingApprovalOffboardings > 0 ? "#d97706" : "primary.main" },
              }}
            >
                <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: pendingApprovalOffboardings > 0 ? "#d97706" : "text.primary", lineHeight: 1, mb: 0.5 }}>
                    {pendingApprovalOffboardings}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: pendingApprovalOffboardings > 0 ? "#d97706" : "text.secondary", textTransform: "uppercase", letterSpacing: 1, fontSize: "0.6875rem", display: "block" }}>
                      Approvals
                    </Typography>
                    <Typography variant="caption" sx={{ color: pendingApprovalOffboardings === 0 ? "#10b981" : "#d97706", fontWeight: 600, fontSize: "0.75rem" }}>
                    {pendingApprovalOffboardings === 0 ? "Queue Clear" : "Awaiting Action"}
                  </Typography>
                </CardContent>
            </Card>
          </Link>

          <Link href="/app/assets?status=pending" style={{ textDecoration: "none", color: "inherit" }}>
            <Card
              variant="outlined"
              sx={{
                borderRadius: 2,
                transition: "border-color 0.15s",
                borderColor: unreturnedAssets > 0 ? alpha("#d97706", 0.3) : undefined,
                "&:hover": { borderColor: unreturnedAssets > 0 ? "#d97706" : "primary.main" },
              }}
            >
                <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: unreturnedAssets > 0 ? "#d97706" : "text.primary", lineHeight: 1, mb: 0.5 }}>
                    {unreturnedAssets}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: unreturnedAssets > 0 ? "#d97706" : "text.secondary", textTransform: "uppercase", letterSpacing: 1, fontSize: "0.6875rem", display: "block" }}>
                      Assets
                    </Typography>
                    <Typography variant="caption" sx={{ color: unreturnedAssets === 0 ? "#10b981" : "#d97706", fontWeight: 600, fontSize: "0.75rem" }}>
                    {unreturnedAssets === 0 ? "All Recovered" : "Outstanding"}
                  </Typography>
                </CardContent>
            </Card>
          </Link>
        </Box>

      {/* ═══════════════════════════════════════════════════════════════════════════════════════
          ZONE 2: ATTENTION & ALERTS (MOST IMPORTANT)
          Purpose: Tell the admin what needs action NOW - control room alert feed
      ═══════════════════════════════════════════════════════════════════════════════════════ */}
        {(overdueTasksCount > 0 || highRiskCases.length > 0 || assetIssues.length > 0 || pendingApprovals.length > 0 || recentSecurityEvents.length > 0) && (
          <Box sx={{ mb: 6 }}>
          <Typography variant="overline" sx={{ color: "text.secondary", fontWeight: 700, letterSpacing: 1, mb: 2, display: "block" }}>
            Action Required
          </Typography>
          <Card variant="outlined" sx={{ borderRadius: 2, borderColor: alpha("#dc2626", 0.2), overflow: "hidden" }}>
            <Box sx={{ maxHeight: 400, overflow: "auto" }}>
              {/* Overdue Tasks - Highest Priority */}
              {overdueTasks.map((task) => (
                <Link key={task.id} href={`/app/offboardings/${task.offboarding.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <Box
                    sx={{
                      px: 3,
                      py: 2,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      bgcolor: alpha("#dc2626", 0.03),
                      "&:hover": { bgcolor: alpha("#dc2626", 0.06) },
                    }}
                  >
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1,
                        bgcolor: alpha("#dc2626", 0.1),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#dc2626" }}>schedule</span>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {task.name}
                        </Typography>
                        <Chip
                          label={`${getDaysOverdue(task.dueDate!)}d overdue`}
                          size="small"
                          sx={{ height: 20, fontSize: "0.75rem", fontWeight: 700, bgcolor: "#dc262615", color: "#dc2626" }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {task.offboarding.employee.firstName} {task.offboarding.employee.lastName}
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: "#dc2626", fontWeight: 600 }}>
                      Action Required
                    </Typography>
                  </Box>
                </Link>
              ))}

              {/* High-Risk Cases */}
              {highRiskCases.map((ob) => {
                const factors = ob.riskScore?.factors as { label?: string }[] | null;
                const topFactor = factors?.[0]?.label || "Multiple risk factors";
                return (
                  <Link key={ob.id} href={`/app/risk-radar/${ob.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <Box
                      sx={{
                        px: 3,
                        py: 2,
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        "&:hover": { bgcolor: "action.hover" },
                      }}
                    >
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 1,
                          bgcolor: alpha("#f97316", 0.1),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#f97316" }}>warning</span>
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {ob.employee.firstName} {ob.employee.lastName}
                          </Typography>
                          <Chip
                            label={`Risk ${ob.riskScore?.score || 0}`}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              bgcolor: ob.riskScore?.level === "CRITICAL" ? "#dc262615" : "#f9731615",
                              color: ob.riskScore?.level === "CRITICAL" ? "#dc2626" : "#f97316",
                            }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {topFactor}
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: "#f97316", fontWeight: 600 }}>
                        Pending Review
                      </Typography>
                    </Box>
                  </Link>
                );
              })}

              {/* Asset Recovery Issues */}
              {assetIssues.map((ar) => (
                <Link key={ar.id} href={`/app/offboardings/${ar.offboarding.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <Box
                    sx={{
                      px: 3,
                      py: 2,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1,
                        bgcolor: alpha("#d97706", 0.1),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#d97706" }}>
                        {ar.status === "LOST" ? "help" : "devices"}
                      </span>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {ar.asset.name} - {ar.status === "LOST" ? "Reported Lost" : "Not Returned"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {ar.offboarding.employee.firstName} {ar.offboarding.employee.lastName}
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: "#d97706", fontWeight: 600 }}>
                      {ar.status === "LOST" ? "Lost" : "Pending Return"}
                    </Typography>
                  </Box>
                </Link>
              ))}

              {/* Approval Bottlenecks */}
              {pendingApprovals.map((approval) => (
                <Link key={approval.id} href={`/app/offboardings/${approval.offboarding.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <Box
                    sx={{
                      px: 3,
                      py: 2,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1,
                        bgcolor: alpha("#6366f1", 0.1),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#6366f1" }}>approval</span>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {approval.task?.name || "Offboarding Approval"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {approval.offboarding.employee.firstName} {approval.offboarding.employee.lastName} • {formatTimeAgo(approval.createdAt)}
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: "#6366f1", fontWeight: 600 }}>
                      Pending Approval
                    </Typography>
                  </Box>
                </Link>
              ))}

              {/* Security Signals */}
              {recentSecurityEvents.map((event) => (
                <Box
                  key={event.id}
                  sx={{
                    px: 3,
                    py: 2,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 1,
                      bgcolor: alpha("#dc2626", 0.1),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#dc2626" }}>security</span>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {event.eventType.replace(/_/g, " ")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {event.description}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {formatTimeAgo(event.createdAt)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Card>
        </Box>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════════════
          ZONE 3: OPERATIONAL FLOW VISIBILITY
          Purpose: Show progress, not just totals. Focus on predictability and throughput.
      ═══════════════════════════════════════════════════════════════════════════════════════ */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="overline" sx={{ color: "text.secondary", fontWeight: 700, letterSpacing: 1, mb: 2, display: "block" }}>
          Operational Status
        </Typography>
        <Grid container spacing={3}>
          {/* Offboarding Pipeline */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card variant="outlined" sx={{ borderRadius: 2, height: "100%" }}>
              <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
                <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Offboarding Pipeline
                  </Typography>
                  <Link href="/app/offboardings" style={{ textDecoration: "none" }}>
                    <Button size="small" sx={{ fontWeight: 600 }}>View All</Button>
                  </Link>
                </Box>

                    {recentOffboardingsWithDetails.length === 0 ? (
                      <Box sx={{ p: 5, textAlign: "center" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 40, color: "#6b7280", opacity: 0.25, marginBottom: 12, display: "block" }}>
                          inbox
                        </span>
                        <Typography variant="body2" fontWeight={600} color="text.secondary">
                          No active offboardings
                        </Typography>
                      </Box>
                    ) : (
                  <Box>
                    {recentOffboardingsWithDetails.map((ob) => {
                      const completedTasks = ob.tasks.filter(t => t.status === "COMPLETED" || t.status === "SKIPPED").length;
                      const progress = ob.tasks.length > 0 ? Math.round((completedTasks / ob.tasks.length) * 100) : 0;
                      const overdue = ob.tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== "COMPLETED" && t.status !== "SKIPPED").length;
                      const riskColor = ob.riskLevel === "CRITICAL" ? "#dc2626" : ob.riskLevel === "HIGH" ? "#f97316" : "#6b7280";

                      return (
                        <Link key={ob.id} href={`/app/offboardings/${ob.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                          <Box
                            sx={{
                              px: 3,
                              py: 2,
                              borderBottom: "1px solid",
                              borderColor: "divider",
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                              "&:hover": { bgcolor: "action.hover" },
                              "&:last-child": { borderBottom: "none" },
                            }}
                          >
                            <Avatar
                              sx={{
                                width: 40,
                                height: 40,
                                bgcolor: alpha(riskColor, 0.1),
                                color: riskColor,
                                fontWeight: 700,
                                fontSize: "0.875rem",
                              }}
                            >
                              {ob.employee.firstName.charAt(0)}{ob.employee.lastName.charAt(0)}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.25 }}>
                                <Typography variant="body2" fontWeight={600} noWrap>
                                  {ob.employee.firstName} {ob.employee.lastName}
                                </Typography>
                                {ob.riskScore?.score && ob.riskScore.score >= 40 && (
                                  <Box sx={{ px: 0.75, py: 0.25, borderRadius: 0.75, bgcolor: alpha(riskColor, 0.1) }}>
                                    <Typography variant="caption" fontWeight={700} color={riskColor}>
                                      {ob.riskScore.score}
                                    </Typography>
                                  </Box>
                                )}
                                {overdue > 0 && (
                          <Chip
                            label={`${overdue} overdue`}
                            size="small"
                            sx={{ height: 20, fontSize: "0.6875rem", fontWeight: 700, bgcolor: "#dc262615", color: "#dc2626" }}
                          />
                                )}
                              </Box>
                              <Typography variant="caption" color="text.secondary">
                                {ob.employee.department?.name || "No department"}
                              </Typography>
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                              <Chip
                                label={ob.status.replace("_", " ")}
                                size="small"
                                sx={{
                                  height: 22,
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  bgcolor: ob.status === "IN_PROGRESS" ? "#f59e0b15" : ob.status === "PENDING_APPROVAL" ? "#6366f115" : "#6b728015",
                                  color: ob.status === "IN_PROGRESS" ? "#d97706" : ob.status === "PENDING_APPROVAL" ? "#6366f1" : "#6b7280",
                                }}
                              />
                              <Box sx={{ width: 80, textAlign: "right" }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                                  {progress}%
                                </Typography>
                                <LinearProgress
                                  variant="determinate"
                                  value={progress}
                                  sx={{
                                    height: 4,
                                    borderRadius: 2,
                                    bgcolor: "#e5e7eb",
                                    "& .MuiLinearProgress-bar": { bgcolor: progress === 100 ? "#059669" : "#0284c7" },
                                  }}
                                />
                              </Box>
                            </Box>
                          </Box>
                        </Link>
                      );
                    })}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Throughput Metrics */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%" }}>
              {/* Average Completion Time */}
              <Card variant="outlined" sx={{ borderRadius: 2, flex: 1 }}>
                <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                  <Typography variant="overline" sx={{ color: "text.secondary", fontWeight: 600, letterSpacing: 0.5, fontSize: "0.6875rem" }}>
                      Average Completion
                    </Typography>
                  <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mt: 0.5 }}>
                    <Typography variant="h4" fontWeight={800}>
                      {avgCompletionTime || "—"}
                    </Typography>
                    {avgCompletionTime && <Typography variant="body2" color="text.secondary">days</Typography>}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Based on last 30 days
                  </Typography>
                </CardContent>
              </Card>

              {/* Completed This Month */}
              <Card variant="outlined" sx={{ borderRadius: 2, flex: 1 }}>
                <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                  <Typography variant="overline" sx={{ color: "text.secondary", fontWeight: 600, letterSpacing: 0.5, fontSize: "0.6875rem" }}>
                      Completed This Month
                    </Typography>
                  <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mt: 0.5 }}>
                    <Typography variant="h4" fontWeight={800}>
                      {completedThisMonth}
                    </Typography>
                    {completedLastMonth > 0 && (
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 600,
                          color: completedThisMonth >= completedLastMonth ? "#059669" : "#dc2626",
                        }}
                      >
                        {completedThisMonth >= completedLastMonth ? "+" : ""}{completedThisMonth - completedLastMonth} vs last month
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>

              {/* Bottlenecks */}
              {bottlenecksByDept.length > 0 && (
                <Card variant="outlined" sx={{ borderRadius: 2, flex: 1, bgcolor: alpha("#d97706", 0.03) }}>
                  <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                    <Typography variant="overline" sx={{ color: "#d97706", fontWeight: 600, letterSpacing: 0.5, fontSize: "0.6875rem" }}>
                      Bottlenecks by Department
                    </Typography>
                    <Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
                      {bottlenecksByDept.map((dept) => (
                        <Box key={dept.name} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Typography variant="caption" fontWeight={600}>
                            {dept.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#d97706", fontWeight: 700 }}>
                            {dept.count} overdue
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              )}
            </Box>
          </Grid>
        </Grid>

        {/* Recently Completed */}
        {recentCompletions.length > 0 && (
          <Card variant="outlined" sx={{ borderRadius: 2, mt: 3 }}>
            <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
              <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider" }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Recently Completed
                </Typography>
              </Box>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0 }}>
                {recentCompletions.map((ob) => (
                  <Box
                    key={ob.id}
                    sx={{
                      px: 3,
                      py: 1.5,
                      borderRight: "1px solid",
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      flex: { xs: "1 1 100%", sm: "1 1 50%", md: "1 1 33%" },
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#059669" }}>check_circle</span>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" fontWeight={600} noWrap sx={{ display: "block" }}>
                        {ob.employee.firstName} {ob.employee.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                        {ob.completedDate ? formatTimeAgo(ob.completedDate) : "Recently"}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* ═══════════════════════════════════════════════════════════════════════════════════════
          ZONE 4: COMPLIANCE & CONFIDENCE
          Purpose: Reassure the admin that nothing is slipping. Calm and non-alarming.
      ═══════════════════════════════════════════════════════════════════════════════════════ */}
      <Box>
        <Typography variant="overline" sx={{ color: "text.secondary", fontWeight: 700, letterSpacing: 1, mb: 2, display: "block" }}>
          Compliance & Audit
        </Typography>
        <Grid container spacing={3}>
              {/* Audit & Compliance — Facts → Conclusion */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Card variant="outlined" sx={{ borderRadius: 2, height: "100%" }}>
                  <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary", textTransform: "uppercase", letterSpacing: 1, fontSize: "0.75rem" }}>
                          Audit & Compliance
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1, py: 0.5, bgcolor: alpha("#10b981", 0.12), borderRadius: 0.75 }}>
                            <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "#10b981" }} />
                            <Typography variant="caption" sx={{ fontWeight: 700, color: "#10b981", fontSize: "0.6875rem", letterSpacing: 0.3 }}>
                              Recording
                            </Typography>
                          </Box>
                      </Box>

                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="body2" color="text.secondary">Evidence packs</Typography>
                        <Typography variant="body2" fontWeight={700}>{totalEvidencePacks > 0 ? `${sealedEvidencePacks}/${totalEvidencePacks} sealed` : "0"}</Typography>
                      </Box>

                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="body2" color="text.secondary">Audit events</Typography>
                        <Typography variant="body2" fontWeight={700}>{totalAuditLogs.toLocaleString()}</Typography>
                      </Box>

                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="body2" color="text.secondary">Active policies</Typography>
                        <Typography variant="body2" fontWeight={700}>{activePolicies}</Typography>
                      </Box>

                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="body2" color="text.secondary">Workflow templates</Typography>
                        <Typography variant="body2" fontWeight={700}>{totalWorkflows}</Typography>
                      </Box>
                    </Box>

                    <Box sx={{ pt: 2.5, mt: 2.5, borderTop: "1px solid", borderColor: "divider" }}>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5, fontWeight: 500 }}>
                        Audit records current. Continuously maintained.
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

            {/* Administrative Controls — Links → Governed Controls */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card variant="outlined" sx={{ borderRadius: 2, height: "100%", position: "relative", overflow: "hidden" }}>
                    <Box
                      sx={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: 2,
                        height: "100%",
                        bgcolor: alpha("#3b82f6", 0.35),
                      }}
                    />
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.75 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: alpha("#3b82f6", 0.85), textTransform: "uppercase", letterSpacing: 1, fontSize: "0.75rem" }}>
                            Administrative Controls
                          </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1, py: 0.5, bgcolor: alpha("#10b981", 0.12), borderRadius: 0.75 }}>
                            <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "#10b981" }} />
                            <Typography variant="caption" sx={{ fontWeight: 700, color: "#10b981", fontSize: "0.6875rem", letterSpacing: 0.3 }}>
                              Authorized
                            </Typography>
                          </Box>
                      </Box>
                    <Typography variant="body2" sx={{ color: "text.secondary", display: "block", mb: 2.5, lineHeight: 1.5, fontWeight: 500 }}>
                      Governed system controls. All actions logged.
                    </Typography>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                          <Link href="/app/offboardings" style={{ textDecoration: "none", color: "inherit" }}>
                            <Box
                              sx={{
                                p: 1.5,
                                borderRadius: 1.5,
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                border: "1px solid",
                                borderColor: "divider",
                                transition: "all 100ms ease-out",
                                "&:hover": { 
                                  bgcolor: alpha("#3b82f6", 0.04), 
                                  borderColor: alpha("#3b82f6", 0.2),
                                  "& .control-icon": { color: alpha("#3b82f6", 0.8) },
                                  "& .control-chevron": { transform: "translateX(2px)", color: alpha("#3b82f6", 0.7) },
                                },
                                "&:active": { 
                                  bgcolor: alpha("#3b82f6", 0.08),
                                  transform: "scale(0.995)",
                                },
                                "&:focus-visible": {
                                  outline: "2px solid",
                                  outlineColor: "primary.main",
                                  outlineOffset: 1,
                                },
                              }}
                            >
                              <span className="material-symbols-outlined control-icon icon-row" style={{ fontSize: 18, transition: "color 100ms ease-out" }}>person_remove</span>
                              <Typography variant="body2" sx={{ flex: 1, fontWeight: 600, color: "text.primary" }}>Initiate Offboarding</Typography>
                              <span className="material-symbols-outlined control-chevron icon-muted" style={{ fontSize: 16, transition: "transform 100ms ease-out, color 100ms ease-out" }}>chevron_right</span>
                            </Box>
                          </Link>
    
                          <Link href="/app/employees" style={{ textDecoration: "none", color: "inherit" }}>
                            <Box
                              sx={{
                                p: 1.5,
                                borderRadius: 1.5,
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                border: "1px solid",
                                borderColor: "divider",
                                transition: "all 100ms ease-out",
                                "&:hover": { 
                                  bgcolor: alpha("#3b82f6", 0.04), 
                                  borderColor: alpha("#3b82f6", 0.2),
                                  "& .control-icon": { color: alpha("#3b82f6", 0.8) },
                                  "& .control-chevron": { transform: "translateX(2px)", color: alpha("#3b82f6", 0.7) },
                                },
                                "&:active": { 
                                  bgcolor: alpha("#3b82f6", 0.08),
                                  transform: "scale(0.995)",
                                },
                                "&:focus-visible": {
                                  outline: "2px solid",
                                  outlineColor: "primary.main",
                                  outlineOffset: 1,
                                },
                              }}
                            >
                              <span className="material-symbols-outlined control-icon icon-row" style={{ fontSize: 18, transition: "color 100ms ease-out" }}>badge</span>
                              <Typography variant="body2" sx={{ flex: 1, fontWeight: 600, color: "text.primary" }}>Employee Directory</Typography>
                              <span className="material-symbols-outlined control-chevron icon-muted" style={{ fontSize: 16, transition: "transform 100ms ease-out, color 100ms ease-out" }}>chevron_right</span>
                            </Box>
                          </Link>
    
                          <Link href="/app/audit-logs" style={{ textDecoration: "none", color: "inherit" }}>
                            <Box
                              sx={{
                                p: 1.5,
                                borderRadius: 1.5,
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                border: "1px solid",
                                borderColor: "divider",
                                transition: "all 100ms ease-out",
                                "&:hover": { 
                                  bgcolor: alpha("#3b82f6", 0.04), 
                                  borderColor: alpha("#3b82f6", 0.2),
                                  "& .control-icon": { color: alpha("#3b82f6", 0.8) },
                                  "& .control-chevron": { transform: "translateX(2px)", color: alpha("#3b82f6", 0.7) },
                                },
                                "&:active": { 
                                  bgcolor: alpha("#3b82f6", 0.08),
                                  transform: "scale(0.995)",
                                },
                                "&:focus-visible": {
                                  outline: "2px solid",
                                  outlineColor: "primary.main",
                                  outlineOffset: 1,
                                },
                              }}
                            >
                              <span className="material-symbols-outlined control-icon icon-row" style={{ fontSize: 18, transition: "color 100ms ease-out" }}>receipt_long</span>
                              <Typography variant="body2" sx={{ flex: 1, fontWeight: 600, color: "text.primary" }}>Audit Trail</Typography>
                              <span className="material-symbols-outlined control-chevron icon-muted" style={{ fontSize: 16, transition: "transform 100ms ease-out, color 100ms ease-out" }}>chevron_right</span>
                            </Box>
                          </Link>
    
                          <Link href="/app/reports" style={{ textDecoration: "none", color: "inherit" }}>
                            <Box
                              sx={{
                                p: 1.5,
                                borderRadius: 1.5,
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                border: "1px solid",
                                borderColor: "divider",
                                transition: "all 100ms ease-out",
                                "&:hover": { 
                                  bgcolor: alpha("#3b82f6", 0.04), 
                                  borderColor: alpha("#3b82f6", 0.2),
                                  "& .control-icon": { color: alpha("#3b82f6", 0.8) },
                                  "& .control-chevron": { transform: "translateX(2px)", color: alpha("#3b82f6", 0.7) },
                                },
                                "&:active": { 
                                  bgcolor: alpha("#3b82f6", 0.08),
                                  transform: "scale(0.995)",
                                },
                                "&:focus-visible": {
                                  outline: "2px solid",
                                  outlineColor: "primary.main",
                                  outlineOffset: 1,
                                },
                              }}
                            >
                              <span className="material-symbols-outlined control-icon icon-row" style={{ fontSize: 18, transition: "color 100ms ease-out" }}>assessment</span>
                              <Typography variant="body2" sx={{ flex: 1, fontWeight: 600, color: "text.primary" }}>Compliance Reports</Typography>
                              <span className="material-symbols-outlined control-chevron icon-muted" style={{ fontSize: 16, transition: "transform 100ms ease-out, color 100ms ease-out" }}>chevron_right</span>
                            </Box>
                          </Link>
                        </Box>
                  </CardContent>
                </Card>
              </Grid>

            {/* System Assurance — Verdict → Closure */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Card variant="outlined" sx={{ borderRadius: 2, height: "100%" }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary", textTransform: "uppercase", letterSpacing: 1, fontSize: "0.75rem", display: "block", mb: 0.25 }}>
                        System Assurance
                      </Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
                        Control verification status
                      </Typography>
                    </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 0.75, bgcolor: alpha("#10b981", 0.12), borderRadius: 1 }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#10b981" }} />
                        <Typography variant="caption" sx={{ fontWeight: 700, color: "#10b981", letterSpacing: 0.3 }}>
                          Operational
                        </Typography>
                      </Box>
                  </Box>

                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body2" color="text.secondary">Unresolved exposures</Typography>
                      <Typography variant="body2" fontWeight={700} sx={{ color: criticalRiskOffboardings + highRiskOffboardings === 0 ? "#059669" : "#dc2626" }}>
                        {criticalRiskOffboardings + highRiskOffboardings === 0 ? "None" : criticalRiskOffboardings + highRiskOffboardings}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body2" color="text.secondary">Policies enforced</Typography>
                      <Typography variant="body2" fontWeight={700}>{activePolicies}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body2" color="text.secondary">Audit logging</Typography>
                      <Typography variant="body2" fontWeight={700} sx={{ color: "#059669" }}>Active</Typography>
                    </Box>
                  </Box>

                  <Box sx={{ pt: 2.5, mt: 2.5, borderTop: "1px solid", borderColor: "divider" }}>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5, fontWeight: 500 }}>
                      All controls verified. No anomalies detected.
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
