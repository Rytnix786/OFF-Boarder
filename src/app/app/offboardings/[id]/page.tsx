import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission, isAdmin, isUserOffboardingSubject } from "@/lib/rbac.server";
import { prisma } from "@/lib/prisma.server";
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

  const offboarding = await prisma.offboarding.findUnique({
    where: { id },
  });
  
  if (!offboarding || offboarding.organizationId !== session.currentOrgId) notFound();
  
  const [employee, tasks, approvals, assetReturns, evidencePack, monitoringEvents, workflowTemplate] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: offboarding.employeeId },
      include: {
        department: true,
        jobTitle: true,
        location: true,
        managerMembership: { 
          select: { 
            id: true, 
            user: { select: { name: true, email: true } } 
          } 
        },
      },
    }),
    prisma.offboardingTask.findMany({
      where: { offboardingId: id },
      orderBy: { order: "asc" },
      include: {
        evidence: true,
      },
    }),
    prisma.approval.findMany({
      where: { offboardingId: id },
      include: {
        approver: { select: { id: true, name: true, email: true } },
        task: { select: { name: true } },
      },
      orderBy: [{ approvalOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.assetReturn.findMany({
      where: { offboardingId: id },
      include: {
        asset: true,
      },
    }),
    prisma.evidencePack.findUnique({
      where: { offboardingId: id },
    }),
    prisma.monitoringEvent.findMany({
      where: { offboardingId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    offboarding.workflowTemplateId ? prisma.workflowTemplate.findUnique({
      where: { id: offboarding.workflowTemplateId },
      select: { name: true },
    }) : null,
  ]);
  
  const fullOffboarding = {
    ...offboarding,
    employee,
    tasks,
    approvals,
    assetReturns,
    evidencePack,
    monitoringEvents,
    workflowTemplate,
  };

  const canUpdate = session.currentMembership?.systemRole === "OWNER" ||
                    session.currentMembership?.systemRole === "ADMIN";

  const canApprove = isAdmin(session);

  return (
    <OffboardingDetailClient 
      offboarding={fullOffboarding as any} 
      canUpdate={canUpdate} 
      canApprove={canApprove}
    />
  );
}
