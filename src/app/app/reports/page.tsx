import { requireActiveOrg } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma.server";
import { withPrismaRetry } from "@/lib/prisma-resilience";
import { Box, Typography, Card, CardContent, Grid, Chip } from "@mui/material";
import Link from "next/link";
import { ReportCard } from "./ReportCard";

export default async function ReportsPage() {
  const session = await requireActiveOrg();
  const orgId = session.currentOrgId!;

  const [
    totalOffboardings,
    completedOffboardings,
    totalEmployees,
    totalAuditLogs,
    totalTasks,
    completedTasks,
  ] = await withPrismaRetry(() => Promise.all([
    prisma.offboarding.count({ where: { organizationId: orgId } }),
    prisma.offboarding.count({ where: { organizationId: orgId, status: "COMPLETED" } }),
    prisma.employee.count({ where: { organizationId: orgId } }),
    prisma.auditLog.count({ where: { organizationId: orgId } }),
    prisma.offboardingTask.count({ where: { offboarding: { organizationId: orgId } } }),
    prisma.offboardingTask.count({ where: { offboarding: { organizationId: orgId }, status: "COMPLETED" } }),
  ]), { retries: 2, baseDelayMs: 250 });

  const reports = [
    {
      id: "offboarding-summary",
      title: "Offboarding Summary",
      description: "Overview of all offboarding cases with status breakdown",
      icon: "group_remove",
      stats: `${completedOffboardings}/${totalOffboardings} completed`,
      href: "/app/reports/offboarding-summary",
    },
    {
      id: "compliance",
      title: "Compliance Report",
      description: "Audit trail and compliance evidence for all processes",
      icon: "verified",
      stats: `${totalAuditLogs} audit entries`,
      href: "/app/reports/compliance",
    },
    {
      id: "task-completion",
      title: "Task Completion Report",
      description: "Analysis of task completion rates and timelines",
      icon: "task_alt",
      stats: `${completedTasks}/${totalTasks} tasks completed`,
      href: "/app/reports/task-completion",
    },
    {
      id: "employee-directory",
      title: "Employee Directory Export",
      description: "Export full employee directory with department data",
      icon: "download",
      stats: `${totalEmployees} employees`,
      href: "/app/reports/employee-directory",
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          Reports
        </Typography>
        <Typography color="text.secondary">
          Generate and export compliance reports and analytics
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {reports.map((report) => (
          <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={report.id}>
            <ReportCard report={report} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
