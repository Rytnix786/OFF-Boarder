import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission, getExcludedOffboardingIdsForUser } from "@/lib/rbac.server";
import { prisma } from "@/lib/prisma.server";
import OffboardingsClient from "./OffboardingsClient";
import { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";

export default async function OffboardingsPage() {
  const session = await requireActiveOrg();
  await requirePermission(session, "offboarding:read");

  const excludedOffboardingIds = await getExcludedOffboardingIdsForUser(
    session.user.id, 
    session.currentOrgId!
  );

  const [offboardings, employees, workflowTemplates] = await Promise.all([
    prisma.offboarding.findMany({
      where: { 
        organizationId: session.currentOrgId!,
        id: { notIn: excludedOffboardingIds },
      },
      include: {
        employee: {
          include: {
            department: true,
            jobTitle: true,
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
  ]);

  const canCreate = session.currentMembership?.systemRole === "OWNER" ||
                    session.currentMembership?.systemRole === "ADMIN";

  return (
    <Suspense fallback={<Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>}>
      <OffboardingsClient
        offboardings={offboardings as any}
        employees={employees}
        workflowTemplates={workflowTemplates}
        canCreate={canCreate}
      />
    </Suspense>
  );
}
