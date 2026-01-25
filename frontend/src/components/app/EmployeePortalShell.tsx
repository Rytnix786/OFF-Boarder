"use client";

import React, { useState, useContext, useEffect, useCallback } from "react";
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
  Popover,
  CircularProgress,
  Button,
} from "@mui/material";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ColorModeContext } from "@/theme/ThemeRegistry";
import { ThemeToggle } from "../layout/ThemeToggle";
import { createClient, clearRememberMe } from "@/lib/supabase/client";
import type { EmployeePortalSession } from "@/lib/employee-auth.server";
import { getUnreadNotificationCount, getRecentNotifications, markNotificationAsRead, type EmployeeNotification } from "@/lib/actions/employee-notifications";
import { CountdownBanner } from "./CountdownBanner";

const SIDEBAR_WIDTH = 280;

interface EmployeePortalShellProps {
  session: EmployeePortalSession;
  children: React.ReactNode;
}

const navItems = [
  { label: "Dashboard", icon: "dashboard", href: "/app/employee" },
  { label: "My Tasks", icon: "task_alt", href: "/app/employee/tasks" },
  { label: "My Assets", icon: "devices", href: "/app/employee/assets", alwaysEnabled: true },
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
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<EmployeeNotification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    // Prevent fetching if window is not focused to reduce server load and potential loops
    if (typeof document !== "undefined" && document.hidden) return;

    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch (error) {
      // If session expired, we'll just stop polling rather than looping
      console.warn("Failed to fetch unread count (session may be expired):", error);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchUnreadCount();

    // Set up interval with a check to prevent multiple intervals
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const handleNotifOpen = async (e: React.MouseEvent<HTMLElement>) => {
    setNotifAnchor(e.currentTarget);
    setNotifLoading(true);
    try {
      const recent = await getRecentNotifications(5);
      setNotifications(recent);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setNotifLoading(false);
    }
  };

  const handleNotifClose = () => {
    setNotifAnchor(null);
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleSignOut = async () => {
      clearRememberMe();
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    };

  const isRevoked = session.employeeLink.status === "REVOKED";

  const visibleNavItems = navItems.filter(item => {
    if (!isRevoked) return true;
    return item.label === "Attestation" || item.label === "My Assets";
  });

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
            {visibleNavItems.map((item) => {
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
                            bgcolor: isActive ? alpha(theme.palette.primary.main, 0.1) : "transparent",
                            color: isActive ? theme.palette.primary.main : "text.primary",
                            position: "relative",
                            overflow: "hidden",
                            "&::before": isActive ? {
                              content: '""',
                              position: "absolute",
                              left: 0,
                              top: "20%",
                              bottom: "20%",
                              width: 3,
                              bgcolor: "primary.main",
                              borderRadius: "0 4px 4px 0",
                              boxShadow: `0 0 12px ${theme.palette.primary.main}`,
                            } : {},
                            "&::after": isActive ? {
                              content: '""',
                              position: "absolute",
                              inset: 0,
                              background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 100%)`,
                            } : {},
                            "&:hover": {
                              bgcolor: isActive ? alpha(theme.palette.primary.main, 0.15) : "action.hover",
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

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {isRevoked && session.employeeLink.revokedAt && (
          <CountdownBanner revokedAt={session.employeeLink.revokedAt} />
        )}
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
                        {!isRevoked && (
                          <>
                            <IconButton size="small" onClick={handleNotifOpen}>
                              <Badge badgeContent={unreadCount} color="error" max={99}>
                                <span className="material-symbols-outlined">notifications</span>
                              </Badge>
                            </IconButton>
                            <Popover
                              open={Boolean(notifAnchor)}
                              anchorEl={notifAnchor}
                              onClose={handleNotifClose}
                              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                              transformOrigin={{ vertical: "top", horizontal: "right" }}
                              PaperProps={{
                                sx: {
                                  width: 360,
                                  maxHeight: 420,
                                  mt: 1,
                                  borderRadius: 2,
                                  boxShadow: theme.shadows[8],
                                },
                              }}
                            >
                              <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <Typography variant="subtitle1" fontWeight={600}>Notifications</Typography>
                                {unreadCount > 0 && (
                                  <Chip size="small" label={`${unreadCount} unread`} color="error" sx={{ height: 22, fontSize: "0.7rem" }} />
                                )}
                              </Box>
                              <Box sx={{ maxHeight: 280, overflow: "auto" }}>
                                {notifLoading ? (
                                  <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                                    <CircularProgress size={24} />
                                  </Box>
                                ) : notifications.length === 0 ? (
                                  <Box sx={{ py: 4, textAlign: "center" }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 36, opacity: 0.3 }}>notifications_none</span>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>No notifications</Typography>
                                  </Box>
                                ) : (
                                  <List disablePadding>
                                    {notifications.map((notif) => (
                                      <ListItem
                                        key={notif.id}
                                        disablePadding
                                        sx={{
                                          bgcolor: notif.read ? "transparent" : alpha(theme.palette.primary.main, 0.04),
                                        }}
                                      >
                                        <ListItemButton
                                          onClick={() => {
                                            if (!notif.read) handleMarkAsRead(notif.id);
                                            handleNotifClose();
                                            router.push("/app/employee/notifications");
                                          }}
                                          sx={{ py: 1.5, px: 2 }}
                                        >
                                          <ListItemIcon sx={{ minWidth: 36 }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: 20, color: notif.read ? theme.palette.text.disabled : theme.palette.primary.main }}>
                                              {notif.type === "task_assigned" ? "task_alt" : notif.type === "security_alert" ? "security" : "notifications"}
                                            </span>
                                          </ListItemIcon>
                                          <ListItemText
                                            primary={notif.title}
                                            secondary={new Date(notif.createdAt).toLocaleDateString()}
                                            primaryTypographyProps={{
                                              fontWeight: notif.read ? 400 : 600,
                                              fontSize: "0.875rem",
                                              noWrap: true,
                                            }}
                                            secondaryTypographyProps={{ fontSize: "0.75rem" }}
                                          />
                                        </ListItemButton>
                                      </ListItem>
                                    ))}
                                  </List>
                                )}
                              </Box>
                              <Box sx={{ p: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
                                <Button
                                  fullWidth
                                  size="small"
                                  onClick={() => {
                                    handleNotifClose();
                                    router.push("/app/employee/notifications");
                                  }}
                                  sx={{ textTransform: "none", fontWeight: 500 }}
                                >
                                  View all notifications
                                </Button>
                              </Box>
                            </Popover>
                          </>
                        )}
                        
                        <ThemeToggle size="small" />

  
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

        <Box
          component="main"
          sx={{
            flex: 1,
            p: { xs: 2, md: 4 },
            animation: "portalFadeIn 0.5s ease-out",
            "@keyframes portalFadeIn": {
              from: { opacity: 0, transform: "translateY(8px)" },
              to: { opacity: 1, transform: "translateY(0)" },
            }
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
