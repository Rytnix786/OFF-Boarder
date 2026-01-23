import { redirect } from "next/navigation";
import { getOrgViewSession } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma.server";
import EmployeesClient from "@/app/app/employees/EmployeesClient";
import { Box, Typography } from "@mui/material";

export default async function OrgViewEmployeesPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const session = await getOrgViewSession(orgId);

  if (!session) {
    redirect("/admin/org-view/select");
  }

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

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Employees
        </Typography>
        <Typography color="text.secondary">
          Managing employee directory for {session.currentMembership?.organization.name} (Read-only).
        </Typography>
      </Box>

        <EmployeesClient
          employees={employees}
          departments={departments}
          jobTitles={jobTitles}
          locations={locations}
          orgMembers={orgMembers}
          canCreate={false} // Force read-only
          isOrgView={true}
        />
    </Box>
  );
}
