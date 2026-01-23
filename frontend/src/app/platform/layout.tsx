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
    { href: "/platform/enterprise", label: "Enterprise Support", icon: "forum" },
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
          ? "#0c0c0e"
          : "#fafafa",
        borderRight: "1px solid",
        borderColor: incidentMode ? alpha("#dc2626", 0.3) : isDark ? "#1f1f23" : "#e5e7eb",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 1200,
      }}
    >
      <Box sx={{ p: 3, borderBottom: "1px solid", borderColor: incidentMode ? alpha("#dc2626", 0.2) : isDark ? "#1f1f23" : "#e5e7eb" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              bgcolor: incidentMode ? alpha("#dc2626", 0.15) : alpha("#6366f1", 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 18, color: incidentMode ? "#dc2626" : "#6366f1" }}
            >
              shield
            </span>
          </Box>
          <Box>
            <Typography sx={{ fontSize: t.typography.fontSize.sm, fontWeight: 700, color: isDark ? "#fff" : "#0f172a", letterSpacing: "-0.01em" }}>
              Platform Admin
            </Typography>
            <Typography sx={{ fontSize: t.typography.fontSize.xs, color: incidentMode ? "#dc2626" : isDark ? "#71717a" : "#6b7280", fontWeight: 500 }}>
              {incidentMode ? "INCIDENT MODE" : "Control Plane"}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ flex: 1, py: 2, px: 1.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/platform" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    px: 1.5,
                    py: 1.25,
                    borderRadius: 1.5,
                    transition: "all 150ms ease",
                    bgcolor: isActive
                      ? incidentMode
                        ? alpha("#dc2626", 0.15)
                        : alpha("#6366f1", 0.1)
                      : "transparent",
                    "&:hover": {
                      bgcolor: isActive
                        ? undefined
                        : incidentMode
                        ? alpha("#dc2626", 0.08)
                        : isDark
                        ? "#18181b"
                        : "#f4f4f5",
                    },
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: 20,
                      color: isActive
                        ? incidentMode
                          ? "#dc2626"
                          : "#6366f1"
                        : isDark
                        ? "#71717a"
                        : "#6b7280",
                    }}
                  >
                    {item.icon}
                  </span>
                  <Typography
                    sx={{
                      fontSize: t.typography.fontSize.sm,
                      fontWeight: isActive ? 600 : 500,
                      color: isActive
                        ? incidentMode
                          ? "#dc2626"
                          : isDark
                          ? "#fff"
                          : "#0f172a"
                        : isDark
                        ? "#a1a1aa"
                        : "#52525b",
                    }}
                  >
                    {item.label}
                  </Typography>
                </Box>
              </Link>
            );
          })}
        </Box>

        <Box sx={{ p: 2, borderTop: "1px solid", borderColor: incidentMode ? alpha("#dc2626", 0.2) : isDark ? "#1f1f23" : "#e5e7eb" }}>
          <Link href="/app" style={{ textDecoration: "none" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: 1.5,
                py: 1.25,
                borderRadius: 1.5,
                mb: 0.5,
                transition: "all 150ms ease",
                "&:hover": {
                  bgcolor: incidentMode ? alpha("#dc2626", 0.08) : isDark ? "#18181b" : "#f4f4f5",
                },
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: isDark ? "#71717a" : "#6b7280" }}>
                arrow_back
              </span>
              <Typography sx={{ fontSize: t.typography.fontSize.sm, fontWeight: 500, color: isDark ? "#a1a1aa" : "#52525b" }}>
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
