"use server";

import { prisma } from "@/lib/prisma.server";
import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission, requireOwnerOrAdmin, PermissionDeniedError } from "@/lib/rbac.server";
import { createAuditLog } from "@/lib/audit.server";
import { createNotification, createNotificationForOrgMembers } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export async function inviteMember(formData: FormData) {
  const session = await requireActiveOrg();
  await requirePermission(session, "member:invite");

  const email = formData.get("email") as string;
  const role = formData.get("role") as "ADMIN" | "CONTRIBUTOR" | "AUDITOR";
  const customRoleId = formData.get("customRoleId") as string | null;
  const orgId = session.currentOrgId!;

  if (!email || !role) {
    return { error: "Email and role are required" };
  }

  const customRolesCount = await prisma.customRole.count({
    where: { organizationId: orgId },
  });

  if (customRolesCount > 0 && !customRoleId) {
    return { error: "Access Role is required when custom roles are configured" };
  }

  if (customRoleId) {
    const customRole = await prisma.customRole.findFirst({
      where: { id: customRoleId, organizationId: orgId },
    });
    if (!customRole) {
      return { error: "Invalid Access Role selected" };
    }
  }

  const existing = await prisma.invitation.findFirst({
    where: {
      email,
      organizationId: orgId,
      status: "PENDING",
    },
  });

  if (existing) {
    return { error: "An invitation has already been sent to this email" };
  }

  const existingMember = await prisma.membership.findFirst({
    where: {
      organizationId: orgId,
      user: { email },
    },
  });

  if (existingMember) {
    return { error: "This user is already a member of the organization" };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitation = await prisma.invitation.create({
    data: {
      email,
      organizationId: orgId,
      systemRole: role,
      customRoleId: customRoleId || null,
      token,
      expiresAt,
      invitedById: session.user.id,
    },
  });

  await createAuditLog(session, orgId, {
    action: "member.invited",
    entityType: "Invitation",
    entityId: invitation.id,
    newData: { 
      email, 
      systemRole: role,
      customRoleId: customRoleId || null,
    },
  });

  revalidatePath("/app/settings/members");
  return { success: true, invitation };
}

export async function approveMember(membershipId: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "member:approve");

  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    include: { user: true },
  });

  if (!membership || membership.organizationId !== session.currentOrgId) {
    return { error: "Membership not found" };
  }

  if (membership.status !== "PENDING") {
    return { error: "Membership is not pending approval" };
  }

  await prisma.membership.update({
    where: { id: membershipId },
    data: {
      status: "ACTIVE",
      approvedAt: new Date(),
      approvedBy: session.user.id,
    },
  });

  await createAuditLog(session, session.currentOrgId!, {
    action: "member.approved",
    entityType: "Membership",
    entityId: membershipId,
    newData: { userId: membership.userId, email: membership.user.email },
  });

  const org = await prisma.organization.findUnique({
    where: { id: session.currentOrgId! },
  });

  await createNotificationForOrgMembers(
    session.currentOrgId!,
    membership.userId,
    "member_joined",
    "New Member Joined",
    `${membership.user.name || membership.user.email} has joined ${org?.name || "the organization"}`,
    "/app/settings/members"
  );

  await createNotification({
    userId: membership.userId,
    organizationId: session.currentOrgId!,
    type: "member_joined",
    title: "Welcome!",
    message: `You have been approved to join ${org?.name || "the organization"}`,
    link: "/app",
  });

  revalidatePath("/app/settings/members");
  return { success: true };
}

export async function removeMember(membershipId: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "member:remove");

  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    include: { user: true },
  });

  if (!membership || membership.organizationId !== session.currentOrgId) {
    return { error: "Membership not found" };
  }

  if (membership.systemRole === "OWNER") {
    return { error: "Cannot remove the organization owner" };
  }

  if (membership.userId === session.user.id) {
    return { error: "Cannot remove yourself" };
  }

  await prisma.membership.delete({ where: { id: membershipId } });

  await createAuditLog(session, session.currentOrgId!, {
    action: "member.removed",
    entityType: "Membership",
    entityId: membershipId,
    oldData: { userId: membership.userId, email: membership.user.email, role: membership.systemRole },
  });

  revalidatePath("/app/settings/members");
  return { success: true };
}

export async function updateMemberRole(membershipId: string, newRole: "ADMIN" | "CONTRIBUTOR" | "AUDITOR") {
  const session = await requireActiveOrg();
  await requirePermission(session, "member:update");

  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    include: { user: true },
  });

  if (!membership || membership.organizationId !== session.currentOrgId) {
    return { error: "Membership not found" };
  }

  if (membership.systemRole === "OWNER") {
    return { error: "Cannot change the role of the organization owner" };
  }

  const oldRole = membership.systemRole;

  await prisma.membership.update({
    where: { id: membershipId },
    data: { systemRole: newRole },
  });

  await createAuditLog(session, session.currentOrgId!, {
    action: "member.role_changed",
    entityType: "Membership",
    entityId: membershipId,
    oldData: { role: oldRole },
    newData: { role: newRole },
  });

  revalidatePath("/app/settings/members");
  return { success: true };
}

export async function revokeInvitation(invitationId: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "member:invite");

  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation || invitation.organizationId !== session.currentOrgId) {
    return { error: "Invitation not found" };
  }

  await prisma.invitation.update({
    where: { id: invitationId },
    data: { status: "REVOKED" },
  });

  revalidatePath("/app/settings/members");
  return { success: true };
}

export async function suspendMember(membershipId: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "member:update");

  const membership = await prisma.membership.findUnique({ where: { id: membershipId } });

  if (!membership || membership.organizationId !== session.currentOrgId) {
    return { error: "Membership not found" };
  }

  if (membership.systemRole === "OWNER") {
    return { error: "Cannot suspend the organization owner" };
  }

  await prisma.membership.update({
    where: { id: membershipId },
    data: { status: "SUSPENDED" },
  });

  revalidatePath("/app/settings/members");
  return { success: true };
}

export async function reactivateMember(membershipId: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "member:update");

  const membership = await prisma.membership.findUnique({ where: { id: membershipId } });

  if (!membership || membership.organizationId !== session.currentOrgId) {
    return { error: "Membership not found" };
  }

  await prisma.membership.update({
    where: { id: membershipId },
    data: { status: "ACTIVE" },
  });

  revalidatePath("/app/settings/members");
  return { success: true };
}
