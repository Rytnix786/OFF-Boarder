"use client";

import React, { useState } from "react";
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
  Grid,
  Alert,
  Snackbar,
  IconButton,
  Menu,
} from "@mui/material";
import { createAsset, assignAssetToEmployee, unassignAsset } from "@/lib/actions/assets";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Asset = {
  id: string;
  name: string;
  type: string;
  serialNumber: string | null;
  assetTag: string | null;
  description: string | null;
  value: number | null;
  status: "ASSIGNED" | "PENDING_RETURN" | "RETURNED" | "LOST" | "DAMAGED" | "WRITTEN_OFF";
  employee: { id: string; firstName: string; lastName: string; email: string } | null;
};

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

interface AssetsClientProps {
  assets: Asset[];
  employees: Employee[];
  canManage: boolean;
}

const ASSET_TYPES = [
  "LAPTOP", "PHONE", "TABLET", "MONITOR", "KEYBOARD", "MOUSE", 
  "HEADSET", "ACCESS_CARD", "KEYS", "VEHICLE", "OTHER"
];

export default function AssetsClient({ assets, employees, canManage }: AssetsClientProps) {
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" } | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; asset: Asset } | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const filteredAssets = assets.filter((asset) => {
    if (statusFilter !== "all" && asset.status !== statusFilter) return false;
    if (typeFilter !== "all" && asset.type !== typeFilter) return false;
    return true;
  });

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await createAsset(formData);
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Asset created", severity: "success" });
      setCreateDialogOpen(false);
      router.refresh();
    }
    setLoading(false);
  };

  const handleAssign = async (assetId: string, employeeId: string) => {
    setLoading(true);
    const result = await assignAssetToEmployee(assetId, employeeId);
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Asset assigned", severity: "success" });
      setAssignDialogOpen(null);
      router.refresh();
    }
    setLoading(false);
  };

  const handleUnassign = async (assetId: string) => {
    setLoading(true);
    const result = await unassignAsset(assetId);
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Asset unassigned", severity: "success" });
      setMenuAnchor(null);
      router.refresh();
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ASSIGNED": return "success";
      case "PENDING_RETURN": return "warning";
      case "RETURNED": return "info";
      case "LOST": return "error";
      case "DAMAGED": return "error";
      case "WRITTEN_OFF": return "default";
      default: return "default";
    }
  };

  const assignedCount = assets.filter(a => a.status === "ASSIGNED").length;
  const pendingCount = assets.filter(a => a.status === "PENDING_RETURN").length;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Assets</Typography>
          <Typography color="text.secondary">
            {assets.length} total, {assignedCount} assigned, {pendingCount} pending return
          </Typography>
        </Box>
        {canManage && (
          <Button
            variant="contained"
            startIcon={<span className="material-symbols-outlined">add</span>}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            Add Asset
          </Button>
        )}
      </Box>

      <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
        <Box sx={{ p: 2, display: "flex", gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              displayEmpty
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="ASSIGNED">Assigned</MenuItem>
              <MenuItem value="PENDING_RETURN">Pending Return</MenuItem>
              <MenuItem value="RETURNED">Returned</MenuItem>
              <MenuItem value="LOST">Lost</MenuItem>
              <MenuItem value="DAMAGED">Damaged</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              displayEmpty
            >
              <MenuItem value="all">All Types</MenuItem>
              {ASSET_TYPES.map((type) => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: 700, color: "text.secondary", fontSize: 12, textTransform: "uppercase" } }}>
                <TableCell>Asset</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Serial/Tag</TableCell>
                <TableCell>Assigned To</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAssets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 8, textAlign: "center" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.3 }}>
                      inventory_2
                    </span>
                    <Typography color="text.secondary" sx={{ mt: 1 }}>
                      No assets found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssets.map((asset) => (
                  <TableRow key={asset.id} hover>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Avatar sx={{ bgcolor: "primary.main" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                            {asset.type === "LAPTOP" ? "laptop" : 
                             asset.type === "PHONE" ? "smartphone" : 
                             asset.type === "ACCESS_CARD" ? "badge" : 
                             asset.type === "KEYS" ? "key" : "devices"}
                          </span>
                        </Avatar>
                        <Box>
                          <Typography fontWeight={600}>{asset.name}</Typography>
                          {asset.description && (
                            <Typography variant="caption" color="text.secondary">
                              {asset.description}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{asset.type}</TableCell>
                    <TableCell>{asset.serialNumber || asset.assetTag || "—"}</TableCell>
                    <TableCell>
                      {asset.employee ? (
                        <Box>
                          <Typography variant="body2">
                            {asset.employee.firstName} {asset.employee.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {asset.employee.email}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">Unassigned</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={asset.status.replace("_", " ")}
                        size="small"
                        color={getStatusColor(asset.status) as any}
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {canManage && (
                        <IconButton
                          size="small"
                          onClick={(e) => setMenuAnchor({ el: e.currentTarget, asset })}
                        >
                          <span className="material-symbols-outlined">more_vert</span>
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

        <Menu
          anchorEl={menuAnchor?.el}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
        >
          <MenuItem component={Link} href={`/app/assets/${menuAnchor?.asset.id}`}>
            <span className="material-symbols-outlined" style={{ marginRight: 8 }}>visibility</span>
            View Details
          </MenuItem>
          {menuAnchor?.asset.status !== "ASSIGNED" && (
            <MenuItem onClick={() => { setAssignDialogOpen(menuAnchor!.asset); setMenuAnchor(null); }}>
              <span className="material-symbols-outlined" style={{ marginRight: 8 }}>person_add</span>
              Assign
            </MenuItem>
          )}
          {menuAnchor?.asset.status === "ASSIGNED" && (
            <MenuItem onClick={() => handleUnassign(menuAnchor!.asset.id)} disabled={loading}>
              <span className="material-symbols-outlined" style={{ marginRight: 8 }}>person_remove</span>
              Unassign
            </MenuItem>
          )}
        </Menu>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleCreate}>
          <DialogTitle fontWeight={700}>Add New Asset</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth label="Asset Name" name="name" required />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Type</InputLabel>
                  <Select name="type" label="Type" defaultValue="OTHER">
                    {ASSET_TYPES.map((type) => (
                      <MenuItem key={type} value={type}>{type}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Serial Number" name="serialNumber" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Asset Tag" name="assetTag" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Value ($)" name="value" type="number" />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth label="Description" name="description" multiline rows={2} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
                  <InputLabel>Assign To (Optional)</InputLabel>
                  <Select name="employeeId" label="Assign To (Optional)" defaultValue="">
                    <MenuItem value="">Unassigned</MenuItem>
                    {employees.map((e) => (
                      <MenuItem key={e.id} value={e.id}>
                        {e.firstName} {e.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? "Creating..." : "Create Asset"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={!!assignDialogOpen} onClose={() => setAssignDialogOpen(null)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Assign Asset</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Assigning: <strong>{assignDialogOpen?.name}</strong> ({assignDialogOpen?.type})
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Assign To</InputLabel>
            <Select
              id="assign-employee"
              label="Assign To"
              defaultValue=""
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
          <Button onClick={() => setAssignDialogOpen(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              const select = document.getElementById("assign-employee") as HTMLSelectElement;
              const employeeId = select?.querySelector("[aria-selected='true']")?.getAttribute("data-value") || 
                               (select?.nextElementSibling?.querySelector("input") as HTMLInputElement)?.value;
              if (assignDialogOpen && employeeId) {
                handleAssign(assignDialogOpen.id, employeeId);
              }
            }}
            disabled={loading}
          >
            Assign
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
