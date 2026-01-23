"use client";

import { Box, Typography, Grid, Card, CardContent, alpha } from "@mui/material";
import { ReactNode } from "react";

interface OrgViewDashboardClientProps {
  organizationName: string;
  children: ReactNode;
}

export function OrgViewDashboardClient({
  organizationName,
  children,
}: OrgViewDashboardClientProps) {
  return (
    <Box sx={{ p: { xs: 3, md: 6 } }}>
      <Box sx={{ mb: 6 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "8px",
              bgcolor: alpha("#6366f1", 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid",
              borderColor: alpha("#6366f1", 0.2),
            }}
          >
            <span className="material-symbols-outlined" style={{ color: "#6366f1", fontSize: "20px" }}>
              monitoring
            </span>
          </Box>
          <Typography
            variant="h4"
            fontWeight={900}
            sx={{
              color: "#0f172a",
              letterSpacing: "-0.02em",
              fontSize: { xs: "1.5rem", md: "2rem" },
            }}
          >
            Organization Intelligence
          </Typography>
        </Box>
        <Typography variant="body1" sx={{ color: "#64748b", fontWeight: 500, maxWidth: "600px" }}>
          Comprehensive read-only overview of <span style={{ color: "#0f172a", fontWeight: 700 }}>{organizationName}</span>. 
          Audit active offboardings, risk signals, and compliance evidence.
        </Typography>
      </Box>

      {/* Stats Overview Grid */}
      <Grid container spacing={3} sx={{ mb: 6 }}>
        {[
          { label: "Active Employees", value: "24", icon: "badge", color: "#6366f1" },
          { label: "Pending Offboardings", value: "3", icon: "timer", color: "#f59e0b" },
          { label: "Risk Signals", value: "High", icon: "warning", color: "#ef4444" },
          { label: "Last Sync", value: "2m ago", icon: "sync", color: "#10b981" },
        ].map((stat, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card
              sx={{
                borderRadius: "16px",
                border: "1px solid",
                borderColor: alpha("#e2e8f0", 0.8),
                boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 12px 24px rgba(0,0,0,0.06)",
                  borderColor: alpha(stat.color, 0.4),
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "10px",
                    bgcolor: alpha(stat.color, 0.1),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: stat.color,
                    mb: 2,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                    {stat.icon}
                  </span>
                </Box>
                <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", mb: 0.5 }}>
                  {stat.label}
                </Typography>
                <Typography variant="h5" sx={{ color: "#0f172a", fontWeight: 800 }}>
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Main Dashboard Content - The Server Component will be injected here */}
      <Box
        sx={{
          bgcolor: "#ffffff",
          borderRadius: "24px",
          border: "1px solid",
          borderColor: "#e2e8f0",
          p: { xs: 2, md: 4 },
          boxShadow: "0 4px 30px rgba(0,0,0,0.03)",
          position: "relative",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            bgcolor: "#6366f1",
            borderTopLeftRadius: "24px",
            borderTopRightRadius: "24px",
          }
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
