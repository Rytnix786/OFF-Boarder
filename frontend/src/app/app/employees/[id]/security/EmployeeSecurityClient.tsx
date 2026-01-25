"use client";

import React, { useState, useTransition } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Avatar,
  Chip,
  Divider,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  alpha,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  suspendEmployee,
  lockEmployee,
  toggleHighRisk,
  forceLogoutAll,
  blockIpAddress,
  grantTemporaryAccess,
} from "@/lib/actions/employees";

type Employee = {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  department: { name: string } | null;
  jobTitle: { title: string } | null;
};

type SecurityProfile = {
  id: string;
  employeeId: string;
  isHighRisk: boolean;
  highRiskReason: string | null;
  highRiskMarkedAt: Date | null;
  isSuspended: boolean;
  suspendedReason: string | null;
  suspendedAt: Date | null;
  suspendedUntil: Date | null;
  isLocked: boolean;
  lockedReason: string | null;
  lockedAt: Date | null;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  lastLoginCity: string | null;
  lastLoginCountry: string | null;
  lastLoginMethod: string | null;
  employee: {
    employeeUserLinks: {
      id: string;
      status: string;
      accessExpiresAt: Date | null;
      user: {
        id: string;
        email: string;
        sessions: {
          id: string;
          ipAddress: string | null;
          city: string | null;
          country: string | null;
          authMethod: string | null;
          lastActiveAt: Date | null;
          createdAt: Date;
        }[];
      };
    }[];
    offboardings: {
      id: string;
      status: string;
      riskLevel: string | null;
      scheduledDate: Date | null;
      isLockedDown: boolean | null;
      riskScore: { score: number; level: string } | null;
    }[];
    assets: {
      id: string;
      name: string;
      type: string;
      status: string;
      assetReturns: { id: string; status: string }[];
    }[];
  };
};

type SecurityEvent = {
  id: string;
  eventType: string;
  description: string;
  ipAddress: string | null;
  createdAt: Date;
  resolved: boolean;
  metadata: Record<string, unknown> | null;
};

type BlockedIP = {
  id: string;
  ipAddress: string;
  scope: string;
  reason: string | null;
  offboardingOnly: boolean;
  createdAt: Date;
  createdBy: { name: string | null; email: string };
  _count: { attempts: number };
};

interface EmployeeSecurityClientProps {
  employee: Employee;
  securityProfile: SecurityProfile;
  securityEvents: SecurityEvent[];
  blockedIPs: BlockedIP[];
  canManage: boolean;
  currentUserId: string;
}

export default function EmployeeSecurityClient({
  employee,
  securityProfile,
  securityEvents,
  blockedIPs,
  canManage,
  currentUserId,
}: EmployeeSecurityClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionDialog, setActionDialog] = useState<{
    type: "suspend" | "lock" | "highRisk" | "forceLogout" | "blockIP" | "grantAccess" | null;
    open: boolean;
  }>({ type: null, open: false });
  const [reason, setReason] = useState("");
  const [ipToBlock, setIpToBlock] = useState("");
  const [extensionHours, setExtensionHours] = useState<number>(4);
  const [offboardingOnly, setOffboardingOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeSessions = securityProfile.employee.employeeUserLinks.flatMap(
    (link) => link.user.sessions
  );

  const portalLink = securityProfile.employee.employeeUserLinks[0];
  const isTemporaryAccessActive = portalLink?.status === "REVOKED" && 
    portalLink.accessExpiresAt && 
    new Date(portalLink.accessExpiresAt) > new Date();

  const isComplianceWindowExpired = portalLink?.status === "REVOKED" && !isTemporaryAccessActive;

  const activeOffboarding = securityProfile.employee.offboardings[0];
  const pendingAssets = securityProfile.employee.assets.filter(
    (a) => a.status === "ASSIGNED" || a.status === "PENDING_RETURN"
  );

    const handleAction = async () => {
      if (actionDialog.type !== "grantAccess" && !reason.trim()) {
        setError("Reason is required");
        return;
      }

      setError(null);

      try {
        if (actionDialog.type === "grantAccess") {
          const res = await grantTemporaryAccess(employee.id, extensionHours);
          if (res.error) throw new Error(res.error);
          
          setActionDialog({ type: null, open: false });
          setReason("");
          startTransition(() => {
            router.refresh();
          });
          return;
        }

        const endpoint = `/api/employees/${employee.id}/security`;
        let body: Record<string, unknown> = { reason };

        switch (actionDialog.type) {
          case "suspend":
            body.action = "suspend";
            break;
          case "lock":
            body.action = "lock";
            break;
          case "highRisk":
            body.action = securityProfile.isHighRisk ? "removeHighRisk" : "markHighRisk";
            break;
          case "forceLogout":
            body.action = "forceLogout";
            break;
          case "blockIP":
            if (!ipToBlock.trim()) {
              setError("IP address is required");
              return;
            }
            body.action = "blockIP";
            body.ipAddress = ipToBlock;
            body.offboardingOnly = offboardingOnly;
            break;
        }

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Action failed");
        }

        setActionDialog({ type: null, open: false });
        setReason("");
        setIpToBlock("");
        startTransition(() => {
          router.refresh();
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    };

    const handleUnsuspend = async () => {
      try {
        const res = await fetch(`/api/employees/${employee.id}/security`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "unsuspend", reason: "Suspension lifted" }),
        });
        if (!res.ok) throw new Error("Failed to unsuspend");
        startTransition(() => router.refresh());
      } catch (err) {
        console.error(err);
      }
    };

    const handleUnlock = async () => {
      try {
        const res = await fetch(`/api/employees/${employee.id}/security`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "unlock", reason: "Account unlocked" }),
        });
        if (!res.ok) throw new Error("Failed to unlock");
        startTransition(() => router.refresh());
      } catch (err) {
        console.error(err);
      }
    };

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleString();
  };

  const formatTimeAgo = (date: Date | null) => {
    if (!date) return "—";
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getStatusBadge = () => {
    if (securityProfile.isLocked) {
      return { color: "#ef4444", bg: "#ef444415", label: "Locked", icon: "lock" };
    }
    if (securityProfile.isSuspended) {
      return { color: "#f97316", bg: "#f9731615", label: "Suspended", icon: "block" };
    }
    if (securityProfile.isHighRisk) {
      return { color: "#f59e0b", bg: "#f59e0b15", label: "High Risk", icon: "warning" };
    }
    return { color: "#10b981", bg: "#10b98115", label: "Normal", icon: "check_circle" };
  };

  const status = getStatusBadge();

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
        <Link href={`/app/employees/${employee.id}`} style={{ textDecoration: "none", color: "inherit" }}>
          <IconButton>
            <span className="material-symbols-outlined">arrow_back</span>
          </IconButton>
        </Link>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="h4" fontWeight={800}>
              Security Overview
            </Typography>
            <Chip
              icon={<span className="material-symbols-outlined" style={{ fontSize: 16, color: status.color }}>{status.icon}</span>}
              label={status.label}
              sx={{ fontWeight: 700, bgcolor: status.bg, color: status.color, border: `1px solid ${alpha(status.color, 0.3)}` }}
            />
          </Box>
          <Typography color="text.secondary">
            {employee.firstName} {employee.lastName} • {employee.email}
          </Typography>
        </Box>
        {isPending && <CircularProgress size={24} />}
      </Box>

      {(securityProfile.isLocked || securityProfile.isSuspended) && (
        <Alert
          severity={securityProfile.isLocked ? "error" : "warning"}
          sx={{ mb: 3, borderRadius: 2 }}
          action={
            canManage && (
              <Button
                color="inherit"
                size="small"
                onClick={securityProfile.isLocked ? handleUnlock : handleUnsuspend}
              >
                {securityProfile.isLocked ? "Unlock" : "Unsuspend"}
              </Button>
            )
          }
        >
          <Typography variant="subtitle2" fontWeight={700}>
            {securityProfile.isLocked ? "Account Locked" : "Access Suspended"}
          </Typography>
          <Typography variant="body2">
            {securityProfile.isLocked
              ? securityProfile.lockedReason
              : securityProfile.suspendedReason}
            {securityProfile.suspendedUntil && ` • Until ${formatDate(securityProfile.suspendedUntil)}`}
          </Typography>
          </Alert>
        )}

            {isTemporaryAccessActive && (
              <Box
                sx={{
                  mb: 4,
                  p: 3,
                  borderRadius: 4,
                  background: `linear-gradient(135deg, ${alpha("#10b981", 0.15)} 0%, ${alpha("#10b981", 0.05)} 100%)`,
                  border: "1px solid",
                  borderColor: alpha("#10b981", 0.3),
                  boxShadow: `0 4px 20px ${alpha("#000", 0.2)}`,
                  position: "relative",
                  overflow: "hidden",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "4px",
                    height: "100%",
                    background: "#10b981",
                  }
                }}
              >
                <Box sx={{ display: "flex", gap: 2.5, alignItems: "center" }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      bgcolor: alpha("#10b981", 0.2),
                      color: "#10b981",
                      flexShrink: 0,
                      boxShadow: `0 0 15px ${alpha("#10b981", 0.3)}`,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 28 }}>check_circle</span>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ color: "#ecfdf5", fontWeight: 800, fontSize: "1.15rem", mb: 0.5, letterSpacing: "-0.01em" }}>
                      Temporary Access Active
                    </Typography>
                    <Typography variant="body2" sx={{ color: alpha("#ecfdf5", 0.7), lineHeight: 1.6, maxWidth: "650px", fontWeight: 500 }}>
                      An administrative override is currently active. The employee can access the portal to complete their offboarding tasks until 
                      <strong style={{ color: "#10b981", marginLeft: "4px" }}>{formatDate(portalLink.accessExpiresAt)}</strong>.
                    </Typography>
                  </Box>
                  {canManage && (
                    <Button
                      variant="contained"
                      disableElevation
                      startIcon={<span className="material-symbols-outlined">more_time</span>}
                      onClick={() => setActionDialog({ type: "grantAccess", open: true })}
                      sx={{
                        background: `linear-gradient(135deg, #10b981 0%, #059669 100%)`,
                        boxShadow: `0 4px 12px ${alpha("#10b981", 0.4)}`,
                        "&:hover": { 
                          background: `linear-gradient(135deg, #10b981 20%, #059669 100%)`,
                          boxShadow: `0 6px 16px ${alpha("#10b981", 0.5)}`,
                          transform: "translateY(-1px)",
                        },
                        borderRadius: "12px",
                        textTransform: "none",
                        fontWeight: 800,
                        px: 3,
                        py: 1,
                        transition: "all 0.2s",
                      }}
                    >
                      Extend Further
                    </Button>
                  )}
                </Box>
              </Box>
            )}

            {isComplianceWindowExpired && (
            <Box
              sx={{
                mb: 4,
                p: 3,
                borderRadius: 4,
                background: `linear-gradient(135deg, ${alpha("#03a9f4", 0.15)} 0%, ${alpha("#03a9f4", 0.05)} 100%)`,
                border: "1px solid",
                borderColor: alpha("#03a9f4", 0.3),
                boxShadow: `0 4px 20px ${alpha("#000", 0.2)}`,
                position: "relative",
                overflow: "hidden",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "4px",
                  height: "100%",
                  background: "#03a9f4",
                }
              }}
            >
              <Box sx={{ display: "flex", gap: 2.5, alignItems: "center" }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    bgcolor: alpha("#03a9f4", 0.2),
                    color: "#03a9f4",
                    flexShrink: 0,
                    boxShadow: `0 0 15px ${alpha("#03a9f4", 0.3)}`,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 28 }}>history_toggle_off</span>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ color: "#e3f2fd", fontWeight: 800, fontSize: "1.15rem", mb: 0.5, letterSpacing: "-0.01em" }}>
                    Compliance Window Expired
                  </Typography>
                  <Typography variant="body2" sx={{ color: alpha("#e3f2fd", 0.7), lineHeight: 1.6, maxWidth: "650px", fontWeight: 500 }}>
                    The standard 24-hour access window for this employee has closed. 
                    This is a security enforcement to prevent unauthorized post-employment access.
                    {canManage && " Administrators can grant a temporary extension to allow task completion."}
                  </Typography>
                </Box>
                {canManage && (
                  <Button
                    variant="contained"
                    disableElevation
                    startIcon={<span className="material-symbols-outlined">more_time</span>}
                    onClick={() => setActionDialog({ type: "grantAccess", open: true })}
                    sx={{
                      background: `linear-gradient(135deg, #03a9f4 0%, #0288d1 100%)`,
                      boxShadow: `0 4px 12px ${alpha("#03a9f4", 0.4)}`,
                      "&:hover": { 
                        background: `linear-gradient(135deg, #03a9f4 20%, #0288d1 100%)`,
                        boxShadow: `0 6px 16px ${alpha("#03a9f4", 0.5)}`,
                        transform: "translateY(-1px)",
                      },
                      borderRadius: "12px",
                      textTransform: "none",
                      fontWeight: 800,
                      px: 3,
                      py: 1,
                      transition: "all 0.2s",
                    }}
                  >
                    Extend Access
                  </Button>
                )}
              </Box>
            </Box>
          )}

        <Grid container spacing={3}>

        <Grid size={{ xs: 12, lg: 8 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#00738a" }}>login</span>
                Last Login Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, width: 180 }}>Last Login</TableCell>
                    <TableCell>{formatDate(securityProfile.lastLoginAt)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>IP Address</TableCell>
                    <TableCell sx={{ fontFamily: "monospace" }}>
                      {securityProfile.lastLoginIp || "—"}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
                    <TableCell>
                      {securityProfile.lastLoginCity && securityProfile.lastLoginCountry
                        ? `${securityProfile.lastLoginCity}, ${securityProfile.lastLoginCountry}`
                        : "—"}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Auth Method</TableCell>
                    <TableCell sx={{ textTransform: "capitalize" }}>
                      {securityProfile.lastLoginMethod || "—"}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6" fontWeight={700} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#00738a" }}>devices</span>
                  Active Sessions ({activeSessions.length})
                </Typography>
                {canManage && activeSessions.length > 0 && (
                  <Button
                    size="small"
                    color="error"
                    startIcon={<span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>}
                    onClick={() => setActionDialog({ type: "forceLogout", open: true })}
                  >
                    Force Logout All
                  </Button>
                )}
              </Box>
              <Divider sx={{ mb: 2 }} />
              {activeSessions.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                  No active sessions
                </Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {activeSessions.map((session) => (
                    <Box
                      key={session.id}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: "background.default",
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                            <Typography variant="body2" fontWeight={600} fontFamily="monospace">
                              {session.ipAddress || "Unknown IP"}
                            </Typography>
                            <Chip
                              label={session.authMethod || "password"}
                              size="small"
                              sx={{ fontSize: "0.65rem", height: 20 }}
                            />
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {session.city && session.country
                              ? `${session.city}, ${session.country}`
                              : "Location unknown"}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          Active {formatTimeAgo(session.lastActiveAt)}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>

          {activeOffboarding && (
            <Card
              variant="outlined"
              sx={{
                borderRadius: 3,
                mb: 3,
                borderColor: activeOffboarding.riskLevel === "CRITICAL" ? "#ef444440" : activeOffboarding.riskLevel === "HIGH" ? "#f9731640" : "divider",
              }}
            >
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#f97316" }}>person_remove</span>
                  Active Offboarding
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, width: 180 }}>Status</TableCell>
                      <TableCell>
                        <Chip
                          label={activeOffboarding.status.replace("_", " ")}
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Risk Level</TableCell>
                      <TableCell>
                        <Chip
                          label={activeOffboarding.riskLevel || "NORMAL"}
                          size="small"
                          color={
                            activeOffboarding.riskLevel === "CRITICAL"
                              ? "error"
                              : activeOffboarding.riskLevel === "HIGH"
                              ? "warning"
                              : "default"
                          }
                          sx={{ fontWeight: 600 }}
                        />
                        {activeOffboarding.riskScore && (
                          <Typography component="span" variant="caption" sx={{ ml: 1 }}>
                            Score: {activeOffboarding.riskScore.score}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Lockdown</TableCell>
                      <TableCell>
                        {activeOffboarding.isLockedDown ? (
                          <Chip label="Active" size="small" color="error" sx={{ fontWeight: 600 }} />
                        ) : (
                          "Not activated"
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Scheduled Date</TableCell>
                      <TableCell>{formatDate(activeOffboarding.scheduledDate)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <Box sx={{ mt: 2 }}>
                  <Link href={`/app/offboardings/${activeOffboarding.id}`} style={{ textDecoration: "none" }}>
                    <Button size="small" variant="outlined">View Offboarding</Button>
                  </Link>
                </Box>
              </CardContent>
            </Card>
          )}

          <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#00738a" }}>inventory_2</span>
                Assigned Assets ({pendingAssets.length})
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {pendingAssets.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                  No assigned assets
                </Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {pendingAssets.map((asset) => {
                    const returnStatus = asset.assetReturns[0]?.status;
                    return (
                      <Box
                        key={asset.id}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          p: 1.5,
                          borderRadius: 1.5,
                          bgcolor: "background.default",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#6b7280" }}>
                            {asset.type === "LAPTOP" ? "laptop" : asset.type === "PHONE" ? "smartphone" : "devices"}
                          </span>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>{asset.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{asset.type}</Typography>
                          </Box>
                        </Box>
                        <Chip
                          label={returnStatus || asset.status.replace("_", " ")}
                          size="small"
                          color={
                            asset.status === "RETURNED" || returnStatus === "RETURNED"
                              ? "success"
                              : asset.status === "PENDING_RETURN"
                              ? "warning"
                              : "default"
                          }
                          sx={{ fontSize: "0.65rem" }}
                        />
                      </Box>
                    );
                  })}
                </Box>
              )}
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#f97316" }}>history</span>
                Recent Security Events
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {securityEvents.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                  No security events recorded
                </Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {securityEvents.map((event) => (
                    <Box
                      key={event.id}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: event.resolved ? "background.default" : alpha("#f59e0b", 0.05),
                        border: "1px solid",
                        borderColor: event.resolved ? "divider" : alpha("#f59e0b", 0.3),
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                            <Chip
                              label={event.eventType.replace(/_/g, " ")}
                              size="small"
                              sx={{ fontSize: "0.65rem", height: 20, fontWeight: 600 }}
                            />
                            {!event.resolved && (
                              <Chip label="Unresolved" size="small" color="warning" sx={{ fontSize: "0.65rem", height: 20 }} />
                            )}
                          </Box>
                          <Typography variant="body2">{event.description}</Typography>
                          {event.ipAddress && (
                            <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                              IP: {event.ipAddress}
                            </Typography>
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {formatTimeAgo(event.createdAt)}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          {canManage && (
            <Card variant="outlined" sx={{ borderRadius: 3, mb: 3, borderColor: "#00738a40" }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#00738a" }}>security</span>
                  Security Controls
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color={securityProfile.isHighRisk ? "warning" : "inherit"}
                    startIcon={<span className="material-symbols-outlined" style={{ fontSize: 18 }}>warning</span>}
                    onClick={() => setActionDialog({ type: "highRisk", open: true })}
                    sx={{ justifyContent: "flex-start", py: 1.5 }}
                  >
                    {securityProfile.isHighRisk ? "Remove High Risk Status" : "Mark as High Risk"}
                  </Button>

                  {!securityProfile.isSuspended && !securityProfile.isLocked && (
                    <Button
                      fullWidth
                      variant="outlined"
                      color="warning"
                      startIcon={<span className="material-symbols-outlined" style={{ fontSize: 18 }}>block</span>}
                      onClick={() => setActionDialog({ type: "suspend", open: true })}
                      sx={{ justifyContent: "flex-start", py: 1.5 }}
                    >
                      Suspend Access
                    </Button>
                  )}

                  {!securityProfile.isLocked && (
                    <Button
                      fullWidth
                      variant="outlined"
                      color="error"
                      startIcon={<span className="material-symbols-outlined" style={{ fontSize: 18 }}>lock</span>}
                      onClick={() => setActionDialog({ type: "lock", open: true })}
                      sx={{ justifyContent: "flex-start", py: 1.5 }}
                    >
                      Lock Account
                    </Button>
                  )}

                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<span className="material-symbols-outlined" style={{ fontSize: 18 }}>do_not_disturb_on</span>}
                    onClick={() => setActionDialog({ type: "blockIP", open: true })}
        sx={{ justifyContent: "flex-start", py: 1.5 }}
                    >
                      Block IP Address
                    </Button>

                      {portalLink?.status === "REVOKED" && (
                        <Button
                          fullWidth
                          variant="contained"
                          onClick={() => setActionDialog({ type: "grantAccess", open: true })}
                          startIcon={<span className="material-symbols-outlined" style={{ fontSize: 22 }}>more_time</span>}
                          sx={{
                            justifyContent: "center",
                            py: 2,
                            px: 3,
                            borderRadius: "16px",
                            background: `linear-gradient(135deg, #03a9f4 0%, #0288d1 100%)`,
                            boxShadow: `0 12px 24px -8px ${alpha("#03a9f4", 0.5)}`,
                            fontWeight: 800,
                            textTransform: "none",
                            fontSize: "1rem",
                            letterSpacing: "-0.01em",
                            color: "#fff",
                            border: "1px solid",
                            borderColor: alpha("#fff", 0.1),
                            "&:hover": {
                              background: `linear-gradient(135deg, #03a9f4 20%, #0288d1 100%)`,
                              boxShadow: `0 16px 32px -8px ${alpha("#03a9f4", 0.6)}`,
                              transform: "translateY(-2px)",
                            },
                            "&:active": {
                              transform: "translateY(0)",
                            },
                            transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                          }}
                        >
                          Grant Temporary Access
                        </Button>
                      )}
                  </Box>

              </CardContent>
            </Card>
          )}

          <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#ef4444" }}>block</span>
                Blocked IPs ({blockedIPs.length})
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {blockedIPs.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                  No blocked IPs
                </Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {blockedIPs.slice(0, 5).map((ip) => (
                    <Box
                      key={ip.id}
                      sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: "#ef444410",
                        border: "1px solid",
                        borderColor: "#ef444430",
                      }}
                    >
                      <Typography variant="body2" fontWeight={600} fontFamily="monospace">
                        {ip.ipAddress}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {ip.reason || "No reason provided"}
                      </Typography>
                      <Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
                        <Chip label={ip.scope} size="small" sx={{ fontSize: "0.6rem", height: 18 }} />
                        {ip.offboardingOnly && (
                          <Chip label="Offboarding Only" size="small" sx={{ fontSize: "0.6rem", height: 18 }} />
                        )}
                        <Chip label={`${ip._count.attempts} attempts`} size="small" sx={{ fontSize: "0.6rem", height: 18 }} />
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>info</span>
                Security Notice
              </Typography>
              <Typography variant="caption" color="text.secondary">
                All access to this security view is logged and auditable.
                Actions taken here are recorded with timestamps and administrator identity.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={actionDialog.open} onClose={() => setActionDialog({ type: null, open: false })} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>
          {actionDialog.type === "suspend" && "Suspend Employee Access"}
          {actionDialog.type === "lock" && "Lock Employee Account"}
          {actionDialog.type === "highRisk" && (securityProfile.isHighRisk ? "Remove High Risk Status" : "Mark as High Risk")}
          {actionDialog.type === "forceLogout" && "Force Logout All Sessions"}
          {actionDialog.type === "blockIP" && "Block IP Address"}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {actionDialog.type === "suspend" && "This will immediately revoke all active sessions and prevent the employee from logging in."}
            {actionDialog.type === "lock" && "This will lock the account pending review. The employee will not be able to access the system."}
            {actionDialog.type === "highRisk" && "This will flag the employee for additional monitoring during offboarding."}
          {actionDialog.type === "forceLogout" && "This will immediately terminate all active sessions for this employee."}
          {actionDialog.type === "blockIP" && "This will block the specified IP address from accessing the system."}
          {actionDialog.type === "grantAccess" && (
            <>
              This will grant the employee temporary access to the portal to complete their offboarding tasks. 
              The access will automatically expire after the selected duration.
            </>
          )}
        </Typography>

        {actionDialog.type === "grantAccess" && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom fontWeight={600}>
              Extension Duration
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              {[2, 4, 8, 24].map((h) => (
                <Button
                  key={h}
                  variant={extensionHours === h ? "contained" : "outlined"}
                  onClick={() => setExtensionHours(h)}
                  size="small"
                  sx={{ flex: 1, borderRadius: 2 }}
                >
                  {h}h
                </Button>
              ))}
            </Box>
          </Box>
        )}

        {actionDialog.type === "blockIP" && (

            <TextField
              fullWidth
              label="IP Address"
              value={ipToBlock}
              onChange={(e) => setIpToBlock(e.target.value)}
              placeholder="192.168.1.1"
              sx={{ mb: 2 }}
            />
          )}

          <TextField
            fullWidth
            label="Reason (required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            multiline
            rows={3}
            placeholder="Provide a reason for this action..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setActionDialog({ type: null, open: false })}>Cancel</Button>
          <Button
            variant="contained"
            color={actionDialog.type === "lock" || actionDialog.type === "suspend" ? "error" : "primary"}
            onClick={handleAction}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
