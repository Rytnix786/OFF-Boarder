"use client";

import React from "react";
import {
    Box,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    IconButton,
    Fab,
    Pagination,
    alpha,
    Divider,
} from "@mui/material";

const AUDIT_LOGS = [
    {
        timestamp: { date: "Oct 24, 2023", time: "14:22:01.442" },
        actor: "admin_9921",
        event: "GitHub Access Revoked",
        type: "Auto",
        resource: "github.com/org-core",
        ip: "192.168.1.45",
        status: "Success",
        statusColor: "success",
    },
    {
        timestamp: { date: "Oct 24, 2023", time: "14:21:55.008" },
        actor: "system_bot",
        event: "AWS Prod Access Removed",
        type: "Auto",
        resource: "arn:aws:iam::12345678",
        ip: "10.0.0.12",
        status: "Success",
        statusColor: "success",
    },
    {
        timestamp: { date: "Oct 24, 2023", time: "14:18:30.112" },
        actor: "admin_9921",
        event: "Jira Account Deactivated",
        type: "Manual",
        resource: "atlassian.net/jira",
        ip: "192.168.1.45",
        status: "Success",
        statusColor: "success",
    },
    {
        timestamp: { date: "Oct 24, 2023", time: "14:15:12.871" },
        actor: "system_bot",
        event: "COBRA Documents Provisioned",
        type: "Auto",
        resource: "s3://compliance-docs/id_9",
        ip: "10.0.0.12",
        status: "Processing",
        statusColor: "primary",
    },
    {
        timestamp: { date: "Oct 24, 2023", time: "13:45:00.001" },
        actor: "qa_lead_04",
        event: "Slack Access Revoked",
        type: "Manual",
        resource: "slack.com/workspace-a",
        ip: "172.16.254.1",
        status: "Success",
        statusColor: "success",
    },
    {
        timestamp: { date: "Oct 24, 2023", time: "13:42:18.991" },
        actor: "system_bot",
        event: "GCP Project Exclusion",
        type: "Auto",
        resource: "projects/main-prod-9",
        ip: "10.0.0.12",
        status: "Failed",
        statusColor: "error",
    }
];

export default function AuditLogsPage() {
    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 6, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <Box sx={{ maxWidth: 800 }}>
                    <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: -1, mb: 1.5 }}>
                        Audit Logs & Evidence
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ fontSize: "1.125rem" }}>
                        A complete compliance trail of all automated and manual offboarding actions. These logs are append-only and cryptographically signed.
                    </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: "6px 16px", bgcolor: "rgba(16,185,129,0.05)", borderRadius: "99px", border: "1px solid", borderColor: "success.light" }}>
                    <Box sx={{ width: 8, height: 8, bgcolor: "success.main", borderRadius: "50%", animation: "pulse 2s infinite" }} />
                    <Typography variant="caption" sx={{ fontWeight: 800, color: "success.dark", textTransform: "uppercase", letterSpacing: 1 }}>Live Logging Active</Typography>
                </Box>
            </Box>

            {/* Filters */}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 4, alignItems: "center" }}>
                {[
                    { label: "Date Range: Last 7 Days", icon: "calendar_today" },
                    { label: "User: All Actors", icon: "person" },
                    { label: "Action Type: All", icon: "bolt" },
                    { label: "Status: Success", icon: "shield" },
                ].map((filter) => (
                    <Button
                        key={filter.label}
                        variant="outlined"
                        startIcon={<span className="material-symbols-outlined" style={{ fontSize: "20px" }}>{filter.icon}</span>}
                        endIcon={<span className="material-symbols-outlined">expand_more</span>}
                        sx={{ borderRadius: 2.5, borderColor: "divider", color: "text.primary", fontWeight: 600, px: 2 }}
                    >
                        {filter.label}
                    </Button>
                ))}
                <Divider orientation="vertical" flexItem sx={{ mx: 1, height: 32 }} />
                <Button variant="text" sx={{ fontWeight: 800, color: "primary.main" }}>Clear Filters</Button>
            </Box>

            {/* Logs Table */}
            <Paper variant="outlined" sx={{ borderRadius: 4, overflow: "hidden" }}>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: "rgba(0,0,0,0.02)", "& th": { textTransform: "uppercase", fontSize: "0.6875rem", fontWeight: 800, color: "text.secondary", py: 2.5 } }}>
                                <TableCell>Timestamp</TableCell>
                                <TableCell>Actor ID</TableCell>
                                <TableCell>Event</TableCell>
                                <TableCell>Resource</TableCell>
                                <TableCell>IP Address</TableCell>
                                <TableCell align="right">Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {AUDIT_LOGS.map((log, idx) => (
                                <TableRow key={idx} hover sx={{ "& td": { py: 2.5 } }}>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{log.timestamp.date}</Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace", opacity: 0.7 }}>{log.timestamp.time}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                            <Box sx={{ p: 0.5, bgcolor: "primary.light", borderRadius: 1.5, display: "flex", opacity: 0.2 }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>admin_panel_settings</span>
                                            </Box>
                                            <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>{log.actor}</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{log.event}</Typography>
                                            <Chip label={log.type} size="small" sx={{ height: 18, fontSize: "0.625rem", fontWeight: 800, borderRadius: "4px" }} />
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic", opacity: 0.8 }}>{log.resource}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="caption" sx={{ fontFamily: "monospace", color: "text.secondary" }}>{log.ip}</Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Chip
                                            label={log.status}
                                            size="small"
                                            sx={{
                                                fontWeight: 800,
                                                fontSize: "0.75rem",
                                                bgcolor: alpha(log.statusColor === "success" ? "#10b981" : log.statusColor === "error" ? "#ef4444" : "#00738a", 0.1),
                                                color: log.statusColor === "success" ? "success.main" : log.statusColor === "error" ? "error.main" : "primary.main",
                                                "& .MuiChip-label": { px: 2 }
                                            }}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Pagination */}
                <Box sx={{ p: 3, display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid", borderColor: "divider" }}>
                    <Typography variant="caption" color="text.secondary">
                        Showing <Box component="span" sx={{ fontWeight: 800, color: "text.primary" }}>1 - 6</Box> of <Box component="span" sx={{ fontWeight: 800, color: "text.primary" }}>12,482</Box> entries
                    </Typography>
                    <Pagination count={456} color="primary" shape="rounded" size="small" />
                </Box>
            </Paper>

            {/* FAB */}
            <Fab
                color="primary"
                variant="extended"
                sx={{
                    position: "fixed",
                    bottom: 32,
                    right: 32,
                    fontWeight: 800,
                    textTransform: "none",
                    px: 4,
                    py: 3,
                    boxShadow: theme => `0 12px 24px ${alpha(theme.palette.primary.main, 0.4)}`
                }}
            >
                <span className="material-symbols-outlined" style={{ marginRight: "12px" }}>folder_zip</span>
                Generate Evidence Pack
            </Fab>

            {/* Footer */}
            <Box sx={{ mt: 10, py: 4, borderTop: "1px solid", borderColor: "divider", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box sx={{ display: "flex", gap: 3 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>© 2024 OffboardHQ Inc.</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", "&:hover": { color: "primary.main", cursor: "pointer" } }}>API Status</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", "&:hover": { color: "primary.main", cursor: "pointer" } }}>Security</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "#94a3b8" }}>verified_user</span>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>SOC2 Type II Certified Platform</Typography>
                </Box>
            </Box>

            <style jsx global>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
        </Box>
    );
}
