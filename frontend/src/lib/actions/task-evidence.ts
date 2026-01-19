"use server";

import { prisma } from "@/lib/prisma";
import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission, isUserOffboardingSubject } from "@/lib/rbac";
import { AuthSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { headers } from "next/headers";
import { EvidenceType, EvidenceRequirement } from "@prisma/client";

async function getRequestMetadata() {
  const headersList = await headers();
  return {
    ipAddress: headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || headersList.get("x-real-ip") || null,
    userAgent: headersList.get("user-agent") || null,
  };
}

async function canUserSubmitEvidence(
  session: AuthSession,
  taskId: string
): Promise<{ allowed: boolean; error?: string; task?: any }> {
  const orgId = session.currentOrgId!;

  const task = await prisma.offboardingTask.findUnique({
    where: { id: taskId },
    include: {
      offboarding: {
        include: { employee: true },
      },
    },
  });

  if (!task || task.offboarding.organizationId !== orgId) {
    return { allowed: false, error: "Task not found" };
  }

  const isAuditor = session.currentMembership?.systemRole === "AUDITOR";
  if (isAuditor) {
    return { allowed: false, error: "Auditors cannot submit evidence" };
  }

  const isSubject = await isUserOffboardingSubject(session.user.id, orgId, task.offboardingId);

  if (isSubject) {
    if (!task.isEmployeeRequired) {
      return { allowed: false, error: "INVARIANT: Subjects can only submit evidence for tasks assigned to them" };
    }
    if (task.isHighRiskTask || task.category === "SECURITY") {
      return { allowed: false, error: "INVARIANT: Subjects cannot submit evidence for security tasks" };
    }
    return { allowed: true, task };
  }

  const isContributor = session.currentMembership?.systemRole === "CONTRIBUTOR";
  if (isContributor) {
    if (task.assignedToUserId !== session.user.id) {
      return { allowed: false, error: "Contributors can only submit evidence for tasks assigned to them" };
    }
    return { allowed: true, task };
  }

  return { allowed: true, task };
}

export async function addTaskEvidence(
  taskId: string,
  data: {
    type: EvidenceType;
    title?: string;
    description?: string;
    fileName?: string;
    fileUrl?: string;
    fileSize?: number;
    mimeType?: string;
    linkUrl?: string;
    noteContent?: string;
    systemProof?: Record<string, unknown>;
  }
) {
  const session = await requireActiveOrg();
  await requirePermission(session, "offboarding:read");

  const orgId = session.currentOrgId!;
  const { ipAddress, userAgent } = await getRequestMetadata();

  const accessCheck = await canUserSubmitEvidence(session, taskId);
  if (!accessCheck.allowed) {
    return { error: accessCheck.error };
  }

  const task = accessCheck.task!;

  if (task.status === "COMPLETED" && task.offboarding.status === "COMPLETED") {
    return { error: "Cannot add evidence to a completed task in a completed offboarding" };
  }

  let fileHash: string | null = null;
  if (data.fileUrl && data.type === "FILE") {
    fileHash = crypto.createHash("sha256").update(data.fileUrl + (data.fileName || "") + Date.now()).digest("hex");
  }

  const evidence = await prisma.taskEvidence.create({
    data: {
      taskId,
      offboardingId: task.offboardingId,
      organizationId: orgId,
      type: data.type,
      title: data.title,
      description: data.description,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      fileSize: data.fileSize,
      fileHash,
      mimeType: data.mimeType,
      linkUrl: data.linkUrl,
      noteContent: data.noteContent,
      systemProof: data.systemProof as any,
      createdByUserId: session.user.id,
      ipAddress,
      userAgent,
      isImmutable: false,
    },
  });

  await createAuditLog(session, orgId, {
    action: "evidence.added",
    entityType: "TaskEvidence",
    entityId: evidence.id,
    newData: {
      taskId,
      taskName: task.name,
      offboardingId: task.offboardingId,
      evidenceType: data.type,
      title: data.title,
      fileName: data.fileName,
    },
  });

  revalidatePath(`/app/offboardings/${task.offboardingId}`);
  return { success: true, evidence };
}

export async function getTaskEvidence(taskId: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "offboarding:read");

  const orgId = session.currentOrgId!;

  const task = await prisma.offboardingTask.findUnique({
    where: { id: taskId },
    include: { offboarding: true },
  });

  if (!task || task.offboarding.organizationId !== orgId) {
    return [];
  }

  return prisma.taskEvidence.findMany({
    where: { taskId },
    orderBy: { createdAt: "asc" },
  });
}

export async function deleteTaskEvidence(evidenceId: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "offboarding:update");

  const orgId = session.currentOrgId!;

  const evidence = await prisma.taskEvidence.findUnique({
    where: { id: evidenceId },
    include: {
      task: {
        include: { offboarding: true },
      },
    },
  });

  if (!evidence || evidence.organizationId !== orgId) {
    return { error: "Evidence not found" };
  }

  if (evidence.isImmutable) {
    return { error: "Cannot delete immutable evidence" };
  }

  if (evidence.task.status === "COMPLETED") {
    return { error: "Cannot delete evidence from a completed task" };
  }

  await prisma.taskEvidence.delete({
    where: { id: evidenceId },
  });

  await createAuditLog(session, orgId, {
    action: "evidence.deleted",
    entityType: "TaskEvidence",
    entityId: evidenceId,
    oldData: {
      taskId: evidence.taskId,
      type: evidence.type,
      title: evidence.title,
      fileName: evidence.fileName,
    },
  });

  revalidatePath(`/app/offboardings/${evidence.task.offboardingId}`);
  return { success: true };
}

export async function makeEvidenceImmutable(taskId: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "offboarding:update");

  const orgId = session.currentOrgId!;

  const task = await prisma.offboardingTask.findUnique({
    where: { id: taskId },
    include: { offboarding: true },
  });

  if (!task || task.offboarding.organizationId !== orgId) {
    return { error: "Task not found" };
  }

  await prisma.taskEvidence.updateMany({
    where: { taskId, isImmutable: false },
    data: {
      isImmutable: true,
      immutableAt: new Date(),
    },
  });

  await createAuditLog(session, orgId, {
    action: "evidence.sealed",
    entityType: "OffboardingTask",
    entityId: taskId,
    newData: {
      taskName: task.name,
      sealedAt: new Date().toISOString(),
    },
  });

  return { success: true };
}

export async function checkEvidenceCompliance(taskId: string): Promise<{
  compliant: boolean;
  requirement: EvidenceRequirement;
  evidenceCount: number;
  message?: string;
}> {
  const task = await prisma.offboardingTask.findUnique({
    where: { id: taskId },
    include: {
      evidence: true,
    },
  });

  if (!task) {
    return { compliant: false, requirement: "NONE", evidenceCount: 0, message: "Task not found" };
  }

  const evidenceCount = task.evidence.length;

  if (task.evidenceRequirement === "REQUIRED") {
    if (evidenceCount === 0) {
      return {
        compliant: false,
        requirement: "REQUIRED",
        evidenceCount: 0,
        message: "Evidence required for compliance",
      };
    }
  }

  return {
    compliant: true,
    requirement: task.evidenceRequirement,
    evidenceCount,
  };
}

export async function updateTaskEvidenceRequirement(
  taskId: string,
  requirement: EvidenceRequirement
) {
  const session = await requireActiveOrg();
  await requirePermission(session, "offboarding:update");

  const orgId = session.currentOrgId!;

  const task = await prisma.offboardingTask.findUnique({
    where: { id: taskId },
    include: { offboarding: true },
  });

  if (!task || task.offboarding.organizationId !== orgId) {
    return { error: "Task not found" };
  }

  const updated = await prisma.offboardingTask.update({
    where: { id: taskId },
    data: { evidenceRequirement: requirement },
  });

  await createAuditLog(session, orgId, {
    action: "task.evidence_requirement_updated",
    entityType: "OffboardingTask",
    entityId: taskId,
    oldData: { evidenceRequirement: task.evidenceRequirement },
    newData: { evidenceRequirement: requirement },
  });

  revalidatePath(`/app/offboardings/${task.offboardingId}`);
  return { success: true, task: updated };
}

export async function addSystemProofEvidence(
  taskId: string,
  proofData: {
    action: string;
    system: string;
    result: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
  }
) {
  const session = await requireActiveOrg();
  const orgId = session.currentOrgId!;
  const { ipAddress, userAgent } = await getRequestMetadata();

  const task = await prisma.offboardingTask.findUnique({
    where: { id: taskId },
    include: { offboarding: true },
  });

  if (!task || task.offboarding.organizationId !== orgId) {
    return { error: "Task not found" };
  }

  const systemProof = {
    action: proofData.action,
    system: proofData.system,
    result: proofData.result,
    timestamp: proofData.timestamp,
    executedBy: session.user.id,
    ...proofData.metadata,
  };

  const proofHash = crypto.createHash("sha256").update(JSON.stringify(systemProof)).digest("hex");

  const evidence = await prisma.taskEvidence.create({
    data: {
      taskId,
      offboardingId: task.offboardingId,
      organizationId: orgId,
      type: "SYSTEM_PROOF",
      title: `${proofData.system}: ${proofData.action}`,
      description: proofData.result,
      systemProof,
      fileHash: proofHash,
      createdByUserId: session.user.id,
      ipAddress,
      userAgent,
      isImmutable: true,
      immutableAt: new Date(),
    },
  });

  await createAuditLog(session, orgId, {
    action: "evidence.system_proof_added",
    entityType: "TaskEvidence",
    entityId: evidence.id,
    newData: {
      taskId,
      system: proofData.system,
      action: proofData.action,
      proofHash,
    },
  });

  revalidatePath(`/app/offboardings/${task.offboardingId}`);
  return { success: true, evidence };
}
