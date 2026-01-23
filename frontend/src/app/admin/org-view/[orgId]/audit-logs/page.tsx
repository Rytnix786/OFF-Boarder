import { redirect } from "next/navigation";
import { getOrgViewSession } from "@/lib/auth.server";
import { getAuditLogs } from "@/lib/audit.server";
import AuditLogsClient from "@/app/app/audit-logs/AuditLogsClient";
import { Box } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { OrgViewPageHeader } from "../OrgViewPageHeader";

export default async function OrgViewAuditLogsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const session = await getOrgViewSession(orgId);

  if (!session) {
    redirect("/admin/org-view/select");
  }

  const { logs, total } = await getAuditLogs(session.currentOrgId!, { limit: 100 });

  return (
    <Box>
      <OrgViewPageHeader 
        title="Audit Trail"
        description={`Full immutable activity history for ${session.currentMembership?.organization.name}.`}
        icon="shield"
      />

      <Box sx={{ px: { xs: 3, md: 6 }, pb: 6 }}>
        <Box
          sx={{
            bgcolor: alpha("#0f172a", 0.3),
            borderRadius: "32px",
            border: "1px solid",
            borderColor: alpha("#ffffff", 0.05),
            p: { xs: 2, md: 4 },
            boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
            position: "relative",
            overflow: "hidden",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "2px",
              background: `linear-gradient(90deg, transparent, ${alpha("#818cf8", 0.5)}, transparent)`,
            }
          }}
        >
          <AuditLogsClient logs={logs} total={total} />
        </Box>
      </Box>
    </Box>
  );
}
