import { requireActiveOrg } from "@/lib/auth.server";
import { AdminDashboard, AuditorDashboard, MemberDashboard } from "@/components/dashboards";
import { isAdminRole, isAuditorRole } from "@/lib/permissions";

export default async function AppDashboard() {
  const session = await requireActiveOrg();
  const role = session.currentMembership!.systemRole;

  if (isAdminRole(role)) {
    return <AdminDashboard session={session} />;
  }

  if (isAuditorRole(role)) {
    return <AuditorDashboard session={session} />;
  }

  return <MemberDashboard session={session} />;
}
