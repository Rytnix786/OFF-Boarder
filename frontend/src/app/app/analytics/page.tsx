import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission, isAdmin } from "@/lib/rbac";
import { getEnhancedAnalytics, type EnhancedAnalyticsData } from "@/lib/cache";
import AnalyticsDashboardClient from "./AnalyticsDashboardClient";
import { redirect } from "next/navigation";

export default async function AnalyticsPage() {
  const session = await requireActiveOrg();
  await requirePermission(session, "offboarding:read");

  if (!isAdmin(session) && session.currentMembership?.systemRole !== "AUDITOR") {
    redirect("/app/access-denied");
  }

  const analytics: EnhancedAnalyticsData = await getEnhancedAnalytics(session.currentOrgId!);

  return <AnalyticsDashboardClient analytics={analytics} />;
}
