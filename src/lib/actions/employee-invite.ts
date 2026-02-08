"use server";

import { prisma } from "@/lib/prisma.server";
import { requireActiveOrg } from "@/lib/auth.server";
import { createAuditLog } from "@/lib/audit.server";
import { createNotification } from "@/lib/notifications";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { PortalType } from "@prisma/client";

export async function inviteEmployeeToPortal(
  employeeId: string, 
  portalType: PortalType = "SUBJECT_PORTAL"
) {
  const session = await requireActiveOrg();
  
  if (!session.currentMembership || 
      !["OWNER", "ADMIN"].includes(session.currentMembership.systemRole)) {
    return { success: false, error: "Unauthorized" };
  }

  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      organizationId: session.currentOrgId!,
    },
  });

  if (!employee) {
    return { success: false, error: "Employee not found" };
  }

  const existingLink = await prisma.employeeUserLink.findFirst({
    where: {
      organizationId: session.currentOrgId!,
      employeeId: employee.id,
    },
  });

  if (existingLink) {
    return { success: false, error: "Employee is already linked to a portal account" };
  }

  const existingInvite = await prisma.employeePortalInvite.findFirst({
    where: {
      organizationId: session.currentOrgId!,
      employeeId: employee.id,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
  });

  if (existingInvite) {
    return { success: false, error: "A pending invite already exists for this employee" };
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invite = await prisma.employeePortalInvite.create({
    data: {
      organizationId: session.currentOrgId!,
      employeeId: employee.id,
      email: employee.email,
      token,
      portalType,
      expiresAt,
      invitedById: session.user.id,
    },
  });

  await createAuditLog({
    action: "employee_portal_invite_sent",
    entityType: "employee_portal_invite",
    entityId: invite.id,
    organizationId: session.currentOrgId!,
    userId: session.user.id,
    metadata: {
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeEmail: employee.email,
      portalType,
    },
  });

  revalidatePath("/app/employees");
  revalidatePath(`/app/employees/${employeeId}`);

  return { 
    success: true, 
    inviteId: invite.id,
    inviteUrl: `/employee-invite/${token}`,
    portalType,
  };
}

export async function acceptEmployeePortalInvite(token: string) {
  const invite = await prisma.employeePortalInvite.findUnique({
    where: { token },
    include: {
      organization: {
        select: { id: true, name: true, slug: true, status: true },
      },
      employee: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });

  if (!invite) {
    return { success: false, error: "Invalid invitation" };
  }

  if (invite.status !== "PENDING") {
    return { success: false, error: "This invitation has already been used or revoked" };
  }

  if (invite.expiresAt < new Date()) {
    return { success: false, error: "This invitation has expired" };
  }

  if (invite.organization.status !== "ACTIVE") {
    return { success: false, error: "This organization is not active" };
  }

  return {
    success: true,
    invite: {
      id: invite.id,
      email: invite.email,
      portalType: invite.portalType,
      organization: invite.organization,
      employee: invite.employee,
    },
  };
}

export async function completeEmployeePortalInvite(token: string, userId: string) {
  const invite = await prisma.employeePortalInvite.findUnique({
    where: { token },
    include: {
      employee: true,
    },
  });

  if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
    return { success: false, error: "Invalid or expired invitation" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return { success: false, error: "User not found" };
  }

  if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
    return { success: false, error: "Email address does not match the invitation" };
  }

  const existingLink = await prisma.employeeUserLink.findFirst({
    where: {
      OR: [
        { organizationId: invite.organizationId, userId: user.id },
        { organizationId: invite.organizationId, employeeId: invite.employeeId },
      ],
    },
  });

  if (existingLink) {
    return { success: false, error: "An employee link already exists" };
  }

  const [link] = await prisma.$transaction([
    prisma.employeeUserLink.create({
      data: {
        organizationId: invite.organizationId,
        employeeId: invite.employeeId,
        userId: user.id,
        portalType: invite.portalType,
        status: "VERIFIED",
        linkedByUserId: invite.invitedById,
        verifiedAt: new Date(),
      },
    }),
    prisma.employeePortalInvite.update({
      where: { id: invite.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        acceptedByUserId: user.id,
      },
    }),
  ]);

  await createAuditLog({
    action: "employee_portal_invite_accepted",
    entityType: "employee_user_link",
    entityId: link.id,
    organizationId: invite.organizationId,
    userId: user.id,
    metadata: {
      employeeId: invite.employeeId,
      employeeName: `${invite.employee.firstName} ${invite.employee.lastName}`,
      inviteId: invite.id,
      portalType: invite.portalType,
    },
  });

  await createNotification({
    userId: invite.invitedById,
    organizationId: invite.organizationId,
    type: "member_joined",
    title: "Employee Portal Invite Accepted",
    message: `${invite.employee.firstName} ${invite.employee.lastName} has accepted their portal invitation`,
    link: `/app/employees/${invite.employeeId}`,
  });

  return { success: true, linkId: link.id, portalType: invite.portalType };
}

export async function revokeEmployeePortalAccess(employeeLinkId: string, reason?: string) {
  const session = await requireActiveOrg();
  
  if (!session.currentMembership || 
      !["OWNER", "ADMIN"].includes(session.currentMembership.systemRole)) {
    return { success: false, error: "Unauthorized" };
  }

  const link = await prisma.employeeUserLink.findFirst({
    where: {
      id: employeeLinkId,
      organizationId: session.currentOrgId!,
    },
    include: {
      employee: true,
    },
  });

  if (!link) {
    return { success: false, error: "Employee link not found" };
  }

  await prisma.employeeUserLink.update({
    where: { id: link.id },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
      revokedReason: reason,
    },
  });

  await createAuditLog({
    action: "employee_portal_access_revoked",
    entityType: "employee_user_link",
    entityId: link.id,
    organizationId: session.currentOrgId!,
    userId: session.user.id,
    metadata: {
      employeeId: link.employeeId,
      employeeName: `${link.employee.firstName} ${link.employee.lastName}`,
      reason,
    },
  });

  revalidatePath("/app/employees");

  return { success: true };
}
