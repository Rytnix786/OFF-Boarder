"use server";

import { prisma } from "@/lib/prisma.server";
import { 
  requireEmployeeOffboarding,
  requireEmployeePortalAuth,
  verifyEmployeeOwnership,
  getClientInfo,
  EmployeePortalSession
} from "@/lib/employee-auth.server";
import { createAuditLog } from "@/lib/audit.server";
import { revalidatePath } from "next/cache";
import { AssetProofType, EvidenceType } from "@prisma/client";
import { createNotificationForOrgMembers } from "@/lib/notifications";
import crypto from "crypto";

const ATTESTATION_STATEMENT = "I confirm that I no longer retain access to company systems or data.";

async function logEmployeeAction(
  session: EmployeePortalSession,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata?: Record<string, unknown>
) {
  const clientInfo = await getClientInfo();
  
  await createAuditLog({
    action,
    entityType,
    entityId,
    organizationId: session.organizationId,
    userId: session.user.id,
    metadata: {
      ...metadata,
      employeeId: session.employee.id,
      employeeName: `${session.employee.firstName} ${session.employee.lastName}`,
      portalAction: true,
    },
    ipAddress: clientInfo.ipAddress,
    userAgent: clientInfo.userAgent,
  });
}

async function logBlockedAction(
  session: EmployeePortalSession,
  action: string,
  reason: string,
  metadata?: Record<string, unknown>
) {
  const clientInfo = await getClientInfo();
  
  await createAuditLog({
    action: "blocked_action_attempt",
    entityType: "employee_portal",
    entityId: null,
    organizationId: session.organizationId,
    userId: session.user.id,
    metadata: {
      attemptedAction: action,
      reason,
      employeeId: session.employee.id,
      employeeName: `${session.employee.firstName} ${session.employee.lastName}`,
      ...metadata,
    },
    ipAddress: clientInfo.ipAddress,
    userAgent: clientInfo.userAgent,
  });
}

export async function completeEmployeeTask(taskId: string) {
  const session = await requireEmployeeOffboarding({ allowRevoked: true });
  
  const isOwner = await verifyEmployeeOwnership(session, "task", taskId);
  if (!isOwner) {
    await logBlockedAction(session, "complete_task", "Task not owned by employee", { taskId });
    return { success: false, error: "You do not have permission to complete this task" };
  }

  const task = await prisma.offboardingTask.findUnique({
    where: { id: taskId },
    include: {
      offboarding: {
        select: { id: true, status: true },
      },
      evidence: true,
    },
  });

  if (!task) {
    return { success: false, error: "Task not found" };
  }

  if (task.status === "COMPLETED") {
    await logBlockedAction(session, "complete_task", "Task already completed", { taskId });
    return { success: false, error: "This task has already been completed" };
  }

  if (task.offboarding.status === "COMPLETED" || task.offboarding.status === "CANCELLED") {
    await logBlockedAction(session, "complete_task", "Offboarding already finalized", { taskId });
    return { success: false, error: "This offboarding has been finalized" };
  }

  if (task.evidenceRequirement === "REQUIRED" && task.evidence.length === 0) {
    await logBlockedAction(session, "complete_task", "Evidence required but not provided", { taskId });
    return { success: false, error: "Evidence is required for this task. Please add at least one evidence item before completing." };
  }

  await prisma.$transaction([
    prisma.offboardingTask.update({
      where: { id: taskId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        completedBy: session.user.id,
      },
    }),
    prisma.taskEvidence.updateMany({
      where: { taskId, isImmutable: false },
      data: {
        isImmutable: true,
        immutableAt: new Date(),
      },
    }),
  ]);

  await logEmployeeAction(session, "task_completed", "offboarding_task", taskId, {
    taskName: task.name,
    offboardingId: task.offboardingId,
    evidenceCount: task.evidence.length,
  });

  // Notify admins
  await createNotificationForOrgMembers(
    session.organizationId,
    session.user.id,
    "task_completed",
    "Employee Task Completed",
    `${session.employee.firstName} ${session.employee.lastName} has completed task: ${task.name}.`,
    `/app/offboardings/${task.offboardingId}`
  );

  revalidatePath("/app/employee");
  revalidatePath("/app/employee/tasks");
  
  return { success: true };
}

export async function uploadAssetReturnProof(
  assetReturnId: string,
  proofType: AssetProofType,
  data: {
    trackingNumber?: string;
    fileUrl?: string;
    fileName?: string;
    description?: string;
  }
) {
  const session = await requireEmployeeOffboarding({ allowRevoked: true });

  const isOwner = await verifyEmployeeOwnership(session, "assetReturn", assetReturnId);
  if (!isOwner) {
    await logBlockedAction(session, "upload_asset_proof", "Asset return not owned by employee", { assetReturnId });
    return { success: false, error: "You do not have permission to update this asset return" };
  }

  const assetReturn = await prisma.assetReturn.findUnique({
    where: { id: assetReturnId },
    include: {
      asset: true,
      offboarding: {
        select: { status: true },
      },
    },
  });

  if (!assetReturn) {
    return { success: false, error: "Asset return not found" };
  }

  if (assetReturn.status === "RETURNED") {
    await logBlockedAction(session, "upload_asset_proof", "Asset already returned", { assetReturnId });
    return { success: false, error: "This asset has already been marked as returned" };
  }

  if (assetReturn.offboarding.status === "COMPLETED" || assetReturn.offboarding.status === "CANCELLED") {
    await logBlockedAction(session, "upload_asset_proof", "Offboarding finalized", { assetReturnId });
    return { success: false, error: "This offboarding has been finalized" };
  }

  const proof = await prisma.assetReturnProof.create({
    data: {
      assetReturnId,
      type: proofType,
      trackingNumber: data.trackingNumber,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      description: data.description,
      uploadedById: session.user.id,
    },
  });

  await prisma.assetReturn.update({
    where: { id: assetReturnId },
    data: {
      status: "PENDING",
    },
  });

  await logEmployeeAction(session, "asset_proof_uploaded", "asset_return_proof", proof.id, {
    assetReturnId,
    assetId: assetReturn.assetId,
    assetName: assetReturn.asset.name,
    proofType,
    trackingNumber: data.trackingNumber,
  });

  revalidatePath("/app/employee");
  revalidatePath("/app/employee/assets");

  return { success: true, proofId: proof.id };
}

export async function signAttestation() {
  const session = await requireEmployeeOffboarding({ allowRevoked: true });

  const existingAttestation = await prisma.employeeAttestation.findUnique({
    where: {
      offboardingId_employeeId: {
        offboardingId: session.offboardingId,
        employeeId: session.employee.id,
      },
    },
  });

  if (existingAttestation) {
    await logBlockedAction(session, "sign_attestation", "Attestation already signed");
    return { success: false, error: "You have already signed the attestation" };
  }

  const offboarding = await prisma.offboarding.findUnique({
    where: { id: session.offboardingId },
    select: { status: true },
  });

  if (!offboarding || offboarding.status === "COMPLETED" || offboarding.status === "CANCELLED") {
    await logBlockedAction(session, "sign_attestation", "Offboarding finalized");
    return { success: false, error: "This offboarding has been finalized" };
  }

  const clientInfo = await getClientInfo();

  const attestation = await prisma.employeeAttestation.create({
    data: {
      offboardingId: session.offboardingId,
      employeeId: session.employee.id,
      organizationId: session.organizationId,
      statement: ATTESTATION_STATEMENT,
      signedByUserId: session.user.id,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      metadata: {
        signedAt: new Date().toISOString(),
        employeeName: `${session.employee.firstName} ${session.employee.lastName}`,
        employeeEmail: session.employee.email,
      },
    },
  });

  // Find related tasks to auto-complete
  const relatedTasks = await prisma.offboardingTask.findMany({
    where: {
      offboardingId: session.offboardingId,
      assignedToEmployeeId: session.employee.id,
      name: {
        in: ["Complete final attestation", "Complete exit checklist"]
      },
      status: { not: "COMPLETED" }
    }
  });

  if (relatedTasks.length > 0) {
    const taskIds = relatedTasks.map(t => t.id);
    
    // Update tasks to COMPLETED
    await prisma.offboardingTask.updateMany({
      where: { id: { in: taskIds } },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        completedBy: session.user.id,
      }
    });

    // Create evidence for each task
    await Promise.all(relatedTasks.map(task => 
      prisma.taskEvidence.create({
        data: {
          taskId: task.id,
          offboardingId: session.offboardingId,
          organizationId: session.organizationId,
          type: "LINK",
          title: "Signed Attestation",
          description: "Automatically linked upon attestation signature",
          linkUrl: "/app/employee/attestation",
          createdByUserId: session.user.id,
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent,
          isImmutable: true,
          immutableAt: new Date(),
        }
      })
    ));

    // Log the auto-completion for each task
    for (const task of relatedTasks) {
      await logEmployeeAction(session, "task_auto_completed", "offboarding_task", task.id, {
        taskName: task.name,
        offboardingId: session.offboardingId,
        reason: "attestation_signed"
      });
    }
  }

  await logEmployeeAction(session, "attestation_signed", "employee_attestation", attestation.id, {
    offboardingId: session.offboardingId,
    statement: ATTESTATION_STATEMENT,
  });

  // Notify admins
  await createNotificationForOrgMembers(
    session.organizationId,
    session.user.id,
    "general",
    "Final Attestation Signed",
    `${session.employee.firstName} ${session.employee.lastName} has signed the final compliance attestation.`,
    `/app/offboardings/${session.offboardingId}`
  );

  revalidatePath("/app/employee");
  revalidatePath("/app/employee/attestation");
  revalidatePath("/app/employee/tasks");
  revalidatePath("/app/access-suspended");

  return { success: true, attestationId: attestation.id };
}

export async function getEmployeeTasks() {
  const session = await requireEmployeeOffboarding({ allowRevoked: true });

  const tasks = await prisma.offboardingTask.findMany({
    where: {
      offboardingId: session.offboardingId,
      assignedToEmployeeId: session.employee.id,
    },
    orderBy: [
      { order: "asc" },
      { createdAt: "asc" },
    ],
  });

  return tasks;
}

export async function getEmployeeAssets() {
  const session = await requireEmployeeOffboarding({ allowRevoked: true });

  const assetReturns = await prisma.assetReturn.findMany({
    where: {
      offboardingId: session.offboardingId,
    },
    include: {
      asset: true,
      proofs: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return assetReturns;
}

export async function getEmployeeAssignedAssets() {
  const session = await requireEmployeePortalAuth();

  const assets = await prisma.asset.findMany({
    where: {
      employeeId: session.employee.id,
      organizationId: session.organizationId,
    },
    orderBy: { createdAt: "desc" },
  });

  return assets;
}

export async function getEmployeeAccessRevocations() {
  const session = await requireEmployeeOffboarding({ allowRevoked: true });

  const revocations = await prisma.accessRevocation.findMany({
    where: {
      offboardingId: session.offboardingId,
    },
    orderBy: { createdAt: "desc" },
  });

  return revocations;
}

export async function getEmployeeTimeline() {
  const session = await requireEmployeeOffboarding({ allowRevoked: true });

  const [tasks, assetReturns, attestations] = await Promise.all([
    prisma.offboardingTask.findMany({
      where: {
        offboardingId: session.offboardingId,
        assignedToEmployeeId: session.employee.id,
      },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        completedAt: true,
      },
    }),
    prisma.assetReturn.findMany({
      where: {
        offboardingId: session.offboardingId,
      },
      include: {
        asset: {
          select: { name: true, type: true },
        },
        proofs: {
          select: { createdAt: true, type: true },
        },
      },
    }),
    prisma.employeeAttestation.findMany({
      where: {
        offboardingId: session.offboardingId,
        employeeId: session.employee.id,
      },
      select: {
        id: true,
        statement: true,
        signedAt: true,
      },
    }),
  ]);

  type TimelineEvent = {
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: Date;
    status?: string;
  };

  const events: TimelineEvent[] = [];

  tasks.forEach((task) => {
    events.push({
      id: `task-assigned-${task.id}`,
      type: "task_assigned",
      title: "Task Assigned",
      description: task.name,
      timestamp: task.createdAt,
    });

    if (task.completedAt) {
      events.push({
        id: `task-completed-${task.id}`,
        type: "task_completed",
        title: "Task Completed",
        description: task.name,
        timestamp: task.completedAt,
        status: "completed",
      });
    }
  });

  assetReturns.forEach((ar) => {
    events.push({
      id: `asset-assigned-${ar.id}`,
      type: "asset_return_created",
      title: "Asset Return Required",
      description: ar.asset.name,
      timestamp: ar.createdAt,
    });

    ar.proofs.forEach((proof) => {
      events.push({
        id: `proof-${proof.createdAt.getTime()}`,
        type: "asset_proof_uploaded",
        title: "Return Proof Uploaded",
        description: `${ar.asset.name} - ${proof.type}`,
        timestamp: proof.createdAt,
      });
    });

    if (ar.returnedAt) {
      events.push({
        id: `asset-returned-${ar.id}`,
        type: "asset_returned",
        title: "Asset Returned",
        description: ar.asset.name,
        timestamp: ar.returnedAt,
        status: "completed",
      });
    }
    });

    attestations.forEach((att) => {
    events.push({
      id: `attestation-${att.id}`,
      type: "attestation_signed",
      title: "Attestation Signed",
      description: "Compliance attestation signed",
      timestamp: att.signedAt,
      status: "completed",
    });
  });

  events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return events;
}

export async function getEmployeeAttestation() {
  const session = await requireEmployeeOffboarding({ allowRevoked: true });

  const attestation = await prisma.employeeAttestation.findUnique({
    where: {
      offboardingId_employeeId: {
        offboardingId: session.offboardingId,
        employeeId: session.employee.id,
      },
    },
  });

  return {
    attestation,
    statement: ATTESTATION_STATEMENT,
    isSigned: !!attestation,
  };
}

export async function exportEmployeeData() {
  const session = await requireEmployeeOffboarding({ allowRevoked: true });

  const [offboarding, tasks, attestations] = await Promise.all([
    prisma.offboarding.findUnique({
      where: { id: session.offboardingId },
      select: {
        id: true,
        status: true,
        scheduledDate: true,
        completedDate: true,
        createdAt: true,
      },
    }),
prisma.offboardingTask.findMany({
        where: {
          offboardingId: session.offboardingId,
          assignedToEmployeeId: session.employee.id,
          status: "COMPLETED",
        },
      select: {
        name: true,
        completedAt: true,
        category: true,
      },
    }),
    prisma.employeeAttestation.findMany({
      where: {
        offboardingId: session.offboardingId,
        employeeId: session.employee.id,
      },
      select: {
        statement: true,
        signedAt: true,
      },
    }),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    employee: {
      name: `${session.employee.firstName} ${session.employee.lastName}`,
      email: session.employee.email,
      employeeId: session.employee.employeeId,
      department: session.employee.department?.name,
      jobTitle: session.employee.jobTitle?.title,
    },
    offboarding: offboarding ? {
      status: offboarding.status,
      scheduledDate: offboarding.scheduledDate?.toISOString(),
      completedDate: offboarding.completedDate?.toISOString(),
      createdAt: offboarding.createdAt.toISOString(),
    } : null,
    completedTasks: tasks.map((t) => ({
      name: t.name,
      category: t.category,
      completedAt: t.completedAt?.toISOString(),
    })),
    attestations: attestations.map((a) => ({
      statement: a.statement,
      signedAt: a.signedAt.toISOString(),
    })),
  };

  await logEmployeeAction(session, "data_exported", "employee_export", null, {
    exportedAt: exportData.exportedAt,
  });

  return exportData;
}

export async function checkOffboardingCompletionEligibility() {
  const session = await requireEmployeeOffboarding({ allowRevoked: true });

  const [pendingTasks, pendingAssetReturns, attestation] = await Promise.all([
    prisma.offboardingTask.count({
      where: {
        offboardingId: session.offboardingId,
        status: { not: "COMPLETED" },
        assignedToEmployeeId: session.employee.id,
      },
    }),
    prisma.assetReturn.count({
      where: {
        offboardingId: session.offboardingId,
        status: { not: "RETURNED" },
      },
    }),
    prisma.employeeAttestation.findUnique({
      where: {
        offboardingId_employeeId: {
          offboardingId: session.offboardingId,
          employeeId: session.employee.id,
        },
      },
    }),
  ]);

  return {
    isEligible: pendingTasks === 0 && pendingAssetReturns === 0 && !!attestation,
    pendingTasks,
    pendingAssetReturns,
    attestationSigned: !!attestation,
  };
}

export async function addEmployeeTaskEvidence(
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
  }
) {
  const session = await requireEmployeeOffboarding({ allowRevoked: true });

  const isOwner = await verifyEmployeeOwnership(session, "task", taskId);
  if (!isOwner) {
    await logBlockedAction(session, "add_task_evidence", "Task not owned by employee", { taskId });
    return { success: false, error: "You do not have permission to add evidence to this task" };
  }

  const task = await prisma.offboardingTask.findUnique({
    where: { id: taskId },
    include: {
      offboarding: { select: { id: true, status: true } },
    },
  });

  if (!task) {
    return { success: false, error: "Task not found" };
  }

  if (task.status === "COMPLETED" && task.offboarding.status === "COMPLETED") {
    await logBlockedAction(session, "add_task_evidence", "Task already completed", { taskId });
    return { success: false, error: "Cannot add evidence to a completed task in a completed offboarding" };
  }

  const clientInfo = await getClientInfo();

  let fileHash: string | null = null;
  if (data.fileUrl && data.type === "FILE") {
    fileHash = crypto.createHash("sha256").update(data.fileUrl + (data.fileName || "") + Date.now()).digest("hex");
  }

  const evidence = await prisma.taskEvidence.create({
    data: {
      taskId,
      offboardingId: session.offboardingId,
      organizationId: session.organizationId,
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
      createdByUserId: session.user.id,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      isImmutable: false,
    },
  });

  await logEmployeeAction(session, "task_evidence_added", "task_evidence", evidence.id, {
    taskId,
    taskName: task.name,
    evidenceType: data.type,
    title: data.title,
  });

  revalidatePath("/app/employee/tasks");
  return { success: true, evidenceId: evidence.id };
}

export async function getEmployeeTaskEvidence(taskId: string) {
  const session = await requireEmployeeOffboarding({ allowRevoked: true });

  const isOwner = await verifyEmployeeOwnership(session, "task", taskId);
  if (!isOwner) {
    return [];
  }

  return prisma.taskEvidence.findMany({
    where: { taskId },
    orderBy: { createdAt: "asc" },
  });
}

export async function deleteEmployeeTaskEvidence(evidenceId: string) {
  const session = await requireEmployeeOffboarding({ allowRevoked: true });

  const evidence = await prisma.taskEvidence.findUnique({
    where: { id: evidenceId },
    include: {
      task: {
        include: { offboarding: true },
      },
    },
  });

  if (!evidence) {
    return { success: false, error: "Evidence not found" };
  }

  const isOwner = await verifyEmployeeOwnership(session, "task", evidence.taskId);
  if (!isOwner) {
    await logBlockedAction(session, "delete_task_evidence", "Task not owned by employee", { evidenceId });
    return { success: false, error: "You do not have permission to delete this evidence" };
  }

  if (evidence.isImmutable) {
    return { success: false, error: "Cannot delete sealed evidence" };
  }

  if (evidence.task.status === "COMPLETED") {
    return { success: false, error: "Cannot delete evidence from a completed task" };
  }

  await prisma.taskEvidence.delete({
    where: { id: evidenceId },
  });

  await logEmployeeAction(session, "task_evidence_deleted", "task_evidence", evidenceId, {
    taskId: evidence.taskId,
    evidenceType: evidence.type,
  });

  revalidatePath("/app/employee/tasks");
  return { success: true };
}

export async function getEmployeeTasksWithEvidence() {
  const session = await requireEmployeeOffboarding({ allowRevoked: true });

  const tasks = await prisma.offboardingTask.findMany({
    where: {
      offboardingId: session.offboardingId,
      assignedToEmployeeId: session.employee.id,
    },
    include: {
      evidence: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [
      { order: "asc" },
      { createdAt: "asc" },
    ],
  });

  return tasks;
}
