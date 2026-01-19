"use client";

import { Box, TextField, MenuItem, Button, Card, CardContent } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";

interface ReportFiltersProps {
  showStatus?: boolean;
  statusOptions?: string[];
  showDateRange?: boolean;
  showDepartment?: boolean;
  departments?: { id: string; name: string }[];
}

export function ReportFilters({
  showStatus,
  statusOptions = [],
  showDateRange,
  showDepartment,
  departments = [],
}: ReportFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [department, setDepartment] = useState(searchParams.get("department") || "");
  const [from, setFrom] = useState(searchParams.get("from") || "");
  const [to, setTo] = useState(searchParams.get("to") || "");

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (department) params.set("department", department);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.push(`?${params.toString()}`);
  }, [status, department, from, to, router]);

  const clearFilters = useCallback(() => {
    setStatus("");
    setDepartment("");
    setFrom("");
    setTo("");
    router.push("?");
  }, [router]);

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-end" }}>
          {showStatus && (
            <TextField
              select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              size="small"
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">All Statuses</MenuItem>
              {statusOptions.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt.replace("_", " ")}
                </MenuItem>
              ))}
            </TextField>
          )}

          {showDepartment && departments.length > 0 && (
            <TextField
              select
              label="Department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              size="small"
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">All Departments</MenuItem>
              {departments.map((dept) => (
                <MenuItem key={dept.id} value={dept.id}>
                  {dept.name}
                </MenuItem>
              ))}
            </TextField>
          )}

          {showDateRange && (
            <>
              <TextField
                type="date"
                label="From Date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ minWidth: 150 }}
              />
              <TextField
                type="date"
                label="To Date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ minWidth: 150 }}
              />
            </>
          )}

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="contained" size="small" onClick={applyFilters}>
              Apply Filters
            </Button>
            <Button variant="outlined" size="small" onClick={clearFilters}>
              Clear
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
