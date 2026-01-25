"use client";

import React from "react";
import { Box, useTheme, alpha } from "@mui/material";
import { motion } from "framer-motion";

interface RotatingProtocolIconProps {
  size?: number;
}

export function RotatingProtocolIcon({ size = 20 }: RotatingProtocolIconProps) {
  const theme = useTheme();
  const green = theme.palette.primary.main;

  return (
    <Box
      sx={{
        width: size,
        height: size,
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        component={motion.div}
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        sx={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          border: `2px solid ${alpha(green, 0.2)}`,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Outer Ring Elements (tails/dots) */}
        {[0, 120, 240].map((deg) => (
          <Box
            key={deg}
            sx={{
              position: "absolute",
              width: size * 0.15,
              height: size * 0.15,
              bgcolor: green,
              borderRadius: "50%",
              top: "50%",
              left: "50%",
              transform: `rotate(${deg}deg) translateY(-${size * 0.4}px) translateX(-50%)`,
              transformOrigin: "0 0",
              "&::before": {
                content: '""',
                position: "absolute",
                top: -size * 0.08,
                right: -size * 0.05,
                width: size * 0.2,
                height: size * 0.15,
                boxSizing: "border-box",
                borderLeft: `${size * 0.2}px solid ${green}`,
                borderRadius: "100% 0 0",
              }
            }}
          />
        ))}

        {/* Center Circle */}
        <Box
          sx={{
            width: size * 0.2,
            height: size * 0.2,
            borderRadius: "50%",
            bgcolor: green,
            boxShadow: `0 0 ${size * 0.5}px 1px ${green}`,
          }}
        />
      </Box>
    </Box>
  );
}
