import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission } from "@/lib/rbac.server";
import { prisma } from "@/lib/prisma.server";
import AssetsClient from "./AssetsClient";

export default async function AssetsPage() {
  const session = await requireActiveOrg();
  await requirePermission(session, "asset:read");

  const [assets, employees] = await Promise.all([
    prisma.asset.findMany({
      where: { organizationId: session.currentOrgId! },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.employee.findMany({
      where: { 
        organizationId: session.currentOrgId!, 
        status: { in: ["ACTIVE", "ON_LEAVE", "OFFBOARDING"] } 
      },
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
  ]);

  const canManage = session.currentMembership?.systemRole === "OWNER" ||
                    session.currentMembership?.systemRole === "ADMIN";

  return (
    <AssetsClient
      assets={assets as any}
      employees={employees}
      canManage={canManage}
    />
  );
}
