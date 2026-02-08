import "server-only";
import { redirect } from "next/navigation";
import { requireActiveOrg } from "@/lib/auth.server";
import { hasAnyPermission, Permission } from "@/lib/permissions";
import { SystemRole } from "@prisma/client";

export async function requirePermissionGuard(permissions: Permission[]) {
  const session = await requireActiveOrg();
  const role = session.currentMembership!.systemRole as SystemRole;

  if (!hasAnyPermission(role, permissions)) {
    redirect("/app/access-denied");
  }

  return session;
}

export async function requireAdminRole() {
  const session = await requireActiveOrg();
  const role = session.currentMembership!.systemRole;

  if (role !== "OWNER" && role !== "ADMIN") {
    redirect("/app/access-denied");
  }

  return session;
}

export async function requireAuditorOrAbove() {
  const session = await requireActiveOrg();
  const role = session.currentMembership!.systemRole;

  if (role !== "OWNER" && role !== "ADMIN" && role !== "AUDITOR") {
    redirect("/app/access-denied");
  }

  return session;
}

export async function requireContributorOrAbove() {
  const session = await requireActiveOrg();
  const role = session.currentMembership!.systemRole;

  if (role !== "OWNER" && role !== "ADMIN" && role !== "AUDITOR" && role !== "CONTRIBUTOR") {
    redirect("/app/access-denied");
  }

  return session;
}

export async function requireNotContributor() {
  const session = await requireActiveOrg();
  const role = session.currentMembership!.systemRole;

  if (role === "CONTRIBUTOR") {
    redirect("/app/access-denied");
  }

  return session;
}
