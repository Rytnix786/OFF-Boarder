"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  alpha,
  useTheme,
  CircularProgress,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tab,
  Tabs,
  Alert,
  Divider,
} from "@mui/material";
import { usePlatformContext } from "../layout";
import { stitchTokens } from "@/theme/tokens";

const t = stitchTokens;

const REACTIVATION_CATEGORIES = [
  "ORGANIZATION_SUSPENDED",
  "ORGANIZATION_REJECTED",
  "ORGANIZATION_BLOCKED",
];

type SupportTicket = {
  id: string;
  ticketNumber: string;
  organizationId: string | null;
  userId: string | null;
  email: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  context: any;
  assignedTo: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
  organization?: {
    id: string;
    name: string;
    status: string;
  } | null;
};

type Stats = {
  open: number;
  inProgress: number;
  waitingOnUser: number;
  resolved: number;
  closed: number;
  total: number;
};

const categoryLabels: Record<string, string> = {
  ACCOUNT_ACCESS: "Account Access",
  ORGANIZATION_BLOCKED: "Organization Blocked",
  ORGANIZATION_SUSPENDED: "Organization Suspended",
  ORGANIZATION_REJECTED: "Organization Rejected",
  BILLING: "Billing",
  TECHNICAL_ISSUE: "Technical Issue",
  FEATURE_REQUEST: "Feature Request",
  SECURITY_CONCERN: "Security Concern",
  OTHER: "Other",
};

const statusColors: Record<string, string> = {
  OPEN: "#f59e0b",
  IN_PROGRESS: "#3b82f6",
  WAITING_ON_USER: "#8b5cf6",
  RESOLVED: "#22c55e",
  CLOSED: "#71717a",
};

const priorityColors: Record<string, string> = {
  LOW: "#22c55e",
  MEDIUM: "#f59e0b",
  HIGH: "#f97316",
  URGENT: "#dc2626",
};

function TicketCard({
  ticket,
  onSelect,
  incidentMode,
}: {
  ticket: SupportTicket;
  onSelect: () => void;
  incidentMode: boolean;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      onClick={onSelect}
      sx={{
        p: 3,
        borderRadius: 2,
        bgcolor: incidentMode ? alpha("#1c1917", 0.5) : isDark ? "#18181b" : "#fff",
        border: "1px solid",
        borderColor: incidentMode ? alpha("#dc2626", 0.15) : isDark ? "#27272a" : "#e5e7eb",
        cursor: "pointer",
        transition: "all 150ms ease",
        "&:hover": {
          borderColor: incidentMode ? alpha("#dc2626", 0.3) : "#6366f1",
          transform: "translateY(-1px)",
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography sx={{ fontSize: t.typography.fontSize.sm, fontWeight: 700, color: isDark ? "#a1a1aa" : "#52525b" }}>
            {ticket.ticketNumber}
          </Typography>
          <Chip
            label={ticket.status.replace("_", " ")}
            size="small"
            sx={{
              bgcolor: alpha(statusColors[ticket.status] || "#71717a", 0.1),
              color: statusColors[ticket.status] || "#71717a",
              fontWeight: 600,
              fontSize: "0.7rem",
              height: 22,
            }}
          />
        </Box>
        <Chip
          label={ticket.priority}
          size="small"
          sx={{
            bgcolor: alpha(priorityColors[ticket.priority] || "#71717a", 0.1),
            color: priorityColors[ticket.priority] || "#71717a",
            fontWeight: 700,
            fontSize: "0.65rem",
            height: 20,
          }}
        />
      </Box>

      <Typography sx={{ fontSize: t.typography.fontSize.base, fontWeight: 600, color: isDark ? "#fff" : "#0f172a", mb: 1, lineHeight: 1.4 }}>
        {ticket.subject}
      </Typography>

      <Typography
        sx={{
          fontSize: t.typography.fontSize.sm,
          color: isDark ? "#a1a1aa" : "#64748b",
          mb: 2,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          lineHeight: 1.5,
        }}
      >
        {ticket.message}
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Chip
            label={categoryLabels[ticket.category] || ticket.category}
            size="small"
            variant="outlined"
            sx={{ fontSize: "0.7rem", height: 22 }}
          />
          {ticket.organization && (
            <Chip
              label={ticket.organization.name}
              size="small"
              sx={{
                bgcolor: alpha("#6366f1", 0.1),
                color: "#6366f1",
                fontSize: "0.7rem",
                height: 22,
              }}
            />
          )}
        </Box>
        <Typography sx={{ fontSize: t.typography.fontSize.xs, color: isDark ? "#71717a" : "#9ca3af" }}>
          {new Date(ticket.createdAt).toLocaleDateString()} at {new Date(ticket.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Typography>
      </Box>
    </Box>
  );
}

function TicketDetailDialog({
  ticket,
  open,
  onClose,
  onUpdate,
  incidentMode,
}: {
  ticket: SupportTicket | null;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
  incidentMode: boolean;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [status, setStatus] = useState(ticket?.status || "OPEN");
  const [resolution, setResolution] = useState(ticket?.resolution || "");
  const [updating, setUpdating] = useState(false);
  const [decisionReason, setDecisionReason] = useState("");
  const [processingReactivation, setProcessingReactivation] = useState(false);
  const [reactivationError, setReactivationError] = useState<string | null>(null);
  const [reactivationSuccess, setReactivationSuccess] = useState<string | null>(null);

  const isReactivationTicket = ticket && REACTIVATION_CATEGORIES.includes(ticket.category);
  const canProcessReactivation = isReactivationTicket && 
    ticket?.organization && 
    (ticket.organization.status === "SUSPENDED" || ticket.organization.status === "REJECTED") &&
    ticket.status !== "RESOLVED" && 
    ticket.status !== "CLOSED";

  useEffect(() => {
    if (ticket) {
      setStatus(ticket.status);
      setResolution(ticket.resolution || "");
      setDecisionReason("");
      setReactivationError(null);
      setReactivationSuccess(null);
    }
  }, [ticket]);

  const handleUpdate = async () => {
    if (!ticket) return;
    setUpdating(true);
    try {
      const res = await fetch("/api/platform/support-tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: ticket.id,
          status,
          resolution: resolution || null,
        }),
      });
      if (res.ok) {
        onUpdate();
        onClose();
      }
    } catch (e) {
      console.error("Failed to update ticket", e);
    }
    setUpdating(false);
  };

  const handleReactivation = async (action: "approve_reactivation" | "deny_reactivation") => {
    if (!ticket) return;
    setProcessingReactivation(true);
    setReactivationError(null);
    setReactivationSuccess(null);

    try {
      const res = await fetch("/api/platform/support-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: ticket.id,
          action,
          decisionReason: decisionReason || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setReactivationSuccess(data.message);
        setTimeout(() => {
          onUpdate();
          onClose();
        }, 2000);
      } else {
        setReactivationError(data.error || "Failed to process request");
      }
    } catch (e) {
      console.error("Failed to process reactivation", e);
      setReactivationError("An unexpected error occurred");
    }
    setProcessingReactivation(false);
  };

  if (!ticket) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography sx={{ fontSize: t.typography.fontSize.lg, fontWeight: 700 }}>
              {ticket.ticketNumber}
            </Typography>
            <Chip
              label={ticket.status.replace("_", " ")}
              size="small"
              sx={{
                bgcolor: alpha(statusColors[ticket.status] || "#71717a", 0.1),
                color: statusColors[ticket.status] || "#71717a",
                fontWeight: 600,
              }}
            />
            <Chip
              label={ticket.priority}
              size="small"
              sx={{
                bgcolor: alpha(priorityColors[ticket.priority] || "#71717a", 0.1),
                color: priorityColors[ticket.priority] || "#71717a",
                fontWeight: 700,
              }}
            />
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography sx={{ fontSize: t.typography.fontSize.lg, fontWeight: 600, color: isDark ? "#fff" : "#0f172a", mb: 2 }}>
            {ticket.subject}
          </Typography>

          <Box
            sx={{
              p: 2.5,
              borderRadius: 1.5,
              bgcolor: isDark ? "#09090b" : "#f9fafb",
              border: "1px solid",
              borderColor: isDark ? "#27272a" : "#e5e7eb",
              mb: 3,
            }}
          >
            <Typography sx={{ fontSize: t.typography.fontSize.sm, color: isDark ? "#d4d4d8" : "#374151", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {ticket.message}
            </Typography>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2, mb: 3 }}>
            <Box>
              <Typography sx={{ fontSize: t.typography.fontSize.xs, fontWeight: 600, color: isDark ? "#71717a" : "#6b7280", mb: 0.5 }}>
                Category
              </Typography>
              <Typography sx={{ fontSize: t.typography.fontSize.sm, color: isDark ? "#fff" : "#0f172a" }}>
                {categoryLabels[ticket.category] || ticket.category}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: t.typography.fontSize.xs, fontWeight: 600, color: isDark ? "#71717a" : "#6b7280", mb: 0.5 }}>
                Email
              </Typography>
              <Typography sx={{ fontSize: t.typography.fontSize.sm, color: isDark ? "#fff" : "#0f172a" }}>
                {ticket.email}
              </Typography>
            </Box>
            {ticket.organization && (
              <Box>
                <Typography sx={{ fontSize: t.typography.fontSize.xs, fontWeight: 600, color: isDark ? "#71717a" : "#6b7280", mb: 0.5 }}>
                  Organization
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography sx={{ fontSize: t.typography.fontSize.sm, color: isDark ? "#fff" : "#0f172a" }}>
                    {ticket.organization.name}
                  </Typography>
                  <Chip
                    label={ticket.organization.status}
                    size="small"
                    sx={{
                      fontSize: "0.65rem",
                      height: 18,
                      bgcolor: ticket.organization.status === "ACTIVE" ? alpha("#22c55e", 0.1) : alpha("#f59e0b", 0.1),
                      color: ticket.organization.status === "ACTIVE" ? "#22c55e" : "#f59e0b",
                    }}
                  />
                </Box>
              </Box>
            )}
            <Box>
              <Typography sx={{ fontSize: t.typography.fontSize.xs, fontWeight: 600, color: isDark ? "#71717a" : "#6b7280", mb: 0.5 }}>
                Created
              </Typography>
              <Typography sx={{ fontSize: t.typography.fontSize.sm, color: isDark ? "#fff" : "#0f172a" }}>
                {new Date(ticket.createdAt).toLocaleString()}
              </Typography>
            </Box>
          </Box>

            {ticket.context && (
              <Box sx={{ mb: 3 }}>
                <Typography sx={{ fontSize: t.typography.fontSize.xs, fontWeight: 600, color: isDark ? "#71717a" : "#6b7280", mb: 1 }}>
                  Additional Context
                </Typography>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    bgcolor: isDark ? "#09090b" : "#f9fafb",
                    border: "1px solid",
                    borderColor: isDark ? "#27272a" : "#e5e7eb",
                    fontFamily: "monospace",
                    fontSize: t.typography.fontSize.xs,
                    overflow: "auto",
                  }}
                >
                  <pre style={{ margin: 0 }}>{JSON.stringify(ticket.context, null, 2)}</pre>
                </Box>
              </Box>
            )}

            {canProcessReactivation && (
              <Box 
                sx={{ 
                  mb: 3, 
                  p: 3, 
                  borderRadius: 2, 
                  bgcolor: alpha("#6366f1", 0.05),
                  border: "2px solid",
                  borderColor: alpha("#6366f1", 0.2),
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 24, color: "#6366f1" }}>
                    verified_user
                  </span>
                  <Typography sx={{ fontSize: t.typography.fontSize.base, fontWeight: 700, color: isDark ? "#fff" : "#0f172a" }}>
                    Organization Reactivation Request
                  </Typography>
                </Box>

                <Alert 
                  severity="info" 
                  sx={{ mb: 2, borderRadius: 1.5 }}
                  icon={<span className="material-symbols-outlined" style={{ fontSize: 20 }}>info</span>}
                >
                  <Typography variant="body2">
                    This ticket requests {ticket.organization?.status === "REJECTED" ? "acceptance" : "reactivation"} of 
                    <strong> {ticket.organization?.name}</strong> (currently {ticket.organization?.status}).
                    Review the request and take action below.
                  </Typography>
                </Alert>

                {reactivationSuccess && (
                  <Alert severity="success" sx={{ mb: 2, borderRadius: 1.5 }}>
                    {reactivationSuccess}
                  </Alert>
                )}

                {reactivationError && (
                  <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>
                    {reactivationError}
                  </Alert>
                )}

                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Decision Reason (optional)"
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder="Provide reason for your decision..."
                  sx={{ mb: 2 }}
                  disabled={processingReactivation}
                />

                <Box sx={{ display: "flex", gap: 2 }}>
                  <Button
                    variant="contained"
                    onClick={() => handleReactivation("approve_reactivation")}
                    disabled={processingReactivation}
                    startIcon={
                      processingReactivation ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
                      )
                    }
                    sx={{ 
                      fontWeight: 700, 
                      bgcolor: "#22c55e", 
                      "&:hover": { bgcolor: "#16a34a" },
                      flex: 1,
                    }}
                  >
                    {ticket.organization?.status === "REJECTED" ? "Accept & Activate" : "Approve & Reactivate"}
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => handleReactivation("deny_reactivation")}
                    disabled={processingReactivation}
                    startIcon={
                      processingReactivation ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>cancel</span>
                      )
                    }
                    sx={{ 
                      fontWeight: 700, 
                      bgcolor: "#dc2626", 
                      "&:hover": { bgcolor: "#b91c1c" },
                      flex: 1,
                    }}
                  >
                    Deny Request
                  </Button>
                </Box>
              </Box>
            )}

            {isReactivationTicket && !canProcessReactivation && ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" && (
              <Alert 
                severity="warning" 
                sx={{ mb: 3, borderRadius: 1.5 }}
              >
                <Typography variant="body2">
                  {ticket.organization?.status === "ACTIVE" 
                    ? "This organization is already active. No reactivation needed."
                    : ticket.organization?.status === "PENDING"
                    ? "This organization is pending approval. Use the Organizations page to approve."
                    : "Unable to process reactivation for this ticket."}
                </Typography>
              </Alert>
            )}

            <Divider sx={{ my: 3 }} />

            <Box sx={{ pt: 1 }}>
            <Typography sx={{ fontSize: t.typography.fontSize.sm, fontWeight: 700, color: isDark ? "#fff" : "#0f172a", mb: 2 }}>
              Update Ticket
            </Typography>

            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Status</InputLabel>
                <Select value={status} onChange={(e) => setStatus(e.target.value)} label="Status">
                  <MenuItem value="OPEN">Open</MenuItem>
                  <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                  <MenuItem value="WAITING_ON_USER">Waiting on User</MenuItem>
                  <MenuItem value="RESOLVED">Resolved</MenuItem>
                  <MenuItem value="CLOSED">Closed</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Resolution Notes"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Add resolution details or notes..."
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, pt: 1 }}>
        <Button onClick={onClose} sx={{ fontWeight: 600 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleUpdate}
          disabled={updating}
          sx={{ fontWeight: 600, bgcolor: "#6366f1", "&:hover": { bgcolor: "#4f46e5" } }}
        >
          {updating ? "Updating..." : "Update Ticket"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function SupportTicketsPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { incidentMode } = usePlatformContext();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  const fetchTickets = async (statusFilter?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }
      const res = await fetch(`/api/platform/support-tickets?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets);
        setStats(data.stats);
      }
    } catch (e) {
      console.error("Failed to fetch tickets", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    const statusMap = ["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
    fetchTickets(statusMap[newValue]);
  };

  const handleSelectTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setDialogOpen(true);
  };

  const filteredTickets = tickets;

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 4 }}>
        <Box>
          <Typography sx={{ fontSize: "1.75rem", fontWeight: 700, color: isDark ? "#fff" : "#0f172a", letterSpacing: "-0.02em", mb: 1 }}>
            Support Tickets
          </Typography>
          <Typography sx={{ fontSize: "1rem", color: isDark ? "#a1a1aa" : "#64748b" }}>
            Manage organization requests and support inquiries
          </Typography>
        </Box>
        <Button
          variant="outlined"
          onClick={() => fetchTickets()}
          startIcon={<span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>}
          sx={{ fontWeight: 600 }}
        >
          Refresh
        </Button>
      </Box>

      {stats && (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 2, mb: 4 }}>
          {[
            { label: "Open", value: stats.open, color: statusColors.OPEN },
            { label: "In Progress", value: stats.inProgress, color: statusColors.IN_PROGRESS },
            { label: "Waiting", value: stats.waitingOnUser, color: statusColors.WAITING_ON_USER },
            { label: "Resolved", value: stats.resolved, color: statusColors.RESOLVED },
            { label: "Closed", value: stats.closed, color: statusColors.CLOSED },
          ].map((stat) => (
            <Box
              key={stat.label}
              sx={{
                p: 2.5,
                borderRadius: 2,
                bgcolor: incidentMode ? alpha("#1c1917", 0.5) : isDark ? "#18181b" : "#fff",
                border: "1px solid",
                borderColor: incidentMode ? alpha("#dc2626", 0.15) : isDark ? "#27272a" : "#e5e7eb",
                textAlign: "center",
              }}
            >
              <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color: stat.color }}>{stat.value}</Typography>
              <Typography sx={{ fontSize: t.typography.fontSize.xs, color: isDark ? "#71717a" : "#6b7280", fontWeight: 500 }}>
                {stat.label}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      <Box
        sx={{
          borderRadius: 2,
          bgcolor: incidentMode ? alpha("#1c1917", 0.5) : isDark ? "#18181b" : "#fff",
          border: "1px solid",
          borderColor: incidentMode ? alpha("#dc2626", 0.15) : isDark ? "#27272a" : "#e5e7eb",
          overflow: "hidden",
        }}
      >
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{
            borderBottom: "1px solid",
            borderColor: isDark ? "#27272a" : "#e5e7eb",
            px: 2,
            "& .MuiTab-root": { fontWeight: 600, textTransform: "none" },
          }}
        >
          <Tab label={`All (${stats?.total || 0})`} />
          <Tab label={`Open (${stats?.open || 0})`} />
          <Tab label={`In Progress (${stats?.inProgress || 0})`} />
          <Tab label={`Resolved (${stats?.resolved || 0})`} />
          <Tab label={`Closed (${stats?.closed || 0})`} />
        </Tabs>

        {loading ? (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 8 }}>
            <CircularProgress size={32} sx={{ color: incidentMode ? "#dc2626" : "#6366f1" }} />
          </Box>
        ) : filteredTickets.length === 0 ? (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: isDark ? "#3f3f46" : "#d4d4d8", marginBottom: 12 }}>
              confirmation_number
            </span>
            <Typography sx={{ fontSize: "1rem", color: isDark ? "#71717a" : "#9ca3af", fontWeight: 500 }}>
              No tickets found
            </Typography>
          </Box>
        ) : (
          <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
            {filteredTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onSelect={() => handleSelectTicket(ticket)}
                incidentMode={incidentMode}
              />
            ))}
          </Box>
        )}
      </Box>

      <TicketDetailDialog
        ticket={selectedTicket}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onUpdate={() => fetchTickets()}
        incidentMode={incidentMode}
      />
    </Box>
  );
}
