import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission } from "@/lib/rbac.server";
import { prisma } from "@/lib/prisma.server";
import AssetsClient from "./AssetsClient";

export default async function AssetsPage() {
  const session = await requireActiveOrg();
  await requirePermission(session, "asset:read");

  const [assets, employees, orgUsers] = await Promise.all([
    prisma.asset.findMany({
      where: { organizationId: session.currentOrgId! },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        assigneeUser: {
          select: { id: true, name: true, email: true },
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
    prisma.membership.findMany({
      where: { 
        organizationId: session.currentOrgId!, 
        status: "ACTIVE" 
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  const canManage = session.currentMembership?.systemRole === "OWNER" ||
                    session.currentMembership?.systemRole === "ADMIN";

  const myAssignedAssets = assets.filter(
    (a) => a.assigneeType === "ORG_USER" && a.assigneeUserId === session.user.id
  );

  return (
    <AssetsClient
      assets={assets as any}
      employees={employees}
      orgUsers={orgUsers.map(m => ({ id: m.user.id, name: m.user.name, email: m.user.email }))}
      canManage={canManage}
      currentUserId={session.user.id}
      myAssignedAssets={myAssignedAssets as any}
    />
  );
}
