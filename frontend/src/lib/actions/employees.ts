"use server";

import { prisma } from "@/lib/prisma.server";
import { requireActiveOrg, AuthError } from "@/lib/auth.server";
import { requirePermission } from "@/lib/rbac.server";
import { createAuditLog } from "@/lib/audit.server";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";

export async function createEmployee(formData: FormData) {
  try {
    const session = await requireActiveOrg();
    await requirePermission(session, "employee:create");

    const orgId = session.currentOrgId!;
    const inviteToPortal = formData.get("inviteToPortal") === "true";
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
      managerMembershipId: formData.get("managerMembershipId") as string || null,
    };

    if (!data.employeeId || !data.firstName || !data.lastName || !data.email) {
      return { error: "Employee ID, first name, last name, and email are required" };
    }

    if (data.departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: data.departmentId, organizationId: orgId },
      });
      if (!dept) {
        return { error: "Invalid department selected" };
      }
    }

    if (data.jobTitleId) {
      const jt = await prisma.jobTitle.findFirst({
        where: { id: data.jobTitleId, organizationId: orgId },
      });
      if (!jt) {
        return { error: "Invalid job title selected" };
      }
    }

    if (data.locationId) {
      const loc = await prisma.location.findFirst({
        where: { id: data.locationId, organizationId: orgId },
      });
      if (!loc) {
        return { error: "Invalid location selected" };
      }
    }

    if (data.managerMembershipId) {
      const mgr = await prisma.membership.findFirst({
        where: { 
          id: data.managerMembershipId, 
          organizationId: orgId,
          status: "ACTIVE",
          systemRole: { in: ["OWNER", "ADMIN", "CONTRIBUTOR"] },
        },
      });
      if (!mgr) {
        return { error: "Invalid manager selected - must be an active org member" };
      }
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

    let invite = null;
    if (inviteToPortal) {
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      invite = await prisma.employeePortalInvite.create({
        data: {
          organizationId: orgId,
          employeeId: employee.id,
          email: data.email,
          token,
          portalType: "SUBJECT_PORTAL",
          expiresAt,
          invitedById: session.user.id,
        },
      });

      await createAuditLog(session, orgId, {
        action: "employee_portal_invite_sent",
        entityType: "EmployeePortalInvite",
        entityId: invite.id,
        newData: {
          employeeId: employee.id,
          employeeName: `${data.firstName} ${data.lastName}`,
          employeeEmail: data.email,
          portalType: "SUBJECT_PORTAL",
        },
      });
    }

    await createAuditLog(session, orgId, {
      action: "employee.created",
      entityType: "Employee",
      entityId: employee.id,
      newData: { employeeId: data.employeeId, name: `${data.firstName} ${data.lastName}`, email: data.email, invitedToPortal: inviteToPortal },
    });

    revalidatePath("/app/employees");
    return { 
      success: true, 
      employee,
      invite: invite ? { id: invite.id, token: invite.token, url: `/employee-invite/${invite.token}` } : null,
    };
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: err.message, authError: true };
    }
    throw err;
  }
}

export async function updateEmployee(employeeId: string, formData: FormData) {
  try {
    const session = await requireActiveOrg();
    await requirePermission(session, "employee:update");

    const orgId = session.currentOrgId!;

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, organizationId: orgId },
      include: {
        department: { select: { id: true, name: true } },
        jobTitle: { select: { id: true, title: true } },
        location: { select: { id: true, name: true } },
        managerMembership: { select: { id: true, user: { select: { name: true, email: true } } } },
      },
    });

    if (!employee) {
      return { error: "Employee not found" };
    }

    const data = {
      firstName: formData.get("firstName") as string || employee.firstName,
      lastName: formData.get("lastName") as string || employee.lastName,
      email: formData.get("email") as string || employee.email,
      phone: formData.get("phone") as string || null,
      hireDate: formData.get("hireDate") ? new Date(formData.get("hireDate") as string) : employee.hireDate,
      departmentId: formData.get("departmentId") as string || null,
      jobTitleId: formData.get("jobTitleId") as string || null,
      locationId: formData.get("locationId") as string || null,
      managerMembershipId: formData.get("managerMembershipId") as string || null,
      status: formData.get("status") as "ACTIVE" | "ON_LEAVE" | "TERMINATED" | "OFFBOARDING" || employee.status,
    };

    let newDepartment = null;
    let newJobTitle = null;
    let newLocation = null;
    let newManager = null;

    if (data.departmentId) {
      newDepartment = await prisma.department.findFirst({
        where: { id: data.departmentId, organizationId: orgId },
        select: { id: true, name: true },
      });
      if (!newDepartment) {
        return { error: "Invalid department selected" };
      }
    }

    if (data.jobTitleId) {
      newJobTitle = await prisma.jobTitle.findFirst({
        where: { id: data.jobTitleId, organizationId: orgId },
        select: { id: true, title: true },
      });
      if (!newJobTitle) {
        return { error: "Invalid job title selected" };
      }
    }

    if (data.locationId) {
      newLocation = await prisma.location.findFirst({
        where: { id: data.locationId, organizationId: orgId },
        select: { id: true, name: true },
      });
      if (!newLocation) {
        return { error: "Invalid location selected" };
      }
    }

    if (data.managerMembershipId) {
      newManager = await prisma.membership.findFirst({
        where: { 
          id: data.managerMembershipId, 
          organizationId: orgId,
          status: "ACTIVE",
          systemRole: { in: ["OWNER", "ADMIN", "CONTRIBUTOR"] },
        },
        select: { id: true, user: { select: { name: true, email: true } } },
      });
      if (!newManager) {
        return { error: "Invalid manager selected - must be an active org member" };
      }
    }

    const updated = await prisma.employee.update({
      where: { id: employeeId },
      data,
    });

    const structureChanges: { field: string; from: string | null; to: string | null }[] = [];
    
    if (employee.departmentId !== data.departmentId) {
      structureChanges.push({
        field: "department",
        from: employee.department?.name || null,
        to: newDepartment?.name || null,
      });
    }
    
    if (employee.jobTitleId !== data.jobTitleId) {
      structureChanges.push({
        field: "jobTitle",
        from: employee.jobTitle?.title || null,
        to: newJobTitle?.title || null,
      });
    }
    
    if (employee.locationId !== data.locationId) {
      structureChanges.push({
        field: "location",
        from: employee.location?.name || null,
        to: newLocation?.name || null,
      });
    }
    
    if (employee.managerMembershipId !== data.managerMembershipId) {
      structureChanges.push({
        field: "manager",
        from: employee.managerMembership?.user?.name || employee.managerMembership?.user?.email || null,
        to: newManager?.user?.name || newManager?.user?.email || null,
      });
    }

    await createAuditLog(session, orgId, {
      action: "employee.updated",
      entityType: "Employee",
      entityId: employeeId,
      oldData: { 
        name: `${employee.firstName} ${employee.lastName}`, 
        status: employee.status,
        department: employee.department?.name || null,
        jobTitle: employee.jobTitle?.title || null,
        location: employee.location?.name || null,
        manager: employee.managerMembership?.user?.name || employee.managerMembership?.user?.email || null,
      },
      newData: { 
        name: `${data.firstName} ${data.lastName}`, 
        status: data.status,
        department: newDepartment?.name || null,
        jobTitle: newJobTitle?.title || null,
        location: newLocation?.name || null,
        manager: newManager?.user?.name || newManager?.user?.email || null,
      },
      metadata: structureChanges.length > 0 ? { structureChanges } : undefined,
    });

    revalidatePath("/app/employees");
    revalidatePath(`/app/employees/${employeeId}`);
    return { success: true, employee: updated };
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: err.message, authError: true };
    }
    throw err;
  }
}

export async function grantTemporaryAccess(employeeId: string, hours: number) {
  let lastError: any = null;
  const maxRetries = 3;
  const retryDelay = 500; // ms

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const session = await requireActiveOrg();
      await requirePermission(session, "employee:update");

      const orgId = session.currentOrgId!;

      const employee = await prisma.employee.findFirst({
        where: { id: employeeId, organizationId: orgId },
        include: {
          employeeUserLinks: {
            where: { organizationId: orgId },
          },
        },
      });

      if (!employee) {
        return { error: "Employee not found" };
      }

      const link = employee.employeeUserLinks[0];
      if (!link) {
        return { error: "Employee does not have a linked user account" };
      }

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + hours);

      await prisma.employeeUserLink.update({
        where: { id: link.id },
        data: {
          accessExpiresAt: expiresAt,
          status: "REVOKED",
        },
      });

      await createAuditLog(session, orgId, {
        action: "employee.access_extended",
        entityType: "EmployeeUserLink",
        entityId: link.id,
        metadata: { 
          employeeId, 
          employeeName: `${employee.firstName} ${employee.lastName}`,
          extendedByHours: hours,
          expiresAt: expiresAt.toISOString(),
          retryAttempt: attempt > 1 ? attempt : undefined,
        },
      });

      revalidatePath(`/app/employees/${employeeId}`);
      revalidatePath(`/app/employees/${employeeId}/security`);
      return { success: true, expiresAt };
    } catch (err: any) {
      lastError = err;
      
      // Don't retry auth or permission errors
      if (err instanceof AuthError || err.message?.includes("Permission denied")) {
        return { error: err.message, authError: true };
      }

      // If it's a connection error or pool exhaustion, retry
      const isRetryable = 
        err.message?.includes("MaxClientsInSessionMode") || 
        err.message?.includes("pool_size") ||
        err.message?.includes("connection pool") ||
        err.code === "P2024"; // Prisma timeout

      if (!isRetryable || attempt === maxRetries) {
        break;
      }

      console.warn(`[grantTemporaryAccess] Attempt ${attempt} failed, retrying in ${retryDelay}ms...`, err.message);
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    }
  }

  const errorMessage = lastError?.message || "Unknown database error";
  const isConnectionError = errorMessage.includes("MaxClientsInSessionMode") || errorMessage.includes("pool_size");
  
  return { 
    error: isConnectionError 
      ? "Database is currently busy (Connection Pool Limit). Please try again in a few seconds." 
      : `Failed to grant access: ${errorMessage}`,
    details: lastError?.code || "INTERNAL_ERROR"
  };
}

export async function archiveEmployee(employeeId: string) {
  try {
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
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: err.message, authError: true };
    }
    throw err;
  }
}

export async function unarchiveEmployee(employeeId: string) {
  try {
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
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: err.message, authError: true };
    }
    throw err;
  }
}

export async function deleteEmployee(employeeId: string, forceDelete = false) {
  try {
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
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: err.message, authError: true };
    }
    throw err;
  }
}

export async function getEmployees(options?: { search?: string; status?: string; departmentId?: string; includeArchived?: boolean }) {
  try {
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
        managerMembership: { 
          select: { 
            id: true, 
            systemRole: true,
            user: { select: { id: true, name: true, email: true } } 
          } 
        },
      },
      orderBy: { lastName: "asc" },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return [];
    }
    throw err;
  }
}

export async function getEmployee(employeeId: string) {
  try {
    const session = await requireActiveOrg();
    await requirePermission(session, "employee:read");

    return prisma.employee.findFirst({
      where: { id: employeeId, organizationId: session.currentOrgId! },
      include: {
        department: true,
        jobTitle: true,
        location: true,
        managerMembership: { 
          select: { 
            id: true, 
            systemRole: true,
            user: { select: { id: true, name: true, email: true } } 
          } 
        },
        offboardings: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return null;
    }
    throw err;
  }
}
