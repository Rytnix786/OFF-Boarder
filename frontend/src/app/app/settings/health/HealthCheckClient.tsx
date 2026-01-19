"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  alpha,
  Button,
  Collapse,
  useTheme,
  Alert,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import Link from "next/link";

type HealthCheck = {
  name: string;
  status: "pass" | "fail" | "warning";
  message: string;
  details?: string;
};

type RouteInfo = {
  path: string;
  name: string;
};

interface HealthCheckClientProps {
  checks: HealthCheck[];
  session: {
    user: { email: string; name: string | null };
    orgName: string;
    systemRole: string;
  };
  summary: { total: number; pass: number; fail: number };
  routes: RouteInfo[];
}

export default function HealthCheckClient({ checks, session, summary, routes }: HealthCheckClientProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState<string | null>(null);

  const getStatusColor = (status: HealthCheck["status"]) => {
    switch (status) {
      case "pass":
        return theme.palette.success.main;
      case "fail":
        return theme.palette.error.main;
      case "warning":
        return theme.palette.warning.main;
    }
  };

  const getStatusIcon = (status: HealthCheck["status"]) => {
    switch (status) {
      case "pass":
        return "check_circle";
      case "fail":
        return "cancel";
      case "warning":
        return "warning";
    }
  };

  const overallStatus = summary.fail > 0 ? "fail" : summary.pass === summary.total ? "pass" : "warning";

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          System Health
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Verify database, authentication, and multi-tenant isolation
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card
            variant="outlined"
            sx={{
              borderRadius: 3,
              borderColor: getStatusColor(overallStatus),
              borderWidth: 2,
            }}
          >
            <CardContent sx={{ textAlign: "center", py: 4 }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  bgcolor: alpha(getStatusColor(overallStatus), 0.1),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 2,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 40, color: getStatusColor(overallStatus) }}
                >
                  {getStatusIcon(overallStatus)}
                </span>
              </Box>
              <Typography variant="h5" fontWeight={800}>
                {overallStatus === "pass" ? "All Systems Operational" : overallStatus === "fail" ? "Issues Detected" : "Warnings Present"}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {summary.pass}/{summary.total} checks passed
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                Current Session
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    User
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {session.user.name || session.user.email}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Email
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {session.user.email}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Organization
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {session.orgName}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Role
                  </Typography>
                  <Chip label={session.systemRole} size="small" color="primary" sx={{ fontWeight: 600 }} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card variant="outlined" sx={{ borderRadius: 3, mb: 4 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="h6" fontWeight={700}>
              Health Checks
            </Typography>
          </Box>

          {checks.map((check, index) => (
            <Box
              key={check.name}
              sx={{
                borderBottom: index < checks.length - 1 ? "1px solid" : "none",
                borderColor: "divider",
              }}
            >
              <Box
                sx={{
                  p: 3,
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  cursor: check.details ? "pointer" : "default",
                  "&:hover": check.details ? { bgcolor: "action.hover" } : {},
                }}
                onClick={() => check.details && setExpanded(expanded === check.name ? null : check.name)}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: alpha(getStatusColor(check.status), 0.1),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ color: getStatusColor(check.status) }}
                  >
                    {getStatusIcon(check.status)}
                  </span>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {check.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {check.message}
                  </Typography>
                </Box>
                <Chip
                  label={check.status.toUpperCase()}
                  size="small"
                  sx={{
                    bgcolor: alpha(getStatusColor(check.status), 0.1),
                    color: getStatusColor(check.status),
                    fontWeight: 700,
                  }}
                />
                {check.details && (
                  <span
                    className="material-symbols-outlined"
                    style={{
                      color: theme.palette.text.secondary,
                      transform: expanded === check.name ? "rotate(180deg)" : "none",
                      transition: "transform 0.2s",
                    }}
                  >
                    expand_more
                  </span>
                )}
              </Box>
              {check.details && (
                <Collapse in={expanded === check.name}>
                  <Box sx={{ px: 3, pb: 3, pl: 8 }}>
                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                      <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                        {check.details}
                      </Typography>
                    </Alert>
                  </Box>
                </Collapse>
              )}
            </Box>
          ))}
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 3, mb: 4 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="h6" fontWeight={700}>
              Route Test (click to verify each route loads)
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Route Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Path</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {routes.map((route) => (
                  <TableRow key={route.path} hover>
                    <TableCell>{route.name}</TableCell>
                    <TableCell sx={{ fontFamily: "monospace", color: "text.secondary" }}>
                      {route.path}
                    </TableCell>
                    <TableCell align="right">
                      <Link href={route.path} target="_blank" style={{ textDecoration: "none" }}>
                        <Button size="small" variant="outlined">
                          Test
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Box sx={{ mt: 4, textAlign: "center" }}>
        <Button
          variant="outlined"
          startIcon={<span className="material-symbols-outlined">refresh</span>}
          onClick={() => window.location.reload()}
          sx={{ borderRadius: 2 }}
        >
          Re-run Health Checks
        </Button>
      </Box>
    </Box>
  );
}
