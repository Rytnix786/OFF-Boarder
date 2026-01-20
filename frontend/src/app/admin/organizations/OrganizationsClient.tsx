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
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Tabs,
  Tab,
  alpha,
} from "@mui/material";
import { approveOrganization, rejectOrganization, suspendOrganization, reactivateOrganization } from "@/lib/actions/organization";

type Organization = {
  id: string;
  name: string;
  slug: string;
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED";
  createdAt: Date;
  rejectionReason: string | null;
  memberships: { user: { id: string; name: string | null; email: string } }[];
  _count: { employees: number; memberships: number; offboardings: number };
};

interface OrganizationsClientProps {
  organizations: Organization[];
  initialStatus?: string;
  initialTab?: string;
}

export default function OrganizationsClient({ organizations, initialStatus, initialTab }: OrganizationsClientProps) {
  const getInitialTab = () => {
    if (initialStatus === "PENDING") return 0;
    if (initialStatus === "ACTIVE") return 1;
    if (initialStatus === "SUSPENDED" || initialStatus === "REJECTED") return 2;
    if (initialTab === "offboardings") return 1;
    return 0;
  };

  const [tab, setTab] = useState(getInitialTab());
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; org: Organization } | null>(null);
  const [rejectDialog, setRejectDialog] = useState<Organization | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);

  const filteredOrgs = organizations.filter((org) => {
    if (tab === 0) return org.status === "PENDING";
    if (tab === 1) return org.status === "ACTIVE";
    if (tab === 2) return org.status === "SUSPENDED" || org.status === "REJECTED";
    return true;
  });

  const pendingCount = organizations.filter((o) => o.status === "PENDING").length;
  const activeCount = organizations.filter((o) => o.status === "ACTIVE").length;
  const inactiveCount = organizations.filter((o) => o.status === "SUSPENDED" || o.status === "REJECTED").length;

  const handleApprove = async (orgId: string) => {
    setLoading(true);
    await approveOrganization(orgId);
    setMenuAnchor(null);
    setLoading(false);
  };

  const handleReject = async () => {
    if (!rejectDialog) return;
    setLoading(true);
    await rejectOrganization(rejectDialog.id, rejectReason);
    setRejectDialog(null);
    setRejectReason("");
    setLoading(false);
  };

  const handleReactivate = async (orgId: string) => {
    setLoading(true);
    await reactivateOrganization(orgId);
    setMenuAnchor(null);
    setLoading(false);
  };

  const handleSuspend = async (orgId: string) => {
    setLoading(true);
    await suspendOrganization(orgId);
    setMenuAnchor(null);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "success";
      case "PENDING": return "warning";
      case "SUSPENDED": return "error";
      case "REJECTED": return "default";
      default: return "default";
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} gutterBottom>
        Organizations
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Review and manage organization registrations
      </Typography>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ borderBottom: "1px solid", borderColor: "divider", px: 2 }}
        >
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                Pending
                {pendingCount > 0 && (
                  <Chip label={pendingCount} size="small" color="warning" sx={{ height: 20, fontSize: 11 }} />
                )}
              </Box>
            }
          />
            <Tab label={`Active (${activeCount})`} />
            <Tab label={`Inactive (${inactiveCount})`} />
        </Tabs>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: 700, color: "text.secondary", fontSize: 12, textTransform: "uppercase" } }}>
                <TableCell>Organization</TableCell>
                <TableCell>Owner</TableCell>
                <TableCell align="center">Members</TableCell>
                <TableCell align="center">Employees</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredOrgs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ py: 8, textAlign: "center" }}>
                    <Typography color="text.secondary">No organizations in this category</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrgs.map((org) => {
                  const owner = org.memberships[0]?.user;
                  return (
                    <TableRow key={org.id} hover>
                      <TableCell>
                        <Typography fontWeight={600}>{org.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {org.slug}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {owner ? (
                          <>
                            <Typography variant="body2">{owner.name || "No name"}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {owner.email}
                            </Typography>
                          </>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No owner
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">{org._count.memberships}</TableCell>
                      <TableCell align="center">{org._count.employees}</TableCell>
                      <TableCell>
                        <Chip
                          label={org.status}
                          size="small"
                          color={getStatusColor(org.status) as any}
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>
<Typography variant="body2">
                          {new Date(org.createdAt).toISOString().split("T")[0]}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(e) => setMenuAnchor({ el: e.currentTarget, org })}
                        >
                          <span className="material-symbols-outlined">more_vert</span>
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Menu
        anchorEl={menuAnchor?.el}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        {menuAnchor?.org.status === "PENDING" && [
          <MenuItem key="approve" onClick={() => handleApprove(menuAnchor.org.id)} disabled={loading}>
            <span className="material-symbols-outlined" style={{ marginRight: 8, color: "#22c55e" }}>
              check_circle
            </span>
            Approve
          </MenuItem>,
          <MenuItem
            key="reject"
            onClick={() => {
              setRejectDialog(menuAnchor.org);
              setMenuAnchor(null);
            }}
            disabled={loading}
          >
            <span className="material-symbols-outlined" style={{ marginRight: 8, color: "#ef4444" }}>
              cancel
            </span>
            Reject
          </MenuItem>,
        ]}
        {menuAnchor?.org.status === "ACTIVE" && (
          <MenuItem onClick={() => handleSuspend(menuAnchor.org.id)} disabled={loading}>
            <span className="material-symbols-outlined" style={{ marginRight: 8, color: "#ef4444" }}>
              pause_circle
            </span>
            Suspend
          </MenuItem>
        )}
        {menuAnchor?.org.status === "SUSPENDED" && (
          <MenuItem onClick={() => handleReactivate(menuAnchor.org.id)} disabled={loading}>
            <span className="material-symbols-outlined" style={{ marginRight: 8, color: "#22c55e" }}>
              play_circle
            </span>
            Reactivate
          </MenuItem>
        )}
        {menuAnchor?.org.status === "REJECTED" && (
          <MenuItem onClick={() => handleReactivate(menuAnchor.org.id)} disabled={loading}>
            <span className="material-symbols-outlined" style={{ marginRight: 8, color: "#22c55e" }}>
              play_circle
            </span>
            Reactivate
          </MenuItem>
        )}
      </Menu>

      <Dialog open={Boolean(rejectDialog)} onClose={() => setRejectDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Reject Organization</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Please provide a reason for rejecting "{rejectDialog?.name}". This will be shown to the organization owner.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Rejection Reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g., Incomplete business information, suspicious activity..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRejectDialog(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleReject}
            disabled={loading || !rejectReason.trim()}
          >
            Reject Organization
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
