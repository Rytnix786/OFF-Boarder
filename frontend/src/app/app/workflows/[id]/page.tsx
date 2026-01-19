import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission } from "@/lib/rbac";
import { getWorkflowTemplate } from "@/lib/actions/workflows";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import WorkflowDetailClient from "./WorkflowDetailClient";

export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireActiveOrg();
  await requirePermission(session, "offboarding:read");

  const template = await getWorkflowTemplate(id);

  if (!template) notFound();

  const orgId = session.currentOrgId!;

  const departments = await prisma.department.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true },
  });

  const canManage = session.currentMembership?.systemRole === "OWNER" ||
                    session.currentMembership?.systemRole === "ADMIN";

  return <WorkflowDetailClient template={template} canManage={canManage} departments={departments} />;
}
