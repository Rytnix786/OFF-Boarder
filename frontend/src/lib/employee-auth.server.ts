import "server-only";
import { prisma } from "@/lib/prisma.server";
import { getSupabaseUser } from "@/lib/auth.server";
import { redirect } from "next/navigation";
import { EmployeeUserLinkStatus, EmployeeStatus, RiskLevel, SecurityEventType, Prisma } from "@prisma/client";
import { headers } from "next/headers";

export type EmployeePortalUser = {
  id: string;
  supabaseId: string;
  email: string;
  name: string | null;
};

export type EmployeeRecord = {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: EmployeeStatus;
  hireDate: Date | null;
  department: {
    id: string;
    name: string;
  } | null;
  jobTitle: {
    id: string;
    title: string;
  } | null;
  location: {
    id: string;
    name: string;
  } | null;
    managerMembership: {
      id: string;
      user: { name: string | null; email: string } | null;
    } | null;
};

export type EmployeeLinkRecord = {
  id: string;
  organizationId: string;
  employeeId: string;
  userId: string;
  status: EmployeeUserLinkStatus;
  revokedAt: Date | null;
  accessExpiresAt: Date | null;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
};

export type EmployeePortalSession = {
  user: EmployeePortalUser;
  employeeLink: EmployeeLinkRecord;
  employee: EmployeeRecord;
  organizationId: string;
  organizationName: string;
  hasActiveOffboarding: boolean;
  offboardingId: string | null;
  riskLevel: RiskLevel | null;
};

export async function getEmployeePortalSession(): Promise<EmployeePortalSession | null> {
  const supabaseUser = await getSupabaseUser();
  if (!supabaseUser) return null;

  const user = await prisma.user.findUnique({
    where: { supabaseId: supabaseUser.id },
    select: {
      id: true,
      supabaseId: true,
      email: true,
      name: true,
    },
  });

  if (!user) return null;

    const employeeLink = await prisma.employeeUserLink.findFirst({
      where: {
        userId: user.id,
        status: { in: ["VERIFIED", "REVOKED", "PENDING_VERIFICATION"] },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
        employee: {
          include: {
            department: {
              select: { id: true, name: true },
            },
            jobTitle: {
              select: { id: true, title: true },
            },
            location: {
              select: { id: true, name: true },
            },
            managerMembership: {
              select: {
                id: true,
                user: { select: { name: true, email: true } },
              },
            },
          },
        },
      },
    });

    if (!employeeLink) {
      return null;
    }

    if (employeeLink.organization.status !== "ACTIVE") {
      return null;
    }

  const activeOffboarding = await prisma.offboarding.findFirst({
    where: {
      employeeId: employeeLink.employeeId,
      organizationId: employeeLink.organizationId,
      status: {
        in: ["PENDING", "IN_PROGRESS", "PENDING_APPROVAL"],
      },
    },
    select: {
      id: true,
      riskLevel: true,
    },
  });

  return {
    user: {
      id: user.id,
      supabaseId: user.supabaseId,
      email: user.email,
      name: user.name,
    },
    employeeLink: {
      id: employeeLink.id,
      organizationId: employeeLink.organizationId,
      employeeId: employeeLink.employeeId,
      userId: employeeLink.userId,
        status: employeeLink.status,
        revokedAt: employeeLink.revokedAt,
        accessExpiresAt: employeeLink.accessExpiresAt,
        organization: {
        id: employeeLink.organization.id,
        name: employeeLink.organization.name,
        slug: employeeLink.organization.slug,
      },
    },
    employee: {
      id: employeeLink.employee.id,
      employeeId: employeeLink.employee.employeeId,
      firstName: employeeLink.employee.firstName,
      lastName: employeeLink.employee.lastName,
      email: employeeLink.employee.email,
      phone: employeeLink.employee.phone,
      status: employeeLink.employee.status,
      hireDate: employeeLink.employee.hireDate,
      department: employeeLink.employee.department,
      jobTitle: employeeLink.employee.jobTitle,
      location: employeeLink.employee.location,
      managerMembership: employeeLink.employee.managerMembership,
    },
    organizationId: employeeLink.organizationId,
    organizationName: employeeLink.organization.name,
    hasActiveOffboarding: !!activeOffboarding,
    offboardingId: activeOffboarding?.id || null,
    riskLevel: (activeOffboarding?.riskLevel as RiskLevel | null) || null,
  };
}

async function isServerAction(): Promise<boolean> {
  try {
    const headersList = await headers();
    const nextAction = headersList.get("next-action");
    return !!nextAction;
  } catch {
    return false;
  }
}

export async function requireEmployeePortalAuth(options?: { allowRevoked?: boolean }): Promise<EmployeePortalSession> {
  const supabaseUser = await getSupabaseUser();
  
  if (!supabaseUser) {
    const inServerAction = await isServerAction();
    if (inServerAction) {
      throw new Error("Session expired. Please refresh the page.");
    }
    redirect("/login?redirect=/app/employee");
  }
  
  const session = await getEmployeePortalSession();
  
  if (!session) {
    const inServerAction = await isServerAction();
    if (inServerAction) {
      throw new Error("Employee portal access required.");
    }
    redirect("/app?error=not_portal_user");
  }

  // Handle revoked employee portal access
  if (session.employeeLink.status === "REVOKED") {
    // Determine the absolute expiry time
    let expiryTime: Date | null = null;

    if (session.employeeLink.accessExpiresAt) {
      // Manual override takes precedence
      expiryTime = session.employeeLink.accessExpiresAt;
    } else if (session.employeeLink.revokedAt) {
      // Default grace period (24h)
      const gracePeriodHours = 24;
      expiryTime = new Date(session.employeeLink.revokedAt.getTime() + gracePeriodHours * 60 * 60 * 1000);
    }

    if (expiryTime && new Date() > expiryTime) {
      // Notify admins if not already notified for this expiration
      notifyAdminsOfExpiration(session).catch(console.error);

      const inServerAction = await isServerAction();
      if (inServerAction) {
        throw new Error("Your compliance window has expired. Please contact HR for assistance.");
      }
      redirect("/app/access-suspended?error=expired");
    }

    if (options?.allowRevoked) {
      return session;
    }

    const inServerAction = await isServerAction();
    if (inServerAction) {
      throw new Error("Your access to the employee portal has been revoked.");
    }

    // Allow grace routes for compliance even if revoked
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") || "";
    const complianceGraceRoutes = [
      "/app/employee/attestation",
      "/app/employee/assets",
      "/app/access-suspended",
    ];
    const isComplianceGraceRoute = complianceGraceRoutes.some(route => pathname.startsWith(route));

    if (!isComplianceGraceRoute) {
      redirect("/app/access-suspended");
    }
  }
  
  return session;
}

export async function requireEmployeeOffboarding(): Promise<EmployeePortalSession & { offboardingId: string }> {
  const session = await requireEmployeePortalAuth();
  
  if (!session.offboardingId) {
    redirect("/app/employee");
  }
  
  return session as EmployeePortalSession & { offboardingId: string };
}

export async function getEmployeeOffboarding(session: EmployeePortalSession) {
  if (!session.offboardingId) return null;

  return prisma.offboarding.findUnique({
    where: {
      id: session.offboardingId,
      employeeId: session.employee.id,
      organizationId: session.organizationId,
    },
      include: {
        employee: {
          include: {
            department: true,
            jobTitle: true,
            location: true,
            managerMembership: {
              select: {
                id: true,
                user: { select: { name: true, email: true } },
              },
            },
          },
        },
      tasks: {
        where: {
          assignedToEmployeeId: session.employee.id,
        },
        orderBy: { order: "asc" },
      },
      assetReturns: {
        include: {
          asset: true,
          proofs: true,
        },
      },
      accessRevocations: {
        orderBy: { createdAt: "desc" },
      },
      attestations: {
        where: {
          employeeId: session.employee.id,
        },
      },
    },
  });
}

export async function verifyEmployeeOwnership(
  session: EmployeePortalSession,
  resourceType: "task" | "assetReturn" | "offboarding",
  resourceId: string
): Promise<boolean> {
  switch (resourceType) {
    case "task": {
      const task = await prisma.offboardingTask.findUnique({
        where: { id: resourceId },
        include: {
          offboarding: {
            select: {
              employeeId: true,
              organizationId: true,
            },
          },
        },
      });
      return (
        !!task &&
        task.offboarding.employeeId === session.employee.id &&
        task.offboarding.organizationId === session.organizationId &&
        task.assignedToEmployeeId === session.employee.id
      );
    }
    case "assetReturn": {
      const assetReturn = await prisma.assetReturn.findUnique({
        where: { id: resourceId },
        include: {
          offboarding: {
            select: {
              employeeId: true,
              organizationId: true,
            },
          },
        },
      });
      return (
        !!assetReturn &&
        assetReturn.offboarding.employeeId === session.employee.id &&
        assetReturn.offboarding.organizationId === session.organizationId
      );
    }
    case "offboarding": {
      const offboarding = await prisma.offboarding.findUnique({
        where: { id: resourceId },
        select: {
          employeeId: true,
          organizationId: true,
        },
      });
      return (
        !!offboarding &&
        offboarding.employeeId === session.employee.id &&
        offboarding.organizationId === session.organizationId
      );
    }
    default:
      return false;
  }
}

export async function getClientInfo() {
  const headersList = await headers();
  const ipAddress = headersList.get("x-forwarded-for")?.split(",")[0] || 
                    headersList.get("x-real-ip") || 
                    "unknown";
  const userAgent = headersList.get("user-agent") || "unknown";
  
  return { ipAddress, userAgent };
}

export function getSimplifiedRiskLevel(riskLevel: RiskLevel | null): "Normal" | "Elevated" | "High" {
  if (!riskLevel) return "Normal";
  switch (riskLevel) {
    case "CRITICAL":
    case "HIGH":
      return "High";
    case "NORMAL":
    default:
      return "Normal";
  }
}

/**
 * Notifies all admins and owners of an organization when an employee's
 * compliance window (grace period) has expired.
 */
async function notifyAdminsOfExpiration(session: EmployeePortalSession) {
  try {
    const admins = await prisma.membership.findMany({
      where: {
        organizationId: session.organizationId,
        systemRole: { in: ["OWNER", "ADMIN"] },
        status: "ACTIVE",
      },
      select: { userId: true },
    });

    if (admins.length === 0) return;

    const notificationType = `grace_expired:${session.employeeLink.id}`;
    
    // Check if we've already sent a notification for this specific expiration link in the last 24h
    // This prevents spamming admins on every page load attempt by the employee
    const existing = await prisma.notification.findFirst({
      where: {
        organizationId: session.organizationId,
        type: notificationType,
        createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    });

    if (existing) return;

    // Create notifications for all admins
    await prisma.notification.createMany({
      data: admins.map(admin => ({
        userId: admin.userId,
        organizationId: session.organizationId,
        type: notificationType,
        title: "Compliance Window Expired",
        message: `The access window for ${session.employee.firstName} ${session.employee.lastName} has expired. Their portal access is now locked.`,
        link: `/app/employees/${session.employee.id}/security`,
      }))
    });
    
    // Log a security event
    await prisma.securityEvent.create({
      data: {
        organizationId: session.organizationId,
        employeeId: session.employee.id,
        eventType: SecurityEventType.ACCESS_REVOKED,
        description: "Employee portal access locked due to expired compliance window.",
        metadata: {
          expiredAt: new Date().toISOString(),
          linkId: session.employeeLink.id,
          employeeName: `${session.employee.firstName} ${session.employee.lastName}`
        } as Prisma.InputJsonValue
      }
    });
  } catch (error) {
    console.error("Failed to notify admins of grace period expiration:", error);
  }
}
