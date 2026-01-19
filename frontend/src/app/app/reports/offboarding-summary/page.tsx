import { requireActiveOrg } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";
import { Box, Typography, Card, CardContent, Grid, Chip, Table, TableHead, TableRow, TableCell, TableBody, Paper, Button, LinearProgress } from "@mui/material";
import Link from "next/link";
import { ReportFilters } from "../ReportFilters";

interface PageProps {
  searchParams: Promise<{ status?: string; department?: string; from?: string; to?: string }>;
}

export default async function OffboardingSummaryReport({ searchParams }: PageProps) {
  const session = await requireActiveOrg();
  const orgId = session.currentOrgId!;
  const params = await searchParams;

  const whereClause: any = { organizationId: orgId };
  
  if (params.status) {
    whereClause.status = params.status;
  }
  if (params.from) {
    whereClause.createdAt = { ...whereClause.createdAt, gte: new Date(params.from) };
  }
  if (params.to) {
    whereClause.createdAt = { ...whereClause.createdAt, lte: new Date(params.to) };
  }

  const [offboardings, statusCounts] = await Promise.all([
    prisma.offboarding.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            employeeId: true,
            department: { select: { name: true } },
          },
        },
        tasks: { select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.offboarding.groupBy({
      by: ["status"],
      where: { organizationId: orgId },
      _count: { status: true },
    }),
  ]);

  const totalCount = statusCounts.reduce((acc, s) => acc + s._count.status, 0);
  const completedCount = statusCounts.find((s) => s.status === "COMPLETED")?._count.status || 0;
  const inProgressCount = statusCounts.find((s) => s.status === "IN_PROGRESS")?._count.status || 0;
  const pendingCount = statusCounts.find((s) => s.status === "PENDING")?._count.status || 0;

  const stats = [
    { label: "Total Offboardings", value: totalCount, color: "#00738a" },
    { label: "Completed", value: completedCount, color: "#22c55e" },
    { label: "In Progress", value: inProgressCount, color: "#f59e0b" },
    { label: "Pending", value: pendingCount, color: "#3b82f6" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return "success";
      case "IN_PROGRESS": return "warning";
      case "CANCELLED": return "error";
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
            <Typography variant="body2">Offboarding Summary</Typography>
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
            Offboarding Summary Report
          </Typography>
          <Typography color="text.secondary">
            Overview of all offboarding cases with status breakdown
          </Typography>
        </Box>
        <Link href={`/api/reports/offboarding-summary/export?${new URLSearchParams(params as any).toString()}`} target="_blank">
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

      <ReportFilters
        showStatus
        statusOptions={["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]}
        showDateRange
      />

      <Card variant="outlined" sx={{ borderRadius: 3, mt: 3 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Offboarding Cases ({offboardings.length})
            </Typography>
          </Box>
          <Paper variant="outlined" sx={{ borderRadius: 0, border: 0 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "action.hover" }}>
                  <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Employee ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Department</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Progress</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Scheduled</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {offboardings.map((offboarding) => {
                  const completedTasks = offboarding.tasks.filter((t) => t.status === "COMPLETED" || t.status === "SKIPPED").length;
                  const progress = offboarding.tasks.length > 0
                    ? Math.round((completedTasks / offboarding.tasks.length) * 100)
                    : 0;
                  return (
                    <TableRow key={offboarding.id} hover>
                      <TableCell>
                        <Link href={`/app/offboardings/${offboarding.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                          <Typography variant="body2" fontWeight={600} sx={{ "&:hover": { textDecoration: "underline" } }}>
                            {offboarding.employee.firstName} {offboarding.employee.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {offboarding.employee.email}
                          </Typography>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {offboarding.employee.employeeId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {offboarding.employee.department?.name || "-"}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={offboarding.status.replace("_", " ")}
                          color={getStatusColor(offboarding.status) as any}
                          sx={{ fontSize: "0.7rem" }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={progress}
                            sx={{ flex: 1, height: 6, borderRadius: 3, minWidth: 60 }}
                          />
                          <Typography variant="caption">{progress}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {new Date(offboarding.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {offboarding.scheduledDate
                            ? new Date(offboarding.scheduledDate).toLocaleDateString()
                            : "-"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {offboardings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: "center", py: 4 }}>
                      <Typography color="text.secondary">No offboardings found</Typography>
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
