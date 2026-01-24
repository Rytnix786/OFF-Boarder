"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Avatar,
  LinearProgress,
  Tabs,
  Tab,
  Grid,
  Alert,
  Collapse,
  InputAdornment,
  alpha,
} from "@mui/material";
import { createOffboarding } from "@/lib/actions/offboardings";
import { useRouter, useSearchParams } from "next/navigation";

type Offboarding = {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "PENDING_APPROVAL" | "COMPLETED" | "CANCELLED";
  riskLevel: "NORMAL" | "HIGH" | "CRITICAL";
  scheduledDate: Date | null;
  reason: string | null;
  createdAt: Date;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    department: { id: string; name: string } | null;
    jobTitle: { title: string } | null;
  };
  tasks: { id: string; status: string }[];
  approvals: { id: string; status: string }[];
  _count: {
    tasks: number;
    approvals: number;
    assetReturns: number;
  };
};

type WorkflowTemplate = {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
};

interface OffboardingsClientProps {
  offboardings: Offboarding[];
  employees: { id: string; firstName: string; lastName: string; email: string }[];
  workflowTemplates: WorkflowTemplate[];
  departments: { id: string; name: string }[];
  canCreate: boolean;
  isOrgView?: boolean;
}

export default function OffboardingsClient({ 
  offboardings, 
  employees, 
  workflowTemplates,
  departments,
  canCreate,
  isOrgView
}: OffboardingsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [riskLevel, setRiskLevel] = useState<"NORMAL" | "HIGH" | "CRITICAL">("NORMAL");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [selectedWorkflowTemplateId, setSelectedWorkflowTemplateId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");

  useEffect(() => {
    const startOffboardingId = searchParams.get("startOffboarding");
    if (startOffboardingId && employees.some(e => e.id === startOffboardingId)) {
      setSelectedEmployeeId(startOffboardingId);
      setCreateDialogOpen(true);
      router.replace("/app/offboardings");
    }
  }, [searchParams, employees, router]);

  const filteredOffboardings = offboardings.filter((o) => {
    const matchesTab = (() => {
      if (tab === 0) return o.status === "PENDING" || o.status === "IN_PROGRESS" || o.status === "PENDING_APPROVAL";
      if (tab === 1) return o.status === "COMPLETED";
      if (tab === 2) return o.status === "CANCELLED";
      return true;
    })();

    const matchesSearch = 
      o.employee.firstName.toLowerCase().includes(search.toLowerCase()) ||
      o.employee.lastName.toLowerCase().includes(search.toLowerCase()) ||
      o.employee.email.toLowerCase().includes(search.toLowerCase());

    const matchesDepartment = departmentFilter === "all" || o.employee.department?.id === departmentFilter;
    const matchesRisk = riskFilter === "all" || o.riskLevel === riskFilter;

    return matchesTab && matchesSearch && matchesDepartment && matchesRisk;
  });

  const activeCount = offboardings.filter((o) => 
    o.status === "PENDING" || o.status === "IN_PROGRESS" || o.status === "PENDING_APPROVAL"
  ).length;
  const completedCount = offboardings.filter((o) => o.status === "COMPLETED").length;
  const highRiskCount = offboardings.filter((o) => 
    o.riskLevel !== "NORMAL" && o.status !== "COMPLETED" && o.status !== "CANCELLED"
  ).length;

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createOffboarding(formData);

    if (result.error) {
      setError(result.error);
    } else {
      setCreateDialogOpen(false);
        setRiskLevel("NORMAL");
        setSelectedEmployeeId("");
        setSelectedReason("");
        setSelectedWorkflowTemplateId("");
        router.refresh();
      if (result.offboarding) {
        router.push(`/app/offboardings/${result.offboarding.id}`);
      }
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "warning";
      case "IN_PROGRESS": return "info";
      case "PENDING_APPROVAL": return "secondary";
      case "COMPLETED": return "success";
      case "CANCELLED": return "default";
      default: return "default";
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "CRITICAL": return "error";
      case "HIGH": return "warning";
      default: return "default";
    }
  };

  const getProgress = (tasks: { status: string }[]) => {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter((t) => t.status === "COMPLETED" || t.status === "SKIPPED").length;
    return Math.round((completed / tasks.length) * 100);
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Offboardings</Typography>
          <Typography color="text.secondary">
            {activeCount} active, {completedCount} completed
            {highRiskCount > 0 && `, ${highRiskCount} high-risk`}
          </Typography>
        </Box>
        {canCreate && employees.length > 0 && (
          <Button
            variant="contained"
            startIcon={<span className="material-symbols-outlined">person_remove</span>}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            Start Offboarding
          </Button>
        )}
      </Box>

      {highRiskCount > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <strong>{highRiskCount} high-risk offboarding(s)</strong> require additional attention and approvals
        </Alert>
      )}

      <Card 
        variant="outlined" 
        sx={{ 
          borderRadius: 3, 
          mb: 3,
          bgcolor: isOrgView ? alpha("#0f172a", 0.4) : "background.paper",
          borderColor: isOrgView ? alpha("#ffffff", 0.1) : "divider",
        }}
      >
        <Box sx={{ p: 2, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
          <TextField
            placeholder="Search by name or email..."
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ 
              width: 280,
              "& .MuiOutlinedInput-root": {
                bgcolor: isOrgView ? alpha("#020617", 0.5) : "transparent",
                color: isOrgView ? "#f8fafc" : "inherit",
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: isOrgView ? "#818cf8" : "inherit" }}>search</span>
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              displayEmpty
              sx={{ 
                bgcolor: isOrgView ? alpha("#020617", 0.5) : "transparent",
                color: isOrgView ? "#f8fafc" : "inherit",
              }}
            >
              <MenuItem value="all">All Departments</MenuItem>
              {departments.map((d) => (
                <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              displayEmpty
              sx={{ 
                bgcolor: isOrgView ? alpha("#020617", 0.5) : "transparent",
                color: isOrgView ? "#f8fafc" : "inherit",
              }}
            >
              <MenuItem value="all">All Risk</MenuItem>
              <MenuItem value="NORMAL">Normal</MenuItem>
              <MenuItem value="HIGH">High</MenuItem>
              <MenuItem value="CRITICAL">Critical</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Card>

      <Card 
        variant="outlined" 
        sx={{ 
          borderRadius: 3,
          bgcolor: isOrgView ? alpha("#0f172a", 0.4) : "background.paper",
          borderColor: isOrgView ? alpha("#ffffff", 0.1) : "divider",
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ 
            borderBottom: "1px solid", 
            borderColor: isOrgView ? alpha("#ffffff", 0.05) : "divider", 
            px: 2,
            "& .MuiTab-root": { color: isOrgView ? "#94a3b8" : "inherit" },
            "& .Mui-selected": { color: isOrgView ? "#818cf8 !important" : "primary.main" },
          }}
        >
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                Active
                {activeCount > 0 && (
                  <Chip label={activeCount} size="small" color="primary" sx={{ height: 20, fontSize: 11 }} />
                )}
              </Box>
            }
          />
          <Tab label={`Completed (${completedCount})`} />
          <Tab label="Cancelled" />
        </Tabs>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: 700, color: "text.secondary", fontSize: 12, textTransform: "uppercase" } }}>
                <TableCell>Employee</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Risk</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Scheduled</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredOffboardings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 8, textAlign: "center" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.3 }}>
                      group_remove
                    </span>
                    <Typography color="text.secondary" sx={{ mt: 1 }}>
                      No offboardings in this category
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOffboardings.map((o) => {
                  const progress = getProgress(o.tasks);
                  const pendingApprovals = o.approvals.filter(a => a.status === "PENDING").length;
                  return (
                      <TableRow
                        key={o.id}
                        hover
                        sx={{ cursor: isOrgView ? "default" : "pointer" }}
                        onClick={() => !isOrgView && router.push(`/app/offboardings/${o.id}`)}
                      >
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Avatar sx={{ 
                            bgcolor: o.riskLevel === "CRITICAL" ? "error.main" : 
                                    o.riskLevel === "HIGH" ? "warning.main" : "primary.main" 
                          }}>
                            {o.employee.firstName.charAt(0)}{o.employee.lastName.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography fontWeight={600}>
                              {o.employee.firstName} {o.employee.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {o.employee.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{o.employee.department?.name || "—"}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {o.employee.jobTitle?.title || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                          <Chip
                            label={o.status.replace("_", " ")}
                            size="small"
                            color={getStatusColor(o.status) as any}
                            sx={{ fontWeight: 600 }}
                          />
                          {pendingApprovals > 0 && (
                            <Typography variant="caption" color="warning.main">
                              {pendingApprovals} approval(s) pending
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {o.riskLevel !== "NORMAL" ? (
                          <Chip
                            icon={<span className="material-symbols-outlined" style={{ fontSize: 14 }}>warning</span>}
                            label={o.riskLevel}
                            size="small"
                            color={getRiskColor(o.riskLevel) as any}
                            sx={{ fontWeight: 600 }}
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">Normal</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ width: 150 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {progress}% ({o.tasks.filter(t => t.status === "COMPLETED").length}/{o.tasks.length})
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={progress}
                            sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
                            color={progress === 100 ? "success" : "primary"}
                          />
                        </Box>
                      </TableCell>
                        <TableCell>
                          {o.scheduledDate
                            ? new Date(o.scheduledDate).toLocaleDateString("en-US")
                            : "—"}
                        </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleCreate}>
          <DialogTitle fontWeight={700}>Start Offboarding</DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            )}
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth required>
                    <InputLabel>Employee</InputLabel>
                    <Select 
                      name="employeeId" 
                      label="Employee"
                      value={selectedEmployeeId}
                      onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    >
                    {employees.map((e) => (
                      <MenuItem key={e.id} value={e.id}>
                        {e.firstName} {e.lastName} ({e.email})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Scheduled Date"
                  name="scheduledDate"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Risk Level</InputLabel>
                  <Select 
                    name="riskLevel" 
                    label="Risk Level" 
                    value={riskLevel}
                    onChange={(e) => setRiskLevel(e.target.value as any)}
                  >
                    <MenuItem value="NORMAL">Normal</MenuItem>
                    <MenuItem value="HIGH">High Risk</MenuItem>
                    <MenuItem value="CRITICAL">Critical Risk</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Collapse in={riskLevel !== "NORMAL"} sx={{ width: "100%", px: 2 }}>
                <Alert severity={riskLevel === "CRITICAL" ? "error" : "warning"} sx={{ mb: 2 }}>
                  {riskLevel === "CRITICAL" 
                    ? "Critical risk offboardings require 3 approvals and have stricter handling requirements."
                    : "High risk offboardings require 2 approvals and include additional security tasks."
                  }
                </Alert>
                <TextField
                  fullWidth
                  label="Risk Reason"
                  name="riskReason"
                  required={riskLevel !== "NORMAL"}
                  multiline
                  rows={2}
                  placeholder="Explain why this offboarding is high-risk..."
                />
              </Collapse>
              <Grid size={{ xs: 12 }}>
                  <FormControl fullWidth>
                    <InputLabel>Reason</InputLabel>
                    <Select 
                      name="reason" 
                      label="Reason"
                      value={selectedReason}
                      onChange={(e) => setSelectedReason(e.target.value)}
                    >
                    <MenuItem value="Voluntary resignation">Voluntary resignation</MenuItem>
                    <MenuItem value="Involuntary termination">Involuntary termination</MenuItem>
                    <MenuItem value="Layoff">Layoff</MenuItem>
                    <MenuItem value="Retirement">Retirement</MenuItem>
                    <MenuItem value="Contract end">Contract end</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {workflowTemplates.length > 0 && (
                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth>
                      <InputLabel>Workflow Template</InputLabel>
                      <Select 
                        name="workflowTemplateId" 
                        label="Workflow Template" 
                        value={selectedWorkflowTemplateId}
                        onChange={(e) => setSelectedWorkflowTemplateId(e.target.value)}
                      >
                      <MenuItem value="">Default Template</MenuItem>
                      {workflowTemplates.map((t) => (
                        <MenuItem key={t.id} value={t.id}>
                          {t.name} {t.isDefault && "(Default)"}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Notes"
                  name="notes"
                  multiline
                  rows={3}
                  placeholder="Additional notes about this offboarding..."
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => { setCreateDialogOpen(false); setRiskLevel("NORMAL"); setSelectedEmployeeId(""); setSelectedReason(""); setSelectedWorkflowTemplateId(""); }}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={loading}
              color={riskLevel === "CRITICAL" ? "error" : riskLevel === "HIGH" ? "warning" : "primary"}
            >
              {loading ? "Creating..." : "Start Offboarding"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
