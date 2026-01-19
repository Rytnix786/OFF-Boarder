import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import IntegrationsClient from "./IntegrationsClient";

export default async function IntegrationsPage() {
  const session = await requireActiveOrg();
  await requirePermission(session, "integration:manage");

  const integrations = await prisma.integration.findMany({
    where: { organizationId: session.currentOrgId! },
    orderBy: { type: "asc" },
  });

  const canManage = session.currentMembership?.systemRole === "OWNER" ||
                    session.currentMembership?.systemRole === "ADMIN";

  return <IntegrationsClient integrations={integrations} canManage={canManage} />;
}
