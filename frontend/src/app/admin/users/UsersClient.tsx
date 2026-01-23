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
  Button,
  alpha,
  useTheme,
  Grid,
} from "@mui/material";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { stitchTokens } from "@/theme/tokens";

const t = stitchTokens;

type User = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  isPlatformAdmin: boolean;
  createdAt: string;
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
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [search, setSearch] = useState("");
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; user: User } | null>(null);

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(search.toLowerCase()) ||
    user.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box>
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em", mb: 1 }}>
          Platform Administrators
        </Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 600 }}>
          Global administrators with platform-wide access. Manage organizational users and employees directly within their respective organization boundary.
        </Typography>
      </Box>

      <Grid container spacing={4} sx={{ mb: 6 }}>
        <Grid item xs={12} md={7}>
          <Card variant="outlined" sx={{ borderRadius: 3, height: "100%" }}>
            <Box sx={{ p: 2.5, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography sx={{ fontWeight: 700, fontSize: t.typography.fontSize.base }}>
                Global Admin Directory
              </Typography>
              <TextField
                placeholder="Search..."
                size="small"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ width: 200 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>search</span>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, fontSize: t.typography.fontSize.xs, color: "text.secondary", textTransform: "uppercase" }}>Admin</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: t.typography.fontSize.xs, color: "text.secondary", textTransform: "uppercase" }}>Joined</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: t.typography.fontSize.xs, color: "text.secondary", textTransform: "uppercase" }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Avatar 
                            src={user.avatarUrl || undefined} 
                            sx={{ width: 32, height: 32, fontSize: "0.875rem", bgcolor: isDark ? "#27272a" : "#f4f4f5", color: "text.primary" }}
                          >
                            {user.name?.charAt(0) || user.email.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontWeight: 600, fontSize: t.typography.fontSize.sm }}>
                              {user.name || "No name"}
                            </Typography>
                            <Typography sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                              {user.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: t.typography.fontSize.sm, color: "text.secondary" }}>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={(e) => setMenuAnchor({ el: e.currentTarget, user })}>
                          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>more_vert</span>
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card 
            variant="outlined" 
            sx={{ 
              borderRadius: 3, 
              p: 4, 
              height: "100%", 
              display: "flex", 
              flexDirection: "column", 
              justifyContent: "center",
              bgcolor: isDark ? alpha("#6366f1", 0.03) : alpha("#6366f1", 0.02),
              border: "1px solid",
              borderColor: alpha("#6366f1", 0.2),
              position: "relative",
              overflow: "hidden"
            }}
          >
            <Box sx={{ position: "absolute", top: -20, right: -20, opacity: 0.05 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 160, color: "#6366f1" }}>corporate_fare</span>
            </Box>
            
            <Box sx={{ position: "relative", zIndex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, color: "#6366f1" }}>
                Looking for Org Users?
              </Typography>
              <Typography sx={{ color: "text.secondary", mb: 4, fontSize: t.typography.fontSize.sm }}>
                OffboardHQ follows an organization-centric model. Users exist within organization boundaries. To manage Admins, HR, IT, or view Employee aggregates, please browse via the Organizations section.
              </Typography>
              <Button
                component={Link}
                href="/admin/organizations"
                variant="contained"
                startIcon={<span className="material-symbols-outlined">corporate_fare</span>}
                sx={{ 
                  borderRadius: 2,
                  px: 3,
                  py: 1,
                  fontWeight: 700,
                  bgcolor: "#6366f1",
                  "&:hover": { bgcolor: alpha("#6366f1", 0.9) }
                }}
              >
                Browse Organizations
              </Button>
            </Box>
          </Card>
        </Grid>
      </Grid>

      <Box 
        sx={{ 
          p: 3, 
          borderRadius: 3, 
          bgcolor: isDark ? alpha("#fff", 0.02) : alpha("#000", 0.01),
          border: "1px dashed",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          gap: 2
        }}
      >
        <span className="material-symbols-outlined" style={{ color: "text.secondary" }}>security</span>
        <Typography sx={{ fontSize: t.typography.fontSize.sm, color: "text.secondary", fontWeight: 500 }}>
          <strong>Note on Data Privacy:</strong> Platform Admins have metadata-only visibility. Individual Employee records and PII (Personal Identifiable Information) are never exposed in platform-wide views.
        </Typography>
      </Box>

      <Menu anchorEl={menuAnchor?.el} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => {
          if (menuAnchor?.user) {
            router.push(`/admin/users/${menuAnchor.user.id}`); // Corrected path to use user details route
          }
          setMenuAnchor(null);
        }}>
          <span className="material-symbols-outlined" style={{ marginRight: 8, fontSize: 20 }}>visibility</span>
          View Profile
        </MenuItem>
      </Menu>
    </Box>
  );
}
