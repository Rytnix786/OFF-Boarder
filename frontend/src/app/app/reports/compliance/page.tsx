import { requireActiveOrg } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma.server";
import { Box, Typography, Card, CardContent, Grid, Chip, Table, TableHead, TableRow, TableCell, TableBody, Paper, Button } from "@mui/material";
import Link from "next/link";
import { ReportFilters } from "../ReportFilters";

interface PageProps {
  searchParams: Promise<{ action?: string; from?: string; to?: string }>;
}

export default async function ComplianceReport({ searchParams }: PageProps) {
  const session = await requireActiveOrg();
  const orgId = session.currentOrgId!;
  const params = await searchParams;

  const whereClause: any = { organizationId: orgId };
  
  if (params.action) {
    whereClause.action = params.action;
  }
  if (params.from) {
    whereClause.createdAt = { ...whereClause.createdAt, gte: new Date(params.from) };
  }
  if (params.to) {
    whereClause.createdAt = { ...whereClause.createdAt, lte: new Date(params.to) };
  }

  const [auditLogs, actionCounts, totalLogs] = await Promise.all([
    prisma.auditLog.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.auditLog.groupBy({
      by: ["action"],
      where: { organizationId: orgId },
      _count: { action: true },
    }),
    prisma.auditLog.count({ where: { organizationId: orgId } }),
  ]);

  const last24h = await prisma.auditLog.count({
    where: {
      organizationId: orgId,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });

  const last7d = await prisma.auditLog.count({
    where: {
      organizationId: orgId,
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
  });

  const uniqueActions = actionCounts.length;

  const stats = [
    { label: "Total Audit Entries", value: totalLogs, color: "#00738a" },
    { label: "Last 24 Hours", value: last24h, color: "#22c55e" },
    { label: "Last 7 Days", value: last7d, color: "#f59e0b" },
    { label: "Unique Actions", value: uniqueActions, color: "#8b5cf6" },
  ];

  const actionOptions = actionCounts.map((a) => a.action);

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
            <Typography variant="body2">Compliance Report</Typography>
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
            Compliance Report
          </Typography>
          <Typography color="text.secondary">
            Audit trail and compliance evidence for all processes
          </Typography>
        </Box>
        <Link href={`/api/reports/compliance/export?${new URLSearchParams(params as any).toString()}`} target="_blank">
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
        statusOptions={actionOptions}
        showDateRange
      />

      <Card variant="outlined" sx={{ borderRadius: 3, mt: 3 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Audit Trail ({auditLogs.length})
            </Typography>
          </Box>
          <Paper variant="outlined" sx={{ borderRadius: 0, border: 0 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "action.hover" }}>
                  <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Entity Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Entity ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>IP Address</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      <Typography variant="caption" fontFamily="monospace">
                        {new Date(log.createdAt).toISOString().replace("T", " ").substring(0, 19)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {log.user?.name || log.user?.email || "System"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={log.action.replace(/_/g, " ")}
                        sx={{ fontSize: "0.7rem" }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{log.entityType}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" fontFamily="monospace">
                        {log.entityId ? log.entityId.substring(0, 8) + "..." : "-"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" fontFamily="monospace">
                        {log.ipAddress || "-"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
                {auditLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ textAlign: "center", py: 4 }}>
                      <Typography color="text.secondary">No audit logs found</Typography>
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
