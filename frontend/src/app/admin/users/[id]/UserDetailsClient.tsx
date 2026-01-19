"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  Avatar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  isPlatformAdmin: boolean;
  createdAt: Date;
  memberships: {
    id: string;
    systemRole: string;
    status: string;
    organization: { id: string; name: string; slug: string; status: string };
  }[];
};

interface UserDetailsClientProps {
  user: User;
}

export default function UserDetailsClient({ user }: UserDetailsClientProps) {
  const router = useRouter();
  const [adminDialog, setAdminDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleToggleAdmin = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/platform/users/${user.id}/toggle-admin`, {
        method: "POST",
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setLoading(false);
      setAdminDialog(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
        <IconButton onClick={() => router.push("/admin/users")}>
          <span className="material-symbols-outlined">arrow_back</span>
        </IconButton>
        <Typography variant="h4" fontWeight={800}>
          User Details
        </Typography>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 2fr" }, gap: 3 }}>
        <Card variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <Avatar
              src={user.avatarUrl || undefined}
              sx={{ width: 80, height: 80, fontSize: 32, bgcolor: "primary.main" }}
            >
              {user.name?.charAt(0) || user.email.charAt(0)}
            </Avatar>
            <Box sx={{ textAlign: "center" }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                <Typography variant="h6" fontWeight={700}>
                  {user.name || "No name"}
                </Typography>
                {user.isPlatformAdmin && (
                  <Chip label="ADMIN" size="small" color="error" sx={{ height: 20, fontSize: 10 }} />
                )}
              </Box>
              <Typography color="text.secondary">{user.email}</Typography>
            </Box>
          </Box>

          <Box sx={{ mt: 3, pt: 3, borderTop: "1px solid", borderColor: "divider" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
              <Typography color="text.secondary">User ID</Typography>
              <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: 12 }}>
                {user.id.slice(0, 8)}...
              </Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
              <Typography color="text.secondary">Joined</Typography>
              <Typography variant="body2">
                {new Date(user.createdAt).toLocaleDateString()}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
              <Typography color="text.secondary">Status</Typography>
              <Chip
                label={user.memberships.some((m) => m.status === "ACTIVE") ? "Active" : "Inactive"}
                size="small"
                color={user.memberships.some((m) => m.status === "ACTIVE") ? "success" : "default"}
              />
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography color="text.secondary">Organizations</Typography>
              <Typography variant="body2">{user.memberships.length}</Typography>
            </Box>
          </Box>

          <Box sx={{ mt: 3, pt: 3, borderTop: "1px solid", borderColor: "divider" }}>
            <Button
              fullWidth
              variant={user.isPlatformAdmin ? "outlined" : "contained"}
              color={user.isPlatformAdmin ? "error" : "primary"}
              onClick={() => setAdminDialog(true)}
              startIcon={<span className="material-symbols-outlined">admin_panel_settings</span>}
            >
              {user.isPlatformAdmin ? "Remove Admin" : "Make Admin"}
            </Button>
          </Box>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="h6" fontWeight={700}>
              Organization Memberships
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ "& th": { fontWeight: 700, color: "text.secondary", fontSize: 12, textTransform: "uppercase" } }}>
                  <TableCell>Organization</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Membership Status</TableCell>
                  <TableCell>Org Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {user.memberships.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ py: 4, textAlign: "center" }}>
                      <Typography color="text.secondary">No organization memberships</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  user.memberships.map((m) => (
                    <TableRow key={m.id} hover>
                      <TableCell>
                        <Typography fontWeight={600}>{m.organization.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {m.organization.slug}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={m.systemRole}
                          size="small"
                          color={m.systemRole === "OWNER" ? "primary" : "default"}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={m.status}
                          size="small"
                          color={m.status === "ACTIVE" ? "success" : "default"}
                        />
                      </TableCell>
                        <TableCell>
                          <Chip
                            label={m.organization.status}
                            size="small"
                            color={
                              m.organization.status === "ACTIVE" ? "success" 
                              : m.organization.status === "PENDING" ? "warning" 
                              : m.organization.status === "REJECTED" ? "error"
                              : m.organization.status === "SUSPENDED" ? "error"
                              : "default"
                            }
                          />
                        </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Box>

      <Dialog open={adminDialog} onClose={() => setAdminDialog(false)}>
        <DialogTitle fontWeight={700}>
          {user.isPlatformAdmin ? "Remove Admin Access" : "Grant Admin Access"}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {user.isPlatformAdmin
              ? `Are you sure you want to remove platform admin access from ${user.name || user.email}?`
              : `Are you sure you want to make ${user.name || user.email} a platform admin? They will have full access to all platform settings.`}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAdminDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color={user.isPlatformAdmin ? "error" : "primary"}
            onClick={handleToggleAdmin}
            disabled={loading}
          >
            {user.isPlatformAdmin ? "Remove Admin" : "Make Admin"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
