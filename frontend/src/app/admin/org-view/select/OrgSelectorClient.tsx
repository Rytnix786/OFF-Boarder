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
    <Box sx={{ maxWidth: 800, mx: "auto", py: 4 }}>
      <Box sx={{ mb: 4, textAlign: "center" }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Select Organization
        </Typography>
        <Typography color="text.secondary">
          Switch to organization-scoped troubleshooting mode.
        </Typography>
      </Box>

      <Card
        sx={{
          borderRadius: 4,
          border: "1px solid",
          borderColor: isDark ? "#18181b" : "#e5e7eb",
          bgcolor: isDark ? "#09090b" : "#ffffff",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
        }}
      >
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, borderBottom: "1px solid", borderColor: isDark ? "#18181b" : "#f4f4f5" }}>
            <TextField
              fullWidth
              placeholder="Search by name or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <span className="material-symbols-outlined">search</span>
                  </InputAdornment>
                ),
                sx: { borderRadius: 2.5 },
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
                      py: 2.5,
                      px: 3,
                      "&:hover": {
                        bgcolor: isDark ? alpha("#ffffff", 0.03) : "#f8fafc",
                      },
                    }}
                  >
                    <ListItemIcon>
                      <Avatar
                        sx={{
                          bgcolor: alpha("#6366f1", 0.1),
                          color: "#6366f1",
                          fontWeight: 700,
                          fontSize: "0.875rem",
                        }}
                      >
                        {org.name.charAt(0)}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Typography fontWeight={600}>{org.name}</Typography>
                          <Chip
                            label={org.status}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: "0.625rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              bgcolor: org.status === "ACTIVE" 
                                ? alpha("#22c55e", 0.1) 
                                : alpha("#f59e0b", 0.1),
                              color: org.status === "ACTIVE" ? "#22c55e" : "#f59e0b",
                              border: "1px solid",
                              borderColor: org.status === "ACTIVE" 
                                ? alpha("#22c55e", 0.2) 
                                : alpha("#f59e0b", 0.2),
                            }}
                          />
                        </Box>
                      }
                      secondary={org.slug}
                    />
                    {selectingId === org.id ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <span className="material-symbols-outlined" style={{ color: "#94a3b8" }}>
                        chevron_right
                      </span>
                    )}
                  </ListItemButton>
                </ListItem>
                {index < filteredOrgs.length - 1 && (
                  <Divider sx={{ borderColor: isDark ? "#18181b" : "#f4f4f5" }} />
                )}
              </React.Fragment>
            ))}
            {filteredOrgs.length === 0 && (
              <Box sx={{ p: 8, textAlign: "center" }}>
                <Typography color="text.secondary">No organizations found</Typography>
              </Box>
            )}
          </List>
        </CardContent>
      </Card>

      <Box sx={{ mt: 3, textAlign: "center" }}>
        <Button
          variant="text"
          color="inherit"
          onClick={() => window.history.back()}
          startIcon={<span className="material-symbols-outlined">arrow_back</span>}
        >
          Back to Admin
        </Button>
      </Box>
    </Box>
  );
}
