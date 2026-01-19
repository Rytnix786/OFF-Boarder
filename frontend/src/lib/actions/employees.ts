"use server";

import { prisma } from "@/lib/prisma.server";
import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission } from "@/lib/rbac.server";
import { createAuditLog } from "@/lib/audit.server";
import { revalidatePath } from "next/cache";

export async function createEmployee(formData: FormData) {
  const session = await requireActiveOrg();
  await requirePermission(session, "employee:create");

  const orgId = session.currentOrgId!;
  const data = {
    employeeId: formData.get("employeeId") as string,
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string || null,
    hireDate: formData.get("hireDate") ? new Date(formData.get("hireDate") as string) : null,
    departmentId: formData.get("departmentId") as string || null,
    jobTitleId: formData.get("jobTitleId") as string || null,
    locationId: formData.get("locationId") as string || null,
    managerId: formData.get("managerId") as string || null,
  };

  if (!data.employeeId || !data.firstName || !data.lastName || !data.email) {
    return { error: "Employee ID, first name, last name, and email are required" };
  }

  const existing = await prisma.employee.findFirst({
    where: {
      organizationId: orgId,
      OR: [{ employeeId: data.employeeId }, { email: data.email }],
    },
  });

  if (existing) {
    return { error: "An employee with this ID or email already exists" };
  }

  const employee = await prisma.employee.create({
    data: {
      ...data,
      organizationId: orgId,
    },
  });

  await createAuditLog(session, orgId, {
    action: "employee.created",
    entityType: "Employee",
    entityId: employee.id,
    newData: { employeeId: data.employeeId, name: `${data.firstName} ${data.lastName}`, email: data.email },
  });

  revalidatePath("/app/employees");
  return { success: true, employee };
}

export async function updateEmployee(employeeId: string, formData: FormData) {
  const session = await requireActiveOrg();
  await requirePermission(session, "employee:update");

  const orgId = session.currentOrgId!;

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, organizationId: orgId },
  });

  if (!employee) {
    return { error: "Employee not found" };
  }

  const oldData = { ...employee };
  const data = {
    firstName: formData.get("firstName") as string || employee.firstName,
    lastName: formData.get("lastName") as string || employee.lastName,
    email: formData.get("email") as string || employee.email,
    phone: formData.get("phone") as string || null,
    hireDate: formData.get("hireDate") ? new Date(formData.get("hireDate") as string) : employee.hireDate,
    departmentId: formData.get("departmentId") as string || null,
    jobTitleId: formData.get("jobTitleId") as string || null,
    locationId: formData.get("locationId") as string || null,
    managerId: formData.get("managerId") as string || null,
    status: formData.get("status") as "ACTIVE" | "ON_LEAVE" | "TERMINATED" | "OFFBOARDING" || employee.status,
  };

  const updated = await prisma.employee.update({
    where: { id: employeeId },
    data,
  });

  await createAuditLog(session, orgId, {
    action: "employee.updated",
    entityType: "Employee",
    entityId: employeeId,
    oldData: { name: `${oldData.firstName} ${oldData.lastName}`, status: oldData.status },
    newData: { name: `${data.firstName} ${data.lastName}`, status: data.status },
  });

  revalidatePath("/app/employees");
  revalidatePath(`/app/employees/${employeeId}`);
  return { success: true, employee: updated };
}

export async function archiveEmployee(employeeId: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "employee:delete");

  const orgId = session.currentOrgId!;

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, organizationId: orgId },
  });

  if (!employee) {
    return { error: "Employee not found" };
  }

  if (employee.status === "ARCHIVED") {
    return { error: "Employee is already archived" };
  }

  const activeOffboardings = await prisma.offboarding.count({
    where: { 
      employeeId, 
      status: { in: ["PENDING", "IN_PROGRESS"] } 
    },
  });

  if (activeOffboardings > 0) {
    return { error: "Cannot archive employee with active offboarding in progress. Please complete or cancel the offboarding first." };
  }

  await prisma.employee.update({
    where: { id: employeeId },
    data: { status: "ARCHIVED" },
  });

  await createAuditLog(session, orgId, {
    action: "employee.updated",
    entityType: "Employee",
    entityId: employeeId,
    oldData: { status: employee.status },
    newData: { status: "ARCHIVED", action: "archived" },
  });

  revalidatePath("/app/employees");
  return { success: true };
}

export async function unarchiveEmployee(employeeId: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "employee:update");

  const orgId = session.currentOrgId!;

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, organizationId: orgId },
  });

  if (!employee) {
    return { error: "Employee not found" };
  }

  if (employee.status !== "ARCHIVED") {
    return { error: "Employee is not archived" };
  }

  await prisma.employee.update({
    where: { id: employeeId },
    data: { status: "TERMINATED" },
  });

  await createAuditLog(session, orgId, {
    action: "employee.updated",
    entityType: "Employee",
    entityId: employeeId,
    oldData: { status: "ARCHIVED" },
    newData: { status: "TERMINATED", action: "unarchived" },
  });

  revalidatePath("/app/employees");
  return { success: true };
}

export async function deleteEmployee(employeeId: string, forceDelete = false) {
  const session = await requireActiveOrg();
  await requirePermission(session, "employee:delete");

  const orgId = session.currentOrgId!;

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, organizationId: orgId },
    include: {
      offboardings: {
        select: { id: true, status: true }
      }
    }
  });

  if (!employee) {
    return { error: "Employee not found" };
  }

  const hasOffboardings = employee.offboardings.length > 0;
  const hasActiveOffboardings = employee.offboardings.some(
    o => o.status === "PENDING" || o.status === "IN_PROGRESS"
  );

  if (hasActiveOffboardings) {
    return { 
      error: "Cannot delete employee with active offboarding. Please complete or cancel the offboarding first.",
      canArchive: true
    };
  }

  if (hasOffboardings && !forceDelete) {
    return { 
      error: "This employee has offboarding history. We recommend archiving instead to preserve audit records.",
      canArchive: true,
      hasHistory: true
    };
  }

  if (hasOffboardings && forceDelete) {
    await prisma.$transaction(async (tx) => {
      await tx.offboardingTask.deleteMany({
        where: { offboarding: { employeeId } }
      });
      await tx.offboarding.deleteMany({
        where: { employeeId }
      });
      await tx.employee.delete({ where: { id: employeeId } });
    });
  } else {
    await prisma.employee.delete({ where: { id: employeeId } });
  }

  await createAuditLog(session, orgId, {
    action: "employee.deleted",
    entityType: "Employee",
    entityId: employeeId,
    oldData: { 
      employeeId: employee.employeeId, 
      name: `${employee.firstName} ${employee.lastName}`,
      hadOffboardingHistory: hasOffboardings
    },
  });

  revalidatePath("/app/employees");
  return { success: true };
}

export async function getEmployees(options?: { search?: string; status?: string; departmentId?: string; includeArchived?: boolean }) {
  const session = await requireActiveOrg();
  await requirePermission(session, "employee:read");

  const orgId = session.currentOrgId!;
  const where: Record<string, unknown> = { organizationId: orgId };

  if (options?.status && options.status !== "all") {
    where.status = options.status;
  } else if (!options?.includeArchived) {
    where.status = { not: "ARCHIVED" };
  }

  if (options?.departmentId) {
    where.departmentId = options.departmentId;
  }

  if (options?.search) {
    where.OR = [
      { firstName: { contains: options.search, mode: "insensitive" } },
      { lastName: { contains: options.search, mode: "insensitive" } },
      { email: { contains: options.search, mode: "insensitive" } },
      { employeeId: { contains: options.search, mode: "insensitive" } },
    ];
  }

  return prisma.employee.findMany({
    where,
    include: {
      department: true,
      jobTitle: true,
      location: true,
      manager: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { lastName: "asc" },
  });
}

export async function getEmployee(employeeId: string) {
  const session = await requireActiveOrg();
  await requirePermission(session, "employee:read");

  return prisma.employee.findFirst({
    where: { id: employeeId, organizationId: session.currentOrgId! },
    include: {
      department: true,
      jobTitle: true,
      location: true,
      manager: { select: { id: true, firstName: true, lastName: true } },
      directReports: { select: { id: true, firstName: true, lastName: true } },
      offboardings: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
}
