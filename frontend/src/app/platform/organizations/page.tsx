"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  alpha,
  useTheme,
  Button,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  Alert,
} from "@mui/material";
import { usePlatformContext } from "../layout";
import { stitchTokens } from "@/theme/tokens";

const t = stitchTokens;

type Organization = {
  id: string;
  name: string;
  slug: string;
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED";
  createdAt: string;
  approvedAt: string | null;
  rejectionReason: string | null;
  _count: {
    employees: number;
    offboardings: number;
    memberships: number;
  };
  riskSummary: { high: number; critical: number };
  lastActivity: string | null;
};

type ActionDialogState = {
  open: boolean;
  org: Organization | null;
  action: "approve" | "suspend" | "reactivate" | "reject" | "recover" | null;
};

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: string; description: string }> = {
  PENDING: { color: "#f59e0b", label: "Pending", icon: "schedule", description: "Awaiting platform approval" },
  ACTIVE: { color: "#22c55e", label: "Active", icon: "check_circle", description: "Fully operational" },
  SUSPENDED: { color: "#dc2626", label: "Suspended", icon: "block", description: "Temporarily suspended" },
  REJECTED: { color: "#6b7280", label: "Rejected", icon: "cancel", description: "Registration rejected" },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <Tooltip title={config.description}>
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.75,
          px: 1.5,
          py: 0.5,
          borderRadius: 1,
          bgcolor: alpha(config.color, 0.1),
          border: `1px solid ${alpha(config.color, 0.2)}`,
        }}
      >
        <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: config.color }} />
        <Typography sx={{ fontSize: t.typography.fontSize.xs, fontWeight: 600, color: config.color, textTransform: "uppercase" }}>
          {config.label}
        </Typography>
      </Box>
    </Tooltip>
  );
}

function OrgRow({
  org,
  incidentMode,
  onAction,
}: {
  org: Organization;
  incidentMode: boolean;
  onAction: (org: Organization, action: "approve" | "suspend" | "reactivate" | "reject" | "recover") => void;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const hasRisk = org.riskSummary.high > 0 || org.riskSummary.critical > 0;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 3,
        p: 2.5,
        borderRadius: 1.5,
        bgcolor: incidentMode ? alpha("#1c1917", 0.5) : isDark ? "#18181b" : "#fff",
        border: "1px solid",
        borderColor: hasRisk && !incidentMode
          ? alpha("#dc2626", 0.2)
          : incidentMode
          ? alpha("#dc2626", 0.15)
          : isDark
          ? "#27272a"
          : "#e5e7eb",
        transition: "all 150ms ease",
        "&:hover": {
          borderColor: incidentMode ? alpha("#dc2626", 0.3) : isDark ? "#3f3f46" : "#d4d4d8",
        },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
          <Typography sx={{ fontSize: t.typography.fontSize.base, fontWeight: 600, color: isDark ? "#fff" : "#0f172a" }}>
            {org.name}
          </Typography>
          <StatusBadge status={org.status} />
        </Box>
        <Typography sx={{ fontSize: t.typography.fontSize.xs, color: isDark ? "#71717a" : "#6b7280" }}>
          {org.slug} • Created {new Date(org.createdAt).toLocaleDateString()}
        </Typography>
        {org.status === "REJECTED" && org.rejectionReason && (
          <Typography sx={{ fontSize: t.typography.fontSize.xs, color: "#dc2626", mt: 0.5 }}>
            Rejected: {org.rejectionReason}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
        <Box sx={{ textAlign: "center", minWidth: 60 }}>
          <Typography sx={{ fontSize: t.typography.fontSize.lg, fontWeight: 700, color: isDark ? "#fff" : "#0f172a" }}>
            {org._count.memberships}
          </Typography>
          <Typography sx={{ fontSize: t.typography.fontSize.xs, color: isDark ? "#52525b" : "#9ca3af" }}>
            Members
          </Typography>
        </Box>
        <Box sx={{ textAlign: "center", minWidth: 60 }}>
          <Typography sx={{ fontSize: t.typography.fontSize.lg, fontWeight: 700, color: isDark ? "#fff" : "#0f172a" }}>
            {org._count.offboardings}
          </Typography>
          <Typography sx={{ fontSize: t.typography.fontSize.xs, color: isDark ? "#52525b" : "#9ca3af" }}>
            Offboardings
          </Typography>
        </Box>
        <Box sx={{ textAlign: "center", minWidth: 80 }}>
          <Typography
            sx={{
              fontSize: t.typography.fontSize.lg,
              fontWeight: 700,
              color: hasRisk ? "#dc2626" : "#22c55e",
            }}
          >
            {org.riskSummary.high + org.riskSummary.critical}
          </Typography>
          <Typography sx={{ fontSize: t.typography.fontSize.xs, color: isDark ? "#52525b" : "#9ca3af" }}>
            High/Critical
          </Typography>
        </Box>
        <Box sx={{ textAlign: "right", minWidth: 100 }}>
          <Typography sx={{ fontSize: t.typography.fontSize.xs, color: isDark ? "#71717a" : "#6b7280" }}>
            Last Activity
          </Typography>
          <Typography sx={{ fontSize: t.typography.fontSize.sm, fontWeight: 500, color: isDark ? "#a1a1aa" : "#374151" }}>
            {org.lastActivity ? new Date(org.lastActivity).toLocaleDateString() : "—"}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
        {org.status === "PENDING" && (
          <>
            <Tooltip title="Approve Organization">
              <IconButton
                size="small"
                onClick={() => onAction(org, "approve")}
                sx={{ color: "#22c55e", "&:hover": { bgcolor: alpha("#22c55e", 0.1) } }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>check</span>
              </IconButton>
            </Tooltip>
            <Tooltip title="Reject Organization">
              <IconButton
                size="small"
                onClick={() => onAction(org, "reject")}
                sx={{ color: "#dc2626", "&:hover": { bgcolor: alpha("#dc2626", 0.1) } }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
              </IconButton>
            </Tooltip>
          </>
        )}
        {org.status === "ACTIVE" && (
          <Tooltip title="Suspend Organization">
            <IconButton
              size="small"
              onClick={() => onAction(org, "suspend")}
              sx={{ color: "#f59e0b", "&:hover": { bgcolor: alpha("#f59e0b", 0.1) } }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>block</span>
            </IconButton>
          </Tooltip>
        )}
        {org.status === "SUSPENDED" && (
          <Tooltip title="Reactivate Organization">
            <IconButton
              size="small"
              onClick={() => onAction(org, "reactivate")}
              sx={{ color: "#22c55e", "&:hover": { bgcolor: alpha("#22c55e", 0.1) } }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>restart_alt</span>
            </IconButton>
          </Tooltip>
        )}
        {org.status === "REJECTED" && (
          <Tooltip title="Recover Organization (approve after rejection)">
            <IconButton
              size="small"
              onClick={() => onAction(org, "recover")}
              sx={{ color: "#6366f1", "&:hover": { bgcolor: alpha("#6366f1", 0.1) } }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>undo</span>
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
}

export default function OrganizationsPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { incidentMode } = usePlatformContext();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionDialog, setActionDialog] = useState<ActionDialogState>({ open: false, org: null, action: null });
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOrganizations = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/platform/organizations?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data.organizations);
      }
    } catch (e) {
      console.error("Failed to fetch organizations", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrganizations();
  }, [statusFilter]);

  const handleAction = (org: Organization, action: "approve" | "suspend" | "reactivate" | "reject" | "recover") => {
    setActionDialog({ open: true, org, action });
    setActionReason("");
  };

  const executeAction = async () => {
    if (!actionDialog.org || !actionDialog.action) return;
    if ((actionDialog.action === "suspend" || actionDialog.action === "reject") && !actionReason.trim()) return;

    setActionLoading(true);
    try {
      const apiAction = actionDialog.action === "recover" ? "reactivate" : actionDialog.action;
      
      const res = await fetch("/api/platform/organizations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: actionDialog.org.id,
          action: apiAction,
          reason: actionReason,
        }),
      });

        if (res.ok) {
          setActionDialog({ open: false, org: null, action: null });
          fetchOrganizations();
        } else {
          const data = await res.json();
          console.error("Action failed:", res.status, data);
          alert(`Error: ${data.error || "Unknown error"}`);
        }
      } catch (e) {
        console.error("Action failed", e);
        alert("Network error. Please try again.");
      }
    setActionLoading(false);
  };

  const actionLabels: Record<string, { title: string; button: string; color: string; description: string }> = {
    approve: { title: "Approve Organization", button: "Approve", color: "#22c55e", description: "Grant full platform access to this organization." },
    suspend: { title: "Suspend Organization", button: "Suspend", color: "#f59e0b", description: "Temporarily revoke access. All users will be logged out but data is preserved." },
    reactivate: { title: "Reactivate Organization", button: "Reactivate", color: "#22c55e", description: "Restore full platform access. Users can log in again." },
    reject: { title: "Reject Organization", button: "Reject", color: "#dc2626", description: "Deny registration. The organization cannot access the platform." },
    recover: { title: "Recover Rejected Organization", button: "Recover & Activate", color: "#6366f1", description: "Approve this previously rejected organization. They will gain full platform access." },
  };

  const pendingCount = organizations.filter((o) => o.status === "PENDING").length;
  const suspendedCount = organizations.filter((o) => o.status === "SUSPENDED").length;
  const rejectedCount = organizations.filter((o) => o.status === "REJECTED").length;

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 4 }}>
        <Box>
          <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color: isDark ? "#fff" : "#0f172a", letterSpacing: "-0.02em", mb: 0.5 }}>
            Organization Lifecycle Management
          </Typography>
          <Typography sx={{ fontSize: t.typography.fontSize.sm, color: isDark ? "#71717a" : "#6b7280" }}>
            Approve, suspend, reactivate, and recover tenant organizations
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          {pendingCount > 0 && (
            <Chip
              label={`${pendingCount} Pending`}
              size="small"
              sx={{
                bgcolor: alpha("#f59e0b", 0.1),
                color: "#f59e0b",
                fontWeight: 600,
                fontSize: t.typography.fontSize.xs,
                border: `1px solid ${alpha("#f59e0b", 0.2)}`,
              }}
            />
          )}
          {suspendedCount > 0 && (
            <Chip
              label={`${suspendedCount} Suspended`}
              size="small"
              sx={{
                bgcolor: alpha("#dc2626", 0.1),
                color: "#dc2626",
                fontWeight: 600,
                fontSize: t.typography.fontSize.xs,
                border: `1px solid ${alpha("#dc2626", 0.2)}`,
              }}
            />
          )}
          {rejectedCount > 0 && (
            <Chip
              label={`${rejectedCount} Rejected`}
              size="small"
              sx={{
                bgcolor: alpha("#6b7280", 0.1),
                color: "#6b7280",
                fontWeight: 600,
                fontSize: t.typography.fontSize.xs,
                border: `1px solid ${alpha("#6b7280", 0.2)}`,
              }}
            />
          )}
        </Box>
      </Box>

      <Alert 
        severity="info" 
        sx={{ mb: 3, borderRadius: 2 }}
        icon={<span className="material-symbols-outlined" style={{ fontSize: 20 }}>info</span>}
      >
        <Typography sx={{ fontSize: t.typography.fontSize.sm }}>
          <strong>Lifecycle States:</strong> PENDING → ACTIVE (approve) or REJECTED (reject) | ACTIVE → SUSPENDED (suspend) | SUSPENDED → ACTIVE (reactivate) | REJECTED → ACTIVE (recover)
        </Typography>
      </Alert>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <TextField
          placeholder="Search organizations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchOrganizations()}
          size="small"
          sx={{ width: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: isDark ? "#71717a" : "#9ca3af" }}>search</span>
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ fontSize: t.typography.fontSize.sm }}
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="SUSPENDED">Suspended</MenuItem>
            <MenuItem value="REJECTED">Rejected</MenuItem>
          </Select>
        </FormControl>
        <Button
          onClick={fetchOrganizations}
          sx={{ ml: "auto", color: isDark ? "#71717a" : "#6b7280" }}
          startIcon={<span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>}
        >
          Refresh
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 8 }}>
          <CircularProgress size={32} sx={{ color: incidentMode ? "#dc2626" : "#6366f1" }} />
        </Box>
      ) : organizations.length === 0 ? (
        <Box
          sx={{
            py: 8,
            textAlign: "center",
            bgcolor: incidentMode ? alpha("#1c1917", 0.5) : isDark ? "#18181b" : "#fff",
            borderRadius: 2,
            border: "1px solid",
            borderColor: incidentMode ? alpha("#dc2626", 0.15) : isDark ? "#27272a" : "#e5e7eb",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: isDark ? "#3f3f46" : "#d4d4d8", marginBottom: 8 }}>
            corporate_fare
          </span>
          <Typography sx={{ fontSize: t.typography.fontSize.base, color: isDark ? "#52525b" : "#9ca3af" }}>
            No organizations found
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {organizations.map((org) => (
            <OrgRow key={org.id} org={org} incidentMode={incidentMode} onAction={handleAction} />
          ))}
        </Box>
      )}

      <Dialog
        open={actionDialog.open}
        onClose={() => setActionDialog({ open: false, org: null, action: null })}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        {actionDialog.action && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1.5,
                    bgcolor: alpha(actionLabels[actionDialog.action].color, 0.1),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 20, color: actionLabels[actionDialog.action].color }}
                  >
                    {actionDialog.action === "approve" || actionDialog.action === "reactivate" || actionDialog.action === "recover" ? "check_circle" : "warning"}
                  </span>
                </Box>
                <Typography sx={{ fontSize: t.typography.fontSize.lg, fontWeight: 700 }}>
                  {actionLabels[actionDialog.action].title}
                </Typography>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography sx={{ fontSize: t.typography.fontSize.sm, color: isDark ? "#a1a1aa" : "#52525b", mb: 2 }}>
                {actionLabels[actionDialog.action].description}
              </Typography>
              
              <Box sx={{ bgcolor: isDark ? "#27272a" : "#f4f4f5", p: 2, borderRadius: 1.5, mb: 2 }}>
                <Typography sx={{ fontSize: t.typography.fontSize.xs, color: isDark ? "#71717a" : "#6b7280", mb: 0.5 }}>
                  Organization
                </Typography>
                <Typography sx={{ fontSize: t.typography.fontSize.base, fontWeight: 600, color: isDark ? "#fff" : "#0f172a" }}>
                  {actionDialog.org?.name}
                </Typography>
                <Typography sx={{ fontSize: t.typography.fontSize.xs, color: isDark ? "#71717a" : "#6b7280" }}>
                  Current status: {actionDialog.org?.status}
                </Typography>
              </Box>

              {actionDialog.action === "recover" && actionDialog.org?.rejectionReason && (
                <Alert severity="warning" sx={{ mb: 2, borderRadius: 1.5 }}>
                  <Typography sx={{ fontSize: t.typography.fontSize.xs }}>
                    <strong>Original rejection reason:</strong> {actionDialog.org.rejectionReason}
                  </Typography>
                </Alert>
              )}

              {(actionDialog.action === "suspend" || actionDialog.action === "reject") && (
                <TextField
                  fullWidth
                  label="Reason (required)"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder={`Reason for ${actionDialog.action}...`}
                  multiline
                  rows={3}
                  required
                  sx={{ mt: 1 }}
                />
              )}
              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  borderRadius: 1.5,
                  bgcolor: alpha("#6366f1", isDark ? 0.1 : 0.05),
                  border: `1px solid ${alpha("#6366f1", 0.2)}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#6366f1" }}>info</span>
                <Typography sx={{ fontSize: t.typography.fontSize.xs, color: "#6366f1" }}>
                  This action will be logged in the Platform Audit Log and affected users will be notified.
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2.5, pt: 1 }}>
              <Button onClick={() => setActionDialog({ open: false, org: null, action: null })} sx={{ fontWeight: 600 }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={executeAction}
                disabled={actionLoading || ((actionDialog.action === "suspend" || actionDialog.action === "reject") && !actionReason.trim())}
                sx={{
                  fontWeight: 600,
                  bgcolor: actionLabels[actionDialog.action].color,
                  "&:hover": { bgcolor: actionLabels[actionDialog.action].color, opacity: 0.9 },
                }}
              >
                {actionLoading ? "Processing..." : actionLabels[actionDialog.action].button}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
