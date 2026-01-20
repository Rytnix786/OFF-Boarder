"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  Box,
  InputBase,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  alpha,
  useTheme,
  Divider,
  CircularProgress,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { stitchTokens } from "@/theme/tokens";

const t = stitchTokens;

interface SearchResult {
  id: string;
  type: "employee" | "offboarding" | "page" | "action";
  title: string;
  subtitle?: string;
  icon: string;
  href?: string;
  action?: () => void;
  badge?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const QUICK_ACTIONS: SearchResult[] = [
  { id: "nav-employees", type: "page", title: "Employees", subtitle: "View all employees", icon: "people", href: "/app/employees" },
  { id: "nav-offboardings", type: "page", title: "Offboardings", subtitle: "Manage offboardings", icon: "group_remove", href: "/app/offboardings" },
  { id: "nav-assets", type: "page", title: "Assets", subtitle: "Track company assets", icon: "devices", href: "/app/assets" },
  { id: "nav-workflows", type: "page", title: "Workflows", subtitle: "Workflow templates", icon: "account_tree", href: "/app/workflows" },
  { id: "nav-analytics", type: "page", title: "Analytics", subtitle: "Dashboard & insights", icon: "analytics", href: "/app/analytics" },
  { id: "nav-reports", type: "page", title: "Reports", subtitle: "Generate reports", icon: "summarize", href: "/app/reports" },
  { id: "nav-audit", type: "page", title: "Audit Logs", subtitle: "View audit trail", icon: "history", href: "/app/audit-logs" },
  { id: "nav-settings", type: "page", title: "Settings", subtitle: "Organization settings", icon: "settings", href: "/app/settings/organization" },
  { id: "nav-members", type: "page", title: "Members", subtitle: "Team members", icon: "group", href: "/app/settings/members" },
  { id: "nav-structure", type: "page", title: "Structure", subtitle: "Departments & titles", icon: "account_tree", href: "/app/settings/structure" },
];

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const router = useRouter();
  
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const filteredPages = useMemo(() => {
    if (!query.trim()) return QUICK_ACTIONS.slice(0, 6);
    const q = query.toLowerCase();
    return QUICK_ACTIONS.filter(
      item => item.title.toLowerCase().includes(q) || item.subtitle?.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedIndex(0);
      setSearchResults([]);
    }
  }, [open]);

  useEffect(() => {
    const searchData = async () => {
      if (!query.trim() || query.length < 2) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      try {
        const [employeesRes, offboardingsRes] = await Promise.all([
          fetch(`/api/employees?search=${encodeURIComponent(query)}&limit=5`),
          fetch(`/api/offboardings?search=${encodeURIComponent(query)}&limit=5`),
        ]);

        const results: SearchResult[] = [];

        if (employeesRes.ok) {
          const employees = await employeesRes.json();
          employees.forEach((emp: { id: string; firstName: string; lastName: string; email: string; status: string }) => {
            results.push({
              id: `emp-${emp.id}`,
              type: "employee",
              title: `${emp.firstName} ${emp.lastName}`,
              subtitle: emp.email,
              icon: "person",
              href: `/app/employees/${emp.id}`,
              badge: emp.status,
            });
          });
        }

        if (offboardingsRes.ok) {
          const offboardings = await offboardingsRes.json();
          offboardings.forEach((off: { id: string; employee: { firstName: string; lastName: string }; status: string }) => {
            results.push({
              id: `off-${off.id}`,
              type: "offboarding",
              title: `${off.employee.firstName} ${off.employee.lastName}`,
              subtitle: "Offboarding",
              icon: "group_remove",
              href: `/app/offboardings/${off.id}`,
              badge: off.status,
            });
          });
        }

        setSearchResults(results);
      } catch (error) {
        console.error("Search failed:", error);
      }
      setLoading(false);
    };

    const debounce = setTimeout(searchData, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const allResults = useMemo(() => {
    const results: { section: string; items: SearchResult[] }[] = [];
    
    if (searchResults.length > 0) {
      const employees = searchResults.filter(r => r.type === "employee");
      const offboardings = searchResults.filter(r => r.type === "offboarding");
      if (employees.length > 0) results.push({ section: "Employees", items: employees });
      if (offboardings.length > 0) results.push({ section: "Offboardings", items: offboardings });
    }
    
    if (filteredPages.length > 0) {
      results.push({ section: query ? "Pages" : "Quick Navigation", items: filteredPages });
    }
    
    return results;
  }, [searchResults, filteredPages, query]);

  const flatResults = useMemo(() => allResults.flatMap(s => s.items), [allResults]);

  const handleSelect = useCallback((result: SearchResult) => {
    onClose();
    if (result.href) {
      router.push(result.href);
    } else if (result.action) {
      result.action();
    }
  }, [onClose, router]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && flatResults[selectedIndex]) {
      e.preventDefault();
      handleSelect(flatResults[selectedIndex]);
    }
  }, [flatResults, selectedIndex, handleSelect]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "ACTIVE": return "success";
      case "IN_PROGRESS": return "info";
      case "PENDING": return "warning";
      case "COMPLETED": return "success";
      case "TERMINATED": case "CANCELLED": return "error";
      default: return "default";
    }
  };

  let itemIndex = -1;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: isDark ? t.colors.background.surface : "#FFFFFF",
          border: `1px solid ${isDark ? t.colors.border.subtle : t.colors.border.light}`,
          boxShadow: isDark ? "0 24px 48px rgba(0,0,0,0.5)" : "0 24px 48px rgba(0,0,0,0.12)",
          overflow: "hidden",
          position: "fixed",
          top: "15%",
          m: 0,
        },
      }}
      slotProps={{
        backdrop: {
          sx: { bgcolor: isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" },
        },
      }}
    >
      <Box sx={{ 
        p: 2, 
        display: "flex", 
        alignItems: "center", 
        gap: 1.5,
        borderBottom: `1px solid ${isDark ? t.colors.border.subtle : t.colors.border.light}`,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 22, color: isDark ? t.colors.text.muted.dark : t.colors.text.muted.light }}>
          search
        </span>
        <InputBase
          autoFocus
          fullWidth
          placeholder="Search employees, offboardings, or navigate..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          sx={{
            fontSize: "1rem",
            fontWeight: 500,
            "& .MuiInputBase-input::placeholder": {
              color: isDark ? t.colors.text.muted.dark : t.colors.text.muted.light,
              opacity: 1,
            },
          }}
        />
        {loading && <CircularProgress size={18} />}
        <Box
          sx={{
            px: 1,
            py: 0.5,
            borderRadius: 1,
            bgcolor: isDark ? t.colors.background.surfaceLight : "#F1F5F9",
            border: `1px solid ${isDark ? t.colors.border.subtle : t.colors.border.light}`,
          }}
        >
          <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ fontSize: "0.7rem" }}>
            ESC
          </Typography>
        </Box>
      </Box>

      <Box sx={{ maxHeight: 400, overflow: "auto" }}>
        {allResults.length === 0 && query.length > 1 && !loading ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: isDark ? t.colors.text.muted.dark : "#CBD5E1", display: "block", marginBottom: 8 }}>
              search_off
            </span>
            <Typography variant="body2" color="text.secondary">
              No results found for "{query}"
            </Typography>
          </Box>
        ) : (
          allResults.map((section, sectionIdx) => (
            <Box key={section.section}>
              {sectionIdx > 0 && <Divider />}
              <Box sx={{ px: 2, py: 1, bgcolor: isDark ? t.colors.background.surfaceLight : "#F8FAFC" }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {section.section}
                </Typography>
              </Box>
              <List disablePadding>
                {section.items.map((item) => {
                  itemIndex++;
                  const currentIndex = itemIndex;
                  return (
                    <ListItem key={item.id} disablePadding>
                      <ListItemButton
                        onClick={() => handleSelect(item)}
                        selected={selectedIndex === currentIndex}
                        sx={{
                          py: 1.25,
                          px: 2,
                          "&.Mui-selected": {
                            bgcolor: isDark ? alpha(t.colors.primary.main, 0.12) : alpha(t.colors.primary.main, 0.08),
                          },
                          "&:hover": {
                            bgcolor: isDark ? t.colors.glass.hover : "#F1F5F9",
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Box
                            sx={{
                              width: 28,
                              height: 28,
                              borderRadius: 1,
                              bgcolor: item.type === "employee" 
                                ? alpha(t.colors.primary.main, 0.1)
                                : item.type === "offboarding"
                                ? alpha(t.colors.status.warning, 0.1)
                                : (isDark ? t.colors.glass.hover : "#F1F5F9"),
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <span
                              className="material-symbols-outlined"
                              style={{
                                fontSize: 16,
                                color: item.type === "employee"
                                  ? t.colors.primary.main
                                  : item.type === "offboarding"
                                  ? t.colors.status.warning
                                  : (isDark ? t.colors.text.muted.dark : t.colors.text.muted.light),
                              }}
                            >
                              {item.icon}
                            </span>
                          </Box>
                        </ListItemIcon>
                        <ListItemText
                          primary={item.title}
                          secondary={item.subtitle}
                          primaryTypographyProps={{ fontWeight: 600, fontSize: "0.875rem" }}
                          secondaryTypographyProps={{ fontSize: "0.75rem" }}
                        />
                        {item.badge && (
                          <Chip
                            label={item.badge.replace("_", " ")}
                            size="small"
                            color={getStatusColor(item.badge) as "success" | "info" | "warning" | "error" | "default"}
                            sx={{ height: 20, fontSize: "0.65rem", fontWeight: 600 }}
                          />
                        )}
                        {selectedIndex === currentIndex && (
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 1, fontSize: "0.65rem" }}>
                            ↵
                          </Typography>
                        )}
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          ))
        )}
      </Box>

      <Box
        sx={{
          p: 1.5,
          borderTop: `1px solid ${isDark ? t.colors.border.subtle : t.colors.border.light}`,
          bgcolor: isDark ? t.colors.background.surfaceLight : "#F8FAFC",
          display: "flex",
          gap: 2,
          justifyContent: "center",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box sx={{ px: 0.75, py: 0.25, borderRadius: 0.5, bgcolor: isDark ? t.colors.background.surface : "#E2E8F0" }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ fontSize: "0.6rem" }}>↑↓</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>Navigate</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box sx={{ px: 0.75, py: 0.25, borderRadius: 0.5, bgcolor: isDark ? t.colors.background.surface : "#E2E8F0" }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ fontSize: "0.6rem" }}>↵</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>Select</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box sx={{ px: 0.75, py: 0.25, borderRadius: 0.5, bgcolor: isDark ? t.colors.background.surface : "#E2E8F0" }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ fontSize: "0.6rem" }}>ESC</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>Close</Typography>
        </Box>
      </Box>
    </Dialog>
  );
}
