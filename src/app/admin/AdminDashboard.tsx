"use client";

import React from "react";
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Avatar,
  Badge,
  AppBar,
  Toolbar,
} from "@mui/material";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AuthSession } from "@/lib/auth-types";
import { createClient } from "@/lib/supabase/client";

const SIDEBAR_WIDTH = 260;

interface AdminDashboardProps {
  session: AuthSession;
  pendingCount: number;
  children: React.ReactNode;
}

export default function AdminDashboard({ session, pendingCount, children }: AdminDashboardProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const navItems = [
    { label: "Dashboard", href: "/admin", icon: "dashboard" },
    { label: "Organizations", href: "/admin/organizations", icon: "business", badge: pendingCount },
    { label: "Users", href: "/admin/users", icon: "people" },
    { label: "IP Blocking", href: "/admin/ip-blocking", icon: "shield" },
  ];

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <Box
        component="aside"
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          borderRight: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box sx={{ p: 3, borderBottom: "1px solid", borderColor: "divider" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ bgcolor: "error.main", p: 1, borderRadius: 1.5 }}>
              <span className="material-symbols-outlined" style={{ color: "white" }}>
                admin_panel_settings
              </span>
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={800}>
                Platform Admin
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Super Administrator
              </Typography>
            </Box>
          </Box>
        </Box>

        <List sx={{ px: 1.5, py: 2, flex: 1 }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <ListItem key={item.label} disablePadding sx={{ mb: 0.5 }}>
                <Link href={item.href} style={{ textDecoration: "none", width: "100%" }}>
                  <ListItemButton
                    sx={{
                      borderRadius: 2,
                      py: 1.2,
                      bgcolor: isActive ? "error.main" : "transparent",
                      color: isActive ? "white" : "text.primary",
                      "&:hover": {
                        bgcolor: isActive ? "error.dark" : "action.hover",
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40, color: "inherit" }}>
                      {item.badge ? (
                        <Badge badgeContent={item.badge} color="warning">
                          <span className="material-symbols-outlined">{item.icon}</span>
                        </Badge>
                      ) : (
                        <span className="material-symbols-outlined">{item.icon}</span>
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{ fontWeight: isActive ? 600 : 500 }}
                    />
                  </ListItemButton>
                </Link>
              </ListItem>
            );
          })}
        </List>

        <Box sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <Avatar sx={{ width: 36, height: 36 }}>
              {session.user.name?.charAt(0) || session.user.email.charAt(0)}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" fontWeight={600} noWrap>
                {session.user.name || "Admin"}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {session.user.email}
              </Typography>
            </Box>
          </Box>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              py: 1,
              bgcolor: "action.hover",
              "&:hover": { bgcolor: "error.light", color: "white" },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <span className="material-symbols-outlined">logout</span>
            </ListItemIcon>
            <ListItemText primary="Sign Out" primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
        </Box>
      </Box>

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: "background.paper",
            borderBottom: "1px solid",
            borderColor: "divider",
            color: "text.primary",
          }}
        >
          <Toolbar sx={{ height: 64 }}>
            <Typography variant="h6" fontWeight={700}>
              OffboardHQ Admin
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Link href="/app" style={{ textDecoration: "none" }}>
              <Typography
                variant="body2"
                sx={{ color: "primary.main", fontWeight: 600, "&:hover": { textDecoration: "underline" } }}
              >
                Back to App
              </Typography>
            </Link>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flex: 1, p: 4 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
