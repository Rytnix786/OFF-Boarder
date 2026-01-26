"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  Avatar,
  LinearProgress,
  Checkbox,
  IconButton,
  Grid,
  Divider,
  alpha,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Tabs,
  Tab,
  Snackbar,
} from "@mui/material";
import { Collapse } from "@mui/material";
import { 
  updateOffboardingTask, 
  cancelOffboarding, 
  updateOffboardingRisk 
} from "@/lib/actions/offboardings";
import { verifyPortalTask } from "@/lib/actions/portal-tasks";
import { submitApproval } from "@/lib/actions/approvals";
import { updateAssetReturnForOffboarding as updateAssetReturn } from "@/lib/actions/assets";
import { generateEvidencePack, exportEvidencePackAsJSON } from "@/lib/actions/evidence";
import { acknowledgeMonitoringEvent } from "@/lib/actions/monitoring";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TaskEvidencePanel } from "@/components/offboarding/TaskEvidencePanel";
import { TaskComments } from "@/components/offboarding/TaskComments";
import MessageIcon from "@mui/icons-material/Message";
import CloseIcon from "@mui/icons-material/Close";

type EvidenceItem = {
  id: string;
  type: "FILE" | "LINK" | "NOTE" | "SYSTEM_PROOF";
  title: string | null;
  description: string | null;
  fileName: string | null;
  fileUrl: string | null;
  linkUrl: string | null;
  noteContent: string | null;
  systemProof: unknown;
  createdAt: Date;
  isImmutable: boolean;
};

type Task = {
  id: string;
  name: string;
  description: string | null;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED" | "BLOCKED";
  category: string | null;
  dueDate: Date | null;
  completedAt: Date | null;
  requiresApproval: boolean;
  isHighRiskTask: boolean;
  isEmployeeRequired: boolean;
  isVerified: boolean;
  verifiedAt: Date | null;
  evidenceRequirement: "REQUIRED" | "OPTIONAL" | "NONE";
  evidence: EvidenceItem[];
};

type Approval = {
  id: string;
  type: "TASK" | "OFFBOARDING" | "HIGH_RISK";
  status: "PENDING" | "APPROVED" | "REJECTED";
  approvalOrder: number;
  approver: { id: string; name: string | null; email: string } | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  comments: string | null;
  task: { name: string } | null;
};

type AssetReturn = {
  id: string;
  status: "PENDING" | "RETURNED" | "NOT_RETURNED" | "MISSING" | "DAMAGED";
  returnedAt: Date | null;
  condition: string | null;
  notes: string | null;
  asset: {
    id: string;
    name: string;
    type: string;
    serialNumber: string | null;
    assetTag: string | null;
  };
};

type MonitoringEvent = {
  id: string;
  eventType: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  source: string | null;
  acknowledged: boolean;
  createdAt: Date;
};

type Offboarding = {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "PENDING_APPROVAL" | "COMPLETED" | "CANCELLED";
  riskLevel: "NORMAL" | "HIGH" | "CRITICAL";
  riskReason: string | null;
  scheduledDate: Date | null;
  completedDate: Date | null;
  reason: string | null;
  notes: string | null;
  createdAt: Date;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    department: { name: string } | null;
    jobTitle: { title: string } | null;
    location: { name: string } | null;
    managerMembership: { id: string; user: { name: string | null; email: string } } | null;
  };
  tasks: Task[];
  approvals: Approval[];
  assetReturns: AssetReturn[];
  evidencePack: { id: string; generatedAt: Date; checksum: string | null } | null;
  monitoringEvents: MonitoringEvent[];
  workflowTemplate: { name: string } | null;
};

interface OffboardingDetailClientProps {
  offboarding: Offboarding;
  canUpdate: boolean;
  canApprove: boolean;
}

export default function OffboardingDetailClient({ 
  offboarding, 
  canUpdate, 
  canApprove 
}: OffboardingDetailClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [riskDialog, setRiskDialog] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState<Approval | null>(null);
  const [assetDialog, setAssetDialog] = useState<AssetReturn | null>(null);
  const [selectedTaskForComments, setSelectedTaskForComments] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const completedTasks = offboarding.tasks.filter((t) => t.status === "COMPLETED" || t.status === "SKIPPED").length;
  const progress = offboarding.tasks.length > 0 ? Math.round((completedTasks / offboarding.tasks.length) * 100) : 0;
  
  const pendingApprovals = offboarding.approvals.filter(a => a.status === "PENDING");
  const pendingAssets = offboarding.assetReturns.filter(ar => ar.status === "PENDING");
  const unresolvedAlerts = offboarding.monitoringEvents.filter(e => !e.acknowledged && (e.severity === "HIGH" || e.severity === "CRITICAL"));

    const handleTaskToggle = async (taskId: string, currentStatus: string) => {
      setLoading(taskId);
      try {
        const newStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";
        const result = await updateOffboardingTask(taskId, newStatus);
        if (result.error) {
          setSnackbar({ open: true, message: result.error, severity: "error" });
        }
        router.refresh();
      } catch (error) {
        setSnackbar({ open: true, message: "Failed to update task", severity: "error" });
      } finally {
        setLoading(null);
      }
    };

    const handleVerifyTask = async (taskId: string) => {
      setLoading(`verify-${taskId}`);
      try {
        const result = await verifyPortalTask(taskId);
        if (result.error) {
          setSnackbar({ open: true, message: result.error, severity: "error" });
        } else {
          setSnackbar({ open: true, message: "Task verified", severity: "success" });
        }
        router.refresh();
      } catch (error) {
        setSnackbar({ open: true, message: "Failed to verify task", severity: "error" });
      } finally {
        setLoading(null);
      }
    };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this offboarding? The employee will be reactivated.")) return;
    setLoading("cancel");
    await cancelOffboarding(offboarding.id);
    router.push("/app/offboardings");
  };

  const handleRiskUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading("risk");
    const formData = new FormData(e.currentTarget);
    const result = await updateOffboardingRisk(
      offboarding.id,
      formData.get("riskLevel") as "NORMAL" | "HIGH" | "CRITICAL",
      formData.get("riskReason") as string
    );
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Risk level updated", severity: "success" });
    }
    setRiskDialog(false);
    setLoading(null);
    router.refresh();
  };

  const handleApproval = async (status: "APPROVED" | "REJECTED", comments?: string, rejectionReason?: string) => {
    if (!approvalDialog) return;
    setLoading("approval");
    const result = await submitApproval(approvalDialog.id, status, comments, rejectionReason);
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: `Approval ${status.toLowerCase()}`, severity: "success" });
    }
    setApprovalDialog(null);
    setLoading(null);
    router.refresh();
  };

  const handleAssetReturn = async (status: "RETURNED" | "MISSING" | "DAMAGED", condition?: string, notes?: string) => {
    if (!assetDialog) return;
    setLoading("asset");
    const result = await updateAssetReturn(offboarding.id, assetDialog.asset.id, status, notes);
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Asset status updated", severity: "success" });
    }
    setAssetDialog(null);
    setLoading(null);
    router.refresh();
  };

  const handleGenerateEvidence = async () => {
    setLoading("evidence");
    const result = await generateEvidencePack(offboarding.id);
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Evidence pack generated", severity: "success" });
    }
    setLoading(null);
    router.refresh();
  };

  const handleExportEvidence = async () => {
    setLoading("export");
    const result = await exportEvidencePackAsJSON(offboarding.id);
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `evidence-pack-${offboarding.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setLoading(null);
  };

  const handleAcknowledgeAlert = async (eventId: string) => {
    setLoading(eventId);
    await acknowledgeMonitoringEvent(eventId);
    router.refresh();
    setLoading(null);
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL": return "error";
      case "HIGH": return "warning";
      case "MEDIUM": return "info";
      default: return "default";
    }
  };

  const groupedTasks = offboarding.tasks.reduce((acc, task) => {
    const cat = task.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
        <Link href="/app/offboardings" passHref style={{ textDecoration: 'none', color: 'inherit' }}>
          <IconButton>
            <span className="material-symbols-outlined">arrow_back</span>
          </IconButton>
        </Link>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="h4" fontWeight={800}>
              {offboarding.employee.firstName} {offboarding.employee.lastName}
            </Typography>
            {offboarding.riskLevel !== "NORMAL" && (
              <Chip
                icon={<span className="material-symbols-outlined" style={{ fontSize: 16 }}>warning</span>}
                label={`${offboarding.riskLevel} RISK`}
                color={getRiskColor(offboarding.riskLevel) as any}
                sx={{ fontWeight: 700 }}
              />
            )}
          </Box>
          <Typography color="text.secondary">Offboarding Process</Typography>
        </Box>
          <Chip
            label={((offboarding.status === "IN_PROGRESS" && progress === 100) ? "COMPLETED" : offboarding.status).replace("_", " ")}
            color={((offboarding.status === "IN_PROGRESS" && progress === 100) ? "success" : getStatusColor(offboarding.status)) as any}
            sx={{ fontWeight: 700 }}
          />
        {canUpdate && offboarding.status !== "COMPLETED" && offboarding.status !== "CANCELLED" && (
          <>
            <Button variant="outlined" onClick={() => setRiskDialog(true)}>
              Risk Level
            </Button>
            <Button variant="outlined" color="error" onClick={handleCancel} disabled={loading === "cancel"}>
              Cancel
            </Button>
          </>
        )}
      </Box>

      {unresolvedAlerts.length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <strong>{unresolvedAlerts.length} unacknowledged security alert(s)</strong> - Review the Monitoring tab
        </Alert>
      )}

      {pendingApprovals.length > 0 && offboarding.status === "PENDING_APPROVAL" && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <strong>{pendingApprovals.length} approval(s) required</strong> before this offboarding can proceed
        </Alert>
      )}

      {pendingAssets.length > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>{pendingAssets.length} asset(s) pending return</strong> - Must be resolved before completion
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                <Avatar sx={{ 
                  width: 64, 
                  height: 64, 
                  bgcolor: offboarding.riskLevel === "CRITICAL" ? "error.main" : offboarding.riskLevel === "HIGH" ? "warning.main" : "primary.main", 
                  fontSize: 24 
                }}>
                  {offboarding.employee.firstName.charAt(0)}{offboarding.employee.lastName.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    {offboarding.employee.firstName} {offboarding.employee.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {offboarding.employee.jobTitle?.title || "No title"}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Email</Typography>
                  <Typography variant="body2">{offboarding.employee.email}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Department</Typography>
                  <Typography variant="body2">{offboarding.employee.department?.name || "—"}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Location</Typography>
                  <Typography variant="body2">{offboarding.employee.location?.name || "—"}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Manager</Typography>
                  <Typography variant="body2">
                    {offboarding.employee.managerMembership
                      ? (offboarding.employee.managerMembership.user.name || offboarding.employee.managerMembership.user.email)
                      : "—"}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Reason</Typography>
                  <Typography variant="body2">{offboarding.reason || "—"}</Typography>
                </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Scheduled Date</Typography>
                    <Typography variant="body2">
                      {offboarding.scheduledDate
                        ? (isMounted ? new Date(offboarding.scheduledDate).toLocaleDateString("en-US") : "...")
                        : "—"}
                    </Typography>
                  </Box>
                {offboarding.riskReason && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Risk Reason</Typography>
                    <Typography variant="body2">{offboarding.riskReason}</Typography>
                  </Box>
                )}
                {offboarding.workflowTemplate && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Workflow Template</Typography>
                    <Typography variant="body2">{offboarding.workflowTemplate.name}</Typography>
               </Box>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<span className="material-symbols-outlined">description</span>}
                onClick={handleGenerateEvidence}
                disabled={loading === "evidence"}
              >
                {offboarding.evidencePack ? "Regenerate" : "Generate"} Evidence Pack
              </Button>
              {offboarding.evidencePack && (
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<span className="material-symbols-outlined">download</span>}
                  onClick={handleExportEvidence}
                  disabled={loading === "export"}
                >
                  Export Evidence (JSON)
                </Button>
              )}
              <Button
                variant="contained"
                fullWidth
                startIcon={<span className="material-symbols-outlined">picture_as_pdf</span>}
                onClick={() => {
                  window.open(`/api/offboardings/${offboarding.id}/evidence-pack`, "_blank");
                }}
                sx={{ 
                  bgcolor: "primary.main",
                  "&:hover": { bgcolor: "primary.dark" }
                }}
              >
                Export Evidence Pack (PDF)
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
                <Tab label={`Tasks (${offboarding.tasks.length})`} />
                <Tab label={`Approvals (${offboarding.approvals.length})`} />
                <Tab label={`Assets (${offboarding.assetReturns.length})`} />
                <Tab label={`Monitoring (${offboarding.monitoringEvents.length})`} />
              </Tabs>
            </Box>

            <CardContent sx={{ p: 3 }}>
              {activeTab === 0 && (
                <>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                    <Typography variant="h6" fontWeight={700}>Tasks</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {completedTasks} of {offboarding.tasks.length} completed
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 3 }}>
                    <LinearProgress
                      variant="determinate"
                      value={progress}
                      sx={{ height: 8, borderRadius: 4 }}
                      color={progress === 100 ? "success" : "primary"}
                    />
                  </Box>

                  {Object.entries(groupedTasks).map(([category, tasks]) => (
                    <Box key={category} sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                        {category}
                      </Typography>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          {tasks.map((task) => {
                              const hasRequiredEvidence = task.evidenceRequirement === "REQUIRED" && task.evidence.length === 0;
                              const isAdminBlocked = task.isEmployeeRequired && task.status !== "COMPLETED";
                              const hasPendingApproval = task.requiresApproval && offboarding.approvals.some(a => a.task?.name === task.name && a.status === "PENDING");
                              const isOffboardingClosed = offboarding.status === "COMPLETED" || offboarding.status === "CANCELLED";
                              
                              const getDisabledReason = () => {
                                if (!canUpdate) return "You don't have permission to update tasks";
                                if (isOffboardingClosed) return `Offboarding is ${offboarding.status.toLowerCase()}`;
                                if (hasPendingApproval) return "Waiting for approval";
                                if (hasRequiredEvidence) return "Evidence required before completing";
                                if (isAdminBlocked) return "Must be completed by employee";
                                return "";
                              };
                              
                                const isDisabled = !canUpdate || loading === task.id || isOffboardingClosed || hasPendingApproval || hasRequiredEvidence || isAdminBlocked;
                                const disabledReason = getDisabledReason();
                                
                                // Dynamic hover color based on status
                                const getHoverBg = () => {
                                  if (isDisabled) return {};
                                  if (task.status === "COMPLETED") return { bgcolor: alpha("#22c55e", 0.1) };
                                  if (task.isHighRiskTask) return { bgcolor: alpha("#ef4444", 0.1) };
                                  if (hasRequiredEvidence) return { bgcolor: alpha("#f59e0b", 0.08) };
                                  return { bgcolor: alpha("#3b82f6", 0.08) };
                                };
                                
                                  return (
                                  <Box
                                    key={task.id}
                                    sx={{
                                      p: 2,
                                      borderRadius: 2,
                                      bgcolor: task.status === "COMPLETED" ? alpha("#22c55e", 0.05) : task.isHighRiskTask ? alpha("#ef4444", 0.05) : hasRequiredEvidence ? alpha("#f59e0b", 0.03) : "transparent",
                                      border: "1px solid",
                                      borderColor: task.status === "COMPLETED" ? alpha("#22c55e", 0.2) : task.isHighRiskTask ? alpha("#ef4444", 0.2) : hasRequiredEvidence ? alpha("#f59e0b", 0.2) : "divider",
                                      cursor: !isDisabled ? "pointer" : "default",
                                      transition: "all 0.2s ease",
                                      "&:hover": getHoverBg(),
                                    }}
                                    onClick={() => !isDisabled && handleTaskToggle(task.id, task.status)}
                                  >
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                    <Tooltip title={disabledReason} placement="top">
                                      <Box 
                                        sx={{ 
                                          display: "flex", 
                                          alignItems: "center",
                                          pointerEvents: "none" // Make checkbox non-interactive to prevent double-toggling
                                        }}
                                      >
                                          <Checkbox
                                            checked={task.status === "COMPLETED"}
                                            disabled={isDisabled}
                                            sx={{
                                              color: task.status === "COMPLETED" ? "success.main" : undefined,
                                              "&.Mui-checked": { color: "success.main" },
                                            }}
                                          />
                                      </Box>
                                    </Tooltip>
                                  <Box sx={{ flex: 1 }}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                      <Typography
                                        fontWeight={600}
                                        sx={{
                                          textDecoration: task.status === "COMPLETED" ? "line-through" : "none",
                                          color: task.status === "COMPLETED" ? "text.secondary" : "text.primary",
                                        }}
                                      >
                                        {task.name}
                                      </Typography>
                                      {task.isHighRiskTask && (
                                        <Chip label="High Risk" size="small" color="error" sx={{ height: 20 }} />
                                      )}
                                      {task.isEmployeeRequired && (
                                        <Chip label="Employee Action" size="small" variant="outlined" sx={{ height: 20 }} />
                                      )}
                                      {task.isVerified ? (
                                        <Chip label="Verified ✓" size="small" color="success" sx={{ height: 20, fontWeight: 700 }} />
                                      ) : task.status === "COMPLETED" && task.isEmployeeRequired && (
                                        <Button 
                                          size="small" 
                                          variant="contained" 
                                          color="primary"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleVerifyTask(task.id);
                                          }}
                                          disabled={loading === `verify-${task.id}`}
                                          sx={{ height: 24, fontSize: "0.65rem", py: 0 }}
                                        >
                                          Verify Completion
                                        </Button>
                                      )}
                                      {task.requiresApproval && (
                                        <Chip label="Requires Approval" size="small" color="warning" sx={{ height: 20 }} />
                                      )}
                                      {task.evidenceRequirement === "REQUIRED" && (
                                        <Chip 
                                          label={task.evidence.length > 0 ? "Evidence ✓" : "Evidence Required"} 
                                          size="small" 
                                          color={task.evidence.length > 0 ? "success" : "warning"} 
                                          sx={{ height: 20 }} 
                                        />
                                      )}
                                    </Box>
                                    {task.description && (
                                      <Typography variant="caption" color="text.secondary">
                                        {task.description}
                                      </Typography>
                                    )}
                                  </Box>
                                     {task.completedAt && (
                                       <Typography variant="caption" color="success.main">
                                         Completed {isMounted ? new Date(task.completedAt).toLocaleDateString("en-US") : "..."}
                                       </Typography>
                                     )}
                                    <IconButton 
                                      size="small" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedTaskForComments(selectedTaskForComments === task.id ? null : task.id);
                                      }}
                                      color={selectedTaskForComments === task.id ? "primary" : "default"}
                                      sx={{ ml: 1 }}
                                    >
                                      {selectedTaskForComments === task.id ? <CloseIcon fontSize="small" /> : <MessageIcon fontSize="small" />}
                                    </IconButton>
                                  </Box>
    
                                  <Box onClick={(e) => e.stopPropagation()}>
                                    <Collapse in={selectedTaskForComments === task.id} unmountOnExit>
                                      <Box sx={{ mb: 2, px: 2 }}>
                                        <TaskComments taskId={task.id} />
                                      </Box>
                                    </Collapse>
                                  
                                  <TaskEvidencePanel
                                    taskId={task.id}

                                  taskName={task.name}
                                  evidenceRequirement={task.evidenceRequirement}
                                  evidence={task.evidence}
                                  taskCompleted={task.status === "COMPLETED"}
                                  offboardingCompleted={offboarding.status === "COMPLETED"}
                                  canEdit={canUpdate}
                                />
                              </Box>
                            </Box>
                          )})}
                      </Box>
                    </Box>
                  ))}
                </>
              )}

              {activeTab === 1 && (
                <>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>Approvals</Typography>
                  {offboarding.approvals.length === 0 ? (
                    <Typography color="text.secondary">No approvals required</Typography>
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Type</TableCell>
                          <TableCell>Task</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Approver</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {offboarding.approvals.map((approval) => (
                          <TableRow key={approval.id}>
                            <TableCell>
                              <Chip 
                                label={approval.type} 
                                size="small" 
                                color={approval.type === "HIGH_RISK" ? "error" : "default"} 
                              />
                            </TableCell>
                            <TableCell>{approval.task?.name || "—"}</TableCell>
                            <TableCell>
                              <Chip
                                label={approval.status}
                                size="small"
                                color={approval.status === "APPROVED" ? "success" : approval.status === "REJECTED" ? "error" : "warning"}
                              />
                            </TableCell>
                            <TableCell>
                              {approval.approver ? (approval.approver.name || approval.approver.email) : "—"}
                            </TableCell>
                            <TableCell>
                              {approval.status === "PENDING" && canApprove && (
                                <Button size="small" onClick={() => setApprovalDialog(approval)}>
                                  Review
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </>
              )}

              {activeTab === 2 && (
                <>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>Asset Returns</Typography>
                  {offboarding.assetReturns.length === 0 ? (
                    <Typography color="text.secondary">No assets assigned</Typography>
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Asset</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Serial/Tag</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {offboarding.assetReturns.map((ar) => (
                          <TableRow key={ar.id}>
                            <TableCell>{ar.asset.name}</TableCell>
                            <TableCell>{ar.asset.type}</TableCell>
                            <TableCell>{ar.asset.serialNumber || ar.asset.assetTag || "—"}</TableCell>
                            <TableCell>
                              <Chip
                                label={ar.status}
                                size="small"
                                color={ar.status === "RETURNED" ? "success" : ar.status === "PENDING" ? "warning" : "error"}
                              />
                            </TableCell>
                            <TableCell>
                              {ar.status === "PENDING" && canUpdate && (
                                <Button size="small" onClick={() => setAssetDialog(ar)}>
                                  Update
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </>
              )}

              {activeTab === 3 && (
                <>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>Post-Offboarding Monitoring</Typography>
                  {offboarding.status !== "COMPLETED" ? (
                    <Typography color="text.secondary">Monitoring begins after offboarding is completed</Typography>
                  ) : offboarding.monitoringEvents.length === 0 ? (
                    <Alert severity="success">No suspicious activity detected</Alert>
                  ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {offboarding.monitoringEvents.map((event) => (
                        <Box
                          key={event.id}
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            border: "1px solid",
                            borderColor: event.acknowledged ? "divider" : event.severity === "CRITICAL" ? "error.main" : event.severity === "HIGH" ? "warning.main" : "divider",
                            bgcolor: event.acknowledged ? "transparent" : alpha(event.severity === "CRITICAL" ? "#ef4444" : event.severity === "HIGH" ? "#f59e0b" : "#3b82f6", 0.05),
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Chip label={event.severity} size="small" color={getSeverityColor(event.severity) as any} />
                              <Chip label={event.eventType.replace("_", " ")} size="small" variant="outlined" />
                            </Box>
                            {!event.acknowledged && canUpdate && (
                              <Button size="small" onClick={() => handleAcknowledgeAlert(event.id)} disabled={loading === event.id}>
                                Acknowledge
                              </Button>
                            )}
                            </Box>
                            <Typography sx={{ mt: 1 }}>{event.description}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {isMounted ? new Date(event.createdAt).toLocaleString("en-US") : "..."} {event.source && `• ${event.source}`}
                              </Typography>
                          </Box>
                      ))}
                    </Box>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={riskDialog} onClose={() => setRiskDialog(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleRiskUpdate}>
          <DialogTitle fontWeight={700}>Update Risk Level</DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              High-risk offboardings require additional approvals and stricter handling.
            </Alert>
            <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
              <InputLabel>Risk Level</InputLabel>
              <Select name="riskLevel" label="Risk Level" defaultValue={offboarding.riskLevel}>
                <MenuItem value="NORMAL">Normal</MenuItem>
                <MenuItem value="HIGH">High Risk</MenuItem>
                <MenuItem value="CRITICAL">Critical Risk</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              multiline
              rows={3}
              name="riskReason"
              label="Risk Reason"
              defaultValue={offboarding.riskReason || ""}
              placeholder="Explain why this offboarding is high-risk..."
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setRiskDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading === "risk"}>Update</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={!!approvalDialog} onClose={() => setApprovalDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Review Approval</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Type: {approvalDialog?.type} {approvalDialog?.task && `• Task: ${approvalDialog.task.name}`}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            id="approval-comments"
            label="Comments (optional)"
            placeholder="Add any comments..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setApprovalDialog(null)}>Cancel</Button>
          <Button
            color="error"
            onClick={() => {
              const reason = prompt("Rejection reason:");
              if (reason) handleApproval("REJECTED", undefined, reason);
            }}
            disabled={loading === "approval"}
          >
            Reject
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => handleApproval("APPROVED", (document.getElementById("approval-comments") as HTMLInputElement)?.value)}
            disabled={loading === "approval"}
          >
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!assetDialog} onClose={() => setAssetDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Update Asset Return</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            <strong>{assetDialog?.asset.name}</strong> ({assetDialog?.asset.type})
          </Typography>
          <TextField
            fullWidth
            id="asset-condition"
            label="Condition"
            placeholder="e.g., Good, Minor scratches, etc."
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={2}
            id="asset-notes"
            label="Notes"
            placeholder="Any additional notes..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAssetDialog(null)}>Cancel</Button>
          <Button
            color="error"
            onClick={() => handleAssetReturn("MISSING")}
            disabled={loading === "asset"}
          >
            Mark Lost
          </Button>
          <Button
            color="warning"
            onClick={() => handleAssetReturn("DAMAGED", (document.getElementById("asset-condition") as HTMLInputElement)?.value, (document.getElementById("asset-notes") as HTMLInputElement)?.value)}
            disabled={loading === "asset"}
          >
            Mark Damaged
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => handleAssetReturn("RETURNED", (document.getElementById("asset-condition") as HTMLInputElement)?.value, (document.getElementById("asset-notes") as HTMLInputElement)?.value)}
            disabled={loading === "asset"}
          >
            Mark Returned
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar?.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar?.severity} onClose={() => setSnackbar(null)}>
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
