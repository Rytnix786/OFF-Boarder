"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  FormControl,
  Select,
  MenuItem,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  IconButton,
  alpha,
  Divider,
  Collapse,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { markHighRisk, triggerLockdown, escalateApprovals, resolveSecurityEvent } from "@/lib/actions/risk-radar";

type OffboardingItem = {
  id: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    department: { id: string; name: string } | null;
  };
  status: string;
  riskLevel: string | null;
  riskScore: number;
  scheduledDate: Date | null;
  createdAt: Date;
  isLockedDown: boolean | null;
  isEscalated: boolean | null;
  pendingTasksCount: number;
  pendingRevocationsCount: number;
  unresolvedAssetsCount: number;
};

type SecurityEventItem = {
  id: string;
  eventType: string;
  description: string;
  createdAt: Date;
  resolved: boolean;
  offboardingId: string | null;
};

type DashboardData = {
  offboardings: OffboardingItem[];
  alerts: SecurityEventItem[];
    summary: {
      totalAtRisk: number;
      criticalCount: number;
      highCount: number;
      pendingRevocations: number;
      unresolvedAssets: number;
      unresolvedAlerts: number;
      ghostExitsCount: number;
    };
    ghostExits: { id: string; firstName: string; lastName: string; email: string }[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };

  interface RiskRadarClientProps {
    data: DashboardData;
  departments: { id: string; name: string }[];
  filters: {
    department?: string;
    status?: string;
    riskLevel?: string;
    dateFrom?: string;
    dateTo?: string;
    page: number;
    pageSize: number;
  };
  canManage: boolean;
}

const postureConfig = {
  SECURE: {
    label: "SECURE",
    color: "#10b981",
    sublabel: "No unresolved risks detected across enforced policies.",
  },
  ELEVATED: {
    label: "ELEVATED",
    color: "#f59e0b",
    sublabel: "Active risk signals detected. Monitoring coverage remains active.",
  },
  CRITICAL: {
    label: "CRITICAL",
    color: "#ef4444",
    sublabel: "Critical exposure detected. Automated response protocols engaged.",
  },
};

export default function RiskRadarClient({ data, departments, filters, canManage }: RiskRadarClientProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" } | null>(null);
  
  const [markRiskDialog, setMarkRiskDialog] = useState<string | null>(null);
  const [lockdownDialog, setLockdownDialog] = useState<string | null>(null);
  const [escalateDialog, setEscalateDialog] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [banIPs, setBanIPs] = useState("");

  const hasCritical = data.summary.criticalCount > 0;
  const hasElevated = data.summary.highCount > 0 || data.summary.unresolvedAlerts > 0;
  
  const posture = hasCritical ? postureConfig.CRITICAL : hasElevated ? postureConfig.ELEVATED : postureConfig.SECURE;

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    router.push(`/app/risk-radar?${params.toString()}`);
  };

  const handleMarkHighRisk = async () => {
    if (!markRiskDialog || !reason) return;
    setLoading(true);
    const result = await markHighRisk(markRiskDialog, reason);
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Marked as high risk", severity: "success" });
      setMarkRiskDialog(null);
      setReason("");
      router.refresh();
    }
    setLoading(false);
  };

  const handleTriggerLockdown = async () => {
    if (!lockdownDialog || !reason) return;
    setLoading(true);
    const ips = banIPs.split(",").map(ip => ip.trim()).filter(Boolean);
    const result = await triggerLockdown(lockdownDialog, reason, ips.length > 0 ? ips : undefined);
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Lockdown triggered", severity: "success" });
      setLockdownDialog(null);
      setReason("");
      setBanIPs("");
      router.refresh();
    }
    setLoading(false);
  };

  const handleEscalate = async () => {
    if (!escalateDialog || !reason) return;
    setLoading(true);
    const result = await escalateApprovals(escalateDialog, reason);
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Approvals escalated", severity: "success" });
      setEscalateDialog(null);
      setReason("");
      router.refresh();
    }
    setLoading(false);
  };

  const handleResolveAlert = async (eventId: string) => {
    setLoading(true);
    const result = await resolveSecurityEvent(eventId);
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Alert resolved", severity: "success" });
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <Box sx={{ pb: 8 }}>
      {/* Header */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, letterSpacing: "-0.02em" }}>
          Risk Radar
        </Typography>
        <Typography sx={{ color: "text.secondary", fontSize: "1.1rem" }}>
          Real-time visibility into organizational risk and policy enforcement.
        </Typography>
      </Box>

      {/* SECTION 1: Risk Posture Block */}
      <Box 
        sx={{ 
          mb: 8, 
          p: 4, 
          borderRadius: 3, 
          bgcolor: isDark ? alpha(posture.color, 0.03) : alpha(posture.color, 0.02),
          border: `1px solid ${alpha(posture.color, 0.1)}`,
          display: "flex",
          flexDirection: "column",
          gap: 1
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: posture.color }} />
          <Typography sx={{ fontSize: "1rem", fontWeight: 800, letterSpacing: "0.1em", color: posture.color }}>
            STATUS: {posture.label}
          </Typography>
        </Box>
        <Typography sx={{ fontSize: "1.25rem", fontWeight: 500, mt: 1 }}>
          {posture.sublabel}
        </Typography>
      </Box>

      <Grid container spacing={6}>
        {/* SECTION A: Risk Signals */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.25rem" }}>
              Risk Signals
            </Typography>
            <Button 
              size="small" 
              onClick={() => setShowFilters(!showFilters)}
              startIcon={<span className="material-symbols-outlined">filter_list</span>}
              sx={{ color: "text.secondary" }}
            >
              Filters
            </Button>
          </Box>

          <Collapse in={showFilters}>
            <Box sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: "action.hover", display: "flex", gap: 2 }}>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <Typography variant="caption" sx={{ mb: 0.5, display: "block", fontWeight: 600 }}>Risk Severity</Typography>
                <Select
                  value={filters.riskLevel || "all"}
                  onChange={(e) => updateFilters("riskLevel", e.target.value)}
                >
                  <MenuItem value="all">All Levels</MenuItem>
                  <MenuItem value="CRITICAL">Critical</MenuItem>
                  <MenuItem value="HIGH">High</MenuItem>
                  <MenuItem value="NORMAL">Normal</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <Typography variant="caption" sx={{ mb: 0.5, display: "block", fontWeight: 600 }}>Signal State</Typography>
                <Select
                  value={filters.status || "all"}
                  onChange={(e) => updateFilters("status", e.target.value)}
                >
                  <MenuItem value="all">All States</MenuItem>
                  <MenuItem value="PENDING">Active</MenuItem>
                  <MenuItem value="IN_PROGRESS">Resolving</MenuItem>
                  <MenuItem value="PENDING_APPROVAL">Awaiting Review</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Collapse>

            <Card variant="outlined" sx={{ borderRadius: 3, border: "none", bgcolor: "transparent" }}>
              <CardContent sx={{ p: 0 }}>
                {data.offboardings.length === 0 ? (
                  <Box sx={{ py: 4, px: 4, borderRadius: 3, bgcolor: "action.hover" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#10b981" }} />
                      <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.05em", color: "text.secondary", textTransform: "uppercase" }}>
                        Signal Feed — Idle
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 4 }}>
                      {[
                        { label: "Access Violations", icon: "shield", count: 0 },
                        { label: "Policy Breaches", icon: "gpp_bad", count: 0 },
                        { label: "Delayed Revocations", icon: "schedule", count: 0 },
                        { label: "Unresolved Asset Returns", icon: "devices", count: 0 },
                      ].map((channel) => (
                        <Box 
                          key={channel.label}
                          sx={{ 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "space-between",
                            py: 1.5,
                            px: 2,
                            borderRadius: 2,
                            bgcolor: isDark ? alpha("#fff", 0.02) : alpha("#000", 0.02),
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18, color: isDark ? "#6b7280" : "#9ca3af" }}>
                              {channel.icon}
                            </span>
                            <Typography sx={{ fontSize: "0.875rem", color: "text.secondary" }}>
                              {channel.label}
                            </Typography>
                          </Box>
                          <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: "text.primary" }}>
                            {channel.count}
                          </Typography>
                        </Box>
                      ))}
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, color: isDark ? "#6b7280" : "#9ca3af" }}>
                        check_circle
                      </span>
                      <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                        Last evaluated: {new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {data.offboardings.map((item) => (
                    <Box 
                      key={item.id}
                      component={Link}
                      href={`/app/risk-radar/${item.id}`}
                      sx={{ 
                        p: 3, 
                        borderRadius: 3, 
                        bgcolor: isDark ? alpha("#fff", 0.02) : alpha("#000", 0.01),
                        border: "1px solid",
                        borderColor: isDark ? alpha("#fff", 0.05) : alpha("#000", 0.05),
                        textDecoration: "none",
                        color: "inherit",
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        transition: "all 0.2s",
                        "&:hover": {
                          bgcolor: isDark ? alpha("#fff", 0.04) : alpha("#000", 0.02),
                          borderColor: posture.color,
                        }
                      }}
                    >
                      <Box sx={{ 
                        width: 48, 
                        height: 48, 
                        borderRadius: 2, 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center",
                        bgcolor: item.riskLevel === "CRITICAL" ? alpha("#ef4444", 0.1) : alpha("#f59e0b", 0.1),
                        color: item.riskLevel === "CRITICAL" ? "#ef4444" : "#f59e0b"
                      }}>
                        <span className="material-symbols-outlined">warning</span>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
                          {item.employee.firstName} {item.employee.lastName}
                        </Typography>
                        <Typography sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                          {item.employee.department?.name || "Unassigned"} • Risk Score: {item.riskScore}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: "right" }}>
                        <Typography sx={{ 
                          fontWeight: 800, 
                          color: item.riskLevel === "CRITICAL" ? "#ef4444" : "#f59e0b",
                          fontSize: "0.75rem",
                          letterSpacing: "0.05em"
                        }}>
                          {item.riskLevel}
                        </Typography>
                        <Typography sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                          {new Date(item.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>

          {data.totalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
              <Pagination
                count={data.totalPages}
                page={data.page}
                onChange={(_, page) => updateFilters("page", page.toString())}
              />
            </Box>
          )}
        </Grid>

        {/* Right Column: Coverage & Readiness */}
        <Grid size={{ xs: 12, lg: 4 }}>
          {/* SECTION B: Enforcement Coverage */}
            <Box sx={{ mb: 6 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                Enforcement Coverage
              </Typography>
              <Box sx={{ p: 3, borderRadius: 3, bgcolor: "action.hover", border: "1px solid", borderColor: "divider" }}>
                <Typography sx={{ fontSize: "0.95rem", lineHeight: 1.6, color: "text.primary" }}>
                  Risk Radar is actively monitoring enforced security policies for all active offboarding cases and unauthorized access attempts.
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: "0.875rem", color: "text.secondary" }}>Policies monitored</Typography>
                    <Typography sx={{ fontSize: "0.875rem", fontWeight: 700 }}>12</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: "0.875rem", color: "text.secondary" }}>Population scanning</Typography>
                    <Typography sx={{ fontSize: "0.875rem", fontWeight: 700, color: "success.main" }}>ACTIVE</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: "0.875rem", color: "text.secondary" }}>Coverage scope</Typography>
                    <Typography sx={{ fontSize: "0.875rem", fontWeight: 700 }}>Org-wide</Typography>
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Ghost Exits Section */}
            {data.ghostExits.length > 0 && (
              <Box sx={{ mb: 6 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "error.main" }}>
                    Ghost Exits Detected
                  </Typography>
                  <Box sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: "error.main", color: "white", fontSize: "0.75rem", fontWeight: 700 }}>
                    {data.ghostExits.length}
                  </Box>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {data.ghostExits.map(ghost => (
                    <Box 
                      key={ghost.id}
                      sx={{ 
                        p: 2, 
                        borderRadius: 2, 
                        bgcolor: isDark ? "rgba(239, 68, 68, 0.05)" : "rgba(239, 68, 68, 0.02)",
                        border: "1px solid",
                        borderColor: isDark ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.1)",
                      }}
                    >
                      <Typography sx={{ fontWeight: 600, fontSize: "0.875rem" }}>
                        {ghost.firstName} {ghost.lastName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
                        Last day was {new Date().toLocaleDateString()} - No offboarding started.
                      </Typography>
                      <Button 
                        size="small" 
                        variant="outlined" 
                        color="error"
                        sx={{ fontSize: "0.7rem", py: 0 }}
                        onClick={() => router.push(`/app/employees/${ghost.id}`)}
                      >
                        Initialize Exit
                      </Button>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* SECTION C: Escalation Readiness */}
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
              Escalation Readiness
            </Typography>
            <Box sx={{ p: 3, borderRadius: 3, bgcolor: "action.hover", border: "1px solid", borderColor: "divider" }}>
              <Typography sx={{ fontSize: "0.875rem", color: "text.secondary", mb: 3 }}>
                The system is configured to respond automatically to detected risks based on your security profile.
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Box sx={{ color: "primary.main" }}><span className="material-symbols-outlined">lock</span></Box>
                  <Box>
                    <Typography sx={{ fontSize: "0.875rem", fontWeight: 700 }}>Auto-Lockdowns</Typography>
                    <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>Immediate revocation on critical breach</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Box sx={{ color: "primary.main" }}><span className="material-symbols-outlined">trending_up</span></Box>
                  <Box>
                    <Typography sx={{ fontSize: "0.875rem", fontWeight: 700 }}>Approval Escalation</Typography>
                    <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>Dynamic policy tightening for elevated risk</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Box sx={{ color: "primary.main" }}><span className="material-symbols-outlined">notifications</span></Box>
                  <Box>
                    <Typography sx={{ fontSize: "0.875rem", fontWeight: 700 }}>Executive Notification</Typography>
                    <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>Real-time alerts for security leads</Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Dialogs & Overlays */}
      <Dialog open={!!markRiskDialog} onClose={() => setMarkRiskDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Elevate Risk Level</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Justification"
            multiline
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMarkRiskDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleMarkHighRisk}>Apply Elevation</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!lockdownDialog} onClose={() => setLockdownDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: "error.main" }}>Execute Critical Lockdown</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>This will immediately revoke all access and block associated IP addresses.</Typography>
          <TextField
            fullWidth
            label="Incident Reason"
            multiline
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="IP Ban List"
            value={banIPs}
            onChange={(e) => setBanIPs(e.target.value)}
            placeholder="1.1.1.1, 2.2.2.2"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLockdownDialog(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleTriggerLockdown}>Execute Lockdown</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar?.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar?.severity} onClose={() => setSnackbar(null)}>
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
