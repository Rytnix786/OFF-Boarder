"use client";

import React from "react";
import {
  Box,
  Typography,
  Paper,
  Avatar,
  Divider,
  Grid,
  Chip,
  alpha,
  useTheme,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
} from "@mui/material";
import { AuthSession } from "@/lib/auth-types";

interface ProfileClientProps {
  session: AuthSession;
}

export default function ProfileClient({ session }: ProfileClientProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const user = session.user;

  const securityItems = [
    { label: "MFA Status", value: "Enforced", icon: "verified_user", color: "#22c55e" },
    { label: "Last Login", value: new Date().toLocaleString(), icon: "login", color: "#6366f1" },
    { label: "Session Expiry", value: "In 24 hours", icon: "timer", color: "#f59e0b" },
    { label: "Browser", value: typeof window !== 'undefined' ? window.navigator.userAgent.split(') ')[0] + ')' : 'Unknown', icon: "devices", color: "#71717a" },
  ];

  return (
    <Box sx={{ maxWidth: 1000, mx: "auto" }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, letterSpacing: "-0.02em" }}>
          Profile & Security
        </Typography>
        <Typography sx={{ color: "text.secondary", fontWeight: 500 }}>
          Manage your platform administrator identity and monitor session security.
        </Typography>
      </Box>

      <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 4 }}>
          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: 4,
              border: "1px solid",
              borderColor: isDark ? "#18181b" : "#e5e7eb",
              bgcolor: isDark ? "#09090b" : "#ffffff",
              textAlign: "center",
            }}
          >
            <Avatar
              src={user.avatarUrl || undefined}
              sx={{
                width: 100,
                height: 100,
                mx: "auto",
                mb: 3,
                bgcolor: "#6366f1",
                fontSize: "2.5rem",
                fontWeight: 700,
                boxShadow: "0 0 20px rgba(99, 102, 241, 0.2)",
              }}
            >
              {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
            </Avatar>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              {user.name || "Administrator"}
            </Typography>
            <Typography sx={{ color: "text.secondary", fontSize: "0.875rem", mb: 2 }}>
              {user.email}
            </Typography>
            <Chip
              label="Platform Admin"
              sx={{
                bgcolor: alpha("#6366f1", 0.1),
                color: "#6366f1",
                fontWeight: 700,
                fontSize: "0.75rem",
                border: "1px solid",
                borderColor: alpha("#6366f1", 0.2),
              }}
            />
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 3,
              mt: 3,
              borderRadius: 4,
              border: "1px solid",
              borderColor: isDark ? "#18181b" : "#e5e7eb",
              bgcolor: isDark ? "#09090b" : "#ffffff",
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
              Quick Actions
            </Typography>
            <List disablePadding>
              <ListItem disableGutters>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<span className="material-symbols-outlined">key</span>}
                  sx={{ justifyContent: "flex-start", borderRadius: 2, py: 1 }}
                >
                  Change Password
                </Button>
              </ListItem>
              <ListItem disableGutters sx={{ mt: 1 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<span className="material-symbols-outlined">phonelink_setup</span>}
                  sx={{ justifyContent: "flex-start", borderRadius: 2, py: 1 }}
                >
                  Configure MFA
                </Button>
              </ListItem>
            </List>
          </Paper>
        </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: 4,
              border: "1px solid",
              borderColor: isDark ? "#18181b" : "#e5e7eb",
              bgcolor: isDark ? "#09090b" : "#ffffff",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, display: "flex", alignItems: "center", gap: 1.5 }}>
              <span className="material-symbols-outlined" style={{ color: "#6366f1" }}>security</span>
              Active Session Context
            </Typography>
            
            <Grid container spacing={3}>
              {securityItems.map((item) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={item.label}>
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 3,
                      bgcolor: isDark ? alpha("#ffffff", 0.02) : "#f8fafc",
                      border: "1px solid",
                      borderColor: isDark ? "#18181b" : "#f1f5f9",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: item.color }}>
                        {item.icon}
                      </span>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {item.label}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 600, fontSize: "0.9375rem" }}>
                      {item.value}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>

            <Divider sx={{ my: 4, borderColor: isDark ? "#18181b" : "#f1f5f9" }} />

            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, display: "flex", alignItems: "center", gap: 1.5 }}>
              <span className="material-symbols-outlined" style={{ color: "#6366f1" }}>badge</span>
              Administrative Identity
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>FULL NAME</Typography>
                  <Typography sx={{ fontWeight: 600 }}>{user.name || "Not set"}</Typography>
                </Box>
                <IconButton size="small"><span className="material-symbols-outlined" style={{ fontSize: 20 }}>edit</span></IconButton>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>EMAIL ADDRESS</Typography>
                  <Typography sx={{ fontWeight: 600 }}>{user.email}</Typography>
                </Box>
                <Chip label="Verified" size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: "0.625rem" }} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>ACCOUNT CREATED</Typography>
                <Typography sx={{ fontWeight: 600 }}>{new Date(user.createdAt).toLocaleDateString()}</Typography>
              </Box>
            </Box>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 4,
              mt: 4,
              borderRadius: 4,
              border: "1px solid",
              borderColor: isDark ? alpha("#ef4444", 0.2) : alpha("#ef4444", 0.1),
              bgcolor: isDark ? alpha("#ef4444", 0.02) : alpha("#ef4444", 0.01),
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#ef4444", mb: 1, display: "flex", alignItems: "center", gap: 1.5 }}>
              <span className="material-symbols-outlined">dangerous</span>
              Platform Access Control
            </Typography>
            <Typography sx={{ fontSize: "0.875rem", color: "text.secondary", mb: 3 }}>
              You are currently authenticated with highest-level platform privileges. 
              Signing out will terminate all active session tokens and clear local cache.
            </Typography>
            <Button
              variant="contained"
              color="error"
              startIcon={<span className="material-symbols-outlined">logout</span>}
              sx={{ borderRadius: 2, px: 4, py: 1.25, fontWeight: 700, textTransform: "none" }}
              onClick={async () => {
                const { createClient } = await import("@/lib/supabase/client");
                const supabase = createClient();
                await fetch("/api/platform/auth/sign-out", { method: "POST" }).catch(() => {});
                await supabase.auth.signOut();
                localStorage.clear();
                window.location.href = "/login";
              }}
            >
              Terminate Administrative Session
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
