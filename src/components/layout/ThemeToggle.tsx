"use client";

import React from "react";
import { IconButton, useTheme, Tooltip, Box } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { ColorModeContext } from "@/theme/ThemeRegistry";

interface ThemeToggleProps {
    size?: "small" | "medium" | "large";
}

export function ThemeToggle({ size = "medium" }: ThemeToggleProps) {
    const theme = useTheme();
    const colorMode = React.useContext(ColorModeContext);
    const isDark = theme.palette.mode === "dark";

    const dimensions = size === "small" ? 34 : size === "medium" ? 42 : 46;
    const iconSize = size === "small" ? 18 : 20;

    return (
        <Tooltip title={isDark ? "Switch to light mode" : "Switch to dark mode"}>
            <IconButton
                onClick={colorMode.toggleColorMode}
                sx={{
                    position: "relative",
                    width: dimensions,
                    height: dimensions,
                    borderRadius: "12px",
                    bgcolor: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.03)",
                    color: isDark ? "primary.light" : "primary.main",
                    border: "1px solid",
                    borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
                    backdropFilter: "blur(8px)",
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    overflow: "hidden",
                    "&::before": {
                        content: '""',
                        position: "absolute",
                        inset: 0,
                        background: isDark 
                            ? "linear-gradient(135deg, rgba(255,255,255,0.1), transparent)" 
                            : "linear-gradient(135deg, rgba(0,0,0,0.05), transparent)",
                        opacity: 0,
                        transition: "opacity 0.3s ease",
                    },
                    "&:hover": {
                        bgcolor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
                        transform: "translateY(-2px)",
                        borderColor: isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.15)",
                        boxShadow: isDark 
                            ? `0 8px 20px -4px rgba(0,0,0,0.5), 0 0 15px ${theme.palette.primary.main}33` 
                            : "0 8px 20px -4px rgba(0,0,0,0.1)",
                        "&::before": {
                            opacity: 1,
                        }
                    },
                    "&:active": {
                        transform: "translateY(0) scale(0.92)",
                    }
                }}
            >
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={theme.palette.mode}
                        initial={{ y: 20, opacity: 0, rotate: -45 }}
                        animate={{ y: 0, opacity: 1, rotate: 0 }}
                        exit={{ y: -20, opacity: 0, rotate: 45 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}
                    >
                        {isDark ? (
                            <svg
                                width={iconSize}
                                height={iconSize}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.2" />
                                <path d="M12 2v2" />
                                <path d="M12 20v2" />
                                <path d="m4.93 4.93 1.41 1.41" />
                                <path d="m17.66 17.66 1.41 1.41" />
                                <path d="M2 12h2" />
                                <path d="M20 12h2" />
                                <path d="m6.34 17.66-1.41 1.41" />
                                <path d="m19.07 4.93-1.41 1.41" />
                            </svg>
                        ) : (
                            <svg
                                width={iconSize}
                                height={iconSize}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" fill="currentColor" fillOpacity="0.1" />
                            </svg>
                        )}
                    </motion.div>
                </AnimatePresence>
            </IconButton>
        </Tooltip>
    );
}
