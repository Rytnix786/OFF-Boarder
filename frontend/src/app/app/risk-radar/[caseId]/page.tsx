import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission, isUserOffboardingSubject } from "@/lib/rbac.server";
import { getRiskRadarCaseDetail } from "@/lib/actions/risk-radar";
import { notFound, redirect } from "next/navigation";
import RiskCaseDetailClient from "./RiskCaseDetailClient";

export default async function RiskRadarCaseDetailPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const session = await requireActiveOrg();
  await requirePermission(session, "risk:read");

  const isSubject = await isUserOffboardingSubject(session.user.id, session.currentOrgId!, caseId);
  if (isSubject) {
    redirect("/app/access-denied?reason=You%20cannot%20view%20your%20own%20offboarding%20case");
  }

  const result = await getRiskRadarCaseDetail(caseId);
  
  if (result.error || !result.offboarding) {
    notFound();
  }

  const canManage = session.currentMembership?.systemRole === "OWNER" ||
                    session.currentMembership?.systemRole === "ADMIN";

  return (
    <RiskCaseDetailClient
      offboarding={result.offboarding as any}
      securityEvents={result.securityEvents || []}
      auditLogs={result.auditLogs || []}
      canManage={canManage}
    />
  );
}
