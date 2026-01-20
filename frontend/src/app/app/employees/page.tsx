import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission } from "@/lib/rbac.server";
import { prisma } from "@/lib/prisma.server";
import EmployeesClient from "./EmployeesClient";

export default async function EmployeesPage() {
  const session = await requireActiveOrg();
  await requirePermission(session, "employee:read");

  const [employees, departments, jobTitles, locations, orgMembers] = await Promise.all([
    prisma.employee.findMany({
      where: { organizationId: session.currentOrgId! },
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
        offboardings: {
          select: { id: true, status: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: {
          select: { 
            employeePortalInvites: true,
            employeeUserLinks: true,
          }
        }
      },
      orderBy: { lastName: "asc" },
    }),
    prisma.department.findMany({ where: { organizationId: session.currentOrgId! }, orderBy: { name: "asc" } }),
    prisma.jobTitle.findMany({ where: { organizationId: session.currentOrgId! }, orderBy: { title: "asc" } }),
    prisma.location.findMany({ where: { organizationId: session.currentOrgId! }, orderBy: { name: "asc" } }),
    prisma.membership.findMany({ 
      where: { 
        organizationId: session.currentOrgId!, 
        status: "ACTIVE",
        systemRole: { in: ["OWNER", "ADMIN", "CONTRIBUTOR"] },
      },
      select: { 
        id: true, 
        systemRole: true,
        user: { select: { id: true, name: true, email: true } } 
      },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  const canCreate = session.currentMembership?.systemRole === "OWNER" || 
                    session.currentMembership?.systemRole === "ADMIN";

  return (
    <EmployeesClient
      employees={employees}
      departments={departments}
      jobTitles={jobTitles}
      locations={locations}
      orgMembers={orgMembers}
      canCreate={canCreate}
    />
  );
}
