"use client";

import React, { useState, memo } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  Alert,
  Snackbar,
  IconButton,
  Tooltip,
  alpha,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { 
  createWorkflowTemplate, 
  duplicateWorkflowTemplate, 
  updateWorkflowTemplate,
  deleteWorkflowTemplate,
  resetDefaultWorkflowTemplates,
} from "@/lib/actions/workflows";
import { useRouter } from "next/navigation";
import Link from "next/link";

type WorkflowTemplate = {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  version: number;
  config: unknown;
  tasks: {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    requiresApproval: boolean;
    isHighRiskTask: boolean;
    isRequired: boolean;
    assigneeRole: string | null;
    assigneeDepartment: string | null;
  }[];
  _count: {
    offboardings: number;
  };
};

interface WorkflowsClientProps {
  templates: WorkflowTemplate[];
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
  LOW: { label: "Low Risk", color: "#64748b", bgColor: "rgba(100, 116, 139, 0.08)" },
  HIGH: { label: "High Risk", color: "#d97706", bgColor: "rgba(217, 119, 6, 0.08)" },
  CRITICAL: { label: "Critical", color: "#dc2626", bgColor: "rgba(220, 38, 38, 0.08)" },
};

interface ProtocolCardProps {
  template: WorkflowTemplate;
  isDark: boolean;
  canManage: boolean;
  onDuplicate: (template: WorkflowTemplate) => void;
  onSetDefault: (templateId: string) => void;
  onDelete: (template: WorkflowTemplate) => void;
  loading: boolean;
}

const ProtocolCard = memo(function ProtocolCard({ template, isDark, canManage, onDuplicate, onSetDefault, onDelete, loading }: ProtocolCardProps) {
  const riskLevel = getRiskLevelFromConfig(template.config);
  const risk = riskConfig[riskLevel as keyof typeof riskConfig] || riskConfig.LOW;
  const approvalCount = template.tasks.filter(t => t.requiresApproval).length;
  const highRiskTasks = template.tasks.filter(t => t.isHighRiskTask).length;
  const requiredTasks = template.tasks.filter(t => t.isRequired).length;
  const departmentSet = new Set(template.tasks.map(t => t.assigneeDepartment).filter(Boolean));
  
  const blocksAccess = highRiskTasks > 0 || riskLevel !== "LOW";

  const semanticBorderColor = template.isDefault 
    ? isDark ? alpha("#3b82f6", 0.25) : alpha("#3b82f6", 0.2)
    : riskLevel === "CRITICAL"
      ? isDark ? alpha("#dc2626", 0.15) : alpha("#dc2626", 0.1)
      : riskLevel === "HIGH"
        ? isDark ? alpha("#d97706", 0.12) : alpha("#d97706", 0.08)
        : isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)";

  return (
    <Box
      sx={{
        position: "relative",
        borderRadius: 2,
        bgcolor: isDark ? "rgba(255, 255, 255, 0.015)" : "rgba(0, 0, 0, 0.01)",
        border: "1px solid",
        borderColor: semanticBorderColor,
        overflow: "hidden",
        transition: "border-color 150ms ease-out",
        "&:hover": {
          borderColor: template.isDefault 
            ? isDark ? alpha("#3b82f6", 0.35) : alpha("#3b82f6", 0.3)
            : isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)",
        }
      }}
    >
      {template.isDefault && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 2,
            height: "100%",
            bgcolor: alpha("#3b82f6", 0.6),
          }}
        />
      )}
      {!template.isDefault && riskLevel === "CRITICAL" && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 2,
            height: "100%",
            bgcolor: alpha("#dc2626", 0.5),
          }}
        />
      )}
      {!template.isDefault && riskLevel === "HIGH" && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 2,
            height: "100%",
            bgcolor: alpha("#d97706", 0.4),
          }}
        />
      )}

      <Box sx={{ 
        px: 3, 
        py: 2, 
        bgcolor: isDark ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.015)",
        borderBottom: "1px solid",
        borderColor: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}>
        <Box>
          <Typography sx={{ 
            fontSize: "0.6rem", 
            fontWeight: 500, 
            color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            mb: 0.5,
          }}>
            Risk Level
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: risk.color }} />
            <Typography sx={{ 
              fontSize: "0.875rem", 
              fontWeight: 600, 
              color: "text.primary",
            }}>
              {risk.label}
            </Typography>
          </Box>
        </Box>

        <Box>
          <Typography sx={{ 
            fontSize: "0.6rem", 
            fontWeight: 500, 
            color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            mb: 0.5,
          }}>
            Access Control
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ 
              width: 7, 
              height: 7, 
              borderRadius: "50%", 
              bgcolor: blocksAccess ? (isDark ? "#fbbf24" : "#d97706") : isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)",
            }} />
            <Typography sx={{ 
              fontSize: "0.875rem", 
              fontWeight: 600, 
              color: blocksAccess ? "text.primary" : isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)",
            }}>
              {blocksAccess ? "Blocks Access" : "No Blocking"}
            </Typography>
          </Box>
        </Box>

        <Box>
          <Typography sx={{ 
            fontSize: "0.6rem", 
            fontWeight: 500, 
            color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            mb: 0.5,
          }}>
            Compliance
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ 
              width: 7, 
              height: 7, 
              borderRadius: "50%", 
              bgcolor: approvalCount > 0 ? (isDark ? "#3b82f6" : "#2563eb") : isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)",
            }} />
            <Typography sx={{ 
              fontSize: "0.875rem", 
              fontWeight: 600, 
              color: approvalCount > 0 ? "text.primary" : isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)",
            }}>
              {approvalCount > 0 ? "Requires Approval" : "Auto-Approved"}
            </Typography>
          </Box>
        </Box>

        <Box>
          <Typography sx={{ 
            fontSize: "0.6rem", 
            fontWeight: 500, 
            color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            mb: 0.5,
          }}>
            Audit Trail
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ 
              width: 7, 
              height: 7, 
              borderRadius: "50%", 
              bgcolor: isDark ? "#10b981" : "#059669",
            }} />
            <Typography sx={{ 
              fontSize: "0.875rem", 
              fontWeight: 600, 
              color: "text.primary",
            }}>
              Evidence Generated
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: "1.15rem", letterSpacing: "-0.01em" }}>
                {template.name}
              </Typography>
              {template.isDefault && (
                <Box sx={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 0.5,
                  px: 1,
                  py: 0.25,
                  borderRadius: 0.75,
                  bgcolor: isDark ? alpha("#3b82f6", 0.12) : alpha("#3b82f6", 0.08),
                  border: "1px solid",
                  borderColor: isDark ? alpha("#3b82f6", 0.2) : alpha("#3b82f6", 0.15),
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13, color: "#3b82f6", opacity: 0.9 }}>verified</span>
                  <Typography sx={{ 
                    fontSize: "0.65rem", 
                    fontWeight: 700, 
                    color: "#3b82f6",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                  }}>
                    Enforced Default
                  </Typography>
                </Box>
              )}
            </Box>
            <Typography 
              sx={{ 
                color: "text.secondary", 
                fontSize: "0.925rem", 
                lineHeight: 1.6,
                maxWidth: 600,
              }}
            >
              {template.description || "No description provided."}
            </Typography>
          </Box>
          {canManage && (
            <Box sx={{ display: "flex", gap: 0.5, ml: 2, opacity: 0.6, transition: "opacity 150ms", "&:hover": { opacity: 1 } }}>
              <Tooltip title="Duplicate protocol">
                <IconButton 
                  size="small"
                  onClick={(e) => { e.stopPropagation(); onDuplicate(template); }}
                  disabled={loading}
                  sx={{ width: 30, height: 30 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18, opacity: 0.85 }}>content_copy</span>
                </IconButton>
              </Tooltip>
              {!template.isDefault && (
                <Tooltip title="Set as default">
                  <IconButton 
                    size="small"
                    onClick={(e) => { e.stopPropagation(); onSetDefault(template.id); }}
                    disabled={loading}
                    sx={{ width: 30, height: 30 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18, opacity: 0.85 }}>verified</span>
                  </IconButton>
                </Tooltip>
              )}
              {template._count.offboardings === 0 && !template.isDefault && (
                <Tooltip title="Delete protocol">
                  <IconButton 
                    size="small"
                    onClick={(e) => { e.stopPropagation(); onDelete(template); }}
                    disabled={loading}
                    sx={{ 
                      width: 30,
                      height: 30,
                      color: "error.main",
                      "&:hover": { bgcolor: isDark ? "rgba(239, 68, 68, 0.1)" : "rgba(239, 68, 68, 0.08)" }
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18, opacity: 0.85 }}>delete</span>
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )}
        </Box>

        <Box sx={{ 
          display: "flex", 
          alignItems: "center", 
          gap: 4, 
          mt: 3,
          pt: 2.5,
          borderTop: "1px solid",
          borderColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
        }}>
          <Typography sx={{ fontSize: "0.8rem", color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)" }}>
            <Box component="span" sx={{ fontWeight: 600, color: "text.primary", fontSize: "0.85rem" }}>{requiredTasks}</Box>
            {" "}required tasks
          </Typography>
          <Typography sx={{ fontSize: "0.8rem", color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)" }}>
            <Box component="span" sx={{ fontWeight: 600, color: "text.primary", fontSize: "0.85rem" }}>{approvalCount}</Box>
            {" "}approvals
          </Typography>
          <Typography sx={{ fontSize: "0.8rem", color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)" }}>
            <Box component="span" sx={{ fontWeight: 600, color: "text.primary", fontSize: "0.85rem" }}>{departmentSet.size || 0}</Box>
            {" "}departments involved
          </Typography>
          
          <Box sx={{ flex: 1 }} />

          <Link href={`/app/workflows/${template.id}`} style={{ textDecoration: "none" }}>
            <Button 
              variant="text"
              size="small"
              sx={{ 
                fontWeight: 600,
                px: 2,
                color: "text.secondary",
                "&:hover": {
                  color: "text.primary",
                  bgcolor: "transparent",
                }
              }}
              endIcon={<span className="material-symbols-outlined" style={{ fontSize: 17, opacity: 0.8 }}>arrow_forward</span>}
            >
              View Protocol
            </Button>
          </Link>
        </Box>
      </Box>
    </Box>
  );
});

export default function WorkflowsClient({ templates, canManage, departments }: WorkflowsClientProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [duplicateDialog, setDuplicateDialog] = useState<WorkflowTemplate | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<WorkflowTemplate | null>(null);
  const [resetDialog, setResetDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" } | null>(null);

  const standardTemplates = templates.filter(t => getRiskLevelFromConfig(t.config) === "LOW");
  const elevatedTemplates = templates.filter(t => {
    const risk = getRiskLevelFromConfig(t.config);
    return risk === "HIGH" || risk === "CRITICAL";
  });

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await createWorkflowTemplate(formData);
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Protocol created", severity: "success" });
      setCreateDialogOpen(false);
      router.refresh();
    }
    setLoading(false);
  };

  const handleDuplicate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!duplicateDialog) return;
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await duplicateWorkflowTemplate(duplicateDialog.id, formData.get("name") as string);
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Protocol duplicated", severity: "success" });
      setDuplicateDialog(null);
      router.refresh();
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    setLoading(true);
    const result = await deleteWorkflowTemplate(deleteDialog.id);
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Protocol deleted", severity: "success" });
      setDeleteDialog(null);
      router.refresh();
    }
    setLoading(false);
  };

  const handleSetDefault = async (templateId: string) => {
    setLoading(true);
    const formData = new FormData();
    formData.set("isDefault", "true");
    const result = await updateWorkflowTemplate(templateId, formData);
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Default protocol updated", severity: "success" });
    }
    setLoading(false);
    router.refresh();
  };

  const handleResetDefaults = async () => {
    setLoading(true);
    const result = await resetDefaultWorkflowTemplates();
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: `Reset complete. ${result.templatesCreated} protocols restored.`, severity: "success" });
      router.refresh();
    }
    setResetDialog(false);
    setLoading(false);
  };

  const ProtocolSection = ({ 
    title, 
    description, 
    templates,
    icon,
    isElevated,
  }: { 
    title: string; 
    description: string; 
    templates: WorkflowTemplate[];
    icon: string;
    isElevated?: boolean;
  }) => {
    if (templates.length === 0) return null;
    
    return (
      <Box sx={{ mb: 8 }}>
        <Box sx={{ 
          display: "flex", 
          alignItems: "flex-start", 
          gap: 2, 
          mb: 4,
          pl: 0.5,
          borderLeft: isElevated ? "2px solid" : "none",
          borderColor: isElevated ? (isDark ? alpha("#d97706", 0.4) : alpha("#d97706", 0.35)) : "transparent",
          ml: isElevated ? -0.5 : 0,
          paddingLeft: isElevated ? 2 : 0,
        }}>
          <Box sx={{ 
            width: 40, 
            height: 40, 
            borderRadius: 1.5, 
            bgcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 21, color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)" }}>{icon}</span>
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.1rem", mb: 0.5, letterSpacing: "-0.01em" }}>
              {title}
            </Typography>
            <Typography sx={{ color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)", fontSize: "0.9rem", lineHeight: 1.5 }}>
              {description}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          {templates.map((template) => (
            <ProtocolCard 
              key={template.id} 
              template={template} 
              isDark={isDark}
              canManage={canManage}
              onDuplicate={setDuplicateDialog}
              onSetDefault={handleSetDefault}
              onDelete={setDeleteDialog}
              loading={loading}
            />
          ))}
        </Box>
      </Box>
    );
  };

  const EmptyState = () => (
    <Box sx={{ 
      py: 16, 
      px: 6, 
      textAlign: "center", 
      borderRadius: 3, 
      border: "1px solid",
      borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
      bgcolor: isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)",
    }}>
      <Box sx={{ 
        width: 64, 
        height: 64, 
        borderRadius: 2, 
        bgcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        mx: "auto",
        mb: 4,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 30, color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)" }}>shield_lock</span>
      </Box>
      
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, letterSpacing: "-0.02em" }}>
        No Offboarding Protocols Configured
      </Typography>
      
      <Typography sx={{ color: "text.secondary", mb: 5, maxWidth: 520, mx: "auto", lineHeight: 1.7 }}>
        Offboarding protocols define the controlled sequence of tasks executed when an employee exits your organization. 
        They enforce security policies, ensure compliance, and generate audit evidence.
      </Typography>

      <Box sx={{ 
        display: "flex", 
        flexDirection: "column", 
        gap: 1.5, 
        maxWidth: 400, 
        mx: "auto",
        mb: 6,
        textAlign: "left",
        p: 3,
        borderRadius: 2,
        bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
      }}>
        <Typography sx={{ fontWeight: 600, fontSize: "0.85rem", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", mb: 1 }}>
          Recommended protocols include:
        </Typography>
        {[
          { name: "Standard Resignation", desc: "Voluntary departures with notice period" },
          { name: "Involuntary Termination", desc: "Immediate access revocation and security controls" },
          { name: "Privileged Access", desc: "Enhanced security for admin/developer exits" },
          { name: "Contractor End", desc: "Deliverable handover and access removal" },
        ].map((item, i) => (
          <Box key={i} sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 17, color: "#10b981", marginTop: 2, opacity: 0.9 }}>check_circle</span>
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: "0.875rem" }}>{item.name}</Typography>
              <Typography sx={{ fontSize: "0.8rem", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>{item.desc}</Typography>
            </Box>
          </Box>
        ))}
      </Box>
      
      {canManage && (
        <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
          <Button 
            variant="outlined" 
            onClick={() => setResetDialog(true)}
            sx={{ 
              fontWeight: 600,
              px: 3,
              borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
              color: "text.primary",
              "&:hover": {
                borderColor: "primary.main",
                bgcolor: "transparent",
              }
            }}
          >
            Load Recommended Protocols
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => setCreateDialogOpen(true)}
            sx={{ 
              fontWeight: 600,
              px: 3,
              borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
              color: "text.secondary",
              "&:hover": {
                borderColor: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)",
                bgcolor: "transparent",
              }
            }}
          >
            Create Custom Protocol
          </Button>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ pb: 8 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 10 }}>
        <Box sx={{ maxWidth: 600 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1.5, letterSpacing: "-0.025em" }}>
            Offboarding Protocols
          </Typography>
          <Typography sx={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)", fontSize: "1.05rem", lineHeight: 1.6 }}>
            Controlled exit procedures that enforce security policies, coordinate department actions, and generate compliance evidence.
          </Typography>
        </Box>
        {canManage && templates.length > 0 && (
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Button
              variant="text"
              size="small"
              onClick={() => setResetDialog(true)}
              disabled={loading}
              sx={{ 
                color: "text.secondary",
                fontWeight: 500,
                fontSize: "0.85rem",
                "&:hover": { color: "text.primary", bgcolor: "transparent" }
              }}
            >
              Reset to Defaults
            </Button>
            <Button
              variant="outlined"
              onClick={() => setCreateDialogOpen(true)}
              sx={{ 
                borderRadius: 1.5, 
                fontWeight: 600,
                px: 2.5,
                borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
                color: "text.primary",
                "&:hover": {
                  borderColor: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)",
                  bgcolor: "transparent"
                }
              }}
            >
              Create Protocol
            </Button>
          </Box>
        )}
      </Box>

      {templates.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <ProtocolSection 
            title="Standard Exit Protocols"
            description="Controlled procedures for routine departures. These protocols handle voluntary resignations and planned contractor endings with appropriate notice periods."
            templates={standardTemplates}
            icon="account_circle"
          />
          <ProtocolSection 
            title="Elevated Security Protocols"
            description="Enhanced control procedures for sensitive exits. These protocols enforce immediate access revocation, security audits, and require approval chains."
            templates={elevatedTemplates}
            icon="shield"
            isElevated
          />
        </>
      )}

      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <form onSubmit={handleCreate}>
          <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Create Offboarding Protocol</DialogTitle>
          <DialogContent>
            <Typography sx={{ color: "text.secondary", mb: 3, fontSize: "0.9rem" }}>
              Define a new controlled exit procedure. Tasks can be configured after creation.
            </Typography>
            <TextField
              fullWidth
              label="Protocol Name"
              name="name"
              required
              sx={{ mb: 2.5 }}
              placeholder="e.g., Executive Offboarding"
            />
            <TextField
              fullWidth
              label="Purpose"
              name="description"
              multiline
              rows={2}
              placeholder="When should this protocol be applied?"
              helperText="Describe the exit scenarios this protocol handles"
            />
            <FormControlLabel
              control={<Checkbox name="isDefault" value="true" />}
              label="Set as organization default"
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button onClick={() => setCreateDialogOpen(false)} sx={{ color: "text.secondary" }}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? "Creating..." : "Create Protocol"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog 
        open={!!duplicateDialog} 
        onClose={() => setDuplicateDialog(null)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <form onSubmit={handleDuplicate}>
          <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Duplicate Protocol</DialogTitle>
          <DialogContent>
            <Typography sx={{ color: "text.secondary", mb: 3, fontSize: "0.9rem" }}>
              Creating a customizable copy of <strong>{duplicateDialog?.name}</strong>. All tasks and configurations will be copied.
            </Typography>
            <TextField
              fullWidth
              label="New Protocol Name"
              name="name"
              required
              defaultValue={duplicateDialog ? `${duplicateDialog.name} (Custom)` : ""}
            />
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button onClick={() => setDuplicateDialog(null)} sx={{ color: "text.secondary" }}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? "Duplicating..." : "Create Copy"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog 
        open={!!deleteDialog} 
        onClose={() => setDeleteDialog(null)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Delete Protocol</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "text.secondary", fontSize: "0.9rem" }}>
            This will permanently delete <strong>{deleteDialog?.name}</strong>. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button onClick={() => setDeleteDialog(null)} sx={{ color: "text.secondary" }}>Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error" disabled={loading}>
            {loading ? "Deleting..." : "Delete Protocol"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={resetDialog} 
        onClose={() => setResetDialog(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Restore Default Protocols</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "text.secondary", mb: 2, fontSize: "0.9rem" }}>
            This will restore system-recommended offboarding protocols. Any modifications to default protocols will be reset.
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }} icon={<span className="material-symbols-outlined" style={{ fontSize: 20 }}>info</span>}>
            Custom protocols you created will not be affected.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button onClick={() => setResetDialog(false)} sx={{ color: "text.secondary" }}>Cancel</Button>
          <Button onClick={handleResetDefaults} variant="contained" disabled={loading}>
            {loading ? "Restoring..." : "Restore Defaults"}
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
