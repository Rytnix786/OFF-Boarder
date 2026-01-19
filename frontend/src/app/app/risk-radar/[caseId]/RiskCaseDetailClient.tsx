"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  Avatar,
  LinearProgress,
  Divider,
  IconButton,
  Tooltip,
  alpha,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from "@mui/material";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  markHighRisk,
  triggerLockdown,
  escalateApprovals,
  confirmAccessRevocation,
  createAccessRevocation,
  requestEvidencePack,
  banIP,
  updateRiskScore,
  resolveSecurityEvent,
} from "@/lib/actions/risk-radar";

interface RiskCaseDetailClientProps {
  offboarding: {
    id: string;
    status: string;
    riskLevel: string;
    riskReason: string | null;
    scheduledDate: Date | null;
    completedDate: Date | null;
    createdAt: Date;
    isLockedDown: boolean | null;
    lockedDownAt: Date | null;
    lockedDownReason: string | null;
    isEscalated: boolean | null;
    escalationReason: string | null;
    requiredApprovals: number | null;
    employee: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      department: { name: string } | null;
      jobTitle: { title: string } | null;
    };
    tasks: Array<{
      id: string;
      name: string;
      status: string;
      dueDate: Date | null;
      completedAt: Date | null;
      isHighRiskTask: boolean;
      category: string | null;
    }>;
    approvals: Array<{
      id: string;
      type: string;
      status: string;
      approvedAt: Date | null;
      approver: { name: string | null; email: string } | null;
    }>;
    assetReturns: Array<{
      id: string;
      status: string;
      returnedAt: Date | null;
      asset: { id: string; name: string; type: string };
    }>;
    accessRevocations: Array<{
      id: string;
      systemName: string;
      systemType: string | null;
      status: string;
      isUrgent: boolean;
      confirmedAt: Date | null;
    }>;
    riskScore: {
      score: number;
      level: string;
      factors: Record<string, unknown>;
      calculatedAt: Date;
      previousScore: number | null;
      previousLevel: string | null;
    } | null;
    riskFactors?: Array<{
      factor: string;
      description: string;
      weight: number;
      score: number;
    }>;
    evidencePack: {
      id: string;
      sealed: boolean | null;
      sealedAt: Date | null;
    } | null;
  };
  securityEvents: Array<{
    id: string;
    eventType: string;
    description: string;
    ipAddress: string | null;
    createdAt: Date;
    resolved: boolean;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    createdAt: Date;
    user: { name: string | null; email: string } | null;
  }>;
  canManage: boolean;
}

const riskConfig = {
  CRITICAL: { 
    color: "#dc2626", 
    bg: "#dc262610", 
    glow: "0 0 30px rgba(220, 38, 38, 0.4)",
    label: "Critical Risk",
    icon: "gpp_bad",
  },
  HIGH: { 
    color: "#f97316", 
    bg: "#f9731610", 
    glow: "0 0 20px rgba(249, 115, 22, 0.3)",
    label: "High Risk",
    icon: "gpp_maybe",
  },
  NORMAL: { 
    color: "#10b981", 
    bg: "#10b98110", 
    glow: "none",
    label: "Normal",
    icon: "verified_user",
  },
};

const factorIcons: Record<string, string> = {
  high_risk_flag: "flag",
  overdue_tasks: "schedule",
  incomplete_critical_tasks: "priority_high",
  incomplete_revocations: "key_off",
  late_revocations: "timer_off",
  unresolved_assets: "inventory_2",
  login_attempts: "login",
  blocked_ip_events: "block",
  suspicious_activity: "warning",
  missing_approvals: "approval",
  past_last_working_day: "event_busy",
  escalated: "trending_up",
};

export default function RiskCaseDetailClient({ offboarding, securityEvents, auditLogs, canManage }: RiskCaseDetailClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" } | null>(null);
  
  const [lockdownDialog, setLockdownDialog] = useState(false);
  const [escalateDialog, setEscalateDialog] = useState(false);
  const [addRevocationDialog, setAddRevocationDialog] = useState(false);
  const [banIPDialog, setBanIPDialog] = useState(false);
  const [resolveDialog, setResolveDialog] = useState(false);
  const [reason, setReason] = useState("");
  const [banIPs, setBanIPs] = useState("");
  const [systemName, setSystemName] = useState("");
  const [newIP, setNewIP] = useState("");
  const [resolution, setResolution] = useState("");

  const config = riskConfig[offboarding.riskLevel as keyof typeof riskConfig] || riskConfig.NORMAL;
  const riskFactors = offboarding.riskFactors || (Array.isArray(offboarding.riskScore?.factors) ? offboarding.riskScore?.factors as any[] : []);

  const completedTasks = offboarding.tasks.filter(t => t.status === "COMPLETED" || t.status === "SKIPPED").length;
  const taskProgress = offboarding.tasks.length > 0 ? Math.round((completedTasks / offboarding.tasks.length) * 100) : 0;

  const confirmedRevocations = offboarding.accessRevocations.filter(r => r.status === "CONFIRMED").length;
  const revocationProgress = offboarding.accessRevocations.length > 0 
    ? Math.round((confirmedRevocations / offboarding.accessRevocations.length) * 100) : 100;

  const returnedAssets = offboarding.assetReturns.filter(a => a.status === "RETURNED").length;
  const assetProgress = offboarding.assetReturns.length > 0 
    ? Math.round((returnedAssets / offboarding.assetReturns.length) * 100) : 100;

  const timelineEvents = [
    { date: offboarding.createdAt, label: "Offboarding Started", icon: "play_circle", color: "#00738a" },
    ...(offboarding.isEscalated ? [{ date: offboarding.createdAt, label: "Escalated", icon: "trending_up", color: "#f97316" }] : []),
    ...(offboarding.isLockedDown && offboarding.lockedDownAt ? [{ date: offboarding.lockedDownAt, label: "Lockdown Triggered", icon: "lock", color: "#dc2626" }] : []),
    ...(offboarding.scheduledDate ? [{ date: offboarding.scheduledDate, label: "Scheduled Last Day", icon: "event", color: "#8b5cf6" }] : []),
    ...(offboarding.completedDate ? [{ date: offboarding.completedDate, label: "Completed", icon: "check_circle", color: "#10b981" }] : []),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handleMarkHighRisk = async () => {
    if (!reason) return;
    setLoading(true);
    const result = await markHighRisk(offboarding.id, reason);
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Marked as high risk", severity: "success" });
      setReason("");
      router.refresh();
    }
    setLoading(false);
  };

  const handleTriggerLockdown = async () => {
    if (!reason) return;
    setLoading(true);
    const ips = banIPs.split(",").map(ip => ip.trim()).filter(Boolean);
    const result = await triggerLockdown(offboarding.id, reason, ips.length > 0 ? ips : undefined);
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Lockdown triggered", severity: "success" });
      setLockdownDialog(false);
      setReason("");
      setBanIPs("");
      router.refresh();
    }
    setLoading(false);
  };

  const handleEscalate = async () => {
    if (!reason) return;
    setLoading(true);
    const result = await escalateApprovals(offboarding.id, reason);
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Approvals escalated", severity: "success" });
      setEscalateDialog(false);
      setReason("");
      router.refresh();
    }
    setLoading(false);
  };

  const handleConfirmRevocation = async (revocationId: string) => {
    setLoading(true);
    const result = await confirmAccessRevocation(revocationId);
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Revocation confirmed", severity: "success" });
      router.refresh();
    }
    setLoading(false);
  };

  const handleAddRevocation = async () => {
    if (!systemName) return;
    setLoading(true);
    const result = await createAccessRevocation(offboarding.id, { systemName, isUrgent: true });
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Revocation added", severity: "success" });
      setAddRevocationDialog(false);
      setSystemName("");
      router.refresh();
    }
    setLoading(false);
  };

  const handleRequestEvidencePack = async () => {
    setLoading(true);
    const result = await requestEvidencePack(offboarding.id);
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: result.message || "Evidence pack requested", severity: "success" });
      router.refresh();
    }
    setLoading(false);
  };

  const handleBanIP = async () => {
    if (!newIP || !reason) return;
    setLoading(true);
    const result = await banIP(newIP, reason, offboarding.id);
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "IP banned", severity: "success" });
      setBanIPDialog(false);
      setNewIP("");
      setReason("");
      router.refresh();
    }
    setLoading(false);
  };

  const handleRecalculateRisk = async () => {
    setLoading(true);
    const result = await updateRiskScore(offboarding.id, "Manual recalculation");
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: `Risk score updated to ${result.score}`, severity: "success" });
      router.refresh();
    }
    setLoading(false);
  };

  const handleResolveEvent = async (eventId: string) => {
    setLoading(true);
    const result = await resolveSecurityEvent(eventId, resolution);
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Event resolved", severity: "success" });
      setResolveDialog(false);
      setResolution("");
      router.refresh();
    }
    setLoading(false);
  };

  const scoreTrend = offboarding.riskScore?.previousScore !== null && offboarding.riskScore?.previousScore !== undefined
    ? (offboarding.riskScore?.score || 0) - offboarding.riskScore.previousScore
    : 0;

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
        <Button 
          component={Link} 
          href="/app/risk-radar" 
          startIcon={<span className="material-symbols-outlined">arrow_back</span>}
          sx={{ color: "text.secondary" }}
        >
          Back to Risk Radar
        </Button>
      </Box>

      <Box
        sx={{
          mb: 4,
          p: 4,
          borderRadius: 4,
          background: `linear-gradient(135deg, ${config.bg} 0%, ${alpha(config.color, 0.03)} 100%)`,
          border: `2px solid ${alpha(config.color, 0.3)}`,
          boxShadow: config.glow,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {offboarding.riskLevel === "CRITICAL" && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              bgcolor: config.color,
              animation: "pulse 2s infinite",
              "@keyframes pulse": {
                "0%, 100%": { opacity: 1 },
                "50%": { opacity: 0.5 },
              },
            }}
          />
        )}

        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start" }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: config.bg,
                  color: config.color,
                  border: `3px solid ${config.color}`,
                  fontWeight: 800,
                  fontSize: "1.75rem",
                }}
              >
                {offboarding.employee.firstName[0]}{offboarding.employee.lastName[0]}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h4" fontWeight={800}>
                  {offboarding.employee.firstName} {offboarding.employee.lastName}
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                  {offboarding.employee.jobTitle?.title || "No Title"} • {offboarding.employee.department?.name || "No Department"}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {offboarding.employee.email}
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Chip
                    label={config.label}
                    icon={<span className="material-symbols-outlined" style={{ fontSize: 16, color: "inherit" }}>{config.icon}</span>}
                    sx={{ bgcolor: config.color, color: "white", fontWeight: 700 }}
                  />
                  <Chip label={offboarding.status.replace("_", " ")} variant="outlined" />
                  {offboarding.isLockedDown && (
                    <Chip
                      label="LOCKED DOWN"
                      icon={<span className="material-symbols-outlined" style={{ fontSize: 16 }}>lock</span>}
                      sx={{ bgcolor: "#dc262620", color: "#dc2626", fontWeight: 700 }}
                    />
                  )}
                  {offboarding.isEscalated && (
                    <Chip
                      label="ESCALATED"
                      icon={<span className="material-symbols-outlined" style={{ fontSize: 16 }}>trending_up</span>}
                      sx={{ bgcolor: "#f9731620", color: "#f97316", fontWeight: 700 }}
                    />
                  )}
                </Box>
              </Box>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: "background.paper",
                border: `1px solid ${alpha(config.color, 0.2)}`,
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                <Box>
                  <Typography variant="overline" color="text.secondary" fontWeight={600}>
                    Risk Score
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                    <Typography variant="h2" fontWeight={900} color={config.color}>
                      {offboarding.riskScore?.score || 0}
                    </Typography>
                    <Typography color="text.secondary">/100</Typography>
                    {scoreTrend !== 0 && (
                      <Chip
                        size="small"
                        label={`${scoreTrend > 0 ? "+" : ""}${scoreTrend}`}
                        icon={
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                            {scoreTrend > 0 ? "trending_up" : "trending_down"}
                          </span>
                        }
                        sx={{
                          bgcolor: scoreTrend > 0 ? "#dc262620" : "#10b98120",
                          color: scoreTrend > 0 ? "#dc2626" : "#10b981",
                          fontWeight: 600,
                        }}
                      />
                    )}
                  </Box>
                </Box>
                {canManage && (
                  <Button
                    size="small"
                    onClick={handleRecalculateRisk}
                    disabled={loading}
                    startIcon={<span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>}
                  >
                    Recalculate
                  </Button>
                )}
              </Box>
              <LinearProgress
                variant="determinate"
                value={offboarding.riskScore?.score || 0}
                sx={{
                  height: 12,
                  borderRadius: 6,
                  bgcolor: alpha(config.color, 0.15),
                  "& .MuiLinearProgress-bar": {
                    bgcolor: config.color,
                    borderRadius: 6,
                  },
                }}
              />
              {offboarding.riskScore?.calculatedAt && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                  Last calculated: {new Date(offboarding.riskScore.calculatedAt).toLocaleString()}
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          {Array.isArray(riskFactors) && riskFactors.length > 0 && (
            <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
                  <span className="material-symbols-outlined" style={{ color: config.color }}>analytics</span>
                  <Typography variant="h6" fontWeight={700}>Risk Contributing Factors</Typography>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {riskFactors
                    .sort((a, b) => b.score - a.score)
                    .map((factor, index) => (
                      <Box
                        key={index}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          bgcolor: alpha(config.color, factor.score > 10 ? 0.08 : 0.04),
                          border: `1px solid ${alpha(config.color, factor.score > 10 ? 0.2 : 0.1)}`,
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
                            bgcolor: alpha(config.color, 0.1),
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 20, color: config.color }}
                          >
                            {factorIcons[factor.factor] || "warning"}
                          </span>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography fontWeight={600}>{factor.description}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Weight: {factor.weight} points max
                          </Typography>
                        </Box>
                        <Chip
                          label={`+${factor.score}`}
                          sx={{
                            bgcolor: factor.score > 10 ? "#dc262620" : factor.score > 5 ? "#f9731620" : "#f59e0b20",
                            color: factor.score > 10 ? "#dc2626" : factor.score > 5 ? "#f97316" : "#f59e0b",
                            fontWeight: 700,
                          }}
                        />
                      </Box>
                    ))}
                </Box>
              </CardContent>
            </Card>
          )}

          <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
                <span className="material-symbols-outlined" style={{ color: "#8b5cf6" }}>key_off</span>
                <Typography variant="h6" fontWeight={700}>Access Revocation Status</Typography>
                {canManage && (
                  <Button
                    size="small"
                    onClick={() => setAddRevocationDialog(true)}
                    sx={{ ml: "auto" }}
                    startIcon={<span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>}
                  >
                    Add System
                  </Button>
                )}
              </Box>

              {offboarding.accessRevocations.length === 0 ? (
                <Box sx={{ py: 4, textAlign: "center" }}>
                  <Typography color="text.secondary">No access revocations configured</Typography>
                  {canManage && (
                    <Button
                      onClick={() => setAddRevocationDialog(true)}
                      sx={{ mt: 2 }}
                      startIcon={<span className="material-symbols-outlined">add</span>}
                    >
                      Add First System
                    </Button>
                  )}
                </Box>
              ) : (
                <>
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Revocation Progress
                      </Typography>
                      <Typography fontWeight={600}>
                        {confirmedRevocations}/{offboarding.accessRevocations.length} confirmed
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={revocationProgress}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: "#8b5cf615",
                        "& .MuiLinearProgress-bar": {
                          bgcolor: revocationProgress === 100 ? "#10b981" : "#8b5cf6",
                          borderRadius: 4,
                        },
                      }}
                    />
                  </Box>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                    {offboarding.accessRevocations.map((rev) => (
                      <Box
                        key={rev.id}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          bgcolor: rev.status === "CONFIRMED" ? "#10b98108" :
                                   rev.status === "FAILED" ? "#dc262608" : "#f59e0b08",
                          border: "1px solid",
                          borderColor: rev.status === "CONFIRMED" ? "#10b98120" :
                                       rev.status === "FAILED" ? "#dc262620" : "#f59e0b20",
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                        }}
                      >
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 2,
                            bgcolor: rev.status === "CONFIRMED" ? "#10b98115" :
                                     rev.status === "FAILED" ? "#dc262615" : "#f59e0b15",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{
                              fontSize: 20,
                              color: rev.status === "CONFIRMED" ? "#10b981" :
                                     rev.status === "FAILED" ? "#dc2626" : "#f59e0b",
                            }}
                          >
                            {rev.status === "CONFIRMED" ? "check_circle" :
                             rev.status === "FAILED" ? "cancel" : "pending"}
                          </span>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Typography fontWeight={600}>{rev.systemName}</Typography>
                            {rev.isUrgent && (
                              <Chip size="small" label="URGENT" sx={{ bgcolor: "#dc262620", color: "#dc2626", height: 20, fontSize: "0.65rem" }} />
                            )}
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {rev.systemType || "Manual verification required"}
                            {rev.confirmedAt && ` • Confirmed ${new Date(rev.confirmedAt).toLocaleDateString()}`}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Chip
                            size="small"
                            label={rev.status}
                            sx={{
                              bgcolor: rev.status === "CONFIRMED" ? "#10b98120" :
                                       rev.status === "FAILED" ? "#dc262620" : "#f59e0b20",
                              color: rev.status === "CONFIRMED" ? "#10b981" :
                                     rev.status === "FAILED" ? "#dc2626" : "#f59e0b",
                              fontWeight: 600,
                            }}
                          />
                          {canManage && rev.status === "PENDING" && (
                            <Button
                              size="small"
                              onClick={() => handleConfirmRevocation(rev.id)}
                              disabled={loading}
                              sx={{ minWidth: 0, px: 1 }}
                            >
                              Confirm
                            </Button>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </>
              )}
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
                <span className="material-symbols-outlined" style={{ color: "#ef4444" }}>security</span>
                <Typography variant="h6" fontWeight={700}>Security Events</Typography>
                <Chip
                  size="small"
                  label={securityEvents.filter(e => !e.resolved).length}
                  sx={{ bgcolor: "#ef444420", color: "#ef4444", fontWeight: 700, ml: "auto" }}
                />
              </Box>

              {securityEvents.length === 0 ? (
                <Box sx={{ py: 4, textAlign: "center" }}>
                  <Box sx={{ width: 56, height: 56, borderRadius: "50%", bgcolor: "#10b98110", display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 28, color: "#10b981" }}>check_circle</span>
                  </Box>
                  <Typography color="text.secondary">No security events recorded</Typography>
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {securityEvents.slice(0, 10).map((event) => {
                    const isCritical = event.eventType.includes("LOCKDOWN") || event.eventType.includes("BLOCKED") || event.eventType.includes("SUSPICIOUS");
                    return (
                      <Box
                        key={event.id}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          bgcolor: !event.resolved ? (isCritical ? "#dc262608" : "#f59e0b08") : "transparent",
                          border: "1px solid",
                          borderColor: !event.resolved ? (isCritical ? "#dc262620" : "#f59e0b20") : "divider",
                        }}
                      >
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                              {!event.resolved && (
                                <Box
                                  sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    bgcolor: isCritical ? "#dc2626" : "#f59e0b",
                                  }}
                                />
                              )}
                              <Typography variant="caption" fontWeight={700} textTransform="uppercase" color={isCritical ? "error.main" : "warning.main"}>
                                {event.eventType.replace(/_/g, " ")}
                              </Typography>
                            </Box>
                            <Typography variant="body2">{event.description}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {event.ipAddress && `IP: ${event.ipAddress} • `}
                              {new Date(event.createdAt).toLocaleString()}
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Chip
                              size="small"
                              label={event.resolved ? "Resolved" : "Active"}
                              sx={{
                                bgcolor: event.resolved ? "#6b728020" : "#ef444420",
                                color: event.resolved ? "#6b7280" : "#ef4444",
                                fontWeight: 600,
                              }}
                            />
                            {canManage && !event.resolved && (
                              <Tooltip title="Resolve Event">
                                <IconButton
                                  size="small"
                                  onClick={() => handleResolveEvent(event.id)}
                                  disabled={loading}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check</span>
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
                <span className="material-symbols-outlined" style={{ color: "#6b7280" }}>history</span>
                <Typography variant="h6" fontWeight={700}>Audit Trail</Typography>
              </Box>

              {auditLogs.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                  No audit entries yet
                </Typography>
              ) : (
                <Box sx={{ position: "relative", pl: 3 }}>
                  <Box
                    sx={{
                      position: "absolute",
                      left: 11,
                      top: 0,
                      bottom: 0,
                      width: 2,
                      bgcolor: "divider",
                    }}
                  />
                  {auditLogs.slice(0, 15).map((log, index) => (
                    <Box
                      key={log.id}
                      sx={{
                        position: "relative",
                        pb: index < auditLogs.length - 1 ? 2 : 0,
                      }}
                    >
                      <Box
                        sx={{
                          position: "absolute",
                          left: -14,
                          top: 4,
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          bgcolor: "background.paper",
                          border: "2px solid",
                          borderColor: "#6b7280",
                        }}
                      />
                      <Typography variant="body2" fontWeight={500}>
                        {log.action.replace(/\./g, " → ").replace(/_/g, " ")}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {log.user?.name || log.user?.email || "System"} • {new Date(log.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          {canManage && (
            <Card variant="outlined" sx={{ borderRadius: 3, mb: 3, borderColor: "#dc262640" }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
                  <span className="material-symbols-outlined" style={{ color: "#dc2626" }}>bolt</span>
                  <Typography variant="h6" fontWeight={700}>Security Actions</Typography>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {!offboarding.isLockedDown && (
                    <Button
                      variant="contained"
                      color="error"
                      fullWidth
                      onClick={() => setLockdownDialog(true)}
                      startIcon={<span className="material-symbols-outlined">lock</span>}
                      sx={{ justifyContent: "flex-start", py: 1.5 }}
                    >
                      Trigger Immediate Lockdown
                    </Button>
                  )}
                  {offboarding.riskLevel === "NORMAL" && (
                    <Button
                      variant="outlined"
                      color="warning"
                      fullWidth
                      onClick={handleMarkHighRisk}
                      disabled={loading || !reason}
                      startIcon={<span className="material-symbols-outlined">flag</span>}
                      sx={{ justifyContent: "flex-start", py: 1.5 }}
                    >
                      Mark as High Risk
                    </Button>
                  )}
                  {!offboarding.isEscalated && (
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => setEscalateDialog(true)}
                      startIcon={<span className="material-symbols-outlined">trending_up</span>}
                      sx={{ justifyContent: "flex-start", py: 1.5 }}
                    >
                      Escalate Approvals
                    </Button>
                  )}
                  <Divider sx={{ my: 1 }} />
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => setBanIPDialog(true)}
                    startIcon={<span className="material-symbols-outlined">block</span>}
                    sx={{ justifyContent: "flex-start", py: 1.5 }}
                  >
                    Ban IP Address
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={handleRequestEvidencePack}
                    disabled={loading}
                    startIcon={<span className="material-symbols-outlined">folder_zip</span>}
                    sx={{ justifyContent: "flex-start", py: 1.5 }}
                  >
                    {offboarding.evidencePack ? "View Evidence Pack" : "Generate Evidence Pack"}
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    component={Link}
                    href={`/app/offboardings/${offboarding.id}`}
                    startIcon={<span className="material-symbols-outlined">open_in_new</span>}
                    sx={{ justifyContent: "flex-start", py: 1.5 }}
                  >
                    View Full Offboarding
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
                <span className="material-symbols-outlined" style={{ color: "#00738a" }}>checklist</span>
                <Typography variant="h6" fontWeight={700}>Completion Status</Typography>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="body2" fontWeight={600}>Tasks</Typography>
                    <Typography variant="body2" fontWeight={600}>{completedTasks}/{offboarding.tasks.length}</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={taskProgress}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: "#00738a15",
                      "& .MuiLinearProgress-bar": {
                        bgcolor: taskProgress === 100 ? "#10b981" : "#00738a",
                        borderRadius: 4,
                      },
                    }}
                  />
                </Box>

                <Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="body2" fontWeight={600}>Access Revoked</Typography>
                    <Typography variant="body2" fontWeight={600}>{confirmedRevocations}/{offboarding.accessRevocations.length || 0}</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={revocationProgress}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: "#8b5cf615",
                      "& .MuiLinearProgress-bar": {
                        bgcolor: revocationProgress === 100 ? "#10b981" : "#8b5cf6",
                        borderRadius: 4,
                      },
                    }}
                  />
                </Box>

                <Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="body2" fontWeight={600}>Assets Returned</Typography>
                    <Typography variant="body2" fontWeight={600}>{returnedAssets}/{offboarding.assetReturns.length || 0}</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={assetProgress}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: "#f59e0b15",
                      "& .MuiLinearProgress-bar": {
                        bgcolor: assetProgress === 100 ? "#10b981" : "#f59e0b",
                        borderRadius: 4,
                      },
                    }}
                  />
                </Box>
              </Box>

              {offboarding.tasks.filter(t => t.isHighRiskTask && t.status !== "COMPLETED" && t.status !== "SKIPPED").length > 0 && (
                <Alert severity="warning" sx={{ mt: 3 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {offboarding.tasks.filter(t => t.isHighRiskTask && t.status !== "COMPLETED" && t.status !== "SKIPPED").length} critical task(s) incomplete
                  </Typography>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
                <span className="material-symbols-outlined" style={{ color: "#00738a" }}>timeline</span>
                <Typography variant="h6" fontWeight={700}>Timeline</Typography>
              </Box>

              <Stepper orientation="vertical" activeStep={-1}>
                {timelineEvents.map((event, index) => (
                  <Step key={index} expanded>
                    <StepLabel
                      StepIconComponent={() => (
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            bgcolor: alpha(event.color, 0.15),
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 18, color: event.color }}>
                            {event.icon}
                          </span>
                        </Box>
                      )}
                    >
                      <Typography fontWeight={600}>{event.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(event.date).toLocaleDateString()}
                      </Typography>
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
                <span className="material-symbols-outlined" style={{ color: "#f59e0b" }}>inventory_2</span>
                <Typography variant="h6" fontWeight={700}>Assets</Typography>
              </Box>

              {offboarding.assetReturns.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                  No assets assigned
                </Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {offboarding.assetReturns.map((ar) => (
                    <Box
                      key={ar.id}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: ar.status === "RETURNED" ? "#10b98108" :
                                 ar.status === "LOST" ? "#dc262608" : "#f59e0b08",
                        border: "1px solid",
                        borderColor: ar.status === "RETURNED" ? "#10b98120" :
                                     ar.status === "LOST" ? "#dc262620" : "#f59e0b20",
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{ar.asset.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{ar.asset.type}</Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={ar.status}
                          sx={{
                            bgcolor: ar.status === "RETURNED" ? "#10b98120" :
                                     ar.status === "LOST" ? "#dc262620" : "#f59e0b20",
                            color: ar.status === "RETURNED" ? "#10b981" :
                                   ar.status === "LOST" ? "#dc2626" : "#f59e0b",
                            fontWeight: 600,
                          }}
                        />
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={lockdownDialog} onClose={() => setLockdownDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700} sx={{ color: "error.main" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <span className="material-symbols-outlined">lock</span>
            Trigger Immediate Lockdown
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <strong>Critical Security Action</strong><br />
            This will immediately revoke all access, block the user, and create urgent security review tasks.
          </Alert>
          <TextField
            fullWidth
            label="Lockdown Justification"
            multiline
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            placeholder="Document the security incident requiring immediate lockdown..."
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="IP Addresses to Ban (optional)"
            value={banIPs}
            onChange={(e) => setBanIPs(e.target.value)}
            placeholder="192.168.1.1, 10.0.0.1"
            helperText="Comma-separated list of IPs to block immediately"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setLockdownDialog(false); setReason(""); setBanIPs(""); }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleTriggerLockdown} disabled={loading || !reason}>
            {loading ? "Processing..." : "Execute Lockdown"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={escalateDialog} onClose={() => setEscalateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <span className="material-symbols-outlined" style={{ color: "#8b5cf6" }}>trending_up</span>
            Escalate Approval Requirements
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }} color="text.secondary">
            Current required approvals: <strong>{offboarding.requiredApprovals || 1}</strong>
          </Typography>
          <TextField
            fullWidth
            label="Escalation Reason"
            multiline
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            placeholder="Explain why additional approvals are required..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setEscalateDialog(false); setReason(""); }}>Cancel</Button>
          <Button variant="contained" onClick={handleEscalate} disabled={loading || !reason}>
            {loading ? "Processing..." : "Escalate"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={addRevocationDialog} onClose={() => setAddRevocationDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <span className="material-symbols-outlined" style={{ color: "#8b5cf6" }}>key_off</span>
            Add Access Revocation
          </Box>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="System Name"
            value={systemName}
            onChange={(e) => setSystemName(e.target.value)}
            required
            sx={{ mt: 2 }}
            placeholder="e.g., Slack, GitHub, AWS, Salesforce"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setAddRevocationDialog(false); setSystemName(""); }}>Cancel</Button>
          <Button variant="contained" onClick={handleAddRevocation} disabled={loading || !systemName}>
            {loading ? "Adding..." : "Add System"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={banIPDialog} onClose={() => setBanIPDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <span className="material-symbols-outlined" style={{ color: "#dc2626" }}>block</span>
            Ban IP Address
          </Box>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="IP Address"
            value={newIP}
            onChange={(e) => setNewIP(e.target.value)}
            required
            sx={{ mt: 2, mb: 2 }}
            placeholder="192.168.1.1"
          />
          <TextField
            fullWidth
            label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            multiline
            rows={2}
            placeholder="Document the reason for blocking this IP..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setBanIPDialog(false); setNewIP(""); setReason(""); }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleBanIP} disabled={loading || !newIP || !reason}>
            {loading ? "Banning..." : "Ban IP"}
          </Button>
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
