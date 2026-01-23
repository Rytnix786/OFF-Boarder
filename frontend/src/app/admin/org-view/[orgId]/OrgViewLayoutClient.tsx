"use client";

import { Box, Typography, Button, alpha, Divider, Chip, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface NavItem {
  label: string;
  icon: string;
  href: string;
}

interface OrgViewLayoutClientProps {
  children: ReactNode;
  organizationName: string;
  navItems: NavItem[];
  exitAction: () => Promise<void>;
}

export function OrgViewLayoutClient({
  children,
  organizationName,
  navItems,
  exitAction,
}: OrgViewLayoutClientProps) {
  const pathname = usePathname();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh", bgcolor: "#0f172a" }}>
      {/* Top Banner - High Contrast Audit Mode */}
      <Box
        sx={{
          bgcolor: "#1e293b",
          color: "#f8fafc",
          px: 4,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 2000,
          borderBottom: "1px solid",
          borderColor: alpha("#ffffff", 0.08),
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              bgcolor: alpha("#6366f1", 0.15),
              px: 2,
              py: 0.75,
              borderRadius: "6px",
              border: "1px solid",
              borderColor: alpha("#6366f1", 0.3),
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#818cf8" }}>
              admin_panel_settings
            </span>
            <Typography
              variant="caption"
              sx={{
                color: "#818cf8",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                lineHeight: 1,
              }}
            >
              Org View
            </Typography>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ borderColor: alpha("#ffffff", 0.1), height: 20, my: "auto" }} />

          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 500, mb: -0.5 }}>
              Active Troubleshooting
            </Typography>
            <Typography variant="body2" fontWeight={700} sx={{ color: "#f8fafc" }}>
              {organizationName}
            </Typography>
          </Box>

          <Chip
            label="READ-ONLY"
            size="small"
            sx={{
              bgcolor: alpha("#f59e0b", 0.1),
              color: "#fbbf24",
              fontWeight: 800,
              fontSize: "0.65rem",
              border: "1px solid",
              borderColor: alpha("#f59e0b", 0.3),
              height: 20,
              "& .MuiChip-label": { px: 1 },
            }}
          />
        </Box>

        <form action={exitAction}>
          <Button
            type="submit"
            variant="contained"
            size="small"
            startIcon={<span className="material-symbols-outlined">logout</span>}
            sx={{
              bgcolor: alpha("#ef4444", 0.9),
              "&:hover": { bgcolor: "#ef4444", boxShadow: "0 0 15px rgba(239, 68, 68, 0.4)" },
              textTransform: "none",
              fontWeight: 700,
              borderRadius: "6px",
              px: 2,
            }}
          >
            Exit Session
          </Button>
        </form>
      </Box>

      <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar - Sleek Dark Aesthetic */}
        <Box
          sx={{
            width: 280,
            bgcolor: "#0f172a",
            borderRight: "1px solid",
            borderColor: alpha("#ffffff", 0.05),
            display: "flex",
            flexDirection: "column",
            pt: 3,
          }}
        >
          <List sx={{ px: 2, flex: 1 }}>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <ListItem key={item.href} disablePadding sx={{ mb: 1 }}>
                  <ListItemButton
                    component={Link}
                    href={item.href}
                    sx={{
                      borderRadius: "8px",
                      px: 2,
                      py: 1.25,
                      bgcolor: isActive ? alpha("#6366f1", 0.1) : "transparent",
                      border: "1px solid",
                      borderColor: isActive ? alpha("#6366f1", 0.2) : "transparent",
                      color: isActive ? "#818cf8" : "#94a3b8",
                      transition: "all 0.2s",
                      "&:hover": {
                        bgcolor: isActive ? alpha("#6366f1", 0.15) : alpha("#ffffff", 0.03),
                        color: isActive ? "#818cf8" : "#f8fafc",
                        borderColor: isActive ? alpha("#6366f1", 0.3) : alpha("#ffffff", 0.1),
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 36,
                        color: "inherit",
                        opacity: isActive ? 1 : 0.7,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                        {item.icon}
                      </span>
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: "0.875rem",
                        fontWeight: isActive ? 700 : 500,
                        letterSpacing: "0.01em",
                      }}
                    />
                    {isActive && (
                      <Box
                        sx={{
                          width: 4,
                          height: 16,
                          bgcolor: "#6366f1",
                          borderRadius: 2,
                          ml: 1,
                          boxShadow: "0 0 10px #6366f1",
                        }}
                      />
                    )}
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>

          <Box
            sx={{
              p: 3,
              m: 2,
              borderRadius: "12px",
              bgcolor: alpha("#1e293b", 0.5),
              border: "1px solid",
              borderColor: alpha("#ffffff", 0.05),
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "#6366f1" }}>
                security
              </span>
              <Typography variant="caption" sx={{ color: "#f8fafc", fontWeight: 700, textTransform: "uppercase", fontSize: "0.65rem" }}>
                Security Protocol
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", lineHeight: 1.5 }}>
              All actions are logged in the global audit trail. Raw PII is masked.
            </Typography>
          </Box>
        </Box>

        {/* Content Area - Clean & Sharp */}
        <Box sx={{ flex: 1, bgcolor: "#f8fafc", overflowY: "auto", position: "relative" }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
