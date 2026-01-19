import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission } from "@/lib/rbac";
import { getWorkflowTemplates, ensureDefaultWorkflowTemplates } from "@/lib/actions/workflows";
import { prisma } from "@/lib/prisma";
import WorkflowsClient from "./WorkflowsClient";

export default async function WorkflowsPage() {
  const session = await requireActiveOrg();
  await requirePermission(session, "offboarding:read");

  const orgId = session.currentOrgId!;

  await ensureDefaultWorkflowTemplates(orgId, session);

  const templates = await getWorkflowTemplates();

  const departments = await prisma.department.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true },
  });

  const canManage = session.currentMembership?.systemRole === "OWNER" ||
                    session.currentMembership?.systemRole === "ADMIN";

  return <WorkflowsClient templates={templates} canManage={canManage} departments={departments} />;
}
