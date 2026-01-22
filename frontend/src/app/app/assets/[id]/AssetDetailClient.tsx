"use client";

import React, { useState } from "react";
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
} from "@mui/material";
import { updateAsset, assignAssetToEmployee, unassignAsset, updateAssetReturnStatus, deleteAsset } from "@/lib/actions/assets";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId?: string;
};

type AssetReturn = {
  id: string;
  status: string;
  returnedAt: Date | null;
  notes: string | null;
  offboarding: {
    id: string;
    status: string;
    employee: { firstName: string; lastName: string };
  };
};

type Asset = {
  id: string;
  name: string;
  type: string;
  serialNumber: string | null;
  assetTag: string | null;
  description: string | null;
  value: number | null;
  purchaseDate: Date | null;
  status: string;
  notes: string | null;
  createdAt: Date;
  employee: Employee | null;
  assetReturns: AssetReturn[];
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

export default function AssetDetailClient({ asset, history, employees, canManage }: AssetDetailClientProps) {
  const router = useRouter();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" } | null>(null);
  const [newStatus, setNewStatus] = useState(asset.status);
  const [statusNotes, setStatusNotes] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");

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

  const statusConfig = STATUS_OPTIONS.find(s => s.value === asset.status) || STATUS_OPTIONS[0];

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
        <Button component={Link} href="/app/assets" startIcon={<span className="material-symbols-outlined">arrow_back</span>}>
          Back to Assets
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
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
                      <Typography variant="h5" fontWeight={700}>{asset.name}</Typography>
                      <Typography color="text.secondary" variant="body2">{asset.type}</Typography>
                      <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                        <Chip 
                          label={asset.employee ? "Assigned" : "Unassigned"} 
                          size="small" 
                          variant="outlined"
                          color={asset.employee ? "success" : "default"}
                        />
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

                  {/* Condition Section */}
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="overline" color="text.secondary" fontWeight={700}>
                      Lifecycle & Notes
                    </Typography>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Typography variant="caption" color="text.secondary" display="block">Current Status</Typography>
                        <Typography fontWeight={500} variant="body1" color={statusConfig.color === "error" ? "error.main" : "text.primary"}>
                          {statusConfig.label}
                        </Typography>
                      </Grid>
                      {asset.description && (
                        <Grid size={{ xs: 12 }}>
                          <Typography variant="caption" color="text.secondary" display="block">Description</Typography>
                          <Typography variant="body2">{asset.description}</Typography>
                        </Grid>
                      )}
                      {asset.notes && (
                        <Grid size={{ xs: 12 }}>
                          <Typography variant="caption" color="text.secondary" display="block">Internal Notes</Typography>
                          <Typography variant="body2">{asset.notes}</Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Grid>
                </Grid>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
                <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ mb: 2, display: "block" }}>
                  Audit Trail
                </Typography>
                {history.length === 0 ? (
                  <Box sx={{ py: 4, textAlign: "center" }}>
                    <Typography color="text.disabled" variant="body2">No activity recorded yet</Typography>
                  </Box>
                ) : (
                  <List disablePadding>
                    {history.map((log, index) => {
                      const isStatusChange = log.action.includes("status") || log.action.includes("RETURN");
                      const isAssignment = log.action.includes("assign") || log.action.includes("EMPLOYEE");
                      
                      return (
                        <ListItem key={log.id} sx={{ px: 0, py: 1.5, alignItems: "flex-start" }}>
                          <ListItemAvatar sx={{ minWidth: 48 }}>
                            <Avatar sx={{ 
                              bgcolor: isStatusChange ? "info.lighter" : isAssignment ? "success.lighter" : "action.hover", 
                              color: isStatusChange ? "info.main" : isAssignment ? "success.main" : "text.secondary",
                              width: 32, 
                              height: 32 
                            }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                                {isStatusChange ? "published_with_changes" : isAssignment ? "person" : "history"}
                              </span>
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Typography variant="body2" fontWeight={600}>
                                {log.action
                                  .replace(/asset\./g, "")
                                  .replace(/_/g, " ")
                                  .split(".")
                                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                  .join(" → ")}
                              </Typography>
                            }
                            secondary={
                              <Box component="span" sx={{ display: "block", mt: 0.5 }}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {log.user?.name || log.user?.email || "System"} • {new Date(log.createdAt).toLocaleString()}
                                </Typography>
                                {log.newData && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontStyle: "italic", mt: 0.5 }}>
                                    {Object.entries(log.newData).map(([key, val]) => `${key}: ${val}`).join(", ")}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                )}
              </CardContent>
          </Card>
        </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ mb: 2, display: "block" }}>
                  Current Assignment
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
                      <Button 
                        variant="contained" 
                        fullWidth
                        onClick={() => setAssignDialogOpen(true)}
                        startIcon={<span className="material-symbols-outlined">person_add</span>}
                        sx={{ py: 1.2 }}
                      >
                        Assign Asset
                      </Button>
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
              <Card variant="outlined" sx={{ borderRadius: 3, mb: 3, borderColor: "error.light", bgcolor: "error.lighter" }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="overline" color="error.main" fontWeight={700} sx={{ mb: 2, display: "block" }}>
                    Danger Zone
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Permanently remove this asset from the organization's inventory.
                  </Typography>
                  <Button 
                    variant="outlined" 
                    color="error" 
                    fullWidth
                    onClick={() => setDeleteDialogOpen(true)}
                    startIcon={<span className="material-symbols-outlined">delete</span>}
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

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleUpdate}>
          <DialogTitle fontWeight={700}>Edit Asset</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth label="Asset Name" name="name" defaultValue={asset.name} required />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Serial Number" name="serialNumber" defaultValue={asset.serialNumber || ""} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Asset Tag" name="assetTag" defaultValue={asset.assetTag || ""} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Value ($)" name="value" type="number" defaultValue={asset.value || ""} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth label="Description" name="description" multiline rows={2} defaultValue={asset.description || ""} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth label="Notes" name="notes" multiline rows={2} defaultValue={asset.notes || ""} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>
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
