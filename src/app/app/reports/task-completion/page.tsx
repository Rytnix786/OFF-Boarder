import { requireActiveOrg } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma.server";
import { withPrismaRetry } from "@/lib/prisma-resilience";
import { Box, Typography, Card, CardContent, Grid, Chip, Table, TableHead, TableRow, TableCell, TableBody, Paper, Button, LinearProgress } from "@mui/material";
import Link from "next/link";
import { ReportFilters } from "../ReportFilters";

interface PageProps {
  searchParams: Promise<{ status?: string; from?: string; to?: string }>;
}

export default async function TaskCompletionReport({ searchParams }: PageProps) {
  const session = await requireActiveOrg();
  const orgId = session.currentOrgId!;
  const params = await searchParams;

  const whereClause: any = { offboarding: { organizationId: orgId } };
  
  if (params.status) {
    whereClause.status = params.status;
  }
  if (params.from) {
    whereClause.createdAt = { ...whereClause.createdAt, gte: new Date(params.from) };
  }
  if (params.to) {
    whereClause.createdAt = { ...whereClause.createdAt, lte: new Date(params.to) };
  }

  const [tasks, statusCounts, overdueTasks] = await withPrismaRetry(() => Promise.all([
    prisma.offboardingTask.findMany({
      where: whereClause,
      include: {
        offboarding: {
          select: {
            employee: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.offboardingTask.groupBy({
      by: ["status"],
      where: { offboarding: { organizationId: orgId } },
      _count: { status: true },
    }),
    prisma.offboardingTask.count({
      where: {
        offboarding: { organizationId: orgId },
        status: { in: ["PENDING", "IN_PROGRESS"] },
        dueDate: { lt: new Date() },
      },
    }),
  ]), { retries: 2, baseDelayMs: 250 });

  const totalCount = statusCounts.reduce((acc, s) => acc + s._count.status, 0);
  const completedCount = statusCounts.find((s) => s.status === "COMPLETED")?._count.status || 0;
  const inProgressCount = statusCounts.find((s) => s.status === "IN_PROGRESS")?._count.status || 0;
  const pendingCount = statusCounts.find((s) => s.status === "PENDING")?._count.status || 0;
  const skippedCount = statusCounts.find((s) => s.status === "SKIPPED")?._count.status || 0;

  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const stats = [
    { label: "Total Tasks", value: totalCount, color: "#00738a" },
    { label: "Completed", value: completedCount, color: "#22c55e" },
    { label: "In Progress", value: inProgressCount, color: "#f59e0b" },
    { label: "Overdue", value: overdueTasks, color: "#ef4444" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return "success";
      case "IN_PROGRESS": return "warning";
      case "SKIPPED": return "default";
      default: return "default";
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Link href="/app/reports" style={{ textDecoration: "none", color: "inherit" }}>
              <Typography variant="body2" color="text.secondary" sx={{ "&:hover": { textDecoration: "underline" } }}>
                Reports
              </Typography>
            </Link>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#888" }}>chevron_right</span>
            <Typography variant="body2">Task Completion Report</Typography>
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
            Task Completion Report
          </Typography>
          <Typography color="text.secondary">
            Analysis of task completion rates and timelines
          </Typography>
        </Box>
        <Link href={`/api/reports/task-completion/export?${new URLSearchParams(params as any).toString()}`} target="_blank">
          <Button
            variant="contained"
            startIcon={<span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>}
          >
            Export CSV
          </Button>
        </Link>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat) => (
          <Grid size={{ xs: 6, sm: 3 }} key={stat.label}>
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="h4" sx={{ fontWeight: 900, color: stat.color }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Overall Completion Rate
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <LinearProgress
              variant="determinate"
              value={completionRate}
              sx={{ flex: 1, height: 12, borderRadius: 2 }}
            />
            <Typography variant="h5" fontWeight={700}>
              {completionRate}%
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <ReportFilters
        showStatus
        statusOptions={["PENDING", "IN_PROGRESS", "COMPLETED", "SKIPPED"]}
        showDateRange
      />

      <Card variant="outlined" sx={{ borderRadius: 3, mt: 3 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Tasks ({tasks.length})
            </Typography>
          </Box>
          <Paper variant="outlined" sx={{ borderRadius: 0, border: 0 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "action.hover" }}>
                  <TableCell sx={{ fontWeight: 700 }}>Task Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Due Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Completed</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tasks.map((task) => {
                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "COMPLETED";
                  return (
                    <TableRow key={task.id} hover sx={{ bgcolor: isOverdue ? "rgba(239, 68, 68, 0.05)" : "transparent" }}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {task.name}
                        </Typography>
                        {task.description && (
                          <Typography variant="caption" color="text.secondary">
                            {task.description.substring(0, 50)}...
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {task.offboarding.employee.firstName} {task.offboarding.employee.lastName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={task.status.replace("_", " ")}
                          color={getStatusColor(task.status) as any}
                          sx={{ fontSize: "0.7rem" }}
                        />
                      </TableCell>
                      <TableCell>
                          <Typography variant="caption" color={isOverdue ? "error" : "text.secondary"}>
                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-US") : "-"}
                            {isOverdue && " (Overdue)"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {task.completedAt ? new Date(task.completedAt).toLocaleDateString("en-US") : "-"}
                          </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {tasks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ textAlign: "center", py: 4 }}>
                      <Typography color="text.secondary">No tasks found</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </CardContent>
      </Card>
    </Box>
  );
}
