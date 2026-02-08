"use client";

import React, { useState, useTransition, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Tooltip,
  Grid,
  alpha,
  Tabs,
  Tab,
  useTheme,
  Collapse,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { stitchTokens } from "@/theme/tokens";
import { PLATFORM_SECURITY_POLICY_TYPES, PlatformSecurityPolicyType, PolicyScope, PolicySeverity } from "@/lib/policy-definitions";
import { SecuritySettingRow } from "@/components/ui/StitchUI";

const t = stitchTokens;

type BlockedIP = {
  id: string;
  ipAddress: string;
  scope: "GLOBAL" | "ORGANIZATION" | "EMPLOYEE";
  reason: string | null;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  createdBy: { id: string; name: string | null; email: string };
  _count: { attempts: number };
};

type SecurityPolicy = {
  id: string | null;
  policyType: string;
  name: string;
  description: string;
  enforcement?: string;
  trigger?: string;
  category?: string;
  scope?: PolicyScope;
  severity?: PolicySeverity;
  icon?: string;
  config: Record<string, unknown>;
  isActive: boolean;
  lastTriggeredAt?: Date | null;
  triggerCount?: number;
};

type SecurityEvent = {
  id: string;
  eventType: string;
  description: string;
  ipAddress: string | null;
  createdAt: Date;
  resolved: boolean;
};

type UserSessionInfo = {
  id: string;
  deviceName: string;
  browser: string;
  os: string;
  location: string;
  ipAddress: string | null;
  lastActive: string | null;
  createdAt: string;
  rememberDevice: boolean;
  isCurrent: boolean;
};

interface SecuritySettingsClientProps {
  blockedIPs: BlockedIP[];
  securityPolicies: Record<string, SecurityPolicy>;
  recentSecurityEvents: SecurityEvent[];
  organizationId: string;
}

const severityMap: Record<PolicySeverity, "low" | "medium" | "high" | "critical"> = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

function PolicyStatusBadge({ isActive, isDark }: { isActive: boolean; isDark: boolean }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        p: 1.5,
        borderRadius: 1.5,
        bgcolor: isActive
          ? alpha("#10b981", isDark ? 0.15 : 0.08)
          : alpha("#94a3b8", isDark ? 0.15 : 0.08),
        border: "1px solid",
        borderColor: isActive
          ? alpha("#10b981", 0.3)
          : alpha("#94a3b8", 0.2),
      }}
    >
      <Box
        sx={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          bgcolor: isActive ? "#10b981" : "#94a3b8",
        }}
      />
      <Box>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            color: isActive ? "#10b981" : "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            fontSize: "0.65rem",
          }}
        >
          Policy Status
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: isActive ? "#10b981" : (isDark ? "#94a3b8" : "#64748b"),
          }}
        >
          {isActive ? "Enabled" : "Disabled"}
        </Typography>
      </Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ ml: "auto", fontSize: "0.7rem" }}
      >
        Use toggle above to change
      </Typography>
    </Box>
  );
}

interface PolicyCardProps {
  policy: SecurityPolicy;
  isExpanded: boolean;
  onToggle: () => void;
  onExpand: () => void;
  onSave: (config: Record<string, unknown>) => Promise<void>;
  disabled: boolean;
  saveSuccess: boolean;
}

function PolicyCard({ policy, isExpanded, onToggle, onExpand, onSave, disabled, saveSuccess }: PolicyCardProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const icon = policy.icon || "security";
  const [localConfig, setLocalConfig] = useState<Record<string, unknown>>(policy.config);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    setLocalConfig(policy.config);
  }, [policy.config]);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(localConfig);
    setIsSaving(false);
  };

  const handleCancel = () => {
    setLocalConfig(policy.config);
    onExpand();
  };

  const renderConfigFields = () => {
    const policyType = policy.policyType as PlatformSecurityPolicyType;
    const config = localConfig as Record<string, unknown>;

    switch (policyType) {
      case "RESTRICT_ADMIN_IP":
        return (
          <Box sx={{ display: "grid", gap: 2.5 }}>
            <PolicyStatusBadge isActive={policy.isActive} isDark={isDark} />
            <TextField
              fullWidth
              size="small"
              label="Allowed IP Ranges"
              value={((config.allowedRanges as string[]) || []).join(", ")}
              onChange={(e) => setLocalConfig({ ...config, allowedRanges: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
              helperText="Comma-separated IP addresses or CIDR ranges (e.g., 192.168.1.0/24)"
              multiline
              rows={2}
            />
          </Box>
        );

      case "FAILED_LOGIN_LOCKOUT":
        return (
          <Box sx={{ display: "grid", gap: 2.5 }}>
            <PolicyStatusBadge isActive={policy.isActive} isDark={isDark} />
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <Box>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Maximum Attempts</Typography>
                <TextField
                  fullWidth
                  type="number"
                  size="small"
                  value={(config.maxAttempts as number) ?? 5}
                  onChange={(e) => setLocalConfig({ ...config, maxAttempts: parseInt(e.target.value) })}
                  helperText="Failed attempts before lockout"
                  inputProps={{ min: 1, max: 20 }}
                />
              </Box>
              <Box>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Lockout Duration</Typography>
                <TextField
                  fullWidth
                  type="number"
                  size="small"
                  value={(config.lockoutMinutes as number) ?? 15}
                  onChange={(e) => setLocalConfig({ ...config, lockoutMinutes: parseInt(e.target.value) })}
                  helperText="Duration in minutes"
                  inputProps={{ min: 1, max: 1440 }}
                />
              </Box>
            </Box>
          </Box>
        );

      case "SESSION_EXPIRATION":
        return (
          <Box sx={{ display: "grid", gap: 2.5 }}>
            <PolicyStatusBadge isActive={policy.isActive} isDark={isDark} />
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <Box>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Timeout Duration</Typography>
                <TextField
                  fullWidth
                  type="number"
                  size="small"
                  value={(config.timeoutMinutes as number) ?? 60}
                  onChange={(e) => setLocalConfig({ ...config, timeoutMinutes: parseInt(e.target.value) })}
                  helperText="Session expires after (minutes)"
                  inputProps={{ min: 5, max: 1440 }}
                />
              </Box>
              <Box>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Warning Before Expiration</Typography>
                <TextField
                  fullWidth
                  type="number"
                  size="small"
                  value={(config.warnBeforeMinutes as number) ?? 5}
                  onChange={(e) => setLocalConfig({ ...config, warnBeforeMinutes: parseInt(e.target.value) })}
                  helperText="Warn user (minutes before)"
                  inputProps={{ min: 1, max: 30 }}
                />
              </Box>
            </Box>
          </Box>
        );

      default:
        return (
          <Box sx={{ display: "grid", gap: 2.5 }}>
            <PolicyStatusBadge isActive={policy.isActive} isDark={isDark} />
            <Typography variant="body2" color="text.secondary">
              No additional configuration options available for this policy.
            </Typography>
          </Box>
        );
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        bgcolor: isDark ? t.colors.background.surfaceLight : "#fff",
        borderColor: isExpanded
          ? alpha("#00738a", 0.4)
          : policy.isActive
            ? alpha("#10b981", 0.3)
            : (isDark ? t.colors.border.subtle : "#e2e8f0"),
        "&:hover": {
          borderColor: isExpanded
            ? alpha("#00738a", 0.5)
            : policy.isActive
              ? alpha("#10b981", 0.5)
              : alpha("#00738a", 0.2),
        },
      }}
    >
      <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
        <Box sx={{ p: 2.5 }}>
          <SecuritySettingRow
            title={policy.name}
            description={policy.description}
            icon={icon}
            enabled={policy.isActive}
            onToggle={onToggle}
            disabled={disabled}
            riskLevel={policy.severity ? severityMap[policy.severity] : undefined}
            onConfigure={onExpand}
            configureLabel={isExpanded ? "Close" : "Configure"}
          />
        </Box>

        <Collapse in={isExpanded}>
          <Box
            sx={{
              px: 2.5,
              pb: 2.5,
              borderTop: "1px solid",
              borderColor: isDark ? t.colors.border.subtle : "#e2e8f0",
            }}
          >
            <Box sx={{ pt: 2.5 }}>
              {policy.trigger && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 2.5,
                    p: 1.5,
                    borderRadius: 1.5,
                    bgcolor: isDark ? alpha("#3b82f6", 0.1) : alpha("#3b82f6", 0.05),
                    border: "1px solid",
                    borderColor: alpha("#3b82f6", 0.2),
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#3b82f6" }}>
                    info
                  </span>
                  <Typography variant="caption" sx={{ color: isDark ? "#93c5fd" : "#1e40af" }}>
                    <strong>Trigger:</strong> {policy.trigger}
                  </Typography>
                </Box>
              )}

              {renderConfigFields()}

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mt: 3,
                  pt: 2.5,
                  borderTop: "1px solid",
                  borderColor: isDark ? t.colors.border.subtle : "#e2e8f0",
                }}
              >
                <Box>
                  {saveSuccess ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#10b981" }}>
                        check_circle
                      </span>
                      <Typography variant="caption" sx={{ color: "#10b981", fontWeight: 600 }}>
                        Configuration saved successfully
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      Changes are recorded in Audit Logs
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: "flex", gap: 1.5 }}>
                  <Button
                    size="small"
                    onClick={handleCancel}
                    disabled={isSaving}
                    sx={{
                      minWidth: 80,
                      px: 2,
                      py: 0.75,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      borderRadius: 1.5,
                      textTransform: "none",
                      color: "text.secondary",
                      "&:hover": { bgcolor: isDark ? t.colors.glass.hover : "#f1f5f9" },
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleSave}
                    disabled={isSaving || disabled}
                    sx={{
                      minWidth: 140,
                      px: 2.5,
                      py: 0.75,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      borderRadius: 1.5,
                      textTransform: "none",
                      bgcolor: "#1e293b",
                      color: "#fff",
                      "&:hover": { bgcolor: "#0f172a" },
                      "&:disabled": { bgcolor: "#94a3b8", color: "#fff" },
                    }}
                  >
                    {isSaving ? "Saving..." : "Save Configuration"}
                  </Button>
                </Box>
              </Box>
            </Box>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}

export default function SecuritySettingsClient({
  blockedIPs,
  securityPolicies,
  recentSecurityEvents,
  organizationId,
}: SecuritySettingsClientProps) {
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; ipAddress: string } | null>(null);
  const [attemptsDialog, setAttemptsDialog] = useState<{ open: boolean; blockedIPId: string; ipAddress: string } | null>(null);
  const [attempts, setAttempts] = useState<Array<{ id: string; path: string | null; method: string | null; userAgent: string | null; createdAt: Date }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccessPolicy, setSaveSuccessPolicy] = useState<string | null>(null);

  const [sessions, setSessions] = useState<UserSessionInfo[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingSession, setRevokingSession] = useState<string | null>(null);
  const [revokeAllDialog, setRevokeAllDialog] = useState(false);

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions);
      }
    } catch (e) {
      console.error("Failed to fetch sessions", e);
    }
    setSessionsLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === 3) {
      fetchSessions();
    }
  }, [activeTab, fetchSessions]);

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSession(sessionId);
    try {
      const res = await fetch(`/api/sessions?sessionId=${sessionId}&reason=User%20revoked%20session`, { method: "DELETE" });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      }
    } catch (e) {
      console.error("Failed to revoke session", e);
    }
    setRevokingSession(null);
  };

  const handleRevokeAllSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions?revokeAll=true&reason=User%20revoked%20all%20sessions`, { method: "DELETE" });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.isCurrent));
        setRevokeAllDialog(false);
      }
    } catch (e) {
      console.error("Failed to revoke all sessions", e);
    }
    setLoading(false);
  };

  const formatRelativeTime = (dateStr: string | null): string => {
    if (!dateStr) return "Unknown";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const [formData, setFormData] = useState({
    ipAddress: "",
    reason: "",
    duration: "permanent",
  });

  const platformSecurityPolicies = Object.values(securityPolicies).filter(
    p => PLATFORM_SECURITY_POLICY_TYPES.includes(p.policyType as PlatformSecurityPolicyType)
  );

  const handleSubmit = async (e: React.FormEvent, confirmOwnIP = false) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let expiresAt: string | null = null;
    if (formData.duration !== "permanent") {
      const hours = parseInt(formData.duration);
      const expireDate = new Date();
      expireDate.setHours(expireDate.getHours() + hours);
      expiresAt = expireDate.toISOString();
    }

    try {
      const response = await fetch("/api/blocked-ips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ipAddress: formData.ipAddress,
          scope: "ORGANIZATION",
          reason: formData.reason || null,
          expiresAt,
          confirmOwnIP,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === "CONFIRM_OWN_IP") {
          setConfirmDialog({ open: true, ipAddress: formData.ipAddress });
          setLoading(false);
          return;
        }
        throw new Error(data.error || "Failed to block IP");
      }

      setDialogOpen(false);
      setFormData({ ipAddress: "", reason: "", duration: "permanent" });
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
    setLoading(false);
  };

  const handleConfirmOwnIP = async () => {
    setConfirmDialog(null);
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    await handleSubmit(fakeEvent, true);
  };

  const handleUnblock = async (id: string) => {
    if (!confirm("Are you sure you want to unblock this IP address?")) return;
    setLoading(true);

    try {
      const response = await fetch(`/api/blocked-ips?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to unblock IP");
      }

      startTransition(() => router.refresh());
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred");
    }
    setLoading(false);
  };

  const handleViewAttempts = async (blockedIPId: string, ipAddress: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/blocked-ips/attempts?blockedIPId=${blockedIPId}`, {
        credentials: "include",
      });
      const data = await response.json();
      setAttempts(data.attempts || []);
      setAttemptsDialog({ open: true, blockedIPId, ipAddress });
    } catch {
      alert("Failed to load attempts");
    }
    setLoading(false);
  };

  const handleExpandPolicy = (policyType: string) => {
    setExpandedPolicy(expandedPolicy === policyType ? null : policyType);
    setSaveSuccessPolicy(null);
  };

  const handleSavePolicy = async (policy: SecurityPolicy, config: Record<string, unknown>) => {
    setLoading(true);

    try {
      const response = await fetch("/api/security-policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          policyType: policy.policyType,
          config: config,
          isActive: policy.isActive,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save policy configuration");
      }

      setSaveSuccessPolicy(policy.policyType);
      setTimeout(() => setSaveSuccessPolicy(null), 5000);
      startTransition(() => router.refresh());
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred");
    }
    setLoading(false);
  };

  const handleTogglePolicy = async (policy: SecurityPolicy) => {
    setLoading(true);

    try {
      const response = await fetch("/api/security-policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          policyType: policy.policyType,
          config: policy.config,
          isActive: !policy.isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to toggle policy");
      }

      startTransition(() => router.refresh());
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred");
    }
    setLoading(false);
  };

  const isExpired = (expiresAt: Date | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const formatExpiration = (expiresAt: Date | null) => {
    if (!expiresAt) return "Permanent";
    const date = new Date(expiresAt);
    if (date < new Date()) return "Expired";
    return date.toLocaleString();
  };

  const formatTimeAgo = (date: Date) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const activePoliciesCount = platformSecurityPolicies.filter(p => p.isActive).length;
  const totalPoliciesCount = platformSecurityPolicies.length;

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800}>Security Settings</Typography>
        <Typography color="text.secondary">
          Platform-level security controls for authentication, sessions, and network access
        </Typography>
      </Box>

        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{
            mb: 3,
            "& .MuiTab-root": { fontWeight: 600, textTransform: "none" },
          }}
        >
          <Tab label={`Platform Security (${activePoliciesCount}/${totalPoliciesCount})`} />
          <Tab label={`IP Blocking (${blockedIPs.filter(ip => ip.isActive && !isExpired(ip.expiresAt)).length})`} />
          <Tab label={`Security Events (${recentSecurityEvents.filter(e => !e.resolved).length})`} />
          <Tab
            label="My Sessions"
            icon={<span className="material-symbols-outlined" style={{ fontSize: 18 }}>devices</span>}
            iconPosition="start"
          />
        </Tabs>

      {activeTab === 0 && (
        <Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              px: 2,
              py: 1.5,
              mb: 4,
              borderRadius: 2,
              bgcolor: isDark ? alpha("#3b82f6", 0.1) : alpha("#3b82f6", 0.05),
              border: "1px solid",
              borderColor: alpha("#3b82f6", 0.2),
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#3b82f6" }}>
              info
            </span>
            <Typography variant="body2" color="text.secondary">
              These settings control how the platform itself is secured. For offboarding enforcement rules, go to{" "}
              <Button
                variant="text"
                size="small"
                onClick={() => router.push("/app/settings/policies")}
                sx={{ p: 0, minWidth: "auto", fontWeight: 700, textTransform: "none", fontSize: "inherit", verticalAlign: "baseline" }}
              >
                Security Policies
              </Button>
              .
            </Typography>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {platformSecurityPolicies.map((policy) => (
              <PolicyCard
                key={policy.policyType}
                policy={policy}
                isExpanded={expandedPolicy === policy.policyType}
                onToggle={() => handleTogglePolicy(policy)}
                onExpand={() => handleExpandPolicy(policy.policyType)}
                onSave={(config) => handleSavePolicy(policy, config)}
                disabled={loading || isPending}
                saveSuccess={saveSuccessPolicy === policy.policyType}
              />
            ))}
          </Box>
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: 2,
                py: 1.5,
                flex: 1,
                mr: 2,
                borderRadius: 2,
                bgcolor: isDark ? alpha("#3b82f6", 0.1) : alpha("#3b82f6", 0.05),
                border: "1px solid",
                borderColor: alpha("#3b82f6", 0.2),
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#3b82f6" }}>
                info
              </span>
              <Typography variant="body2" color="text.secondary">
                Blocked IPs will be denied access to login, registration, and all protected routes.
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="error"
              startIcon={<span className="material-symbols-outlined" style={{ fontSize: 18 }}>block</span>}
              onClick={() => setDialogOpen(true)}
              sx={{ borderRadius: 2, fontWeight: 700, flexShrink: 0, px: 2.5 }}
            >
              Block IP
            </Button>
          </Box>

          <Card
            variant="outlined"
            sx={{
              borderRadius: 2,
              bgcolor: isDark ? t.colors.background.surfaceLight : "#fff",
              borderColor: isDark ? t.colors.border.subtle : "#e2e8f0",
            }}
          >
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ "& th": { fontWeight: 700, color: "text.secondary", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: 0.5 } }}>
                    <TableCell>IP Address</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Expires</TableCell>
                    <TableCell>Attempts</TableCell>
                    <TableCell>Blocked By</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {blockedIPs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ py: 6, textAlign: "center" }}>
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                          <Box
                            sx={{
                              width: 48,
                              height: 48,
                              borderRadius: 2,
                              bgcolor: isDark ? t.colors.glass.hover : "#f1f5f9",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 24, color: "#10b981" }}>
                              verified_user
                            </span>
                          </Box>
                          <Typography fontWeight={600}>No blocked IP addresses</Typography>
                          <Typography variant="body2" color="text.secondary">
                            All traffic is currently allowed
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    blockedIPs.map((ip) => (
                      <TableRow key={ip.id} hover sx={{ opacity: !ip.isActive || isExpired(ip.expiresAt) ? 0.5 : 1 }}>
                        <TableCell>
                          <Typography fontWeight={600} fontFamily="monospace" fontSize="0.85rem">
                            {ip.ipAddress}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 180 }} noWrap>
                            {ip.reason || "No reason"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {!ip.isActive ? (
                            <Chip label="Unblocked" size="small" variant="outlined" sx={{ fontSize: "0.7rem", height: 24 }} />
                          ) : isExpired(ip.expiresAt) ? (
                            <Chip label="Expired" size="small" sx={{ fontSize: "0.7rem", height: 24, bgcolor: alpha("#f59e0b", 0.1), color: "#f59e0b" }} />
                          ) : (
                            <Chip label="Active" size="small" sx={{ fontSize: "0.7rem", height: 24, bgcolor: alpha("#ef4444", 0.1), color: "#ef4444" }} />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontSize="0.85rem">{formatExpiration(ip.expiresAt)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="View attempts">
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => handleViewAttempts(ip.id, ip.ipAddress)}
                              sx={{ minWidth: "auto", fontWeight: 600 }}
                            >
                              {ip._count.attempts}
                            </Button>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontSize="0.85rem">
                            {ip.createdBy.name || ip.createdBy.email}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {ip.isActive && !isExpired(ip.expiresAt) && (
                            <Button
                              size="small"
                              onClick={() => handleUnblock(ip.id)}
                              disabled={loading}
                              sx={{ fontWeight: 600, color: "#10b981" }}
                            >
                              Unblock
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          <Card
            variant="outlined"
            sx={{
              borderRadius: 2,
              bgcolor: isDark ? t.colors.background.surfaceLight : "#fff",
              borderColor: isDark ? t.colors.border.subtle : "#e2e8f0",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#64748b" }}>
                  history
                </span>
                <Typography variant="subtitle1" fontWeight={700}>
                  Recent Security Events
                </Typography>
              </Box>
              {recentSecurityEvents.length === 0 ? (
                <Box sx={{ py: 4, textAlign: "center" }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: isDark ? t.colors.glass.hover : "#f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mx: "auto",
                      mb: 1.5,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 24, color: "#10b981" }}>
                      check_circle
                    </span>
                  </Box>
                  <Typography fontWeight={600}>No security events</Typography>
                  <Typography variant="body2" color="text.secondary">
                    All systems operating normally
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {recentSecurityEvents.map((event) => (
                    <Box
                      key={event.id}
                      sx={{
                        p: 2,
                        borderRadius: 1.5,
                        bgcolor: event.resolved 
                          ? (isDark ? t.colors.glass.hover : "#f8fafc")
                          : alpha("#f59e0b", 0.05),
                        border: "1px solid",
                        borderColor: event.resolved 
                          ? (isDark ? t.colors.border.subtle : "#e2e8f0")
                          : alpha("#f59e0b", 0.2),
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
                            <Chip
                              label={event.eventType.replace(/_/g, " ")}
                              size="small"
                              sx={{
                                fontSize: "0.65rem",
                                height: 22,
                                fontWeight: 600,
                                bgcolor: isDark ? t.colors.glass.hover : "#e2e8f0",
                              }}
                            />
                            {!event.resolved && (
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                  px: 1,
                                  py: 0.25,
                                  borderRadius: 1,
                                  bgcolor: alpha("#f59e0b", 0.1),
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: "50%",
                                    bgcolor: "#f59e0b",
                                  }}
                                />
                                <Typography variant="caption" sx={{ color: "#f59e0b", fontWeight: 600, fontSize: "0.65rem" }}>
                                  Unresolved
                                </Typography>
                              </Box>
                            )}
                          </Box>
                          <Typography variant="body2" sx={{ mb: 0.5 }}>{event.description}</Typography>
                          {event.ipAddress && (
                            <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                              IP: {event.ipAddress}
                            </Typography>
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, ml: 2 }}>
                          {formatTimeAgo(event.createdAt)}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
              </CardContent>
            </Card>
          </Box>
        )}

        {activeTab === 3 && (
          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  px: 2,
                  py: 1.5,
                  flex: 1,
                  mr: 2,
                  borderRadius: 2,
                  bgcolor: isDark ? alpha("#6366f1", 0.08) : alpha("#6366f1", 0.05),
                  border: "1px solid",
                  borderColor: alpha("#6366f1", 0.2),
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#6366f1" }}>
                  security
                </span>
                <Typography variant="body2" color="text.secondary">
                  Sessions are protected with secure httpOnly tokens. Sessions are invalidated when your password changes, role changes, or you&apos;re offboarded.
                </Typography>
              </Box>
              {sessions.filter((s) => !s.isCurrent).length > 0 && (
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={() => setRevokeAllDialog(true)}
                  sx={{ borderRadius: 2, fontWeight: 700, flexShrink: 0, px: 2.5 }}
                >
                  Revoke All Other Sessions
                </Button>
              )}
            </Box>

            {sessionsLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 24, color: "#6366f1", animation: "spin 1s linear infinite" }}>sync</span>
                  <Typography>Loading sessions...</Typography>
                </Box>
              </Box>
            ) : sessions.length === 0 ? (
              <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: isDark ? t.colors.background.surfaceLight : "#fff", borderColor: isDark ? t.colors.border.subtle : "#e2e8f0" }}>
                <CardContent sx={{ py: 6, textAlign: "center" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 48, color: isDark ? "#3f3f46" : "#d1d5db", marginBottom: 8 }}>devices</span>
                  <Typography fontWeight={600}>No active sessions</Typography>
                  <Typography variant="body2" color="text.secondary">No sessions found for your account</Typography>
                </CardContent>
              </Card>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {sessions.map((session) => (
                  <Card
                    key={session.id}
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      bgcolor: isDark ? t.colors.background.surfaceLight : "#fff",
                      borderColor: session.isCurrent ? alpha("#22c55e", 0.4) : (isDark ? t.colors.border.subtle : "#e2e8f0"),
                      transition: "border-color 0.2s ease",
                      "&:hover": { borderColor: session.isCurrent ? alpha("#22c55e", 0.5) : alpha("#6366f1", 0.3) },
                    }}
                  >
                    <CardContent sx={{ display: "flex", alignItems: "flex-start", gap: 2.5, p: 2.5, "&:last-child": { pb: 2.5 } }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          bgcolor: session.isCurrent ? alpha("#22c55e", 0.1) : alpha("#6366f1", 0.08),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 24, color: session.isCurrent ? "#22c55e" : "#6366f1" }}>
                          {session.deviceName === "Mobile Device" ? "smartphone" : session.deviceName === "Tablet" ? "tablet" : "computer"}
                        </span>
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                          <Typography fontWeight={600}>{session.browser}</Typography>
                          {session.isCurrent && (
                            <Chip label="Current Session" size="small" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 600, bgcolor: alpha("#22c55e", 0.1), color: "#22c55e", border: `1px solid ${alpha("#22c55e", 0.3)}` }} />
                          )}
                          {session.rememberDevice && (
                            <Tooltip title="This device is remembered for 30 days">
                              <Chip
                                icon={<span className="material-symbols-outlined" style={{ fontSize: 14 }}>verified</span>}
                                label="Trusted"
                                size="small"
                                sx={{ height: 20, fontSize: "0.65rem", fontWeight: 600, bgcolor: alpha("#6366f1", 0.1), color: "#6366f1", border: `1px solid ${alpha("#6366f1", 0.3)}`, "& .MuiChip-icon": { color: "#6366f1", ml: 0.5 } }}
                              />
                            </Tooltip>
                          )}
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap", mb: 1 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16, color: isDark ? "#71717a" : "#9ca3af" }}>
                              {session.os.startsWith("Windows") ? "window" : session.os.startsWith("macOS") ? "laptop_mac" : session.os.startsWith("iOS") ? "phone_iphone" : "computer"}
                            </span>
                            <Typography variant="body2" color="text.secondary">{session.os}</Typography>
                          </Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16, color: isDark ? "#71717a" : "#9ca3af" }}>location_on</span>
                            <Typography variant="body2" color="text.secondary">{session.location}</Typography>
                          </Box>
                          {session.ipAddress && (
                            <Typography variant="caption" color="text.secondary" fontFamily="monospace">{session.ipAddress}</Typography>
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          Last active: {formatRelativeTime(session.lastActive)} • Signed in: {new Date(session.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                      {!session.isCurrent && (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleRevokeSession(session.id)}
                          disabled={revokingSession === session.id}
                          sx={{
                            fontWeight: 600,
                            borderColor: isDark ? "#3f3f46" : "#d1d5db",
                            color: isDark ? "#a1a1aa" : "#52525b",
                            minWidth: 80,
                            "&:hover": { borderColor: "#dc2626", color: "#dc2626", bgcolor: alpha("#dc2626", 0.05) },
                          }}
                        >
                          {revokingSession === session.id ? "..." : "Revoke"}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Box>
        )}

        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <form onSubmit={(e) => handleSubmit(e, false)}>
          <DialogTitle fontWeight={700}>Block IP Address</DialogTitle>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>{error}</Alert>}
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="IP Address"
                  value={formData.ipAddress}
                  onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                  required
                  placeholder="192.168.1.1"
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
                  <InputLabel>Duration</InputLabel>
                  <Select
                    value={formData.duration}
                    label="Duration"
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  >
                    <MenuItem value="1">1 hour</MenuItem>
                    <MenuItem value="24">24 hours</MenuItem>
                    <MenuItem value="168">7 days</MenuItem>
                    <MenuItem value="720">30 days</MenuItem>
                    <MenuItem value="permanent">Permanent</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, pt: 1, justifyContent: "flex-end" }}>
            <Button onClick={() => setDialogOpen(false)} sx={{ fontWeight: 600, minWidth: 80 }}>Cancel</Button>
            <Button type="submit" variant="contained" color="error" disabled={loading} sx={{ fontWeight: 600, minWidth: 100 }}>
              Block IP
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={confirmDialog?.open || false} onClose={() => setConfirmDialog(null)} PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle fontWeight={700}>Block Your Own IP?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1, borderRadius: 1.5 }}>
            You are about to block your own IP address ({confirmDialog?.ipAddress}). 
            This will immediately lock you out.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1, justifyContent: "flex-end" }}>
          <Button onClick={() => setConfirmDialog(null)} sx={{ fontWeight: 600, minWidth: 80 }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleConfirmOwnIP} sx={{ fontWeight: 600, minWidth: 100 }}>
            Block Anyway
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={attemptsDialog?.open || false} onClose={() => setAttemptsDialog(null)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle fontWeight={700}>
          Blocked Attempts for {attemptsDialog?.ipAddress}
        </DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ "& th": { fontWeight: 700, color: "text.secondary", fontSize: "0.7rem", textTransform: "uppercase" } }}>
                  <TableCell>Date/Time</TableCell>
                  <TableCell>Path</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell>User Agent</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attempts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ textAlign: "center", py: 4 }}>
                      No blocked attempts recorded
                    </TableCell>
                  </TableRow>
                ) : (
                  attempts.map((attempt) => (
                    <TableRow key={attempt.id}>
                      <TableCell>{new Date(attempt.createdAt).toLocaleString()}</TableCell>
                      <TableCell><code style={{ fontSize: "0.8rem" }}>{attempt.path || "-"}</code></TableCell>
                      <TableCell>{attempt.method || "-"}</TableCell>
                      <TableCell sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {attempt.userAgent || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
          <DialogActions sx={{ p: 2.5, pt: 1, justifyContent: "flex-end" }}>
            <Button onClick={() => setAttemptsDialog(null)} sx={{ fontWeight: 600, minWidth: 80 }}>Close</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={revokeAllDialog} onClose={() => setRevokeAllDialog(false)} PaperProps={{ sx: { borderRadius: 2, maxWidth: 400 } }}>
          <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, pb: 1 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1.5,
                bgcolor: alpha("#dc2626", 0.1),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#dc2626" }}>logout</span>
            </Box>
            <Box>
              <Typography fontWeight={700}>Revoke All Sessions</Typography>
              <Typography variant="caption" color="text.secondary">This will sign you out of all other devices</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              You will be signed out of {sessions.filter((s) => !s.isCurrent).length} other device{sessions.filter((s) => !s.isCurrent).length === 1 ? "" : "s"}. Your current session will remain active.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, pt: 1 }}>
            <Button onClick={() => setRevokeAllDialog(false)} sx={{ fontWeight: 600 }}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleRevokeAllSessions}
              disabled={loading}
              sx={{ fontWeight: 600, bgcolor: "#dc2626", "&:hover": { bgcolor: "#b91c1c" } }}
            >
              {loading ? "Revoking..." : "Revoke All"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }
