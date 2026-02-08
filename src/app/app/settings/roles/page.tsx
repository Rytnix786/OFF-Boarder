import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission } from "@/lib/rbac.server";
import { prisma } from "@/lib/prisma.server";
import RolesClient from "./RolesClient";

export default async function RolesPage() {
  const session = await requireActiveOrg();
  await requirePermission(session, "role:manage");

  const [customRoles, permissions] = await Promise.all([
    prisma.customRole.findMany({
      where: { organizationId: session.currentOrgId! },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { assignments: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.permission.findMany({ orderBy: { category: "asc" } }),
  ]);

  return <RolesClient customRoles={customRoles} permissions={permissions} />;
}
