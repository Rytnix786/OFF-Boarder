import { redirect } from "next/navigation";
import { getOrgViewSession } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma.server";
import { Box, Typography, Grid, alpha } from "@mui/material";
import { OrgViewPageHeader } from "../OrgViewPageHeader";
import { OrgViewReportCard } from "./OrgViewReportCard";

export default async function OrgViewReportsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const session = await getOrgViewSession(orgId);

  if (!session) {
    redirect("/admin/org-view/select");
  }

  const dbOrgId = session.currentOrgId!;

  const [
    totalOffboardings,
    completedOffboardings,
    totalEmployees,
    totalAuditLogs,
    totalTasks,
    completedTasks,
  ] = await Promise.all([
    prisma.offboarding.count({ where: { organizationId: dbOrgId } }),
    prisma.offboarding.count({ where: { organizationId: dbOrgId, status: "COMPLETED" } }),
    prisma.employee.count({ where: { organizationId: dbOrgId } }),
    prisma.auditLog.count({ where: { organizationId: dbOrgId } }),
    prisma.offboardingTask.count({ where: { offboarding: { organizationId: dbOrgId } } }),
    prisma.offboardingTask.count({ where: { offboarding: { organizationId: dbOrgId }, status: "COMPLETED" } }),
  ]);

  const reports = [
    {
      id: "offboarding-summary",
      title: "Offboarding Summary",
      description: "Overview of all offboarding cases with status breakdown",
      icon: "group_remove",
      stats: `${completedOffboardings}/${totalOffboardings} completed`,
      color: "#6366f1",
    },
    {
      id: "compliance",
      title: "Compliance Report",
      description: "Audit trail and compliance evidence for all processes",
      icon: "verified",
      stats: `${totalAuditLogs} audit entries`,
      color: "#10b981",
    },
    {
      id: "task-completion",
      title: "Task Completion Report",
      description: "Analysis of task completion rates and timelines",
      icon: "task_alt",
      stats: `${completedTasks}/${totalTasks} tasks completed`,
      color: "#f59e0b",
    },
    {
      id: "employee-directory",
      title: "Employee Directory Export",
      description: "Export full employee directory with department data",
      icon: "download",
      stats: `${totalEmployees} employees`,
      color: "#3b82f6",
    },
  ];

  return (
    <Box>
      <OrgViewPageHeader 
        title="Compliance Reports"
        description={`Audit-ready reports and exports for ${session.currentMembership?.organization.name}.`}
        icon="analytics"
      />

        <Box sx={{ px: { xs: 3, md: 6 }, pb: 6 }}>
          <Grid container spacing={3}>
            {reports.map((report) => (
              <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={report.id}>
                <OrgViewReportCard report={report} orgId={orgId} />
              </Grid>
            ))}
          </Grid>
        </Box>
    </Box>
  );
}
