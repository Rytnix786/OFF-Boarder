"use server";

import { prisma } from "@/lib/prisma";
import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { RiskLevel, SecurityEventType, RevocationStatus } from "@prisma/client";
import { checkRiskThreshold, checkOffboardingCompletion } from "@/lib/security-policies";

export interface RiskFactor {
  factor: string;
  description: string;
  weight: number;
  score: number;
}

export interface RiskScoreResult {
  score: number;
  level: RiskLevel;
  factors: RiskFactor[];
}

const RISK_WEIGHTS = {
  highRiskFlag: 15,
  overdueTasks: 10,
  incompleteCriticalTasks: 12,
  incompleteRevocations: 15,
  lateRevocations: 8,
  unresolvedAssets: 12,
  loginAttemptsAfterStart: 10,
  blockedIPEvents: 8,
  suspiciousActivity: 10,
  missingApprovals: 8,
  overriddenApprovals: 5,
  pastLastWorkingDay: 10,
  escalated: 5,
};

export async function calculateRiskScore(offboardingId: string): Promise<RiskScoreResult> {
  const session = await requireActiveOrg();
  const orgId = session.currentOrgId!;

  const offboarding = await prisma.offboarding.findFirst({
    where: { id: offboardingId, organizationId: orgId },
    include: {
      employee: true,
      tasks: true,
      approvals: true,
      assetReturns: { include: { asset: true } },
    },
  });

  if (!offboarding) {
    throw new Error("Offboarding not found");
  }

  const accessRevocations = await prisma.accessRevocation.findMany({
    where: { offboardingId },
  });

  const factors: RiskFactor[] = [];
  let totalScore = 0;

  if (offboarding.riskLevel === "HIGH" || offboarding.riskLevel === "CRITICAL") {
    const weight = offboarding.riskLevel === "CRITICAL" ? 20 : RISK_WEIGHTS.highRiskFlag;
    factors.push({
      factor: "high_risk_flag",
      description: `Case marked as ${offboarding.riskLevel} risk`,
      weight,
      score: weight,
    });
    totalScore += weight;
  }

  const now = new Date();
  const overdueTasks = offboarding.tasks.filter(
    t => t.status === "PENDING" && t.dueDate && t.dueDate < now
  );
  if (overdueTasks.length > 0) {
    const score = Math.min(overdueTasks.length * 3, RISK_WEIGHTS.overdueTasks);
    factors.push({
      factor: "overdue_tasks",
      description: `${overdueTasks.length} overdue task(s)`,
      weight: RISK_WEIGHTS.overdueTasks,
      score,
    });
    totalScore += score;
  }

  const incompleteCriticalTasks = offboarding.tasks.filter(
    t => t.isHighRiskTask && t.status !== "COMPLETED" && t.status !== "SKIPPED"
  );
  if (incompleteCriticalTasks.length > 0) {
    const score = Math.min(incompleteCriticalTasks.length * 4, RISK_WEIGHTS.incompleteCriticalTasks);
    factors.push({
      factor: "incomplete_critical_tasks",
      description: `${incompleteCriticalTasks.length} incomplete critical task(s)`,
      weight: RISK_WEIGHTS.incompleteCriticalTasks,
      score,
    });
    totalScore += score;
  }

  const pendingRevocations = accessRevocations.filter(
    r => r.status === "PENDING"
  );
  if (pendingRevocations.length > 0) {
    const score = Math.min(pendingRevocations.length * 3, RISK_WEIGHTS.incompleteRevocations);
    factors.push({
      factor: "incomplete_revocations",
      description: `${pendingRevocations.length} pending access revocation(s)`,
      weight: RISK_WEIGHTS.incompleteRevocations,
      score,
    });
    totalScore += score;
  }

  const lateRevocations = accessRevocations.filter(
    r => r.status === "PENDING" && r.dueDate && r.dueDate < now
  );
  if (lateRevocations.length > 0) {
    const score = Math.min(lateRevocations.length * 4, RISK_WEIGHTS.lateRevocations);
    factors.push({
      factor: "late_revocations",
      description: `${lateRevocations.length} overdue access revocation(s)`,
      weight: RISK_WEIGHTS.lateRevocations,
      score,
    });
    totalScore += score;
  }

  const unresolvedAssets = offboarding.assetReturns.filter(
    ar => ar.status !== "RETURNED" && ar.status !== "LOST"
  );
  if (unresolvedAssets.length > 0) {
    const score = Math.min(unresolvedAssets.length * 3, RISK_WEIGHTS.unresolvedAssets);
    factors.push({
      factor: "unresolved_assets",
      description: `${unresolvedAssets.length} unresolved asset return(s)`,
      weight: RISK_WEIGHTS.unresolvedAssets,
      score,
    });
    totalScore += score;
  }

  const securityEvents = await prisma.securityEvent.findMany({
    where: {
      organizationId: orgId,
      OR: [
        { offboardingId },
        { employeeId: offboarding.employeeId },
      ],
      createdAt: { gte: offboarding.createdAt },
    },
  });

  const loginAttempts = securityEvents.filter(
    e => e.eventType === "LOGIN_ATTEMPT" || e.eventType === "BLOCKED_LOGIN"
  );
  if (loginAttempts.length > 0) {
    const score = Math.min(loginAttempts.length * 2, RISK_WEIGHTS.loginAttemptsAfterStart);
    factors.push({
      factor: "login_attempts",
      description: `${loginAttempts.length} login attempt(s) after offboarding started`,
      weight: RISK_WEIGHTS.loginAttemptsAfterStart,
      score,
    });
    totalScore += score;
  }

  const blockedIPEvents = securityEvents.filter(e => e.eventType === "BLOCKED_IP");
  if (blockedIPEvents.length > 0) {
    const score = Math.min(blockedIPEvents.length * 4, RISK_WEIGHTS.blockedIPEvents);
    factors.push({
      factor: "blocked_ip_events",
      description: `${blockedIPEvents.length} blocked IP event(s)`,
      weight: RISK_WEIGHTS.blockedIPEvents,
      score,
    });
    totalScore += score;
  }

  const suspiciousEvents = securityEvents.filter(e => e.eventType === "SUSPICIOUS_ACTIVITY");
  if (suspiciousEvents.length > 0) {
    const score = Math.min(suspiciousEvents.length * 5, RISK_WEIGHTS.suspiciousActivity);
    factors.push({
      factor: "suspicious_activity",
      description: `${suspiciousEvents.length} suspicious activity event(s)`,
      weight: RISK_WEIGHTS.suspiciousActivity,
      score,
    });
    totalScore += score;
  }

  const pendingApprovals = offboarding.approvals.filter(a => a.status === "PENDING");
  const requiredPendingApprovals = pendingApprovals.filter(a => 
    a.type === "HIGH_RISK" || a.type === "OFFBOARDING"
  );
  if (requiredPendingApprovals.length > 0) {
    const score = Math.min(requiredPendingApprovals.length * 4, RISK_WEIGHTS.missingApprovals);
    factors.push({
      factor: "missing_approvals",
      description: `${requiredPendingApprovals.length} missing required approval(s)`,
      weight: RISK_WEIGHTS.missingApprovals,
      score,
    });
    totalScore += score;
  }

  if (offboarding.scheduledDate && offboarding.scheduledDate < now && 
      offboarding.status !== "COMPLETED" && offboarding.status !== "CANCELLED") {
    factors.push({
      factor: "past_last_working_day",
      description: "Past scheduled last working day but not completed",
      weight: RISK_WEIGHTS.pastLastWorkingDay,
      score: RISK_WEIGHTS.pastLastWorkingDay,
    });
    totalScore += RISK_WEIGHTS.pastLastWorkingDay;
  }

  if (offboarding.isEscalated) {
    factors.push({
      factor: "escalated",
      description: "Case has been escalated",
      weight: RISK_WEIGHTS.escalated,
      score: RISK_WEIGHTS.escalated,
    });
    totalScore += RISK_WEIGHTS.escalated;
  }

  const policyCheck = await checkOffboardingCompletion(
    orgId,
    offboardingId,
    offboarding.employeeId
  );
  if (!policyCheck.allowed && policyCheck.violations.length > 0) {
    const violationScore = policyCheck.violations.reduce((acc, v) => {
      return acc + (v.severity === "CRITICAL" ? 10 : v.severity === "HIGH" ? 6 : 3);
    }, 0);
    const score = Math.min(violationScore, 15);
    factors.push({
      factor: "policy_violations",
      description: `${policyCheck.violations.length} policy violation(s) blocking completion`,
      weight: 15,
      score,
    });
    totalScore += score;
  }

  const normalizedScore = Math.min(Math.round(totalScore), 100);

  let level: RiskLevel = "NORMAL";
  if (normalizedScore >= 70) {
    level = "CRITICAL";
  } else if (normalizedScore >= 40) {
    level = "HIGH";
  }

  return { score: normalizedScore, level, factors };
}

export async function updateRiskScore(offboardingId: string, reason?: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "risk:manage");

  const orgId = session.currentOrgId!;

  const offboarding = await prisma.offboarding.findFirst({
    where: { id: offboardingId, organizationId: orgId },
  });

  if (!offboarding) {
    return { error: "Offboarding not found" };
  }

  const { score, level, factors } = await calculateRiskScore(offboardingId);

  const existingRiskScore = await prisma.riskScore.findUnique({
    where: { offboardingId },
  });

  if (existingRiskScore) {
    await prisma.riskScore.update({
      where: { offboardingId },
      data: {
        score,
        level,
        factors: JSON.parse(JSON.stringify(factors)),
        calculatedAt: new Date(),
        calculatedBy: session.user.id,
        previousScore: existingRiskScore.score,
        previousLevel: existingRiskScore.level,
        changeReason: reason || "Automatic recalculation",
        updatedAt: new Date(),
      },
    });
  } else {
    await prisma.riskScore.create({
      data: {
        offboardingId,
        organizationId: orgId,
        score,
        level,
        factors: JSON.parse(JSON.stringify(factors)),
        calculatedBy: session.user.id,
        changeReason: reason || "Initial calculation",
        updatedAt: new Date(),
      },
    });
  }

  if (level !== offboarding.riskLevel) {
    await prisma.offboarding.update({
      where: { id: offboardingId },
      data: {
        riskLevel: level,
        riskAssessedAt: new Date(),
        riskAssessedBy: session.user.id,
        riskReason: factors.map(f => f.description).join("; "),
      },
    });
  }

  await createAuditLog(session, orgId, {
    action: "risk_score.updated",
    entityType: "RiskScore",
    entityId: offboardingId,
    oldData: existingRiskScore ? { score: existingRiskScore.score, level: existingRiskScore.level } : undefined,
    newData: { score, level, factorCount: factors.length },
    metadata: { reason },
  });

  const policyActions = await checkRiskThreshold(orgId, offboarding.employeeId, score);
  
  if (policyActions.lockdown) {
    await prisma.offboarding.update({
      where: { id: offboardingId },
      data: {
        isLockedDown: true,
        isEscalated: true,
      },
    });

    await createAuditLog(session, orgId, {
      action: "policy.auto_lockdown_triggered",
      entityType: "Offboarding",
      entityId: offboardingId,
      newData: { riskScore: score, threshold: "policy_threshold", reason: "Risk auto-lockdown policy triggered" },
    });
  }

  revalidatePath("/app/risk-radar");
  revalidatePath(`/app/risk-radar/${offboardingId}`);
  revalidatePath(`/app/offboardings/${offboardingId}`);
  
  return { success: true, score, level, factors };
}

export async function getRiskRadarDashboard(filters: {
  department?: string;
  status?: string;
  riskLevel?: RiskLevel;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const session = await requireActiveOrg();
  await requirePermission(session, "risk:read");

  const orgId = session.currentOrgId!;
  const { department, status, riskLevel, dateFrom, dateTo, page = 1, pageSize = 20 } = filters;

  const where: Record<string, unknown> = {
    organizationId: orgId,
    status: { notIn: ["COMPLETED", "CANCELLED"] },
  };

  if (status) where.status = status;
  if (riskLevel) where.riskLevel = riskLevel;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom);
    if (dateTo) (where.createdAt as Record<string, unknown>).lte = new Date(dateTo);
  }

  const offboardings = await prisma.offboarding.findMany({
    where,
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, email: true, department: { select: { id: true, name: true } } },
      },
      tasks: { where: { status: { in: ["PENDING", "IN_PROGRESS"] } } },
      assetReturns: { where: { status: { notIn: ["RETURNED", "LOST"] } } },
    },
    orderBy: [{ riskLevel: "desc" }, { createdAt: "desc" }],
  });

  const offboardingIds = offboardings.map(o => o.id);
  
  const [riskScores, accessRevocations] = await Promise.all([
    prisma.riskScore.findMany({
      where: { offboardingId: { in: offboardingIds } },
    }),
    prisma.accessRevocation.findMany({
      where: { offboardingId: { in: offboardingIds }, status: "PENDING" },
    }),
  ]);

  const riskScoreMap = new Map(riskScores.map(rs => [rs.offboardingId, rs]));
  const revocationCountMap = new Map<string, number>();
  accessRevocations.forEach(ar => {
    revocationCountMap.set(ar.offboardingId, (revocationCountMap.get(ar.offboardingId) || 0) + 1);
  });

  const enrichedOffboardings = offboardings.map(o => ({
    ...o,
    riskScore: riskScoreMap.get(o.id) || null,
    accessRevocationsCount: revocationCountMap.get(o.id) || 0,
  }));

  let filteredOffboardings = enrichedOffboardings;
  if (department) {
    filteredOffboardings = enrichedOffboardings.filter(o => o.employee.department?.id === department);
  }

  const sortedByRisk = filteredOffboardings.sort((a, b) => {
    const scoreA = a.riskScore?.score || 0;
    const scoreB = b.riskScore?.score || 0;
    return scoreB - scoreA;
  });

  const paginatedOffboardings = sortedByRisk.slice((page - 1) * pageSize, page * pageSize);
  const total = sortedByRisk.length;

  const alerts = await prisma.securityEvent.findMany({
    where: {
      organizationId: orgId,
      resolved: false,
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const summary = {
    totalAtRisk: enrichedOffboardings.filter(o => o.riskLevel === "HIGH" || o.riskLevel === "CRITICAL").length,
    criticalCount: enrichedOffboardings.filter(o => o.riskLevel === "CRITICAL").length,
    highCount: enrichedOffboardings.filter(o => o.riskLevel === "HIGH").length,
    pendingRevocations: accessRevocations.length,
    unresolvedAssets: enrichedOffboardings.reduce((sum, o) => sum + o.assetReturns.length, 0),
    unresolvedAlerts: alerts.length,
  };

  return {
    offboardings: paginatedOffboardings.map(o => ({
      id: o.id,
      employee: o.employee,
      status: o.status,
      riskLevel: o.riskLevel,
      riskScore: o.riskScore?.score || 0,
      scheduledDate: o.scheduledDate,
      createdAt: o.createdAt,
      isLockedDown: o.isLockedDown,
      isEscalated: o.isEscalated,
      pendingTasksCount: o.tasks.length,
      pendingRevocationsCount: o.accessRevocationsCount,
      unresolvedAssetsCount: o.assetReturns.length,
    })),
    alerts,
    summary,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getRiskRadarCaseDetail(offboardingId: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "risk:read");

  const orgId = session.currentOrgId!;

  const offboarding = await prisma.offboarding.findFirst({
    where: { id: offboardingId, organizationId: orgId },
    include: {
      employee: {
        include: { department: true, jobTitle: true, location: true },
      },
      tasks: { orderBy: { order: "asc" } },
      approvals: { include: { approver: { select: { name: true, email: true } } } },
      assetReturns: { include: { asset: true } },
      evidencePack: true,
    },
  });

  if (!offboarding) {
    return { error: "Offboarding not found" };
  }

  const [riskScore, accessRevocations, securityEvents, auditLogs] = await Promise.all([
    prisma.riskScore.findUnique({ where: { offboardingId } }),
    prisma.accessRevocation.findMany({
      where: { offboardingId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.securityEvent.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { offboardingId },
          { employeeId: offboarding.employeeId },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.auditLog.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { entityType: "Offboarding", entityId: offboardingId },
          { entityType: "RiskScore", entityId: offboardingId },
        ],
      },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const riskFactors = riskScore?.factors as RiskFactor[] | undefined;

  return {
    offboarding: {
      ...offboarding,
      riskScore,
      accessRevocations,
      riskFactors,
    },
    securityEvents,
    auditLogs,
  };
}

export async function markHighRisk(offboardingId: string, reason: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "risk:manage");

  const orgId = session.currentOrgId!;

  const offboarding = await prisma.offboarding.findFirst({
    where: { id: offboardingId, organizationId: orgId },
  });

  if (!offboarding) {
    return { error: "Offboarding not found" };
  }

  const oldLevel = offboarding.riskLevel;

  await prisma.offboarding.update({
    where: { id: offboardingId },
    data: {
      riskLevel: "HIGH",
      riskReason: reason,
      riskAssessedAt: new Date(),
      riskAssessedBy: session.user.id,
    },
  });

  await prisma.securityEvent.create({
    data: {
      organizationId: orgId,
      offboardingId,
      employeeId: offboarding.employeeId,
      eventType: "HIGH_RISK_MARKED",
      description: `Case marked as HIGH risk: ${reason}`,
      metadata: { previousLevel: oldLevel, reason },
    },
  });

  await createAuditLog(session, orgId, {
    action: "offboarding.marked_high_risk",
    entityType: "Offboarding",
    entityId: offboardingId,
    oldData: { riskLevel: oldLevel },
    newData: { riskLevel: "HIGH", reason },
  });

  await updateRiskScore(offboardingId, "Manually marked as high risk");

  revalidatePath("/app/risk-radar");
  revalidatePath(`/app/risk-radar/${offboardingId}`);
  revalidatePath(`/app/offboardings/${offboardingId}`);
  
  return { success: true };
}

export async function triggerLockdown(offboardingId: string, reason: string, banIPs?: string[]) {
  const session = await requireActiveOrg();
  await requirePermission(session, "risk:manage");

  const orgId = session.currentOrgId!;

  const offboarding = await prisma.offboarding.findFirst({
    where: { id: offboardingId, organizationId: orgId },
    include: { employee: true },
  });

  if (!offboarding) {
    return { error: "Offboarding not found" };
  }

  await prisma.offboarding.update({
    where: { id: offboardingId },
    data: {
      isLockedDown: true,
      lockedDownAt: new Date(),
      lockedDownBy: session.user.id,
      lockedDownReason: reason,
      riskLevel: "CRITICAL",
    },
  });

  await prisma.userLockdown.create({
    data: {
      employeeId: offboarding.employeeId,
      organizationId: orgId,
      offboardingId,
      reason,
      lockedBy: session.user.id,
      updatedAt: new Date(),
    },
  });

  if (banIPs && banIPs.length > 0) {
    for (const ip of banIPs) {
      await prisma.blockedIP.create({
        data: {
          ipAddress: ip,
          scope: "ORGANIZATION",
          organizationId: orgId,
          reason: `Lockdown triggered for offboarding: ${reason}`,
          createdById: session.user.id!,
          isActive: true,
        },
      });

      await prisma.securityEvent.create({
        data: {
          organizationId: orgId,
          offboardingId,
          employeeId: offboarding.employeeId,
          eventType: "IP_BANNED",
          description: `IP ${ip} banned during lockdown`,
          ipAddress: ip,
          metadata: { reason },
        },
      });
    }
  }

  await prisma.securityEvent.create({
    data: {
      organizationId: orgId,
      offboardingId,
      employeeId: offboarding.employeeId,
      eventType: "LOCKDOWN_TRIGGERED",
      description: `Immediate lockdown triggered: ${reason}`,
      metadata: { reason, bannedIPs: banIPs },
    },
  });

  const urgentTasks = [
    { name: "Security Review Required", category: "Security", isHighRiskTask: true },
    { name: "Verify All Access Revoked", category: "Access", isHighRiskTask: true },
    { name: "Document Lockdown Incident", category: "Documentation", isHighRiskTask: false },
  ];

  for (const task of urgentTasks) {
    await prisma.offboardingTask.create({
      data: {
        offboardingId,
        name: task.name,
        description: `Urgent task created due to lockdown: ${reason}`,
        category: task.category,
        isHighRiskTask: task.isHighRiskTask,
        status: "PENDING",
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  }

  await createAuditLog(session, orgId, {
    action: "offboarding.lockdown_triggered",
    entityType: "Offboarding",
    entityId: offboardingId,
    newData: { reason, bannedIPs: banIPs, employeeName: `${offboarding.employee.firstName} ${offboarding.employee.lastName}` },
  });

  await updateRiskScore(offboardingId, "Lockdown triggered");

  revalidatePath("/app/risk-radar");
  revalidatePath(`/app/risk-radar/${offboardingId}`);
  revalidatePath(`/app/offboardings/${offboardingId}`);
  
  return { success: true };
}

export async function escalateApprovals(offboardingId: string, reason: string, additionalApprovals: number = 1) {
  const session = await requireActiveOrg();
  await requirePermission(session, "risk:manage");

  const orgId = session.currentOrgId!;

  const offboarding = await prisma.offboarding.findFirst({
    where: { id: offboardingId, organizationId: orgId },
  });

  if (!offboarding) {
    return { error: "Offboarding not found" };
  }

  const oldRequiredApprovals = offboarding.requiredApprovals || 1;
  const newRequiredApprovals = oldRequiredApprovals + additionalApprovals;

  await prisma.offboarding.update({
    where: { id: offboardingId },
    data: {
      isEscalated: true,
      escalatedAt: new Date(),
      escalatedBy: session.user.id,
      escalationReason: reason,
      requiredApprovals: newRequiredApprovals,
      status: "PENDING_APPROVAL",
    },
  });

  await prisma.approval.create({
    data: {
      offboardingId,
      type: "HIGH_RISK",
      status: "PENDING",
      requiredCount: additionalApprovals,
      comments: reason,
    },
  });

  await prisma.securityEvent.create({
    data: {
      organizationId: orgId,
      offboardingId,
      eventType: "ESCALATION_TRIGGERED",
      description: `Approvals escalated: ${reason}`,
      metadata: { oldRequiredApprovals, newRequiredApprovals, reason },
    },
  });

  await createAuditLog(session, orgId, {
    action: "offboarding.escalated",
    entityType: "Offboarding",
    entityId: offboardingId,
    oldData: { requiredApprovals: oldRequiredApprovals, isEscalated: false },
    newData: { requiredApprovals: newRequiredApprovals, isEscalated: true, reason },
  });

  await updateRiskScore(offboardingId, "Approvals escalated");

  revalidatePath("/app/risk-radar");
  revalidatePath(`/app/risk-radar/${offboardingId}`);
  revalidatePath(`/app/offboardings/${offboardingId}`);
  
  return { success: true };
}

export async function confirmAccessRevocation(revocationId: string, notes?: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "risk:manage");

  const orgId = session.currentOrgId!;

  const revocation = await prisma.accessRevocation.findFirst({
    where: { id: revocationId, organizationId: orgId },
  });

  if (!revocation) {
    return { error: "Access revocation not found" };
  }

  const oldStatus = revocation.status;

  await prisma.accessRevocation.update({
    where: { id: revocationId },
    data: {
      status: "CONFIRMED",
      confirmedAt: new Date(),
      confirmedBy: session.user.id,
      notes: notes || revocation.notes,
      updatedAt: new Date(),
    },
  });

  await prisma.securityEvent.create({
    data: {
      organizationId: orgId,
      offboardingId: revocation.offboardingId,
      eventType: "ACCESS_REVOKED",
      description: `Access revocation confirmed for ${revocation.systemName}`,
      metadata: { systemName: revocation.systemName, notes },
    },
  });

  await createAuditLog(session, orgId, {
    action: "access_revocation.confirmed",
    entityType: "AccessRevocation",
    entityId: revocationId,
    oldData: { status: oldStatus },
    newData: { status: "CONFIRMED", systemName: revocation.systemName },
  });

  await updateRiskScore(revocation.offboardingId, "Access revocation confirmed");

  revalidatePath("/app/risk-radar");
  revalidatePath(`/app/risk-radar/${revocation.offboardingId}`);
  
  return { success: true };
}

export async function createAccessRevocation(offboardingId: string, data: {
  systemName: string;
  systemType?: string;
  isUrgent?: boolean;
  dueDate?: Date;
  notes?: string;
}) {
  const session = await requireActiveOrg();
  await requirePermission(session, "risk:manage");

  const orgId = session.currentOrgId!;

  const offboarding = await prisma.offboarding.findFirst({
    where: { id: offboardingId, organizationId: orgId },
  });

  if (!offboarding) {
    return { error: "Offboarding not found" };
  }

  const revocation = await prisma.accessRevocation.create({
    data: {
      offboardingId,
      organizationId: orgId,
      systemName: data.systemName,
      systemType: data.systemType,
      isUrgent: data.isUrgent || false,
      dueDate: data.dueDate,
      notes: data.notes,
      updatedAt: new Date(),
    },
  });

  await createAuditLog(session, orgId, {
    action: "access_revocation.created",
    entityType: "AccessRevocation",
    entityId: revocation.id,
    newData: { systemName: data.systemName, isUrgent: data.isUrgent },
  });

  await updateRiskScore(offboardingId, "Access revocation added");

  revalidatePath(`/app/risk-radar/${offboardingId}`);
  
  return { success: true, revocation };
}

export async function requestEvidencePack(offboardingId: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "risk:manage");

  const orgId = session.currentOrgId!;

  const offboarding = await prisma.offboarding.findFirst({
    where: { id: offboardingId, organizationId: orgId },
    include: { evidencePack: true },
  });

  if (!offboarding) {
    return { error: "Offboarding not found" };
  }

  if (offboarding.evidencePack) {
    return { 
      success: true, 
      message: "Evidence pack already exists",
      evidencePack: offboarding.evidencePack,
    };
  }

  await prisma.securityEvent.create({
    data: {
      organizationId: orgId,
      offboardingId,
      eventType: "EVIDENCE_PACK_REQUESTED",
      description: "Evidence pack generation requested",
      metadata: { requestedBy: session.user.id },
    },
  });

  await createAuditLog(session, orgId, {
    action: "evidence_pack.requested",
    entityType: "EvidencePack",
    entityId: offboardingId,
    newData: { status: "requested" },
  });

  revalidatePath(`/app/risk-radar/${offboardingId}`);
  
  return { 
    success: true, 
    message: "Evidence pack requested. It will be generated when the offboarding is completed.",
  };
}

export async function resolveSecurityEvent(eventId: string, notes?: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "risk:manage");

  const orgId = session.currentOrgId!;

  const event = await prisma.securityEvent.findFirst({
    where: { id: eventId, organizationId: orgId },
  });

  if (!event) {
    return { error: "Security event not found" };
  }

  await prisma.securityEvent.update({
    where: { id: eventId },
    data: {
      resolved: true,
      resolvedAt: new Date(),
      resolvedBy: session.user.id,
      metadata: { ...(event.metadata as Record<string, unknown>), resolutionNotes: notes },
    },
  });

  await createAuditLog(session, orgId, {
    action: "security_event.resolved",
    entityType: "SecurityEvent",
    entityId: eventId,
    oldData: { resolved: false },
    newData: { resolved: true, notes },
  });

  if (event.offboardingId) {
    await updateRiskScore(event.offboardingId, "Security event resolved");
    revalidatePath(`/app/risk-radar/${event.offboardingId}`);
  }

  revalidatePath("/app/risk-radar");
  
  return { success: true };
}

export async function banIP(ip: string, reason: string, offboardingId?: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "security:manage");

  const orgId = session.currentOrgId!;

  const existing = await prisma.blockedIP.findFirst({
    where: { ipAddress: ip, organizationId: orgId, isActive: true },
  });

  if (existing) {
    return { error: "IP is already banned" };
  }

  const blockedIP = await prisma.blockedIP.create({
    data: {
      ipAddress: ip,
      scope: "ORGANIZATION",
      organizationId: orgId,
      reason,
      createdById: session.user.id!,
      isActive: true,
    },
  });

  if (offboardingId) {
    const offboarding = await prisma.offboarding.findFirst({
      where: { id: offboardingId, organizationId: orgId },
    });

    if (offboarding) {
      await prisma.securityEvent.create({
        data: {
          organizationId: orgId,
          offboardingId,
          employeeId: offboarding.employeeId,
          eventType: "IP_BANNED",
          description: `IP ${ip} banned: ${reason}`,
          ipAddress: ip,
          metadata: { reason },
        },
      });
    }
  }

  await createAuditLog(session, orgId, {
    action: "ip.banned",
    entityType: "BlockedIP",
    entityId: blockedIP.id,
    newData: { ip, reason },
  });

  revalidatePath("/app/risk-radar");
  if (offboardingId) revalidatePath(`/app/risk-radar/${offboardingId}`);
  
  return { success: true, blockedIP };
}

export async function unbanIP(blockedIPId: string, reason?: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "security:manage");

  const orgId = session.currentOrgId!;

  const blockedIP = await prisma.blockedIP.findFirst({
    where: { id: blockedIPId, organizationId: orgId },
  });

  if (!blockedIP) {
    return { error: "Blocked IP not found" };
  }

  await prisma.blockedIP.update({
    where: { id: blockedIPId },
    data: { isActive: false },
  });

  await prisma.securityEvent.create({
    data: {
      organizationId: orgId,
      eventType: "IP_UNBANNED",
      description: `IP ${blockedIP.ipAddress} unbanned${reason ? `: ${reason}` : ""}`,
      ipAddress: blockedIP.ipAddress,
      metadata: { reason },
    },
  });

  await createAuditLog(session, orgId, {
    action: "ip.unbanned",
    entityType: "BlockedIP",
    entityId: blockedIPId,
    oldData: { isActive: true },
    newData: { isActive: false, reason },
  });

  revalidatePath("/app/risk-radar");
    
  return { success: true };
}

export async function resolveRisk(offboardingId: string, justification: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "risk:manage");

  const orgId = session.currentOrgId!;

  const offboarding = await prisma.offboarding.findFirst({
    where: { id: offboardingId, organizationId: orgId },
  });

  if (!offboarding) {
    return { error: "Offboarding not found" };
  }

  const oldLevel = offboarding.riskLevel;

  await prisma.offboarding.update({
    where: { id: offboardingId },
    data: {
      riskLevel: "NORMAL",
      riskReason: `Risk resolved: ${justification}`,
      riskAssessedAt: new Date(),
      riskAssessedBy: session.user.id,
      isEscalated: false,
    },
  });

  const existingRiskScore = await prisma.riskScore.findUnique({
    where: { offboardingId },
  });

  if (existingRiskScore) {
    await prisma.riskScore.update({
      where: { offboardingId },
      data: {
        previousScore: existingRiskScore.score,
        previousLevel: existingRiskScore.level,
        score: 0,
        level: "NORMAL",
        factors: [],
        calculatedAt: new Date(),
        calculatedBy: session.user.id,
        changeReason: `Risk manually resolved: ${justification}`,
        updatedAt: new Date(),
      },
    });
  }

  await prisma.securityEvent.create({
    data: {
      organizationId: orgId,
      offboardingId,
      employeeId: offboarding.employeeId,
      eventType: "HIGH_RISK_MARKED",
      description: `Risk resolved and neutralized: ${justification}`,
      metadata: { previousLevel: oldLevel, justification, action: "resolved" },
    },
  });

  await createAuditLog(session, orgId, {
    action: "offboarding.risk_resolved",
    entityType: "Offboarding",
    entityId: offboardingId,
    oldData: { riskLevel: oldLevel },
    newData: { riskLevel: "NORMAL", justification },
  });

  revalidatePath("/app/risk-radar");
  revalidatePath(`/app/risk-radar/${offboardingId}`);
  revalidatePath(`/app/offboardings/${offboardingId}`);
  
  return { success: true };
}

export async function sealEvidencePack(offboardingId: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "risk:manage");

  const orgId = session.currentOrgId!;

  const offboarding = await prisma.offboarding.findFirst({
    where: { id: offboardingId, organizationId: orgId },
    include: { evidencePack: true },
  });

  if (!offboarding) {
    return { error: "Offboarding not found" };
  }

  if (!offboarding.evidencePack) {
    return { error: "No evidence pack exists for this offboarding" };
  }

  if (offboarding.evidencePack.sealed) {
    return { error: "Evidence pack is already sealed" };
  }

  await prisma.evidencePack.update({
    where: { id: offboarding.evidencePack.id },
    data: {
      sealed: true,
      sealedAt: new Date(),
    },
  });

  await prisma.securityEvent.create({
    data: {
      organizationId: orgId,
      offboardingId,
      eventType: "EVIDENCE_PACK_SEALED",
      description: "Evidence pack sealed and finalized",
      metadata: { sealedBy: session.user.id },
    },
  });

  await createAuditLog(session, orgId, {
    action: "evidence_pack.sealed",
    entityType: "EvidencePack",
    entityId: offboarding.evidencePack.id,
    newData: { sealed: true, sealedAt: new Date() },
  });

  revalidatePath(`/app/risk-radar/${offboardingId}`);
  
  return { success: true };
}

export async function releaseLockdown(offboardingId: string, reason: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "risk:manage");

  const orgId = session.currentOrgId!;

  const offboarding = await prisma.offboarding.findFirst({
    where: { id: offboardingId, organizationId: orgId },
  });

  if (!offboarding) {
    return { error: "Offboarding not found" };
  }

  if (!offboarding.isLockedDown) {
    return { error: "This offboarding is not in lockdown" };
  }

  await prisma.offboarding.update({
    where: { id: offboardingId },
    data: {
      isLockedDown: false,
      lockedDownReason: `${offboarding.lockedDownReason || ""} | Released: ${reason}`,
    },
  });

  await prisma.userLockdown.updateMany({
    where: {
      employeeId: offboarding.employeeId,
      organizationId: orgId,
      offboardingId,
      isActive: true,
    },
    data: {
      isActive: false,
      unlockedAt: new Date(),
      unlockedBy: session.user.id,
      unlockedReason: reason,
    },
  });

  await prisma.securityEvent.create({
    data: {
      organizationId: orgId,
      offboardingId,
      employeeId: offboarding.employeeId,
      eventType: "LOCKDOWN_TRIGGERED",
      description: `Lockdown released: ${reason}`,
      metadata: { action: "released", reason },
    },
  });

  await createAuditLog(session, orgId, {
    action: "offboarding.lockdown_released",
    entityType: "Offboarding",
    entityId: offboardingId,
    oldData: { isLockedDown: true },
    newData: { isLockedDown: false, reason },
  });

  await updateRiskScore(offboardingId, "Lockdown released");

  revalidatePath("/app/risk-radar");
  revalidatePath(`/app/risk-radar/${offboardingId}`);
  revalidatePath(`/app/offboardings/${offboardingId}`);
  
  return { success: true };
}
