"use server";

import { prisma } from "@/lib/prisma.server";
import { getAuthSession } from "@/lib/auth.server";
import { getEmployeePortalSession } from "@/lib/employee-auth.server";
import { revalidatePath } from "next/cache";
import { CommentAuthorType } from "@prisma/client";
import { createNotificationForOrgMembers, createEmployeeNotification } from "@/lib/notifications";
import { createAuditLog } from "@/lib/audit.server";

export async function getTaskComments(taskId: string) {
  // Try to get Org session first
  const orgSession = await getAuthSession();
  const employeeSession = await getEmployeePortalSession();

  if (!orgSession && !employeeSession) {
    throw new Error("Unauthorized");
  }

  const task = await prisma.offboardingTask.findUnique({
    where: { id: taskId },
    include: {
      offboarding: true,
    },
  });

  if (!task) {
    throw new Error("Task not found");
  }

  // Permission check
  if (orgSession) {
    const isPlatformAdmin = orgSession.user.isPlatformAdmin;
    const hasMembership = orgSession.memberships.some(m => m.organizationId === task.offboarding.organizationId);
    
    if (!isPlatformAdmin && !hasMembership) {
      throw new Error("Unauthorized: Organization mismatch");
    }
  } else if (employeeSession) {
    if (task.offboarding.employeeId !== employeeSession.employee.id) {
      throw new Error("Unauthorized: Employee mismatch");
    }
    // Employees can only see comments on their own required tasks
    if (!task.isEmployeeRequired || task.assignedToEmployeeId !== employeeSession.employee.id) {
      throw new Error("Unauthorized: Task not assigned to employee");
    }
  }

  return prisma.taskComment.findMany({
    where: { taskId },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
      employee: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function createTaskComment(taskId: string, content: string) {
  if (!content || content.trim().length === 0) {
    return { error: "Comment content cannot be empty" };
  }

  const orgSession = await getAuthSession();
  const employeeSession = await getEmployeePortalSession();

  if (!orgSession && !employeeSession) {
    throw new Error("Unauthorized");
  }

  const task = await prisma.offboardingTask.findUnique({
    where: { id: taskId },
    include: {
      offboarding: true,
    },
  });

  if (!task) {
    throw new Error("Task not found");
  }

  let authorType: CommentAuthorType;
  let userId: string | null = null;
  let employeeId: string | null = null;
  let authorName: string = "";

  // Permission check and author identification
  if (orgSession) {
    const isPlatformAdmin = orgSession.user.isPlatformAdmin;
    const hasMembership = orgSession.memberships.some(m => m.organizationId === task.offboarding.organizationId);

    if (!isPlatformAdmin && !hasMembership) {
      throw new Error("Unauthorized: Organization mismatch");
    }
    userId = orgSession.user.id;
    authorType = orgSession.user.isPlatformAdmin ? "ADMIN" : "ORG_USER";
    authorName = orgSession.user.name || orgSession.user.email;
  } else if (employeeSession) {
    if (task.offboarding.employeeId !== employeeSession.employee.id) {
      throw new Error("Unauthorized: Employee mismatch");
    }
    if (!task.isEmployeeRequired || task.assignedToEmployeeId !== employeeSession.employee.id) {
      throw new Error("Unauthorized: Cannot comment on this task");
    }
    employeeId = employeeSession.employee.id;
    authorType = "EMPLOYEE";
    authorName = `${employeeSession.employee.firstName} ${employeeSession.employee.lastName}`;
  } else {
    throw new Error("Unauthorized");
  }

  const comment = await prisma.taskComment.create({
    data: {
      taskId,
      content,
      authorType,
      userId,
      employeeId,
    },
    include: {
      user: true,
      employee: true,
    },
  });

  // Notifications
  if (authorType === "EMPLOYEE") {
    // Notify admins/org users
    await createNotificationForOrgMembers(
      task.offboarding.organizationId,
      "SYSTEM", // System notification
      "task_comment",
      "New Employee Comment",
      `${authorName} commented on task: ${task.name}`,
      `/app/offboardings/${task.offboardingId}?task=${taskId}`,
      task.offboarding.employeeId
    );
  } else {
    // Notify employee if it's their task
    if (task.isEmployeeRequired && task.assignedToEmployeeId) {
      await createEmployeeNotification(
        task.offboarding.organizationId,
        task.offboarding.employeeId,
        "task_comment",
        "New Admin Comment",
        `Admin commented on your task: ${task.name}`,
        "/app/employee/tasks"
      );
    }
  }

  // Audit Log (only for Org Users)
  if (orgSession) {
    await createAuditLog(orgSession, orgSession.currentOrgId!, {
      action: "task.comment_created" as any,
      entityType: "TaskComment",
      entityId: comment.id,
      metadata: {
        taskId,
        taskName: task.name,
        offboardingId: task.offboardingId,
      },
    });
  }

  revalidatePath(`/app/offboardings/${task.offboardingId}`);
  revalidatePath("/app/employee/tasks");

  return { success: true, comment };
}
