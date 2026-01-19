import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission, isAdmin, isUserOffboardingSubject } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import OffboardingDetailClient from "./OffboardingDetailClient";

export default async function OffboardingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireActiveOrg();
  await requirePermission(session, "offboarding:read");

  const isSubject = await isUserOffboardingSubject(session.user.id, session.currentOrgId!, id);
  if (isSubject) {
    redirect("/app/access-denied?reason=You%20cannot%20view%20your%20own%20offboarding%20case");
  }

  const offboarding = await prisma.offboarding.findFirst({
    where: { id, organizationId: session.currentOrgId! },
    include: {
      employee: {
        include: {
          department: true,
          jobTitle: true,
          location: true,
          manager: { select: { id: true, firstName: true, lastName: true } },
        },
      },
      tasks: { orderBy: { order: "asc" } },
      approvals: {
        include: {
          approver: { select: { id: true, name: true, email: true } },
          task: { select: { name: true } },
        },
        orderBy: [{ approvalOrder: "asc" }, { createdAt: "asc" }],
      },
      assetReturns: {
        include: {
          asset: true,
        },
      },
      evidencePack: true,
      monitoringEvents: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      workflowTemplate: { select: { name: true } },
    },
  });

  if (!offboarding) notFound();

  const canUpdate = session.currentMembership?.systemRole === "OWNER" ||
                    session.currentMembership?.systemRole === "ADMIN";

  const canApprove = isAdmin(session);

  return (
    <OffboardingDetailClient 
      offboarding={offboarding as any} 
      canUpdate={canUpdate} 
      canApprove={canApprove}
    />
  );
}
