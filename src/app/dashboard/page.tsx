"use client";

import React, { useEffect, useState } from "react";
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    LinearProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    IconButton,
    Button,
    alpha,
    Skeleton,
} from "@mui/material";
import InitiateOffboardingModal from "@/components/offboarding/InitiateOffboardingModal";

type KPIItem = {
    label: string;
    value: number;
    icon: string;
    color: string;
    trend: string;
    trendColor: string;
    borderLeft: string;
};

type EventItem = {
    id: string;
    name: string;
    initials: string;
    role: string;
    riskScore: number;
    type: string;
    status: number;
};

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [kpis, setKpis] = useState<KPIItem[]>([]);
    const [events, setEvents] = useState<EventItem[]>([]);
    const [isInitiateModalOpen, setIsInitiateModalOpen] = useState(false);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            setKpis([
                { label: "Active Offboardings", value: 12, icon: "person_off", color: "#f97316", trend: "+2 today", trendColor: "#f97316", borderLeft: "4px solid #f97316" },
                { label: "Pending Reviews", value: 5, icon: "pending_actions", color: "#3b82f6", trend: "-1 today", trendColor: "#22c55e", borderLeft: "4px solid #3b82f6" },
                { label: "Completed This Month", value: 28, icon: "check_circle", color: "#22c55e", trend: "+8 vs last month", trendColor: "#22c55e", borderLeft: "4px solid #22c55e" },
            ]);
            setEvents([
                { id: "1", name: "John Doe", initials: "JD", role: "Software Engineer", riskScore: 75, type: "Voluntary", status: 60 },
                { id: "2", name: "Jane Smith", initials: "JS", role: "Product Manager", riskScore: 30, type: "Involuntary", status: 100 },
                { id: "3", name: "Bob Wilson", initials: "BW", role: "Designer", riskScore: 45, type: "Voluntary", status: 40 },
            ]);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    return (
        <Box>
            <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 900, color: "text.primary", letterSpacing: -1 }}>
                        Admin Dashboard
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                        Real-time employee offboarding oversight & compliance monitoring.
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<span className="material-symbols-outlined">person_remove</span>}
                    onClick={() => setIsInitiateModalOpen(true)}
                    sx={{
                        fontWeight: 800,
                        px: 4,
                        py: 1.5,
                        borderRadius: 3,
                        boxShadow: (theme) => `0 8px 16px ${alpha(theme.palette.primary.main, 0.2)}`
                    }}
                >
                    Initiate Offboarding
                </Button>
            </Box>

            <InitiateOffboardingModal
                open={isInitiateModalOpen}
                onClose={() => setIsInitiateModalOpen(false)}
                onSuccess={fetchDashboardData}
            />

            <Grid container spacing={3} sx={{ mb: 4 }}>
                {(loading ? Array(3).fill({} as KPIItem) : kpis).map((kpi, idx) => (
                    <Grid size={{ xs: 12, md: 4 }} key={kpi.label || idx}>
                        <Card
                            variant="outlined"
                            sx={{
                                height: "100%",
                                borderRadius: 4,
                                borderLeft: kpi.borderLeft,
                                "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }
                            }}
                        >
                            <CardContent sx={{ p: 3 }}>
                                {loading ? (
                                    <>
                                        <Skeleton variant="circular" width={40} height={40} sx={{ mb: 2 }} />
                                        <Skeleton variant="text" height={60} width="60%" />
                                        <Skeleton variant="text" width="40%" />
                                    </>
                                ) : (
                                    <>
                                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                                            <Box
                                                sx={{
                                                    bgcolor: alpha(kpi.color as string, 0.1),
                                                    p: 1,
                                                    borderRadius: 1.5,
                                                    display: "flex",
                                                    color: kpi.color
                                                }}
                                            >
                                                <span className="material-symbols-outlined">{kpi.icon}</span>
                                            </Box>
                                            <Typography variant="caption" sx={{ fontWeight: 800, color: kpi.trendColor }}>
                                                {kpi.trend}
                                            </Typography>
                                        </Box>
                                        <Typography variant="h3" sx={{ fontWeight: 800 }}>
                                            {String(kpi.value).padStart(2, '0')}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", mt: 0.5, letterSpacing: 0.5 }}>
                                            {kpi.label}
                                        </Typography>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Paper variant="outlined" sx={{ borderRadius: 4, overflow: "hidden" }}>
                <Box sx={{ px: 3, py: 2.5, borderBottom: "1px solid", borderColor: "divider", bgcolor: "rgba(0,0,0,0.02)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Recent Offboarding Events</Typography>
                    <Button
                        variant="text"
                        startIcon={<span className="material-symbols-outlined" style={{ fontSize: "18px" }}>download</span>}
                        sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.8125rem" }}
                    >
                        Export CSV
                    </Button>
                </Box>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ "& th": { textTransform: "uppercase", fontSize: "0.6875rem", fontWeight: 800, color: "text.secondary", py: 2 } }}>
                                <TableCell>Employee Name</TableCell>
                                <TableCell align="center">Risk Score</TableCell>
                                <TableCell>Departure Type</TableCell>
                                <TableCell>Revocation Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                Array(3).fill({}).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton variant="text" /></TableCell>
                                        <TableCell><Skeleton variant="text" /></TableCell>
                                        <TableCell><Skeleton variant="text" /></TableCell>
                                        <TableCell><Skeleton variant="text" /></TableCell>
                                        <TableCell><Skeleton variant="circular" width={24} height={24} /></TableCell>
                                    </TableRow>
                                ))
                            ) : events.map((row) => (
                                <TableRow key={row.id} hover>
                                    <TableCell>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                            <Box sx={{ width: 32, height: 32, borderRadius: "50%", bgcolor: "grey.200", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.625rem", fontWeight: 800 }}>
                                                {row.initials}
                                            </Box>
                                            <Box>
                                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.name}</Typography>
                                                <Typography variant="caption" color="text.secondary">{row.role}</Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={row.riskScore}
                                            size="small"
                                            sx={{
                                                fontWeight: 800,
                                                bgcolor: row.riskScore > 50 ? "error.main" : "success.main",
                                                color: "white",
                                                borderRadius: "6px"
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={row.type} size="small" variant="outlined" sx={{ fontWeight: 600, borderRadius: "4px" }} />
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ width: 120 }}>
                                            <Typography variant="caption" sx={{ display: "block", mb: 0.5, color: "text.secondary" }}>{row.status}% Complete</Typography>
                                            <LinearProgress
                                                variant="determinate"
                                                value={row.status}
                                                sx={{
                                                    height: 6,
                                                    borderRadius: 3,
                                                    bgcolor: "grey.100",
                                                    "& .MuiLinearProgress-bar": {
                                                        bgcolor: row.status === 100 ? "success.main" : "primary.main"
                                                    }
                                                }}
                                            />
                                        </Box>
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small">
                                            <span className="material-symbols-outlined">more_vert</span>
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
}
