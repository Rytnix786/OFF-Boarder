"use client";

import React, { useState, useEffect } from "react";
import { Box, Typography, alpha, useTheme } from "@mui/material";

interface CountdownBannerProps {
  revokedAt: string | Date | null;
  accessExpiresAt?: string | Date | null;
  gracePeriodHours?: number;
}

export function CountdownBanner({ revokedAt, accessExpiresAt, gracePeriodHours = 24 }: CountdownBannerProps) {
  const theme = useTheme();
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    let expiryDate: Date;

    if (accessExpiresAt) {
      expiryDate = new Date(accessExpiresAt);
    } else if (revokedAt) {
      const revokedDate = new Date(revokedAt);
      expiryDate = new Date(revokedDate.getTime() + gracePeriodHours * 60 * 60 * 1000);
    } else {
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const diff = expiryDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("00:00:00");
        setIsExpired(true);
        // Page should be hard-locked by middleware/server-auth anyway, 
        // but we can trigger a refresh if we're still on the page
        window.location.reload();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [revokedAt, gracePeriodHours]);

  if (isExpired) return null;

  return (
    <Box
      sx={{
        width: "100%",
        bgcolor: alpha(theme.palette.error.main, 0.05),
        borderBottom: "1px solid",
        borderColor: alpha(theme.palette.error.main, 0.2),
        py: 1.5,
        px: 3,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 1.5,
        position: "relative",
        zIndex: 1100,
        backdropFilter: "blur(8px)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          color: "error.main",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
          warning
        </span>
        <Typography variant="body2" fontWeight={700} sx={{ letterSpacing: "0.01em" }}>
          Final Access:
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ color: "text.primary" }}>
        Your compliance window expires in{" "}
        <Box
          component="span"
          sx={{
            fontFamily: "monospace",
            fontWeight: 700,
            bgcolor: alpha(theme.palette.error.main, 0.1),
            color: "error.main",
            px: 1,
            py: 0.2,
            borderRadius: 1,
            mx: 0.5,
            fontSize: "1rem",
          }}
        >
          {timeLeft}
        </Box>
        . Please complete all tasks to ensure a smooth offboarding.
      </Typography>
    </Box>
  );
}
