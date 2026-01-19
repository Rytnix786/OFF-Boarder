"use server";

import { prisma } from "@/lib/prisma";
import { AuthSession } from "@/lib/auth-types";
import { createAuditLog } from "@/lib/audit";
import { getClientIP } from "@/lib/ip-blocking";
import { SecurityEventType, Prisma } from "@prisma/client";

export async function getEmployeeSecurityProfile(employeeId: string, organizationId: string) {
  let profile = await prisma.employeeSecurityProfile.findUnique({
    where: { employeeId },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          status: true,
          employeeUserLinks: {
            where: { status: "VERIFIED" },
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  sessions: {
                    where: {
                      revokedAt: null,
                      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
                    },
                    select: {
                      id: true,
                      ipAddress: true,
                      city: true,
                      country: true,
                      authMethod: true,
                      lastActiveAt: true,
                      createdAt: true,
                    },
                    orderBy: { lastActiveAt: "desc" },
                  },
                },
              },
            },
          },
          offboardings: {
            where: { status: { in: ["PENDING", "IN_PROGRESS", "PENDING_APPROVAL"] } },
            select: {
              id: true,
              status: true,
              riskLevel: true,
              scheduledDate: true,
              isLockedDown: true,
              riskScore: { select: { score: true, level: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          assets: {
            select: {
              id: true,
              name: true,
              type: true,
              status: true,
              assetReturns: {
                select: { id: true, status: true },
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!profile) {
    profile = await prisma.employeeSecurityProfile.create({
      data: {
        id: `esp_${Date.now()}`,
        employeeId,
        organizationId,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            status: true,
            employeeUserLinks: {
              where: { status: "VERIFIED" },
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    sessions: {
                      where: {
                        revokedAt: null,
                        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
                      },
                      select: {
                        id: true,
                        ipAddress: true,
                        city: true,
                        country: true,
                        authMethod: true,
                        lastActiveAt: true,
                        createdAt: true,
                      },
                      orderBy: { lastActiveAt: "desc" },
                    },
                  },
                },
              },
            },
            offboardings: {
              where: { status: { in: ["PENDING", "IN_PROGRESS", "PENDING_APPROVAL"] } },
              select: {
                id: true,
                status: true,
                riskLevel: true,
                scheduledDate: true,
                isLockedDown: true,
                riskScore: { select: { score: true, level: true } },
              },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
            assets: {
              select: {
                id: true,
                name: true,
                type: true,
                status: true,
                assetReturns: {
                  select: { id: true, status: true },
                  orderBy: { createdAt: "desc" },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });
  }

  return profile;
}

export async function getEmployeeSecurityEvents(
  employeeId: string,
  organizationId: string,
  options?: { limit?: number; offset?: number }
) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      employeeUserLinks: {
        where: { status: "VERIFIED" },
        select: { userId: true },
      },
      offboardings: {
        select: { id: true },
      },
    },
  });

  if (!employee) return { events: [], total: 0 };

  const userIds = employee.employeeUserLinks.map((l) => l.userId);
  const offboardingIds = employee.offboardings.map((o) => o.id);

  const where: Prisma.SecurityEventWhereInput = {
    organizationId,
    OR: [
      { employeeId },
      ...(offboardingIds.length > 0 ? [{ offboardingId: { in: offboardingIds } }] : []),
    ],
  };

  const [events, total] = await Promise.all([
    prisma.securityEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options?.limit || 20,
      skip: options?.offset || 0,
    }),
    prisma.securityEvent.count({ where }),
  ]);

  return { events, total };
}

export async function logSecurityProfileView(
  session: AuthSession,
  employeeId: string,
  organizationId: string
) {
  const ipAddress = await getClientIP();

  await prisma.securityEvent.create({
    data: {
      organizationId,
      employeeId,
      eventType: "SECURITY_PROFILE_VIEWED",
      description: `Security profile viewed by ${session.user.name || session.user.email}`,
      ipAddress,
      metadata: {
        viewedBy: session.user.id,
        viewerEmail: session.user.email,
        viewerRole: session.currentMembership?.systemRole,
      },
    },
  });

  await createAuditLog(session, organizationId, {
    action: "security_profile.viewed",
    entityType: "EmployeeSecurityProfile",
    entityId: employeeId,
    metadata: { employeeId },
    ipAddress,
  });
}

export async function markEmployeeHighRisk(
  session: AuthSession,
  employeeId: string,
  organizationId: string,
  reason: string
) {
  const ipAddress = await getClientIP();

  const profile = await prisma.employeeSecurityProfile.upsert({
    where: { employeeId },
    update: {
      isHighRisk: true,
      highRiskReason: reason,
      highRiskMarkedAt: new Date(),
      highRiskMarkedBy: session.user.id,
    },
    create: {
      id: `esp_${Date.now()}`,
      employeeId,
      organizationId,
      isHighRisk: true,
      highRiskReason: reason,
      highRiskMarkedAt: new Date(),
      highRiskMarkedBy: session.user.id,
    },
  });

  await prisma.securityEvent.create({
    data: {
      organizationId,
      employeeId,
      eventType: "HIGH_RISK_MARKED",
      description: `Employee marked as high risk: ${reason}`,
      ipAddress,
      metadata: {
        markedBy: session.user.id,
        reason,
      },
    },
  });

  await createAuditLog(session, organizationId, {
    action: "employee.high_risk_marked",
    entityType: "EmployeeSecurityProfile",
    entityId: employeeId,
    newData: { isHighRisk: true, reason },
    ipAddress,
  });

  return profile;
}

export async function removeHighRiskStatus(
  session: AuthSession,
  employeeId: string,
  organizationId: string,
  reason: string
) {
  const ipAddress = await getClientIP();

  const profile = await prisma.employeeSecurityProfile.update({
    where: { employeeId },
    data: {
      isHighRisk: false,
      highRiskReason: null,
      highRiskMarkedAt: null,
      highRiskMarkedBy: null,
    },
  });

  await createAuditLog(session, organizationId, {
    action: "employee.high_risk_removed",
    entityType: "EmployeeSecurityProfile",
    entityId: employeeId,
    newData: { isHighRisk: false, reason },
    ipAddress,
  });

  return profile;
}

export async function suspendEmployeeAccess(
  session: AuthSession,
  employeeId: string,
  organizationId: string,
  reason: string,
  suspendUntil?: Date
) {
  const ipAddress = await getClientIP();

  const profile = await prisma.employeeSecurityProfile.upsert({
    where: { employeeId },
    update: {
      isSuspended: true,
      suspendedReason: reason,
      suspendedAt: new Date(),
      suspendedBy: session.user.id,
      suspendedUntil: suspendUntil || null,
    },
    create: {
      id: `esp_${Date.now()}`,
      employeeId,
      organizationId,
      isSuspended: true,
      suspendedReason: reason,
      suspendedAt: new Date(),
      suspendedBy: session.user.id,
      suspendedUntil: suspendUntil || null,
    },
  });

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      employeeUserLinks: {
        where: { status: "VERIFIED" },
        select: { userId: true },
      },
    },
  });

  if (employee) {
    for (const link of employee.employeeUserLinks) {
      await prisma.userSession.updateMany({
        where: {
          userId: link.userId,
          organizationId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          revokedBy: session.user.id,
          revokedReason: `Account suspended: ${reason}`,
        },
      });
    }
  }

  await prisma.securityEvent.create({
    data: {
      organizationId,
      employeeId,
      eventType: "ACCOUNT_SUSPENDED",
      description: `Access suspended: ${reason}`,
      ipAddress,
      metadata: {
        suspendedBy: session.user.id,
        reason,
        suspendedUntil: suspendUntil?.toISOString(),
      },
    },
  });

  await createAuditLog(session, organizationId, {
    action: "employee.access_suspended",
    entityType: "EmployeeSecurityProfile",
    entityId: employeeId,
    newData: { isSuspended: true, reason, suspendUntil },
    ipAddress,
  });

  return profile;
}

export async function unsuspendEmployeeAccess(
  session: AuthSession,
  employeeId: string,
  organizationId: string,
  reason: string
) {
  const ipAddress = await getClientIP();

  const profile = await prisma.employeeSecurityProfile.update({
    where: { employeeId },
    data: {
      isSuspended: false,
      suspendedReason: null,
      suspendedAt: null,
      suspendedBy: null,
      suspendedUntil: null,
    },
  });

  await createAuditLog(session, organizationId, {
    action: "employee.access_unsuspended",
    entityType: "EmployeeSecurityProfile",
    entityId: employeeId,
    newData: { isSuspended: false, reason },
    ipAddress,
  });

  return profile;
}

export async function lockEmployeeAccount(
  session: AuthSession,
  employeeId: string,
  organizationId: string,
  reason: string
) {
  const ipAddress = await getClientIP();

  const profile = await prisma.employeeSecurityProfile.upsert({
    where: { employeeId },
    update: {
      isLocked: true,
      lockedReason: reason,
      lockedAt: new Date(),
      lockedBy: session.user.id,
    },
    create: {
      id: `esp_${Date.now()}`,
      employeeId,
      organizationId,
      isLocked: true,
      lockedReason: reason,
      lockedAt: new Date(),
      lockedBy: session.user.id,
    },
  });

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      employeeUserLinks: {
        where: { status: "VERIFIED" },
        select: { userId: true },
      },
    },
  });

  if (employee) {
    for (const link of employee.employeeUserLinks) {
      await prisma.userSession.updateMany({
        where: {
          userId: link.userId,
          organizationId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          revokedBy: session.user.id,
          revokedReason: `Account locked: ${reason}`,
        },
      });
    }
  }

  await prisma.securityEvent.create({
    data: {
      organizationId,
      employeeId,
      eventType: "ACCOUNT_LOCKED",
      description: `Account locked pending review: ${reason}`,
      ipAddress,
      metadata: {
        lockedBy: session.user.id,
        reason,
      },
    },
  });

  await createAuditLog(session, organizationId, {
    action: "employee.account_locked",
    entityType: "EmployeeSecurityProfile",
    entityId: employeeId,
    newData: { isLocked: true, reason },
    ipAddress,
  });

  return profile;
}

export async function unlockEmployeeAccount(
  session: AuthSession,
  employeeId: string,
  organizationId: string,
  reason: string
) {
  const ipAddress = await getClientIP();

  const profile = await prisma.employeeSecurityProfile.update({
    where: { employeeId },
    data: {
      isLocked: false,
      lockedReason: null,
      lockedAt: null,
      lockedBy: null,
    },
  });

  await prisma.securityEvent.create({
    data: {
      organizationId,
      employeeId,
      eventType: "ACCOUNT_UNLOCKED",
      description: `Account unlocked: ${reason}`,
      ipAddress,
      metadata: {
        unlockedBy: session.user.id,
        reason,
      },
    },
  });

  await createAuditLog(session, organizationId, {
    action: "employee.account_unlocked",
    entityType: "EmployeeSecurityProfile",
    entityId: employeeId,
    newData: { isLocked: false, reason },
    ipAddress,
  });

  return profile;
}

export async function forceLogoutEmployee(
  session: AuthSession,
  employeeId: string,
  organizationId: string,
  reason: string
) {
  const ipAddress = await getClientIP();

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      employeeUserLinks: {
        where: { status: "VERIFIED" },
        select: { userId: true },
      },
    },
  });

  let revokedCount = 0;

  if (employee) {
    for (const link of employee.employeeUserLinks) {
      const result = await prisma.userSession.updateMany({
        where: {
          userId: link.userId,
          organizationId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          revokedBy: session.user.id,
          revokedReason: reason,
        },
      });
      revokedCount += result.count;
    }
  }

  await prisma.securityEvent.create({
    data: {
      organizationId,
      employeeId,
      eventType: "FORCE_LOGOUT",
      description: `${revokedCount} sessions forcibly terminated: ${reason}`,
      ipAddress,
      metadata: {
        revokedBy: session.user.id,
        reason,
        sessionsRevoked: revokedCount,
      },
    },
  });

  await createAuditLog(session, organizationId, {
    action: "employee.force_logout",
    entityType: "UserSession",
    entityId: employeeId,
    newData: { reason, sessionsRevoked: revokedCount },
    ipAddress,
  });

  return { revokedCount };
}

export async function blockEmployeeIP(
  session: AuthSession,
  employeeId: string,
  organizationId: string,
  ipAddress: string,
  reason: string,
  offboardingOnly: boolean = false
) {
  const currentIP = await getClientIP();

  const blockedIP = await prisma.blockedIP.create({
    data: {
      ipAddress,
      scope: "EMPLOYEE",
      organizationId,
      employeeId,
      offboardingOnly,
      reason,
      createdById: session.user.id,
    },
  });

  await prisma.securityEvent.create({
    data: {
      organizationId,
      employeeId,
      eventType: "IP_BANNED",
      description: `IP ${ipAddress} blocked for employee: ${reason}`,
      ipAddress: currentIP,
      metadata: {
        blockedIP: ipAddress,
        blockedBy: session.user.id,
        reason,
        offboardingOnly,
      },
    },
  });

  await createAuditLog(session, organizationId, {
    action: "ip.blocked",
    entityType: "BlockedIP",
    entityId: blockedIP.id,
    newData: { ipAddress, employeeId, reason, offboardingOnly },
    ipAddress: currentIP,
  });

  return blockedIP;
}

export async function getEmployeeBlockedIPs(employeeId: string, organizationId: string) {
  return prisma.blockedIP.findMany({
    where: {
      OR: [
        { employeeId, isActive: true },
        { organizationId, scope: "ORGANIZATION", isActive: true },
        { scope: "GLOBAL", isActive: true },
      ],
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { attempts: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createSecuritySignal(params: {
  organizationId: string;
  employeeId?: string;
  offboardingId?: string;
  eventType: SecurityEventType;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.securityEvent.create({
    data: {
      organizationId: params.organizationId,
      employeeId: params.employeeId,
      offboardingId: params.offboardingId,
      eventType: params.eventType,
      description: params.description,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: params.metadata as Prisma.InputJsonValue,
    },
  });
}

export async function updateRiskScoreFromSecurityEvent(
  offboardingId: string,
  eventType: SecurityEventType
) {
  const eventRiskWeights: Partial<Record<SecurityEventType, number>> = {
    POST_OFFBOARDING_LOGIN: 25,
    POST_REVOCATION_ACTION: 30,
    BLOCKED_LOGIN: 15,
    BLOCKED_IP: 20,
    NEW_COUNTRY_LOGIN: 10,
    FAILED_LOGIN_ATTEMPTS: 15,
    SUSPICIOUS_ACTIVITY: 20,
  };

  const weight = eventRiskWeights[eventType];
  if (!weight) return;

  const existingScore = await prisma.riskScore.findUnique({
    where: { offboardingId },
  });

  if (existingScore) {
    const newScore = Math.min(existingScore.score + weight, 100);
    const newLevel =
      newScore >= 75 ? "CRITICAL" : newScore >= 50 ? "HIGH" : "NORMAL";

    await prisma.riskScore.update({
      where: { offboardingId },
      data: {
        previousScore: existingScore.score,
        previousLevel: existingScore.level,
        score: newScore,
        level: newLevel,
        factors: {
          ...(existingScore.factors as object),
          securityEvents: [
            ...((existingScore.factors as { securityEvents?: string[] })?.securityEvents || []),
            eventType,
          ],
        },
        changeReason: `Security event: ${eventType}`,
        calculatedAt: new Date(),
      },
    });
  }
}
