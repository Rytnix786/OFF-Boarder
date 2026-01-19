"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  alpha,
  useTheme,
  CircularProgress,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Tooltip,
  Pagination,
  Collapse,
} from "@mui/material";
import { stitchTokens } from "@/theme/tokens";
import { usePlatformContext } from "../layout";

const t = stitchTokens;

type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  organizationId: string | null;
  targetOrgName: string | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  userId: string | null;
  userName: string | null;
  severity: string;
  createdAt: string;
};

type Filters = {
  action: string;
  entityType: string;
  severity: string;
  search: string;
  startDate: string;
  endDate: string;
};

function LogEntry({
  log,
  incidentMode,
}: {
  log: AuditLog;
  incidentMode: boolean;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [expanded, setExpanded] = useState(false);

  const severityColor =
    log.severity === "CRITICAL"
      ? "#dc2626"
      : log.severity === "ERROR"
      ? "#dc2626"
      : log.severity === "WARNING"
      ? "#f59e0b"
      : "#71717a";

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const actionIcon: Record<string, string> = {
    ORG_APPROVED: "check_circle",
    ORG_SUSPENDED: "block",
    ORG_REJECTED: "cancel",
    GLOBAL_POLICY_UPDATED: "policy",
    INCIDENT_MODE_ENABLED: "warning",
    INCIDENT_MODE_DISABLED: "check_circle",
    PLATFORM_STATUS_UPDATED: "monitoring",
  };

  return (
    <Box
      sx={{
        bgcolor: incidentMode
          ? alpha("#1c1917", 0.4)
          : isDark
          ? alpha("#18181b", 0.4)
          : "#fff",
        border: "1px solid",
        borderColor: incidentMode
          ? alpha("#dc2626", 0.15)
          : isDark
          ? "#27272a"
          : "#e5e7eb",
        borderRadius: 1.5,
        overflow: "hidden",
        "&:hover": {
          borderColor: incidentMode
            ? alpha("#dc2626", 0.3)
            : isDark
            ? "#3f3f46"
            : "#d1d5db",
        },
      }}
    >
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "flex-start",
          gap: 2,
          cursor: "pointer",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1,
            bgcolor: alpha(severityColor, 0.1),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 18, color: severityColor }}
          >
            {actionIcon[log.action] || "history"}
          </span>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
            <Typography
              sx={{
                fontSize: t.typography.fontSize.sm,
                fontWeight: 600,
                color: isDark ? "#fff" : "#0f172a",
                fontFamily: "monospace",
              }}
            >
              {log.action}
            </Typography>
            <Chip
              label={log.severity}
              size="small"
              sx={{
                height: 18,
                fontSize: 9,
                fontWeight: 600,
                bgcolor: alpha(severityColor, 0.1),
                color: severityColor,
              }}
            />
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <Typography
              sx={{
                fontSize: t.typography.fontSize.xs,
                color: isDark ? "#71717a" : "#6b7280",
              }}
            >
              {log.entityType}
              {log.entityId && ` → ${log.entityId.slice(0, 8)}`}
            </Typography>
            {log.targetOrgName && (
              <Typography
                sx={{
                  fontSize: t.typography.fontSize.xs,
                  color: isDark ? "#a1a1aa" : "#52525b",
                }}
              >
                Org: {log.targetOrgName}
              </Typography>
            )}
            {log.userName && (
              <Typography
                sx={{
                  fontSize: t.typography.fontSize.xs,
                  color: isDark ? "#a1a1aa" : "#52525b",
                }}
              >
                By: {log.userName}
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
          <Typography
            sx={{
              fontSize: t.typography.fontSize.xs,
              color: isDark ? "#52525b" : "#9ca3af",
              fontFamily: "monospace",
            }}
          >
            {formatDate(log.createdAt)}
          </Typography>
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 18,
              color: isDark ? "#52525b" : "#9ca3af",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 200ms",
            }}
          >
            expand_more
          </span>
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Box
          sx={{
            px: 2,
            pb: 2,
            pt: 1,
            borderTop: "1px solid",
            borderColor: incidentMode
              ? alpha("#dc2626", 0.1)
              : isDark
              ? "#27272a"
              : "#e5e7eb",
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 2,
              mb: 2,
            }}
          >
            {log.ipAddress && (
              <Box>
                <Typography
                  sx={{
                    fontSize: t.typography.fontSize.xs,
                    color: isDark ? "#52525b" : "#9ca3af",
                    mb: 0.25,
                  }}
                >
                  IP Address
                </Typography>
                <Typography
                  sx={{
                    fontSize: t.typography.fontSize.xs,
                    color: isDark ? "#a1a1aa" : "#374151",
                    fontFamily: "monospace",
                  }}
                >
                  {log.ipAddress}
                </Typography>
              </Box>
            )}
            {log.userId && (
              <Box>
                <Typography
                  sx={{
                    fontSize: t.typography.fontSize.xs,
                    color: isDark ? "#52525b" : "#9ca3af",
                    mb: 0.25,
                  }}
                >
                  User ID
                </Typography>
                <Typography
                  sx={{
                    fontSize: t.typography.fontSize.xs,
                    color: isDark ? "#a1a1aa" : "#374151",
                    fontFamily: "monospace",
                  }}
                >
                  {log.userId}
                </Typography>
              </Box>
            )}
            {log.organizationId && (
              <Box>
                <Typography
                  sx={{
                    fontSize: t.typography.fontSize.xs,
                    color: isDark ? "#52525b" : "#9ca3af",
                    mb: 0.25,
                  }}
                >
                  Organization ID
                </Typography>
                <Typography
                  sx={{
                    fontSize: t.typography.fontSize.xs,
                    color: isDark ? "#a1a1aa" : "#374151",
                    fontFamily: "monospace",
                  }}
                >
                  {log.organizationId}
                </Typography>
              </Box>
            )}
          </Box>

          {(log.oldData || log.newData) && (
            <Box sx={{ display: "flex", gap: 2 }}>
              {log.oldData && (
                <Box sx={{ flex: 1 }}>
                  <Typography
                    sx={{
                      fontSize: t.typography.fontSize.xs,
                      color: isDark ? "#52525b" : "#9ca3af",
                      mb: 0.5,
                    }}
                  >
                    Previous State
                  </Typography>
                  <Box
                    sx={{
                      p: 1.5,
                      bgcolor: isDark ? "#09090b" : "#f4f4f5",
                      borderRadius: 1,
                      overflow: "auto",
                      maxHeight: 200,
                    }}
                  >
                    <pre
                      style={{
                        margin: 0,
                        fontSize: 11,
                        fontFamily: "monospace",
                        color: isDark ? "#a1a1aa" : "#374151",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                      }}
                    >
                      {JSON.stringify(log.oldData, null, 2)}
                    </pre>
                  </Box>
                </Box>
              )}
              {log.newData && (
                <Box sx={{ flex: 1 }}>
                  <Typography
                    sx={{
                      fontSize: t.typography.fontSize.xs,
                      color: isDark ? "#52525b" : "#9ca3af",
                      mb: 0.5,
                    }}
                  >
                    New State
                  </Typography>
                  <Box
                    sx={{
                      p: 1.5,
                      bgcolor: isDark ? "#09090b" : "#f4f4f5",
                      borderRadius: 1,
                      overflow: "auto",
                      maxHeight: 200,
                    }}
                  >
                    <pre
                      style={{
                        margin: 0,
                        fontSize: 11,
                        fontFamily: "monospace",
                        color: isDark ? "#a1a1aa" : "#374151",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                      }}
                    >
                      {JSON.stringify(log.newData, null, 2)}
                    </pre>
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography
                sx={{
                  fontSize: t.typography.fontSize.xs,
                  color: isDark ? "#52525b" : "#9ca3af",
                  mb: 0.5,
                }}
              >
                Metadata
              </Typography>
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: isDark ? "#09090b" : "#f4f4f5",
                  borderRadius: 1,
                  overflow: "auto",
                  maxHeight: 150,
                }}
              >
                <pre
                  style={{
                    margin: 0,
                    fontSize: 11,
                    fontFamily: "monospace",
                    color: isDark ? "#a1a1aa" : "#374151",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                  }}
                >
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </Box>
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}

export default function PlatformAuditPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { incidentMode } = usePlatformContext();

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [availableFilters, setAvailableFilters] = useState<{
    actions: string[];
    entityTypes: string[];
  }>({ actions: [], entityTypes: [] });
  const [filters, setFilters] = useState<Filters>({
    action: "",
    entityType: "",
    severity: "",
    search: "",
    startDate: "",
    endDate: "",
  });
  const [stats, setStats] = useState<{
    severityCounts: { severity: string; count: number }[];
  }>({ severityCounts: [] });

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (filters.action) params.set("action", filters.action);
      if (filters.entityType) params.set("entityType", filters.entityType);
      if (filters.severity) params.set("severity", filters.severity);
      if (filters.search) params.set("search", filters.search);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);

      const res = await fetch(`/api/platform/audit?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setPagination(data.pagination);
        setAvailableFilters(data.filters);
        setStats(data.stats);
      }
    } catch (e) {
      console.error("Failed to fetch audit logs", e);
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      action: "",
      entityType: "",
      severity: "",
      search: "",
      startDate: "",
      endDate: "",
    });
  };

  const severityStats = {
    critical: stats.severityCounts.find((s) => s.severity === "CRITICAL")?.count || 0,
    error: stats.severityCounts.find((s) => s.severity === "ERROR")?.count || 0,
    warning: stats.severityCounts.find((s) => s.severity === "WARNING")?.count || 0,
    info: stats.severityCounts.find((s) => s.severity === "INFO")?.count || 0,
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography
          sx={{
            fontSize: t.typography.fontSize.xl,
            fontWeight: 700,
            color: isDark ? "#fff" : "#0f172a",
            mb: 0.5,
          }}
        >
          Platform Audit Log
        </Typography>
        <Typography
          sx={{
            fontSize: t.typography.fontSize.sm,
            color: isDark ? "#71717a" : "#6b7280",
          }}
        >
          Cross-tenant audit trail for platform-level actions and policy enforcement
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 2,
          mb: 4,
        }}
      >
        {[
          { label: "Total Events", value: pagination.total, color: "#6366f1" },
          { label: "Critical", value: severityStats.critical, color: "#dc2626" },
          { label: "Warnings", value: severityStats.warning, color: "#f59e0b" },
          { label: "Info", value: severityStats.info, color: "#71717a" },
        ].map((stat) => (
          <Box
            key={stat.label}
            sx={{
              p: 2,
              bgcolor: incidentMode
                ? alpha("#1c1917", 0.6)
                : isDark
                ? alpha("#18181b", 0.6)
                : "#fff",
              border: "1px solid",
              borderColor: incidentMode
                ? alpha("#dc2626", 0.2)
                : isDark
                ? "#27272a"
                : "#e5e7eb",
              borderRadius: 1.5,
            }}
          >
            <Typography
              sx={{
                fontSize: t.typography.fontSize.xs,
                color: isDark ? "#71717a" : "#6b7280",
                mb: 0.5,
              }}
            >
              {stat.label}
            </Typography>
            <Typography
              sx={{
                fontSize: t.typography.fontSize["2xl"],
                fontWeight: 700,
                color: stat.color,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {stat.value}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          p: 2,
          mb: 3,
          bgcolor: incidentMode
            ? alpha("#1c1917", 0.4)
            : isDark
            ? alpha("#18181b", 0.4)
            : "#f9fafb",
          border: "1px solid",
          borderColor: incidentMode
            ? alpha("#dc2626", 0.15)
            : isDark
            ? "#27272a"
            : "#e5e7eb",
          borderRadius: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <TextField
            placeholder="Search logs..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            size="small"
            sx={{
              width: 220,
              "& .MuiOutlinedInput-root": {
                fontSize: t.typography.fontSize.sm,
                bgcolor: isDark ? "#09090b" : "#fff",
                "& fieldset": { borderColor: isDark ? "#27272a" : "#e5e7eb" },
              },
              "& .MuiInputBase-input": { color: isDark ? "#fff" : "#0f172a" },
            }}
          />

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel sx={{ fontSize: t.typography.fontSize.sm, color: isDark ? "#71717a" : "#6b7280" }}>
              Action
            </InputLabel>
            <Select
              value={filters.action}
              onChange={(e) => handleFilterChange("action", e.target.value)}
              label="Action"
              sx={{
                fontSize: t.typography.fontSize.sm,
                bgcolor: isDark ? "#09090b" : "#fff",
                "& fieldset": { borderColor: isDark ? "#27272a" : "#e5e7eb" },
                "& .MuiSelect-select": { color: isDark ? "#fff" : "#0f172a" },
              }}
            >
              <MenuItem value="">All</MenuItem>
              {availableFilters.actions.map((action) => (
                <MenuItem key={action} value={action}>
                  {action}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel sx={{ fontSize: t.typography.fontSize.sm, color: isDark ? "#71717a" : "#6b7280" }}>
              Entity Type
            </InputLabel>
            <Select
              value={filters.entityType}
              onChange={(e) => handleFilterChange("entityType", e.target.value)}
              label="Entity Type"
              sx={{
                fontSize: t.typography.fontSize.sm,
                bgcolor: isDark ? "#09090b" : "#fff",
                "& fieldset": { borderColor: isDark ? "#27272a" : "#e5e7eb" },
                "& .MuiSelect-select": { color: isDark ? "#fff" : "#0f172a" },
              }}
            >
              <MenuItem value="">All</MenuItem>
              {availableFilters.entityTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel sx={{ fontSize: t.typography.fontSize.sm, color: isDark ? "#71717a" : "#6b7280" }}>
              Severity
            </InputLabel>
            <Select
              value={filters.severity}
              onChange={(e) => handleFilterChange("severity", e.target.value)}
              label="Severity"
              sx={{
                fontSize: t.typography.fontSize.sm,
                bgcolor: isDark ? "#09090b" : "#fff",
                "& fieldset": { borderColor: isDark ? "#27272a" : "#e5e7eb" },
                "& .MuiSelect-select": { color: isDark ? "#fff" : "#0f172a" },
              }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="CRITICAL">Critical</MenuItem>
              <MenuItem value="ERROR">Error</MenuItem>
              <MenuItem value="WARNING">Warning</MenuItem>
              <MenuItem value="INFO">Info</MenuItem>
            </Select>
          </FormControl>

          <TextField
            type="date"
            label="Start Date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange("startDate", e.target.value)}
            size="small"
            InputLabelProps={{ shrink: true }}
            sx={{
              width: 150,
              "& .MuiOutlinedInput-root": {
                fontSize: t.typography.fontSize.sm,
                bgcolor: isDark ? "#09090b" : "#fff",
                "& fieldset": { borderColor: isDark ? "#27272a" : "#e5e7eb" },
              },
              "& .MuiInputBase-input": { color: isDark ? "#fff" : "#0f172a" },
              "& .MuiInputLabel-root": { color: isDark ? "#71717a" : "#6b7280" },
            }}
          />

          <TextField
            type="date"
            label="End Date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange("endDate", e.target.value)}
            size="small"
            InputLabelProps={{ shrink: true }}
            sx={{
              width: 150,
              "& .MuiOutlinedInput-root": {
                fontSize: t.typography.fontSize.sm,
                bgcolor: isDark ? "#09090b" : "#fff",
                "& fieldset": { borderColor: isDark ? "#27272a" : "#e5e7eb" },
              },
              "& .MuiInputBase-input": { color: isDark ? "#fff" : "#0f172a" },
              "& .MuiInputLabel-root": { color: isDark ? "#71717a" : "#6b7280" },
            }}
          />

          <Tooltip title="Clear filters">
            <IconButton
              onClick={clearFilters}
              size="small"
              sx={{ color: isDark ? "#71717a" : "#6b7280" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                filter_alt_off
              </span>
            </IconButton>
          </Tooltip>

          <Tooltip title="Export logs">
            <IconButton size="small" sx={{ color: isDark ? "#71717a" : "#6b7280" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                download
              </span>
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress size={32} sx={{ color: incidentMode ? "#dc2626" : "#6366f1" }} />
        </Box>
      ) : logs.length === 0 ? (
        <Box
          sx={{
            py: 8,
            textAlign: "center",
            bgcolor: incidentMode
              ? alpha("#1c1917", 0.4)
              : isDark
              ? alpha("#18181b", 0.4)
              : "#f9fafb",
            border: "1px solid",
            borderColor: incidentMode
              ? alpha("#dc2626", 0.15)
              : isDark
              ? "#27272a"
              : "#e5e7eb",
            borderRadius: 1.5,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 48, color: isDark ? "#3f3f46" : "#d1d5db" }}
          >
            history
          </span>
          <Typography sx={{ mt: 2, color: isDark ? "#71717a" : "#6b7280" }}>
            No audit logs found
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {logs.map((log) => (
            <LogEntry key={log.id} log={log} incidentMode={incidentMode} />
          ))}
        </Box>
      )}

      {pagination.totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <Pagination
            count={pagination.totalPages}
            page={pagination.page}
            onChange={(_, page) => fetchLogs(page)}
            sx={{
              "& .MuiPaginationItem-root": {
                color: isDark ? "#a1a1aa" : "#52525b",
                "&.Mui-selected": {
                  bgcolor: incidentMode ? "#dc2626" : "#6366f1",
                  color: "#fff",
                },
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
}
