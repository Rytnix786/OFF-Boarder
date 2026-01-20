import "server-only";
import { prisma } from "@/lib/prisma.server";
import { getSupabaseUser } from "@/lib/auth.server";
import { redirect } from "next/navigation";
import { EmployeeUserLinkStatus, EmployeeStatus, RiskLevel } from "@prisma/client";
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
      status: "VERIFIED",
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

  if (!employeeLink || employeeLink.organization.status !== "ACTIVE") {
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

export async function requireEmployeePortalAuth(): Promise<EmployeePortalSession> {
  const supabaseUser = await getSupabaseUser();
  
  if (!supabaseUser) {
    redirect("/login?redirect=/app/employee");
  }
  
  const session = await getEmployeePortalSession();
  
  if (!session) {
    redirect("/app?error=not_portal_user");
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
