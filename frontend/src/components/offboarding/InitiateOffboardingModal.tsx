"use client";

import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    Box,
    Typography,
    Alert,
    CircularProgress
} from "@mui/material";
import { supabase } from "@/lib/supabase";

interface InitiateOffboardingProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function InitiateOffboardingModal({ open, onClose, onSuccess }: InitiateOffboardingProps) {
    const [employees, setEmployees] = useState<any[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState("");
    const [lastDay, setLastDay] = useState("");
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            fetchActiveEmployees();
        }
    }, [open]);

    async function fetchActiveEmployees() {
        const { data, error } = await supabase
            .from("employees")
            .select("id, full_name, email, job_title")
            .eq("status", "active");

        if (data) setEmployees(data);
    }

    async function handleInitiate() {
        if (!selectedEmployee || !lastDay) {
            setError("Please select an employee and their last day.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Find employee details
            const employee = employees.find(e => e.id === selectedEmployee);

            // Call hris-sync Edge Function
            const { data, error: funcError } = await supabase.functions.invoke('hris-sync', {
                body: {
                    employee_id: selectedEmployee,
                    company_id: (await supabase.from('employees').select('company_id').eq('id', selectedEmployee).single()).data?.company_id,
                    new_status: 'offboarding'
                }
            });

            if (funcError) throw funcError;

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Initiation Error:", err);
            setError(err.message || "Failed to initiate offboarding.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{ fontWeight: 800 }}>Initiate Offboarding Workflow</DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                        This will trigger the automated revocation of access, asset return requests, and document generation for the selected employee.
                    </Typography>

                    {error && <Alert severity="error">{error}</Alert>}

                    <TextField
                        select
                        fullWidth
                        label="Select Employee"
                        value={selectedEmployee}
                        onChange={(e) => setSelectedEmployee(e.target.value)}
                        variant="outlined"
                        disabled={loading}
                    >
                        {employees.map((emp) => (
                            <MenuItem key={emp.id} value={emp.id}>
                                {emp.full_name} ({emp.job_title})
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        fullWidth
                        label="Last Working Day"
                        type="date"
                        value={lastDay}
                        onChange={(e) => setLastDay(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        variant="outlined"
                        disabled={loading}
                    />

                    <TextField
                        fullWidth
                        label="Departure Reason (Optional)"
                        multiline
                        rows={3}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        variant="outlined"
                        disabled={loading}
                        placeholder="e.g., Voluntary Resignation"
                    />
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
                <Button onClick={onClose} color="inherit" sx={{ fontWeight: 700 }}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={handleInitiate}
                    disabled={loading}
                    sx={{ fontWeight: 800, px: 4 }}
                >
                    {loading ? <CircularProgress size={24} color="inherit" /> : "Start Workflow"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
