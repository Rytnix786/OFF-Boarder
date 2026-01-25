import { prisma } from "@/lib/prisma.server";
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
  isOrgView?: boolean;
}

export async function AuditorDashboard({ session, isOrgView }: AuditorDashboardProps) {
  const orgId = session.currentOrgId!;
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      activeEmployees,
      pendingOffboardings,
      highRiskEvents,
      lastAuditLog,
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
      prisma.employee.count({ where: { organizationId: orgId, status: "ACTIVE" } }),
      prisma.offboarding.count({ 
        where: { 
          organizationId: orgId, 
          status: { in: ["PENDING", "IN_PROGRESS", "PENDING_APPROVAL"] } 
        } 
      }),
      prisma.monitoringEvent.count({
        where: { 
          organizationId: orgId, 
          severity: { in: ["HIGH", "CRITICAL"] },
          acknowledged: false
        }
      }),
      prisma.auditLog.findFirst({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true }
      }),
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

    const lastSyncText = lastAuditLog 
      ? (() => {
          const diff = now.getTime() - lastAuditLog.createdAt.getTime();
          const mins = Math.floor(diff / 60000);
          if (mins < 1) return "Just now";
          if (mins < 60) return `${mins}m ago`;
          const hours = Math.floor(mins / 60);
          if (hours < 24) return `${hours}h ago`;
          return `${Math.floor(hours / 24)}d ago`;
        })()
      : "Never";

    const stats = [
      { label: "Active Employees", value: activeEmployees, icon: "badge", color: "#6366f1" },
      { label: "Pending Offboardings", value: pendingOffboardings, icon: "schedule", color: "#f59e0b" },
      { label: "Risk Signals", value: highRiskEvents > 0 ? "High" : "Normal", icon: "warning", color: highRiskEvents > 0 ? "#ef4444" : "#10b981" },
      { label: "Last Sync", value: lastSyncText, icon: "sync", color: "#3b82f6" },
    ];

    const auditorActions = [
      { id: "audit", label: "View Audit Logs", description: "Full activity trail", icon: "receipt_long", href: isOrgView ? `/admin/org-view/${orgId}/audit-logs` : "/app/audit-logs" },
      { id: "offboardings", label: "View Offboardings", description: "All offboarding cases", icon: "folder_open", href: isOrgView ? `/admin/org-view/${orgId}/offboardings` : "/app/offboardings" },
      { id: "employees", label: "View Employees", description: "Employee directory", icon: "people", href: isOrgView ? `/admin/org-view/${orgId}/employees` : "/app/employees" },
      { id: "reports", label: "Generate Report", description: "Export compliance data", icon: "analytics", href: isOrgView ? `/admin/org-view/${orgId}/reports` : "/app/reports" },
    ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return { bg: alpha("#10b981", 0.1), color: "#10b981" };
      case "IN_PROGRESS": return { bg: alpha("#f59e0b", 0.1), color: "#f59e0b" };
      case "PENDING": return { bg: alpha("#3b82f6", 0.1), color: "#3b82f6" };
      default: return { bg: alpha("#64748b", 0.1), color: "#64748b" };
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, mb: 1, color: "#f8fafc", letterSpacing: "-0.02em" }}>
            Audit Command Center
          </Typography>
          <Typography variant="body1" sx={{ color: "#94a3b8", fontWeight: 500 }}>
            Read-only audit and compliance overview for <span style={{ color: "#f8fafc", fontWeight: 700 }}>{session.currentMembership?.organization.name}</span>
          </Typography>
        </Box>
        <Chip
          label="AUDITOR ACCESS"
          sx={{ 
            bgcolor: alpha("#f59e0b", 0.1), 
            color: "#f59e0b", 
            fontWeight: 800, 
            height: 28,
            fontSize: "0.7rem",
            letterSpacing: "0.05em",
            border: "1px solid",
            borderColor: alpha("#f59e0b", 0.3)
          }}
        />
      </Box>

      <Box
        sx={{
          p: 3,
          mb: 5,
          borderRadius: "16px",
          bgcolor: alpha("#f59e0b", 0.03),
          border: "1px solid",
          borderColor: alpha("#f59e0b", 0.2),
          display: "flex",
          alignItems: "flex-start",
          gap: 2.5,
          position: "relative",
          overflow: "hidden"
        }}
      >
        <Box sx={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          width: 40,
          height: 40,
          borderRadius: "10px",
          bgcolor: alpha("#f59e0b", 0.1),
          flexShrink: 0
        }}>
          <span className="material-symbols-outlined" style={{ color: "#f59e0b", fontSize: "22px" }}>
            verified_user
          </span>
        </Box>
        <Box>
          <Typography variant="subtitle2" sx={{ color: "#f8fafc", fontWeight: 700, mb: 0.5 }}>
            Audit & Investigation Mode
          </Typography>
          <Typography variant="body2" sx={{ color: "#94a3b8", lineHeight: 1.6 }}>
            You are currently in <strong>Read-Only Mode</strong>. As an authorized platform auditor, you can inspect all system records, 
            validate compliance evidence, and export comprehensive audit logs. Modification of data or settings is restricted.
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 5 }}>
        {stats.map((stat) => (
          <Grid key={stat.label} size={{ xs: 6, sm: 3 }}>
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

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <SectionCard
            title="Audit Trail"
            icon="receipt_long"
            iconColor="#94a3b8"
            badge={totalAuditLogs}
            action={
              <Box sx={{ display: "flex", gap: 1.5 }}>
                <Button 
                  size="small" 
                  startIcon={<span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>}
                  sx={{ color: "#94a3b8", "&:hover": { color: "#f8fafc", bgcolor: alpha("#ffffff", 0.05) } }}
                >
                  Export
                </Button>
                <Button 
                  size="small"
                  sx={{ color: "#818cf8", fontWeight: 700 }}
                >
                  View All
                </Button>
              </Box>
            }
            noPadding
          >
            {recentAuditLogs.length === 0 ? (
              <DashboardEmptyState
                icon="receipt_long"
                iconColor="#334155"
                title="No Audit Records"
                description="Platform activity will be logged here automatically"
              />
            ) : (
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha("#ffffff", 0.02) }}>
                      <TableCell sx={{ color: "#64748b", fontWeight: 800, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid", borderColor: alpha("#ffffff", 0.05) }}>Timestamp</TableCell>
                      <TableCell sx={{ color: "#64748b", fontWeight: 800, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid", borderColor: alpha("#ffffff", 0.05) }}>User</TableCell>
                      <TableCell sx={{ color: "#64748b", fontWeight: 800, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid", borderColor: alpha("#ffffff", 0.05) }}>Action</TableCell>
                      <TableCell sx={{ color: "#64748b", fontWeight: 800, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid", borderColor: alpha("#ffffff", 0.05) }}>Entity</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentAuditLogs.map((log) => (
                      <TableRow key={log.id} sx={{ "&:hover": { bgcolor: alpha("#ffffff", 0.02) } }}>
                        <TableCell sx={{ borderBottom: "1px solid", borderColor: alpha("#ffffff", 0.03) }}>
                          <Typography variant="caption" sx={{ color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                            {new Date(log.createdAt).toISOString().replace("T", " ").substring(0, 19)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ borderBottom: "1px solid", borderColor: alpha("#ffffff", 0.03) }}>
                          <Typography variant="body2" sx={{ color: "#f8fafc", fontWeight: 600, fontSize: "0.85rem" }}>
                            {log.user?.name || log.user?.email || "System"}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ borderBottom: "1px solid", borderColor: alpha("#ffffff", 0.03) }}>
                          <Chip
                            size="small"
                            label={log.action.replace(/_/g, " ")}
                            sx={{ 
                              fontSize: "0.65rem", 
                              height: 20, 
                              fontWeight: 700,
                              bgcolor: alpha("#6366f1", 0.1),
                              color: "#818cf8",
                              border: "1px solid",
                              borderColor: alpha("#6366f1", 0.2)
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ borderBottom: "1px solid", borderColor: alpha("#ffffff", 0.03) }}>
                          <Typography variant="body2" sx={{ color: "#64748b", fontSize: "0.8rem" }}>
                            {log.entityType} <span style={{ color: alpha("#94a3b8", 0.5) }}>{log.entityId ? `#${log.entityId.substring(0, 8)}` : ""}</span>
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </SectionCard>

          <Box sx={{ mt: 4 }}>
            <SectionCard
              title="Evidence Packs"
              icon="inventory_2"
              iconColor="#3b82f6"
              badge={`${sealedEvidencePacks} sealed`}
              badgeColor="#10b981"
              noPadding
            >
              {evidencePacks.length === 0 ? (
                <DashboardEmptyState
                  icon="inventory_2"
                  iconColor="#334155"
                  title="No Evidence Packs"
                  description="Evidence packs will be generated upon offboarding completion"
                />
              ) : (
                <Box>
                  {evidencePacks.slice(0, 5).map((pack, idx) => (
                    <Box
                      key={pack.id}
                      sx={{
                        px: 4,
                        py: 2.5,
                        borderBottom: idx < evidencePacks.length - 1 ? "1px solid" : "none",
                        borderColor: alpha("#ffffff", 0.05),
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        transition: "all 0.2s",
                        "&:hover": { bgcolor: alpha("#ffffff", 0.02) }
                      }}
                    >
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: "12px",
                          bgcolor: pack.sealed ? alpha("#10b981", 0.1) : alpha("#f59e0b", 0.1),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid",
                          borderColor: pack.sealed ? alpha("#10b981", 0.2) : alpha("#f59e0b", 0.2)
                        }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 22, color: pack.sealed ? "#10b981" : "#f59e0b" }}
                        >
                          {pack.sealed ? "verified" : "pending"}
                        </span>
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ color: "#f8fafc", fontWeight: 700, fontSize: "0.9375rem" }}>
                          {pack.offboarding.employee.firstName} {pack.offboarding.employee.lastName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 500 }}>
                          Audit Package • {new Date(pack.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Chip
                          label={pack.sealed ? "SEALED" : "PENDING"}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            fontSize: "0.65rem",
                            height: 20,
                            bgcolor: pack.sealed ? alpha("#10b981", 0.1) : alpha("#f59e0b", 0.1),
                            color: pack.sealed ? "#10b981" : "#f59e0b",
                            border: "1px solid",
                            borderColor: pack.sealed ? alpha("#10b981", 0.3) : alpha("#f59e0b", 0.3)
                          }}
                        />
                        <Chip
                          label={pack.offboarding.status.replace("_", " ")}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            fontSize: "0.65rem",
                            height: 20,
                            ...getStatusColor(pack.offboarding.status),
                            border: "1px solid",
                            borderColor: getStatusColor(pack.offboarding.status).color + "40"
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
          <Card 
            sx={{ 
              borderRadius: "20px", 
              mb: 4, 
              bgcolor: alpha("#0f172a", 0.4),
              border: "1px solid",
              borderColor: alpha("#ffffff", 0.05),
              backdropFilter: "blur(10px)"
            }}
          >
            <CardContent sx={{ p: 3.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#f8fafc", mb: 3, letterSpacing: "0.02em" }}>
                Auditor Navigation
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {auditorActions.map((action) => (
                  <QuickAction
                    key={action.id}
                    id={action.id}
                    label={action.label}
                    description={action.description}
                    icon={action.icon}
                    href={action.href}
                    color="#818cf8"
                  />
                ))}
              </Box>
            </CardContent>
          </Card>

          <SectionCard
            title="Recent Cases"
            icon="folder_open"
            iconColor="#818cf8"
            noPadding
          >
            {recentOffboardings.length === 0 ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Typography variant="body2" sx={{ color: "#64748b" }}>
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
                      href={`/admin/org-view/${orgId}/offboardings`}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <Box
                        sx={{
                          p: 3,
                          borderBottom: idx < recentOffboardings.length - 1 ? "1px solid" : "none",
                          borderColor: alpha("#ffffff", 0.05),
                          transition: "all 0.2s",
                          "&:hover": { bgcolor: alpha("#ffffff", 0.02) },
                        }}
                      >
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                          <Typography variant="body2" sx={{ color: "#f8fafc", fontWeight: 700 }}>
                            {offboarding.employee.firstName} {offboarding.employee.lastName}
                          </Typography>
                          <Chip
                            size="small"
                            label={offboarding.status.replace("_", " ")}
                            sx={{
                              fontSize: "0.6rem",
                              height: 18,
                              fontWeight: 800,
                              bgcolor: statusStyle.bg,
                              color: statusStyle.color,
                              border: "1px solid",
                              borderColor: statusStyle.color + "30"
                            }}
                          />
                        </Box>
                        <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 500 }}>
                          ID: {offboarding.employee.employeeId} • Audit Ready
                        </Typography>
                      </Box>
                    </Link>
                  );
                })}
              </Box>
            )}
          </SectionCard>

          <Box sx={{ mt: 4 }}>
            <Card 
              sx={{ 
                borderRadius: "20px", 
                bgcolor: alpha("#10b981", 0.02),
                border: "1px solid",
                borderColor: alpha("#10b981", 0.15),
              }}
            >
              <CardContent sx={{ p: 3.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
                  <Box sx={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    width: 32,
                    height: 32,
                    borderRadius: "8px",
                    bgcolor: alpha("#10b981", 0.1)
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#10b981" }}>
                      verified
                    </span>
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#f8fafc" }}>
                    Compliance Health
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2" sx={{ color: "#94a3b8" }}>Total Logs</Typography>
                    <Typography variant="body2" sx={{ color: "#f8fafc", fontWeight: 700 }}>{totalAuditLogs.toLocaleString()}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2" sx={{ color: "#94a3b8" }}>Sealed Evidence</Typography>
                    <Typography variant="body2" sx={{ color: "#f8fafc", fontWeight: 700 }}>{sealedEvidencePacks} / {totalEvidencePacks}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2" sx={{ color: "#94a3b8" }}>Audit Rate</Typography>
                    <Typography variant="body2" sx={{ color: "#10b981", fontWeight: 700 }}>100%</Typography>
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
