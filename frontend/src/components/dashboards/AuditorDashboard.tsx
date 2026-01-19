import { prisma } from "@/lib/prisma";
import { AuthSession } from "@/lib/auth-types";
import { Box, Typography, Card, CardContent, Grid, Button, Chip, Table, TableHead, TableRow, TableCell, TableBody, Paper, alpha } from "@mui/material";
import Link from "next/link";
import {
  KPICard,
  SectionCard,
  QuickAction,
  ActivityItem,
  DashboardEmptyState,
} from "./shared";

interface AuditorDashboardProps {
  session: AuthSession;
}

export async function AuditorDashboard({ session }: AuditorDashboardProps) {
  const orgId = session.currentOrgId!;
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    totalOffboardings,
    completedOffboardings,
    totalAuditLogs,
    recentLogsCount,
    totalEvidencePacks,
    sealedEvidencePacks,
    recentAuditLogs,
    recentOffboardings,
    evidencePacks,
  ] = await Promise.all([
    prisma.offboarding.count({ where: { organizationId: orgId } }),
    prisma.offboarding.count({
      where: { organizationId: orgId, status: "COMPLETED" },
    }),
    prisma.auditLog.count({ where: { organizationId: orgId } }),
    prisma.auditLog.count({
      where: { organizationId: orgId, createdAt: { gte: twentyFourHoursAgo } },
    }),
    prisma.evidencePack.count({ where: { offboarding: { organizationId: orgId } } }),
    prisma.evidencePack.count({ where: { offboarding: { organizationId: orgId }, sealed: true } }),
    prisma.auditLog.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.offboarding.findMany({
      where: { organizationId: orgId },
      include: {
        employee: { select: { firstName: true, lastName: true, email: true, employeeId: true } },
        tasks: { select: { id: true, status: true, completedAt: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.evidencePack.findMany({
      where: { offboarding: { organizationId: orgId } },
      include: {
        offboarding: {
          select: {
            employee: { select: { firstName: true, lastName: true } },
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const stats = [
    { label: "Total Offboardings", value: totalOffboardings, icon: "folder", color: "#00738a" },
    { label: "Completed Cases", value: completedOffboardings, icon: "check_circle", color: "#22c55e" },
    { label: "Evidence Packs", value: `${sealedEvidencePacks}/${totalEvidencePacks}`, icon: "inventory_2", color: "#3b82f6" },
    { label: "Actions (24h)", value: recentLogsCount, icon: "schedule", color: "#f59e0b" },
  ];

  const auditorActions = [
    { id: "audit", label: "View Audit Logs", description: "Full activity trail", icon: "receipt_long", href: "/app/audit-logs" },
    { id: "offboardings", label: "View Offboardings", description: "All offboarding cases", icon: "folder_open", href: "/app/offboardings" },
    { id: "employees", label: "View Employees", description: "Employee directory", icon: "people", href: "/app/employees" },
    { id: "reports", label: "Generate Report", description: "Export compliance data", icon: "analytics", href: "/app/reports" },
  ];

  const getActionIcon = (action: string) => {
    if (action.includes("CREATE")) return "add";
    if (action.includes("UPDATE")) return "edit";
    if (action.includes("DELETE")) return "delete";
    if (action.includes("LOGIN")) return "login";
    if (action.includes("LOGOUT")) return "logout";
    return "article";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return { bg: "#22c55e15", color: "#22c55e" };
      case "IN_PROGRESS": return { bg: "#f59e0b15", color: "#f59e0b" };
      case "PENDING": return { bg: "#3b82f615", color: "#3b82f6" };
      default: return { bg: "#6b728015", color: "#6b7280" };
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            Compliance Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Read-only audit and compliance overview for {session.currentMembership?.organization.name}
          </Typography>
        </Box>
        <Chip
          label="AUDITOR"
          sx={{ bgcolor: "#f59e0b", color: "white", fontWeight: 700, height: 28 }}
        />
      </Box>

      <Box
        sx={{
          p: 2,
          mb: 4,
          borderRadius: 2,
          bgcolor: alpha("#f59e0b", 0.1),
          border: "1px solid",
          borderColor: alpha("#f59e0b", 0.3),
          display: "flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        <span className="material-symbols-outlined" style={{ color: "#f59e0b" }}>
          info
        </span>
        <Typography variant="body2">
          <strong>Read-Only Access:</strong> As an auditor, you can view all records, export reports, and access evidence packs. 
          You cannot modify any data or system settings.
        </Typography>
      </Box>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {stats.map((stat) => (
          <Grid size={{ xs: 6, sm: 3 }} key={stat.label}>
            <KPICard
              label={stat.label}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
              size="sm"
            />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <SectionCard
            title="Audit Trail"
            icon="receipt_long"
            iconColor="#6b7280"
            badge={totalAuditLogs}
            action={
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button size="small" startIcon={<span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>}>
                  Export CSV
                </Button>
                <Link href="/app/audit-logs" passHref style={{ textDecoration: "none" }}>
                  <Button size="small">View All</Button>
                </Link>
              </Box>
            }
            noPadding
          >
            {recentAuditLogs.length === 0 ? (
              <DashboardEmptyState
                icon="receipt_long"
                iconColor="#6b7280"
                title="No Audit Records"
                description="Activity will be logged here"
              />
            ) : (
              <Paper variant="outlined" sx={{ borderRadius: 0, border: 0, overflow: "hidden" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "action.hover" }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>Timestamp</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>User</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>Action</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>Entity</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentAuditLogs.map((log) => (
                      <TableRow key={log.id} hover>
                        <TableCell>
                          <Typography variant="caption" fontFamily="monospace" sx={{ color: "text.secondary" }}>
                            {new Date(log.createdAt).toISOString().replace("T", " ").substring(0, 19)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontSize="0.8rem">{log.user?.name || log.user?.email || "System"}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={log.action.replace(/_/g, " ")}
                            sx={{ fontSize: "0.65rem", height: 22, fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary" fontSize="0.8rem">
                            {log.entityType} {log.entityId ? `#${log.entityId.substring(0, 8)}` : ""}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            )}
          </SectionCard>

          <Box sx={{ mt: 3 }}>
            <SectionCard
              title="Evidence Packs"
              icon="inventory_2"
              iconColor="#3b82f6"
              badge={`${sealedEvidencePacks} sealed`}
              badgeColor="#22c55e"
              noPadding
            >
              {evidencePacks.length === 0 ? (
                <DashboardEmptyState
                  icon="inventory_2"
                  iconColor="#3b82f6"
                  title="No Evidence Packs"
                  description="Evidence packs will appear when offboardings are completed"
                />
              ) : (
                <Box>
                  {evidencePacks.slice(0, 5).map((pack, idx) => (
                    <Box
                      key={pack.id}
                      sx={{
                        px: 3,
                        py: 2,
                        borderBottom: idx < evidencePacks.length - 1 ? "1px solid" : "none",
                        borderColor: "divider",
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 2,
                          bgcolor: pack.sealed ? alpha("#22c55e", 0.1) : alpha("#f59e0b", 0.1),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 20, color: pack.sealed ? "#22c55e" : "#f59e0b" }}
                        >
                          {pack.sealed ? "verified" : "pending"}
                        </span>
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {pack.offboarding.employee.firstName} {pack.offboarding.employee.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Created: {new Date(pack.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Chip
                          label={pack.sealed ? "Sealed" : "Pending"}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.65rem",
                            height: 22,
                            bgcolor: pack.sealed ? "#22c55e15" : "#f59e0b15",
                            color: pack.sealed ? "#22c55e" : "#f59e0b",
                          }}
                        />
                        <Chip
                          label={pack.offboarding.status.replace("_", " ")}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.65rem",
                            height: 22,
                            ...getStatusColor(pack.offboarding.status),
                          }}
                        />
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </SectionCard>
          </Box>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                Auditor Actions
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {auditorActions.map((action) => (
                  <QuickAction
                    key={action.id}
                    id={action.id}
                    label={action.label}
                    description={action.description}
                    icon={action.icon}
                    href={action.href}
                    color="#f59e0b"
                  />
                ))}
              </Box>
            </CardContent>
          </Card>

          <SectionCard
            title="Recent Cases"
            icon="folder_open"
            iconColor="#00738a"
            noPadding
          >
            {recentOffboardings.length === 0 ? (
              <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  No offboarding cases yet
                </Typography>
              </Box>
            ) : (
              <Box>
                {recentOffboardings.slice(0, 5).map((offboarding, idx) => {
                  const statusStyle = getStatusColor(offboarding.status);
                  return (
                    <Link
                      key={offboarding.id}
                      href={`/app/offboardings/${offboarding.id}`}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <Box
                        sx={{
                          p: 2,
                          borderBottom: idx < recentOffboardings.length - 1 ? "1px solid" : "none",
                          borderColor: "divider",
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                      >
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {offboarding.employee.firstName} {offboarding.employee.lastName}
                          </Typography>
                          <Chip
                            size="small"
                            label={offboarding.status.replace("_", " ")}
                            sx={{
                              fontSize: "0.6rem",
                              height: 20,
                              fontWeight: 600,
                              bgcolor: statusStyle.bg,
                              color: statusStyle.color,
                            }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          ID: {offboarding.employee.employeeId}
                        </Typography>
                      </Box>
                    </Link>
                  );
                })}
              </Box>
            )}
          </SectionCard>

          <Box sx={{ mt: 3 }}>
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#22c55e" }}>
                    verified
                  </span>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Compliance Summary
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body2" color="text.secondary">
                      Total Records
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {totalAuditLogs.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body2" color="text.secondary">
                      Sealed Packs
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {sealedEvidencePacks} / {totalEvidencePacks}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body2" color="text.secondary">
                      Completion Rate
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {totalOffboardings > 0 ? Math.round((completedOffboardings / totalOffboardings) * 100) : 0}%
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body2" color="text.secondary">
                      24h Activity
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {recentLogsCount} events
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
