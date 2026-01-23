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
    <Box sx={{ p: { xs: 3, md: 6 }, bgcolor: "transparent" }}>
      <Box sx={{ mb: 6 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1.5 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: "12px",
              bgcolor: alpha("#6366f1", 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid",
              borderColor: alpha("#6366f1", 0.3),
              boxShadow: "0 0 20px rgba(99, 102, 241, 0.15)",
            }}
          >
            <span className="material-symbols-outlined" style={{ color: "#818cf8", fontSize: "24px" }}>
              monitoring
            </span>
          </Box>
          <Typography
            variant="h4"
            fontWeight={900}
            sx={{
              color: "#f8fafc",
              letterSpacing: "-0.03em",
              fontSize: { xs: "1.75rem", md: "2.5rem" },
              textShadow: "0 2px 10px rgba(0,0,0,0.3)",
            }}
          >
            Organization Intelligence
          </Typography>
        </Box>
        <Typography variant="body1" sx={{ color: "#94a3b8", fontWeight: 500, maxWidth: "700px", lineHeight: 1.6 }}>
          Comprehensive read-only overview of <span style={{ color: "#818cf8", fontWeight: 800 }}>{organizationName}</span>. 
          Audit active offboardings, risk signals, and compliance evidence in real-time.
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
                borderRadius: "20px",
                border: "1px solid",
                borderColor: alpha("#ffffff", 0.05),
                bgcolor: alpha("#0f172a", 0.4),
                backdropFilter: "blur(10px)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                overflow: "hidden",
                position: "relative",
                "&:hover": {
                  transform: "translateY(-6px)",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
                  borderColor: alpha(stat.color, 0.3),
                  bgcolor: alpha("#1e293b", 0.6),
                  "& .stat-icon-bg": { transform: "scale(1.1)", bgcolor: alpha(stat.color, 0.2) },
                },
              }}
            >
              <CardContent sx={{ p: 3.5 }}>
                <Box
                  className="stat-icon-bg"
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "14px",
                    bgcolor: alpha(stat.color, 0.1),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: stat.color,
                    mb: 2.5,
                    transition: "all 0.3s ease",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>
                    {stat.icon}
                  </span>
                </Box>
                <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", mb: 0.5 }}>
                  {stat.label}
                </Typography>
                <Typography variant="h4" sx={{ color: "#f8fafc", fontWeight: 900, letterSpacing: "-0.02em" }}>
                  {stat.value}
                </Typography>
                
                {/* Decorative background element */}
                <Box sx={{ 
                  position: "absolute", 
                  bottom: -20, 
                  right: -20, 
                  opacity: 0.03, 
                  transform: "rotate(-15deg)" 
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "100px", color: stat.color }}>
                    {stat.icon}
                  </span>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Main Dashboard Content - Seamless integration with the dark layout */}
      <Box
        sx={{
          bgcolor: alpha("#0f172a", 0.3),
          borderRadius: "32px",
          border: "1px solid",
          borderColor: alpha("#ffffff", 0.05),
          p: { xs: 3, md: 5 },
          boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "2px",
            background: `linear-gradient(90deg, transparent, ${alpha("#6366f1", 0.5)}, transparent)`,
          }
        }}
      >
        <Box sx={{ position: "relative", zIndex: 1 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
