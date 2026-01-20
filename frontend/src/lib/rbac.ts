import "server-only";
import { prisma } from "@/lib/prisma";
import { SystemRole, PortalType } from "@prisma/client";
import { AuthSession } from "./auth";
import { PermissionCode, getSystemRolePermissions } from "./permissions";
import { createAuditLog } from "./audit";

export type { PermissionCode } from "./permissions";
export { getSystemRolePermissions } from "./permissions";

export type PortalMode = "SUBJECT_PORTAL" | "CONTRIBUTOR_PORTAL" | null;

export type UserContext = {
  userId: string;
  organizationId: string;
  systemRole: SystemRole;
  portalMode: PortalMode;
  linkedEmployeeId: string | null;
  portalType: PortalType | null;
};

export async function getUserPermissions(session: AuthSession): Promise<PermissionCode[]> {
  if (!session.currentMembership) return [];

  const systemPerms = getSystemRolePermissions(session.currentMembership.systemRole);

  const customAssignments = await prisma.membershipRoleAssignment.findMany({
    where: { membershipId: session.currentMembership.id },
    include: {
      customRole: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  });

  const customPerms = customAssignments.flatMap((a) =>
    a.customRole.permissions.map((p) => p.permission.code as PermissionCode)
  );

  return [...new Set([...systemPerms, ...customPerms])];
}

export async function hasPermission(session: AuthSession, permission: PermissionCode): Promise<boolean> {
  const permissions = await getUserPermissions(session);
  return permissions.includes(permission);
}

export async function hasAnyPermission(session: AuthSession, permissions: PermissionCode[]): Promise<boolean> {
  const userPerms = await getUserPermissions(session);
  return permissions.some((p) => userPerms.includes(p));
}

export async function hasAllPermissions(session: AuthSession, permissions: PermissionCode[]): Promise<boolean> {
  const userPerms = await getUserPermissions(session);
  return permissions.every((p) => userPerms.includes(p));
}

export function isOwner(session: AuthSession): boolean {
  return session.currentMembership?.systemRole === "OWNER";
}

export function isAdmin(session: AuthSession): boolean {
  const role = session.currentMembership?.systemRole;
  return role === "OWNER" || role === "ADMIN";
}

export function isAdminOrAbove(session: AuthSession): boolean {
  return isAdmin(session);
}

export function isAuditor(session: AuthSession): boolean {
  return session.currentMembership?.systemRole === "AUDITOR";
}

export function isContributor(session: AuthSession): boolean {
  return session.currentMembership?.systemRole === "CONTRIBUTOR";
}

export class PermissionDeniedError extends Error {
  constructor(permission: PermissionCode | string) {
    super(`Permission denied: ${permission}`);
    this.name = "PermissionDeniedError";
  }
}

export class InvariantViolationError extends Error {
  public code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "InvariantViolationError";
    this.code = code;
  }
}

export async function requirePermission(session: AuthSession, permission: PermissionCode): Promise<void> {
  const has = await hasPermission(session, permission);
  if (!has) throw new PermissionDeniedError(permission);
}

export async function requireAnyPermission(session: AuthSession, permissions: PermissionCode[]): Promise<void> {
  const has = await hasAnyPermission(session, permissions);
  if (!has) throw new PermissionDeniedError(permissions[0]);
}

export function requireRole(session: AuthSession, roles: SystemRole[]): void {
  if (!session.currentMembership) {
    throw new PermissionDeniedError("org:read");
  }
  if (!roles.includes(session.currentMembership.systemRole)) {
    throw new PermissionDeniedError("org:read");
  }
}

export function requireOwnerOrAdmin(session: AuthSession): void {
  requireRole(session, ["OWNER", "ADMIN"]);
}

export function requireNotAuditor(session: AuthSession): void {
  if (session.currentMembership?.systemRole === "AUDITOR") {
    throw new PermissionDeniedError("Auditors cannot perform this action");
  }
}

export async function getUserLinkedEmployeeId(userId: string, organizationId: string): Promise<string | null> {
  const link = await prisma.employeeUserLink.findFirst({
    where: {
      userId,
      organizationId,
      status: "VERIFIED",
    },
    select: { employeeId: true },
  });
  return link?.employeeId || null;
}

export async function getUserPortalType(userId: string, organizationId: string): Promise<PortalType | null> {
  const link = await prisma.employeeUserLink.findFirst({
    where: {
      userId,
      organizationId,
      status: "VERIFIED",
    },
    select: { portalType: true },
  });
  return link?.portalType || null;
}

export async function getUserContext(session: AuthSession): Promise<UserContext | null> {
  if (!session.currentMembership || !session.currentOrgId) return null;
  
  const userId = session.user.id;
  const organizationId = session.currentOrgId;
  const systemRole = session.currentMembership.systemRole;
  
  const link = await prisma.employeeUserLink.findFirst({
    where: {
      userId,
      organizationId,
      status: "VERIFIED",
    },
    select: { employeeId: true, portalType: true },
  });
  
  let portalMode: PortalMode = null;
  if (link) {
    portalMode = link.portalType === "SUBJECT_PORTAL" ? "SUBJECT_PORTAL" : "CONTRIBUTOR_PORTAL";
  }
  
  return {
    userId,
    organizationId,
    systemRole,
    portalMode,
    linkedEmployeeId: link?.employeeId || null,
    portalType: link?.portalType || null,
  };
}

export async function isUserOffboardingSubject(
  userId: string,
  organizationId: string,
  offboardingId?: string
): Promise<boolean> {
  const employeeId = await getUserLinkedEmployeeId(userId, organizationId);
  if (!employeeId) return false;

  if (offboardingId) {
    const offboarding = await prisma.offboarding.findFirst({
      where: {
        id: offboardingId,
        employeeId,
        status: { in: ["PENDING", "IN_PROGRESS", "PENDING_APPROVAL"] },
      },
    });
    return !!offboarding;
  }

  const activeOffboarding = await prisma.offboarding.findFirst({
    where: {
      employeeId,
      organizationId,
      status: { in: ["PENDING", "IN_PROGRESS", "PENDING_APPROVAL"] },
    },
  });
  return !!activeOffboarding;
}

export async function getExcludedOffboardingIdsForUser(
  userId: string,
  organizationId: string
): Promise<string[]> {
  const employeeId = await getUserLinkedEmployeeId(userId, organizationId);
  if (!employeeId) return [];

  const offboardings = await prisma.offboarding.findMany({
    where: {
      employeeId,
      organizationId,
      status: { in: ["PENDING", "IN_PROGRESS", "PENDING_APPROVAL"] },
    },
    select: { id: true },
  });

  return offboardings.map(o => o.id);
}

export async function getExcludedEmployeeIdsForUser(
  userId: string,
  organizationId: string
): Promise<string[]> {
  const employeeId = await getUserLinkedEmployeeId(userId, organizationId);
  return employeeId ? [employeeId] : [];
}

export async function canUserOperateOnOffboarding(
  userId: string,
  organizationId: string,
  offboardingId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const isSubject = await isUserOffboardingSubject(userId, organizationId, offboardingId);
  
  if (isSubject) {
    return { 
      allowed: false, 
      reason: "INVARIANT: Subjects cannot act as helpers, approvers, or operators on their own offboarding" 
    };
  }
  
  return { allowed: true };
}

export async function canUserBeAssignedToTask(
  userIdToAssign: string,
  organizationId: string,
  offboardingId: string,
  isEmployeeRequiredTask: boolean = false
): Promise<{ allowed: boolean; reason?: string }> {
  const offboarding = await prisma.offboarding.findUnique({
    where: { id: offboardingId },
    select: { employeeId: true },
  });

  if (!offboarding) {
    return { allowed: false, reason: "Offboarding not found" };
  }

  const employeeId = await getUserLinkedEmployeeId(userIdToAssign, organizationId);
  
  if (employeeId && employeeId === offboarding.employeeId) {
    if (isEmployeeRequiredTask) {
      return { allowed: true };
    }
    return { 
      allowed: false, 
      reason: "INVARIANT: The offboarding subject cannot be assigned as a task executor (except for self-facing obligations)" 
    };
  }

  return { allowed: true };
}

export async function canUserApproveOffboarding(
  approverId: string,
  organizationId: string,
  offboardingId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const isSubject = await isUserOffboardingSubject(approverId, organizationId, offboardingId);
  
  if (isSubject) {
    return { 
      allowed: false, 
      reason: "INVARIANT: Subjects cannot approve or reject their own offboarding" 
    };
  }
  
  return { allowed: true };
}

export async function enforceInvariant(
  invariantName: string,
  check: () => Promise<{ passed: boolean; reason?: string }>,
  session: AuthSession,
  metadata?: Record<string, unknown>
): Promise<void> {
  const result = await check();
  
  if (!result.passed) {
    await createAuditLog({
      action: "invariant_violation_blocked",
      entityType: "invariant",
      entityId: invariantName,
      organizationId: session.currentOrgId!,
      userId: session.user.id,
      metadata: {
        invariant: invariantName,
        reason: result.reason,
        ...metadata,
      },
    });
    
    throw new InvariantViolationError(
      result.reason || `Invariant violation: ${invariantName}`,
      invariantName
    );
  }
}

export async function enforceSubjectCannotSelfExecute(
  session: AuthSession,
  offboardingId: string
): Promise<void> {
  await enforceInvariant(
    "SUBJECT_CANNOT_SELF_EXECUTE",
    async () => {
      const canOperate = await canUserOperateOnOffboarding(
        session.user.id,
        session.currentOrgId!,
        offboardingId
      );
      return { passed: canOperate.allowed, reason: canOperate.reason };
    },
    session,
    { offboardingId }
  );
}

export async function enforceSubjectCannotSelfApprove(
  session: AuthSession,
  offboardingId: string
): Promise<void> {
  await enforceInvariant(
    "SUBJECT_CANNOT_SELF_APPROVE",
    async () => {
      const canApprove = await canUserApproveOffboarding(
        session.user.id,
        session.currentOrgId!,
        offboardingId
      );
      return { passed: canApprove.allowed, reason: canApprove.reason };
    },
    session,
    { offboardingId }
  );
}

export async function enforceAssigneeNotSubject(
  session: AuthSession,
  assigneeUserId: string,
  offboardingId: string,
  isEmployeeRequiredTask: boolean = false
): Promise<void> {
  await enforceInvariant(
    "ASSIGNEE_CANNOT_BE_SUBJECT",
    async () => {
      const canAssign = await canUserBeAssignedToTask(
        assigneeUserId,
        session.currentOrgId!,
        offboardingId,
        isEmployeeRequiredTask
      );
      return { passed: canAssign.allowed, reason: canAssign.reason };
    },
    session,
    { assigneeUserId, offboardingId, isEmployeeRequiredTask }
  );
}

export function enforceAuditorReadOnly(session: AuthSession, action: string): void {
  if (isAuditor(session)) {
    throw new InvariantViolationError(
      `INVARIANT: Auditors cannot perform action: ${action}`,
      "AUDITOR_READ_ONLY"
    );
  }
}

export function enforceContributorTasksOnly(session: AuthSession, resource: string): void {
  if (isContributor(session)) {
    const allowedResources = ["task", "evidence"];
    if (!allowedResources.some(r => resource.toLowerCase().includes(r))) {
      throw new InvariantViolationError(
        `INVARIANT: Contributors can only access tasks and evidence, not: ${resource}`,
        "CONTRIBUTOR_TASKS_ONLY"
      );
    }
  }
}

export async function getTasksForContributorOrPortal(
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
  
  return tasks.map(t => t.id);
}

export async function getSubjectPortalOffboarding(
  userId: string,
  organizationId: string
): Promise<string | null> {
  const employeeId = await getUserLinkedEmployeeId(userId, organizationId);
  if (!employeeId) return null;
  
  const portalType = await getUserPortalType(userId, organizationId);
  if (portalType !== "SUBJECT_PORTAL") return null;
  
  const offboarding = await prisma.offboarding.findFirst({
    where: {
      employeeId,
      organizationId,
      status: { in: ["PENDING", "IN_PROGRESS", "PENDING_APPROVAL"] },
    },
    select: { id: true },
  });
  
  return offboarding?.id || null;
}

export async function getSubjectPortalTasks(
  userId: string,
  organizationId: string
): Promise<string[]> {
  const offboardingId = await getSubjectPortalOffboarding(userId, organizationId);
  if (!offboardingId) return [];
  
  const tasks = await prisma.offboardingTask.findMany({
    where: {
      offboardingId,
      isEmployeeRequired: true,
    },
    select: { id: true },
  });
  
  return tasks.map(t => t.id);
}

export type EffectiveRoleContext = {
  originalRole: SystemRole;
  effectiveRole: SystemRole;
  isDowngradedForCase: boolean;
  downgradeReason?: string;
  subjectOffboardingIds: string[];
};

export async function getEffectiveRoleForCase(
  session: AuthSession,
  offboardingId: string
): Promise<EffectiveRoleContext> {
  const originalRole = session.currentMembership?.systemRole || "CONTRIBUTOR";
  const isSubject = await isUserOffboardingSubject(
    session.user.id,
    session.currentOrgId!,
    offboardingId
  );

  if (isSubject) {
    return {
      originalRole,
      effectiveRole: "CONTRIBUTOR",
      isDowngradedForCase: true,
      downgradeReason: "User is the subject of this offboarding case - permissions downgraded to SUBJECT_PORTAL",
      subjectOffboardingIds: [offboardingId],
    };
  }

  return {
    originalRole,
    effectiveRole: originalRole,
    isDowngradedForCase: false,
    subjectOffboardingIds: [],
  };
}

export async function enforceSubjectOverrideRule(
  session: AuthSession,
  offboardingId: string,
  action: "execute" | "approve" | "view_admin_metadata"
): Promise<void> {
  const effectiveContext = await getEffectiveRoleForCase(session, offboardingId);
  
  if (effectiveContext.isDowngradedForCase) {
    const blockedActions = ["execute", "approve", "view_admin_metadata"];
    if (blockedActions.includes(action)) {
      await createAuditLog({
        action: "subject_override_blocked",
        entityType: "offboarding",
        entityId: offboardingId,
        organizationId: session.currentOrgId!,
        userId: session.user.id,
        metadata: {
          originalRole: effectiveContext.originalRole,
          effectiveRole: effectiveContext.effectiveRole,
          attemptedAction: action,
          reason: effectiveContext.downgradeReason,
        },
      });
      
      throw new InvariantViolationError(
        `SUBJECT_OVERRIDE: Even as ${effectiveContext.originalRole}, you cannot ${action} on your own offboarding case`,
        "SUBJECT_OVERRIDE_RULE"
      );
    }
  }
}

export async function getOffboardingsExcludingSubject(
  session: AuthSession
): Promise<{ id: { notIn: string[] } } | Record<string, never>> {
  const excludedIds = await getExcludedOffboardingIdsForUser(
    session.user.id,
    session.currentOrgId!
  );
  
  if (excludedIds.length === 0) return {};
  return { id: { notIn: excludedIds } };
}

export async function canAccessPortal(
  userId: string,
  organizationId: string
): Promise<{ canAccess: boolean; reason?: string }> {
  const link = await prisma.employeeUserLink.findFirst({
    where: {
      userId,
      organizationId,
      status: "VERIFIED",
    },
  });

  if (!link) {
    return { 
      canAccess: false, 
      reason: "No verified employee link exists. Portal access requires an accepted portal invitation." 
    };
  }

  return { canAccess: true };
}
