"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Button,
    Chip,
    Paper,
    alpha,
    Skeleton,
    CircularProgress
} from "@mui/material";
import { supabase } from "@/lib/supabase";

interface TaskItem {
    id: string; // Added for task actions
    name: string;
    status: string;
    icon: string;
    color: string;
    action?: string;
    connector_id?: string; // Added for retry logic
}

interface TaskCategory {
    category: string;
    items: TaskItem[];
}

export default function OffboardingDetailPage({ params }: { params: { id: string } }) {
    const [loading, setLoading] = useState(true);
    const [caseData, setCaseData] = useState<any>(null);
    const [employee, setEmployee] = useState<any>(null); // Added employee state
    const [tasks, setTasks] = useState<TaskCategory[]>([]);
    const [retrying, setRetrying] = useState<string | null>(null); // Added retrying state

    const getEmployeeStatusDisplay = (employee: any, offboarding: any) => {
        // Check if offboarding is completed
        if (offboarding?.status === "COMPLETED") {
            return "OFFBOARDED";
        }
        // Otherwise show current employee status
        return employee?.status?.replace("_", " ") || employee?.status;
    };

    const fetchCaseData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Case & Employee
            const { data: c, error: caseError } = await supabase
                .from('offboarding')
                .select(`
                    *,
                    employee (*)
                `)
                .eq('id', params.id)
                .single();

            if (caseError) throw caseError;
            setCaseData(c);
            setEmployee(c.employee); // Set employee data

            // 2. Fetch Tasks
            const { data: t } = await supabase
                .from('OffboardingTask')
                .select('*')
                .eq('offboardingId', params.id);

            if (t) {
                // Group tasks by role/category
                const categories = ['IT', 'HR', 'Manager', 'Employee'];
                const grouped = categories.map(cat => ({
                    category: cat,
                    items: t.filter((task: any) => task.role === cat.toLowerCase()).map((task: any) => ({
                        id: task.id, // Include task ID
                        name: task.name,
                        status: task.status.replace('_', ' '),
                        icon: task.status === 'completed' ? 'check_circle' : task.status === 'failed' ? 'error' : 'schedule',
                        color: task.status === 'completed' ? 'success.main' : task.status === 'failed' ? 'error.main' : 'text.secondary',
                        connector_id: task.connector_id, // Include connector ID
                        action: task.status === 'failed' ? 'Retry' : (task.status === 'pending' && task.role === 'employee' ? 'Mark Done' : undefined) // Example action logic
                    }))
                }));
                setTasks(grouped.filter(g => g.items.length > 0));
            }

        } catch (error) {
            console.error("Error fetching case details:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRetry = async (taskId: string, connectorId: string) => {
        setRetrying(taskId);
        try {
            const { error } = await supabase.functions.invoke('access-revocation', {
                body: {
                    employee_id: employee?.id,
                    connector_id: connectorId,
                    action: 'revoke'
                }
            });
            if (error) throw error;
            alert("Retry initiated successfully!");
            fetchCaseData();
        } catch (err: any) {
            console.error("Retry Error:", err);
            alert(`Retry failed: ${err.message}`);
        } finally {
            setRetrying(null);
        }
    };

    const handleCompleteTask = async (taskId: string) => {
        try {
            const { error } = await supabase
                .from('OffboardingTask') // Use correct table name
                .update({ status: 'COMPLETED', completedAt: new Date().toISOString() })
                .eq('id', taskId);

            if (error) throw error;
            fetchCaseData();
        } catch (err: any) {
            alert(`Failed to complete task: ${err.message}`);
        }
    };

    useEffect(() => {
        if (!params.id) return;
        fetchCaseData();
    }, [params.id]);

    if (loading) {
        return (
            <Box sx={{ p: 4 }}>
                <Skeleton variant="text" height={80} width="60%" />
                <Grid container spacing={4} sx={{ mt: 2 }}>
                    <Grid size={{ xs: 12, lg: 4 }}><Skeleton variant="rectangular" height={400} /></Grid>
                    <Grid size={{ xs: 12, lg: 8 }}><Skeleton variant="rectangular" height={600} /></Grid>
                </Grid>
            </Box>
        );
    }

    if (!caseData) return <Typography>Case not found</Typography>;

    const riskColor = caseData.riskLevel === 'HIGH' ? 'error.main' : caseData.riskLevel === 'MEDIUM' ? 'warning.main' : 'success.main';

    return (
        <Box>
            {/* Page Header */}
            <Box sx={{ mb: 6, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 3 }}>
                <Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
                        <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: -1 }}>
                            Offboarding: {caseData.employee?.firstName} {caseData.employee?.lastName}
                        </Typography>
                        <Chip
                            label={`${caseData.riskLevel?.toUpperCase() || 'NORMAL'} RISK EXIT`}
                            sx={{ fontWeight: 800, borderRadius: "6px", bgcolor: alpha(riskColor, 0.1), color: riskColor }}
                        />
                    </Box>
<Typography variant="body1" color="text.secondary">
                          ID: {caseData.id.slice(0, 8).toUpperCase()} • Last Day: {new Date(caseData.scheduledDate || caseData.createdAt).toISOString().split("T")[0]} • Manager: {caseData.employee?.department?.name || 'Unknown'} Team
                      </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 2 }}>
                    <Button variant="outlined" startIcon={<span className="material-symbols-outlined">refresh</span>} sx={{ fontWeight: 700, borderRadius: 2 }}>
                        Retry Failed Tasks
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<span className="material-symbols-outlined">verified_user</span>}
                        onClick={async () => {
                            try {
                                const response = await fetch(`/api/offboardings/${params.id}/evidence-pack`);
                                if (!response.ok) throw new Error('Failed to generate evidence pack');
                                
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `evidence-pack-${caseData.employee?.firstName}-${caseData.employee?.lastName}-${params.id.slice(0, 8)}.pdf`;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                            } catch (error) {
                                alert('Failed to generate evidence pack');
                            }
                        }}
                        sx={{
                            fontWeight: 700,
                            borderRadius: 2,
                            bgcolor: "primary.main",
                            boxShadow: (theme) => `0 8px 16px ${alpha(theme.palette.primary.main, 0.2)}`
                        }}
                    >
                        Generate Evidence Pack
                    </Button>
                </Box>
            </Box>

            <Grid container spacing={4}>
                {/* Left Column: Risk Profile */}
                <Grid size={{ xs: 12, lg: 4 }}>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <Card variant="outlined" sx={{ borderRadius: 4 }}>
                            <Box sx={{ p: 3, borderBottom: "1px solid", borderColor: "divider", bgcolor: "rgba(0,0,0,0.01)" }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: "uppercase", color: "text.secondary", letterSpacing: 1 }}>Employee Risk Profile</Typography>
                            </Box>
                            <CardContent sx={{ p: 4, textAlign: "center" }}>
                                <Box sx={{ position: "relative", display: "inline-flex", mb: 2 }}>
                                    <svg width="160" height="160" viewBox="0 0 160 160">
                                        <circle cx="80" cy="80" r="70" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                                        <circle cx="80" cy="80" r="70" fill="none" stroke={riskColor} strokeWidth="12" strokeDasharray="440" strokeDashoffset={440 - (440 * (caseData.riskScore || 0)) / 100} strokeLinecap="round" transform="rotate(-90 80 80)" />
                                    </svg>
                                    <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                                        <Typography variant="h3" sx={{ fontWeight: 900, color: riskColor, lineHeight: 1 }}>{caseData.riskScore || 0}</Typography>
                                        <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase" }}>{caseData.riskLevel} Risk</Typography>
                                    </Box>
                                </Box>
                                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>{caseData.employee?.firstName} {caseData.employee?.lastName}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>{caseData.employee?.jobTitle?.title} • {caseData.employee?.department?.name}</Typography>
                                <Box sx={{ mt: 3, display: "flex", gap: 1, justifyContent: "center" }}>
                                    <Chip label={getEmployeeStatusDisplay(caseData.employee, caseData)} size="small" sx={{ fontWeight: 700, borderRadius: "4px", bgcolor: alpha(riskColor, 0.1), color: riskColor }} />
                                    <Chip label="SaaS Heavy" size="small" variant="outlined" sx={{ fontWeight: 700, borderRadius: "4px" }} />
                                </Box>
                            </CardContent>
                        </Card>

                        {/* Evidence Pack Card */}
                        <Card variant="outlined" sx={{ borderRadius: 4 }}>
                            <Box sx={{ 
                                p: 3, 
                                borderBottom: "1px solid", 
                                borderColor: "divider", 
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white'
                            }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>folder_zip</span>
                                    Evidence Pack
                                </Typography>
                            </Box>
                            <CardContent sx={{ p: 3 }}>
                                <Box sx={{ textAlign: 'center', py: 2 }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#667eea', marginBottom: '16px', display: 'block' }}>folder_zip</span>
                                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                                        Compliance Documentation
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontSize: '0.875rem' }}>
                                        Generate comprehensive evidence pack for audit trails
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        startIcon={<span className="material-symbols-outlined">download</span>}
                                        onClick={async () => {
                                            try {
                                                const response = await fetch(`/api/offboardings/${params.id}/evidence-pack`);
                                                if (!response.ok) throw new Error('Failed to generate evidence pack');
                                                
                                                const blob = await response.blob();
                                                const url = window.URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = `evidence-pack-${caseData.employee?.firstName}-${caseData.employee?.lastName}-${params.id.slice(0, 8)}.pdf`;
                                                document.body.appendChild(a);
                                                a.click();
                                                window.URL.revokeObjectURL(url);
                                                document.body.removeChild(a);
                                            } catch (error) {
                                                alert('Failed to generate evidence pack');
                                            }
                                        }}
                                        sx={{ 
                                            fontWeight: 600,
                                            borderRadius: 2,
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            border: 'none',
                                            '&:hover': {
                                                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                                            }
                                        }}
                                    >
                                        Generate PDF
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>

                        <Paper variant="outlined" sx={{ p: 3, borderRadius: 4, bgcolor: "rgba(0,115,138,0.02)" }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, textTransform: "uppercase" }}>Quick Actions</Typography>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                                <Button fullWidth variant="outlined" startIcon={<span className="material-symbols-outlined">person_pin_circle</span>} sx={{ justifyContent: "flex-start", fontWeight: 700, borderRadius: 2 }}>Manual Override</Button>
                                <Button fullWidth variant="outlined" startIcon={<span className="material-symbols-outlined">contact_mail</span>} sx={{ justifyContent: "flex-start", fontWeight: 700, borderRadius: 2 }}>Contact Manager</Button>
                                <Button fullWidth variant="outlined" startIcon={<span className="material-symbols-outlined">history</span>} sx={{ justifyContent: "flex-start", fontWeight: 700, borderRadius: 2 }}>View Life Cycle</Button>
                            </Box>
                        </Paper>
                    </Box>
                </Grid>

                {/* Right Column: Task Checklist */}
                <Grid size={{ xs: 12, lg: 8 }}>
                    <Card variant="outlined" sx={{ borderRadius: 4 }}>
                        <Box sx={{ p: 3, borderBottom: "1px solid", borderColor: "divider", bgcolor: "rgba(0,0,0,0.01)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Typography variant="h6" sx={{ fontWeight: 800 }}>Offboarding Task Checklist</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>{tasks.reduce((acc, cat) => acc + cat.items.filter(i => i.status === 'completed').length, 0)} / {tasks.reduce((acc, cat) => acc + cat.items.length, 0)} Tasks Completed</Typography>
                        </Box>
                        <Box sx={{ p: 1 }}>
                            {tasks.map((section, idx) => (
                                <Box key={section.category} sx={{ mb: idx !== tasks.length - 1 ? 2 : 0 }}>
                                    <Box sx={{ px: 2, py: 1.5, bgcolor: "rgba(0,0,0,0.03)", borderRadius: 2, mb: 1 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: 0.5, color: "text.primary" }}>{section.category}</Typography>
                                    </Box>
                                    <Box sx={{ display: "flex", flexDirection: "column" }}>
                                        {section.items.map((item) => (
                                            <Box key={item.name} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 2, borderBottom: "1px solid", borderColor: "rgba(0,0,0,0.05)", "&:last-child": { borderBottom: "none" } }}>
                                                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                                    <span className="material-symbols-outlined" style={{ color: item.color === "success.main" ? "#10b981" : item.color === "error.main" ? "#ef4444" : "#94a3b8" }}>{item.icon}</span>
                                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.name}</Typography>
                                                </Box>
                                                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                                    <Chip label={item.status} size="small" sx={{ fontWeight: 800, fontSize: "0.7rem", borderRadius: "4px" }} />
                                                    {item.action && (
                                                        <Button size="small" sx={{ fontWeight: 800, minWidth: 0, p: 0.5 }}>{item.action}</Button>
                                                    )}
                                                </Box>
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
