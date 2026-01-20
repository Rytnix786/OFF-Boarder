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
    return { error: "Cannot delete department with assigned employees" };
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
    return { error: "Cannot delete job title with assigned employees" };
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
    return { error: "Cannot delete location with assigned employees" };
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

const VALID_TIMEZONES = [
  "Pacific/Midway", "Pacific/Honolulu", "America/Anchorage", "America/Los_Angeles",
  "America/Tijuana", "America/Denver", "America/Phoenix", "America/Chihuahua",
  "America/Chicago", "America/Mexico_City", "America/Regina", "America/Guatemala",
  "America/New_York", "America/Bogota", "America/Indiana/Indianapolis", "America/Caracas",
  "America/Halifax", "America/Santiago", "America/La_Paz", "America/St_Johns",
  "America/Sao_Paulo", "America/Argentina/Buenos_Aires", "America/Montevideo",
  "Atlantic/South_Georgia", "Atlantic/Azores", "Atlantic/Cape_Verde", "UTC",
  "Europe/London", "Africa/Casablanca", "Europe/Paris", "Europe/Amsterdam",
  "Europe/Belgrade", "Africa/Lagos", "Europe/Athens", "Europe/Helsinki",
  "Africa/Cairo", "Africa/Johannesburg", "Asia/Jerusalem", "Europe/Moscow",
  "Asia/Kuwait", "Africa/Nairobi", "Asia/Baghdad", "Asia/Tehran", "Asia/Dubai",
  "Asia/Baku", "Asia/Tbilisi", "Asia/Kabul", "Asia/Karachi", "Asia/Tashkent",
  "Asia/Yekaterinburg", "Asia/Kolkata", "Asia/Colombo", "Asia/Kathmandu",
  "Asia/Dhaka", "Asia/Almaty", "Asia/Yangon", "Asia/Bangkok", "Asia/Krasnoyarsk",
  "Asia/Shanghai", "Asia/Singapore", "Asia/Taipei", "Australia/Perth", "Asia/Irkutsk",
  "Asia/Tokyo", "Asia/Seoul", "Asia/Yakutsk", "Australia/Adelaide", "Australia/Darwin",
  "Australia/Sydney", "Australia/Brisbane", "Pacific/Guam", "Asia/Vladivostok",
  "Pacific/Noumea", "Asia/Magadan", "Pacific/Auckland", "Pacific/Fiji",
  "Asia/Kamchatka", "Pacific/Tongatapu", "Pacific/Apia", "Pacific/Kiritimati",
];

const VALID_ORG_TYPES = [
  "technology", "healthcare", "finance", "education", "manufacturing",
  "retail", "consulting", "government", "nonprofit", "other",
];

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

  if (timezone && !VALID_TIMEZONES.includes(timezone)) {
    return { error: "Invalid timezone selected" };
  }

  if (organizationType && !VALID_ORG_TYPES.includes(organizationType)) {
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
  const session = await requirePlatformAdmin();

  await prisma.organization.update({
    where: { id: orgId },
    data: { status: "SUSPENDED" },
  });

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
