"use server";

import { prisma } from "@/lib/prisma.server";
import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission } from "@/lib/rbac.server";
import { createAuditLog } from "@/lib/audit.server";
import { createNotificationForOrgMembers } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { MonitoringEventType, MonitoringSeverity } from "@prisma/client";

export async function createMonitoringEvent(data: {
  offboardingId: string;
  eventType: MonitoringEventType;
  severity?: MonitoringSeverity;
  description: string;
  source?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}) {
  const session = await requireActiveOrg();
  await requirePermission(session, "offboarding:update");

  const orgId = session.currentOrgId!;

  const offboarding = await prisma.offboarding.findFirst({
    where: { id: data.offboardingId, organizationId: orgId },
    include: { employee: true },
  });

  if (!offboarding) {
    return { error: "Offboarding not found" };
  }

  const event = await prisma.monitoringEvent.create({
    data: {
      offboardingId: data.offboardingId,
      organizationId: orgId,
      eventType: data.eventType,
      severity: data.severity || "MEDIUM",
      description: data.description,
      source: data.source,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined,
    },
  });

  await createAuditLog(session, orgId, {
    action: "monitoring.event_created" as any,
    entityType: "MonitoringEvent",
    entityId: event.id,
    newData: {
      eventType: data.eventType,
      severity: data.severity,
      offboardingId: data.offboardingId,
      employeeName: `${offboarding.employee.firstName} ${offboarding.employee.lastName}`,
    },
  });

  if (data.severity === "HIGH" || data.severity === "CRITICAL") {
    await createNotificationForOrgMembers(
      orgId,
      session.user.id,
      "monitoring_alert",
      `${data.severity} Security Alert`,
      `${data.description} - ${offboarding.employee.firstName} ${offboarding.employee.lastName}`,
      `/app/offboardings/${data.offboardingId}`
    );
  }

  revalidatePath(`/app/offboardings/${data.offboardingId}`);
  revalidatePath("/app/monitoring");
  return { success: true, event };
}

export async function acknowledgeMonitoringEvent(eventId: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "offboarding:update");

  const orgId = session.currentOrgId!;

  const event = await prisma.monitoringEvent.findFirst({
    where: { id: eventId, organizationId: orgId },
    include: { offboarding: { include: { employee: true } } },
  });

  if (!event) {
    return { error: "Event not found" };
  }

  if (event.acknowledged) {
    return { error: "Event already acknowledged" };
  }

  const updated = await prisma.monitoringEvent.update({
    where: { id: eventId },
    data: {
      acknowledged: true,
      acknowledgedBy: session.user.id,
      acknowledgedAt: new Date(),
    },
  });

  await createAuditLog(session, orgId, {
    action: "monitoring.event_acknowledged" as any,
    entityType: "MonitoringEvent",
    entityId: eventId,
    newData: {
      eventType: event.eventType,
      acknowledgedBy: session.user.name || session.user.email,
    },
  });

  revalidatePath(`/app/offboardings/${event.offboardingId}`);
  revalidatePath("/app/monitoring");
  return { success: true, event: updated };
}

export async function getMonitoringEvents(options?: {
  offboardingId?: string;
  eventType?: MonitoringEventType;
  severity?: MonitoringSeverity;
  acknowledged?: boolean;
  limit?: number;
}) {
  const session = await requireActiveOrg();
  await requirePermission(session, "offboarding:read");

  const orgId = session.currentOrgId!;
  const where: Record<string, unknown> = { organizationId: orgId };

  if (options?.offboardingId) {
    where.offboardingId = options.offboardingId;
  }
  if (options?.eventType) {
    where.eventType = options.eventType;
  }
  if (options?.severity) {
    where.severity = options.severity;
  }
  if (options?.acknowledged !== undefined) {
    where.acknowledged = options.acknowledged;
  }

  return prisma.monitoringEvent.findMany({
    where,
    include: {
      offboarding: {
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: options?.limit || 100,
  });
}

export async function getActiveAlerts() {
  const session = await requireActiveOrg();
  await requirePermission(session, "offboarding:read");

  const orgId = session.currentOrgId!;

  return prisma.monitoringEvent.findMany({
    where: {
      organizationId: orgId,
      acknowledged: false,
      severity: { in: ["HIGH", "CRITICAL"] },
    },
    include: {
      offboarding: {
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      },
    },
    orderBy: [
      { severity: "desc" },
      { createdAt: "desc" },
    ],
  });
}

export async function getCompletedOffboardingsForMonitoring() {
  const session = await requireActiveOrg();
  await requirePermission(session, "offboarding:read");

  const orgId = session.currentOrgId!;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return prisma.offboarding.findMany({
    where: {
      organizationId: orgId,
      status: "COMPLETED",
      completedDate: { gte: thirtyDaysAgo },
    },
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      monitoringEvents: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      _count: { select: { monitoringEvents: true } },
    },
    orderBy: { completedDate: "desc" },
  });
}

export async function recordLoginAttempt(
  offboardingId: string,
  details: {
    source: string;
    ipAddress?: string;
    userAgent?: string;
    wasSuccessful: boolean;
  }
) {
  const session = await requireActiveOrg();
  await requirePermission(session, "offboarding:update");

  const orgId = session.currentOrgId!;

  const offboarding = await prisma.offboarding.findFirst({
    where: { id: offboardingId, organizationId: orgId, status: "COMPLETED" },
    include: { employee: true },
  });

  if (!offboarding) {
    return { error: "Completed offboarding not found" };
  }

  const event = await prisma.monitoringEvent.create({
    data: {
      offboardingId,
      organizationId: orgId,
      eventType: "LOGIN_ATTEMPT",
      severity: details.wasSuccessful ? "CRITICAL" : "HIGH",
      description: details.wasSuccessful
        ? `Successful login attempt detected for terminated employee ${offboarding.employee.email}`
        : `Failed login attempt detected for terminated employee ${offboarding.employee.email}`,
      source: details.source,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      metadata: { wasSuccessful: details.wasSuccessful },
    },
  });

  await createNotificationForOrgMembers(
    orgId,
    session.user.id,
    "security_alert",
    "Security Alert: Login Attempt",
    `${details.wasSuccessful ? "SUCCESSFUL" : "Failed"} login attempt for ${offboarding.employee.firstName} ${offboarding.employee.lastName}`,
    `/app/offboardings/${offboardingId}`
  );

  return { success: true, event };
}

export async function recordAccessAttempt(
  offboardingId: string,
  details: {
    resource: string;
    action: string;
    source: string;
    ipAddress?: string;
    wasBlocked: boolean;
  }
) {
  const session = await requireActiveOrg();
  await requirePermission(session, "offboarding:update");

  const orgId = session.currentOrgId!;

  const offboarding = await prisma.offboarding.findFirst({
    where: { id: offboardingId, organizationId: orgId, status: "COMPLETED" },
    include: { employee: true },
  });

  if (!offboarding) {
    return { error: "Completed offboarding not found" };
  }

  const event = await prisma.monitoringEvent.create({
    data: {
      offboardingId,
      organizationId: orgId,
      eventType: "ACCESS_ATTEMPT",
      severity: details.wasBlocked ? "MEDIUM" : "CRITICAL",
      description: `Access attempt to ${details.resource} (${details.action}) by terminated employee ${offboarding.employee.email} - ${details.wasBlocked ? "BLOCKED" : "NOT BLOCKED"}`,
      source: details.source,
      ipAddress: details.ipAddress,
      metadata: {
        resource: details.resource,
        action: details.action,
        wasBlocked: details.wasBlocked,
      },
    },
  });

  if (!details.wasBlocked) {
    await createNotificationForOrgMembers(
      orgId,
      session.user.id,
      "security_alert",
      "CRITICAL: Unblocked Access Attempt",
      `Terminated employee ${offboarding.employee.firstName} ${offboarding.employee.lastName} accessed ${details.resource}`,
      `/app/offboardings/${offboardingId}`
    );
  }

  return { success: true, event };
}

export async function getMonitoringStats() {
  const session = await requireActiveOrg();
  await requirePermission(session, "offboarding:read");

  const orgId = session.currentOrgId!;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [totalEvents, unacknowledged, criticalAlerts, eventsByType] = await Promise.all([
    prisma.monitoringEvent.count({
      where: { organizationId: orgId, createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.monitoringEvent.count({
      where: { organizationId: orgId, acknowledged: false },
    }),
    prisma.monitoringEvent.count({
      where: { organizationId: orgId, severity: "CRITICAL", acknowledged: false },
    }),
    prisma.monitoringEvent.groupBy({
      by: ["eventType"],
      where: { organizationId: orgId, createdAt: { gte: thirtyDaysAgo } },
      _count: true,
    }),
  ]);

  return {
    totalEvents,
    unacknowledged,
    criticalAlerts,
    eventsByType: eventsByType.reduce((acc, item) => {
      acc[item.eventType] = item._count;
      return acc;
    }, {} as Record<string, number>),
  };
}
