import "server-only";
import { prisma } from "@/lib/prisma.server";
import { AuthSession } from "./auth";
import { PortalType } from "@prisma/client";

export type DerivedPortalMode = "SUBJECT_PORTAL" | "CONTRIBUTOR_PORTAL" | "NONE";

export interface PortalContext {
  portalMode: DerivedPortalMode;
  linkedEmployeeId: string | null;
  activeOffboardingId: string | null;
  assignedTaskIds: string[];
  isSubjectOfCase: (offboardingId: string) => boolean;
  subjectOffboardingIds: string[];
}

export async function getUserLinkedEmployee(
  userId: string,
  organizationId: string
): Promise<{ employeeId: string; portalType: PortalType } | null> {
  const link = await prisma.employeeUserLink.findFirst({
    where: {
      userId,
      organizationId,
      status: "VERIFIED",
    },
    select: {
      employeeId: true,
      portalType: true,
    },
  });
  return link;
}

export async function getActiveSubjectOffboardings(
  employeeId: string,
  organizationId: string
): Promise<string[]> {
  const offboardings = await prisma.offboarding.findMany({
    where: {
      employeeId,
      organizationId,
      status: { in: ["PENDING", "IN_PROGRESS", "PENDING_APPROVAL"] },
    },
    select: { id: true },
  });
  return offboardings.map((o) => o.id);
}

export async function getAssignedTasksForUser(
  userId: string,
  organizationId: string
): Promise<string[]> {
  const tasks = await prisma.offboardingTask.findMany({
    where: {
      assignedToUserId: userId,
      offboarding: { organizationId },
    },
    select: { id: true },
  });
  return tasks.map((t) => t.id);
}

export async function computePortalContext(
  session: AuthSession
): Promise<PortalContext> {
  const defaultContext: PortalContext = {
    portalMode: "NONE",
    linkedEmployeeId: null,
    activeOffboardingId: null,
    assignedTaskIds: [],
    isSubjectOfCase: () => false,
    subjectOffboardingIds: [],
  };

  if (!session.user?.id || !session.currentOrgId) {
    return defaultContext;
  }

  const userId = session.user.id;
  const organizationId = session.currentOrgId;

  const linkedEmployee = await getUserLinkedEmployee(userId, organizationId);

  if (!linkedEmployee) {
    return defaultContext;
  }

  const subjectOffboardingIds = await getActiveSubjectOffboardings(
    linkedEmployee.employeeId,
    organizationId
  );

  const assignedTaskIds = await getAssignedTasksForUser(userId, organizationId);

  let portalMode: DerivedPortalMode = "NONE";
  let activeOffboardingId: string | null = null;

  if (subjectOffboardingIds.length > 0) {
    portalMode = "SUBJECT_PORTAL";
    activeOffboardingId = subjectOffboardingIds[0];
  } else if (
    linkedEmployee.portalType === "CONTRIBUTOR_PORTAL" ||
    assignedTaskIds.length > 0
  ) {
    portalMode = "CONTRIBUTOR_PORTAL";
  }

  return {
    portalMode,
    linkedEmployeeId: linkedEmployee.employeeId,
    activeOffboardingId,
    assignedTaskIds,
    isSubjectOfCase: (offboardingId: string) =>
      subjectOffboardingIds.includes(offboardingId),
    subjectOffboardingIds,
  };
}

export async function getEmployeeRequiredTasksForSubject(
  userId: string,
  organizationId: string
): Promise<
  Array<{
    id: string;
    name: string;
    description: string | null;
    status: string;
    dueDate: Date | null;
    offboardingId: string;
  }>
> {
  const linkedEmployee = await getUserLinkedEmployee(userId, organizationId);
  if (!linkedEmployee) return [];

  const offboarding = await prisma.offboarding.findFirst({
    where: {
      employeeId: linkedEmployee.employeeId,
      organizationId,
      status: { in: ["PENDING", "IN_PROGRESS", "PENDING_APPROVAL"] },
    },
    select: { id: true },
  });

  if (!offboarding) return [];

  const tasks = await prisma.offboardingTask.findMany({
    where: {
      offboardingId: offboarding.id,
      isEmployeeRequired: true,
    },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      dueDate: true,
      offboardingId: true,
    },
    orderBy: { order: "asc" },
  });

  return tasks;
}

export async function getAssignedTasksForContributor(
  userId: string,
  organizationId: string
): Promise<
  Array<{
    id: string;
    name: string;
    description: string | null;
    status: string;
    dueDate: Date | null;
    offboardingId: string;
    subjectName: string;
  }>
> {
  const linkedEmployee = await getUserLinkedEmployee(userId, organizationId);

  const subjectOffboardingIds = linkedEmployee
    ? await getActiveSubjectOffboardings(
        linkedEmployee.employeeId,
        organizationId
      )
    : [];

  const tasks = await prisma.offboardingTask.findMany({
    where: {
      assignedToUserId: userId,
      offboarding: {
        organizationId,
        id: { notIn: subjectOffboardingIds },
      },
    },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      dueDate: true,
      offboardingId: true,
      offboarding: {
        select: {
          employee: {
            select: { firstName: true, lastName: true },
          },
        },
      },
    },
    orderBy: [{ dueDate: "asc" }, { order: "asc" }],
  });

  return tasks.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    status: t.status,
    dueDate: t.dueDate,
    offboardingId: t.offboardingId,
    subjectName: `${t.offboarding.employee.firstName} ${t.offboarding.employee.lastName}`,
  }));
}

export async function validateTaskCompletion(
  userId: string,
  organizationId: string,
  taskId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const task = await prisma.offboardingTask.findUnique({
    where: { id: taskId },
    include: {
      offboarding: {
        select: { id: true, employeeId: true, organizationId: true },
      },
    },
  });

  if (!task || task.offboarding.organizationId !== organizationId) {
    return { allowed: false, reason: "Task not found" };
  }

  const linkedEmployee = await getUserLinkedEmployee(userId, organizationId);
  const isSubject = linkedEmployee?.employeeId === task.offboarding.employeeId;

  if (isSubject) {
    if (task.isEmployeeRequired) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason:
        "INVARIANT: Subjects can only complete tasks marked as Employee Required",
    };
  }

  if (task.assignedToUserId === userId) {
    return { allowed: true };
  }

  return { allowed: true };
}
