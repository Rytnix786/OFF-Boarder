import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import OrganizationClient from "./OrganizationClient";

export default async function OrganizationSettingsPage() {
  const session = await requireActiveOrg();
  await requirePermission(session, "org:read");

  const organization = await prisma.organization.findUnique({
    where: { id: session.currentOrgId! },
    include: {
      _count: {
        select: { memberships: true, employees: true, offboardings: true },
      },
    },
  });

  if (!organization) {
    throw new Error("Organization not found");
  }

  const canEdit = session.currentMembership?.systemRole === "OWNER" ||
                  session.currentMembership?.systemRole === "ADMIN";

  return <OrganizationClient organization={organization} canEdit={canEdit} />;
}
