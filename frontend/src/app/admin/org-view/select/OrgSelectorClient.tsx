"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  alpha,
  useTheme,
  Button,
  Avatar,
  CircularProgress,
  Divider,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { setOrgView } from "@/lib/actions/org-view";

interface Organization {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface OrgSelectorClientProps {
  organizations: Organization[];
}

export default function OrgSelectorClient({ organizations }: OrgSelectorClientProps) {
  const [search, setSearch] = useState("");
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const filteredOrgs = organizations.filter(
    (org) =>
      org.name.toLowerCase().includes(search.toLowerCase()) ||
      org.slug.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = async (orgId: string) => {
    setSelectingId(orgId);
    try {
      await setOrgView(orgId);
    } catch (error) {
      console.error("Failed to set org view:", error);
      setSelectingId(null);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", py: 8, px: 3 }}>
      <Box sx={{ mb: 6, textAlign: "center" }}>
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 1,
            bgcolor: alpha("#6366f1", 0.1),
            px: 2,
            py: 0.75,
            borderRadius: "50px",
            border: "1px solid",
            borderColor: alpha("#6366f1", 0.2),
            mb: 3,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#6366f1" }}>
            admin_panel_settings
          </span>
          <Typography
            variant="caption"
            sx={{
              color: "#6366f1",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Troubleshooting Mode
          </Typography>
        </Box>
        <Typography
          variant="h3"
          fontWeight={900}
          gutterBottom
          sx={{
            color: "#0f172a",
            letterSpacing: "-0.04em",
          }}
        >
          Select Organization
        </Typography>
        <Typography variant="h6" sx={{ color: "#64748b", fontWeight: 500, maxWidth: "500px", mx: "auto", lineHeight: 1.5 }}>
          Switch context to perform read-only audits and security investigations.
        </Typography>
      </Box>

      <Card
        sx={{
          borderRadius: "24px",
          border: "1px solid",
          borderColor: "#e2e8f0",
          bgcolor: "#ffffff",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.05)",
          overflow: "hidden",
        }}
      >
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 4, bgcolor: alpha("#f8fafc", 0.5), borderBottom: "1px solid", borderColor: "#f1f5f9" }}>
            <TextField
              fullWidth
              placeholder="Search by name or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <span className="material-symbols-outlined" style={{ color: "#6366f1" }}>search</span>
                  </InputAdornment>
                ),
                sx: { 
                  borderRadius: "16px",
                  bgcolor: "#ffffff",
                  "& fieldset": { borderColor: "#e2e8f0" },
                  "&:hover fieldset": { borderColor: "#6366f1 !important" },
                },
              }}
            />
          </Box>

          <List sx={{ py: 0 }}>
            {filteredOrgs.map((org, index) => (
              <React.Fragment key={org.id}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleSelect(org.id)}
                    disabled={selectingId !== null}
                    sx={{
                      py: 3,
                      px: 4,
                      transition: "all 0.2s",
                      "&:hover": {
                        bgcolor: alpha("#6366f1", 0.02),
                        "& .org-arrow": { transform: "translateX(4px)", color: "#6366f1" },
                        "& .org-avatar": { bgcolor: "#6366f1", color: "#ffffff" },
                      },
                    }}
                  >
                    <ListItemIcon>
                      <Avatar
                        className="org-avatar"
                        sx={{
                          width: 48,
                          height: 48,
                          bgcolor: alpha("#6366f1", 0.08),
                          color: "#6366f1",
                          fontWeight: 800,
                          fontSize: "1rem",
                          transition: "all 0.2s",
                        }}
                      >
                        {org.name.charAt(0)}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#0f172a" }}>
                            {org.name}
                          </Typography>
                          <Chip
                            label={org.status}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: "0.65rem",
                              fontWeight: 800,
                              bgcolor: org.status === "ACTIVE" 
                                ? alpha("#10b981", 0.1) 
                                : alpha("#f59e0b", 0.1),
                              color: org.status === "ACTIVE" ? "#059669" : "#d97706",
                              border: "1px solid",
                              borderColor: org.status === "ACTIVE" 
                                ? alpha("#10b981", 0.2) 
                                : alpha("#f59e0b", 0.2),
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 500 }}>
                          {org.slug}
                        </Typography>
                      }
                    />
                    {selectingId === org.id ? (
                      <CircularProgress size={20} thickness={6} sx={{ color: "#6366f1" }} />
                    ) : (
                      <span className="material-symbols-outlined org-arrow" style={{ color: "#cbd5e1", transition: "all 0.2s" }}>
                        arrow_forward
                      </span>
                    )}
                  </ListItemButton>
                </ListItem>
                {index < filteredOrgs.length - 1 && (
                  <Divider sx={{ borderColor: "#f1f5f9", mx: 4 }} />
                )}
              </React.Fragment>
            ))}
            {filteredOrgs.length === 0 && (
              <Box sx={{ p: 10, textAlign: "center" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "48px", color: "#cbd5e1", marginBottom: "16px" }}>
                  search_off
                </span>
                <Typography variant="body1" sx={{ color: "#64748b", fontWeight: 500 }}>
                  No organizations match your search.
                </Typography>
              </Box>
            )}
          </List>
        </CardContent>
      </Card>

      <Box sx={{ mt: 6, textAlign: "center" }}>
        <Button
          variant="text"
          color="inherit"
          onClick={() => window.history.back()}
          startIcon={<span className="material-symbols-outlined">west</span>}
          sx={{
            color: "#64748b",
            fontWeight: 700,
            textTransform: "none",
            "&:hover": { color: "#0f172a", bgcolor: "transparent" },
          }}
        >
          Back to Admin Panel
        </Button>
      </Box>
    </Box>

  );
}
