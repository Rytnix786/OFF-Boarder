"use server";

import { prisma } from "@/lib/prisma.server";
import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission } from "@/lib/rbac.server";
import { createAuditLog } from "@/lib/audit.server";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export async function generateEvidencePack(offboardingId: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "offboarding:read");

  const orgId = session.currentOrgId!;

  const offboarding = await prisma.offboarding.findFirst({
    where: { id: offboardingId, organizationId: orgId },
    include: {
      employee: {
        include: {
          department: true,
          jobTitle: true,
          location: true,
          manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
      tasks: {
        orderBy: { order: "asc" },
      },
      approvals: {
        include: {
          approver: { select: { id: true, name: true, email: true } },
          task: true,
        },
      },
      assetReturns: {
        include: {
          asset: true,
        },
      },
    },
  });

  if (!offboarding) {
    return { error: "Offboarding not found" };
  }

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      organizationId: orgId,
      OR: [
        { entityType: "Offboarding", entityId: offboardingId },
        { entityType: "OffboardingTask", entityId: { in: offboarding.tasks.map(t => t.id) } },
        { entityType: "Approval", entityId: { in: offboarding.approvals.map(a => a.id) } },
        { entityType: "AssetReturn", entityId: { in: offboarding.assetReturns.map(ar => ar.id) } },
      ],
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const evidenceData = {
    generatedAt: new Date().toISOString(),
    offboarding: {
      id: offboarding.id,
      status: offboarding.status,
      riskLevel: offboarding.riskLevel,
      riskReason: offboarding.riskReason,
      scheduledDate: offboarding.scheduledDate?.toISOString(),
      completedDate: offboarding.completedDate?.toISOString(),
      reason: offboarding.reason,
      notes: offboarding.notes,
      createdAt: offboarding.createdAt.toISOString(),
      updatedAt: offboarding.updatedAt.toISOString(),
    },
    employee: {
      id: offboarding.employee.id,
      employeeId: offboarding.employee.employeeId,
      name: `${offboarding.employee.firstName} ${offboarding.employee.lastName}`,
      email: offboarding.employee.email,
      phone: offboarding.employee.phone,
      department: offboarding.employee.department?.name,
      jobTitle: offboarding.employee.jobTitle?.title,
      location: offboarding.employee.location?.name,
      manager: offboarding.employee.manager 
        ? `${offboarding.employee.manager.firstName} ${offboarding.employee.manager.lastName}`
        : null,
      hireDate: offboarding.employee.hireDate?.toISOString(),
    },
    tasks: offboarding.tasks.map(task => ({
      id: task.id,
      name: task.name,
      description: task.description,
      category: task.category,
      status: task.status,
      isHighRiskTask: task.isHighRiskTask,
      requiresApproval: task.requiresApproval,
      dueDate: task.dueDate?.toISOString(),
      completedAt: task.completedAt?.toISOString(),
      completedBy: task.completedBy,
    })),
    approvals: offboarding.approvals.map(approval => ({
      id: approval.id,
      type: approval.type,
      status: approval.status,
      taskId: approval.taskId,
      taskName: approval.task?.name,
      approver: approval.approver 
        ? { name: approval.approver.name, email: approval.approver.email }
        : null,
      approvedAt: approval.approvedAt?.toISOString(),
      rejectedAt: approval.rejectedAt?.toISOString(),
      rejectionReason: approval.rejectionReason,
      comments: approval.comments,
    })),
    assetReturns: offboarding.assetReturns.map(ar => ({
      id: ar.id,
      asset: {
        id: ar.asset.id,
        name: ar.asset.name,
        type: ar.asset.type,
        serialNumber: ar.asset.serialNumber,
        assetTag: ar.asset.assetTag,
      },
      status: ar.status,
      returnedAt: ar.returnedAt?.toISOString(),
      receivedBy: ar.receivedBy,
      condition: ar.condition,
      notes: ar.notes,
    })),
    auditTrail: auditLogs.map(log => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      user: log.user ? { name: log.user.name, email: log.user.email } : null,
      oldData: log.oldData,
      newData: log.newData,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt.toISOString(),
    })),
  };

  const dataString = JSON.stringify(evidenceData, null, 2);
  const checksum = crypto.createHash("sha256").update(dataString).digest("hex");

  const existingPack = await prisma.evidencePack.findUnique({
    where: { offboardingId },
  });

  const evidencePack = existingPack
    ? await prisma.evidencePack.update({
        where: { offboardingId },
        data: {
          data: evidenceData,
          checksum,
          generatedAt: new Date(),
          generatedBy: session.user.id,
          accessLog: {
            ...(existingPack.accessLog as object || {}),
            [new Date().toISOString()]: {
              userId: session.user.id,
              action: "regenerated",
            },
          },
        },
      })
    : await prisma.evidencePack.create({
        data: {
          offboardingId,
          data: evidenceData,
          checksum,
          generatedBy: session.user.id,
          accessLog: {
            [new Date().toISOString()]: {
              userId: session.user.id,
              action: "generated",
            },
          },
        },
      });

  await createAuditLog(session, orgId, {
    action: "evidence.generated" as any,
    entityType: "EvidencePack",
    entityId: evidencePack.id,
    newData: { 
      offboardingId, 
      checksum,
      employeeName: `${offboarding.employee.firstName} ${offboarding.employee.lastName}`,
    },
  });

  revalidatePath(`/app/offboardings/${offboardingId}`);
  return { success: true, evidencePack, checksum };
}

export async function getEvidencePack(offboardingId: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "offboarding:read");

  const orgId = session.currentOrgId!;

  const offboarding = await prisma.offboarding.findFirst({
    where: { id: offboardingId, organizationId: orgId },
  });

  if (!offboarding) {
    return null;
  }

  const evidencePack = await prisma.evidencePack.findUnique({
    where: { offboardingId },
  });

  if (evidencePack) {
    await prisma.evidencePack.update({
      where: { id: evidencePack.id },
      data: {
        accessLog: {
          ...(evidencePack.accessLog as object || {}),
          [new Date().toISOString()]: {
            userId: session.user.id,
            action: "viewed",
          },
        },
      },
    });

    await createAuditLog(session, orgId, {
      action: "evidence.viewed" as any,
      entityType: "EvidencePack",
      entityId: evidencePack.id,
      newData: { offboardingId },
    });
  }

  return evidencePack;
}

export async function verifyEvidencePack(offboardingId: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "offboarding:read");

  const evidencePack = await prisma.evidencePack.findUnique({
    where: { offboardingId },
  });

  if (!evidencePack) {
    return { valid: false, error: "Evidence pack not found" };
  }

  const dataString = JSON.stringify(evidencePack.data, null, 2);
  const calculatedChecksum = crypto.createHash("sha256").update(dataString).digest("hex");

  const isValid = calculatedChecksum === evidencePack.checksum;

  return { 
    valid: isValid, 
    checksum: evidencePack.checksum,
    calculatedChecksum,
    generatedAt: evidencePack.generatedAt,
  };
}

export async function exportEvidencePackAsJSON(offboardingId: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "offboarding:read");

  const orgId = session.currentOrgId!;

  const evidencePack = await prisma.evidencePack.findUnique({
    where: { offboardingId },
  });

  if (!evidencePack) {
    return { error: "Evidence pack not found. Please generate it first." };
  }

  await createAuditLog(session, orgId, {
    action: "evidence.exported" as any,
    entityType: "EvidencePack",
    entityId: evidencePack.id,
    newData: { offboardingId, format: "json" },
  });

  return {
    success: true,
    data: evidencePack.data,
    checksum: evidencePack.checksum,
    generatedAt: evidencePack.generatedAt,
  };
}
