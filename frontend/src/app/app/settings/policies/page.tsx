import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth.server";
import { isAdmin } from "@/lib/rbac";
import { getAllPolicies, getEnforcementLogs } from "@/lib/security-policies";
import { CATEGORY_INFO } from "@/lib/policy-definitions";
import SecurityPoliciesClient from "./SecurityPoliciesClient";

export default async function SecurityPoliciesPage() {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login");
  }

  if (!session.currentOrgId) {
    redirect("/app/pending");
  }

  if (!isAdmin(session)) {
    redirect("/app/access-denied");
  }

  const policies = await getAllPolicies(session.currentOrgId);
  const enforcementLogs = await getEnforcementLogs(session.currentOrgId, 20);

  return (
    <SecurityPoliciesClient 
      policies={policies} 
      enforcementLogs={enforcementLogs}
      categoryInfo={CATEGORY_INFO}
    />
  );
}
