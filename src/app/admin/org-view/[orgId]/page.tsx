import { redirect } from "next/navigation";
import { getOrgViewSession } from "@/lib/auth.server";
import { OrgViewDashboardClient } from "./OrgViewDashboardClient";
import { AuditorDashboard } from "@/components/dashboards";

export default async function OrgViewDashboard({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const session = await getOrgViewSession(orgId);

  if (!session) {
    redirect("/admin/org-view/select");
  }

  return (
    <OrgViewDashboardClient 
      organizationName={session.currentMembership?.organization.name || "Unknown Org"}
    >
      <AuditorDashboard session={session} isOrgView={true} />
    </OrgViewDashboardClient>
  );
}
