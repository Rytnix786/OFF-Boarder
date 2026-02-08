"use server";

import { prisma } from "@/lib/prisma";
import { AuthSession } from "./auth";
import { Prisma } from "@prisma/client";

type AuditAction =
  | "organization.created" | "organization.updated" | "organization.approved" | "organization.rejected"
  | "member.invited" | "member.joined" | "member.approved" | "member.removed" | "member.role_changed"
  | "employee.created" | "employee.updated" | "employee.deleted"
  | "offboarding.created" | "offboarding.updated" | "offboarding.completed" | "offboarding.cancelled"
  | "task.completed" | "task.updated"
  | "department.created" | "department.updated" | "department.deleted"
  | "jobtitle.created" | "jobtitle.updated" | "jobtitle.deleted"
  | "location.created" | "location.updated" | "location.deleted"
  | "integration.connected" | "integration.disconnected"
  | "role.created" | "role.updated" | "role.deleted"
  | "user.login" | "user.logout" | "user.registered" | "user.password_changed" | "user.password_reset"
  | "ip.blocked" | "ip.unblocked"
  | "asset.created" | "asset.updated" | "asset.returned"
  | "approval.approved" | "approval.rejected"
  | "workflow.created" | "workflow.updated" | "workflow.deleted"
  | "task_completed" | "asset_proof_uploaded" | "attestation_signed" | "data_exported" | "blocked_action_attempt"
  | "employee_portal_invite_sent" | "employee_portal_invite_accepted" | "employee_portal_access_revoked"
  | string;

export interface AuditDetails {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  changedFields?: string[];
  reason?: string;
  description?: string;
  [key: string]: unknown;
}

interface AuditLogParams {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  oldData?: Prisma.InputJsonValue;
  newData?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}

interface SimpleAuditLogParams {
  action: string;
  entityType: string;
  entityId: string | null;
  organizationId: string;
  userId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

function computeChangedFields(
  oldData: Record<string, unknown> | null | undefined,
  newData: Record<string, unknown> | null | undefined
): string[] {
  if (!oldData || !newData) return [];
  const changedFields: string[] = [];
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  for (const key of allKeys) {
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      changedFields.push(key);
    }
  }
  return changedFields;
}

function getActionDescription(action: string, entityType: string): string {
  const [entity, verb] = action.split(".");
  const descriptions: Record<string, string> = {
    "organization.created": "New organization was created",
    "organization.updated": "Organization details were updated",
    "organization.approved": "Organization was approved by platform admin",
    "organization.rejected": "Organization was rejected by platform admin",
    "member.invited": "A new member was invited to the organization",
    "member.joined": "A new member joined the organization",
    "member.approved": "Member was approved to join",
    "member.removed": "Member was removed from the organization",
    "member.role_changed": "Member's role was changed",
    "employee.created": "New employee record was created",
    "employee.updated": "Employee record was updated",
    "employee.deleted": "Employee record was deleted",
    "offboarding.created": "New offboarding process was initiated",
    "offboarding.updated": "Offboarding process was updated",
    "offboarding.completed": "Offboarding process was completed",
    "offboarding.cancelled": "Offboarding process was cancelled",
    "task.completed": "Task was completed",
    "task.updated": "Task was updated",
    "department.created": "New department was created",
    "department.updated": "Department was updated",
    "department.deleted": "Department was deleted",
    "jobtitle.created": "New job title was created",
    "jobtitle.updated": "Job title was updated",
    "jobtitle.deleted": "Job title was deleted",
    "location.created": "New location was created",
    "location.updated": "Location was updated",
    "location.deleted": "Location was deleted",
    "integration.connected": "Integration was connected",
    "integration.disconnected": "Integration was disconnected",
    "role.created": "New custom role was created",
    "role.updated": "Custom role was updated",
    "role.deleted": "Custom role was deleted",
    "user.login": "User logged in",
    "user.logout": "User logged out",
    "user.registered": "New user registered",
    "user.password_changed": "User password was changed",
    "user.password_reset": "User password was reset",
    "ip.blocked": "IP address was blocked",
    "ip.unblocked": "IP address was unblocked",
    "asset.created": "New asset was created",
    "asset.updated": "Asset was updated",
    "asset.returned": "Asset was returned",
    "approval.approved": "Approval was granted",
    "approval.rejected": "Approval was rejected",
    "workflow.created": "Workflow template was created",
    "workflow.updated": "Workflow template was updated",
    "workflow.deleted": "Workflow template was deleted",
  };
  return descriptions[action] || `${entityType} ${verb || "action"}`;
}

export async function createAuditLog(
  sessionOrParams: AuthSession | null | SimpleAuditLogParams,
  orgId?: string,
  params?: AuditLogParams
) {
  try {
    if (typeof sessionOrParams === "object" && sessionOrParams !== null && "organizationId" in sessionOrParams) {
      const simpleParams = sessionOrParams as SimpleAuditLogParams;
      await prisma.auditLog.create({
        data: {
          action: simpleParams.action,
          entityType: simpleParams.entityType,
          entityId: simpleParams.entityId || undefined,
          metadata: simpleParams.metadata as Prisma.InputJsonValue,
          ipAddress: simpleParams.ipAddress,
          userAgent: simpleParams.userAgent,
          organizationId: simpleParams.organizationId,
          userId: simpleParams.userId,
        },
      });
      return;
    }

    const session = sessionOrParams as AuthSession | null;
    if (!params || !orgId) {
      console.error("createAuditLog called with invalid params");
      return;
    }
    
    const oldDataObj = params.oldData as Record<string, unknown> | null | undefined;
    const newDataObj = params.newData as Record<string, unknown> | null | undefined;
    const changedFields = computeChangedFields(oldDataObj, newDataObj);

    const metadata: AuditDetails = {
      description: getActionDescription(params.action, params.entityType),
      ...(params.metadata as Record<string, unknown> || {}),
    };

    if (oldDataObj) {
      metadata.before = oldDataObj;
    }
    if (newDataObj) {
      metadata.after = newDataObj;
    }
    if (changedFields.length > 0) {
      metadata.changedFields = changedFields;
    }

    if (session?.user) {
      metadata.actor = {
        userId: session.user.id,
        email: session.user.email,
        name: session.user.name,
      };
    }

    if (!params.oldData && !params.newData && !params.metadata) {
      metadata.note = "No additional details recorded for this action";
    }

    await prisma.auditLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldData: params.oldData,
        newData: params.newData,
        metadata: metadata as Prisma.InputJsonValue,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        organizationId: orgId,
        userId: session?.user.id,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}

export async function getAuditLogs(
  orgId: string,
  options?: {
    limit?: number;
    offset?: number;
    entityType?: string;
    action?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }
) {
  const where: Prisma.AuditLogWhereInput = { organizationId: orgId };

  if (options?.entityType) where.entityType = options.entityType;
  if (options?.action) where.action = { contains: options.action };
  if (options?.userId) where.userId = options.userId;
  if (options?.startDate || options?.endDate) {
    where.createdAt = {};
    if (options.startDate) where.createdAt.gte = options.startDate;
    if (options.endDate) where.createdAt.lte = options.endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}
