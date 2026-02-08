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
} from "@mui/material";
import { useRouter } from "next/navigation";

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

interface GlobalIPBlockingClientProps {
  blockedIPs: BlockedIP[];
}

export default function GlobalIPBlockingClient({ blockedIPs }: GlobalIPBlockingClientProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; ipAddress: string } | null>(null);
  const [attemptsDialog, setAttemptsDialog] = useState<{ open: boolean; blockedIPId: string; ipAddress: string } | null>(null);
  const [attempts, setAttempts] = useState<Array<{ id: string; path: string | null; method: string | null; userAgent: string | null; createdAt: Date }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    ipAddress: "",
    reason: "",
    duration: "permanent",
  });

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
        body: JSON.stringify({
          ipAddress: formData.ipAddress,
          scope: "GLOBAL",
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
      router.refresh();
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
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to unblock IP");
      }

      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred");
    }
    setLoading(false);
  };

  const handleViewAttempts = async (blockedIPId: string, ipAddress: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/blocked-ips/attempts?blockedIPId=${blockedIPId}`);
      const data = await response.json();
      setAttempts(data.attempts || []);
      setAttemptsDialog({ open: true, blockedIPId, ipAddress });
    } catch (err) {
      alert("Failed to load attempts");
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

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Global IP Blocking</Typography>
          <Typography color="text.secondary">
            Block IP addresses platform-wide across all organizations
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="error"
          startIcon={<span className="material-symbols-outlined">block</span>}
          onClick={() => setDialogOpen(true)}
          sx={{ borderRadius: 2, fontWeight: 700 }}
        >
          Block IP Globally
        </Button>
      </Box>

      <Alert severity="warning" sx={{ mb: 3 }}>
        Global IP blocks affect ALL organizations on the platform. Use with caution. These blocks take precedence over organization-level blocks.
      </Alert>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: 700, color: "text.secondary", fontSize: 12, textTransform: "uppercase" } }}>
                <TableCell>IP Address</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell>Blocked Attempts</TableCell>
                <TableCell>Blocked By</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {blockedIPs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ py: 8, textAlign: "center" }}>
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#9ca3af" }}>public</span>
                      <Typography color="text.secondary">No globally blocked IP addresses</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Global blocks affect all organizations on the platform
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                blockedIPs.map((ip) => (
                  <TableRow key={ip.id} hover sx={{ opacity: !ip.isActive || isExpired(ip.expiresAt) ? 0.5 : 1 }}>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography fontWeight={600} fontFamily="monospace">{ip.ipAddress}</Typography>
                        <Chip label="GLOBAL" size="small" color="error" sx={{ height: 20, fontSize: 10 }} />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {ip.reason || "No reason provided"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {!ip.isActive ? (
                        <Chip label="Unblocked" size="small" variant="outlined" />
                      ) : isExpired(ip.expiresAt) ? (
                        <Chip label="Expired" size="small" color="warning" variant="outlined" />
                      ) : (
                        <Chip label="Active" size="small" color="error" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatExpiration(ip.expiresAt)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View blocked attempts">
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => handleViewAttempts(ip.id, ip.ipAddress)}
                          sx={{ minWidth: 0 }}
                        >
                          {ip._count.attempts}
                        </Button>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{ip.createdBy.name || ip.createdBy.email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(ip.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {ip.isActive && !isExpired(ip.expiresAt) && (
                        <Button
                          size="small"
                          color="success"
                          onClick={() => handleUnblock(ip.id)}
                          disabled={loading}
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={(e) => handleSubmit(e, false)}>
          <DialogTitle fontWeight={700}>Block IP Address Globally</DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            )}
            <Alert severity="warning" sx={{ mb: 2 }}>
              This will block the IP address from accessing ANY organization on the platform.
            </Alert>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="IP Address"
                  value={formData.ipAddress}
                  onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                  required
                  placeholder="192.168.1.1"
                  helperText="Enter IPv4 or IPv6 address"
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Malicious activity, spam, abuse, etc."
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
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="error" disabled={loading}>
              {loading ? "Blocking..." : "Block IP Globally"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={confirmDialog?.open || false} onClose={() => setConfirmDialog(null)}>
        <DialogTitle fontWeight={700}>Block Your Own IP?</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mt: 1 }}>
            You are about to GLOBALLY block your own IP address ({confirmDialog?.ipAddress}). 
            This will immediately lock you out of the ENTIRE platform.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmDialog(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleConfirmOwnIP}>
            Block Anyway
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={attemptsDialog?.open || false} onClose={() => setAttemptsDialog(null)} maxWidth="md" fullWidth>
        <DialogTitle fontWeight={700}>
          Blocked Attempts for {attemptsDialog?.ipAddress}
        </DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
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
                      <TableCell><code>{attempt.path || "-"}</code></TableCell>
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
        <DialogActions>
          <Button onClick={() => setAttemptsDialog(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
