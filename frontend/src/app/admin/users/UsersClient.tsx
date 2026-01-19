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
  Avatar,
  TextField,
  InputAdornment,
  IconButton,
  Menu,
  MenuItem,
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
    organization: { id: string; name: string; status: string };
  }[];
};

interface UsersClientProps {
  users: User[];
}

export default function UsersClient({ users }: UsersClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; user: User } | null>(null);

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(search.toLowerCase()) ||
    user.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} gutterBottom>
        Users
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        All registered users across the platform
      </Typography>

      <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
        <Box sx={{ p: 2 }}>
          <TextField
            placeholder="Search users..."
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>search</span>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: 700, color: "text.secondary", fontSize: 12, textTransform: "uppercase" } }}>
                <TableCell>User</TableCell>
                <TableCell>Organizations</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Avatar src={user.avatarUrl || undefined} sx={{ bgcolor: "primary.main" }}>
                        {user.name?.charAt(0) || user.email.charAt(0)}
                      </Avatar>
                      <Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography fontWeight={600}>{user.name || "No name"}</Typography>
                          {user.isPlatformAdmin && (
                            <Chip label="ADMIN" size="small" color="error" sx={{ height: 18, fontSize: 10 }} />
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {user.memberships.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">No organizations</Typography>
                      ) : (
                        user.memberships.slice(0, 3).map((m) => (
                          <Chip
                            key={m.id}
                            label={m.organization.name}
                            size="small"
                            variant="outlined"
                            color={m.organization.status === "ACTIVE" ? "success" : "default"}
                          />
                        ))
                      )}
                      {user.memberships.length > 3 && (
                        <Chip label={`+${user.memberships.length - 3}`} size="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.memberships.some((m) => m.status === "ACTIVE") ? "Active" : "Inactive"}
                      size="small"
                      color={user.memberships.some((m) => m.status === "ACTIVE") ? "success" : "default"}
                    />
                  </TableCell>
                  <TableCell>{new Date(user.createdAt).toISOString().split("T")[0]}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={(e) => setMenuAnchor({ el: e.currentTarget, user })}>
                      <span className="material-symbols-outlined">more_vert</span>
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Menu anchorEl={menuAnchor?.el} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => {
          if (menuAnchor?.user) {
            router.push(`/admin/users/${menuAnchor.user.id}`);
          }
          setMenuAnchor(null);
        }}>
          <span className="material-symbols-outlined" style={{ marginRight: 8 }}>visibility</span>
          View Details
        </MenuItem>
        {!menuAnchor?.user.isPlatformAdmin && (
          <MenuItem onClick={() => {
            if (menuAnchor?.user) {
              router.push(`/admin/users/${menuAnchor.user.id}`);
            }
            setMenuAnchor(null);
          }}>
            <span className="material-symbols-outlined" style={{ marginRight: 8, color: "#ef4444" }}>admin_panel_settings</span>
            Make Platform Admin
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
}
