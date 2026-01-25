"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Autocomplete,
  alpha,
  useTheme,
  Stack,
  Fade,
  Radio,
  RadioGroup,
  FormControlLabel,
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
  const theme = useTheme();
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
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [evidenceTab, setEvidenceTab] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [assigneeType, setAssigneeType] = useState<"EMPLOYEE" | "ADMIN">("EMPLOYEE");

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
    const result = await assignAssetToEmployee(asset.id, selectedEmployee.id);
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
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          borderLeft: "4px solid", 
          borderLeftColor: asset.employee ? "success.main" : "divider",
          position: "relative",
          overflow: "hidden",
          "&:hover": {
            boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.08)}`,
          }
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 8 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar sx={{ 
                  width: 48, 
                  height: 48, 
                  bgcolor: asset.employee ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.warning.main, 0.1), 
                  color: asset.employee ? theme.palette.success.main : theme.palette.warning.main 
                }}>
                  <span className="material-symbols-outlined">
                    {asset.employee ? "person" : "person_off"}
                  </span>
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={800}>
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
                />
              )}
            </Box>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Avatar sx={{ width: 64, height: 64, bgcolor: theme.palette.primary.main, boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}` }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 32 }}>
                      {asset.type === "LAPTOP" ? "laptop" : 
                       asset.type === "PHONE" ? "smartphone" : 
                       asset.type === "ACCESS_CARD" ? "badge" : 
                       asset.type === "KEYS" ? "key" : "devices"}
                    </span>
                  </Avatar>
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="h5" fontWeight={900}>{asset.name}</Typography>
                      <Chip 
                        label={riskConfig.label} 
                        size="small" 
                        color={riskConfig.color}
                        sx={{ height: 20, fontSize: "0.7rem", fontWeight: 800 }}
                      />
                    </Box>
                    <Typography color="text.secondary" variant="body2" fontWeight={500}>{asset.type}</Typography>
                    <Box sx={{ mt: 1 }}>
                      <Chip 
                        label={statusConfig.label} 
                        size="small" 
                        color={statusConfig.color as any}
                        sx={{ fontWeight: 700 }}
                      />
                    </Box>
                  </Box>
                </Box>
                {canManage && (
                  <Button 
                    variant="outlined" 
                    startIcon={<span className="material-symbols-outlined">edit</span>} 
                    onClick={() => setEditDialogOpen(true)}
                    sx={{ borderRadius: 2 }}
                  >
                    Edit
                  </Button>
                )}
              </Box>

              <Divider sx={{ my: 3 }} />

                <Grid container spacing={4}>
                  <Grid size={12}>
                    <Typography variant="overline" color="text.secondary" fontWeight={800} sx={{ letterSpacing: 1.2 }}>
                      Asset Identity
                    </Typography>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase" }}>Serial Number</Typography>
                        <Typography fontWeight={600} variant="body1" sx={{ fontFamily: "monospace" }}>{asset.serialNumber || "—"}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase" }}>Asset Tag</Typography>
                        <Typography fontWeight={600} variant="body1" sx={{ fontFamily: "monospace" }}>{asset.assetTag || "—"}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase" }}>Type</Typography>
                        <Typography fontWeight={600} variant="body1">{asset.type}</Typography>
                      </Grid>
                    </Grid>
                  </Grid>

                  <Grid size={12}>
                    <Typography variant="overline" color="text.secondary" fontWeight={800} sx={{ letterSpacing: 1.2 }}>
                      Financials & History
                    </Typography>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase" }}>Purchase Value</Typography>
                        <Typography fontWeight={600} variant="body1">
                          {asset.value ? `$${asset.value.toLocaleString()}` : "—"}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase" }}>Purchase Date</Typography>
                        <Typography fontWeight={600} variant="body1">
                          {asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : "—"}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
            </CardContent>
          </Card>

          {/* Evidence Section */}
          <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}>
              <Tabs value={evidenceTab} onChange={(_, v) => setEvidenceTab(v)}>
                <Tab label={`Evidence (${asset.evidence?.length || 0})`} sx={{ fontWeight: 700 }} />
                <Tab label="Add Evidence" sx={{ fontWeight: 700 }} />
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
                            <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}>
                              <span className="material-symbols-outlined">
                                {ev.type === "FILE" ? "description" : ev.type === "LINK" ? "link" : "notes"}
                              </span>
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Typography variant="body2" fontWeight={800}>
                                {ev.title || "Untitled"}
                              </Typography>
                            }
                            secondary={
                              <Box>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Added by {ev.user.name || ev.user.email} • {new Date(ev.createdAt).toLocaleDateString()}
                                </Typography>
                                {ev.type === "FILE" && ev.fileUrl && (
                                  <Link href={ev.fileUrl} target="_blank" style={{ textDecoration: "none" }}>
                                    <Typography variant="caption" color="primary.main" sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5, fontWeight: 700 }}>
                                      DOWNLOAD FILE <span className="material-symbols-outlined" style={{ fontSize: 12 }}>download</span>
                                    </Typography>
                                  </Link>
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
                <Stack direction="row" spacing={2}>
                  <Paper 
                    variant="outlined" 
                    component="label"
                    sx={{ 
                      flex: 1, p: 3, textAlign: "center", cursor: "pointer", 
                      borderRadius: 3, transition: "all 0.2s",
                      "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.04), borderColor: theme.palette.primary.main }
                    }}
                  >
                    <input type="file" hidden onChange={handleFileUpload} disabled={uploading} />
                    <span className="material-symbols-outlined" style={{ fontSize: 32, marginBottom: 8, color: theme.palette.primary.main }}>upload_file</span>
                    <Typography variant="body2" fontWeight={700}>Upload File</Typography>
                    {uploading && <CircularProgress size={20} sx={{ mt: 1 }} />}
                  </Paper>
                  <Paper 
                    variant="outlined" 
                    onClick={() => setLinkDialogOpen(true)}
                    sx={{ 
                      flex: 1, p: 3, textAlign: "center", cursor: "pointer", 
                      borderRadius: 3, transition: "all 0.2s",
                      "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.04), borderColor: theme.palette.primary.main }
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 32, marginBottom: 8, color: theme.palette.primary.main }}>link</span>
                    <Typography variant="body2" fontWeight={700}>Add Link</Typography>
                  </Paper>
                  <Paper 
                    variant="outlined" 
                    onClick={() => setNoteDialogOpen(true)}
                    sx={{ 
                      flex: 1, p: 3, textAlign: "center", cursor: "pointer", 
                      borderRadius: 3, transition: "all 0.2s",
                      "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.04), borderColor: theme.palette.primary.main }
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 32, marginBottom: 8, color: theme.palette.primary.main }}>edit_note</span>
                    <Typography variant="body2" fontWeight={700}>Add Note</Typography>
                  </Paper>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
  
        <Grid size={{ xs: 12, md: 4 }}>
          {/* Assignment Control */}
          <Card variant="outlined" sx={{ borderRadius: 3, mb: 3, overflow: "hidden" }}>
            <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderBottom: "1px solid", borderColor: "divider" }}>
              <Typography variant="overline" color="primary.main" fontWeight={900}>
                Assignment Control
              </Typography>
            </Box>
            <CardContent sx={{ p: 3 }}>
              {asset.employee ? (
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3, p: 2, bgcolor: "action.hover", borderRadius: 3 }}>
                    <Avatar sx={{ width: 48, height: 48, fontWeight: 700, bgcolor: theme.palette.primary.main }}>
                      {asset.employee.firstName[0]}{asset.employee.lastName[0]}
                    </Avatar>
                    <Box sx={{ overflow: "hidden" }}>
                      <Typography variant="subtitle2" fontWeight={800} noWrap>
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
                      color="error" 
                      fullWidth
                      onClick={handleUnassign}
                      disabled={loading}
                      startIcon={<span className="material-symbols-outlined">person_remove</span>}
                      sx={{ borderRadius: 2.5, fontWeight: 700, py: 1.2 }}
                    >
                      Unassign Asset
                    </Button>
                  )}
                </Box>
              ) : (
                <Box sx={{ textAlign: "center", py: 2 }}>
                  <Box sx={{ width: 64, height: 64, borderRadius: "50%", bgcolor: alpha(theme.palette.warning.main, 0.1), color: theme.palette.warning.main, display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 32 }}>person_off</span>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontWeight: 500 }}>
                    This asset is currently in inventory and available for assignment.
                  </Typography>
                  {canManage && (
                    <Button 
                      variant="contained" 
                      fullWidth
                      onClick={() => setAssignDialogOpen(true)}
                      disabled={asset.status === "LOST" || asset.status === "WRITTEN_OFF" || loading}
                      startIcon={<span className="material-symbols-outlined">person_add</span>}
                      sx={{ borderRadius: 2.5, fontWeight: 800, py: 1.5, boxShadow: theme.shadows[4] }}
                    >
                      Assign Asset
                    </Button>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Status Control */}
          {canManage && (
            <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="overline" color="text.secondary" fontWeight={800} sx={{ mb: 2, display: "block" }}>
                  Status Management
                </Typography>
                <Button 
                  variant="outlined" 
                  fullWidth
                  onClick={() => setStatusDialogOpen(true)}
                  startIcon={<span className="material-symbols-outlined">published_with_changes</span>}
                  sx={{ borderRadius: 2, fontWeight: 700 }}
                >
                  Update Condition
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Delete Action */}
          {canManage && (
            <Card variant="outlined" sx={{ borderRadius: 3, borderColor: alpha(theme.palette.error.main, 0.2) }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="overline" color="error.main" fontWeight={800} sx={{ mb: 2, display: "block" }}>
                  Danger Zone
                </Typography>
                <Button 
                  variant="outlined" 
                  color="error" 
                  fullWidth
                  onClick={() => setDeleteDialogOpen(true)}
                  startIcon={<span className="material-symbols-outlined">delete</span>}
                  sx={{ borderRadius: 2, fontWeight: 700, "&:hover": { bgcolor: alpha(theme.palette.error.main, 0.05) } }}
                >
                  Delete Asset
                </Button>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Premium Assignment Dialog */}
      <Dialog 
        open={assignDialogOpen} 
        onClose={() => setAssignDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 6,
            p: 1,
            backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, transparent 100%)`,
          }
        }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <Typography variant="h5" fontWeight={900}>Assign Asset</Typography>
          <IconButton onClick={() => setAssignDialogOpen(false)} size="small">
            <span className="material-symbols-outlined">close</span>
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Choose an employee or admin to assign this equipment to.
          </Typography>

          <Stack spacing={3}>
            {/* Assignee Type Selector */}
            <Box>
                <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ textTransform: "uppercase", ml: 1, mb: 1, display: "block" }}>
                  Select Assignee Type
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Paper
                      variant="outlined"
                      onClick={() => setAssigneeType("EMPLOYEE")}
                      sx={{
                        p: 2,
                        cursor: "pointer",
                        borderRadius: 4,
                        transition: "all 0.2s",
                        borderWidth: 2,
                        borderColor: assigneeType === "EMPLOYEE" ? "primary.main" : "divider",
                        bgcolor: assigneeType === "EMPLOYEE" ? alpha(theme.palette.primary.main, 0.05) : "transparent",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ 
                        fontSize: 32, 
                        color: assigneeType === "EMPLOYEE" ? theme.palette.primary.main : theme.palette.text.disabled 
                      }}>person</span>
                      <Typography variant="subtitle2" fontWeight={800}>Employee</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={6}>
                    <Paper
                      variant="outlined"
                      onClick={() => setAssigneeType("ADMIN")}
                      sx={{
                        p: 2,
                        cursor: "pointer",
                        borderRadius: 4,
                        transition: "all 0.2s",
                        borderWidth: 2,
                        borderColor: assigneeType === "ADMIN" ? "primary.main" : "divider",
                        bgcolor: assigneeType === "ADMIN" ? alpha(theme.palette.primary.main, 0.05) : "transparent",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ 
                        fontSize: 32, 
                        color: assigneeType === "ADMIN" ? theme.palette.primary.main : theme.palette.text.disabled 
                      }}>admin_panel_settings</span>
                      <Typography variant="subtitle2" fontWeight={800}>Admin User</Typography>
                    </Paper>
                  </Grid>
                </Grid>
            </Box>

            {/* Employee Search */}
            <Box>
              <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ textTransform: "uppercase", ml: 1, mb: 1, display: "block" }}>
                Search {assigneeType === "EMPLOYEE" ? "Employee" : "Admin User"}
              </Typography>
              <Autocomplete
                options={employees}
                getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                value={selectedEmployee}
                onChange={(_, newValue) => setSelectedEmployee(newValue)}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    placeholder="Search by name or email..." 
                    variant="outlined"
                    fullWidth
                    InputProps={{
                      ...params.InputProps,
                      sx: { borderRadius: 3, bgcolor: "background.paper" }
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props} sx={{ p: 1.5 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar sx={{ width: 40, height: 40, bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}>
                        {option.firstName[0]}{option.lastName[0]}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" fontWeight={700}>
                          {option.firstName} {option.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.email}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                )}
              />
            </Box>

            {selectedEmployee && (
              <Fade in>
                <Alert 
                  severity="info" 
                  icon={<span className="material-symbols-outlined">info</span>}
                  sx={{ borderRadius: 3, bgcolor: alpha(theme.palette.info.main, 0.05) }}
                >
                  <Typography variant="body2" fontWeight={600}>
                    Confirm Assignment
                  </Typography>
                  <Typography variant="caption">
                    Assigning <strong>{asset.name}</strong> to <strong>{selectedEmployee.firstName} {selectedEmployee.lastName}</strong>. They will receive a notification to verify receipt.
                  </Typography>
                </Alert>
              </Fade>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setAssignDialogOpen(false)} sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleAssign} 
            disabled={loading || !selectedEmployee}
            sx={{ 
              borderRadius: 3, 
              px: 4, 
              py: 1.2, 
              fontWeight: 900,
              boxShadow: theme.shadows[4]
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "Confirm Assignment"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Other Dialogs (Simplified for Brevity) */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle fontWeight={800}>Update Condition</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Operational Status</InputLabel>
              <Select value={newStatus} label="Operational Status" onChange={(e) => setNewStatus(e.target.value)}>
                {STATUS_OPTIONS.map(s => (
                  <MenuItem key={s.value} value={s.value} sx={{ py: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={700}>{s.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{s.description}</Typography>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField fullWidth label="Status Notes" multiline rows={3} value={statusNotes} onChange={(e) => setStatusNotes(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleStatusChange} disabled={loading} sx={{ borderRadius: 2, fontWeight: 700 }}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle fontWeight={800}>Permanently Delete?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This asset will be permanently removed from inventory. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={loading} sx={{ borderRadius: 2, fontWeight: 700 }}>
            Delete Permanently
          </Button>
        </DialogActions>
      </Dialog>

      {/* SnackBar */}
      <Snackbar open={!!snackbar} autoHideDuration={6000} onClose={() => setSnackbar(null)}>
        <Alert severity={snackbar?.severity} variant="filled" sx={{ borderRadius: 2 }}>
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
