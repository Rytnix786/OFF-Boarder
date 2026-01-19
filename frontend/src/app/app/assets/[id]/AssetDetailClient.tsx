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
  { value: "ASSIGNED", label: "Assigned", color: "success" },
  { value: "PENDING_RETURN", label: "Pending Return", color: "warning" },
  { value: "RETURNED", label: "Returned", color: "info" },
  { value: "LOST", label: "Lost", color: "error" },
  { value: "DAMAGED", label: "Damaged", color: "error" },
  { value: "WRITTEN_OFF", label: "Written Off", color: "default" },
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
                    <Typography color="text.secondary">{asset.type}</Typography>
                    <Chip 
                      label={statusConfig.label} 
                      size="small" 
                      color={statusConfig.color as any}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </Box>
                {canManage && (
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button variant="outlined" onClick={() => setEditDialogOpen(true)}>
                      Edit
                    </Button>
                    <Button variant="outlined" color="error" onClick={() => setDeleteDialogOpen(true)}>
                      Delete
                    </Button>
                  </Box>
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Serial Number</Typography>
                  <Typography fontWeight={500}>{asset.serialNumber || "—"}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Asset Tag</Typography>
                  <Typography fontWeight={500}>{asset.assetTag || "—"}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Value</Typography>
                  <Typography fontWeight={500}>{asset.value ? `$${asset.value.toLocaleString()}` : "—"}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Purchase Date</Typography>
                  <Typography fontWeight={500}>
                    {asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : "—"}
                  </Typography>
                </Grid>
                {asset.description && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" color="text.secondary">Description</Typography>
                    <Typography fontWeight={500}>{asset.description}</Typography>
                  </Grid>
                )}
                {asset.notes && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" color="text.secondary">Notes</Typography>
                    <Typography fontWeight={500}>{asset.notes}</Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Asset History</Typography>
              {history.length === 0 ? (
                <Typography color="text.secondary">No history available</Typography>
              ) : (
                <List disablePadding>
                  {history.map((log, index) => (
                    <ListItem key={log.id} divider={index < history.length - 1} sx={{ px: 0 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: "primary.light", width: 36, height: 36 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>history</span>
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={log.action.replace(/_/g, " ").replace(/\./g, " → ")}
                        secondary={
                          <>
                            {log.user?.name || log.user?.email || "System"} • {new Date(log.createdAt).toLocaleString()}
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Current Assignment</Typography>
              {asset.employee ? (
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                    <Avatar>{asset.employee.firstName[0]}{asset.employee.lastName[0]}</Avatar>
                    <Box>
                      <Typography fontWeight={600}>
                        {asset.employee.firstName} {asset.employee.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
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
                    >
                      Unassign Asset
                    </Button>
                  )}
                </Box>
              ) : (
                <Box>
                  <Typography color="text.secondary" sx={{ mb: 2 }}>This asset is not assigned</Typography>
                  {canManage && (
                    <Button 
                      variant="contained" 
                      fullWidth
                      onClick={() => setAssignDialogOpen(true)}
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
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Update Status</Typography>
                <Button 
                  variant="outlined" 
                  fullWidth
                  onClick={() => setStatusDialogOpen(true)}
                >
                  Change Status
                </Button>
              </CardContent>
            </Card>
          )}

          {asset.assetReturns.length > 0 && (
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Offboarding Returns</Typography>
                {asset.assetReturns.map((ar) => (
                  <Box key={ar.id} sx={{ mb: 2, pb: 2, borderBottom: 1, borderColor: "divider" }}>
                    <Typography fontWeight={600}>
                      {ar.offboarding.employee.firstName} {ar.offboarding.employee.lastName}
                    </Typography>
                    <Chip 
                      label={ar.status} 
                      size="small" 
                      color={ar.status === "RETURNED" ? "success" : ar.status === "PENDING" ? "warning" : "error"}
                      sx={{ mt: 0.5 }}
                    />
                    {ar.notes && (
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                        {ar.notes}
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
        <DialogTitle fontWeight={700}>Update Asset Status</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={newStatus}
              label="Status"
              onChange={(e) => setNewStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => (
                <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Notes (optional)"
            multiline
            rows={2}
            value={statusNotes}
            onChange={(e) => setStatusNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleStatusChange} disabled={loading}>
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
