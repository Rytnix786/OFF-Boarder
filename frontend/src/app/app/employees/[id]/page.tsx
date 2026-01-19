import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission } from "@/lib/rbac.server";
import { prisma } from "@/lib/prisma.server";
import { notFound } from "next/navigation";
import EmployeeDetailClient from "./EmployeeDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EmployeeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireActiveOrg();
  await requirePermission(session, "employee:read");

  const employee = await prisma.employee.findFirst({
    where: {
      id,
      organizationId: session.currentOrgId!,
    },
    include: {
      department: true,
      jobTitle: true,
      location: true,
      manager: { select: { id: true, firstName: true, lastName: true, email: true } },
      directReports: { select: { id: true, firstName: true, lastName: true, email: true } },
      offboardings: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          status: true,
          scheduledDate: true,
          createdAt: true,
        },
      },
      assets: {
        select: {
          id: true,
          name: true,
          type: true,
          serialNumber: true,
          assetTag: true,
          status: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!employee) {
    notFound();
  }

  const canEdit = session.currentMembership?.systemRole === "OWNER" ||
                  session.currentMembership?.systemRole === "ADMIN";

  return <EmployeeDetailClient employee={employee} canEdit={canEdit} />;
}
