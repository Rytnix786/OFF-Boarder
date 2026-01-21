"use client";

import React, { useState, useContext, useEffect } from "react";
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Avatar,
  Divider,
  Menu,
  MenuItem,
  useTheme,
  AppBar,
  Toolbar,
  IconButton,
  Chip,
  Badge,
  alpha,
} from "@mui/material";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ColorModeContext } from "@/theme/ThemeRegistry";
import { createClient, clearRememberMe } from "@/lib/supabase/client";
import type { EmployeePortalSession } from "@/lib/employee-auth.server";
import { getUnreadNotificationCount } from "@/lib/actions/employee-notifications";

const SIDEBAR_WIDTH = 280;

interface EmployeePortalShellProps {
  session: EmployeePortalSession;
  children: React.ReactNode;
}

const navItems = [
  { label: "Dashboard", icon: "dashboard", href: "/app/employee" },
  { label: "My Tasks", icon: "task_alt", href: "/app/employee/tasks" },
  { label: "Assets to Return", icon: "devices", href: "/app/employee/assets" },
  { label: "Attestation", icon: "verified_user", href: "/app/employee/attestation" },
  { label: "Notifications", icon: "notifications", href: "/app/employee/notifications", alwaysEnabled: true },
  { label: "My Profile", icon: "person", href: "/app/employee/profile", alwaysEnabled: true },
];

export default function EmployeePortalShell({ session, children }: EmployeePortalShellProps) {
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);
  const pathname = usePathname();
  const router = useRouter();
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const count = await getUnreadNotificationCount();
        setUnreadCount(count);
      } catch (error) {
        console.error("Failed to fetch unread count:", error);
      }
    };
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [pathname]);

  const handleSignOut = async () => {
      clearRememberMe();
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <Box
        component="aside"
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          height: "100vh",
          position: "sticky",
          top: 0,
          borderRight: "1px solid",
          borderColor: "divider",
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.paper",
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: "primary.main",
                fontWeight: 700,
              }}
            >
              {session.organizationName?.charAt(0).toUpperCase() || "O"}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                {session.organizationName || "Organization"}
              </Typography>
              <Chip
                size="small"
                label="Employee Portal"
                sx={{
                  height: 20,
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  bgcolor: theme.palette.info.main,
                  color: "white",
                  mt: 0.5,
                }}
              />
            </Box>
          </Box>
        </Box>

        <Divider />

        <List sx={{ px: 1.5, py: 2, flex: 1, overflow: "auto" }}>
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/app/employee" && pathname.startsWith(item.href));
              const isDisabled = !session.hasActiveOffboarding && item.href !== "/app/employee" && !item.alwaysEnabled;
              const isNotification = item.label === "Notifications";
              
              return (
                <ListItem key={item.label} disablePadding sx={{ mb: 0.5 }}>
                  {isDisabled ? (
                    <ListItemButton
                      disabled
                      sx={{
                        borderRadius: 2,
                        py: 1.2,
                        opacity: 0.5,
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40, color: "text.disabled" }}>
                        <span className="material-symbols-outlined">{item.icon}</span>
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          fontWeight: 500,
                          fontSize: "0.9rem",
                          color: "text.disabled",
                        }}
                      />
                    </ListItemButton>
                  ) : (
                    <Link href={item.href} passHref style={{ textDecoration: "none", width: "100%", color: "inherit" }}>
                      <ListItemButton
                        sx={{
                          borderRadius: 2,
                          py: 1.2,
                          bgcolor: isActive ? "primary.main" : "transparent",
                          color: isActive ? "white" : "text.primary",
                          "&:hover": {
                            bgcolor: isActive ? "primary.dark" : "action.hover",
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 40, color: "inherit" }}>
                          {isNotification && unreadCount > 0 ? (
                            <Badge badgeContent={unreadCount} color="error" max={99}>
                              <span className="material-symbols-outlined">{item.icon}</span>
                            </Badge>
                          ) : (
                            <span className="material-symbols-outlined">{item.icon}</span>
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{
                            fontWeight: isActive ? 600 : 500,
                            fontSize: "0.9rem",
                          }}
                        />
                      </ListItemButton>
                    </Link>
                  )}
                </ListItem>
              );
            })}

          </List>

        <Divider />
        <Box sx={{ p: 2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              p: 1,
              borderRadius: 2,
              cursor: "pointer",
              "&:hover": { bgcolor: "action.hover" },
            }}
            onClick={(e) => setUserMenuAnchor(e.currentTarget)}
          >
            <Avatar sx={{ width: 36, height: 36, bgcolor: "secondary.main" }}>
              {session.employee.firstName?.charAt(0) || "E"}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" noWrap fontWeight={600}>
                {session.employee.firstName} {session.employee.lastName}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {session.employee.email}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Menu
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={() => setUserMenuAnchor(null)}
          PaperProps={{ sx: { width: 200, mt: 1 } }}
        >
          <MenuItem onClick={handleSignOut} sx={{ color: "error.main" }}>
            <span className="material-symbols-outlined" style={{ marginRight: 12, fontSize: 20 }}>
              logout
            </span>
            Sign Out
          </MenuItem>
        </Menu>
      </Box>

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
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
          <Toolbar sx={{ height: 64, px: { xs: 2, md: 3 } }}>
            <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>
              Employee Portal
            </Typography>

<Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Link href="/app/employee/notifications" style={{ textDecoration: "none" }}>
                      <IconButton size="small">
                        <Badge badgeContent={unreadCount} color="error" max={99}>
                          <span className="material-symbols-outlined">notifications</span>
                        </Badge>
                      </IconButton>
                    </Link>
                    <IconButton size="small" onClick={colorMode.toggleColorMode}>
                      <span className="material-symbols-outlined">
                        {theme.palette.mode === "dark" ? "light_mode" : "dark_mode"}
                      </span>
                    </IconButton>

                    <Box
                      onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        ml: 1,
                        pl: 2,
                        borderLeft: "1px solid",
                        borderColor: "divider",
                        cursor: "pointer",
                        py: 0.5,
                        pr: 1,
                        borderRadius: "0 24px 24px 0",
                        transition: "all 0.2s ease",
                        "&:hover": {
                          bgcolor: alpha("#10b981", 0.08),
                        },
                      }}
                    >
                      <Box
                        sx={{
                          position: "relative",
                        }}
                      >
                        <Box
                          sx={{
                            position: "absolute",
                            inset: -3,
                            borderRadius: "50%",
                            background: `conic-gradient(from 0deg, ${alpha("#10b981", 0.5)}, ${alpha("#059669", 0.2)}, ${alpha("#10b981", 0.5)})`,
                            animation: "headerSpin 6s linear infinite",
                            "@keyframes headerSpin": {
                              from: { transform: "rotate(0deg)" },
                              to: { transform: "rotate(360deg)" },
                            },
                          }}
                        />
                        <Avatar
                          sx={{
                            position: "relative",
                            width: 36,
                            height: 36,
                            bgcolor: "#10b981",
                            color: "#fff",
                            fontSize: "0.875rem",
                            fontWeight: 600,
                            boxShadow: `0 0 16px ${alpha("#10b981", 0.4)}`,
                          }}
                        >
                          {session.employee.firstName?.charAt(0)}{session.employee.lastName?.charAt(0)}
                        </Avatar>
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.875rem",
                            lineHeight: 1.3,
                            color: "text.primary",
                          }}
                          noWrap
                        >
                          {session.employee.firstName} {session.employee.lastName}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "#10b981",
                            fontSize: "0.75rem",
                            lineHeight: 1.2,
                          }}
                          noWrap
                        >
                          {session.employee.email}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 4 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
