"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Button,
  Collapse,
  Divider,
} from "@mui/material";
import Link from "next/link";

const APP_ROUTES = [
  { path: "/", name: "Landing Page", category: "Public" },
  { path: "/login", name: "Login", category: "Auth" },
  { path: "/register", name: "Register", category: "Auth" },
  { path: "/invite", name: "Accept Invitation", category: "Auth" },
  { path: "/pending", name: "Pending Approval", category: "Auth" },
  { path: "/app", name: "Dashboard", category: "App" },
  { path: "/app/offboardings", name: "Offboardings List", category: "App" },
  { path: "/app/employees", name: "Employees List", category: "App" },
  { path: "/app/workflows", name: "Workflow Templates", category: "App" },
  { path: "/app/integrations", name: "Integrations", category: "App" },
  { path: "/app/audit-logs", name: "Audit Logs", category: "App" },
  { path: "/app/settings/organization", name: "Organization Settings", category: "Settings" },
  { path: "/app/settings/members", name: "Members", category: "Settings" },
  { path: "/app/settings/roles", name: "Roles & Permissions", category: "Settings" },
  { path: "/app/settings/structure", name: "Org Structure", category: "Settings" },
  { path: "/app/settings/profile", name: "Profile", category: "Settings" },
  { path: "/app/settings/health", name: "System Health", category: "Settings" },
  { path: "/admin", name: "Admin Dashboard", category: "Admin" },
  { path: "/admin/organizations", name: "Organizations", category: "Admin" },
  { path: "/admin/users", name: "Users", category: "Admin" },
];

const DYNAMIC_ROUTES = [
  { path: "/app/offboardings/[id]", name: "Offboarding Detail", category: "Dynamic", example: "/app/offboardings/test-id" },
  { path: "/app/employees/[id]", name: "Employee Detail", category: "Dynamic", example: "/app/employees/test-id" },
];

export default function RouteCheckPage() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    Public: true,
    Auth: true,
    App: true,
    Settings: true,
    Admin: false,
    Dynamic: true,
  });

  const groupedRoutes = APP_ROUTES.reduce((acc, route) => {
    if (!acc[route.category]) acc[route.category] = [];
    acc[route.category].push(route);
    return acc;
  }, {} as Record<string, typeof APP_ROUTES>);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Public": return "default";
      case "Auth": return "info";
      case "App": return "primary";
      case "Settings": return "secondary";
      case "Admin": return "error";
      case "Dynamic": return "warning";
      default: return "default";
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 800, mx: "auto" }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800}>Route Check</Typography>
        <Typography color="text.secondary">
          Developer tool to verify all routes are working
        </Typography>
      </Box>

      <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Total Routes: {APP_ROUTES.length} static + {DYNAMIC_ROUTES.length} dynamic
          </Typography>
        </CardContent>
      </Card>

      {Object.entries(groupedRoutes).map(([category, routes]) => (
        <Card key={category} variant="outlined" sx={{ borderRadius: 3, mb: 2 }}>
          <CardContent sx={{ pb: 0 }}>
            <Box
              sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
              onClick={() => setExpanded((prev) => ({ ...prev, [category]: !prev[category] }))}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Chip label={category} size="small" color={getCategoryColor(category) as any} />
                <Typography variant="subtitle1" fontWeight={700}>
                  {routes.length} routes
                </Typography>
              </Box>
              <span className="material-symbols-outlined">
                {expanded[category] ? "expand_less" : "expand_more"}
              </span>
            </Box>
          </CardContent>
          <Collapse in={expanded[category]}>
            <List dense>
              {routes.map((route) => (
                <ListItem key={route.path}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>link</span>
                  </ListItemIcon>
                  <ListItemText
                    primary={route.name}
                    secondary={route.path}
                    primaryTypographyProps={{ fontWeight: 600 }}
                  />
                  <Link href={route.path} target="_blank" style={{ textDecoration: "none" }}>
                    <Button size="small" variant="outlined">
                      Test
                    </Button>
                  </Link>
                </ListItem>
              ))}
            </List>
          </Collapse>
        </Card>
      ))}

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent sx={{ pb: 0 }}>
          <Box
            sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
            onClick={() => setExpanded((prev) => ({ ...prev, Dynamic: !prev.Dynamic }))}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Chip label="Dynamic" size="small" color="warning" />
              <Typography variant="subtitle1" fontWeight={700}>
                {DYNAMIC_ROUTES.length} routes
              </Typography>
            </Box>
            <span className="material-symbols-outlined">
              {expanded.Dynamic ? "expand_less" : "expand_more"}
            </span>
          </Box>
        </CardContent>
        <Collapse in={expanded.Dynamic}>
          <List dense>
            {DYNAMIC_ROUTES.map((route) => (
              <ListItem key={route.path}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>data_object</span>
                </ListItemIcon>
                <ListItemText
                  primary={route.name}
                  secondary={route.path}
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                  (needs real ID)
                </Typography>
              </ListItem>
            ))}
          </List>
        </Collapse>
      </Card>

      <Divider sx={{ my: 4 }} />

      <Typography variant="body2" color="text.secondary" textAlign="center">
        Click "Test" to open each route in a new tab and verify it loads correctly.
      </Typography>
    </Box>
  );
}
