"use server";

import { prisma } from "@/lib/prisma.server";
import { requireActiveOrg } from "@/lib/auth.server";
import { 
  requirePermission, 
  canUserOperateOnOffboarding, 
  enforceSubjectCannotSelfExecute,
  enforceSubjectCannotSelfApprove,
  enforceAuditorReadOnly,
  enforceContributorTasksOnly,
  isAuditor,
  isContributor,
  InvariantViolationError
} from "@/lib/rbac.server";
import { createAuditLog } from "@/lib/audit.server";
import { createNotificationForOrgMembers, createEmployeeNotification } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { RiskLevel } from "@prisma/client";
import { ensureDefaultWorkflowTemplate } from "./workflows";
import { HIGH_RISK_ADDITIONAL_TASKS } from "@/lib/workflow-constants";
import { checkOffboardingCompletion } from "@/lib/security-policies";

export async function createOffboarding(formData: FormData) {
  const session = await requireActiveOrg();
  
  enforceAuditorReadOnly(session, "create_offboarding");
  enforceContributorTasksOnly(session, "offboarding");
  
  await requirePermission(session, "offboarding:create");

  const orgId = session.currentOrgId!;
  const employeeId = formData.get("employeeId") as string;
  const scheduledDate = formData.get("scheduledDate") as string;
  const reason = formData.get("reason") as string;
  const notes = formData.get("notes") as string;
  const riskLevel = (formData.get("riskLevel") as RiskLevel) || "NORMAL";
  const riskReason = formData.get("riskReason") as string;
  const workflowTemplateId = formData.get("workflowTemplateId") as string;

  if (!employeeId) {
    return { error: "Employee is required" };
  }

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, organizationId: orgId },
  });

  if (!employee) {
    return { error: "Employee not found" };
  }

  if (employee.status === "ARCHIVED") {
    return { error: "Cannot start offboarding for archived employee" };
  }

  const existingActive = await prisma.offboarding.findFirst({
    where: {
      employeeId,
      status: { in: ["PENDING", "IN_PROGRESS", "PENDING_APPROVAL"] },
    },
  });

  if (existingActive) {
    return { error: "An active offboarding already exists for this employee" };
  }

  let template = workflowTemplateId 
    ? await prisma.workflowTemplate.findFirst({
        where: { id: workflowTemplateId, organizationId: orgId, isActive: true },
        include: { tasks: { orderBy: { order: "asc" } } },
      })
    : await ensureDefaultWorkflowTemplate(orgId);

  if (!template) {
    template = await ensureDefaultWorkflowTemplate(orgId);
  }

  const templateWithTasks = template as any;
  const templateTasks = templateWithTasks.tasks || [];
  const allTasks = [...templateTasks];

  if (riskLevel === "HIGH" || riskLevel === "CRITICAL") {
    allTasks.unshift(...HIGH_RISK_ADDITIONAL_TASKS.map((t) => ({
      ...t,
      name: t.name,
      description: t.description || null,
      category: t.category || null,
      defaultDueDays: t.defaultDueDays ?? null,
      requiresApproval: t.requiresApproval || false,
      isHighRiskTask: t.isHighRiskTask || false,
      isEmployeeRequired: t.isEmployeeRequired || false,
      evidenceRequirement: (t as any).evidenceRequirement || "NONE",
    })));
  }

  const dueDate = scheduledDate ? new Date(scheduledDate) : null;
  
  const offboarding = await prisma.offboarding.create({
    data: {
      employeeId,
      organizationId: orgId,
      scheduledDate: dueDate,
      reason,
      notes,
      status: riskLevel === "HIGH" || riskLevel === "CRITICAL" ? "PENDING_APPROVAL" : "PENDING",
      riskLevel,
      riskReason: riskLevel !== "NORMAL" ? riskReason : null,
      riskAssessedAt: riskLevel !== "NORMAL" ? new Date() : null,
      riskAssessedBy: riskLevel !== "NORMAL" ? session.user.id : null,
      workflowTemplateId: template.id,
      templateVersionUsed: {
        templateId: template.id,
        templateName: template.name,
        version: template.version,
        tasks: templateTasks.map((t: { name: string; category: string | null; isEmployeeRequired: boolean }) => ({ 
          name: t.name, 
          category: t.category,
          isEmployeeRequired: t.isEmployeeRequired 
        })),
      },
      tasks: {
        create: allTasks.map((task, index) => ({
          name: task.name,
          description: task.description,
          category: task.category,
          status: "PENDING",
          order: index,
          dueDate: task.defaultDueDays && dueDate
            ? new Date(dueDate.getTime() + task.defaultDueDays * 24 * 60 * 60 * 1000)
            : dueDate,
          requiresApproval: task.requiresApproval || false,
          isHighRiskTask: task.isHighRiskTask || false,
          isEmployeeRequired: task.isEmployeeRequired || false,
          assignedToEmployeeId: task.isEmployeeRequired ? employeeId : null,
          evidenceRequirement: task.evidenceRequirement || "NONE",
        })),
      },
    },
    include: { employee: true, tasks: true },
  });

  const employeeAssets = await prisma.asset.findMany({
    where: { employeeId, organizationId: orgId },
  });

  if (employeeAssets.length > 0) {
    await prisma.assetReturn.createMany({
      data: employeeAssets.map(asset => ({
        offboardingId: offboarding.id,
        assetId: asset.id,
        status: "PENDING",
      })),
    });

    await prisma.asset.updateMany({
      where: { id: { in: employeeAssets.map(a => a.id) } },
      data: { status: "PENDING_RETURN" },
    });
  }

  if (riskLevel === "HIGH" || riskLevel === "CRITICAL") {
    const requiredApprovers = riskLevel === "CRITICAL" ? 3 : 2;
    await prisma.approval.createMany({
      data: Array.from({ length: requiredApprovers }, (_, i) => ({
        offboardingId: offboarding.id,
        type: "HIGH_RISK",
        requiredCount: 1,
        approvalOrder: i,
        status: "PENDING",
      })),
    });
  }

  await prisma.employee.update({
    where: { id: employeeId },
    data: { status: "OFFBOARDING" },
  });

  await createAuditLog(session, orgId, {
    action: "offboarding.created",
    entityType: "Offboarding",
    entityId: offboarding.id,
    newData: {
      employeeName: `${employee.firstName} ${employee.lastName}`,
      scheduledDate,
      reason,
      riskLevel,
      templateName: template.name,
    },
  });

  await createNotificationForOrgMembers(
    orgId,
    session.user.id,
    "offboarding_started",
    riskLevel === "CRITICAL" 
      ? "CRITICAL: High-Risk Offboarding Started" 
      : riskLevel === "HIGH"
      ? "High-Risk Offboarding Started"
      : "Offboarding Started",
    `${employee.firstName} ${employee.lastName} offboarding has been initiated${riskLevel !== "NORMAL" ? ` (${riskLevel} RISK)` : ""}`,
    `/app/offboardings/${offboarding.id}`,
    employeeId
  );

  const employeeAssignedTasks = offboarding.tasks.filter(t => t.assignedToEmployeeId === employeeId);
  if (employeeAssignedTasks.length > 0) {
    await createEmployeeNotification(
      orgId,
      employeeId,
      "task_assigned",
      "Your Offboarding Has Started",
      `You have ${employeeAssignedTasks.length} task${employeeAssignedTasks.length > 1 ? "s" : ""} to complete during your offboarding.`,
      "/app/employee/tasks"
    );
  }

  const { invalidateOrgCache, refreshAnalyticsSnapshot } = await import("@/lib/cache.server");
  invalidateOrgCache(orgId);
  refreshAnalyticsSnapshot(orgId).catch(() => {});

  revalidatePath("/app/offboardings");
  revalidatePath("/app/employees");
  return { success: true, offboarding };
}

export async function updateOffboarding(offboardingId: string, formData: FormData) {
  const session = await requireActiveOrg();
  
  enforceAuditorReadOnly(session, "update_offboarding");
  enforceContributorTasksOnly(session, "offboarding");
  
  await requirePermission(session, "offboarding:update");

  const orgId = session.currentOrgId!;

  await enforceSubjectCannotSelfExecute(session, offboardingId);

  const offboarding = await prisma.offboarding.findFirst({
    where: { id: offboardingId, organizationId: orgId },
  });

  if (!offboarding) {
    return { error: "Offboarding not found" };
  }

  const data = {
    scheduledDate: formData.get("scheduledDate") ? new Date(formData.get("scheduledDate") as string) : offboarding.scheduledDate,
    reason: formData.get("reason") as string || offboarding.reason,
    notes: formData.get("notes") as string || offboarding.notes,
    status: formData.get("status") as "PENDING" | "IN_PROGRESS" | "PENDING_APPROVAL" | "COMPLETED" | "CANCELLED" || offboarding.status,
  };

  if (data.status === "COMPLETED") {
    const policyCheck = await checkOffboardingCompletion(
      orgId,
      offboardingId,
      offboarding.employeeId
    );

    if (!policyCheck.allowed) {
      const violationMessages = policyCheck.violations.map(v => `${v.policyName}: ${v.violation}`);
      return { 
        error: "Policy violations prevent completion",
        violations: policyCheck.violations,
        message: violationMessages.join("; ")
      };
    }

    if (!offboarding.completedDate) {
      (data as Record<string, unknown>).completedDate = new Date();
    }
  }

  const updated = await prisma.offboarding.update({
    where: { id: offboardingId },
    data,
  });

  if (data.status === "COMPLETED" || data.status === "CANCELLED") {
    await prisma.employee.update({
      where: { id: offboarding.employeeId },
      data: { status: data.status === "COMPLETED" ? "TERMINATED" : "ACTIVE" },
    });
  }

    await createAuditLog(session, orgId, {
      action: data.status === "COMPLETED" ? "offboarding.completed" : "offboarding.updated",
      entityType: "Offboarding",
      entityId: offboardingId,
      oldData: { status: offboarding.status },
      newData: { status: data.status },
    });

    if (data.status === "COMPLETED" && offboarding.status !== "COMPLETED") {
      const employee = await prisma.employee.findUnique({
        where: { id: offboarding.employeeId },
        select: { firstName: true, lastName: true },
      });

      await createNotificationForOrgMembers(
        orgId,
        session.user.id,
        "offboarding_completed",
        "Offboarding Completed",
        `${employee?.firstName} ${employee?.lastName}'s offboarding has been completed.`,
        `/app/offboardings/${offboardingId}`,
        offboarding.employeeId
      );
    }


  const { invalidateOrgCache, refreshAnalyticsSnapshot } = await import("@/lib/cache.server");
  invalidateOrgCache(orgId);
  if (data.status === "COMPLETED" || data.status === "CANCELLED") {
    refreshAnalyticsSnapshot(orgId).catch(() => {});
  }

  revalidatePath("/app/offboardings");
  revalidatePath(`/app/offboardings/${offboardingId}`);
  return { success: true, offboarding: updated };
}

export async function updateOffboardingRisk(
  offboardingId: string, 
  riskLevel: RiskLevel, 
  riskReason: string
) {
  const session = await requireActiveOrg();
  
  enforceAuditorReadOnly(session, "update_offboarding_risk");
  enforceContributorTasksOnly(session, "offboarding");
  
  await requirePermission(session, "offboarding:update");

  const orgId = session.currentOrgId!;

  await enforceSubjectCannotSelfExecute(session, offboardingId);

  const offboarding = await prisma.offboarding.findFirst({
    where: { id: offboardingId, organizationId: orgId },
    include: { employee: true },
  });

  if (!offboarding) {
    return { error: "Offboarding not found" };
  }

  const oldRiskLevel = offboarding.riskLevel;

  const updated = await prisma.offboarding.update({
    where: { id: offboardingId },
    data: {
      riskLevel,
      riskReason,
      riskAssessedAt: new Date(),
      riskAssessedBy: session.user.id,
      status: (riskLevel === "HIGH" || riskLevel === "CRITICAL") && offboarding.status === "PENDING" 
        ? "PENDING_APPROVAL" 
        : offboarding.status,
    },
  });

  if ((riskLevel === "HIGH" || riskLevel === "CRITICAL") && oldRiskLevel === "NORMAL") {
    const requiredApprovers = riskLevel === "CRITICAL" ? 3 : 2;
    await prisma.approval.createMany({
      data: Array.from({ length: requiredApprovers }, (_, i) => ({
        offboardingId,
        type: "HIGH_RISK",
        requiredCount: 1,
        approvalOrder: i,
        status: "PENDING",
      })),
    });

    const existingTasks = await prisma.offboardingTask.findMany({
      where: { offboardingId },
      orderBy: { order: "asc" },
    });

    const highRiskTaskNames = HIGH_RISK_ADDITIONAL_TASKS.map(t => t.name);
    const hasHighRiskTasks = existingTasks.some(t => highRiskTaskNames.includes(t.name));

    if (!hasHighRiskTasks) {
      await prisma.offboardingTask.createMany({
        data: HIGH_RISK_ADDITIONAL_TASKS.map((task, index) => ({
          offboardingId,
          name: task.name,
          description: task.description,
          category: task.category,
          status: "PENDING",
          order: index,
          dueDate: offboarding.scheduledDate 
            ? new Date(offboarding.scheduledDate.getTime() + (task.defaultDueDays || 0) * 24 * 60 * 60 * 1000)
            : null,
          requiresApproval: task.requiresApproval || false,
          isHighRiskTask: true,
        })),
      });
    }
  }

  await createAuditLog(session, orgId, {
    action: "offboarding.risk_updated" as any,
    entityType: "Offboarding",
    entityId: offboardingId,
    oldData: { riskLevel: oldRiskLevel },
    newData: { riskLevel, riskReason },
  });

  if (riskLevel !== oldRiskLevel) {
      await createNotificationForOrgMembers(
        orgId,
        session.user.id,
        "risk_level_changed",
        `Risk Level Changed to ${riskLevel}`,
        `${offboarding.employee.firstName} ${offboarding.employee.lastName}'s offboarding is now ${riskLevel} risk`,
        `/app/offboardings/${offboardingId}`,
        offboarding.employeeId
      );
    }

  revalidatePath(`/app/offboardings/${offboardingId}`);
  return { success: true, offboarding: updated };
}

export async function updateOffboardingTask(taskId: string, status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED" | "BLOCKED") {
  const session = await requireActiveOrg();
  
  enforceAuditorReadOnly(session, "update_task");

  const orgId = session.currentOrgId!;

  const task = await prisma.offboardingTask.findUnique({
    where: { id: taskId },
    include: { 
      offboarding: { include: { employee: true } },
      approvals: { where: { status: "PENDING" } },
      evidence: true,
    },
  });

  if (!task || task.offboarding.organizationId !== orgId) {
    return { error: "Task not found" };
  }

  const { isUserOffboardingSubject, getUserLinkedEmployeeId } = await import("@/lib/rbac.server");
  const isSubject = await isUserOffboardingSubject(session.user.id, orgId, task.offboardingId);
  
  if (task.isEmployeeRequired && status === "COMPLETED") {
    if (!isSubject) {
      return { 
        error: "INVARIANT: This task is assigned to the employee and can only be completed by them through the Employee Portal." 
      };
    }
  }
  
  if (isSubject) {
    if (!task.isEmployeeRequired) {
      return { error: "INVARIANT: Subjects can only complete tasks marked as 'Employee Required'" };
    }
  } else {
    if (!isContributor(session)) {
      await requirePermission(session, "offboarding:update");
    } else {
      if (task.assignedToUserId !== session.user.id) {
        return { error: "INVARIANT: Contributors can only complete tasks assigned to them" };
      }
    }
  }

  if (task.requiresApproval && status === "COMPLETED" && task.approvals.length > 0) {
    return { error: "This task requires approval before it can be completed" };
  }

  if (status === "COMPLETED" && task.evidenceRequirement === "REQUIRED") {
    if (task.evidence.length === 0) {
      return { error: "Evidence required for compliance. Please attach at least one evidence item before completing this task." };
    }
  }

  const updated = await prisma.offboardingTask.update({
    where: { id: taskId },
    data: {
      status,
      completedAt: status === "COMPLETED" ? new Date() : null,
      completedBy: status === "COMPLETED" ? session.user.id : null,
      isVerified: status === "COMPLETED" ? !task.isEmployeeRequired : false, // Auto-verify if admin completes it (non-employee task)
    },
  });

  if (status === "COMPLETED") {
    await prisma.taskEvidence.updateMany({
      where: { taskId, isImmutable: false },
      data: {
        isImmutable: true,
        immutableAt: new Date(),
      },
    });
  }

  const allTasks = await prisma.offboardingTask.findMany({
    where: { offboardingId: task.offboardingId },
  });

  const assetReturns = await prisma.assetReturn.findMany({
    where: { offboardingId: task.offboardingId },
  });

  const allAssetsResolved = assetReturns.every(ar => 
    ar.status === "RETURNED" || ar.status === "MISSING" || ar.status === "VERIFIED" || ar.status === "DAMAGED"
  );

  const completedCount = allTasks.filter((t) => t.status === "COMPLETED" || t.status === "SKIPPED").length;
  const inProgressCount = allTasks.filter((t) => t.status === "IN_PROGRESS").length;

  let offboardingStatus: "PENDING" | "IN_PROGRESS" | "PENDING_APPROVAL" | "COMPLETED" = task.offboarding.status as any;
    
  if (completedCount === allTasks.length && allAssetsResolved) {
    const policyCheck = await checkOffboardingCompletion(
      orgId,
      task.offboardingId,
      task.offboarding.employeeId
    );
    
    if (policyCheck.allowed) {
      offboardingStatus = "COMPLETED";
    } else {
      offboardingStatus = "PENDING_APPROVAL";
    }
  } else if (completedCount > 0 || inProgressCount > 0) {
    if (task.offboarding.status !== "PENDING_APPROVAL") {
      offboardingStatus = "IN_PROGRESS";
    }
  }

  if (task.offboarding.status !== offboardingStatus) {
    await prisma.offboarding.update({
      where: { id: task.offboardingId },
      data: {
        status: offboardingStatus,
        completedDate: offboardingStatus === "COMPLETED" ? new Date() : null,
      },
    });

    if (offboardingStatus === "COMPLETED") {
      await prisma.employee.update({
        where: { id: task.offboarding.employeeId },
        data: { status: "TERMINATED" },
      });

      await createNotificationForOrgMembers(
        orgId,
        session.user.id,
        "offboarding_completed",
        "Offboarding Completed",
        `${task.offboarding.employee.firstName} ${task.offboarding.employee.lastName}'s offboarding has been completed.`,
        `/app/offboardings/${task.offboardingId}`,
        task.offboarding.employeeId
      );
    }
  }

  await createAuditLog(session, orgId, {
    action: "task.completed",
    entityType: "OffboardingTask",
    entityId: taskId,
    newData: { taskName: task.name, status },
  });

  if (status === "COMPLETED") {
      await createNotificationForOrgMembers(
        orgId,
        session.user.id,
        "task_completed",
        "Task Completed",
        `"${task.name}" completed for ${task.offboarding.employee.firstName} ${task.offboarding.employee.lastName}`,
        `/app/offboardings/${task.offboardingId}`,
        task.offboarding.employeeId
      );
    }

  const { invalidateOrgCache, refreshAnalyticsSnapshot } = await import("@/lib/cache.server");
  invalidateOrgCache(orgId);
  if (offboardingStatus === "COMPLETED") {
    refreshAnalyticsSnapshot(orgId).catch(() => {});
  }

  revalidatePath(`/app/offboardings/${task.offboardingId}`);
  return { success: true, task: updated };
}

export async function cancelOffboarding(offboardingId: string) {
  const session = await requireActiveOrg();
  
  enforceAuditorReadOnly(session, "cancel_offboarding");
  enforceContributorTasksOnly(session, "offboarding");
  
  await requirePermission(session, "offboarding:delete");

  const orgId = session.currentOrgId!;

  await enforceSubjectCannotSelfExecute(session, offboardingId);

  const offboarding = await prisma.offboarding.findFirst({
    where: { id: offboardingId, organizationId: orgId },
    include: { employee: true, assetReturns: true },
  });

  if (!offboarding) {
    return { error: "Offboarding not found" };
  }

  await prisma.offboarding.update({
    where: { id: offboardingId },
    data: { status: "CANCELLED" },
  });

  await prisma.employee.update({
    where: { id: offboarding.employeeId },
    data: { status: "ACTIVE" },
  });

  if (offboarding.assetReturns.length > 0) {
    await prisma.asset.updateMany({
      where: { id: { in: offboarding.assetReturns.map(ar => ar.assetId) } },
      data: { status: "ASSIGNED" },
    });
  }

  await createAuditLog(session, orgId, {
    action: "offboarding.cancelled",
    entityType: "Offboarding",
    entityId: offboardingId,
    oldData: { employeeName: `${offboarding.employee.firstName} ${offboarding.employee.lastName}` },
  });

  const { invalidateOrgCache, refreshAnalyticsSnapshot } = await import("@/lib/cache.server");
  invalidateOrgCache(orgId);
  refreshAnalyticsSnapshot(orgId).catch(() => {});

  revalidatePath("/app/offboardings");
  return { success: true };
}

export async function getOffboardings(options?: { status?: string; riskLevel?: string }) {
  const session = await requireActiveOrg();
  await requirePermission(session, "offboarding:read");

  const orgId = session.currentOrgId!;
  
  const { getExcludedOffboardingIdsForUser } = await import("@/lib/rbac.server");
  const excludedIds = await getExcludedOffboardingIdsForUser(session.user.id, orgId);
  
  const where: Record<string, unknown> = { 
    organizationId: orgId,
    id: { notIn: excludedIds },
  };

  if (options?.status && options.status !== "all") {
    where.status = options.status;
  }
  if (options?.riskLevel && options.riskLevel !== "all") {
    where.riskLevel = options.riskLevel;
  }

  return prisma.offboarding.findMany({
    where,
    include: {
      employee: {
        include: {
          department: true,
          jobTitle: true,
        },
      },
      tasks: { orderBy: { order: "asc" } },
      approvals: { where: { status: "PENDING" } },
      assetReturns: { include: { asset: true } },
      _count: { 
        select: { 
          tasks: true, 
          approvals: true,
          assetReturns: true,
          monitoringEvents: true,
        } 
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOffboarding(offboardingId: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "offboarding:read");

  const orgId = session.currentOrgId!;
  
  const { isUserOffboardingSubject } = await import("@/lib/rbac.server");
  const isSubject = await isUserOffboardingSubject(session.user.id, orgId, offboardingId);
  if (isSubject) {
    return null;
  }

  return prisma.offboarding.findFirst({
    where: { id: offboardingId, organizationId: session.currentOrgId! },
    include: {
      employee: {
        include: {
          department: true,
          jobTitle: true,
          location: true,
          managerMembership: { select: { id: true, user: { select: { name: true, email: true } } } },
          assets: true,
        },
      },
      tasks: { 
        orderBy: { order: "asc" },
        include: {
          evidence: {
            orderBy: { createdAt: "asc" },
          },
        },
      },
      approvals: {
        include: {
          approver: { select: { id: true, name: true, email: true } },
          task: true,
        },
        orderBy: [{ approvalOrder: "asc" }, { createdAt: "asc" }],
      },
      assetReturns: { include: { asset: true } },
      evidencePack: true,
      monitoringEvents: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      workflowTemplate: true,
    },
  });
}

export async function getOffboardingAnalytics() {
  const session = await requireActiveOrg();
  await requirePermission(session, "offboarding:read");

  const { getAnalyticsSnapshot } = await import("@/lib/cache.server");
  return getAnalyticsSnapshot(session.currentOrgId!);
}
