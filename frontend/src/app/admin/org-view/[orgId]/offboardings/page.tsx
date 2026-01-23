import { redirect } from "next/navigation";
import { getOrgViewSession } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma.server";
import OffboardingsClient from "@/app/app/offboardings/OffboardingsClient";
import { Box, Typography, CircularProgress } from "@mui/material";
import { Suspense } from "react";

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
    <Box sx={{ p: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Offboardings
        </Typography>
        <Typography color="text.secondary">
          Managing offboarding requests for {session.currentMembership?.organization.name} (Read-only).
        </Typography>
      </Box>

      <Suspense fallback={<Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>}>
        <OffboardingsClient
          offboardings={offboardings as any}
          employees={employees}
          workflowTemplates={workflowTemplates}
          departments={departments}
          canCreate={false} // Force read-only
          isOrgView={true}
        />
      </Suspense>
    </Box>
  );
}
