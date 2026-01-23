"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  alpha,
  useTheme,
  Button,
  Grid,
  Card,
  Avatar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  IconButton,
  Breadcrumbs,
  Link as MuiLink,
} from "@mui/material";
import Link from "next/link";
import { usePlatformContext } from "../../AdminPlatformContext";
import { stitchTokens } from "@/theme/tokens";

const t = stitchTokens;

type OrgUser = {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
    createdAt: string;
  };
  systemRole: string;
  status: string;
  createdAt: string;
};

type Employee = {
  id: string;
  name: string;
  email: string;
  status: string;
  jobTitle: string | null;
  department: string | null;
  createdAt: string;
};

type EmployeeStats = {
  total: number;
  active: number;
  offboarding: number;
  offboarded: number;
};

type Organization = {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  creatorId: string;
  memberships: OrgUser[];
  employees: Employee[];
  employeeStats: EmployeeStats;
};

export default function OrganizationDetailsClient({ id }: { id: string }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { incidentMode } = usePlatformContext();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const res = await fetch(`/api/platform/organizations/${id}`);
        if (res.ok) {
          const data = await res.json();
          setOrg(data.organization);
        }
      } catch (e) {
        console.error("Failed to fetch organization details", e);
      }
      setLoading(false);
    };
    fetchOrg();
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 12 }}>
        <CircularProgress size={32} sx={{ color: incidentMode ? "#dc2626" : "#6366f1" }} />
      </Box>
    );
  }

  if (!org) {
    return (
      <Box sx={{ textAlign: "center", py: 12 }}>
        <Typography variant="h5" color="text.secondary">Organization not found</Typography>
        <Button component={Link} href="/admin/organizations" sx={{ mt: 2 }}>Back to Organizations</Button>
      </Box>
    );
  }

  const creator = org.memberships.find(m => m.user.id === org.creatorId);

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 3 }}>
        <MuiLink component={Link} href="/admin/organizations" underline="hover" color="inherit" sx={{ fontSize: t.typography.fontSize.xs }}>
          Organizations
        </MuiLink>
        <Typography sx={{ fontSize: t.typography.fontSize.xs, color: "text.primary", fontWeight: 500 }}>
          {org.name}
        </Typography>
      </Breadcrumbs>

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 6 }}>
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
              {org.name}
            </Typography>
            <Chip 
              label={org.status} 
              size="small" 
              sx={{ 
                fontWeight: 700, 
                bgcolor: alpha(org.status === "ACTIVE" ? "#22c55e" : "#f59e0b", 0.1),
                color: org.status === "ACTIVE" ? "#22c55e" : "#f59e0b",
                border: "1px solid",
                borderColor: alpha(org.status === "ACTIVE" ? "#22c55e" : "#f59e0b", 0.2)
              }} 
            />
          </Box>
          <Typography sx={{ color: "text.secondary", fontSize: t.typography.fontSize.sm }}>
            ID: {org.id} • Slug: {org.slug} • Created {new Date(org.createdAt).toLocaleDateString()}
          </Typography>
          {creator && (
            <Typography sx={{ color: "text.secondary", fontSize: t.typography.fontSize.sm, mt: 0.5 }}>
              Creator: <strong>{creator.user.email}</strong> ({creator.user.name || "N/A"})
            </Typography>
          )}
        </Box>
      </Box>

      <Grid container spacing={4}>
        <Grid item xs={12} lg={8}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {/* Org Users Section */}
            <Card variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
              <Box sx={{ p: 2.5, borderBottom: "1px solid", borderColor: "divider", bgcolor: isDark ? alpha("#fff", 0.02) : alpha("#000", 0.01) }}>
                <Typography sx={{ fontWeight: 700, fontSize: t.typography.fontSize.base }}>
                  Organization Users (Admins / HR / IT)
                </Typography>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, fontSize: t.typography.fontSize.xs, color: "text.secondary", textTransform: "uppercase" }}>User</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: t.typography.fontSize.xs, color: "text.secondary", textTransform: "uppercase" }}>Role</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: t.typography.fontSize.xs, color: "text.secondary", textTransform: "uppercase" }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: t.typography.fontSize.xs, color: "text.secondary", textTransform: "uppercase" }}>Joined</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {org.memberships.map((membership) => (
                      <TableRow key={membership.id} hover>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Avatar 
                              src={membership.user.avatarUrl || undefined} 
                              sx={{ width: 32, height: 32, fontSize: "0.875rem", bgcolor: isDark ? "#27272a" : "#f4f4f5", color: "text.primary" }}
                            >
                              {membership.user.name?.charAt(0) || membership.user.email.charAt(0)}
                            </Avatar>
                            <Box>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Typography sx={{ fontWeight: 600, fontSize: t.typography.fontSize.sm }}>
                                  {membership.user.name || "No name"}
                                </Typography>
                                {membership.user.id === org.creatorId && (
                                  <Chip 
                                    label="Creator" 
                                    size="small" 
                                    variant="outlined"
                                    sx={{ 
                                      height: 18, 
                                      fontSize: "0.625rem", 
                                      fontWeight: 700, 
                                      color: "#6366f1", 
                                      borderColor: alpha("#6366f1", 0.3),
                                      bgcolor: alpha("#6366f1", 0.05)
                                    }} 
                                  />
                                )}
                              </Box>
                              <Typography sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                                {membership.user.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: t.typography.fontSize.sm, fontWeight: 500 }}>
                            {membership.systemRole}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={membership.status} 
                            size="small" 
                            sx={{ 
                              height: 20, 
                              fontSize: "0.6875rem", 
                              fontWeight: 600,
                              bgcolor: alpha(membership.status === "ACTIVE" ? "#22c55e" : "#9ca3af", 0.1),
                              color: membership.status === "ACTIVE" ? "#22c55e" : "#9ca3af",
                            }} 
                          />
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: t.typography.fontSize.sm, color: "text.secondary" }}>
                            {new Date(membership.createdAt).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>

            {/* Employees Section */}
            <Card variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
              <Box sx={{ p: 2.5, borderBottom: "1px solid", borderColor: "divider", bgcolor: isDark ? alpha("#fff", 0.02) : alpha("#000", 0.01) }}>
                <Typography sx={{ fontWeight: 700, fontSize: t.typography.fontSize.base }}>
                  Employee Directory (Identity Scoped to Org)
                </Typography>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, fontSize: t.typography.fontSize.xs, color: "text.secondary", textTransform: "uppercase" }}>Employee</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: t.typography.fontSize.xs, color: "text.secondary", textTransform: "uppercase" }}>Position</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: t.typography.fontSize.xs, color: "text.secondary", textTransform: "uppercase" }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: t.typography.fontSize.xs, color: "text.secondary", textTransform: "uppercase" }}>Added</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {org.employees.length > 0 ? org.employees.map((employee) => (
                      <TableRow key={employee.id} hover>
                        <TableCell>
                          <Box>
                            <Typography sx={{ fontWeight: 600, fontSize: t.typography.fontSize.sm }}>
                              {employee.name}
                            </Typography>
                            <Typography sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                              {employee.email}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: t.typography.fontSize.sm, fontWeight: 500 }}>
                            {employee.jobTitle || "—"}
                          </Typography>
                          <Typography sx={{ color: "text.secondary", fontSize: "0.7rem" }}>
                            {employee.department || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={employee.status} 
                            size="small" 
                            sx={{ 
                              height: 20, 
                              fontSize: "0.6875rem", 
                              fontWeight: 600,
                              bgcolor: alpha(employee.status === "ACTIVE" ? "#22c55e" : employee.status === "OFFBOARDING" ? "#f59e0b" : "#9ca3af", 0.1),
                              color: employee.status === "ACTIVE" ? "#22c55e" : employee.status === "OFFBOARDING" ? "#f59e0b" : "#9ca3af",
                            }} 
                          />
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: t.typography.fontSize.sm, color: "text.secondary" }}>
                            {new Date(employee.createdAt).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={4} sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
                          No employees found for this organization.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Box>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
            <Typography sx={{ fontWeight: 700, fontSize: t.typography.fontSize.base, mb: 3 }}>
              Lifecycle Metrics
            </Typography>
            
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography sx={{ fontSize: t.typography.fontSize.sm, color: "text.secondary", fontWeight: 500 }}>
                  Total Managed Employees
                </Typography>
                <Typography sx={{ fontSize: t.typography.fontSize.lg, fontWeight: 800 }}>
                  {org.employeeStats.total}
                </Typography>
              </Box>

              <Box sx={{ pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#22c55e" }} />
                        <Typography sx={{ fontSize: t.typography.fontSize.sm, fontWeight: 500 }}>Active</Typography>
                      </Box>
                      <Typography sx={{ fontSize: t.typography.fontSize.sm, fontWeight: 600 }}>{org.employeeStats.active}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#f59e0b" }} />
                        <Typography sx={{ fontSize: t.typography.fontSize.sm, fontWeight: 500 }}>Offboarding</Typography>
                      </Box>
                      <Typography sx={{ fontSize: t.typography.fontSize.sm, fontWeight: 600 }}>{org.employeeStats.offboarding}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#71717a" }} />
                        <Typography sx={{ fontSize: t.typography.fontSize.sm, fontWeight: 500 }}>Offboarded</Typography>
                      </Box>
                      <Typography sx={{ fontSize: t.typography.fontSize.sm, fontWeight: 600 }}>{org.employeeStats.offboarded}</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              <Box 
                sx={{ 
                  mt: 2, 
                  p: 2, 
                  borderRadius: 2, 
                  bgcolor: isDark ? alpha("#fff", 0.03) : alpha("#000", 0.02),
                  border: "1px dashed",
                  borderColor: "divider"
                }}
              >
                <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", fontStyle: "italic", textAlign: "center" }}>
                  Asset serial numbers and assignment details are restricted from Platform Admin view.
                </Typography>
              </Box>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
