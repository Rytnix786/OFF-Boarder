"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  alpha,
  useTheme,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
} from "@mui/material";
import { usePlatformContext } from "./AdminClientLayout";
import { stitchTokens } from "@/theme/tokens";

const t = stitchTokens;

type PlatformData = {
  platform: {
    status: string;
    message: string | null;
    incidentMode: boolean;
    incidentReason: string | null;
    incidentStarted: string | null;
  };
  organizations: {
    total: number;
    active: number;
    pending: number;
    suspended: number;
  };
  offboardings: {
    total: number;
    active: number;
    highRisk: number;
    critical: number;
  };
  signals: {
    unresolved: number;
    critical: number;
    recent: Array<{
      id: string;
      signalType: string;
      severity: string;
      title: string;
      description: string | null;
      createdAt: string;
    }>;
  };
  security: {
    unresolvedEvents: number;
  };
};

function StatusIndicator({ status, incidentMode }: { status: string; incidentMode: boolean }) {
  const statusConfig: Record<string, { color: string; label: string; icon: string }> = {
    OPERATIONAL: { color: "#22c55e", label: "Operational", icon: "check_circle" },
    DEGRADED: { color: "#f59e0b", label: "Degraded", icon: "warning" },
    INCIDENT: { color: "#dc2626", label: "Incident", icon: "error" },
    MAINTENANCE: { color: "#6366f1", label: "Maintenance", icon: "build" },
  };

  const config = statusConfig[status] || statusConfig.OPERATIONAL;

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        px: 2,
        py: 1,
        borderRadius: 2,
        bgcolor: alpha(config.color, 0.1),
        border: `1px solid ${alpha(config.color, 0.25)}`,
      }}
    >
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          bgcolor: config.color,
          animation: incidentMode ? "pulse 1.5s infinite" : undefined,
        }}
      />
      <span className="material-symbols-outlined" style={{ fontSize: 18, color: config.color }}>
        {config.icon}
      </span>
      <Typography sx={{ fontSize: t.typography.fontSize.sm, fontWeight: 600, color: config.color }}>
        {config.label}
      </Typography>
    </Box>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  color = "#71717a",
  incidentMode,
  attention = false,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: string;
  color?: string;
  incidentMode: boolean;
  attention?: boolean;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 2,
        bgcolor: incidentMode
          ? attention
            ? alpha("#dc2626", 0.08)
            : alpha("#1c1917", 0.5)
          : isDark
          ? "#18181b"
          : "#fff",
        border: "1px solid",
        borderColor: incidentMode
          ? attention
            ? alpha("#dc2626", 0.3)
            : alpha("#dc2626", 0.15)
          : isDark
          ? "#27272a"
          : "#e5e7eb",
        transition: "all 150ms ease",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.5,
            bgcolor: alpha(color, 0.1),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20, color }}>{icon}</span>
        </Box>
        {attention && (
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#dc2626", animation: "pulse 1.5s infinite" }} />
        )}
      </Box>
      <Typography sx={{ fontSize: t.typography.fontSize.xs, fontWeight: 500, color: isDark ? "#71717a" : "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", mb: 0.5 }}>
        {title}
      </Typography>
      <Typography sx={{ fontSize: "1.75rem", fontWeight: 700, color: isDark ? "#fff" : "#0f172a", lineHeight: 1.2 }}>
        {value}
      </Typography>
      {subtitle && (
        <Typography sx={{ fontSize: t.typography.fontSize.xs, color: isDark ? "#52525b" : "#9ca3af", mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}

function SignalRow({ signal, incidentMode }: { signal: PlatformData["signals"]["recent"][0]; incidentMode: boolean }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const severityColors: Record<string, string> = {
    LOW: "#22c55e",
    MEDIUM: "#f59e0b",
    HIGH: "#f97316",
    CRITICAL: "#dc2626",
  };

  const color = severityColors[signal.severity] || "#71717a";

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        p: 2,
        borderRadius: 1.5,
        bgcolor: incidentMode ? alpha("#1c1917", 0.5) : isDark ? "#18181b" : "#fafafa",
        border: "1px solid",
        borderColor: incidentMode ? alpha("#dc2626", 0.15) : isDark ? "#27272a" : "#e5e7eb",
      }}
    >
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          bgcolor: color,
          flexShrink: 0,
        }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: t.typography.fontSize.sm, fontWeight: 600, color: isDark ? "#fff" : "#0f172a" }}>
          {signal.title}
        </Typography>
        {signal.description && (
          <Typography
            sx={{
              fontSize: t.typography.fontSize.xs,
              color: isDark ? "#71717a" : "#6b7280",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {signal.description}
          </Typography>
        )}
      </Box>
      <Box
        sx={{
          px: 1.5,
          py: 0.5,
          borderRadius: 1,
          bgcolor: alpha(color, 0.1),
          border: `1px solid ${alpha(color, 0.2)}`,
        }}
      >
        <Typography sx={{ fontSize: t.typography.fontSize.xs, fontWeight: 600, color, textTransform: "uppercase" }}>
          {signal.severity}
        </Typography>
      </Box>
      <Typography sx={{ fontSize: t.typography.fontSize.xs, color: isDark ? "#52525b" : "#9ca3af", flexShrink: 0 }}>
        {new Date(signal.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </Typography>
    </Box>
  );
}

export default function AdminOverviewPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { incidentMode, setIncidentMode, refreshData } = usePlatformContext();
  const [data, setData] = useState<PlatformData | null>(null);
  const [loading, setLoading] = useState(true);
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const [incidentReason, setIncidentReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/platform/overview");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (e) {
        console.error("Failed to fetch platform data", e);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleIncidentMode = async (enable: boolean) => {
    if (enable && !incidentReason.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/platform/incident-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enable, reason: incidentReason }),
      });

      if (res.ok) {
        setIncidentMode(enable);
        setIncidentDialogOpen(false);
        setIncidentReason("");
        refreshData();
      }
    } catch (e) {
      console.error("Failed to toggle incident mode", e);
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <CircularProgress size={32} sx={{ color: incidentMode ? "#dc2626" : "#6366f1" }} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 4 }}>
        <Box>
          <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color: isDark ? "#fff" : "#0f172a", letterSpacing: "-0.02em", mb: 0.5 }}>
            Platform Overview
          </Typography>
          <Typography sx={{ fontSize: t.typography.fontSize.sm, color: isDark ? "#71717a" : "#6b7280" }}>
            System-wide status and governance metrics
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <StatusIndicator status={data?.platform.status || "OPERATIONAL"} incidentMode={incidentMode} />
          <Button
            variant={incidentMode ? "outlined" : "contained"}
            onClick={() => incidentMode ? handleIncidentMode(false) : setIncidentDialogOpen(true)}
            sx={{
              px: 2.5,
              py: 1,
              fontWeight: 600,
              fontSize: t.typography.fontSize.sm,
              borderRadius: 1.5,
              textTransform: "none",
              bgcolor: incidentMode ? "transparent" : "#dc2626",
              color: incidentMode ? "#dc2626" : "#fff",
              borderColor: "#dc2626",
              "&:hover": {
                bgcolor: incidentMode ? alpha("#dc2626", 0.08) : "#b91c1c",
                borderColor: "#dc2626",
              },
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18, marginRight: 6 }}>
              {incidentMode ? "shield" : "warning"}
            </span>
            {incidentMode ? "End Incident Mode" : "Enter Incident Mode"}
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 2, mb: 4 }}>
        <MetricCard
          title="Total Organizations"
          value={data?.organizations.total || 0}
          subtitle={`${data?.organizations.active || 0} active`}
          icon="corporate_fare"
          color="#6366f1"
          incidentMode={incidentMode}
        />
        <MetricCard
          title="Pending Approval"
          value={data?.organizations.pending || 0}
          subtitle="Awaiting review"
          icon="pending_actions"
          color="#f59e0b"
          incidentMode={incidentMode}
          attention={(data?.organizations.pending || 0) > 0}
        />
        <MetricCard
          title="Active Offboardings"
          value={data?.offboardings.active || 0}
          subtitle={`${data?.offboardings.total || 0} total`}
          icon="group_remove"
          color="#22c55e"
          incidentMode={incidentMode}
        />
        <MetricCard
          title="High/Critical Risk"
          value={`${data?.offboardings.highRisk || 0} / ${data?.offboardings.critical || 0}`}
          subtitle="Requiring attention"
          icon="warning"
          color="#dc2626"
          incidentMode={incidentMode}
          attention={(data?.offboardings.critical || 0) > 0}
        />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3 }}>
        <Box
          sx={{
            p: 3,
            borderRadius: 2,
            bgcolor: incidentMode ? alpha("#1c1917", 0.5) : isDark ? "#18181b" : "#fff",
            border: "1px solid",
            borderColor: incidentMode ? alpha("#dc2626", 0.15) : isDark ? "#27272a" : "#e5e7eb",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
            <Typography sx={{ fontSize: t.typography.fontSize.base, fontWeight: 600, color: isDark ? "#fff" : "#0f172a" }}>
              Live Platform Signals
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography sx={{ fontSize: t.typography.fontSize.xs, color: isDark ? "#71717a" : "#6b7280" }}>
                {data?.signals.unresolved || 0} unresolved
              </Typography>
              {(data?.signals.critical || 0) > 0 && (
                <Box sx={{ px: 1.5, py: 0.25, borderRadius: 1, bgcolor: alpha("#dc2626", 0.1), border: `1px solid ${alpha("#dc2626", 0.2)}` }}>
                  <Typography sx={{ fontSize: t.typography.fontSize.xs, fontWeight: 600, color: "#dc2626" }}>
                    {data?.signals.critical} CRITICAL
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
          {data?.signals.recent && data.signals.recent.length > 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {data.signals.recent.slice(0, 5).map((signal) => (
                <SignalRow key={signal.id} signal={signal} incidentMode={incidentMode} />
              ))}
            </Box>
          ) : (
            <Box sx={{ py: 6, textAlign: "center" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40, color: isDark ? "#3f3f46" : "#d4d4d8", marginBottom: 8 }}>
                check_circle
              </span>
              <Typography sx={{ fontSize: t.typography.fontSize.sm, color: isDark ? "#52525b" : "#9ca3af" }}>
                No active signals
              </Typography>
            </Box>
          )}
        </Box>

        <Box
          sx={{
            p: 3,
            borderRadius: 2,
            bgcolor: incidentMode ? alpha("#1c1917", 0.5) : isDark ? "#18181b" : "#fff",
            border: "1px solid",
            borderColor: incidentMode ? alpha("#dc2626", 0.15) : isDark ? "#27272a" : "#e5e7eb",
          }}
        >
          <Typography sx={{ fontSize: t.typography.fontSize.base, fontWeight: 600, color: isDark ? "#fff" : "#0f172a", mb: 3 }}>
            Systemic Risk Summary
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
            <Box sx={{ p: 2.5, borderRadius: 1.5, bgcolor: incidentMode ? alpha("#1c1917", 0.8) : isDark ? "#09090b" : "#fafafa" }}>
              <Typography sx={{ fontSize: t.typography.fontSize.xs, fontWeight: 500, color: isDark ? "#71717a" : "#6b7280", mb: 1 }}>
                Organizations Suspended
              </Typography>
              <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: "#f59e0b" }}>
                {data?.organizations.suspended || 0}
              </Typography>
            </Box>
            <Box sx={{ p: 2.5, borderRadius: 1.5, bgcolor: incidentMode ? alpha("#1c1917", 0.8) : isDark ? "#09090b" : "#fafafa" }}>
              <Typography sx={{ fontSize: t.typography.fontSize.xs, fontWeight: 500, color: isDark ? "#71717a" : "#6b7280", mb: 1 }}>
                Security Events (24h)
              </Typography>
              <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: (data?.security.unresolvedEvents || 0) > 0 ? "#dc2626" : "#22c55e" }}>
                {data?.security.unresolvedEvents || 0}
              </Typography>
            </Box>
            <Box sx={{ p: 2.5, borderRadius: 1.5, bgcolor: incidentMode ? alpha("#1c1917", 0.8) : isDark ? "#09090b" : "#fafafa" }}>
              <Typography sx={{ fontSize: t.typography.fontSize.xs, fontWeight: 500, color: isDark ? "#71717a" : "#6b7280", mb: 1 }}>
                High Risk Offboardings
              </Typography>
              <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: (data?.offboardings.highRisk || 0) > 0 ? "#f97316" : "#22c55e" }}>
                {data?.offboardings.highRisk || 0}
              </Typography>
            </Box>
            <Box sx={{ p: 2.5, borderRadius: 1.5, bgcolor: incidentMode ? alpha("#1c1917", 0.8) : isDark ? "#09090b" : "#fafafa" }}>
              <Typography sx={{ fontSize: t.typography.fontSize.xs, fontWeight: 500, color: isDark ? "#71717a" : "#6b7280", mb: 1 }}>
                Critical Risk Cases
              </Typography>
              <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: (data?.offboardings.critical || 0) > 0 ? "#dc2626" : "#22c55e" }}>
                {data?.offboardings.critical || 0}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      <Dialog open={incidentDialogOpen} onClose={() => setIncidentDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: alpha("#dc2626", 0.1), display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#dc2626" }}>warning</span>
            </Box>
            <Box>
              <Typography sx={{ fontSize: t.typography.fontSize.lg, fontWeight: 700 }}>Enable Incident Mode</Typography>
              <Typography sx={{ fontSize: t.typography.fontSize.xs, color: isDark ? "#71717a" : "#6b7280" }}>
                This will activate elevated platform controls
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography sx={{ fontSize: t.typography.fontSize.sm, color: isDark ? "#a1a1aa" : "#52525b", mb: 2 }}>
              Incident Mode is designed for breach response, regulatory events, and platform-wide incidents. It will:
            </Typography>
            <Box component="ul" sx={{ pl: 2.5, m: 0, "& li": { fontSize: t.typography.fontSize.sm, color: isDark ? "#71717a" : "#6b7280", mb: 1 } }}>
              <li>Switch UI to high-clarity state</li>
              <li>Show only critical data</li>
              <li>Surface elevated actions</li>
              <li>Suppress non-essential noise</li>
            </Box>
            <TextField
              fullWidth
              label="Incident Reason"
              value={incidentReason}
              onChange={(e) => setIncidentReason(e.target.value)}
              placeholder="Describe the incident..."
              multiline
              rows={3}
              required
              sx={{ mt: 3 }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={() => setIncidentDialogOpen(false)} sx={{ fontWeight: 600 }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => handleIncidentMode(true)}
            disabled={actionLoading || !incidentReason.trim()}
            sx={{ fontWeight: 600, bgcolor: "#dc2626", "&:hover": { bgcolor: "#b91c1c" } }}
          >
            {actionLoading ? "Activating..." : "Activate Incident Mode"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
