"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Box, Typography, alpha, useTheme, CircularProgress, IconButton, Tooltip, Button } from "@mui/material";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { stitchTokens } from "@/theme/tokens";

const t = stitchTokens;

type PlatformContextType = {
  incidentMode: boolean;
  setIncidentMode: (mode: boolean) => void;
  platformStatus: "OPERATIONAL" | "DEGRADED" | "INCIDENT" | "MAINTENANCE";
  refreshData: () => void;
};

const PlatformContext = createContext<PlatformContextType>({
  incidentMode: false,
  setIncidentMode: () => {},
  platformStatus: "OPERATIONAL",
  refreshData: () => {},
});

export const usePlatformContext = () => useContext(PlatformContext);

const NAV_ITEMS = [
  { href: "/platform", label: "Overview", icon: "monitoring" },
    { href: "/platform/organizations", label: "Organizations", icon: "corporate_fare" },
    { href: "/platform/support-tickets", label: "Support Tickets", icon: "support_agent" },
    { href: "/platform/enterprise", label: "Enterprise Messages", icon: "shield" },
    { href: "/platform/policies", label: "Global Policies", icon: "policy" },
  { href: "/platform/signals", label: "Signals", icon: "notifications_active" },
  { href: "/platform/audit", label: "Audit Log", icon: "history" },
];

function PlatformSidebar({ incidentMode }: { incidentMode: boolean }) {
  const pathname = usePathname();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
      <Box
        component="nav"
        sx={{
          width: 240,
          flexShrink: 0,
          bgcolor: incidentMode
            ? alpha("#1c1917", 0.98)
            : isDark
            ? "#121214"
            : "#ffffff",
          borderRight: "1px solid",
          borderColor: incidentMode ? alpha("#dc2626", 0.3) : isDark ? "#1f1f23" : "#e2e8f0",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 1200,
          boxShadow: isDark ? "none" : "0 4px 6px -1px rgb(0 0 0 / 0.05)",
        }}
      >
        <Box 
          sx={{ 
            p: 3, 
            mb: 1,
            borderBottom: "1px solid", 
            borderColor: incidentMode ? alpha("#dc2626", 0.2) : isDark ? "#1f1f23" : "#f1f5f9" 
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: "8px",
                bgcolor: incidentMode ? alpha("#dc2626", 0.15) : isDark ? alpha("#6366f1", 0.15) : alpha("#6366f1", 0.1),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid",
                borderColor: incidentMode ? alpha("#dc2626", 0.3) : alpha("#6366f1", 0.2),
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 20, color: incidentMode ? "#ef4444" : "#818cf8" }}
              >
                shield
              </span>
            </Box>
            <Box>
              <Typography sx={{ fontSize: "0.875rem", fontWeight: 700, color: isDark ? "#f8fafc" : "#0f172a", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
                Platform Admin
              </Typography>
              <Typography sx={{ fontSize: "0.75rem", color: incidentMode ? "#ef4444" : isDark ? "#94a3b8" : "#64748b", fontWeight: 600, mt: 0.25 }}>
                {incidentMode ? "INCIDENT MODE" : "CONTROL PLANE"}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ flex: 1, py: 1, px: 1.5, display: "flex", flexDirection: "column", gap: 0.5, overflowY: "auto" }}>
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/platform" && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                  <Box
                    sx={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      px: 2,
                      py: 1.25,
                      borderRadius: "10px",
                      transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
                      bgcolor: isActive
                        ? incidentMode
                          ? alpha("#dc2626", 0.15)
                          : isDark ? alpha("#6366f1", 0.12) : alpha("#6366f1", 0.08)
                        : "transparent",
                      color: isActive
                        ? incidentMode ? "#ef4444" : isDark ? "#fff" : "#0f172a"
                        : isDark ? "#94a3b8" : "#64748b",
                      cursor: "pointer",
                      "&::before": {
                        content: '""',
                        position: "absolute",
                        left: 0,
                        top: "20%",
                        bottom: "20%",
                        width: "3px",
                        bgcolor: incidentMode ? "#ef4444" : "#6366f1",
                        borderRadius: "0 4px 4px 0",
                        opacity: isActive ? 1 : 0,
                        transition: "opacity 200ms ease",
                      },
                      "&:hover": {
                        bgcolor: isActive
                          ? incidentMode ? alpha("#dc2626", 0.2) : isDark ? alpha("#6366f1", 0.15) : alpha("#6366f1", 0.1)
                          : isDark ? alpha("#ffffff", 0.05) : alpha("#000000", 0.03),
                        color: isDark ? "#fff" : "#0f172a",
                        "& .material-symbols-outlined": {
                          color: isActive ? (incidentMode ? "#ef4444" : "#818cf8") : (isDark ? "#e2e8f0" : "#334155"),
                          transform: "scale(1.05)",
                        }
                      },
                      "&:focus-visible": {
                        outline: `2px solid ${incidentMode ? "#dc2626" : "#6366f1"}`,
                        outlineOffset: "-2px",
                      }
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: 20,
                        color: isActive
                          ? incidentMode
                            ? "#ef4444"
                            : "#6366f1"
                          : "inherit",
                        transition: "all 200ms ease",
                      }}
                    >
                      {item.icon}
                    </span>
                    <Typography
                      sx={{
                        fontSize: "0.875rem",
                        fontWeight: isActive ? 600 : 500,
                        color: "inherit",
                        transition: "color 200ms ease",
                      }}
                    >
                      {item.label}
                    </Typography>
                  </Box>
                </Link>
              );
            })}
          </Box>

          <Box sx={{ p: 2, borderTop: "1px solid", borderColor: incidentMode ? alpha("#dc2626", 0.2) : isDark ? "#1f1f23" : "#f1f5f9" }}>
            <Link href="/app" style={{ textDecoration: "none" }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  px: 2,
                  py: 1.25,
                  borderRadius: "10px",
                  transition: "all 200ms ease",
                  color: isDark ? "#94a3b8" : "#64748b",
                  "&:hover": {
                    bgcolor: isDark ? alpha("#ffffff", 0.05) : alpha("#000000", 0.03),
                    color: isDark ? "#fff" : "#0f172a",
                  },
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  arrow_back
                </span>
                <Typography sx={{ fontSize: "0.875rem", fontWeight: 500 }}>
                  Back to App
                </Typography>
              </Box>
            </Link>
          </Box>
      </Box>
    );
  }

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [loading, setLoading] = useState(true);
  const [incidentMode, setIncidentMode] = useState(false);
  const [platformStatus, setPlatformStatus] = useState<"OPERATIONAL" | "DEGRADED" | "INCIDENT" | "MAINTENANCE">("OPERATIONAL");
  const [, setRefreshKey] = useState(0);

  const refreshData = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/platform/incident-mode");
        if (res.ok) {
          const data = await res.json();
          setIncidentMode(data.incidentMode);
          setPlatformStatus(data.status);
        }
      } catch (e) {
        console.error("Failed to fetch platform status", e);
      }
      setLoading(false);
    };
    fetchStatus();
  }, []);

  if (loading) {
    return (
      <Box sx={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: isDark ? "#0c0c0e" : "#fafafa" }}>
        <CircularProgress size={32} sx={{ color: "#6366f1" }} />
      </Box>
    );
  }

  return (
    <PlatformContext.Provider value={{ incidentMode, setIncidentMode, platformStatus, refreshData }}>
      <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: incidentMode ? "#0f0a09" : isDark ? "#09090b" : "#f4f4f5" }}>
        <PlatformSidebar incidentMode={incidentMode} />
        <Box sx={{ flex: 1, ml: "240px", display: "flex", flexDirection: "column" }}>
          {incidentMode && (
            <Box
              sx={{
                bgcolor: alpha("#dc2626", 0.1),
                borderBottom: `1px solid ${alpha("#dc2626", 0.3)}`,
                px: 3,
                py: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#dc2626", animation: "pulse 1.5s infinite" }} />
                <Typography sx={{ fontSize: t.typography.fontSize.sm, fontWeight: 600, color: "#dc2626" }}>
                  INCIDENT MODE ACTIVE
                </Typography>
              </Box>
              <Typography sx={{ fontSize: t.typography.fontSize.xs, color: "#dc2626", opacity: 0.8 }}>
                Elevated UI • Critical data only • Noise suppressed
              </Typography>
            </Box>
          )}
          <Box sx={{ flex: 1, p: 4 }}>
            {children}
          </Box>
        </Box>
      </Box>
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </PlatformContext.Provider>
  );
}
