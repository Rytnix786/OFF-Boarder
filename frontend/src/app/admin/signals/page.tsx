"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  alpha,
  useTheme,
  CircularProgress,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import { stitchTokens } from "@/theme/tokens";
import { usePlatformContext } from "../AdminClientLayout";

const t = stitchTokens;

type PlatformSignal = {
  id: string;
  signalType: string;
  severity: string;
  title: string;
  description: string | null;
  organizationId: string | null;
  metadata: Record<string, unknown> | null;
  acknowledged: boolean;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolution: string | null;
  createdAt: string;
};

const SIGNAL_TYPE_ICONS: Record<string, string> = {
  AUTH_SPIKE: "trending_up",
  IP_BLOCK_TRIGGERED: "block",
  SUSPICIOUS_ACTIVITY: "warning",
  APPROVAL_BYPASS_ATTEMPT: "gpp_maybe",
  HIGH_RISK_OFFBOARDING: "person_alert",
  ORG_COMPLIANCE_ISSUE: "policy",
  POLICY_VIOLATION: "rule",
  SYSTEM_ANOMALY: "monitoring",
};

function SignalCard({
  signal,
  incidentMode,
  onAcknowledge,
  onResolve,
}: {
  signal: PlatformSignal;
  incidentMode: boolean;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const severityColor =
    signal.severity === "CRITICAL"
      ? "#dc2626"
      : signal.severity === "HIGH"
      ? "#f59e0b"
      : signal.severity === "MEDIUM"
      ? "#6366f1"
      : "#71717a";

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  const isResolved = !!signal.resolvedAt;

  return (
    <Box
      sx={{
        p: 2.5,
        bgcolor: incidentMode ? alpha("#1c1917", 0.6) : isDark ? alpha("#18181b", 0.6) : "#fff",
        border: "1px solid",
        borderColor: isResolved ? (isDark ? "#27272a" : "#e5e7eb") : alpha(severityColor, 0.3),
        borderLeft: isResolved ? undefined : `3px solid ${severityColor}`,
        borderRadius: 1.5,
        opacity: isResolved ? 0.6 : 1,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1,
            bgcolor: alpha(severityColor, 0.1),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: severityColor }}>
            {SIGNAL_TYPE_ICONS[signal.signalType] || "notifications"}
          </span>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
            <Typography sx={{ fontSize: t.typography.fontSize.sm, fontWeight: 600, color: isDark ? "#fff" : "#0f172a" }}>
              {signal.title}
            </Typography>
            <Chip label={signal.severity} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 600, bgcolor: alpha(severityColor, 0.1), color: severityColor }} />
            {isResolved && <Chip label="RESOLVED" size="small" sx={{ height: 20, fontSize: 10, fontWeight: 600, bgcolor: alpha("#22c55e", 0.1), color: "#22c55e" }} />}
            {!isResolved && signal.acknowledged && <Chip label="ACK" size="small" sx={{ height: 20, fontSize: 10, fontWeight: 600, bgcolor: alpha("#f59e0b", 0.1), color: "#f59e0b" }} />}
          </Box>

          {signal.description && (
            <Typography sx={{ fontSize: t.typography.fontSize.xs, color: isDark ? "#a1a1aa" : "#52525b", mb: 1 }}>
              {signal.description}
            </Typography>
          )}

          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <Typography sx={{ fontSize: t.typography.fontSize.xs, color: isDark ? "#52525b" : "#9ca3af", fontFamily: "monospace" }}>
              {signal.signalType}
            </Typography>
            <Typography sx={{ fontSize: t.typography.fontSize.xs, color: isDark ? "#52525b" : "#9ca3af" }}>
              {formatDate(signal.createdAt)} ({formatRelativeTime(signal.createdAt)})
            </Typography>
          </Box>
        </Box>

        {!isResolved && (
          <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
            {!signal.acknowledged && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => onAcknowledge(signal.id)}
                sx={{ fontSize: t.typography.fontSize.xs, textTransform: "none", borderColor: isDark ? "#3f3f46" : "#d1d5db", color: isDark ? "#a1a1aa" : "#52525b", "&:hover": { borderColor: isDark ? "#52525b" : "#9ca3af", bgcolor: "transparent" } }}
              >
                Acknowledge
              </Button>
            )}
            <Button
              size="small"
              variant="contained"
              onClick={() => onResolve(signal.id)}
              sx={{ fontSize: t.typography.fontSize.xs, textTransform: "none", bgcolor: incidentMode ? "#dc2626" : "#22c55e", "&:hover": { bgcolor: incidentMode ? "#b91c1c" : "#16a34a" } }}
            >
              Resolve
            </Button>
          </Box>
        )}
      </Box>

      {signal.resolution && (
        <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid", borderColor: isDark ? "#27272a" : "#e5e7eb" }}>
          <Typography sx={{ fontSize: t.typography.fontSize.xs, color: isDark ? "#52525b" : "#9ca3af", mb: 0.25 }}>Resolution</Typography>
          <Typography sx={{ fontSize: t.typography.fontSize.xs, color: isDark ? "#a1a1aa" : "#374151" }}>{signal.resolution}</Typography>
        </Box>
      )}
    </Box>
  );
}

export default function AdminSignalsPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { incidentMode } = usePlatformContext();

  const [loading, setLoading] = useState(true);
  const [signals, setSignals] = useState<PlatformSignal[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [stats, setStats] = useState({ critical: 0, high: 0, medium: 0, low: 0 });
  const [filters, setFilters] = useState({ severity: "", signalType: "", acknowledged: "" });
  const [resolveDialog, setResolveDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [resolution, setResolution] = useState("");

  const fetchSignals = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "30" });
      if (filters.severity) params.set("severity", filters.severity);
      if (filters.signalType) params.set("signalType", filters.signalType);
      if (filters.acknowledged) params.set("acknowledged", filters.acknowledged);

      const res = await fetch(`/api/platform/signals?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSignals(data.signals);
        setPagination(data.pagination);
        setStats(data.stats.unacknowledged);
      }
    } catch (e) {
      console.error("Failed to fetch signals", e);
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  const handleAcknowledge = async (id: string) => {
    try {
      await fetch("/api/platform/signals", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, acknowledge: true }) });
      fetchSignals(pagination.page);
    } catch (e) {
      console.error("Failed to acknowledge signal", e);
    }
  };

  const handleResolve = async () => {
    if (!resolveDialog.id) return;
    try {
      await fetch("/api/platform/signals", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: resolveDialog.id, resolve: true, resolution }) });
      setResolveDialog({ open: false, id: null });
      setResolution("");
      fetchSignals(pagination.page);
    } catch (e) {
      console.error("Failed to resolve signal", e);
    }
  };

  const totalUnacknowledged = stats.critical + stats.high + stats.medium + stats.low;

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ fontSize: t.typography.fontSize.xl, fontWeight: 700, color: isDark ? "#fff" : "#0f172a", mb: 0.5 }}>
          Platform Signals
        </Typography>
        <Typography sx={{ fontSize: t.typography.fontSize.sm, color: isDark ? "#71717a" : "#6b7280" }}>
          Live platform signals requiring attention
        </Typography>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 2, mb: 4 }}>
        {[
          { label: "Unacknowledged", value: totalUnacknowledged, color: "#6366f1" },
          { label: "Critical", value: stats.critical, color: "#dc2626" },
          { label: "High", value: stats.high, color: "#f59e0b" },
          { label: "Medium", value: stats.medium, color: "#6366f1" },
          { label: "Low", value: stats.low, color: "#71717a" },
        ].map((stat) => (
          <Box
            key={stat.label}
            sx={{
              p: 2,
              bgcolor: incidentMode ? alpha("#1c1917", 0.6) : isDark ? alpha("#18181b", 0.6) : "#fff",
              border: "1px solid",
              borderColor: stat.value > 0 && stat.label === "Critical" ? alpha("#dc2626", 0.3) : incidentMode ? alpha("#dc2626", 0.2) : isDark ? "#27272a" : "#e5e7eb",
              borderRadius: 1.5,
            }}
          >
            <Typography sx={{ fontSize: t.typography.fontSize.xs, color: isDark ? "#71717a" : "#6b7280", mb: 0.5 }}>{stat.label}</Typography>
            <Typography sx={{ fontSize: t.typography.fontSize["2xl"], fontWeight: 700, color: stat.value > 0 ? stat.color : isDark ? "#3f3f46" : "#d1d5db", fontVariantNumeric: "tabular-nums" }}>{stat.value}</Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ p: 2, mb: 3, bgcolor: incidentMode ? alpha("#1c1917", 0.4) : isDark ? alpha("#18181b", 0.4) : "#f9fafb", border: "1px solid", borderColor: incidentMode ? alpha("#dc2626", 0.15) : isDark ? "#27272a" : "#e5e7eb", borderRadius: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel sx={{ fontSize: t.typography.fontSize.sm, color: isDark ? "#71717a" : "#6b7280" }}>Severity</InputLabel>
            <Select value={filters.severity} onChange={(e) => setFilters({ ...filters, severity: e.target.value })} label="Severity" sx={{ fontSize: t.typography.fontSize.sm, bgcolor: isDark ? "#09090b" : "#fff", "& fieldset": { borderColor: isDark ? "#27272a" : "#e5e7eb" }, "& .MuiSelect-select": { color: isDark ? "#fff" : "#0f172a" } }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="CRITICAL">Critical</MenuItem>
              <MenuItem value="HIGH">High</MenuItem>
              <MenuItem value="MEDIUM">Medium</MenuItem>
              <MenuItem value="LOW">Low</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel sx={{ fontSize: t.typography.fontSize.sm, color: isDark ? "#71717a" : "#6b7280" }}>Signal Type</InputLabel>
            <Select value={filters.signalType} onChange={(e) => setFilters({ ...filters, signalType: e.target.value })} label="Signal Type" sx={{ fontSize: t.typography.fontSize.sm, bgcolor: isDark ? "#09090b" : "#fff", "& fieldset": { borderColor: isDark ? "#27272a" : "#e5e7eb" }, "& .MuiSelect-select": { color: isDark ? "#fff" : "#0f172a" } }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="AUTH_SPIKE">Auth Spike</MenuItem>
              <MenuItem value="IP_BLOCK_TRIGGERED">IP Block</MenuItem>
              <MenuItem value="SUSPICIOUS_ACTIVITY">Suspicious Activity</MenuItem>
              <MenuItem value="HIGH_RISK_OFFBOARDING">High Risk Offboarding</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel sx={{ fontSize: t.typography.fontSize.sm, color: isDark ? "#71717a" : "#6b7280" }}>Status</InputLabel>
            <Select value={filters.acknowledged} onChange={(e) => setFilters({ ...filters, acknowledged: e.target.value })} label="Status" sx={{ fontSize: t.typography.fontSize.sm, bgcolor: isDark ? "#09090b" : "#fff", "& fieldset": { borderColor: isDark ? "#27272a" : "#e5e7eb" }, "& .MuiSelect-select": { color: isDark ? "#fff" : "#0f172a" } }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="false">Unacknowledged</MenuItem>
              <MenuItem value="true">Acknowledged</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress size={32} sx={{ color: incidentMode ? "#dc2626" : "#6366f1" }} />
        </Box>
      ) : signals.length === 0 ? (
        <Box sx={{ py: 8, textAlign: "center", bgcolor: incidentMode ? alpha("#1c1917", 0.4) : isDark ? alpha("#18181b", 0.4) : "#f9fafb", border: "1px solid", borderColor: incidentMode ? alpha("#dc2626", 0.15) : isDark ? "#27272a" : "#e5e7eb", borderRadius: 1.5 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: isDark ? "#3f3f46" : "#d1d5db" }}>notifications_off</span>
          <Typography sx={{ mt: 2, color: isDark ? "#71717a" : "#6b7280" }}>No signals found</Typography>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {signals.map((signal) => (<SignalCard key={signal.id} signal={signal} incidentMode={incidentMode} onAcknowledge={handleAcknowledge} onResolve={(id) => setResolveDialog({ open: true, id })} />))}
        </Box>
      )}

      {pagination.totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <Pagination count={pagination.totalPages} page={pagination.page} onChange={(_, page) => fetchSignals(page)} sx={{ "& .MuiPaginationItem-root": { color: isDark ? "#a1a1aa" : "#52525b", "&.Mui-selected": { bgcolor: incidentMode ? "#dc2626" : "#6366f1", color: "#fff" } } }} />
        </Box>
      )}

      <Dialog open={resolveDialog.open} onClose={() => setResolveDialog({ open: false, id: null })} PaperProps={{ sx: { bgcolor: isDark ? "#18181b" : "#fff", minWidth: 400 } }}>
        <DialogTitle sx={{ color: isDark ? "#fff" : "#0f172a" }}>Resolve Signal</DialogTitle>
        <DialogContent>
          <TextField autoFocus label="Resolution Notes" fullWidth multiline rows={3} value={resolution} onChange={(e) => setResolution(e.target.value)} sx={{ mt: 1, "& .MuiOutlinedInput-root": { bgcolor: isDark ? "#09090b" : "#f4f4f5", "& fieldset": { borderColor: isDark ? "#27272a" : "#e5e7eb" } }, "& .MuiInputBase-input": { color: isDark ? "#fff" : "#0f172a" }, "& .MuiInputLabel-root": { color: isDark ? "#71717a" : "#6b7280" } }} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setResolveDialog({ open: false, id: null })} sx={{ color: isDark ? "#a1a1aa" : "#52525b" }}>Cancel</Button>
          <Button onClick={handleResolve} variant="contained" sx={{ bgcolor: "#22c55e", "&:hover": { bgcolor: "#16a34a" } }}>Resolve</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
