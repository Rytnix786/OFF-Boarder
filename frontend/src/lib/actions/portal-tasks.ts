"use server";

import { prisma } from "@/lib/prisma.server";
import { requireActiveOrg } from "@/lib/auth.server";
import { createAuditLog } from "@/lib/audit.server";
import { revalidatePath } from "next/cache";
import { 
  isUserOffboardingSubject, 
  getUserLinkedEmployeeId,
  enforceAuditorReadOnly,
  InvariantViolationError
} from "@/lib/rbac.server";
import { validateTaskCompletion } from "@/lib/portal-context.server";

export async function completePortalTask(taskId: string) {
  try {
    const session = await requireActiveOrg();
    const userId = session.user.id;
    const orgId = session.currentOrgId!;

    enforceAuditorReadOnly(session, "complete_portal_task");

    const task = await prisma.offboardingTask.findUnique({
      where: { id: taskId },
      include: {
        offboarding: {
          select: { 
            id: true, 
            employeeId: true, 
            organizationId: true,
            employee: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!task || task.offboarding.organizationId !== orgId) {
      return { error: "Task not found" };
    }

    if (task.status === "COMPLETED") {
      return { error: "Task is already completed" };
    }

    const validation = await validateTaskCompletion(userId, orgId, taskId);
    if (!validation.allowed) {
      await createAuditLog({
        action: "portal_task_completion_blocked",
        entityType: "offboarding_task",
        entityId: taskId,
        organizationId: orgId,
        userId: userId,
        metadata: {
          reason: validation.reason,
          taskName: task.name,
          offboardingId: task.offboardingId,
        },
      });
      return { error: validation.reason };
    }

    const isSubject = await isUserOffboardingSubject(userId, orgId, task.offboardingId);
    
    if (task.isEmployeeRequired && !isSubject) {
      return { 
        error: "This task must be completed by the employee being offboarded." 
      };
    }

    if (isSubject && !task.isEmployeeRequired) {
      return { 
        error: "INVARIANT: As the offboarding subject, you can only complete tasks marked as 'Employee Required'" 
      };
    }

    if (!isSubject && task.assignedToUserId && task.assignedToUserId !== userId) {
      const membership = session.currentMembership;
      if (membership?.systemRole === "CONTRIBUTOR") {
        return { 
          error: "INVARIANT: Contributors can only complete tasks assigned to them" 
        };
      }
    }

    const updatedTask = await prisma.offboardingTask.update({
      where: { id: taskId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        completedBy: userId,
        isVerified: !task.isEmployeeRequired, // Auto-verify if employee not required (admin task)
      },
    });

    await createAuditLog({
      action: "portal_task_completed",
      entityType: "offboarding_task",
      entityId: taskId,
      organizationId: orgId,
      userId: userId,
      metadata: {
        taskName: task.name,
        offboardingId: task.offboardingId,
        subjectName: `${task.offboarding.employee.firstName} ${task.offboarding.employee.lastName}`,
        isSubject,
        isEmployeeRequired: task.isEmployeeRequired,
        autoVerified: !task.isEmployeeRequired,
      },
    });

    revalidatePath("/app/portal");
    revalidatePath(`/app/offboardings/${task.offboardingId}`);

    return { success: true, task: updatedTask };
  } catch (error) {
    console.error("Task completion error:", error);
    return { error: "Failed to complete task" };
  }
}

export async function verifyPortalTask(taskId: string) {
  try {
    const session = await requireActiveOrg();
    const userId = session.user.id;
    const orgId = session.currentOrgId!;

    const membership = session.currentMembership;
    if (membership?.systemRole !== "OWNER" && membership?.systemRole !== "ADMIN") {
      return { error: "Only administrators can verify tasks" };
    }

    const task = await prisma.offboardingTask.findUnique({
      where: { id: taskId },
      include: {
        offboarding: {
          select: { 
            organizationId: true,
            employee: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!task || task.offboarding.organizationId !== orgId) {
      return { error: "Task not found" };
    }

    if (task.status !== "COMPLETED") {
      return { error: "Task must be completed before verification" };
    }

    if (task.isVerified) {
      return { error: "Task is already verified" };
    }

    const updatedTask = await prisma.offboardingTask.update({
      where: { id: taskId },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        verifiedByUserId: userId,
      },
    });

    await createAuditLog({
      action: "portal_task_verified",
      entityType: "offboarding_task",
      entityId: taskId,
      organizationId: orgId,
      userId: userId,
      metadata: {
        taskName: task.name,
        offboardingId: task.offboardingId,
        subjectName: `${task.offboarding.employee.firstName} ${task.offboarding.employee.lastName}`,
      },
    });

    revalidatePath("/app/portal");
    revalidatePath(`/app/offboardings/${task.offboardingId}`);

    return { success: true, task: updatedTask };
  } catch (error) {
    console.error("Task verification error:", error);
    return { error: "Failed to verify task" };
  }
}


export async function getMyPortalTasks() {
  const session = await requireActiveOrg();
  const userId = session.user.id;
  const orgId = session.currentOrgId!;

  const linkedEmployeeId = await getUserLinkedEmployeeId(userId, orgId);
  
  const subjectOffboarding = linkedEmployeeId 
    ? await prisma.offboarding.findFirst({
        where: {
          employeeId: linkedEmployeeId,
          organizationId: orgId,
          status: { in: ["PENDING", "IN_PROGRESS", "PENDING_APPROVAL"] },
        },
        select: { id: true },
      })
    : null;

  const subjectTasks = subjectOffboarding
    ? await prisma.offboardingTask.findMany({
        where: {
          offboardingId: subjectOffboarding.id,
          isEmployeeRequired: true,
        },
        orderBy: [{ status: "asc" }, { dueDate: "asc" }],
      })
    : [];

  const subjectOffboardingIds = subjectOffboarding ? [subjectOffboarding.id] : [];
  
  const assignedTasks = await prisma.offboardingTask.findMany({
    where: {
      assignedToUserId: userId,
      offboarding: {
        organizationId: orgId,
        id: { notIn: subjectOffboardingIds },
      },
    },
    include: {
      offboarding: {
        select: {
          employee: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });

  return {
    subjectTasks,
    assignedTasks: assignedTasks.map(t => ({
      ...t,
      subjectName: `${t.offboarding.employee.firstName} ${t.offboarding.employee.lastName}`,
    })),
    isSubject: !!subjectOffboarding,
  };
}
