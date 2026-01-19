import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import EmployeesClient from "./EmployeesClient";

export default async function EmployeesPage() {
  const session = await requireActiveOrg();
  await requirePermission(session, "employee:read");

  const [employees, departments, jobTitles, locations] = await Promise.all([
    prisma.employee.findMany({
      where: { organizationId: session.currentOrgId! },
      include: {
        department: true,
        jobTitle: true,
        location: true,
        manager: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { lastName: "asc" },
    }),
    prisma.department.findMany({ where: { organizationId: session.currentOrgId! } }),
    prisma.jobTitle.findMany({ where: { organizationId: session.currentOrgId! } }),
    prisma.location.findMany({ where: { organizationId: session.currentOrgId! } }),
  ]);

  const canCreate = session.currentMembership?.systemRole === "OWNER" || 
                    session.currentMembership?.systemRole === "ADMIN";

  return (
    <EmployeesClient
      employees={employees}
      departments={departments}
      jobTitles={jobTitles}
      locations={locations}
      canCreate={canCreate}
    />
  );
}
