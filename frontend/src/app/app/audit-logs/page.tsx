import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission } from "@/lib/rbac.server";
import { getAuditLogs } from "@/lib/audit.server";
import AuditLogsClient from "./AuditLogsClient";

export default async function AuditLogsPage() {
  const session = await requireActiveOrg();
  await requirePermission(session, "audit:read");

  const { logs, total } = await getAuditLogs(session.currentOrgId!, { limit: 100 });

  return <AuditLogsClient logs={logs} total={total} />;
}
