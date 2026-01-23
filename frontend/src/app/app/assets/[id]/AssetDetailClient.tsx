"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
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
  Grid,
  Alert,
  Snackbar,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Tooltip,
  IconButton,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
} from "@mui/material";
import { 
  updateAsset, 
  assignAssetToEmployee, 
  unassignAsset, 
  updateAssetReturnStatus, 
  deleteAsset,
  addAssetEvidence 
} from "@/lib/actions/assets";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId?: string;
  offboardings: Array<{ id: string; status: string }>;
};

type AssetEvidence = {
  id: string;
  type: "FILE" | "LINK" | "NOTE";
  title: string | null;
  description: string | null;
  fileName: string | null;
  fileUrl: string | null;
  fileSize: number | null;
  linkUrl: string | null;
  noteContent: string | null;
  createdAt: string;
  user: { name: string | null; email: string };
};

type AssetReturn = {
  id: string;
  status: string;
  returnedAt: string | null;
  notes: string | null;
  offboarding: {
    id: string;
    status: string;
    employee: { firstName: string; lastName: string };
  };
};

type UserMinimal = {
  name: string | null;
  email: string;
};

type Asset = {
  id: string;
  name: string;
  type: string;
  serialNumber: string | null;
  assetTag: string | null;
  description: string | null;
  value: number | null;
  purchaseDate: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  employee: Employee | null;
  assetReturns: AssetReturn[];
  evidence: AssetEvidence[];
  createdBy: UserMinimal | null;
  updatedBy: UserMinimal | null;
};

type AuditLog = {
  id: string;
  action: string;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  createdAt: Date;
  user: { name: string | null; email: string } | null;
};

interface AssetDetailClientProps {
  asset: Asset;
  history: AuditLog[];
  employees: Employee[];
  canManage: boolean;
}

const STATUS_OPTIONS = [
  { 
    value: "ASSIGNED", 
    label: "Assigned", 
    color: "success",
    description: "Asset is currently in use by an employee."
  },
  { 
    value: "PENDING_RETURN", 
    label: "Pending Return", 
    color: "warning",
    description: "Asset is scheduled to be returned during offboarding."
  },
  { 
    value: "RETURNED", 
    label: "Returned", 
    color: "info",
    description: "Asset has been received back and is ready for re-assignment."
  },
  { 
    value: "LOST", 
    label: "Lost", 
    color: "error",
    description: "Asset cannot be located and is considered missing."
  },
  { 
    value: "DAMAGED", 
    label: "Damaged", 
    color: "error",
    description: "Asset is broken or requires significant repair."
  },
  { 
    value: "WRITTEN_OFF", 
    label: "Written Off", 
    color: "default",
    description: "Asset has been retired from service and removed from active inventory."
  },
];

const getRiskConfig = (status: string) => {
  switch (status) {
    case "LOST":
    case "WRITTEN_OFF":
      return { label: "High Risk", color: "error" as const };
    case "DAMAGED":
    case "PENDING_RETURN":
      return { label: "Medium Risk", color: "warning" as const };
    case "ASSIGNED":
    case "RETURNED":
      return { label: "Low Risk", color: "success" as const };
    default:
      return { label: "Low Risk", color: "success" as const };
  }
};

export default function AssetDetailClient({ asset, history, employees, canManage }: AssetDetailClientProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" } | null>(null);
  const [newStatus, setNewStatus] = useState(asset.status);
  const [statusNotes, setStatusNotes] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [evidenceTab, setEvidenceTab] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Form states for new modals
  const [linkForm, setLinkForm] = useState({ title: "", url: "" });
  const [noteForm, setNoteForm] = useState({ title: "", content: "" });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await updateAsset(asset.id, formData);
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Asset updated", severity: "success" });
      setEditDialogOpen(false);
      router.refresh();
    }
    setLoading(false);
  };

  const handleAssign = async () => {
    if (!selectedEmployee) return;
    setLoading(true);
    const result = await assignAssetToEmployee(asset.id, selectedEmployee);
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Asset assigned", severity: "success" });
      setAssignDialogOpen(false);
      router.refresh();
    }
    setLoading(false);
  };

  const handleUnassign = async () => {
    setLoading(true);
    const result = await unassignAsset(asset.id);
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Asset unassigned", severity: "success" });
      router.refresh();
    }
    setLoading(false);
  };

  const handleStatusChange = async () => {
    setLoading(true);
    const result = await updateAssetReturnStatus(asset.id, newStatus as any, statusNotes);
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Status updated", severity: "success" });
      setStatusDialogOpen(false);
      router.refresh();
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    const result = await deleteAsset(asset.id);
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Asset deleted", severity: "success" });
      router.push("/app/assets");
    }
    setLoading(false);
  };

  const handleAddEvidence = async (data: any) => {
    setLoading(true);
    const result = await addAssetEvidence(asset.id, data);
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Evidence added successfully", severity: "success" });
      router.refresh();
    }
    setLoading(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("assetId", asset.id);

    try {
      const response = await fetch("/api/upload/asset-evidence", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        await handleAddEvidence({
          type: "FILE",
          title: file.name,
          fileName: result.fileName,
          fileUrl: result.fileUrl,
          fileSize: result.fileSize,
          mimeType: result.mimeType,
        });
      } else {
        setSnackbar({ open: true, message: result.error || "Upload failed", severity: "error" });
      }
    } catch (error) {
      setSnackbar({ open: true, message: "Upload failed", severity: "error" });
    } finally {
      setUploading(false);
    }
  };

  const handleAddLink = async () => {
    if (!linkForm.title || !linkForm.url) return;
    await handleAddEvidence({ type: "LINK", title: linkForm.title, linkUrl: linkForm.url });
    setLinkDialogOpen(false);
    setLinkForm({ title: "", url: "" });
  };

  const handleAddNote = async () => {
    if (!noteForm.title || !noteForm.content) return;
    await handleAddEvidence({ type: "NOTE", title: noteForm.title, noteContent: noteForm.content });
    setNoteDialogOpen(false);
    setNoteForm({ title: "", content: "" });
  };

  const statusConfig = STATUS_OPTIONS.find(s => s.value === asset.status) || STATUS_OPTIONS[0];
  const riskConfig = getRiskConfig(asset.status);
  const activeOffboarding = asset.employee?.offboardings?.[0];

  if (!mounted) return null;

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
        <Button component={Link} href="/app/assets" startIcon={<span className="material-symbols-outlined">arrow_back</span>}>
          Back to Assets
        </Button>
      </Box>

      {/* Top Banner: Assignment Context */}
        <Card 
          variant="outlined" 
          sx={{ 
            borderRadius: 3, 
            mb: 3, 
            transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s ease, border-width 0.2s ease, box-shadow 0.2s ease",
            borderLeft: "4px solid", 
            borderLeftColor: asset.employee ? "success.main" : "divider",
            position: "relative",
            overflow: "hidden",
            transform: "translateZ(0)",
            backfaceVisibility: "hidden",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: asset.employee 
                ? "linear-gradient(90deg, rgba(46, 125, 50, 0.1) 0%, transparent 40%)" 
                : "linear-gradient(90deg, rgba(237, 108, 2, 0.1) 0%, transparent 40%)",
              opacity: 0,
              transition: "opacity 0.2s ease-out",
              zIndex: 0,
            },
            ...( !asset.employee && {
              cursor: "pointer",
              "&:hover": {
                borderLeftWidth: "6px",
                borderLeftColor: "warning.main",
                transform: "translateY(-1px) translateZ(0)",
                boxShadow: "inset 12px 0 16px -10px rgba(237, 108, 2, 0.3)",
                "&::before": {
                  opacity: 1,
                }
              }
            }),
            ...( asset.employee && {
              "&:hover": {
                borderLeftWidth: "6px",
                transform: "translateY(-0.5px) translateZ(0)",
                boxShadow: "inset 10px 0 14px -10px rgba(46, 125, 50, 0.2)",
                "&::before": {
                  opacity: 1,
                }
              }
            })
          }}
        >
        <Box sx={{ position: "relative", zIndex: 1 }}>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, md: 8 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Avatar sx={{ bgcolor: asset.employee ? "success.lighter" : "warning.lighter", color: asset.employee ? "success.main" : "warning.main" }}>
                    <span className="material-symbols-outlined">
                      {asset.employee ? "person" : "person_off"}
                    </span>
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      {asset.employee ? `Assigned to ${asset.employee.firstName} ${asset.employee.lastName}` : "Currently Unassigned"}
                    </Typography>
                    {asset.employee ? (
                      <Box sx={{ display: "flex", gap: 2, mt: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          ID: {asset.employee.employeeId || "—"}
                        </Typography>
                        <Link href={`/app/employees/${asset.employee.id}`} style={{ textDecoration: "none" }}>
                          <Typography variant="body2" color="primary.main" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            View Profile <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
                          </Typography>
                        </Link>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Available for assignment in inventory.
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: { md: "right" } }}>
                {activeOffboarding && (
                  <Chip
                    label="Linked to Active Offboarding"
                    color="error"
                    variant="outlined"
                    component={Link}
                    href={`/app/offboardings/${activeOffboarding.id}`}
                    clickable
                    icon={<span className="material-symbols-outlined" style={{ fontSize: 16 }}>exit_to_app</span>}
                    sx={{ mb: 1 }}
                  />
                )}
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ cursor: "pointer", "&:hover": { color: "primary.main" } }} onClick={() => document.getElementById("timeline-section")?.scrollIntoView({ behavior: "smooth" })}>
                    {history.length} events in Assignment History
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Box>
      </Card>

          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>

          <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Avatar sx={{ width: 64, height: 64, bgcolor: "primary.main" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 32 }}>
                      {asset.type === "LAPTOP" ? "laptop" : 
                       asset.type === "PHONE" ? "smartphone" : 
                       asset.type === "ACCESS_CARD" ? "badge" : 
                       asset.type === "KEYS" ? "key" : "devices"}
                    </span>
                  </Avatar>
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="h5" fontWeight={700}>{asset.name}</Typography>
                      <Chip 
                        label={riskConfig.label} 
                        size="small" 
                        color={riskConfig.color}
                        sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700 }}
                      />
                    </Box>
                    <Typography color="text.secondary" variant="body2">{asset.type}</Typography>
                    <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                      <Chip 
                        label={statusConfig.label} 
                        size="small" 
                        color={statusConfig.color as any}
                      />
                    </Box>
                  </Box>
                </Box>
                {canManage && (
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button variant="outlined" startIcon={<span className="material-symbols-outlined">edit</span>} onClick={() => setEditDialogOpen(true)}>
                      Edit
                    </Button>
                  </Box>
                )}
              </Box>

              <Divider sx={{ my: 3 }} />

              <Grid container spacing={4}>
                {/* Identity Section */}
                <Grid size={{ xs: 12 }}>
                  <Typography variant="overline" color="text.secondary" fontWeight={700}>
                    Asset Identity
                  </Typography>
                  <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant="caption" color="text.secondary" display="block">Serial Number</Typography>
                      <Typography fontWeight={500} variant="body1">{asset.serialNumber || "—"}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant="caption" color="text.secondary" display="block">Asset Tag</Typography>
                      <Typography fontWeight={500} variant="body1">{asset.assetTag || "—"}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant="caption" color="text.secondary" display="block">Asset Type</Typography>
                      <Typography fontWeight={500} variant="body1">{asset.type}</Typography>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Financial Section */}
                <Grid size={{ xs: 12 }}>
                  <Typography variant="overline" color="text.secondary" fontWeight={700}>
                    Financial Details
                  </Typography>
                  <Grid container spacing={2} sx={{ mt: 0.5 }}>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Typography variant="caption" color="text.secondary" display="block">Purchase Value</Typography>
                        <Typography fontWeight={500} variant="body1">
                          {asset.value ? `$${asset.value.toLocaleString()}` : "—"}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Typography variant="caption" color="text.secondary" display="block">Purchase Date</Typography>
                        <Typography fontWeight={500} variant="body1">
                          {asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : "—"}
                        </Typography>
                      </Grid>
                  </Grid>
                </Grid>

                {/* Responsibility block */}
                <Grid size={{ xs: 12 }}>
                  <Typography variant="overline" color="text.secondary" fontWeight={700}>
                    Responsibility & Ownership
                  </Typography>
                  <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant="caption" color="text.secondary" display="block">Current Custodian</Typography>
                      <Typography fontWeight={500} variant="body1">
                        {asset.employee ? `${asset.employee.firstName} ${asset.employee.lastName}` : "—"}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant="caption" color="text.secondary" display="block">Responsible Team</Typography>
                      <Typography fontWeight={500} variant="body1">IT / Admin</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant="caption" color="text.secondary" display="block">Managed By</Typography>
                      <Typography fontWeight={500} variant="body1">System Admin</Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Evidence & Attachments Panel */}
          <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}>
              <Tabs value={evidenceTab} onChange={(_, v) => setEvidenceTab(v)}>
                <Tab label={`Evidence (${asset.evidence?.length || 0})`} />
                <Tab label="Add Evidence" />
              </Tabs>
            </Box>
            <CardContent sx={{ p: 3 }}>
              {evidenceTab === 0 ? (
                <Box>
                  {!asset.evidence || asset.evidence.length === 0 ? (
                    <Box sx={{ py: 4, textAlign: "center" }}>
                      <Typography color="text.disabled" variant="body2">No evidence or attachments found</Typography>
                    </Box>
                  ) : (
                    <List disablePadding>
                      {asset.evidence.map((ev) => (
                        <ListItem key={ev.id} sx={{ px: 0, py: 2, borderBottom: 1, borderColor: "divider", "&:last-child": { borderBottom: 0 } }}>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: "action.hover" }}>
                              <span className="material-symbols-outlined" style={{ color: "var(--mui-palette-text-primary)" }}>
                                {ev.type === "FILE" ? "description" : ev.type === "LINK" ? "link" : "notes"}
                              </span>
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Typography variant="body2" fontWeight={700}>
                                {ev.title || "Untitled"}
                              </Typography>
                            }
                            secondary={
                              <Box>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Added by {ev.user.name || ev.user.email} • {new Date(ev.createdAt).toLocaleDateString()}
                                </Typography>
                                {ev.type === "LINK" && ev.linkUrl && (
                                  <Link href={ev.linkUrl} target="_blank" style={{ textDecoration: "none" }}>
                                    <Typography variant="caption" color="primary.main" sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                                      Open Link <span className="material-symbols-outlined" style={{ fontSize: 12 }}>open_in_new</span>
                                    </Typography>
                                  </Link>
                                )}
                                {ev.type === "FILE" && ev.fileUrl && (
                                  <Link href={ev.fileUrl} target="_blank" style={{ textDecoration: "none" }}>
                                    <Typography variant="caption" color="primary.main" sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                                      Download {ev.fileName} ({ev.fileSize ? `${(ev.fileSize / 1024).toFixed(1)} KB` : ""})
                                    </Typography>
                                  </Link>
                                )}
                                {ev.type === "NOTE" && ev.noteContent && (
                                  <Typography variant="body2" sx={{ mt: 1, p: 1, bgcolor: "action.hover", borderRadius: 1 }}>
                                    {ev.noteContent}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>
              ) : (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Upload files, add external links, or record notes as audit-grade evidence for this asset.
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Paper variant="outlined" sx={{ p: 2, textAlign: "center", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }} component="label">
                        <input type="file" hidden onChange={handleFileUpload} disabled={uploading} />
                        <span className="material-symbols-outlined" style={{ fontSize: 32, marginBottom: 8 }}>upload_file</span>
                        <Typography variant="body2" fontWeight={600}>Upload File</Typography>
                        {uploading && <CircularProgress size={20} sx={{ mt: 1 }} />}
                      </Paper>
                    </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Paper variant="outlined" sx={{ p: 2, textAlign: "center", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }} onClick={() => setLinkDialogOpen(true)}>
                          <span className="material-symbols-outlined" style={{ fontSize: 32, marginBottom: 8 }}>link</span>
                          <Typography variant="body2" fontWeight={600}>Add Link</Typography>
                        </Paper>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Paper variant="outlined" sx={{ p: 2, textAlign: "center", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }} onClick={() => setNoteDialogOpen(true)}>
                          <span className="material-symbols-outlined" style={{ fontSize: 32, marginBottom: 8 }}>edit_note</span>
                          <Typography variant="body2" fontWeight={600}>Record Note</Typography>
                        </Paper>
                      </Grid>

                  </Grid>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Lifecycle Timeline UI */}
          <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }} id="timeline-section">
            <CardContent sx={{ p: 3 }}>
              <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ mb: 3, display: "block" }}>
                Lifecycle Timeline
              </Typography>
              {history.length === 0 ? (
                <Box sx={{ py: 4, textAlign: "center" }}>
                  <Typography color="text.disabled" variant="body2">No lifecycle events recorded yet</Typography>
                </Box>
              ) : (
                <Box sx={{ position: "relative", pl: 4 }}>
                  {/* Vertical Line */}
                  <Box sx={{ position: "absolute", left: 15, top: 0, bottom: 0, width: 2, bgcolor: "divider" }} />
                  
                  {history.map((log, index) => {
                    const isStatusChange = log.action.includes("status") || log.action.includes("RETURN");
                    const isAssignment = log.action.includes("assign") || log.action.includes("EMPLOYEE");
                    const isCreation = log.action.includes("create");
                    
                    return (
                      <Box key={log.id} sx={{ position: "relative", mb: 4, "&:last-child": { mb: 0 } }}>
                        {/* Timeline Node */}
                        <Box sx={{ 
                          position: "absolute", 
                          left: -33, 
                          top: 0, 
                          width: 18, 
                          height: 18, 
                          borderRadius: "50%", 
                          bgcolor: isCreation ? "primary.main" : isStatusChange ? "info.main" : isAssignment ? "success.main" : "text.secondary",
                          border: "4px solid white",
                          boxShadow: 1,
                          zIndex: 2
                        }} />
                        
                        <Box>
                          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                            <Typography variant="body2" fontWeight={700}>
                              {log.action
                                .replace(/asset\./g, "")
                                .replace(/_/g, " ")
                                .split(".")
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(" → ")}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(log.createdAt).toLocaleString()}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Actor: {log.user?.name || log.user?.email || "System"}
                          </Typography>
                          {log.newData && (
                            <Box sx={{ mt: 1, p: 1.5, bgcolor: "action.hover", borderRadius: 2, border: "1px dashed", borderColor: "divider" }}>
                              <Typography variant="caption" component="pre" sx={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
                                {Object.entries(log.newData).map(([key, val]) => `${key}: ${val}`).join("\n")}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          {/* Assignment Control */}
          <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ mb: 2, display: "block" }}>
                Assignment Control
              </Typography>
              {asset.employee ? (
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2, p: 1.5, bgcolor: "action.hover", borderRadius: 2 }}>
                    <Avatar sx={{ width: 40, height: 40 }}>{asset.employee.firstName[0]}{asset.employee.lastName[0]}</Avatar>
                    <Box sx={{ overflow: "hidden" }}>
                      <Typography fontWeight={600} noWrap>
                        {asset.employee.firstName} {asset.employee.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {asset.employee.email}
                      </Typography>
                    </Box>
                  </Box>
                  {canManage && (
                      <Button 
                        variant="outlined" 
                        color="warning" 
                        fullWidth
                        onClick={handleUnassign}
                        disabled={loading}
                        startIcon={<span className="material-symbols-outlined">person_remove</span>}
                        sx={{
                          "&:hover": {
                            borderColor: "warning.main",
                            bgcolor: (theme) => alpha(theme.palette.warning.main, 0.04),
                          }
                        }}
                      >
                        Unassign Asset
                      </Button>
                  )}
                </Box>
              ) : (
                <Box sx={{ textAlign: "center", py: 2 }}>
                  <Box sx={{ color: "text.disabled", mb: 1 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 48 }}>person_off</span>
                  </Box>
                  <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
                    This asset is currently unassigned and available in inventory.
                  </Typography>
                  {canManage && (
                    <Tooltip title={(asset.status === "LOST" || asset.status === "WRITTEN_OFF") ? "Cannot assign: asset is not available" : ""}>
                      <span>
                        <Button 
                          variant="contained" 
                          fullWidth
                          onClick={() => {
                            if (asset.status === "DAMAGED") {
                              if (confirm("Warning: This asset is marked as DAMAGED. Are you sure you want to assign it?")) {
                                setAssignDialogOpen(true);
                              }
                            } else {
                              setAssignDialogOpen(true);
                            }
                          }}
                          disabled={asset.status === "LOST" || asset.status === "WRITTEN_OFF" || loading}
                          startIcon={<span className="material-symbols-outlined">person_add</span>}
                          sx={{ py: 1.2 }}
                        >
                          Assign Asset
                        </Button>
                      </span>
                    </Tooltip>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>

          {canManage && (
            <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ mb: 2, display: "block" }}>
                  Lifecycle Management
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Update the asset's condition or operational state.
                </Typography>
                <Button 
                  variant="outlined" 
                  fullWidth
                  onClick={() => setStatusDialogOpen(true)}
                  startIcon={<span className="material-symbols-outlined">published_with_changes</span>}
                >
                  Update Condition
                </Button>
              </CardContent>
            </Card>
          )}

            {canManage && (
              <Card 
                variant="outlined" 
                sx={{ 
                  borderRadius: 3, 
                  mb: 3, 
                  transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s ease, border-width 0.2s ease, box-shadow 0.2s ease",
                  borderColor: "divider",
                  borderLeft: "4px solid",
                  borderLeftColor: "error.main",
                  position: "relative",
                  overflow: "hidden",
                  transform: "translateZ(0)",
                  backfaceVisibility: "hidden",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    background: "linear-gradient(90deg, rgba(211, 47, 47, 0.08) 0%, transparent 40%)",
                    opacity: 0,
                    transition: "opacity 0.2s ease-out",
                    zIndex: 0,
                  },
                  "&:hover": {
                    borderLeftWidth: "6px",
                    transform: "translateY(-1px) translateZ(0)",
                    boxShadow: "inset 12px 0 16px -10px rgba(211, 47, 47, 0.3)",
                    "&::before": {
                      opacity: 1,
                    }
                  },
                  "& > *": { position: "relative", zIndex: 1 }
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="overline" color="error.main" fontWeight={700} sx={{ mb: 2, display: "block" }}>
                    Danger Zone
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                    Permanently remove this asset from the organization's inventory. This action cannot be undone and will be recorded in the security audit logs.
                  </Typography>
                  <Button 
                    variant="outlined" 
                    color="error" 
                    fullWidth
                    onClick={() => setDeleteDialogOpen(true)}
                    startIcon={<span className="material-symbols-outlined">delete</span>}
                    sx={{
                      borderRadius: 2.5,
                      textTransform: "none",
                      fontWeight: 700,
                      py: 1,
                      borderWidth: "1.5px",
                      transition: "all 0.2s ease",
                        "&:hover": {
                          borderColor: "error.main",
                          borderWidth: "1.5px",
                          bgcolor: "rgba(211, 47, 47, 0.04)",
                          boxShadow: "0 4px 12px rgba(211, 47, 47, 0.15)",
                          transform: "translateY(-1px)",
                        }
                    }}
                  >
                    Delete Asset
                  </Button>
                </CardContent>
              </Card>
            )}

          {asset.assetReturns.length > 0 && (
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ mb: 2, display: "block" }}>
                  Recovery History
                </Typography>
                {asset.assetReturns.map((ar) => (
                  <Box key={ar.id} sx={{ mb: 2, pb: 2, borderBottom: 1, borderColor: "divider", "&:last-child": { mb: 0, pb: 0, borderBottom: 0 } }}>
                    <Typography variant="body2" fontWeight={600}>
                      {ar.offboarding.employee.firstName} {ar.offboarding.employee.lastName}
                    </Typography>
                    <Chip 
                      label={ar.status} 
                      size="small" 
                      variant="outlined"
                      color={ar.status === "RETURNED" ? "success" : ar.status === "PENDING" ? "warning" : "error"}
                      sx={{ mt: 0.5, height: 20, fontSize: "0.7rem" }}
                    />
                    {ar.notes && (
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5, fontStyle: "italic" }}>
                        "{ar.notes}"
                      </Typography>
                    )}
                  </Box>
                ))}
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Audit Metadata Footer */}
      <Box sx={{ mt: 6, pb: 4, textAlign: "center", borderTop: 1, borderColor: "divider", pt: 3 }}>
        <Grid container spacing={2} justifyContent="center">
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" color="text.secondary" display="block">Created At</Typography>
            <Typography variant="caption" fontWeight={600}>{new Date(asset.createdAt).toLocaleString()}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" color="text.secondary" display="block">Created By</Typography>
            <Typography variant="caption" fontWeight={600}>{asset.createdBy?.name || asset.createdBy?.email || "System"}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" color="text.secondary" display="block">Last Updated At</Typography>
            <Typography variant="caption" fontWeight={600}>{new Date(asset.updatedAt).toLocaleString()}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" color="text.secondary" display="block">Last Updated By</Typography>
            <Typography variant="caption" fontWeight={600}>{asset.updatedBy?.name || asset.updatedBy?.email || "System"}</Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Dialogs */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
          <form onSubmit={handleUpdate}>
            <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Edit Asset Details</DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2 }}>
                <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ mb: 2, display: "block" }}>
                  General Information
                </Typography>
                <Grid container spacing={2.5} sx={{ mb: 4 }}>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Asset Name" name="name" defaultValue={asset.name} required variant="outlined" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField 
                      fullWidth 
                      label="Description" 
                      name="description" 
                      multiline 
                      minRows={1} 
                      maxRows={4} 
                      defaultValue={asset.description || ""} 
                      variant="outlined" 
                    />
                  </Grid>
                </Grid>

                <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ mb: 2, display: "block" }}>
                  Identification & Financials
                </Typography>
                <Grid container spacing={2.5} sx={{ mb: 4 }}>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Serial Number" name="serialNumber" defaultValue={asset.serialNumber || ""} variant="outlined" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Asset Tag" name="assetTag" defaultValue={asset.assetTag || ""} variant="outlined" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Purchase Value ($)" name="value" type="number" defaultValue={asset.value || ""} variant="outlined" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Purchase Date" name="purchaseDate" type="date" defaultValue={asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().split('T')[0] : ""} InputLabelProps={{ shrink: true }} variant="outlined" />
                  </Grid>
                </Grid>

                <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ mb: 2, display: "block" }}>
                  Internal Documentation
                </Typography>
                <Grid container spacing={2.5}>
                  <Grid item xs={12}>
                    <TextField 
                      fullWidth 
                      label="Administrative Notes" 
                      name="notes" 
                      multiline 
                      minRows={3} 
                      maxRows={8} 
                      defaultValue={asset.notes || ""} 
                      variant="outlined" 
                      placeholder="Add any additional context for administrators..." 
                      sx={{
                        '& .MuiInputBase-root': {
                          maxHeight: '200px',
                          overflowY: 'auto'
                        }
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2.5, borderTop: 1, borderColor: "divider" }}>
              <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={loading} sx={{ px: 3 }}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Assign Asset</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Select Employee</InputLabel>
            <Select
              value={selectedEmployee}
              label="Select Employee"
              onChange={(e) => setSelectedEmployee(e.target.value)}
            >
              {employees.map((e) => (
                <MenuItem key={e.id} value={e.id}>
                  {e.firstName} {e.lastName} ({e.email})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAssign} disabled={loading || !selectedEmployee}>
            {loading ? "Assigning..." : "Assign"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Update Asset Lifecycle State</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, mt: 1 }}>
            Select the current condition or operational status of this asset. This change will be recorded in the audit trail.
          </Typography>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Condition Status</InputLabel>
            <Select
              value={newStatus}
              label="Condition Status"
              onChange={(e) => setNewStatus(e.target.value)}
              renderValue={(selected) => {
                const option = STATUS_OPTIONS.find(o => o.value === selected);
                return option ? option.label : selected;
              }}
            >
              {STATUS_OPTIONS.map((s) => (
                <MenuItem key={s.value} value={s.value} sx={{ py: 1.5, display: "block" }}>
                  <Typography variant="body1" fontWeight={600}>{s.label}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {s.description}
                  </Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Internal Notes"
            placeholder="Add details about the status change (e.g., specific damage, location found, etc.)"
            multiline
            rows={3}
            value={statusNotes}
            onChange={(e) => setStatusNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleStatusChange} disabled={loading} sx={{ px: 4 }}>
            {loading ? "Updating..." : "Update Status"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle fontWeight={700}>Delete Asset?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{asset.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={linkDialogOpen} onClose={() => setLinkDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Add External Link</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Link to procurement records, warranty pages, or external documentation.
          </Typography>
          <TextField
            fullWidth
            label="Link Title"
            placeholder="e.g. Warranty Certificate"
            value={linkForm.title}
            onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            label="URL"
            placeholder="https://..."
            value={linkForm.url}
            onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddLink} disabled={!linkForm.title || !linkForm.url || loading}>
            Add Link
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={noteDialogOpen} onClose={() => setNoteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Record Administrative Note</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Capture context about condition, usage history, or specialized configurations.
          </Typography>
          <TextField
            fullWidth
            label="Note Title"
            placeholder="e.g. Storage Location Change"
            value={noteForm.title}
            onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            label="Note Content"
            multiline
            rows={4}
            placeholder="Add detailed information here..."
            value={noteForm.content}
            onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setNoteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddNote} disabled={!noteForm.title || !noteForm.content || loading}>
            Save Note
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
