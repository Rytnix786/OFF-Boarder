"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Box, Typography, alpha, useTheme, CircularProgress, AppBar, Toolbar, Chip } from "@mui/material";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AuthSession } from "@/lib/auth-types";
import AdminProfileMenu from "./AdminProfileMenu";
import { createClient } from "@/lib/supabase/client";

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
  { href: "/admin", label: "Overview", icon: "monitoring" },
  { href: "/admin/organizations", label: "Organizations", icon: "corporate_fare" },
  { href: "/admin/support-tickets", label: "Support Tickets", icon: "support_agent" },
  { href: "/admin/policies", label: "Global Policies", icon: "gavel" },
  { href: "/admin/signals", label: "Signals", icon: "notifications_active" },
  { href: "/admin/audit", label: "Audit Log", icon: "history" },
  { href: "/admin/users", label: "Users", icon: "people" },
  { href: "/admin/ip-blocking", label: "IP Blocking", icon: "block" },
];

function PlatformSidebar({ incidentMode }: { incidentMode: boolean }) {
  const pathname = usePathname();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      component="nav"
      sx={{
        width: 260,
        flexShrink: 0,
        bgcolor: incidentMode
          ? alpha("#1c1917", 0.98)
          : isDark
          ? "#0a0a0b"
          : "#fafafa",
        borderRight: "1px solid",
        borderColor: incidentMode ? alpha("#dc2626", 0.25) : isDark ? "#18181b" : "#e5e7eb",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 1200,
      }}
    >
      <Box sx={{ p: 4, pb: 3, borderBottom: "1px solid", borderColor: incidentMode ? alpha("#dc2626", 0.15) : isDark ? "#18181b" : "#e5e7eb" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1,
              bgcolor: incidentMode ? alpha("#dc2626", 0.12) : alpha("#6366f1", 0.08),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 20, color: incidentMode ? "#dc2626" : "#6366f1" }}
            >
              shield
            </span>
          </Box>
            <Box>
              <Typography
                sx={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: isDark ? "#fafafa" : "#0f172a",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.3,
                }}
              >
                Platform Admin
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: incidentMode ? "#dc2626" : isDark ? "#71717a" : "#9ca3af",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {incidentMode ? "INCIDENT MODE" : "Control Plane"}
              </Typography>
            </Box>
        </Box>
      </Box>

      <Box sx={{ flex: 1, py: 3, px: 2, display: "flex", flexDirection: "column", gap: 0.75, overflowY: "auto" }}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  px: 2,
                  py: 1.5,
                  borderRadius: 1,
                  transition: "all 120ms ease",
                  bgcolor: isActive
                    ? incidentMode
                      ? alpha("#dc2626", 0.12)
                      : alpha("#6366f1", 0.08)
                    : "transparent",
                  "&:hover": {
                    bgcolor: isActive
                      ? undefined
                      : incidentMode
                      ? alpha("#dc2626", 0.06)
                      : isDark
                      ? "#141416"
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
                      ? "#52525b"
                      : "#9ca3af",
                  }}
                >
                  {item.icon}
                </span>
                <Typography
                    sx={{
                      fontSize: "0.9375rem",
                      fontWeight: isActive ? 600 : 500,
                      color: isActive
                        ? incidentMode
                          ? "#dc2626"
                          : isDark
                          ? "#fafafa"
                          : "#0f172a"
                        : isDark
                        ? "#a1a1aa"
                        : "#52525b",
                      letterSpacing: "-0.01em",
                      lineHeight: 1.4,
                    }}
                  >
                  {item.label}
                </Typography>
              </Box>
            </Link>
          );
        })}
      </Box>
    </Box>
  );
}

export default function AdminLayout({ children, session }: { children: React.ReactNode; session: AuthSession }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [incidentMode, setIncidentMode] = useState(false);
  const [platformStatus, setPlatformStatus] = useState<"OPERATIONAL" | "DEGRADED" | "INCIDENT" | "MAINTENANCE">("OPERATIONAL");
  const [signingOut, setSigningOut] = useState(false);
  const [, setRefreshKey] = useState(0);

  const refreshData = () => setRefreshKey((k) => k + 1);

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await fetch("/api/platform/auth/sign-out", { method: "POST" }).catch(() => {});
      const supabase = createClient();
      await supabase.auth.signOut();
      localStorage.clear();
      window.location.href = "/login";
    } catch (error) {
      console.error("Sign out failed", error);
      setSigningOut(false);
    }
  };

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

  if (loading || signingOut) {
    return (
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: isDark ? "#09090b" : "#fafafa",
          gap: 2
        }}
      >
        <CircularProgress size={28} sx={{ color: "#6366f1" }} />
        {signingOut && (
          <Typography sx={{ fontSize: "0.875rem", fontWeight: 500, color: "text.secondary" }}>
            Securing session and signing out...
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <PlatformContext.Provider value={{ incidentMode, setIncidentMode, platformStatus, refreshData }}>
      <Box
        sx={{
          display: "flex",
          minHeight: "100vh",
          bgcolor: incidentMode ? "#0c0908" : isDark ? "#09090b" : "#f4f4f5",
        }}
      >
          <PlatformSidebar incidentMode={incidentMode} />
        <Box sx={{ flex: 1, ml: "260px", display: "flex", flexDirection: "column" }}>
          <AppBar
            position="sticky"
            elevation={0}
            sx={{
              bgcolor: isDark ? alpha("#09090b", 0.8) : alpha("#ffffff", 0.8),
              backdropFilter: "blur(12px)",
              borderBottom: "1px solid",
              borderColor: isDark ? "#18181b" : "#e5e7eb",
              zIndex: 1100,
            }}
          >
            <Toolbar sx={{ justifyContent: "space-between", px: { xs: 2, md: 4 } }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {incidentMode && (
                  <Chip
                    label="INCIDENT RESPONSE ACTIVE"
                    size="small"
                    sx={{
                      bgcolor: alpha("#dc2626", 0.1),
                      color: "#dc2626",
                      fontWeight: 700,
                      fontSize: "0.6875rem",
                      border: "1px solid",
                      borderColor: alpha("#dc2626", 0.2),
                    }}
                  />
                )}
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <AdminProfileMenu session={session} />
              </Box>
            </Toolbar>
          </AppBar>

          {incidentMode && (
            <Box
              sx={{
                bgcolor: alpha("#dc2626", 0.08),
                borderBottom: `1px solid ${alpha("#dc2626", 0.2)}`,
                px: 4,
                py: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: "#dc2626",
                    boxShadow: "0 0 8px rgba(220, 38, 38, 0.6)",
                    animation: "pulse 2s infinite",
                  }}
                />
                <Typography
                  sx={{
                    fontSize: "0.8125rem",
                    fontWeight: 700,
                    color: "#dc2626",
                    letterSpacing: "0.02em",
                  }}
                >
                  INCIDENT MODE ACTIVE
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  color: alpha("#dc2626", 0.7),
                }}
              >
                Elevated controls • Critical data prioritized • Non-essential suppressed
              </Typography>
            </Box>
          )}
          <Box
            sx={{
              flex: 1,
              p: { xs: 3, md: 5 },
              maxWidth: 1600,
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </PlatformContext.Provider>
  );
}

