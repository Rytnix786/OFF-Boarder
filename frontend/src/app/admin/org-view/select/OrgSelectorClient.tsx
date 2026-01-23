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
  Button,
  Avatar,
  CircularProgress,
  Divider,
} from "@mui/material";
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
    <Box sx={{ 
      minHeight: "100vh", 
      bgcolor: "#020617", 
      display: "flex", 
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      py: 8, 
      px: 3,
      background: "radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)"
    }}>
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
            borderColor: alpha("#6366f1", 0.3),
            mb: 3,
            boxShadow: "0 0 20px rgba(99, 102, 241, 0.2)",
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
              letterSpacing: "0.15em",
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
            color: "#f8fafc",
            letterSpacing: "-0.04em",
            fontSize: { xs: "2.5rem", md: "3.5rem" },
            textShadow: "0 10px 30px rgba(0,0,0,0.5)",
          }}
        >
          Select Organization
        </Typography>
        <Typography variant="h6" sx={{ color: "#94a3b8", fontWeight: 500, maxWidth: "550px", mx: "auto", lineHeight: 1.6 }}>
          Switch context to perform read-only audits and security investigations across the platform.
        </Typography>
      </Box>

      <Card
        sx={{
          width: "100%",
          maxWidth: 800,
          borderRadius: "24px",
          border: "1px solid",
          borderColor: alpha("#ffffff", 0.1),
          bgcolor: alpha("#0f172a", 0.8),
          backdropFilter: "blur(20px)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          overflow: "hidden",
        }}
      >
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 4, bgcolor: alpha("#1e293b", 0.4), borderBottom: "1px solid", borderColor: alpha("#ffffff", 0.05) }}>
            <TextField
              fullWidth
              placeholder="Search by name or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <span className="material-symbols-outlined" style={{ color: "#818cf8" }}>search</span>
                  </InputAdornment>
                ),
                sx: { 
                  borderRadius: "16px",
                  bgcolor: alpha("#020617", 0.5),
                  color: "#f8fafc",
                  "& fieldset": { borderColor: alpha("#ffffff", 0.1) },
                  "&:hover fieldset": { borderColor: alpha("#6366f1", 0.5) + " !important" },
                  "&.Mui-focused fieldset": { borderColor: "#6366f1 !important" },
                },
              }}
            />
          </Box>

          <List sx={{ py: 0, maxHeight: 400, overflowY: "auto" }}>
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
                        bgcolor: alpha("#6366f1", 0.05),
                        "& .org-arrow": { transform: "translateX(4px)", color: "#818cf8" },
                        "& .org-avatar": { bgcolor: "#6366f1", color: "#ffffff", boxShadow: "0 0 15px rgba(99, 102, 241, 0.4)" },
                      },
                    }}
                  >
                    <ListItemIcon>
                      <Avatar
                        className="org-avatar"
                        sx={{
                          width: 48,
                          height: 48,
                          bgcolor: alpha("#6366f1", 0.1),
                          color: "#818cf8",
                          fontWeight: 800,
                          fontSize: "1.2rem",
                          transition: "all 0.3s",
                          border: "1px solid",
                          borderColor: alpha("#6366f1", 0.2),
                        }}
                      >
                        {org.name.charAt(0)}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#f8fafc" }}>
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
                                ? alpha("#10b981", 0.15) 
                                : alpha("#f59e0b", 0.15),
                              color: org.status === "ACTIVE" ? "#34d399" : "#fbbf24",
                              border: "1px solid",
                              borderColor: org.status === "ACTIVE" 
                                ? alpha("#10b981", 0.3) 
                                : alpha("#f59e0b", 0.3),
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 500, letterSpacing: "0.02em" }}>
                          {org.slug}
                        </Typography>
                      }
                    />
                    {selectingId === org.id ? (
                      <CircularProgress size={20} thickness={6} sx={{ color: "#6366f1" }} />
                    ) : (
                      <span className="material-symbols-outlined org-arrow" style={{ color: alpha("#ffffff", 0.2), transition: "all 0.3s" }}>
                        arrow_forward
                      </span>
                    )}
                  </ListItemButton>
                </ListItem>
                {index < filteredOrgs.length - 1 && (
                  <Divider sx={{ borderColor: alpha("#ffffff", 0.05), mx: 4 }} />
                )}
              </React.Fragment>
            ))}
            {filteredOrgs.length === 0 && (
              <Box sx={{ p: 10, textAlign: "center" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "48px", color: alpha("#ffffff", 0.1), marginBottom: "16px" }}>
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
            color: "#94a3b8",
            fontWeight: 700,
            textTransform: "none",
            borderRadius: "10px",
            px: 3,
            "&:hover": { color: "#f8fafc", bgcolor: alpha("#ffffff", 0.05) },
          }}
        >
          Back to Admin Panel
        </Button>
      </Box>
    </Box>
  );
}
