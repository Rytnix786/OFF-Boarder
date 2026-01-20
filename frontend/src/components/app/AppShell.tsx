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
  alpha,
  useTheme,
  Badge,
  AppBar,
  Toolbar,
  InputBase,
  styled,
  Collapse,
  Popover,
  Button,
  Chip,
  IconButton,
} from "@mui/material";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AuthSession } from "@/lib/auth-types";
import { ColorModeContext } from "@/theme/ThemeRegistry";
import { createClient, clearRememberMe } from "@/lib/supabase/client";
import {
  MODULE_SECTIONS,
  SETTINGS_SECTIONS,
  filterSectionsByPermissions,
  getRoleDisplayName,
  getRoleColor,
  NavSection,
} from "@/lib/navigation";
import { PermissionCode } from "@/lib/permissions";
import { SystemRole } from "@prisma/client";
import { stitchTokens } from "@/theme/tokens";

const t = stitchTokens;

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const SIDEBAR_WIDTH = 240;

const Search = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: 8,
  backgroundColor: theme.palette.mode === "dark" ? t.colors.background.surfaceLight : "#F1F5F9",
  border: `1px solid ${theme.palette.mode === "dark" ? t.colors.border.subtle : t.colors.border.light}`,
  transition: t.transitions.default,
  "&:hover": {
    borderColor: theme.palette.mode === "dark" ? t.colors.border.default : "#94A3B8",
  },
  "&:focus-within": {
    borderColor: t.colors.primary.main,
    boxShadow: `0 0 0 2px ${alpha(t.colors.primary.main, 0.1)}`,
  },
  width: "100%",
  maxWidth: 400,
}));

const SearchIconWrapper = styled("div")(({ theme }) => ({
  padding: theme.spacing(0, 1.5),
  height: "100%",
  position: "absolute",
  pointerEvents: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: theme.palette.text.secondary,
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: "inherit",
  width: "100%",
  "& .MuiInputBase-input": {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(3.5)})`,
    fontSize: "0.8125rem",
    fontWeight: 500,
  },
}));

interface AppShellProps {
  session: AuthSession;
  userPermissions: PermissionCode[];
  children: React.ReactNode;
}

export default function AppShell({ session, userPermissions, children }: AppShellProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colorMode = useContext(ColorModeContext);
  const pathname = usePathname();
  const router = useRouter();

  const [orgMenuAnchor, setOrgMenuAnchor] = useState<null | HTMLElement>(null);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(pathname.startsWith("/app/settings"));
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const role = session.currentMembership?.systemRole as SystemRole;
  const navSections = filterSectionsByPermissions(MODULE_SECTIONS, userPermissions);
  const settingsSections = filterSectionsByPermissions(SETTINGS_SECTIONS, userPermissions);
  const roleColor = getRoleColor(role);
  const roleDisplayName = getRoleDisplayName(role);

  const currentOrg = session.currentMembership?.organization;
  const userName = session.user.name || "User";
  const userInitials = userName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount);
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markAllRead: true }) });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) { console.error("Failed to mark notifications as read:", error); }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      try {
        await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notificationId: notification.id }) });
        setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) { console.error("Failed to mark notification as read:", error); }
    }
    if (notification.link) { setNotificationAnchor(null); router.push(notification.link); }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "offboarding_started": return "group_remove";
      case "task_completed": return "check_circle";
      case "task_assigned": return "assignment";
      case "member_joined": return "person_add";
      case "integration_error": return "error";
      default: return "notifications";
    }
  };

  const handleSignOut = async () => {
      setProfileMenuAnchor(null);
      clearRememberMe();
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    };

  const handleOrgSwitch = (orgSlug: string) => {
    setOrgMenuAnchor(null);
    router.push(`/app?org=${orgSlug}`);
    router.refresh();
  };

  const renderNavSection = (section: NavSection, isSettings = false) => (
    <Box key={section.id} sx={{ mb: 2 }}>
      <Typography variant="overline" sx={{ px: 2, py: 0.75, display: "block", color: isDark ? t.colors.text.muted.dark : t.colors.text.muted.light, fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {section.label}
      </Typography>
      <List disablePadding>
        {section.items.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/app" && pathname.startsWith(item.href));
          return (
            <ListItem key={item.id} disablePadding sx={{ px: 1, mb: 0.25 }}>
              <Link href={item.href} passHref style={{ textDecoration: "none", width: "100%", color: "inherit" }}>
                  <ListItemButton sx={{ borderRadius: 1.5, py: isSettings ? 0.75 : 1, px: 1.5, minHeight: isSettings ? 36 : 40, bgcolor: isActive ? (isDark ? alpha(t.colors.primary.main, 0.15) : alpha(t.colors.primary.main, 0.1)) : "transparent", color: isActive ? t.colors.primary.main : (isDark ? t.colors.text.secondary.dark : t.colors.text.secondary.light), transition: "none", "&:hover": { bgcolor: isActive ? (isDark ? alpha(t.colors.primary.main, 0.15) : alpha(t.colors.primary.main, 0.1)) : (isDark ? t.colors.glass.hover : "#F1F5F9"), color: isActive ? t.colors.primary.main : (isDark ? "#FFFFFF" : t.colors.text.primary.light) } }}>
                    <ListItemIcon sx={{ minWidth: 28, color: "inherit" }}>
                      <span className="material-symbols-outlined icon-sidebar" style={{ fontSize: isSettings ? 16 : 18, color: "inherit" }}>{item.icon}</span>
                    </ListItemIcon>
                  <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: isActive ? 600 : 500, fontSize: isSettings ? "0.75rem" : "0.8125rem" }} />
                  {item.badge && <Chip size="small" label={item.badge} sx={{ height: 18, fontSize: "0.625rem", fontWeight: 700, bgcolor: item.badge === "new" ? alpha("#22c55e", 0.15) : alpha("#6366f1", 0.15), color: item.badge === "new" ? "#22c55e" : "#6366f1" }} />}
                </ListItemButton>
              </Link>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <Box component="aside" sx={{ width: SIDEBAR_WIDTH, flexShrink: 0, height: "100vh", position: "sticky", top: 0, borderRight: `1px solid ${isDark ? t.colors.border.subtle : t.colors.border.light}`, display: "flex", flexDirection: "column", bgcolor: isDark ? t.colors.background.deep : t.colors.background.lightPaper }}>
        <Box sx={{ height: 56, display: "flex", alignItems: "center", px: 2, borderBottom: `1px solid ${isDark ? t.colors.border.subtle : t.colors.border.light}` }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ width: 28, height: 28, borderRadius: 1.5, background: `linear-gradient(135deg, ${t.colors.primary.main} 0%, ${t.colors.accent.teal} 100%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#FFFFFF" }}>shield_lock</span>
            </Box>
            <Typography variant="body2" fontWeight={800} sx={{ color: isDark ? "#FFFFFF" : t.colors.text.primary.light, letterSpacing: "-0.02em" }}>OffboardHQ</Typography>
          </Box>
        </Box>

        <Box sx={{ px: 1, py: 1.5, borderBottom: `1px solid ${isDark ? t.colors.border.subtle : t.colors.border.light}` }}>
          <Box onClick={(e) => setOrgMenuAnchor(e.currentTarget)} sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 1.5, py: 1, borderRadius: 1.5, cursor: "pointer", bgcolor: isDark ? t.colors.glass.hover : "#F8FAFC", border: `1px solid ${isDark ? t.colors.border.subtle : t.colors.border.light}`, "&:hover": { bgcolor: isDark ? alpha(t.colors.primary.main, 0.08) : "#F1F5F9", borderColor: isDark ? t.colors.border.default : "#CBD5E1" } }}>
            <Avatar sx={{ width: 24, height: 24, bgcolor: t.colors.primary.main, fontSize: 11, fontWeight: 700 }}>{currentOrg?.name?.charAt(0) || "O"}</Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" fontWeight={600} noWrap sx={{ display: "block", color: isDark ? "#FFFFFF" : t.colors.text.primary.light, lineHeight: 1.3, fontSize: "0.75rem" }}>{currentOrg?.name || "Organization"}</Typography>
            </Box>
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: isDark ? t.colors.text.muted.dark : t.colors.text.muted.light }}>unfold_more</span>
          </Box>
        </Box>

        <Menu anchorEl={orgMenuAnchor} open={Boolean(orgMenuAnchor)} onClose={() => setOrgMenuAnchor(null)} PaperProps={{ sx: { width: 260, mt: 0.5 } }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${isDark ? t.colors.border.subtle : t.colors.border.light}` }}>
              <Typography variant="overline" sx={{ color: "text.secondary", fontSize: "0.625rem", letterSpacing: "0.1em" }}>Switch Organization</Typography>
            </Box>
          {session.memberships.map((membership) => (
            <MenuItem key={membership.id} selected={membership.organizationId === session.currentOrgId} onClick={() => handleOrgSwitch(membership.organization.slug)} sx={{ py: 1.25, px: 2 }}>
              <Avatar sx={{ width: 28, height: 28, mr: 1.5, bgcolor: t.colors.primary.main, fontSize: 12, fontWeight: 700 }}>{membership.organization.name.charAt(0)}</Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} noWrap fontSize="0.8125rem">{membership.organization.name}</Typography>
                <Typography variant="caption" color="text.secondary" fontSize="0.6875rem">{getRoleDisplayName(membership.systemRole)}</Typography>
              </Box>
              {membership.organizationId === session.currentOrgId && <span className="material-symbols-outlined" style={{ fontSize: 16, color: t.colors.primary.main }}>check</span>}
            </MenuItem>
          ))}
        </Menu>

        <Box sx={{ flex: 1, overflow: "auto", py: 1.5 }}>
          {navSections.map((section) => renderNavSection(section))}
          {settingsSections.length > 0 && (
            <>
              <Divider sx={{ my: 1.5, mx: 2 }} />
              <Box sx={{ px: 1 }}>
                <ListItemButton onClick={() => setSettingsOpen(!settingsOpen)} sx={{ borderRadius: 1.5, py: 1, px: 1.5, bgcolor: pathname.startsWith("/app/settings") ? (isDark ? alpha(t.colors.primary.main, 0.08) : alpha(t.colors.primary.main, 0.05)) : "transparent", color: isDark ? t.colors.text.secondary.dark : t.colors.text.secondary.light, "&:hover": { bgcolor: isDark ? t.colors.glass.hover : "#F1F5F9" } }}>
                  <ListItemIcon sx={{ minWidth: 28, color: "inherit" }}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>settings</span></ListItemIcon>
                  <ListItemText primary="Settings" primaryTypographyProps={{ fontWeight: 500, fontSize: "0.8125rem" }} />
                  <span className="material-symbols-outlined" style={{ fontSize: 14, transform: settingsOpen ? "rotate(180deg)" : "none" }}>expand_more</span>
                </ListItemButton>
              </Box>
              <Collapse in={settingsOpen}><Box sx={{ pl: 1, mt: 1 }}>{settingsSections.map((section) => renderNavSection(section, true))}</Box></Collapse>
            </>
          )}
        </Box>

        <Box sx={{ p: 1.5, borderTop: `1px solid ${isDark ? t.colors.border.subtle : t.colors.border.light}` }}>
          <Typography variant="caption" color="text.secondary" sx={{ px: 1, fontSize: "0.625rem" }}>v1.0.0</Typography>
        </Box>
      </Box>

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <AppBar position="sticky" elevation={0} sx={{ bgcolor: isDark ? alpha(t.colors.background.void, 0.9) : alpha(t.colors.background.lightPaper, 0.95), backdropFilter: "blur(8px)", borderBottom: `1px solid ${isDark ? t.colors.border.subtle : t.colors.border.light}`, color: "text.primary" }}>
          <Toolbar sx={{ height: 56, px: { xs: 2, md: 3 }, gap: 2 }}>
            <Search>
              <SearchIconWrapper><span className="material-symbols-outlined" style={{ fontSize: 18 }}>search</span></SearchIconWrapper>
              <StyledInputBase placeholder="Search..." inputProps={{ "aria-label": "search" }} />
              <Typography variant="caption" sx={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "text.disabled", fontSize: "0.6875rem", fontWeight: 600, bgcolor: isDark ? t.colors.background.surfaceLight : "#E2E8F0", px: 0.75, py: 0.25, borderRadius: 0.75 }}>⌘K</Typography>
            </Search>
            <Box sx={{ flexGrow: 1 }} />
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
<IconButton size="small" onClick={colorMode.toggleColorMode} sx={{ width: 32, height: 32, color: isDark ? t.colors.icon.default.dark : t.colors.icon.default.light, "&:hover": { bgcolor: isDark ? t.colors.glass.hover : "#F1F5F9" } }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{isDark ? "light_mode" : "dark_mode"}</span>
                </IconButton>
              <IconButton size="small" onClick={(e) => setNotificationAnchor(e.currentTarget)} sx={{ width: 32, height: 32, color: isDark ? t.colors.icon.default.dark : t.colors.icon.default.light, "&:hover": { bgcolor: isDark ? t.colors.glass.hover : "#F1F5F9" } }}>
                <Badge badgeContent={unreadCount} color="error" sx={{ "& .MuiBadge-badge": { fontSize: 9, height: 14, minWidth: 14 } }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>notifications</span>
                </Badge>
              </IconButton>
              <Divider orientation="vertical" flexItem sx={{ mx: 1, height: 20, alignSelf: "center" }} />
              <Box onClick={(e) => setProfileMenuAnchor(e.currentTarget)} sx={{ display: "flex", alignItems: "center", gap: 1, pl: 0.5, pr: 1, py: 0.5, borderRadius: 1.5, cursor: "pointer", border: "1px solid transparent", "&:hover": { bgcolor: isDark ? t.colors.glass.hover : "#F1F5F9", border: `1px solid ${isDark ? t.colors.border.subtle : t.colors.border.light}` } }}>
                <Avatar src={session.user.avatarUrl || undefined} sx={{ width: 28, height: 28, fontSize: 11, fontWeight: 700, bgcolor: roleColor }}>{userInitials}</Avatar>
                <Box sx={{ display: { xs: "none", md: "block" } }}>
                  <Typography variant="caption" fontWeight={600} sx={{ color: isDark ? "#FFFFFF" : t.colors.text.primary.light, lineHeight: 1.2, fontSize: "0.75rem", display: "block" }}>{userName}</Typography>
                    <Typography variant="caption" sx={{ color: isDark ? t.colors.text.muted.dark : t.colors.text.muted.light, fontSize: "0.625rem", lineHeight: 1 }}>{roleDisplayName}</Typography>
                </Box>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: isDark ? t.colors.text.muted.dark : t.colors.text.muted.light }}>expand_more</span>
              </Box>
            </Box>
          </Toolbar>
        </AppBar>

        <Menu anchorEl={profileMenuAnchor} open={Boolean(profileMenuAnchor)} onClose={() => setProfileMenuAnchor(null)} PaperProps={{ sx: { width: 260, mt: 0.5, borderRadius: 2, border: `1px solid ${isDark ? t.colors.border.subtle : t.colors.border.light}`, boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.4)" : "0 4px 24px rgba(0,0,0,0.06)" } }} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
          <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${isDark ? t.colors.border.subtle : t.colors.border.light}` }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Avatar src={session.user.avatarUrl || undefined} sx={{ width: 36, height: 36, fontSize: 13, fontWeight: 700, bgcolor: roleColor }}>{userInitials}</Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700} noWrap fontSize="0.8125rem">{userName}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block", fontSize: "0.6875rem" }}>{session.user.email}</Typography>
              </Box>
            </Box>
            <Box sx={{ mt: 1.5, display: "flex", gap: 0.75, flexWrap: "wrap" }}>
              <Chip size="small" label={roleDisplayName} sx={{ height: 20, fontSize: "0.625rem", fontWeight: 700, bgcolor: alpha(roleColor, 0.12), color: roleColor }} />
              <Chip size="small" label={currentOrg?.name} sx={{ height: 20, fontSize: "0.625rem", fontWeight: 600, bgcolor: isDark ? t.colors.glass.hover : "#F1F5F9", color: "text.secondary" }} />
              {session.user.isPlatformAdmin && <Chip size="small" label="Platform Admin" sx={{ height: 20, fontSize: "0.625rem", fontWeight: 700, bgcolor: alpha(t.colors.status.error, 0.1), color: t.colors.status.error }} />}
            </Box>
          </Box>
          <Box sx={{ py: 0.5 }}>
            <Link href="/app/settings/profile" passHref style={{ textDecoration: "none", color: "inherit" }}><MenuItem onClick={() => setProfileMenuAnchor(null)} sx={{ py: 1, px: 2, fontSize: "0.8125rem" }}><span className="material-symbols-outlined" style={{ marginRight: 10, fontSize: 16, color: isDark ? t.colors.text.muted.dark : t.colors.text.muted.light }}>person</span>Profile</MenuItem></Link>
            <Link href="/app/settings/sessions" passHref style={{ textDecoration: "none", color: "inherit" }}><MenuItem onClick={() => setProfileMenuAnchor(null)} sx={{ py: 1, px: 2, fontSize: "0.8125rem" }}><span className="material-symbols-outlined" style={{ marginRight: 10, fontSize: 16, color: isDark ? t.colors.text.muted.dark : t.colors.text.muted.light }}>devices</span>Sessions</MenuItem></Link>
          </Box>
          {session.user.isPlatformAdmin && <Box sx={{ py: 0.5, borderTop: `1px solid ${isDark ? t.colors.border.subtle : t.colors.border.light}` }}><Link href="/admin" passHref style={{ textDecoration: "none", color: "inherit" }}><MenuItem onClick={() => setProfileMenuAnchor(null)} sx={{ py: 1, px: 2, fontSize: "0.8125rem" }}><span className="material-symbols-outlined" style={{ marginRight: 10, fontSize: 16, color: t.colors.status.error }}>admin_panel_settings</span>Platform Admin</MenuItem></Link></Box>}
          <Box sx={{ p: 1.5, borderTop: `1px solid ${isDark ? t.colors.border.subtle : t.colors.border.light}` }}>
            <Button fullWidth variant="text" color="inherit" onClick={handleSignOut} startIcon={<span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>} sx={{ justifyContent: "flex-start", fontWeight: 600, fontSize: "0.8125rem", color: "text.secondary", py: 0.75, "&:hover": { bgcolor: alpha(t.colors.status.error, 0.08), color: t.colors.status.error } }}>Sign out</Button>
          </Box>
        </Menu>

        <Popover open={Boolean(notificationAnchor)} anchorEl={notificationAnchor} onClose={() => setNotificationAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }} PaperProps={{ sx: { width: 360, maxHeight: 480, mt: 0.5 } }}>
          <Box sx={{ p: 2, borderBottom: `1px solid ${isDark ? t.colors.border.subtle : t.colors.border.light}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="subtitle2" fontWeight={700}>Notifications</Typography>
            {unreadCount > 0 && <Button size="small" onClick={handleMarkAllRead} sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Mark all read</Button>}
          </Box>
          <Box sx={{ maxHeight: 380, overflow: "auto" }}>
            {notifications.length === 0 ? (
              <Box sx={{ p: 5, textAlign: "center" }}>
                <Box sx={{ width: 48, height: 48, borderRadius: "50%", bgcolor: isDark ? t.colors.glass.hover : "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 1.5 }}><span className="material-symbols-outlined" style={{ fontSize: 24, color: isDark ? t.colors.text.muted.dark : t.colors.text.muted.light }}>notifications_none</span></Box>
                <Typography variant="body2" color="text.secondary" fontSize="0.8125rem">No notifications</Typography>
              </Box>
            ) : (
              notifications.map((notification) => (
                <Box key={notification.id} onClick={() => handleNotificationClick(notification)} sx={{ p: 1.5, borderBottom: `1px solid ${isDark ? t.colors.border.subtle : t.colors.border.light}`, cursor: notification.link ? "pointer" : "default", bgcolor: notification.read ? "transparent" : (isDark ? alpha(t.colors.primary.main, 0.06) : alpha(t.colors.primary.main, 0.04)), "&:hover": { bgcolor: isDark ? t.colors.glass.hover : "#F8FAFC" } }}>
                  <Box sx={{ display: "flex", gap: 1.5 }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: notification.read ? (isDark ? t.colors.glass.hover : "#F1F5F9") : alpha(t.colors.primary.main, 0.1), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span className="material-symbols-outlined" style={{ fontSize: 16, color: notification.read ? (isDark ? t.colors.text.muted.dark : t.colors.text.muted.light) : t.colors.primary.main }}>{getNotificationIcon(notification.type)}</span></Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={notification.read ? 400 : 600} noWrap fontSize="0.8125rem">{notification.title}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.6875rem" }}>{notification.message}</Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ mt: 0.25, display: "block", fontSize: "0.625rem" }}>{new Date(notification.createdAt).toLocaleDateString()}</Typography>
                    </Box>
                    {!notification.read && <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: t.colors.primary.main, flexShrink: 0, mt: 0.75 }} />}
                  </Box>
                </Box>
              ))
            )}
          </Box>
        </Popover>

        <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 3 }, bgcolor: isDark ? "transparent" : "#FAFBFC" }}>{children}</Box>
      </Box>
    </Box>
  );
}
