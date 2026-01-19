"use server";

import { prisma } from "@/lib/prisma";
import { requireActiveOrg } from "@/lib/auth.server";
import { 
  requirePermission, 
  isAdmin, 
  canUserApproveOffboarding,
  enforceAuditorReadOnly,
  enforceContributorTasksOnly,
  enforceSubjectCannotSelfApprove,
  isAuditor
} from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { createNotificationForOrgMembers } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { ApprovalStatus, ApprovalType } from "@prisma/client";

export async function createApproval(data: {
  offboardingId: string;
  taskId?: string;
  type: ApprovalType;
  requiredCount?: number;
  approvalOrder?: number;
}) {
  const session = await requireActiveOrg();
  
  enforceAuditorReadOnly(session, "create_approval");
  enforceContributorTasksOnly(session, "approval");
  
  await requirePermission(session, "offboarding:update");

  const orgId = session.currentOrgId!;

  const offboarding = await prisma.offboarding.findFirst({
    where: { id: data.offboardingId, organizationId: orgId },
    include: { employee: true },
  });

  if (!offboarding) {
    return { error: "Offboarding not found" };
  }

  const approval = await prisma.approval.create({
    data: {
      offboardingId: data.offboardingId,
      taskId: data.taskId,
      type: data.type,
      requiredCount: data.requiredCount || 1,
      approvalOrder: data.approvalOrder || 0,
      status: "PENDING",
    },
  });

  await createAuditLog(session, orgId, {
    action: "approval.created" as any,
    entityType: "Approval",
    entityId: approval.id,
    newData: { 
      type: data.type, 
      offboardingId: data.offboardingId,
      employeeName: `${offboarding.employee.firstName} ${offboarding.employee.lastName}`,
    },
  });

  await createNotificationForOrgMembers(
      orgId,
      session.user.id,
      "approval_required",
      "Approval Required",
      `An approval is required for ${offboarding.employee.firstName} ${offboarding.employee.lastName}'s offboarding`,
      `/app/offboardings/${data.offboardingId}`,
      offboarding.employeeId
    );

  revalidatePath(`/app/offboardings/${data.offboardingId}`);
  return { success: true, approval };
}

export async function submitApproval(
  approvalId: string, 
  status: "APPROVED" | "REJECTED",
  comments?: string,
  rejectionReason?: string
) {
  const session = await requireActiveOrg();
  
  enforceContributorTasksOnly(session, "approval");
  
  if (isAuditor(session)) {
    return { error: "INVARIANT: Auditors cannot approve or reject (read-only access)" };
  }
  
  await requirePermission(session, "offboarding:update");

  const orgId = session.currentOrgId!;

  const approval = await prisma.approval.findUnique({
    where: { id: approvalId },
    include: { 
      offboarding: { 
        include: { employee: true } 
      },
      task: true,
    },
  });

  if (!approval || approval.offboarding.organizationId !== orgId) {
    return { error: "Approval not found" };
  }

  if (approval.status !== "PENDING") {
    return { error: "This approval has already been processed" };
  }

  await enforceSubjectCannotSelfApprove(session, approval.offboardingId);

  if (!isAdmin(session)) {
    return { error: "Only Owners and Admins can approve or reject" };
  }

  const updated = await prisma.approval.update({
    where: { id: approvalId },
    data: {
      status,
      approverId: session.user.id,
      approvedAt: status === "APPROVED" ? new Date() : null,
      rejectedAt: status === "REJECTED" ? new Date() : null,
      rejectionReason: status === "REJECTED" ? rejectionReason : null,
      comments,
    },
  });

  await createAuditLog(session, orgId, {
    action: status === "APPROVED" ? "approval.approved" : "approval.rejected" as any,
    entityType: "Approval",
    entityId: approvalId,
    newData: {
      status,
      approverName: session.user.name || session.user.email,
      offboardingId: approval.offboardingId,
      taskId: approval.taskId,
      rejectionReason,
    },
  });

  if (status === "APPROVED") {
    await checkAndUpdateOffboardingStatus(approval.offboardingId, orgId);
  }

  revalidatePath(`/app/offboardings/${approval.offboardingId}`);
  return { success: true, approval: updated };
}

async function checkAndUpdateOffboardingStatus(offboardingId: string, orgId: string) {
  const approvals = await prisma.approval.findMany({
    where: { offboardingId },
  });

  const pendingApprovals = approvals.filter(a => a.status === "PENDING");

  if (pendingApprovals.length === 0) {
    const allApproved = approvals.every(a => a.status === "APPROVED");
    
    if (allApproved) {
      const offboarding = await prisma.offboarding.findUnique({
        where: { id: offboardingId },
      });

      if (offboarding?.status === "PENDING_APPROVAL") {
        await prisma.offboarding.update({
          where: { id: offboardingId },
          data: { status: "IN_PROGRESS" },
        });
      }
    }
  }
}

export async function getPendingApprovals() {
  const session = await requireActiveOrg();
  await requirePermission(session, "offboarding:read");

  const orgId = session.currentOrgId!;

  return prisma.approval.findMany({
    where: {
      offboarding: { organizationId: orgId },
      status: "PENDING",
    },
    include: {
      offboarding: {
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      },
      task: true,
      approver: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getOffboardingApprovals(offboardingId: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "offboarding:read");

  const orgId = session.currentOrgId!;

  const offboarding = await prisma.offboarding.findFirst({
    where: { id: offboardingId, organizationId: orgId },
  });

  if (!offboarding) {
    return [];
  }

  return prisma.approval.findMany({
    where: { offboardingId },
    include: {
      task: true,
      approver: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ approvalOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function createHighRiskApprovals(offboardingId: string, requiredApprovers: number = 2) {
  const session = await requireActiveOrg();
  await requirePermission(session, "offboarding:update");

  const orgId = session.currentOrgId!;

  const offboarding = await prisma.offboarding.findFirst({
    where: { id: offboardingId, organizationId: orgId },
    include: { employee: true },
  });

  if (!offboarding) {
    return { error: "Offboarding not found" };
  }

  const approvals = await prisma.approval.createMany({
    data: Array.from({ length: requiredApprovers }, (_, i) => ({
      offboardingId,
      type: "HIGH_RISK" as ApprovalType,
      requiredCount: 1,
      approvalOrder: i,
      status: "PENDING" as ApprovalStatus,
    })),
  });

  await prisma.offboarding.update({
    where: { id: offboardingId },
    data: { status: "PENDING_APPROVAL" },
  });

  await createAuditLog(session, orgId, {
    action: "approval.high_risk_created" as any,
    entityType: "Approval",
    entityId: offboardingId,
    newData: {
      employeeName: `${offboarding.employee.firstName} ${offboarding.employee.lastName}`,
      requiredApprovers,
    },
  });

  await createNotificationForOrgMembers(
      orgId,
      session.user.id,
      "high_risk_approval_required",
      "High-Risk Approval Required",
      `High-risk offboarding for ${offboarding.employee.firstName} ${offboarding.employee.lastName} requires ${requiredApprovers} approvals`,
      `/app/offboardings/${offboardingId}`,
      offboarding.employeeId
    );

  revalidatePath(`/app/offboardings/${offboardingId}`);
  return { success: true, count: approvals.count };
}

export async function getApprovalHistory(offboardingId: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "offboarding:read");

  const orgId = session.currentOrgId!;

  const offboarding = await prisma.offboarding.findFirst({
    where: { id: offboardingId, organizationId: orgId },
  });

  if (!offboarding) {
    return [];
  }

  return prisma.approval.findMany({
    where: { 
      offboardingId,
      status: { not: "PENDING" },
    },
    include: {
      task: true,
      approver: { select: { id: true, name: true, email: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}
