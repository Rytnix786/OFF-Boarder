"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  alpha,
  useTheme,
  Button,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
} from "@mui/material";
import { stitchTokens } from "@/theme/tokens";

const t = stitchTokens;

type Session = {
  id: string;
  deviceName: string;
  browser: string;
  os: string;
  location: string;
  ipAddress: string | null;
  lastActive: string | null;
  createdAt: string;
  rememberDevice: boolean;
  isCurrent: boolean;
};

const DEVICE_ICONS: Record<string, string> = {
  Desktop: "computer",
  "Mobile Device": "smartphone",
  Tablet: "tablet",
};

const OS_ICONS: Record<string, string> = {
  Windows: "window",
  macOS: "laptop_mac",
  Linux: "terminal",
  Android: "android",
  iOS: "phone_iphone",
};

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Unknown";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US");
}

function SessionCard({
  session,
  onRevoke,
  revoking,
}: {
  session: Session;
  onRevoke: (id: string) => void;
  revoking: boolean;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const deviceIcon = DEVICE_ICONS[session.deviceName] || "devices";
  const osName = session.os.split(" ")[0];
  const osIcon = OS_ICONS[osName] || "computer";

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 2,
        bgcolor: isDark ? "#18181b" : "#fff",
        border: "1px solid",
        borderColor: session.isCurrent
          ? alpha("#22c55e", 0.3)
          : isDark
          ? "#27272a"
          : "#e5e7eb",
        display: "flex",
        alignItems: "flex-start",
        gap: 2.5,
        position: "relative",
        transition: "border-color 150ms ease",
        "&:hover": {
          borderColor: session.isCurrent
            ? alpha("#22c55e", 0.4)
            : isDark
            ? "#3f3f46"
            : "#d1d5db",
        },
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 2,
          bgcolor: session.isCurrent
            ? alpha("#22c55e", 0.1)
            : isDark
            ? alpha("#6366f1", 0.1)
            : alpha("#6366f1", 0.08),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: 24,
            color: session.isCurrent ? "#22c55e" : "#6366f1",
          }}
        >
          {deviceIcon}
        </span>
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
          <Typography
            sx={{
              fontSize: t.typography.fontSize.base,
              fontWeight: 600,
              color: isDark ? "#fff" : "#0f172a",
            }}
          >
            {session.browser}
          </Typography>
          {session.isCurrent && (
            <Chip
              label="Current Session"
              size="small"
              sx={{
                height: 20,
                fontSize: 10,
                fontWeight: 600,
                bgcolor: alpha("#22c55e", 0.1),
                color: "#22c55e",
                border: `1px solid ${alpha("#22c55e", 0.3)}`,
              }}
            />
          )}
          {session.rememberDevice && (
            <Tooltip title="This device is remembered for 30 days">
              <Chip
                icon={
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 14 }}
                  >
                    verified
                  </span>
                }
                label="Trusted"
                size="small"
                sx={{
                  height: 20,
                  fontSize: 10,
                  fontWeight: 600,
                  bgcolor: alpha("#6366f1", 0.1),
                  color: "#6366f1",
                  border: `1px solid ${alpha("#6366f1", 0.3)}`,
                  "& .MuiChip-icon": { color: "#6366f1", ml: 0.5 },
                }}
              />
            </Tooltip>
          )}
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 3,
            flexWrap: "wrap",
            mb: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 16,
                color: isDark ? "#71717a" : "#9ca3af",
              }}
            >
              {osIcon}
            </span>
            <Typography
              sx={{
                fontSize: t.typography.fontSize.sm,
                color: isDark ? "#a1a1aa" : "#52525b",
              }}
            >
              {session.os}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 16,
                color: isDark ? "#71717a" : "#9ca3af",
              }}
            >
              location_on
            </span>
            <Typography
              sx={{
                fontSize: t.typography.fontSize.sm,
                color: isDark ? "#a1a1aa" : "#52525b",
              }}
            >
              {session.location}
            </Typography>
          </Box>

          {session.ipAddress && (
            <Typography
              sx={{
                fontSize: t.typography.fontSize.xs,
                color: isDark ? "#52525b" : "#9ca3af",
                fontFamily: "monospace",
              }}
            >
              {session.ipAddress}
            </Typography>
          )}
        </Box>

        <Typography
          sx={{
            fontSize: t.typography.fontSize.xs,
            color: isDark ? "#52525b" : "#9ca3af",
          }}
        >
          Last active: {formatRelativeTime(session.lastActive)} • Signed in:{" "}
          {new Date(session.createdAt).toLocaleDateString("en-US")}
        </Typography>
      </Box>

      {!session.isCurrent && (
        <Button
          variant="outlined"
          size="small"
          onClick={() => onRevoke(session.id)}
          disabled={revoking}
          sx={{
            fontSize: t.typography.fontSize.xs,
            fontWeight: 600,
            textTransform: "none",
            borderColor: isDark ? "#3f3f46" : "#d1d5db",
            color: isDark ? "#a1a1aa" : "#52525b",
            minWidth: 80,
            "&:hover": {
              borderColor: "#dc2626",
              color: "#dc2626",
              bgcolor: alpha("#dc2626", 0.05),
            },
          }}
        >
          {revoking ? <CircularProgress size={14} /> : "Revoke"}
        </Button>
      )}
    </Box>
  );
}

export default function SessionsClient() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeAllDialog, setRevokeAllDialog] = useState(false);
  const [revokingAll, setRevokingAll] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions);
      }
    } catch (e) {
      console.error("Failed to fetch sessions", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRevoke = async (sessionId: string) => {
    setRevoking(sessionId);
    try {
      const res = await fetch(
        `/api/sessions?sessionId=${sessionId}&reason=User%20revoked%20session`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      }
    } catch (e) {
      console.error("Failed to revoke session", e);
    }
    setRevoking(null);
  };

  const handleRevokeAll = async () => {
    setRevokingAll(true);
    try {
      const res = await fetch(
        `/api/sessions?revokeAll=true&reason=User%20revoked%20all%20sessions`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.isCurrent));
        setRevokeAllDialog(false);
      }
    } catch (e) {
      console.error("Failed to revoke all sessions", e);
    }
    setRevokingAll(false);
  };

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          mb: 4,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: t.typography.fontSize.xl,
              fontWeight: 700,
              color: isDark ? "#fff" : "#0f172a",
              mb: 0.5,
            }}
          >
            Active Sessions
          </Typography>
          <Typography
            sx={{
              fontSize: t.typography.fontSize.sm,
              color: isDark ? "#71717a" : "#6b7280",
            }}
          >
            Manage devices and browsers where you're signed in. Sessions are
            automatically invalidated when your password changes or an admin
            revokes access.
          </Typography>
        </Box>
        {otherSessionsCount > 0 && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => setRevokeAllDialog(true)}
            sx={{
              fontSize: t.typography.fontSize.xs,
              fontWeight: 600,
              textTransform: "none",
              borderColor: "#dc2626",
              color: "#dc2626",
              "&:hover": {
                bgcolor: alpha("#dc2626", 0.05),
                borderColor: "#dc2626",
              },
            }}
          >
            Revoke All Other Sessions
          </Button>
        )}
      </Box>

      <Box
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          bgcolor: isDark ? alpha("#6366f1", 0.08) : alpha("#6366f1", 0.05),
          border: "1px solid",
          borderColor: alpha("#6366f1", 0.2),
        }}
      >
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 20, color: "#6366f1" }}
          >
            security
          </span>
          <Box>
            <Typography
              sx={{
                fontSize: t.typography.fontSize.sm,
                fontWeight: 600,
                color: isDark ? "#a5b4fc" : "#4f46e5",
                mb: 0.5,
              }}
            >
              Enterprise Session Security
            </Typography>
            <Typography
              sx={{
                fontSize: t.typography.fontSize.xs,
                color: isDark ? "#a1a1aa" : "#52525b",
                lineHeight: 1.6,
              }}
            >
              Your sessions are protected with secure, httpOnly refresh tokens.
              Sessions are automatically invalidated if your password changes,
              your role changes, you are offboarded, or an admin revokes access.
              Devices with "Remember this device" enabled remain trusted for 30
              days.
            </Typography>
          </Box>
        </Box>
      </Box>

      {loading ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            py: 8,
          }}
        >
          <CircularProgress size={32} sx={{ color: "#6366f1" }} />
        </Box>
      ) : sessions.length === 0 ? (
        <Box
          sx={{
            py: 8,
            textAlign: "center",
            bgcolor: isDark ? "#18181b" : "#f9fafb",
            borderRadius: 2,
            border: "1px solid",
            borderColor: isDark ? "#27272a" : "#e5e7eb",
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 48,
              color: isDark ? "#3f3f46" : "#d1d5db",
              marginBottom: 8,
            }}
          >
            devices
          </span>
          <Typography
            sx={{
              fontSize: t.typography.fontSize.sm,
              color: isDark ? "#71717a" : "#6b7280",
            }}
          >
            No active sessions found
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onRevoke={handleRevoke}
              revoking={revoking === session.id}
            />
          ))}
        </Box>
      )}

      <Dialog
        open={revokeAllDialog}
        onClose={() => setRevokeAllDialog(false)}
        PaperProps={{
          sx: {
            bgcolor: isDark ? "#18181b" : "#fff",
            borderRadius: 2,
            maxWidth: 400,
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            pb: 1,
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              bgcolor: alpha("#dc2626", 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 20, color: "#dc2626" }}
            >
              logout
            </span>
          </Box>
          <Box>
            <Typography
              sx={{
                fontSize: t.typography.fontSize.lg,
                fontWeight: 700,
                color: isDark ? "#fff" : "#0f172a",
              }}
            >
              Revoke All Sessions
            </Typography>
            <Typography
              sx={{
                fontSize: t.typography.fontSize.xs,
                color: isDark ? "#71717a" : "#6b7280",
              }}
            >
              This will sign you out of all other devices
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography
            sx={{
              fontSize: t.typography.fontSize.sm,
              color: isDark ? "#a1a1aa" : "#52525b",
              mt: 1,
            }}
          >
            You will be signed out of {otherSessionsCount} other{" "}
            {otherSessionsCount === 1 ? "device" : "devices"}. Your current
            session will remain active.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button
            onClick={() => setRevokeAllDialog(false)}
            sx={{
              fontWeight: 600,
              color: isDark ? "#a1a1aa" : "#52525b",
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleRevokeAll}
            disabled={revokingAll}
            sx={{
              fontWeight: 600,
              bgcolor: "#dc2626",
              "&:hover": { bgcolor: "#b91c1c" },
            }}
          >
            {revokingAll ? "Revoking..." : "Revoke All"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
