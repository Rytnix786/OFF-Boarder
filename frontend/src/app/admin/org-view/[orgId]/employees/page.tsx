import { redirect } from "next/navigation";
import { getOrgViewSession } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma.server";
import EmployeesClient from "@/app/app/employees/EmployeesClient";
import { Box } from "@mui/material";
import { OrgViewPageHeader } from "../OrgViewPageHeader";

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
    <Box>
      <OrgViewPageHeader 
        title="Employee Directory"
        description={`Viewing employees for ${session.currentMembership?.organization.name} in read-only mode.`}
        icon="badge"
      />

        <Box sx={{ px: { xs: 3, md: 6 }, pb: 6 }}>
          <Box
            sx={{
              bgcolor: alpha("#0f172a", 0.3),
              borderRadius: "32px",
              border: "1px solid",
              borderColor: alpha("#ffffff", 0.05),
              p: { xs: 2, md: 4 },
              boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
              position: "relative",
              overflow: "hidden",
              "&::before": {
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "2px",
                background: `linear-gradient(90deg, transparent, ${alpha("#6366f1", 0.5)}, transparent)`,
              }
            }}
          >
          <EmployeesClient
            employees={employees}
            departments={departments}
            jobTitles={jobTitles}
            locations={locations}
            orgMembers={orgMembers}
            canCreate={false}
            isOrgView={true}
          />
        </Box>
      </Box>
    </Box>
  );
}

