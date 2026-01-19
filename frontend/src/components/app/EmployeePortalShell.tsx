"use client";

import React, { useState, useContext } from "react";
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
} from "@mui/material";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ColorModeContext } from "@/theme/ThemeRegistry";
import { createClient } from "@/lib/supabase/client";
import type { EmployeePortalSession } from "@/lib/employee-auth.server";

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
];

export default function EmployeePortalShell({ session, children }: EmployeePortalShellProps) {
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);
  const pathname = usePathname();
  const router = useRouter();
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  const handleSignOut = async () => {
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
            const isDisabled = !session.hasActiveOffboarding && item.href !== "/app/employee";
            
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
                        <span className="material-symbols-outlined">{item.icon}</span>
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

<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <IconButton size="small" onClick={colorMode.toggleColorMode}>
                  <span className="material-symbols-outlined">
                    {theme.palette.mode === "dark" ? "light_mode" : "dark_mode"}
                  </span>
                </IconButton>
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
