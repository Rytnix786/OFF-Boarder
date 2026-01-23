import { redirect } from "next/navigation";
import { getOrgViewSession } from "@/lib/auth.server";
import { AuditorDashboard } from "@/components/dashboards";
import { Box, Grid, Typography, Card, CardContent } from "@mui/material";

export default async function OrgViewDashboard({
  params,
}: {
  params: { orgId: string };
}) {
  const session = await getOrgViewSession(params.orgId);

  if (!session) {
    redirect("/admin/org-view/select");
  }

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Organization Overview
        </Typography>
        <Typography color="text.secondary">
          Viewing {session.currentMembership?.organization.name} as Platform Admin.
        </Typography>
      </Box>

      {/* Reuse the AuditorDashboard for read-only view */}
      <AuditorDashboard session={session} isOrgView={true} />
    </Box>
  );
}
