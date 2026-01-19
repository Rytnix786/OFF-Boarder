"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  IconButton,
  Alert,
  Snackbar,
  Divider,
  Tooltip,
  alpha,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { 
  addTemplateTask, 
  updateTemplateTask, 
  deleteTemplateTask,
  updateWorkflowTemplate,
} from "@/lib/actions/workflows";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TASK_CATEGORIES, ASSIGNEE_ROLES, ASSIGNEE_DEPARTMENTS } from "@/lib/workflow-constants";

type Task = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  defaultDueDays: number | null;
  requiresApproval: boolean;
  isHighRiskTask: boolean;
  isRequired: boolean;
  order: number;
  assigneeRole: string | null;
  assigneeDepartment: string | null;
  evidenceRequirement: "REQUIRED" | "OPTIONAL" | "NONE";
};

type WorkflowTemplate = {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  version: number;
  config: unknown;
  tasks: Task[];
  _count: { offboardings: number };
};

interface WorkflowDetailClientProps {
  template: WorkflowTemplate;
  canManage: boolean;
  departments: { id: string; name: string }[];
}

const getRiskLevelFromConfig = (config: unknown): string => {
  if (config && typeof config === "object" && "riskLevel" in config) {
    return (config as { riskLevel: string }).riskLevel;
  }
  return "LOW";
};

const riskConfig = {
  LOW: { label: "Low Risk", color: "#64748b", description: "Standard exit procedures" },
  HIGH: { label: "High Risk", color: "#d97706", description: "Enhanced security controls required" },
  CRITICAL: { label: "Critical", color: "#dc2626", description: "Immediate action and full audit trail" },
};

const PHASE_ORDER = ["PRE_EXIT", "ACCESS_REVOCATION", "ASSET_RECOVERY", "VERIFICATION", "POST_EXIT"];

const PHASE_CONFIG: Record<string, { label: string; description: string; icon: string; blocksCompletion: boolean }> = {
  PRE_EXIT: { 
    label: "Pre-Exit", 
    description: "Tasks completed before the employee's last day",
    icon: "schedule",
    blocksCompletion: false,
  },
  ACCESS_REVOCATION: { 
    label: "Access Revocation", 
    description: "System and physical access termination",
    icon: "lock",
    blocksCompletion: true,
  },
  ASSET_RECOVERY: { 
    label: "Asset Recovery", 
    description: "Company property collection and verification",
    icon: "devices",
    blocksCompletion: true,
  },
  VERIFICATION: { 
    label: "Verification", 
    description: "Compliance checks and sign-offs",
    icon: "verified",
    blocksCompletion: true,
  },
  POST_EXIT: { 
    label: "Post-Exit", 
    description: "Tasks completed after departure",
    icon: "event_available",
    blocksCompletion: false,
  },
};

const mapCategoryToPhase = (category: string | null): string => {
  switch (category) {
    case "HR": return "PRE_EXIT";
    case "IT": return "ACCESS_REVOCATION";
    case "SECURITY": return "ACCESS_REVOCATION";
    case "ASSETS": return "ASSET_RECOVERY";
    case "FINANCE": return "POST_EXIT";
    case "LEGAL": return "VERIFICATION";
    default: return "PRE_EXIT";
  }
};

export default function WorkflowDetailClient({ template, canManage, departments }: WorkflowDetailClientProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const router = useRouter();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editTemplateOpen, setEditTemplateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" } | null>(null);

  const riskLevel = getRiskLevelFromConfig(template.config);
  const risk = riskConfig[riskLevel as keyof typeof riskConfig] || riskConfig.LOW;
  
  const approvalTasks = template.tasks.filter(t => t.requiresApproval);
  const highRiskTasks = template.tasks.filter(t => t.isHighRiskTask);
  const requiredTasks = template.tasks.filter(t => t.isRequired);
  const blocksAccess = highRiskTasks.length > 0 || riskLevel !== "LOW";

  const phaseGroups = PHASE_ORDER.reduce((acc, phase) => {
    acc[phase] = template.tasks.filter(t => mapCategoryToPhase(t.category) === phase);
    return acc;
  }, {} as Record<string, Task[]>);

  const handleAddTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await addTemplateTask(template.id, formData);
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Task added", severity: "success" });
      setAddDialogOpen(false);
      router.refresh();
    }
    setLoading(false);
  };

  const handleUpdateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editTask) return;
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await updateTemplateTask(editTask.id, formData);
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Task updated", severity: "success" });
      setEditTask(null);
      router.refresh();
    }
    setLoading(false);
  };

  const handleUpdateTemplate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await updateWorkflowTemplate(template.id, formData);
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Protocol updated", severity: "success" });
      setEditTemplateOpen(false);
      router.refresh();
    }
    setLoading(false);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    setLoading(true);
    const result = await deleteTemplateTask(taskId);
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Task deleted", severity: "success" });
      router.refresh();
    }
    setLoading(false);
  };

  const getAssigneeLabel = (task: Task) => {
    if (task.assigneeRole) {
      const role = ASSIGNEE_ROLES.find(r => r.value === task.assigneeRole);
      return role?.label || task.assigneeRole;
    }
    if (task.assigneeDepartment) {
      const dept = ASSIGNEE_DEPARTMENTS.find(d => d.value === task.assigneeDepartment);
      return dept?.label || task.assigneeDepartment;
    }
    return null;
  };

  const formatDueDays = (days: number | null) => {
    if (days === null) return "No due date";
    if (days === 0) return "Last working day";
    if (days < 0) return `${Math.abs(days)} days before`;
    return `${days} days after`;
  };

  return (
    <Box sx={{ pb: 8 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 6 }}>
        <Link href="/app/workflows" passHref style={{ textDecoration: "none", color: "inherit" }}>
          <IconButton sx={{ opacity: 0.7, "&:hover": { opacity: 1 } }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>arrow_back</span>
          </IconButton>
        </Link>
        <Typography sx={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", fontSize: "0.9rem" }}>
          Offboarding Protocols
        </Typography>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 8 }}>
        <Box sx={{ maxWidth: 700 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: "-0.025em" }}>
              {template.name}
            </Typography>
            {template.isDefault && (
              <Box sx={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 0.5,
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                bgcolor: isDark ? alpha("#3b82f6", 0.12) : alpha("#3b82f6", 0.08),
                border: "1px solid",
                borderColor: isDark ? alpha("#3b82f6", 0.2) : alpha("#3b82f6", 0.15),
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15, color: "#3b82f6", opacity: 0.9 }}>verified</span>
                <Typography sx={{ 
                  fontSize: "0.7rem", 
                  fontWeight: 700, 
                  color: "#3b82f6",
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}>
                  Organization Default
                </Typography>
              </Box>
            )}
          </Box>
          <Typography sx={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)", fontSize: "1rem", lineHeight: 1.6 }}>
            {template.description || "No description provided."}
          </Typography>
        </Box>
        {canManage && (
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setEditTemplateOpen(true)}
              sx={{ 
                fontWeight: 600,
                borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
                color: "text.secondary",
                "&:hover": {
                  borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
                  bgcolor: "transparent",
                }
              }}
            >
              Edit Protocol
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setAddDialogOpen(true)}
              sx={{ 
                fontWeight: 600,
                borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
                color: "text.primary",
                "&:hover": {
                  borderColor: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)",
                  bgcolor: "transparent",
                }
              }}
            >
              Add Task
            </Button>
          </Box>
        )}
      </Box>

      <Box sx={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(4, 1fr)", 
        gap: 6,
        mb: 8,
        p: 4,
        borderRadius: 2,
        bgcolor: isDark ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.015)",
        border: "1px solid",
        borderColor: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)",
      }}>
        <Box>
          <Typography sx={{ 
            fontSize: "0.6rem", 
            fontWeight: 500, 
            color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            mb: 1,
          }}>
            Risk Classification
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ 
              width: 8, 
              height: 8, 
              borderRadius: "50%", 
              bgcolor: risk.color,
            }} />
            <Typography sx={{ fontWeight: 600, fontSize: "0.95rem", color: "text.primary" }}>
              {risk.label}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: "0.8rem", color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)", mt: 0.5 }}>
            {risk.description}
          </Typography>
        </Box>

        <Box>
          <Typography sx={{ 
            fontSize: "0.6rem", 
            fontWeight: 500, 
            color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            mb: 1,
          }}>
            Enforcement Strength
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ 
              width: 8, 
              height: 8, 
              borderRadius: "50%", 
              bgcolor: blocksAccess ? (isDark ? "#fbbf24" : "#d97706") : isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)",
            }} />
            <Typography sx={{ fontWeight: 600, fontSize: "0.95rem", color: blocksAccess ? "text.primary" : isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)" }}>
              {blocksAccess ? "Blocking" : "Advisory"}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: "0.8rem", color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)", mt: 0.5 }}>
            {blocksAccess ? "Blocks offboarding completion" : "Recommended but not enforced"}
          </Typography>
        </Box>

        <Box>
          <Typography sx={{ 
            fontSize: "0.6rem", 
            fontWeight: 500, 
            color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            mb: 1,
          }}>
            Compliance Control
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ 
              width: 8, 
              height: 8, 
              borderRadius: "50%", 
              bgcolor: approvalTasks.length > 0 ? (isDark ? "#3b82f6" : "#2563eb") : isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)",
            }} />
            <Typography sx={{ fontWeight: 600, fontSize: "0.95rem", color: approvalTasks.length > 0 ? "text.primary" : isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)" }}>
              {approvalTasks.length} {approvalTasks.length === 1 ? "Approval" : "Approvals"}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: "0.8rem", color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)", mt: 0.5 }}>
            {approvalTasks.length > 0 
              ? `Required by ${approvalTasks.length} unique steps`
              : "No manual approvals configured"
            }
          </Typography>
        </Box>

        <Box>
          <Typography sx={{ 
            fontSize: "0.6rem", 
            fontWeight: 500, 
            color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            mb: 1,
          }}>
            Audit Readiness
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ 
              width: 8, 
              height: 8, 
              borderRadius: "50%", 
              bgcolor: isDark ? "#10b981" : "#059669",
            }} />
            <Typography sx={{ fontWeight: 600, fontSize: "0.95rem", color: "text.primary" }}>
              Verified
            </Typography>
          </Box>
          <Typography sx={{ fontSize: "0.8rem", color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)", mt: 0.5 }}>
            Full immutable audit trail enabled
          </Typography>
        </Box>
      </Box>

      <Box sx={{ mb: 8 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1rem", mb: 1, letterSpacing: "-0.01em" }}>
          Protocol Constraints
        </Typography>
        <Typography sx={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", fontSize: "0.875rem", mb: 3 }}>
          System-enforced rules that cannot be bypassed during execution.
        </Typography>
        
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          {requiredTasks.length > 0 && (
            <Box sx={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 1,
              px: 2,
              py: 1,
              borderRadius: 1,
              bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
              border: "1px solid",
              borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 17, color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)" }}>block</span>
              <Typography sx={{ fontSize: "0.8rem", fontWeight: 500 }}>
                <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>{requiredTasks.length}</Box>
                <Box component="span" sx={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}> tasks cannot be skipped</Box>
              </Typography>
            </Box>
          )}
          
          {highRiskTasks.length > 0 && (
            <Box sx={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 1,
              px: 2,
              py: 1,
              borderRadius: 1,
              bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
              border: "1px solid",
              borderColor: isDark ? alpha("#d97706", 0.15) : alpha("#d97706", 0.1),
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 17, color: isDark ? "#fbbf24" : "#d97706" }}>warning</span>
              <Typography sx={{ fontSize: "0.8rem", fontWeight: 500 }}>
                <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>{highRiskTasks.length}</Box>
                <Box component="span" sx={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}> security-critical tasks</Box>
              </Typography>
            </Box>
          )}
          
          {approvalTasks.length > 0 && (
            <Box sx={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 1,
              px: 2,
              py: 1,
              borderRadius: 1,
              bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
              border: "1px solid",
              borderColor: isDark ? alpha("#3b82f6", 0.15) : alpha("#3b82f6", 0.1),
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 17, color: isDark ? "#60a5fa" : "#3b82f6" }}>approval</span>
              <Typography sx={{ fontSize: "0.8rem", fontWeight: 500 }}>
                <Box component="span" sx={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>Requires </Box>
                <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>{approvalTasks.length}</Box>
                <Box component="span" sx={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}> approval{approvalTasks.length !== 1 ? "s" : ""}</Box>
              </Typography>
            </Box>
          )}
          
          <Box sx={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 1,
            px: 2,
            py: 1,
            borderRadius: 1,
            bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
            border: "1px solid",
            borderColor: isDark ? alpha("#10b981", 0.15) : alpha("#10b981", 0.1),
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 17, color: isDark ? "#10b981" : "#059669" }}>history</span>
            <Typography sx={{ fontSize: "0.8rem", fontWeight: 500, color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>
              All actions logged for audit
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1rem", mb: 1, letterSpacing: "-0.01em" }}>
          Execution Phases
        </Typography>
        <Typography sx={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", fontSize: "0.875rem", mb: 4 }}>
          Tasks are organized into sequential phases. Blocking phases must complete before the offboarding can be finalized.
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {PHASE_ORDER.map((phase) => {
            const tasks = phaseGroups[phase] || [];
            const config = PHASE_CONFIG[phase];
            if (tasks.length === 0) return null;

            const phaseSemanticColor = config.blocksCompletion
              ? isDark ? alpha("#d97706", 0.12) : alpha("#d97706", 0.08)
              : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

            return (
              <Box 
                key={phase}
                sx={{ 
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: phaseSemanticColor,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {config.blocksCompletion && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: 2,
                      height: "100%",
                      bgcolor: isDark ? alpha("#d97706", 0.5) : alpha("#d97706", 0.4),
                    }}
                  />
                )}
                <Box sx={{ 
                  px: 3, 
                  py: 2,
                  bgcolor: config.blocksCompletion 
                    ? isDark ? "rgba(217, 119, 6, 0.03)" : "rgba(217, 119, 6, 0.02)"
                    : isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)",
                  borderBottom: "1px solid",
                  borderColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box sx={{ 
                      width: 34, 
                      height: 34, 
                      borderRadius: 1, 
                      bgcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 19, color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)" }}>{config.icon}</span>
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>{config.label}</Typography>
                      <Typography sx={{ fontSize: "0.8rem", color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)" }}>{config.description}</Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography sx={{ fontSize: "0.8rem", color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)" }}>
                      <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>{tasks.length}</Box> task{tasks.length !== 1 ? "s" : ""}
                    </Typography>
                    {config.blocksCompletion && (
                      <Box sx={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: 0.5,
                        px: 1,
                        py: 0.25,
                        borderRadius: 0.5,
                        bgcolor: isDark ? "rgba(251, 191, 36, 0.08)" : "rgba(217, 119, 6, 0.06)",
                        border: "1px solid",
                        borderColor: isDark ? alpha("#fbbf24", 0.15) : alpha("#d97706", 0.12),
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 13, color: isDark ? "#fbbf24" : "#d97706" }}>lock</span>
                        <Typography sx={{ 
                          fontSize: "0.65rem", 
                          fontWeight: 700, 
                          color: isDark ? "#fbbf24" : "#d97706",
                          textTransform: "uppercase",
                          letterSpacing: "0.03em",
                        }}>
                          Blocks Completion
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>

                <Box sx={{ p: 2 }}>
                  {tasks.sort((a, b) => a.order - b.order).map((task, index) => {
                    const assignee = getAssigneeLabel(task);
                    return (
                      <Box
                        key={task.id}
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 2,
                          p: 2,
                          borderRadius: 1.5,
                          transition: "background-color 100ms ease-out",
                          "&:hover": { 
                            bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)",
                          },
                          borderBottom: index < tasks.length - 1 ? "1px solid" : "none",
                          borderColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
                        }}
                      >
                        <Box sx={{ 
                          width: 22, 
                          height: 22, 
                          borderRadius: 0.5, 
                          border: "1.5px solid",
                          borderColor: task.isRequired 
                            ? (isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)")
                            : (isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)"),
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center",
                          flexShrink: 0,
                          mt: 0.25,
                        }}>
                          {task.isRequired && (
                            <Box sx={{ 
                              width: 7, 
                              height: 7, 
                              borderRadius: 0.25, 
                              bgcolor: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)",
                            }} />
                          )}
                        </Box>
                        
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5, flexWrap: "wrap" }}>
                            <Typography sx={{ fontWeight: 600, fontSize: "0.9rem" }}>{task.name}</Typography>
                            {task.isHighRiskTask && (
                              <Typography sx={{ 
                                fontSize: "0.6rem", 
                                fontWeight: 700, 
                                color: isDark ? "#fbbf24" : "#d97706",
                                textTransform: "uppercase",
                                letterSpacing: "0.03em",
                              }}>
                                Security Critical
                              </Typography>
                            )}
                            {task.requiresApproval && (
                              <Typography sx={{ 
                                fontSize: "0.6rem", 
                                fontWeight: 700, 
                                color: isDark ? "#60a5fa" : "#3b82f6",
                                textTransform: "uppercase",
                                letterSpacing: "0.03em",
                              }}>
                                Requires Approval
                              </Typography>
                            )}
                          </Box>
                          {task.description && (
                            <Typography sx={{ fontSize: "0.825rem", color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)", lineHeight: 1.5, mb: 1 }}>
                              {task.description}
                            </Typography>
                          )}
                          <Box sx={{ display: "flex", gap: 3 }}>
                            <Typography sx={{ fontSize: "0.75rem", color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)" }}>
                              {formatDueDays(task.defaultDueDays)}
                            </Typography>
                            {assignee && (
                              <Typography sx={{ fontSize: "0.75rem", color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)" }}>
                                {assignee}
                              </Typography>
                            )}
                          </Box>
                        </Box>

                        {canManage && (
                          <Box sx={{ display: "flex", gap: 0.5, opacity: 0.5, transition: "opacity 150ms", "&:hover": { opacity: 1 } }}>
                            <Tooltip title="Edit task">
                              <IconButton size="small" onClick={() => setEditTask(task)} sx={{ width: 30, height: 30 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 17 }}>edit</span>
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete task">
                              <IconButton size="small" onClick={() => handleDeleteTask(task.id)} sx={{ width: 30, height: 30, color: "error.main" }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 17 }}>delete</span>
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>

      <Dialog open={editTemplateOpen} onClose={() => setEditTemplateOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <form onSubmit={handleUpdateTemplate}>
          <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Edit Protocol</DialogTitle>
          <DialogContent>
            <TextField 
              fullWidth 
              label="Protocol Name" 
              name="name" 
              defaultValue={template.name}
              required 
              sx={{ mt: 1, mb: 2.5 }} 
            />
            <TextField 
              fullWidth 
              label="Purpose" 
              name="description" 
              defaultValue={template.description || ""}
              multiline 
              rows={2} 
              sx={{ mb: 2 }} 
              helperText="Describe when this protocol should be applied"
            />
            <FormControlLabel 
              control={<Checkbox name="isDefault" value="true" defaultChecked={template.isDefault} />} 
              label="Set as organization default" 
            />
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button onClick={() => setEditTemplateOpen(false)} sx={{ color: "text.secondary" }}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <form onSubmit={handleAddTask}>
          <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Add Task</DialogTitle>
          <DialogContent>
            <TextField fullWidth label="Task Name" name="name" required sx={{ mt: 1, mb: 2.5 }} />
            <TextField fullWidth label="Description" name="description" multiline rows={2} sx={{ mb: 2.5 }} />
            <FormControl fullWidth sx={{ mb: 2.5 }}>
              <InputLabel>Category</InputLabel>
              <Select name="category" label="Category" defaultValue="OTHER">
                {TASK_CATEGORIES.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField 
              fullWidth 
              label="Due Date (days relative to last working day)" 
              name="defaultDueDays" 
              type="number" 
              sx={{ mb: 2.5 }} 
              helperText="0 = last day, negative = before, positive = after"
            />
            <Divider sx={{ my: 2 }} />
            <Typography sx={{ fontWeight: 600, fontSize: "0.85rem", mb: 2 }}>Assignment</Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Assignee Role</InputLabel>
              <Select name="assigneeRole" label="Assignee Role" defaultValue="">
                <MenuItem value="">None</MenuItem>
                {ASSIGNEE_ROLES.map((role) => (
                  <MenuItem key={role.value} value={role.value}>{role.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Assignee Department</InputLabel>
              <Select name="assigneeDepartment" label="Assignee Department" defaultValue="">
                <MenuItem value="">None</MenuItem>
                {ASSIGNEE_DEPARTMENTS.map((dept) => (
                   <MenuItem key={dept.value} value={dept.value}>{dept.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Divider sx={{ my: 2 }} />
            <Typography sx={{ fontWeight: 600, fontSize: "0.85rem", mb: 2 }}>Evidence Requirement</Typography>
            <FormControl fullWidth sx={{ mb: 2.5 }}>
              <InputLabel>Evidence Requirement</InputLabel>
              <Select name="evidenceRequirement" label="Evidence Requirement" defaultValue="NONE">
                <MenuItem value="NONE">None - No evidence needed</MenuItem>
                <MenuItem value="OPTIONAL">Optional - Evidence can be attached</MenuItem>
                <MenuItem value="REQUIRED">Required - Evidence required for compliance</MenuItem>
              </Select>
            </FormControl>
            <Divider sx={{ my: 2 }} />
            <Typography sx={{ fontWeight: 600, fontSize: "0.85rem", mb: 2 }}>Constraints</Typography>
            <FormControlLabel control={<Checkbox name="isRequired" value="true" defaultChecked />} label="Cannot be skipped" />
            <FormControlLabel control={<Checkbox name="requiresApproval" value="true" />} label="Requires approval" />
            <FormControlLabel control={<Checkbox name="isHighRiskTask" value="true" />} label="Security-critical task" />
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button onClick={() => setAddDialogOpen(false)} sx={{ color: "text.secondary" }}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>{loading ? "Adding..." : "Add Task"}</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={!!editTask} onClose={() => setEditTask(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <form onSubmit={handleUpdateTask}>
          <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Edit Task</DialogTitle>
          <DialogContent>
            <TextField fullWidth label="Task Name" name="name" defaultValue={editTask?.name} required sx={{ mt: 1, mb: 2.5 }} />
            <TextField fullWidth label="Description" name="description" defaultValue={editTask?.description || ""} multiline rows={2} sx={{ mb: 2.5 }} />
            <FormControl fullWidth sx={{ mb: 2.5 }}>
              <InputLabel>Category</InputLabel>
              <Select name="category" label="Category" defaultValue={editTask?.category || "OTHER"}>
                {TASK_CATEGORIES.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField 
              fullWidth 
              label="Due Date (days relative to last working day)" 
              name="defaultDueDays" 
              type="number" 
              defaultValue={editTask?.defaultDueDays ?? ""} 
              sx={{ mb: 2.5 }} 
              helperText="0 = last day, negative = before, positive = after"
            />
            <Divider sx={{ my: 2 }} />
            <Typography sx={{ fontWeight: 600, fontSize: "0.85rem", mb: 2 }}>Assignment</Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Assignee Role</InputLabel>
              <Select name="assigneeRole" label="Assignee Role" defaultValue={editTask?.assigneeRole || ""}>
                 <MenuItem value="">None</MenuItem>
                {ASSIGNEE_ROLES.map((role) => (
                  <MenuItem key={role.value} value={role.value}>{role.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Assignee Department</InputLabel>
              <Select name="assigneeDepartment" label="Assignee Department" defaultValue={editTask?.assigneeDepartment || ""}>
                <MenuItem value="">None</MenuItem>
                {ASSIGNEE_DEPARTMENTS.map((dept) => (
                  <MenuItem key={dept.value} value={dept.value}>{dept.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Divider sx={{ my: 2 }} />
            <Typography sx={{ fontWeight: 600, fontSize: "0.85rem", mb: 2 }}>Evidence Requirement</Typography>
            <FormControl fullWidth sx={{ mb: 2.5 }}>
              <InputLabel>Evidence Requirement</InputLabel>
              <Select name="evidenceRequirement" label="Evidence Requirement" defaultValue={editTask?.evidenceRequirement || "NONE"}>
                <MenuItem value="NONE">None - No evidence needed</MenuItem>
                <MenuItem value="OPTIONAL">Optional - Evidence can be attached</MenuItem>
                <MenuItem value="REQUIRED">Required - Evidence required for compliance</MenuItem>
              </Select>
            </FormControl>
            <Divider sx={{ my: 2 }} />
            <Typography sx={{ fontWeight: 600, fontSize: "0.85rem", mb: 2 }}>Constraints</Typography>
            <FormControlLabel control={<Checkbox name="isRequired" value="true" defaultChecked={editTask?.isRequired} />} label="Cannot be skipped" />
            <FormControlLabel control={<Checkbox name="requiresApproval" value="true" defaultChecked={editTask?.requiresApproval} />} label="Requires approval" />
            <FormControlLabel control={<Checkbox name="isHighRiskTask" value="true" defaultChecked={editTask?.isHighRiskTask} />} label="Security-critical task" />
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button onClick={() => setEditTask(null)} sx={{ color: "text.secondary" }}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar open={snackbar?.open} autoHideDuration={5000} onClose={() => setSnackbar(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snackbar?.severity} onClose={() => setSnackbar(null)}>{snackbar?.message}</Alert>
      </Snackbar>
    </Box>
  );
}
