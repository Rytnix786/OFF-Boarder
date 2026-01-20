import { requireActiveOrg } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma.server";
import { Box, Typography, Card, CardContent, Grid, Chip, Table, TableHead, TableRow, TableCell, TableBody, Paper, Button } from "@mui/material";
import Link from "next/link";
import { ReportFilters } from "../ReportFilters";

interface PageProps {
  searchParams: Promise<{ department?: string; status?: string }>;
}

export default async function EmployeeDirectoryReport({ searchParams }: PageProps) {
  const session = await requireActiveOrg();
  const orgId = session.currentOrgId!;
  const params = await searchParams;

  const whereClause: any = { organizationId: orgId };
  
  if (params.department) {
    whereClause.departmentId = params.department;
  }
  if (params.status) {
    whereClause.status = params.status;
  }

  const [employees, departments, statusCounts] = await Promise.all([
    prisma.employee.findMany({
      where: whereClause,
      include: {
        department: { select: { name: true } },
        location: { select: { name: true } },
        jobTitle: { select: { title: true } },
        managerMembership: { select: { user: { select: { name: true } } } },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 200,
    }),
    prisma.department.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true },
    }),
    prisma.employee.groupBy({
      by: ["status"],
      where: { organizationId: orgId },
      _count: { status: true },
    }),
  ]);

  const totalCount = statusCounts.reduce((acc, s) => acc + s._count.status, 0);
  const activeCount = statusCounts.find((s) => s.status === "ACTIVE")?._count.status || 0;
  const offboardingCount = statusCounts.find((s) => s.status === "OFFBOARDING")?._count.status || 0;
  const terminatedCount = statusCounts.find((s) => s.status === "TERMINATED")?._count.status || 0;

  const stats = [
    { label: "Total Employees", value: totalCount, color: "#00738a" },
    { label: "Active", value: activeCount, color: "#22c55e" },
    { label: "Offboarding", value: offboardingCount, color: "#f59e0b" },
    { label: "Terminated", value: terminatedCount, color: "#6b7280" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "success";
      case "OFFBOARDING": return "warning";
      case "TERMINATED": return "default";
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
            <Typography variant="body2">Employee Directory</Typography>
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
            Employee Directory Export
          </Typography>
          <Typography color="text.secondary">
            Full employee directory with department and organizational data
          </Typography>
        </Box>
        <Link href={`/api/reports/employee-directory/export?${new URLSearchParams(params as any).toString()}`} target="_blank">
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
        statusOptions={["ACTIVE", "OFFBOARDING", "TERMINATED", "ON_LEAVE", "ARCHIVED"]}
        showDepartment
        departments={departments}
      />

      <Card variant="outlined" sx={{ borderRadius: 3, mt: 3 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Employees ({employees.length})
            </Typography>
          </Box>
          <Paper variant="outlined" sx={{ borderRadius: 0, border: 0, overflow: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "action.hover" }}>
                  <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Employee ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Department</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Job Title</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Manager</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Hire Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id} hover>
                    <TableCell>
                      <Link href={`/app/employees/${employee.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                        <Typography variant="body2" fontWeight={600} sx={{ "&:hover": { textDecoration: "underline" } }}>
                          {employee.firstName} {employee.lastName}
                        </Typography>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {employee.employeeId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{employee.email}</Typography>
                    </TableCell>
                    <TableCell>{employee.department?.name || "-"}</TableCell>
                    <TableCell>{employee.jobTitle?.title || "-"}</TableCell>
                    <TableCell>{employee.location?.name || "-"}</TableCell>
                    <TableCell>
                      {employee.managerMembership?.user?.name || "-"}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={employee.status}
                        color={getStatusColor(employee.status) as any}
                        sx={{ fontSize: "0.7rem" }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {employee.hireDate
                          ? new Date(employee.hireDate).toLocaleDateString()
                          : "-"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
                {employees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} sx={{ textAlign: "center", py: 4 }}>
                      <Typography color="text.secondary">No employees found</Typography>
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
