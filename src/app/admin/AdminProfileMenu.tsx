"use client";

import React, { useState } from "react";
import {
  Box,
  Avatar,
  Typography,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
  Chip,
  alpha,
  useTheme,
  CircularProgress,
} from "@mui/material";
import { AuthSession } from "@/lib/auth-types";
import { createClient, clearRememberMe } from "@/lib/supabase/client";
import Link from "next/link";

interface AdminProfileMenuProps {
  session: AuthSession;
}

export default function AdminProfileMenu({ session }: AdminProfileMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
      try {
        setLoading(true);
        
        try {
          await fetch("/api/platform/auth/sign-out", { method: "POST" });
        } catch (error) {
          console.error("[Auth] Failed to sign out from server:", error);
          // Continue with client-side sign-out even if server sign-out fails
        }

        clearRememberMe();
        const supabase = createClient();
        await supabase.auth.signOut();

        localStorage.clear();
        window.location.href = "/login";
      } catch (error) {
        console.error("[Auth] Sign out failed:", error);
        setLoading(false);
      }
    };

  const user = session.user;
  const env = process.env.NODE_ENV;

  return (
    <>
      <Box
        onClick={handleOpen}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          p: 0.75,
          pr: 1.5,
          borderRadius: 2,
          cursor: "pointer",
          transition: "all 150ms ease",
          border: "1px solid",
          borderColor: isDark ? "transparent" : "#e5e7eb",
          "&:hover": {
            bgcolor: isDark ? alpha("#ffffff", 0.05) : "#f4f4f5",
            borderColor: isDark ? alpha("#ffffff", 0.1) : "#d1d5db",
          },
        }}
      >
        <Avatar
          src={user.avatarUrl || undefined}
          sx={{
            width: 32,
            height: 32,
            fontSize: "0.875rem",
            bgcolor: "#6366f1",
            fontWeight: 600,
          }}
        >
          {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ display: { xs: "none", sm: "block" } }}>
          <Typography
            sx={{
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: isDark ? "#fafafa" : "#0f172a",
              lineHeight: 1.2,
            }}
          >
            {user.name || "Administrator"}
          </Typography>
          <Typography
            sx={{
              fontSize: "0.6875rem",
              fontWeight: 500,
              color: isDark ? "#71717a" : "#64748b",
            }}
          >
            Platform Admin
          </Typography>
        </Box>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        PaperProps={{
          elevation: 0,
          sx: {
            width: 320,
            mt: 1.5,
            borderRadius: 3,
            border: "1px solid",
            borderColor: isDark ? "#18181b" : "#e5e7eb",
            bgcolor: isDark ? "#09090b" : "#ffffff",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            overflow: "visible",
            "&:before": {
              content: '""',
              display: "block",
              position: "absolute",
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: isDark ? "#09090b" : "#ffffff",
              transform: "translateY(-50%) rotate(45deg)",
              zIndex: 0,
              borderLeft: "1px solid",
              borderTop: "1px solid",
              borderColor: isDark ? "#18181b" : "#e5e7eb",
            },
          },
        }}
      >
        <Box sx={{ px: 2.5, py: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1.5 }}>
            <Avatar
              src={user.avatarUrl || undefined}
              sx={{ width: 48, height: 48, bgcolor: "#6366f1" }}
            >
              {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: "0.9375rem" }}>
                {user.name || "Admin"}
              </Typography>
              <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                {user.email}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            <Chip
              label="Platform Admin"
              size="small"
              sx={{
                height: 20,
                fontSize: "0.625rem",
                fontWeight: 700,
                bgcolor: alpha("#6366f1", 0.1),
                color: "#6366f1",
                border: "1px solid",
                borderColor: alpha("#6366f1", 0.2),
              }}
            />
            <Chip
              label={env === "development" ? "DEV-ENV" : "PROD-ENV"}
              size="small"
              sx={{
                height: 20,
                fontSize: "0.625rem",
                fontWeight: 700,
                bgcolor: alpha("#71717a", 0.1),
                color: "#71717a",
                border: "1px solid",
                borderColor: alpha("#71717a", 0.2),
              }}
            />
          </Box>
        </Box>

        <Divider sx={{ my: 1, borderColor: isDark ? "#18181b" : "#f4f4f5" }} />

        <Box sx={{ py: 1 }}>
          <Link href="/admin/profile" style={{ textDecoration: "none", color: "inherit" }}>
            <MenuItem onClick={handleClose} sx={{ py: 1.25, px: 2.5 }}>
              <ListItemIcon>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>account_circle</span>
              </ListItemIcon>
              <Typography sx={{ fontSize: "0.875rem", fontWeight: 500 }}>Profile & Security</Typography>
            </MenuItem>
          </Link>

          <Link href="/admin/audit" style={{ textDecoration: "none", color: "inherit" }}>
            <MenuItem onClick={handleClose} sx={{ py: 1.25, px: 2.5 }}>
              <ListItemIcon>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>history</span>
              </ListItemIcon>
              <Typography sx={{ fontSize: "0.875rem", fontWeight: 500 }}>Platform Audit Log</Typography>
            </MenuItem>
          </Link>
          
            <Link href="/admin/org-view/select" style={{ textDecoration: "none", color: "inherit" }}>
              <MenuItem onClick={handleClose} sx={{ py: 1.25, px: 2.5 }}>
                <ListItemIcon>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>switch_account</span>
                </ListItemIcon>
                <Typography sx={{ fontSize: "0.875rem", fontWeight: 500 }}>Switch to Org View</Typography>
              </MenuItem>
            </Link>
        </Box>

        <Divider sx={{ my: 1, borderColor: isDark ? "#18181b" : "#f4f4f5" }} />

        <Box sx={{ p: 1 }}>
          <MenuItem
            onClick={handleSignOut}
            disabled={loading}
            sx={{
              py: 1.25,
              px: 1.5,
              borderRadius: 2,
              color: "#ef4444",
              "&:hover": { bgcolor: alpha("#ef4444", 0.08) },
            }}
          >
            <ListItemIcon sx={{ color: "inherit" }}>
              {loading ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
              )}
            </ListItemIcon>
            <Typography sx={{ fontSize: "0.875rem", fontWeight: 600 }}>Sign Out</Typography>
          </MenuItem>
        </Box>

        <Box sx={{ px: 2.5, py: 1.5, bgcolor: isDark ? alpha("#ffffff", 0.02) : "#fafafa", borderTop: "1px solid", borderColor: isDark ? "#18181b" : "#f4f4f5" }}>
          <Typography sx={{ fontSize: "0.6875rem", color: "text.secondary", fontWeight: 500 }}>
            Session Active: {new Date().toLocaleDateString()}
          </Typography>
          <Typography sx={{ fontSize: "0.6875rem", color: "text.secondary", fontWeight: 500 }}>
            MFA Status: <span style={{ color: "#22c55e" }}>Enforced</span>
          </Typography>
        </Box>
      </Menu>
    </>
  );
}
