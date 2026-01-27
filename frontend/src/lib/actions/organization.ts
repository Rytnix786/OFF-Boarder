"use server";

import { prisma } from "@/lib/prisma.server";
import { requireActiveOrg, requirePlatformAdmin } from "@/lib/auth.server";
import { requirePermission } from "@/lib/rbac.server";
import { createAuditLog } from "@/lib/audit.server";
import { revalidatePath } from "next/cache";

export async function createDepartment(formData: FormData) {
  const session = await requireActiveOrg();
  await requirePermission(session, "department:manage");

  const orgId = session.currentOrgId!;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const parentId = formData.get("parentId") as string || null;

  if (!name) {
    return { error: "Name is required" };
  }

  const existing = await prisma.department.findFirst({
    where: { organizationId: orgId, name },
  });

  if (existing) {
    return { error: "A department with this name already exists" };
  }

  const department = await prisma.department.create({
    data: { name, description, parentId, organizationId: orgId },
  });

  await createAuditLog(session, orgId, {
    action: "department.created",
    entityType: "Department",
    entityId: department.id,
    newData: { name, description },
  });

  revalidatePath("/app/settings/structure");
  revalidatePath("/app/employees");
  return { success: true, department };
}

export async function updateDepartment(departmentId: string, formData: FormData) {
  const session = await requireActiveOrg();
  await requirePermission(session, "department:manage");

  const orgId = session.currentOrgId!;

  const department = await prisma.department.findFirst({
    where: { id: departmentId, organizationId: orgId },
  });

  if (!department) {
    return { error: "Department not found" };
  }

  const name = formData.get("name") as string || department.name;
  const description = formData.get("description") as string;

  const updated = await prisma.department.update({
    where: { id: departmentId },
    data: { name, description },
  });

  await createAuditLog(session, orgId, {
    action: "department.updated",
    entityType: "Department",
    entityId: departmentId,
    oldData: { name: department.name },
    newData: { name },
  });

  revalidatePath("/app/settings/structure");
  revalidatePath("/app/employees");
  return { success: true, department: updated };
}

export async function deleteDepartment(departmentId: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "department:manage");

  const orgId = session.currentOrgId!;

  const department = await prisma.department.findFirst({
    where: { id: departmentId, organizationId: orgId },
  });

  if (!department) {
    return { error: "Department not found" };
  }

  const employeeCount = await prisma.employee.count({ where: { departmentId } });
  if (employeeCount > 0) {
    return { error: "Cannot delete department with assigned employees", employeeCount, requiresReassign: true };
  }

  await prisma.department.delete({ where: { id: departmentId } });

  await createAuditLog(session, orgId, {
    action: "department.deleted",
    entityType: "Department",
    entityId: departmentId,
    oldData: { name: department.name },
  });

  revalidatePath("/app/settings/structure");
  revalidatePath("/app/employees");
  return { success: true };
}

export async function reassignAndDeleteDepartment(departmentId: string, newDepartmentId: string | null) {
  const session = await requireActiveOrg();
  await requirePermission(session, "department:manage");

  const orgId = session.currentOrgId!;

  const department = await prisma.department.findFirst({
    where: { id: departmentId, organizationId: orgId },
  });

  if (!department) {
    return { error: "Department not found" };
  }

  if (newDepartmentId) {
    const newDept = await prisma.department.findFirst({
      where: { id: newDepartmentId, organizationId: orgId },
    });
    if (!newDept) {
      return { error: "Replacement department not found" };
    }
  }

  const affectedEmployees = await prisma.employee.findMany({
    where: { departmentId, organizationId: orgId },
    select: { id: true, firstName: true, lastName: true },
  });

  await prisma.employee.updateMany({
    where: { departmentId, organizationId: orgId },
    data: { departmentId: newDepartmentId },
  });

  await prisma.department.delete({ where: { id: departmentId } });

  await createAuditLog(session, orgId, {
    action: "department.reassigned_and_deleted",
    entityType: "Department",
    entityId: departmentId,
    oldData: { name: department.name },
    metadata: { 
      reassignedTo: newDepartmentId || "none",
      affectedEmployeeCount: affectedEmployees.length,
    },
  });

  revalidatePath("/app/settings/structure");
  revalidatePath("/app/employees");
  return { success: true, reassignedCount: affectedEmployees.length };
}

export async function createJobTitle(formData: FormData) {
  const session = await requireActiveOrg();
  await requirePermission(session, "jobtitle:manage");

  const orgId = session.currentOrgId!;
  const title = formData.get("title") as string;
  const level = formData.get("level") ? parseInt(formData.get("level") as string) : null;

  if (!title) {
    return { error: "Title is required" };
  }

  const existing = await prisma.jobTitle.findFirst({
    where: { organizationId: orgId, title },
  });

  if (existing) {
    return { error: "A job title with this name already exists" };
  }

  const jobTitle = await prisma.jobTitle.create({
    data: { title, level, organizationId: orgId },
  });

  await createAuditLog(session, orgId, {
    action: "jobtitle.created",
    entityType: "JobTitle",
    entityId: jobTitle.id,
    newData: { title, level },
  });

  revalidatePath("/app/settings/structure");
  revalidatePath("/app/employees");
  return { success: true, jobTitle };
}

export async function updateJobTitle(jobTitleId: string, formData: FormData) {
  const session = await requireActiveOrg();
  await requirePermission(session, "jobtitle:manage");

  const orgId = session.currentOrgId!;

  const jobTitle = await prisma.jobTitle.findFirst({
    where: { id: jobTitleId, organizationId: orgId },
  });

  if (!jobTitle) {
    return { error: "Job title not found" };
  }

  const title = formData.get("title") as string || jobTitle.title;
  const level = formData.get("level") ? parseInt(formData.get("level") as string) : jobTitle.level;

  const updated = await prisma.jobTitle.update({
    where: { id: jobTitleId },
    data: { title, level },
  });

  await createAuditLog(session, orgId, {
    action: "jobtitle.updated",
    entityType: "JobTitle",
    entityId: jobTitleId,
    oldData: { title: jobTitle.title },
    newData: { title },
  });

  revalidatePath("/app/settings/structure");
  revalidatePath("/app/employees");
  return { success: true, jobTitle: updated };
}

export async function deleteJobTitle(jobTitleId: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "jobtitle:manage");

  const orgId = session.currentOrgId!;

  const jobTitle = await prisma.jobTitle.findFirst({
    where: { id: jobTitleId, organizationId: orgId },
  });

  if (!jobTitle) {
    return { error: "Job title not found" };
  }

  const employeeCount = await prisma.employee.count({ where: { jobTitleId } });
  if (employeeCount > 0) {
    return { error: "Cannot delete job title with assigned employees", employeeCount, requiresReassign: true };
  }

  await prisma.jobTitle.delete({ where: { id: jobTitleId } });

  await createAuditLog(session, orgId, {
    action: "jobtitle.deleted",
    entityType: "JobTitle",
    entityId: jobTitleId,
    oldData: { title: jobTitle.title },
  });

  revalidatePath("/app/settings/structure");
  revalidatePath("/app/employees");
  return { success: true };
}

export async function reassignAndDeleteJobTitle(jobTitleId: string, newJobTitleId: string | null) {
  const session = await requireActiveOrg();
  await requirePermission(session, "jobtitle:manage");

  const orgId = session.currentOrgId!;

  const jobTitle = await prisma.jobTitle.findFirst({
    where: { id: jobTitleId, organizationId: orgId },
  });

  if (!jobTitle) {
    return { error: "Job title not found" };
  }

  if (newJobTitleId) {
    const newTitle = await prisma.jobTitle.findFirst({
      where: { id: newJobTitleId, organizationId: orgId },
    });
    if (!newTitle) {
      return { error: "Replacement job title not found" };
    }
  }

  const affectedEmployees = await prisma.employee.findMany({
    where: { jobTitleId, organizationId: orgId },
    select: { id: true, firstName: true, lastName: true },
  });

  await prisma.employee.updateMany({
    where: { jobTitleId, organizationId: orgId },
    data: { jobTitleId: newJobTitleId },
  });

  await prisma.jobTitle.delete({ where: { id: jobTitleId } });

  await createAuditLog(session, orgId, {
    action: "jobtitle.reassigned_and_deleted",
    entityType: "JobTitle",
    entityId: jobTitleId,
    oldData: { title: jobTitle.title },
    metadata: { 
      reassignedTo: newJobTitleId || "none",
      affectedEmployeeCount: affectedEmployees.length,
    },
  });

  revalidatePath("/app/settings/structure");
  revalidatePath("/app/employees");
  return { success: true, reassignedCount: affectedEmployees.length };
}

export async function createLocation(formData: FormData) {
  const session = await requireActiveOrg();
  await requirePermission(session, "location:manage");

  const orgId = session.currentOrgId!;
  const name = formData.get("name") as string;
  const address = formData.get("address") as string;
  const city = formData.get("city") as string;
  const country = formData.get("country") as string;
  const timezone = formData.get("timezone") as string;

  if (!name) {
    return { error: "Name is required" };
  }

  const existing = await prisma.location.findFirst({
    where: { organizationId: orgId, name },
  });

  if (existing) {
    return { error: "A location with this name already exists" };
  }

  const location = await prisma.location.create({
    data: { name, address, city, country, timezone, organizationId: orgId },
  });

  await createAuditLog(session, orgId, {
    action: "location.created",
    entityType: "Location",
    entityId: location.id,
    newData: { name, city, country },
  });

  revalidatePath("/app/settings/structure");
  revalidatePath("/app/employees");
  return { success: true, location };
}

export async function updateLocation(locationId: string, formData: FormData) {
  const session = await requireActiveOrg();
  await requirePermission(session, "location:manage");

  const orgId = session.currentOrgId!;

  const location = await prisma.location.findFirst({
    where: { id: locationId, organizationId: orgId },
  });

  if (!location) {
    return { error: "Location not found" };
  }

  const data = {
    name: formData.get("name") as string || location.name,
    address: formData.get("address") as string,
    city: formData.get("city") as string,
    country: formData.get("country") as string,
    timezone: formData.get("timezone") as string,
  };

  const updated = await prisma.location.update({
    where: { id: locationId },
    data,
  });

  await createAuditLog(session, orgId, {
    action: "location.updated",
    entityType: "Location",
    entityId: locationId,
    oldData: { name: location.name },
    newData: { name: data.name },
  });

  revalidatePath("/app/settings/structure");
  revalidatePath("/app/employees");
  return { success: true, location: updated };
}

export async function deleteLocation(locationId: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "location:manage");

  const orgId = session.currentOrgId!;

  const location = await prisma.location.findFirst({
    where: { id: locationId, organizationId: orgId },
  });

  if (!location) {
    return { error: "Location not found" };
  }

  const employeeCount = await prisma.employee.count({ where: { locationId } });
  if (employeeCount > 0) {
    return { error: "Cannot delete location with assigned employees", employeeCount, requiresReassign: true };
  }

  await prisma.location.delete({ where: { id: locationId } });

  await createAuditLog(session, orgId, {
    action: "location.deleted",
    entityType: "Location",
    entityId: locationId,
    oldData: { name: location.name },
  });

  revalidatePath("/app/settings/structure");
  revalidatePath("/app/employees");
  return { success: true };
}

export async function reassignAndDeleteLocation(locationId: string, newLocationId: string | null) {
  const session = await requireActiveOrg();
  await requirePermission(session, "location:manage");

  const orgId = session.currentOrgId!;

  const location = await prisma.location.findFirst({
    where: { id: locationId, organizationId: orgId },
  });

  if (!location) {
    return { error: "Location not found" };
  }

  if (newLocationId) {
    const newLoc = await prisma.location.findFirst({
      where: { id: newLocationId, organizationId: orgId },
    });
    if (!newLoc) {
      return { error: "Replacement location not found" };
    }
  }

  const affectedEmployees = await prisma.employee.findMany({
    where: { locationId, organizationId: orgId },
    select: { id: true, firstName: true, lastName: true },
  });

  await prisma.employee.updateMany({
    where: { locationId, organizationId: orgId },
    data: { locationId: newLocationId },
  });

  await prisma.location.delete({ where: { id: locationId } });

  await createAuditLog(session, orgId, {
    action: "location.reassigned_and_deleted",
    entityType: "Location",
    entityId: locationId,
    oldData: { name: location.name },
    metadata: { 
      reassignedTo: newLocationId || "none",
      affectedEmployeeCount: affectedEmployees.length,
    },
  });

  revalidatePath("/app/settings/structure");
  revalidatePath("/app/employees");
  return { success: true, reassignedCount: affectedEmployees.length };
}

export async function getOrgStructure() {
  const session = await requireActiveOrg();
  const orgId = session.currentOrgId!;

  const [departments, jobTitles, locations] = await Promise.all([
    prisma.department.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { employees: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.jobTitle.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { employees: true } } },
      orderBy: { title: "asc" },
    }),
    prisma.location.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { employees: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return { departments, jobTitles, locations };
}

export async function updateOrganization(formData: FormData) {
  const session = await requireActiveOrg();
  await requirePermission(session, "org:update");

  const orgId = session.currentOrgId!;

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) {
    return { error: "Organization not found" };
  }

  const name = formData.get("name") as string || org.name;
  const logoUrl = formData.get("logoUrl") as string;

  const updated = await prisma.organization.update({
    where: { id: orgId },
    data: { name, logoUrl },
  });

  await createAuditLog(session, orgId, {
    action: "organization.updated",
    entityType: "Organization",
    entityId: orgId,
    oldData: { name: org.name },
    newData: { name },
  });

  revalidatePath("/app/settings/organization");
  return { success: true, organization: updated };
}

import { isValidTimezone } from "@/lib/data/timezones";
import { isValidOrgType } from "@/lib/data/organization-types";

export async function updateOrganizationProfile(formData: FormData) {
  const session = await requireActiveOrg();

  const userRole = session.currentMembership?.systemRole;
  if (userRole !== "OWNER" && userRole !== "ADMIN") {
    return { error: "Only Owners and Admins can update organization profile" };
  }

  const orgId = session.currentOrgId!;

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) {
    return { error: "Organization not found" };
  }

  if (org.status !== "ACTIVE") {
    return { error: "Cannot update organization profile while organization is not active" };
  }

  const name = (formData.get("name") as string)?.trim();
  const logoUrl = (formData.get("logoUrl") as string)?.trim() || null;
  const primaryLocation = (formData.get("primaryLocation") as string)?.trim() || null;
  const timezone = (formData.get("timezone") as string)?.trim() || null;
  const organizationType = (formData.get("organizationType") as string)?.trim() || null;

  if (!name || name.length < 2) {
    return { error: "Organization name must be at least 2 characters" };
  }

  if (name.length > 100) {
    return { error: "Organization name cannot exceed 100 characters" };
  }

  if (primaryLocation && primaryLocation.length > 200) {
    return { error: "Primary location cannot exceed 200 characters" };
  }

  if (timezone && !isValidTimezone(timezone)) {
    return { error: "Invalid timezone selected" };
  }

  if (organizationType && !isValidOrgType(organizationType)) {
    return { error: "Invalid organization type selected" };
  }

  if (org.isSetupComplete) {
    if (!primaryLocation) {
      return { error: "Primary location is required for a setup-complete organization" };
    }
    if (!timezone) {
      return { error: "Timezone is required for a setup-complete organization" };
    }
    if (!organizationType) {
      return { error: "Organization type is required for a setup-complete organization" };
    }
  }

  const oldData = {
    name: org.name,
    logoUrl: org.logoUrl,
    primaryLocation: org.primaryLocation,
    timezone: org.timezone,
    organizationType: org.organizationType,
  };

  const newData = {
    name,
    logoUrl,
    primaryLocation,
    timezone,
    organizationType,
  };

  const changedFields: string[] = [];
  for (const key of Object.keys(newData) as (keyof typeof newData)[]) {
    if (oldData[key] !== newData[key]) {
      changedFields.push(key);
    }
  }

  if (changedFields.length === 0) {
    return { success: true, organization: org };
  }

  const updated = await prisma.organization.update({
    where: { id: orgId },
    data: newData,
  });

  await createAuditLog(session, orgId, {
    action: "organization.profile_updated",
    entityType: "Organization",
    entityId: orgId,
    oldData: oldData,
    newData: newData,
    metadata: {
      changedFields,
      updatedByRole: userRole,
    },
  });

  revalidatePath("/app/settings/organization");
  revalidatePath("/app/employees");
  revalidatePath("/app");
  return { success: true, organization: updated };
}

export async function approveOrganization(orgId: string) {
  const session = await requirePlatformAdmin();

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) {
    return { error: "Organization not found" };
  }

  if (org.status !== "PENDING") {
    return { error: "Organization is not pending approval" };
  }

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      status: "ACTIVE",
      approvedAt: new Date(),
      approvedBy: session.user.id,
    },
  });

  const ownerMembership = await prisma.membership.findFirst({
    where: { organizationId: orgId, systemRole: "OWNER" },
  });

  if (ownerMembership) {
    await prisma.membership.update({
      where: { id: ownerMembership.id },
      data: { status: "ACTIVE", approvedAt: new Date(), approvedBy: session.user.id },
    });
  }

  await createAuditLog(session, orgId, {
    action: "organization.approved",
    entityType: "Organization",
    entityId: orgId,
    newData: { name: org.name },
  });

  revalidatePath("/admin/organizations");
  return { success: true };
}

export async function rejectOrganization(orgId: string, reason: string) {
  const session = await requirePlatformAdmin();

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) {
    return { error: "Organization not found" };
  }

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      status: "REJECTED",
      rejectionReason: reason,
    },
  });

  await createAuditLog(session, orgId, {
    action: "organization.rejected",
    entityType: "Organization",
    entityId: orgId,
    newData: { name: org.name, reason },
  });

  revalidatePath("/admin/organizations");
  return { success: true };
}

export async function suspendOrganization(orgId: string) {
  await requirePlatformAdmin();

  await prisma.organization.update({
    where: { id: orgId },
    data: { status: "SUSPENDED" },
  });

  const memberships = await prisma.membership.findMany({
    where: { organizationId: orgId },
    select: { userId: true },
  });

  if (memberships.length > 0) {
    const supabase = await (await import("@/lib/supabase/server")).createClient();
    await supabase.from("Notification").insert(
      memberships.map((m) => ({
        userId: m.userId,
        organizationId: orgId,
        type: "org_suspended",
        title: "Organization Suspended",
        message: "Your organization has been suspended by a platform administrator.",
        link: "/org-blocked",
      }))
    );
  }

  revalidatePath("/admin/organizations");
  return { success: true };
}

export async function reactivateOrganization(orgId: string) {
  const session = await requirePlatformAdmin();

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) {
    return { error: "Organization not found" };
  }

  if (org.status !== "SUSPENDED" && org.status !== "REJECTED") {
    return { error: "Organization is not suspended or rejected" };
  }

  const previousStatus = org.status;

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      status: "ACTIVE",
      approvedAt: new Date(),
      approvedBy: session.user.id,
      rejectionReason: null,
    },
  });

  await prisma.membership.updateMany({
    where: { organizationId: orgId, status: "SUSPENDED" },
    data: { status: "ACTIVE" },
  });

  const orgAdmins = await prisma.membership.findMany({
    where: {
      organizationId: orgId,
      systemRole: { in: ["OWNER", "ADMIN"] },
    },
    select: { userId: true },
  });

  if (orgAdmins.length > 0) {
    await prisma.notification.createMany({
      data: orgAdmins.map((admin) => ({
        userId: admin.userId,
        organizationId: orgId,
        type: "org_reactivated",
        title: "Organization Reactivated",
        message: `Your organization "${org.name}" has been reactivated by a platform administrator. You now have full access again.`,
        link: "/app/dashboard",
      })),
    });
  }

  await createAuditLog(session, orgId, {
    action: "organization.reactivated",
    entityType: "Organization",
    entityId: orgId,
    newData: { name: org.name, previousStatus },
  });

  revalidatePath("/admin/organizations");
  return { success: true };
}

export async function getPendingOrganizations() {
  await requirePlatformAdmin();

  return prisma.organization.findMany({
    where: { status: "PENDING" },
    include: {
      memberships: {
        where: { systemRole: "OWNER" },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      _count: { select: { employees: true, memberships: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllOrganizations() {
  await requirePlatformAdmin();

  return prisma.organization.findMany({
    include: {
      memberships: {
        where: { systemRole: "OWNER" },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      _count: { select: { employees: true, memberships: true, offboardings: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

import { getPresetForOrgType } from "@/lib/data/structure-presets";
import { normalizeOrgType } from "@/lib/data/organization-types";

export async function getOrgTypeForStructure() {
  const session = await requireActiveOrg();
  const orgId = session.currentOrgId!;

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { organizationType: true },
  });

  if (!org) {
    return { orgType: null, preset: null };
  }

  const normalizedType = normalizeOrgType(org.organizationType);
  const preset = getPresetForOrgType(normalizedType);

  return { orgType: normalizedType, preset };
}

export async function getUnusedStructureItems() {
  const session = await requireActiveOrg();
  const orgId = session.currentOrgId!;

  const [departments, jobTitles, locations] = await Promise.all([
    prisma.department.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { employees: true } } },
    }),
    prisma.jobTitle.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { employees: true } } },
    }),
    prisma.location.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { employees: true } } },
    }),
  ]);

  const unusedDepartments = departments.filter(d => d._count.employees === 0);
  const unusedJobTitles = jobTitles.filter(t => t._count.employees === 0);
  const unusedLocations = locations.filter(l => l._count.employees === 0);

  const usedDepartments = departments.filter(d => d._count.employees > 0);
  const usedJobTitles = jobTitles.filter(t => t._count.employees > 0);
  const usedLocations = locations.filter(l => l._count.employees > 0);

  return {
    unused: {
      departments: unusedDepartments.map(d => ({ id: d.id, name: d.name })),
      jobTitles: unusedJobTitles.map(t => ({ id: t.id, title: t.title })),
      locations: unusedLocations.map(l => ({ id: l.id, name: l.name })),
    },
    used: {
      departments: usedDepartments.map(d => ({ id: d.id, name: d.name, count: d._count.employees })),
      jobTitles: usedJobTitles.map(t => ({ id: t.id, title: t.title, count: t._count.employees })),
      locations: usedLocations.map(l => ({ id: l.id, name: l.name, count: l._count.employees })),
    },
  };
}

export async function applyStructurePreset(mode: "merge" | "replace" = "merge") {
  const session = await requireActiveOrg();
  const orgId = session.currentOrgId!;
  const userRole = session.currentMembership?.systemRole;

  if (userRole !== "OWNER" && userRole !== "ADMIN") {
    return { error: "Only Owners and Admins can apply structure presets" };
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { organizationType: true, name: true },
  });

  if (!org) {
    return { error: "Organization not found" };
  }

  const normalizedType = normalizeOrgType(org.organizationType);
  const preset = getPresetForOrgType(normalizedType);

  if (!preset) {
    return { error: "No preset available for this organization type" };
  }

  const results = {
    departmentsAdded: 0,
    jobTitlesAdded: 0,
    locationsAdded: 0,
    departmentsRemoved: 0,
    jobTitlesRemoved: 0,
    locationsRemoved: 0,
    itemsPreserved: {
      departments: [] as string[],
      jobTitles: [] as string[],
      locations: [] as string[],
    },
  };

  if (mode === "replace") {
    const [allDepts, allTitles, allLocs] = await Promise.all([
      prisma.department.findMany({
        where: { organizationId: orgId },
        include: { _count: { select: { employees: true } } },
      }),
      prisma.jobTitle.findMany({
        where: { organizationId: orgId },
        include: { _count: { select: { employees: true } } },
      }),
      prisma.location.findMany({
        where: { organizationId: orgId },
        include: { _count: { select: { employees: true } } },
      }),
    ]);

    const presetDeptNames = new Set(preset.departments.map(d => d.name.toLowerCase()));
    const presetTitleNames = new Set(preset.jobTitles.map(t => t.title.toLowerCase()));
    const presetLocNames = new Set(preset.locations.map(l => l.name.toLowerCase()));

    const deptsToRemove = allDepts.filter(d => 
      !presetDeptNames.has(d.name.toLowerCase()) && d._count.employees === 0
    );
    const titlesToRemove = allTitles.filter(t => 
      !presetTitleNames.has(t.title.toLowerCase()) && t._count.employees === 0
    );
    const locsToRemove = allLocs.filter(l => 
      !presetLocNames.has(l.name.toLowerCase()) && l._count.employees === 0
    );

    results.itemsPreserved.departments = allDepts
      .filter(d => !presetDeptNames.has(d.name.toLowerCase()) && d._count.employees > 0)
      .map(d => d.name);
    results.itemsPreserved.jobTitles = allTitles
      .filter(t => !presetTitleNames.has(t.title.toLowerCase()) && t._count.employees > 0)
      .map(t => t.title);
    results.itemsPreserved.locations = allLocs
      .filter(l => !presetLocNames.has(l.name.toLowerCase()) && l._count.employees > 0)
      .map(l => l.name);

    if (deptsToRemove.length > 0) {
      await prisma.department.deleteMany({
        where: { id: { in: deptsToRemove.map(d => d.id) } },
      });
      results.departmentsRemoved = deptsToRemove.length;
    }

    if (titlesToRemove.length > 0) {
      await prisma.jobTitle.deleteMany({
        where: { id: { in: titlesToRemove.map(t => t.id) } },
      });
      results.jobTitlesRemoved = titlesToRemove.length;
    }

    if (locsToRemove.length > 0) {
      await prisma.location.deleteMany({
        where: { id: { in: locsToRemove.map(l => l.id) } },
      });
      results.locationsRemoved = locsToRemove.length;
    }
  }

  const [existingDepts, existingTitles, existingLocs] = await Promise.all([
    prisma.department.findMany({ where: { organizationId: orgId }, select: { name: true } }),
    prisma.jobTitle.findMany({ where: { organizationId: orgId }, select: { title: true } }),
    prisma.location.findMany({ where: { organizationId: orgId }, select: { name: true } }),
  ]);

  const existingDeptNames = new Set(existingDepts.map(d => d.name.toLowerCase()));
  const existingTitleNames = new Set(existingTitles.map(t => t.title.toLowerCase()));
  const existingLocNames = new Set(existingLocs.map(l => l.name.toLowerCase()));

  const newDepts = preset.departments.filter(d => !existingDeptNames.has(d.name.toLowerCase()));
  const newTitles = preset.jobTitles.filter(t => !existingTitleNames.has(t.title.toLowerCase()));
  const newLocs = preset.locations.filter(l => !existingLocNames.has(l.name.toLowerCase()));

  if (newDepts.length > 0) {
    await prisma.department.createMany({
      data: newDepts.map(d => ({
        name: d.name,
        description: d.description || null,
        organizationId: orgId,
      })),
    });
    results.departmentsAdded = newDepts.length;
  }

  if (newTitles.length > 0) {
    await prisma.jobTitle.createMany({
      data: newTitles.map(t => ({
        title: t.title,
        level: t.level || null,
        organizationId: orgId,
      })),
    });
    results.jobTitlesAdded = newTitles.length;
  }

  if (newLocs.length > 0) {
    await prisma.location.createMany({
      data: newLocs.map(l => ({
        name: l.name,
        city: l.city || null,
        country: l.country || null,
        organizationId: orgId,
      })),
    });
    results.locationsAdded = newLocs.length;
  }

  await createAuditLog(session, orgId, {
    action: "structure.preset_applied",
    entityType: "Organization",
    entityId: orgId,
    newData: {
      orgType: normalizedType,
      mode,
      ...results,
    },
    metadata: {
      preset: normalizedType,
      appliedByRole: userRole,
      mode,
    },
  });

  revalidatePath("/app/settings/structure");
  revalidatePath("/app/employees");

  return { success: true, ...results };
}

export async function deleteOrganization() {
  const session = await requireActiveOrg();
  const orgId = session.currentOrgId!;
  const userRole = session.currentMembership?.systemRole;

  if (userRole !== "OWNER") {
    return { error: "Only the organization owner can delete the organization" };
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, status: true },
  });

  if (!org) {
    return { error: "Organization not found" };
  }

  // Use a transaction to ensure all revocations happen together
  await prisma.$transaction([
    // 1. Set organization status to DELETED
    prisma.organization.update({
      where: { id: orgId },
      data: { status: "DELETED" },
    }),
    
    // 2. Revoke all memberships
    prisma.membership.updateMany({
      where: { organizationId: orgId },
      data: { status: "REVOKED", revokedAt: new Date(), revokedBy: session.user.id },
    }),
    
    // 3. Revoke all employee user links
    prisma.employeeUserLink.updateMany({
      where: { organizationId: orgId },
      data: { status: "REVOKED", revokedAt: new Date() },
    }),
    
    // 4. Revoke all employee portal invites
    prisma.employeePortalInvite.updateMany({
      where: { organizationId: orgId, status: "PENDING" },
      data: { status: "REVOKED" },
    }),
    
    // 5. Create audit log
    prisma.auditLog.create({
      data: {
        action: "organization.deleted",
        entityType: "Organization",
        entityId: orgId,
        organizationId: orgId,
        userId: session.user.id,
        newData: { status: "DELETED", name: org.name },
        scope: "ORGANIZATION",
      },
    }),
  ]);

  revalidatePath("/admin/organizations");
  revalidatePath("/app/settings/organization");
  
  return { success: true };
}
