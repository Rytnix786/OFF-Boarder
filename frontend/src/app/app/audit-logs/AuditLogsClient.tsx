"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  Select,
  MenuItem,
  Button,
  Collapse,
  alpha,
  Divider,
  Tooltip,
} from "@mui/material";

type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  oldData: unknown;
  newData: unknown;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  organizationId: string | null;
  scope: string | null;
  createdAt: Date;
  user: { id: string; name: string | null; email: string } | null;
};

interface AuditLogsClientProps {
  logs: AuditLog[];
  total: number;
}

function formatFieldName(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .replace(/_/g, " ");
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    const str = JSON.stringify(value);
    return str.length > 50 ? str.substring(0, 47) + "..." : str;
  }
  const str = String(value);
  return str.length > 80 ? str.substring(0, 77) + "..." : str;
}

function getActionDescription(action: string): string {
  const descriptions: Record<string, string> = {
    "organization.created": "A new organization account was created and is pending approval.",
    "organization.updated": "Organization profile information was modified.",
    "organization.approved": "Organization account was approved by a Platform Administrator.",
    "organization.rejected": "Organization account was rejected by a Platform Administrator.",
    "member.invited": "An invitation was sent to join the organization.",
    "member.joined": "A user accepted an invitation and joined the organization.",
    "member.approved": "A pending member request was approved.",
    "member.removed": "A member was removed from the organization.",
    "member.role_changed": "A member's role or permissions were modified.",
    "employee.created": "A new employee record was added to the system.",
    "employee.updated": "Employee information was updated.",
    "employee.deleted": "An employee record was removed from the system.",
    "offboarding.created": "An offboarding process was initiated for an employee.",
    "offboarding.updated": "Offboarding process details were modified.",
    "offboarding.completed": "An offboarding process was marked as complete.",
    "offboarding.cancelled": "An offboarding process was cancelled.",
    "task.completed": "An assigned task was marked as completed.",
    "task.updated": "Task details were modified.",
    "user.registered": "A new user account was created.",
    "user.login": "A user authenticated successfully.",
    "user.logout": "A user session was terminated.",
    "ip.blocked": "An IP address was added to the blocklist.",
    "ip.unblocked": "An IP address was removed from the blocklist.",
  };
  return descriptions[action] || `Action "${action.replace(".", " ")}" was performed.`;
}

function getActionIcon(action: string): string {
  if (action.includes("created")) return "add_circle";
  if (action.includes("deleted") || action.includes("removed")) return "remove_circle";
  if (action.includes("approved") || action.includes("completed")) return "check_circle";
  if (action.includes("rejected") || action.includes("cancelled")) return "cancel";
  if (action.includes("invited")) return "mail";
  if (action.includes("joined")) return "group_add";
  if (action.includes("updated") || action.includes("changed")) return "edit_note";
  if (action.includes("login")) return "login";
  if (action.includes("logout")) return "logout";
  if (action.includes("registered")) return "person_add";
  if (action.includes("blocked")) return "block";
  if (action.includes("unblocked")) return "check";
  return "receipt_long";
}

function getActionSeverity(action: string): "success" | "warning" | "error" | "info" {
  if (action.includes("created") || action.includes("approved") || action.includes("joined") || action.includes("completed")) return "success";
  if (action.includes("deleted") || action.includes("removed") || action.includes("rejected") || action.includes("blocked") || action.includes("cancelled")) return "error";
  if (action.includes("updated") || action.includes("changed")) return "info";
  return "info";
}

const severityColors = {
  success: { bg: "#0d2818", border: "#166534", text: "#4ade80", icon: "#22c55e" },
  warning: { bg: "#2d2005", border: "#854d0e", text: "#facc15", icon: "#eab308" },
  error: { bg: "#2d0a0a", border: "#991b1b", text: "#f87171", icon: "#ef4444" },
  info: { bg: "#0c1929", border: "#1e40af", text: "#60a5fa", icon: "#3b82f6" },
};

function AuditRecordHeader({ log }: { log: AuditLog }) {
  const severity = getActionSeverity(log.action);
  const colors = severityColors[severity];

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        p: 2,
        borderBottom: "1px solid",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1.5,
            bgcolor: colors.bg,
            border: "1px solid",
            borderColor: colors.border,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 22, color: colors.icon }}>
            {getActionIcon(log.action)}
          </span>
        </Box>
        <Box>
          <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#fff", textTransform: "capitalize" }}>
            {log.action.replace(".", " ").replace(/_/g, " ")}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 0.25 }}>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
              {log.entityType}
            </Typography>
            {log.entityId && (
              <>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.3)" }}>•</Typography>
                <Tooltip title={log.entityId} arrow>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>
                    ID: {log.entityId.substring(0, 12)}...
                  </Typography>
                </Tooltip>
              </>
            )}
          </Box>
        </Box>
      </Box>
      <Chip
        icon={<span className="material-symbols-outlined" style={{ fontSize: 14, marginLeft: 8 }}>lock</span>}
        label="Immutable Record"
        size="small"
        sx={{
          bgcolor: "rgba(255,255,255,0.05)",
          color: "rgba(255,255,255,0.5)",
          border: "1px solid rgba(255,255,255,0.1)",
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          "& .MuiChip-icon": { color: "rgba(255,255,255,0.4)" },
        }}
      />
    </Box>
  );
}

function AuditSection({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: "rgba(255,255,255,0.4)" }}>
          {icon}
        </span>
        <Typography
          variant="caption"
          sx={{
            color: "rgba(255,255,255,0.5)",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            fontSize: 10,
          }}
        >
          {title}
        </Typography>
      </Box>
      {children}
    </Box>
  );
}

function ActorSection({ log }: { log: AuditLog }) {
  const metadata = log.metadata as Record<string, unknown> | null;
  const actor = metadata?.actor as Record<string, unknown> | undefined;
  const displayName = actor?.name || log.user?.name || "System";
  const displayEmail = actor?.email || log.user?.email || "Automated Process";

  return (
    <AuditSection title="Actor" icon="person">
      <Box sx={{ display: "flex", gap: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              bgcolor: "rgba(99, 102, 241, 0.15)",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#818cf8" }}>
              {log.user ? "person" : "smart_toy"}
            </span>
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ color: "#fff" }}>
              {displayName as string}
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
              {displayEmail as string}
            </Typography>
          </Box>
        </Box>
        <Divider orientation="vertical" flexItem sx={{ borderColor: "rgba(255,255,255,0.08)" }} />
        <Box>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)", display: "block", mb: 0.25 }}>
            Origin
          </Typography>
          <Chip
            size="small"
            label={log.user ? "Web Application" : "System"}
            sx={{
              bgcolor: "rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.7)",
              fontSize: 11,
              height: 22,
            }}
          />
        </Box>
        {log.ipAddress && (
          <>
            <Divider orientation="vertical" flexItem sx={{ borderColor: "rgba(255,255,255,0.08)" }} />
            <Box>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)", display: "block", mb: 0.25 }}>
                IP Address
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", fontFamily: "monospace", fontSize: 12 }}>
                {log.ipAddress}
              </Typography>
            </Box>
          </>
        )}
      </Box>
    </AuditSection>
  );
}

function ChangeSummarySection({ log }: { log: AuditLog }) {
  const description = getActionDescription(log.action);

  return (
    <AuditSection title="Change Summary" icon="description">
      <Box
        sx={{
          p: 2,
          bgcolor: "rgba(255,255,255,0.02)",
          borderRadius: 1,
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)", lineHeight: 1.6 }}>
          {description}
        </Typography>
      </Box>
    </AuditSection>
  );
}

function StateComparisonSection({ log }: { log: AuditLog }) {
  const metadata = log.metadata as Record<string, unknown> | null;
  const before = (metadata?.before as Record<string, unknown>) || (log.oldData as Record<string, unknown>);
  const after = (metadata?.after as Record<string, unknown>) || (log.newData as Record<string, unknown>);
  const changedFields = metadata?.changedFields as string[] | undefined;

  const hasBefore = before && Object.keys(before).length > 0;
  const hasAfter = after && Object.keys(after).length > 0;

  if (!hasBefore && !hasAfter) {
    return (
      <AuditSection title="State Changes" icon="compare_arrows">
        <Box
          sx={{
            p: 3,
            textAlign: "center",
            bgcolor: "rgba(255,255,255,0.02)",
            borderRadius: 1,
            border: "1px dashed rgba(255,255,255,0.1)",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 28, color: "rgba(255,255,255,0.2)", marginBottom: 8 }}>
            info
          </span>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.4)" }}>
            This action did not modify tracked fields.
          </Typography>
        </Box>
      </AuditSection>
    );
  }

  const isUpdate = log.action.includes("updated") || log.action.includes("changed");
  const allFields = changedFields || [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])];
  const fieldsToShow = allFields.filter(f => !["description", "actor", "before", "after", "changedFields", "note"].includes(f));

  if (isUpdate && hasBefore && hasAfter) {
    return (
      <AuditSection title="State Changes" icon="compare_arrows">
        <Box sx={{ borderRadius: 1, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "180px 1fr 1fr",
              bgcolor: "rgba(255,255,255,0.03)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <Box sx={{ p: 1.5, borderRight: "1px solid rgba(255,255,255,0.08)" }}>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Field
              </Typography>
            </Box>
            <Box sx={{ p: 1.5, borderRight: "1px solid rgba(255,255,255,0.08)" }}>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Previous Value
              </Typography>
            </Box>
            <Box sx={{ p: 1.5 }}>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                New Value
              </Typography>
            </Box>
          </Box>
          {fieldsToShow.map((field, idx) => (
            <Box
              key={field}
              sx={{
                display: "grid",
                gridTemplateColumns: "180px 1fr 1fr",
                bgcolor: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                "&:not(:last-child)": { borderBottom: "1px solid rgba(255,255,255,0.05)" },
              }}
            >
              <Box sx={{ p: 1.5, borderRight: "1px solid rgba(255,255,255,0.08)" }}>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>
                  {formatFieldName(field)}
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRight: "1px solid rgba(255,255,255,0.08)", bgcolor: "rgba(239,68,68,0.05)" }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: before?.[field] !== undefined ? "rgba(248,113,113,0.9)" : "rgba(255,255,255,0.3)",
                    fontFamily: "monospace",
                    fontSize: 12,
                    textDecoration: before?.[field] !== undefined ? "line-through" : "none",
                  }}
                >
                  {formatValue(before?.[field])}
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, bgcolor: "rgba(34,197,94,0.05)" }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: "rgba(74,222,128,0.9)",
                    fontFamily: "monospace",
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  {formatValue(after?.[field])}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </AuditSection>
    );
  }

  const dataToShow = hasAfter ? after : before;
  const dataLabel = hasAfter ? (hasBefore ? "New Value" : "Value") : "Previous Value";
  const entries = Object.entries(dataToShow || {}).filter(([k]) => !["description", "actor", "before", "after", "changedFields", "note"].includes(k));

  if (entries.length === 0) {
    return (
      <AuditSection title="State Changes" icon="compare_arrows">
        <Box
          sx={{
            p: 3,
            textAlign: "center",
            bgcolor: "rgba(255,255,255,0.02)",
            borderRadius: 1,
            border: "1px dashed rgba(255,255,255,0.1)",
          }}
        >
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.4)" }}>
            This action did not modify tracked fields.
          </Typography>
        </Box>
      </AuditSection>
    );
  }

  return (
    <AuditSection title={hasBefore && !hasAfter ? "Deleted State" : "Recorded State"} icon={hasBefore && !hasAfter ? "delete" : "add_circle"}>
      <Box sx={{ borderRadius: 1, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "180px 1fr",
            bgcolor: "rgba(255,255,255,0.03)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Box sx={{ p: 1.5, borderRight: "1px solid rgba(255,255,255,0.08)" }}>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Field
            </Typography>
          </Box>
          <Box sx={{ p: 1.5 }}>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {dataLabel}
            </Typography>
          </Box>
        </Box>
        {entries.map(([key, value], idx) => (
          <Box
            key={key}
            sx={{
              display: "grid",
              gridTemplateColumns: "180px 1fr",
              bgcolor: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
              "&:not(:last-child)": { borderBottom: "1px solid rgba(255,255,255,0.05)" },
            }}
          >
            <Box sx={{ p: 1.5, borderRight: "1px solid rgba(255,255,255,0.08)" }}>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>
                {formatFieldName(key)}
              </Typography>
            </Box>
            <Box sx={{ p: 1.5 }}>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)", fontFamily: "monospace", fontSize: 12 }}>
                {formatValue(value)}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </AuditSection>
  );
}

function MetadataSection({ log }: { log: AuditLog }) {
  const timestamp = new Date(log.createdAt);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <AuditSection title="Event Metadata" icon="info">
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)", display: "block", mb: 0.5 }}>
            Timestamp
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)", fontFamily: "monospace", fontSize: 12 }}>
            {timestamp.toISOString()}
          </Typography>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)" }}>
            ({timezone})
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)", display: "block", mb: 0.5 }}>
            Event ID
          </Typography>
          <Tooltip title={log.id} arrow>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)", fontFamily: "monospace", fontSize: 12, cursor: "help" }}>
              {log.id}
            </Typography>
          </Tooltip>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)", display: "block", mb: 0.5 }}>
            Organization ID
          </Typography>
          <Tooltip title={log.organizationId} arrow>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)", fontFamily: "monospace", fontSize: 12, cursor: "help" }}>
              {log.organizationId?.substring(0, 12)}...
            </Typography>
          </Tooltip>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)", display: "block", mb: 0.5 }}>
            Source
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)" }}>
            {log.userAgent ? "Web Browser" : "API / System"}
          </Typography>
        </Box>
      </Box>
    </AuditSection>
  );
}

function AuditLogDetails({ log }: { log: AuditLog }) {
  return (
    <Box
      sx={{
        bgcolor: "#0f1419",
        borderRadius: 2,
        border: "1px solid rgba(255,255,255,0.1)",
        overflow: "hidden",
        my: 1.5,
      }}
    >
      <AuditRecordHeader log={log} />
      <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />
      <ActorSection log={log} />
      <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />
      <ChangeSummarySection log={log} />
      <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />
      <StateComparisonSection log={log} />
      <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />
      <MetadataSection log={log} />
    </Box>
  );
}

export default function AuditLogsClient({ logs, total }: AuditLogsClientProps) {
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const entityTypes = [...new Set(logs.map((l) => l.entityType))];

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.entityType.toLowerCase().includes(search.toLowerCase()) ||
      log.user?.email.toLowerCase().includes(search.toLowerCase()) ||
      log.user?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesEntity = entityFilter === "all" || log.entityType === entityFilter;
    return matchesSearch && matchesEntity;
  });

  const getActionColor = (action: string) => {
    const severity = getActionSeverity(action);
    return severityColors[severity];
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 28, color: "#818cf8" }}>
              shield
            </span>
            <Typography variant="h4" fontWeight={800}>
              Audit Trail
            </Typography>
          </Box>
          <Typography color="text.secondary">
            {total.toLocaleString()} security events recorded • Tamper-proof audit log
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<span className="material-symbols-outlined">download</span>}
          sx={{ borderRadius: 2 }}
        >
          Export Report
        </Button>
      </Box>

      <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
        <Box sx={{ p: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
          <TextField
            placeholder="Search events..."
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    search
                  </span>
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}>
              <MenuItem value="all">All Entities</MenuItem>
              {entityTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow
                sx={{
                  bgcolor: "rgba(255,255,255,0.02)",
                  "& th": { fontWeight: 700, color: "text.secondary", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" },
                }}
              >
                <TableCell>Event</TableCell>
                <TableCell>Entity</TableCell>
                <TableCell>Actor</TableCell>
                <TableCell>Timestamp</TableCell>
                <TableCell align="right" sx={{ width: 100 }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ py: 8, textAlign: "center" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.3 }}>
                      shield
                    </span>
                    <Typography color="text.secondary" sx={{ mt: 1 }}>
                      No audit events found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => {
                  const colors = getActionColor(log.action);
                  return (
                    <React.Fragment key={log.id}>
                      <TableRow
                        hover
                        sx={{
                          cursor: "pointer",
                          bgcolor: expandedLog === log.id ? "rgba(255,255,255,0.02)" : "transparent",
                          "&:hover": { bgcolor: "rgba(255,255,255,0.03)" },
                        }}
                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                      >
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Box
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: 1,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                bgcolor: colors.bg,
                                border: "1px solid",
                                borderColor: colors.border,
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 16, color: colors.icon }}>
                                {getActionIcon(log.action)}
                              </span>
                            </Box>
                            <Typography fontWeight={600} sx={{ fontSize: 13, textTransform: "capitalize" }}>
                              {log.action.replace(".", " ").replace(/_/g, " ")}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={log.entityType}
                            size="small"
                            sx={{
                              bgcolor: "rgba(255,255,255,0.05)",
                              color: "rgba(255,255,255,0.7)",
                              fontSize: 11,
                              height: 22,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {log.user ? (
                            <Box>
                              <Typography variant="body2" fontWeight={500}>
                                {log.user.name || "Unknown"}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                                {log.user.email}
                              </Typography>
                            </Box>
                          ) : (
                            <Chip
                              icon={<span className="material-symbols-outlined" style={{ fontSize: 12, marginLeft: 4 }}>smart_toy</span>}
                              label="System"
                              size="small"
                              sx={{
                                bgcolor: "rgba(255,255,255,0.05)",
                                color: "rgba(255,255,255,0.5)",
                                fontSize: 11,
                                height: 22,
                                "& .MuiChip-icon": { color: "rgba(255,255,255,0.4)" },
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: 12 }}>
                            {new Date(log.createdAt).toLocaleDateString("en-US")}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace", fontSize: 11 }}>
                            {new Date(log.createdAt).toLocaleTimeString("en-US")}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            sx={{
                              minWidth: 80,
                              fontSize: 12,
                              color: "rgba(255,255,255,0.6)",
                              "&:hover": { bgcolor: "rgba(255,255,255,0.05)" },
                            }}
                            endIcon={
                              <span
                                className="material-symbols-outlined"
                                style={{
                                  fontSize: 16,
                                  transition: "transform 0.2s",
                                  transform: expandedLog === log.id ? "rotate(180deg)" : "rotate(0deg)",
                                }}
                              >
                                expand_more
                              </span>
                            }
                          >
                            {expandedLog === log.id ? "Collapse" : "Inspect"}
                          </Button>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={5} sx={{ py: 0, border: expandedLog === log.id ? undefined : "none" }}>
                          <Collapse in={expandedLog === log.id}>
                            <AuditLogDetails log={log} />
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
