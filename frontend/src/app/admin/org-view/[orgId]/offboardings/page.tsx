import { redirect } from "next/navigation";
import { getOrgViewSession } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma.server";
import OffboardingsClient from "@/app/app/offboardings/OffboardingsClient";
import { Box, CircularProgress } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Suspense } from "react";
import { OrgViewPageHeader } from "../OrgViewPageHeader";

export default async function OrgViewOffboardingsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const session = await getOrgViewSession(orgId);

  if (!session) {
    redirect("/admin/org-view/select");
  }

  const [offboardings, employees, workflowTemplates, departments] = await Promise.all([
    prisma.offboarding.findMany({
      where: { 
        organizationId: session.currentOrgId!,
      },
      include: {
        employee: {
          include: {
            department: true,
            jobTitle: true,
            managerMembership: { 
              select: { 
                id: true, 
                user: { select: { name: true, email: true } } 
              } 
            },
          },
        },
        tasks: { orderBy: { order: "asc" } },
        approvals: { select: { id: true, status: true } },
        _count: {
          select: {
            tasks: true,
            approvals: true,
            assetReturns: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.employee.findMany({
      where: { 
        organizationId: session.currentOrgId!, 
        status: { in: ["ACTIVE", "ON_LEAVE"] } 
      },
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
    prisma.workflowTemplate.findMany({
      where: { organizationId: session.currentOrgId!, isActive: true },
      select: { id: true, name: true, description: true, isDefault: true },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    }),
    prisma.department.findMany({
      where: { organizationId: session.currentOrgId! },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <Box>
      <OrgViewPageHeader 
        title="Offboarding Cases"
        description={`Audit offboarding lifecycle and compliance status for ${session.currentMembership?.organization.name}.`}
        icon="group_remove"
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
          <Suspense fallback={<Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>}>
            <OffboardingsClient
              offboardings={offboardings as any}
              employees={employees}
              workflowTemplates={workflowTemplates}
              departments={departments}
              canCreate={false}
              isOrgView={true}
            />
          </Suspense>
        </Box>
      </Box>
    </Box>
  );
}
