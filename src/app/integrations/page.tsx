"use client";

import React, { useEffect, useState } from "react";
import {
    Box,
    Typography,
    Button,
    Card,
    TextField,
    InputAdornment,
    Chip,
    Grid,
    alpha,
    Skeleton,
    CircularProgress,
} from "@mui/material";
import { supabase } from "@/lib/supabase";

interface IntegrationItem {
    name: string;
    category: string;
    status: string;
    statusColor: string;
    lastSync: string;
    logo: string;
}

const INTEGRATIONS_TEMPLATE: IntegrationItem[] = [
    {
        name: "Workday",
        category: "HRIS • Primary Source of Truth",
        status: "Connected",
        statusColor: "success.main",
        lastSync: "Just now",
        logo: "https://lh3.googleusercontent.com/aida-public/AB6AXuAPW4Fp5q8CM3St6qgdLlP4T1Hndaa8jTpcBuGLS1VllcvD0aXS_EFZufOc2TonQfQZ2ZEiPn76mV7SFPI0jAD2lW5c1vS2qMZbKI64-bBEylCUnlqMocouNOrLVPSirHKNBa5h-40Cx0riHVNWo-E-SMNZDBnd-5iHY8MUVLf1JDTCBpDqSS-cXChGA-aOXKCvYh4ijrI0C7N2QThn6uQL_p2rI3wCm4YLMsjs-tMryQ2A1ZFRks4Nbzcd_3DU6tdpaAIA-iS1q2lL"
    },
    {
        name: "Slack",
        category: "Communication • Channel Management",
        status: "Connected",
        statusColor: "success.main",
        lastSync: "1 hour ago",
        logo: "https://lh3.googleusercontent.com/aida-public/AB6AXuAAOxK5Boub2sHnMFEeA1p_oiB4sLvMq8rvxXGznddau6oTqUkXLLG3Gdah7tg9lYezH_eJJJzLKnNq1jB-1KGbgs7oWfnd2AC0PTAZFn2MGNW3vVs2_2n8JAPbWy_bysKlOzvm0yfHpJMocM2wBMcIJ9CAk0UkJ3YX2xWlZ6zX58aAjFrY8LYGhtH3z1b7I2IaGTDdC80uLrpIPgENYsv4VHdtDv-nFGAUQX2CKVuxGBBip8ZxoPWgWtjj0B8mBES0xHYcEDI_EMzG"
    },
    {
        name: "GitHub Enterprise",
        category: "Version Control • Access Revocation",
        status: "Auth Error",
        statusColor: "error.main",
        lastSync: "auth_error",
        logo: "https://lh3.googleusercontent.com/aida-public/AB6AXuD-GaelpWjbbEAatxRzPQIK4L4wq0pBZxB9XZPfLs6zIst-ZavVqnxBBYjUtuNtwPXtgXNpLIpJAYW3y7o_Ml_rqVA_l5JUCeWNLpP44S0zgja0UTbyKnojvGC7WofyLoHnqVDdyvryo4afVQZGRVjkZvDTrwOHQEijyKNGTJ08BtUvmLlgT12BkksGw4KdbO44B2ORFFbtHYpD_6VBujOLqrGBujBEvPPzc0WaFOmgFL1DGxCoiRxF0w_aNSK6hDTN_wkwYEOVLBLf"
    },
    {
        name: "AWS (IAM)",
        category: "Infrastructure • Identity Management",
        status: "Connected",
        statusColor: "success.main",
        lastSync: "12 hours ago",
        logo: "https://lh3.googleusercontent.com/aida-public/AB6AXuCrtq1iydjD5S_7GGRgTiQiqtbKFc2M37PDpWPHUTR1lCFzVmCC_T8E2EgAFW8o7tqHhF2qC3rMbWcucHZQs5F1mhFbb8z3Q80ymmLwgw5GfapatZArh8lS_OQSNdhdEVOZ6D0nUhR_jlO8Rifx0U21E2f2iPim236AbpLxvoGqG1qk9r373pV0Em-_jf9slTed_XoEnPv8qZnc26duP1cFz2mF_UMDOpbTAN8ruvzxBA5N6XzxmaD29z5zGed2kmr-RzZ_GMBL4U6S"
    }
];

export default function IntegrationsPage() {
    const [loading, setLoading] = useState(true);
    const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
    const [syncing, setSyncing] = useState<string | null>(null);

    const handleSync = async (appName: string) => {
        setSyncing(appName);
        try {
            // In a real scenario, this would call a specific sync function for that app
            // For now, we call hris-sync to demonstrate the pattern
            const { error } = await supabase.functions.invoke('hris-sync', {
                body: {
                    new_status: 'active', // Just a mock ping
                    company_id: 'c0000000-0000-0000-0000-000000000001'
                }
            });
            if (error) throw error;
            alert(`${appName} synchronized successfully!`);
        } catch (err: any) {
            console.error("Sync Error:", err);
            alert(`Failed to sync ${appName}: ${err.message}`);
        } finally {
            setSyncing(null);
        }
    };

    useEffect(() => {
        // Simulate data fetch
        const timer = setTimeout(() => {
            setIntegrations(INTEGRATIONS_TEMPLATE);
            setLoading(false);
        }, 800);
        return () => clearTimeout(timer);
    }, []);

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", mb: 6 }}>
                <Box sx={{ maxWidth: 700 }}>
                    <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: -1, mb: 1 }}>
                        Integration Settings
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ fontSize: "1.125rem" }}>
                        Manage technical connections for automated offboarding workflows. View system health and configure API endpoints.
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    size="large"
                    startIcon={<span className="material-symbols-outlined">add</span>}
                    sx={{
                        fontWeight: 800,
                        px: 4,
                        py: 1.5,
                        borderRadius: 3,
                        boxShadow: (theme) => `0 8px 16px ${alpha(theme.palette.primary.main, 0.2)}`
                    }}
                >
                    Connect New App
                </Button>
            </Box>

            {/* Filters */}
            <Box sx={{ display: "flex", gap: 2, mb: 4 }}>
                <TextField
                    fullWidth
                    placeholder="Filter by service name or status..."
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#94a3b8" }}>filter_alt</span>
                            </InputAdornment>
                        ),
                    }}
                    sx={{
                        "& .MuiOutlinedInput-root": {
                            borderRadius: 3,
                            bgcolor: "background.paper"
                        }
                    }}
                />
                <Button variant="outlined" sx={{ borderRadius: 3, px: 3, color: "text.primary", borderColor: "divider", fontWeight: 700, whiteSpace: "nowrap" }}>
                    Status: All
                    <span className="material-symbols-outlined" style={{ fontSize: "18px", marginLeft: "8px" }}>expand_more</span>
                </Button>
            </Box>

            {/* List */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {(loading ? Array(4).fill({}) : integrations).map((app, idx) => (
                    <Card
                        key={app.name || idx}
                        variant="outlined"
                        sx={{
                            borderRadius: 4,
                            borderColor: app.status === "Auth Error" ? "error.light" : "divider",
                            borderWidth: app.status === "Auth Error" ? 2 : 1,
                            "&:hover": { borderColor: "primary.main" },
                            transition: "all 0.2s ease"
                        }}
                    >
                        <Box sx={{ p: 2.5, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 3 }}>
                            {loading ? (
                                <Skeleton variant="rectangular" width={48} height={48} sx={{ borderRadius: 2 }} />
                            ) : (
                                <Box sx={{ width: 48, height: 48, bgcolor: "grey.100", borderRadius: 2, p: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <img src={app.logo} alt={app.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                                </Box>
                            )}

                            <Box sx={{ flexGrow: 1, minWidth: 200 }}>
                                {loading ? (
                                    <>
                                        <Skeleton width="40%" />
                                        <Skeleton width="20%" />
                                    </>
                                ) : (
                                    <>
                                        <Typography variant="h6" sx={{ fontWeight: 800 }}>{app.name}</Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{app.category}</Typography>
                                    </>
                                )}
                            </Box>

                            {!loading && (
                                <Box sx={{ display: "flex", gap: 6, minWidth: 300 }}>
                                    <Box>
                                        <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", display: "block", mb: 0.5 }}>Status</Typography>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: app.statusColor }} />
                                            <Typography variant="body2" sx={{ fontWeight: 700, color: app.statusColor }}>{app.status}</Typography>
                                        </Box>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", display: "block", mb: 0.5 }}>
                                            {app.status === "Auth Error" ? "Logs" : "Last Sync"}
                                        </Typography>
                                        {app.status === "Auth Error" ? (
                                            <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main", textDecoration: "underline" }}>View Debug Logs</Typography>
                                        ) : (
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{app.lastSync}</Typography>
                                        )}
                                    </Box>
                                </Box>
                            )}

                            <Box sx={{ display: "flex", gap: 1.5 }}>
                                {loading ? (
                                    <Skeleton variant="rectangular" width={100} height={40} sx={{ borderRadius: 2 }} />
                                ) : (
                                    <>
                                        <Button
                                            variant="outlined"
                                            onClick={() => handleSync(app.name)}
                                            disabled={syncing === app.name}
                                            sx={{ borderRadius: 2, fontWeight: 700, color: app.status === "Auth Error" ? "error.main" : "text.primary", borderColor: app.status === "Auth Error" ? "error.main" : "divider", bgcolor: app.status === "Auth Error" ? "rgba(230, 90, 106, 0.05)" : "action.hover" }}
                                        >
                                            {syncing === app.name ? <CircularProgress size={18} color="inherit" /> : (app.status === "Auth Error" ? "Reconnect" : "Sync Now")}
                                        </Button>
                                        <Button variant="contained" disableElevation sx={{ borderRadius: 2, fontWeight: 700, bgcolor: "primary.main" }}>
                                            Configure
                                        </Button>
                                    </>
                                )}
                            </Box>
                        </Box>
                    </Card>
                ))}
            </Box>

            {/* Snapshot Footer */}
            <Box sx={{ mt: 6, p: 3, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.03), borderRadius: 4, border: "1px dashed", borderColor: "primary.light" }}>
                <Grid container alignItems="center" spacing={3}>
                    <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <Box sx={{ bgcolor: "background.paper", p: 1.5, borderRadius: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", display: "flex" }}>
                                <span className="material-symbols-outlined" style={{ color: "#00738a" }}>analytics</span>
                            </Box>
                            <Box>
                                <Typography variant="body2" sx={{ fontWeight: 800 }}>System Connectivity Snapshot</Typography>
                                <Typography variant="caption" color="text.secondary">Overall health is stable. 3/4 services active.</Typography>
                            </Box>
                        </Box>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6, lg: 8 }}>
                        <Box sx={{ display: "flex", justifyContent: { xs: "space-between", lg: "flex-end" }, gap: { xs: 2, lg: 8 } }}>
                            {[
                                { label: "Uptime", value: "99.8%", color: "primary.main" },
                                { label: "API Calls / 24h", value: "12.4k", color: "text.primary" },
                                { label: "Active Alerts", value: "1", color: "error.main" },
                            ].map((stat) => (
                                <Box key={stat.label} sx={{ textAlign: "center" }}>
                                    <Typography variant="h4" sx={{ fontWeight: 900, color: stat.color, lineHeight: 1 }}>{stat.value}</Typography>
                                    <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", mt: 1, display: "block" }}>{stat.label}</Typography>
                                </Box>
                            ))}
                        </Box>
                    </Grid>
                </Grid>
            </Box>
        </Box>
    );
}
