"use server";

import { prisma } from "@/lib/prisma.server";
import { getAnySession } from "@/lib/session.server";
import { revalidatePath } from "next/cache";
import { CommentAuthorType } from "@prisma/client";
import { createNotificationForOrgMembers, createEmployeeNotification } from "@/lib/notifications";
import { createAuditLog } from "@/lib/audit.server";

export async function getTaskComments(taskId: string) {
  try {
    // Add a safety timeout for the entire operation
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Request timed out")), 10000)
    );

    const actionPromise = (async () => {
      const { orgSession, employeeSession } = await getAnySession();

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

      let hasAccess = false;

      // 1. Check Org Access
      if (orgSession) {
        const isPlatformAdmin = !!orgSession.user.isPlatformAdmin;
        const hasMembership = orgSession.memberships.some(m => m.organizationId === task.offboarding.organizationId);
        if (isPlatformAdmin || hasMembership) {
          hasAccess = true;
        }
      }

      // 2. Check Employee Access
      if (!hasAccess && employeeSession) {
        const isOwnOffboarding = task.offboarding.employeeId === employeeSession.employee.id;
        const isAssignedToEmployee = task.isEmployeeRequired && task.assignedToEmployeeId === employeeSession.employee.id;
        
        if (isOwnOffboarding && isAssignedToEmployee) {
          hasAccess = true;
        }
      }

      if (!hasAccess) {
        throw new Error("Unauthorized: You do not have permission to view these comments");
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
    })();

    return await Promise.race([actionPromise, timeoutPromise]) as any;
  } catch (error: any) {
    console.error("Error in getTaskComments:", error);
    throw error;
  }
}

export async function createTaskComment(taskId: string, content: string) {
  if (!content || content.trim().length === 0) {
    return { error: "Comment content cannot be empty" };
  }

  const { orgSession, employeeSession } = await getAnySession();

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

  let authorType: CommentAuthorType = "ORG_USER";
  let userId: string | null = null;
  let employeeId: string | null = null;
  let authorName: string = "";
  let hasAccess = false;

  // Identify author and check access
  if (employeeSession && task.offboarding.employeeId === employeeSession.employee.id && task.assignedToEmployeeId === employeeSession.employee.id) {
    employeeId = employeeSession.employee.id;
    authorType = "EMPLOYEE";
    authorName = `${employeeSession.employee.firstName} ${employeeSession.employee.lastName}`;
    hasAccess = true;
  } else if (orgSession) {
    const isPlatformAdmin = !!orgSession.user.isPlatformAdmin;
    const hasMembership = orgSession.memberships.some(m => m.organizationId === task.offboarding.organizationId);

    if (isPlatformAdmin || hasMembership) {
      userId = orgSession.user.id;
      authorType = isPlatformAdmin ? "ADMIN" : "ORG_USER";
      authorName = orgSession.user.name || orgSession.user.email;
      hasAccess = true;
    }
  }

  if (!hasAccess) {
    throw new Error("Unauthorized: You do not have permission to comment on this task");
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

  // Background operations (notifications & audit)
  // Note: We don't necessarily need to await all of these if they are non-critical for the user response,
  // but for consistency we'll keep them as is or use Promise.all.
  const backgroundTasks = [];

  if (authorType === "EMPLOYEE") {
    backgroundTasks.push(createNotificationForOrgMembers(
      task.offboarding.organizationId,
      "SYSTEM",
      "task_comment",
      "New Employee Comment",
      `${authorName} commented on task: ${task.name}`,
      `/app/offboardings/${task.offboardingId}?task=${taskId}`,
      task.offboarding.employeeId
    ));
  } else if (task.isEmployeeRequired && task.assignedToEmployeeId) {
    backgroundTasks.push(createEmployeeNotification(
      task.offboarding.organizationId,
      task.offboarding.employeeId,
      "task_comment",
      "New Admin Comment",
      `Admin commented on your task: ${task.name}`,
      "/app/employee/tasks"
    ));
  }

  if (orgSession) {
    backgroundTasks.push(createAuditLog(orgSession, orgSession.currentOrgId!, {
      action: "task.comment_created" as any,
      entityType: "TaskComment",
      entityId: comment.id,
      metadata: { taskId, taskName: task.name, offboardingId: task.offboardingId },
    }));
  }

  await Promise.allSettled(backgroundTasks);

  // Targeted revalidation
  revalidatePath(`/app/offboardings/${task.offboardingId}`);
  
  return { success: true, comment };
}
