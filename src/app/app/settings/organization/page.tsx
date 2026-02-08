import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission } from "@/lib/rbac.server";
import { prisma } from "@/lib/prisma.server";
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

  const userRole = session.currentMembership?.systemRole;
  const canEdit = userRole === "OWNER" || userRole === "ADMIN";

  return (
    <OrganizationClient
      organization={{
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logoUrl: organization.logoUrl,
        status: organization.status,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
        primaryLocation: organization.primaryLocation,
        timezone: organization.timezone,
        organizationType: organization.organizationType,
        isSetupComplete: organization.isSetupComplete,
        _count: organization._count,
      }}
      canEdit={canEdit}
      userRole={userRole || "CONTRIBUTOR"}
    />
  );
}
