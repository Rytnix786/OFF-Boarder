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
  Tabs,
  Tab,
  RadioGroup,
  FormControlLabel,
  Radio,
  Autocomplete,
  Paper,
  CircularProgress,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { createAsset, assignAssetToEmployee, assignAssetToUser, unassignAsset } from "@/lib/actions/assets";
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
  assigneeType: string | null;
  assigneeUserId: string | null;
  employee: { id: string; firstName: string; lastName: string; email: string } | null;
  assigneeUser: { id: string; name: string | null; email: string } | null;
};

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

type OrgUser = {
  id: string;
  name: string | null;
  email: string;
};

interface AssetsClientProps {
  assets: Asset[];
  employees: Employee[];
  orgUsers: OrgUser[];
  canManage: boolean;
  currentUserId: string;
  myAssignedAssets: Asset[];
}

const ASSET_TYPES = [
  "LAPTOP", "PHONE", "TABLET", "MONITOR", "KEYBOARD", "MOUSE", 
  "HEADSET", "ACCESS_CARD", "KEYS", "VEHICLE", "OTHER"
];

export default function AssetsClient({ 
  assets, 
  employees, 
  orgUsers,
  canManage,
  currentUserId,
  myAssignedAssets,
}: AssetsClientProps) {
  const theme = useTheme();
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" } | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; asset: Asset } | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [assigneeType, setAssigneeType] = useState<"EMPLOYEE" | "ORG_USER">("EMPLOYEE");
  const [selectedAssignee, setSelectedAssignee] = useState<Employee | OrgUser | null>(null);
  const [activeTab, setActiveTab] = useState(0);

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

  const handleAssign = async () => {
    if (!assignDialogOpen || !selectedAssignee) return;
    
    setLoading(true);
    let result;
    
    if (assigneeType === "EMPLOYEE") {
      result = await assignAssetToEmployee(assignDialogOpen.id, selectedAssignee.id);
    } else {
      result = await assignAssetToUser(assignDialogOpen.id, selectedAssignee.id);
    }
    
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Asset assigned successfully! Assignee has been notified.", severity: "success" });
      setAssignDialogOpen(null);
      setSelectedAssignee(null);
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

  const getAssigneeDisplay = (asset: Asset) => {
    if (asset.assigneeType === "EMPLOYEE" && asset.employee) {
      return (
        <Box>
          <Typography variant="body2">
            {asset.employee.firstName} {asset.employee.lastName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {asset.employee.email}
          </Typography>
        </Box>
      );
    }
    if (asset.assigneeType === "ORG_USER" && asset.assigneeUser) {
      return (
        <Box>
          <Typography variant="body2">
            {asset.assigneeUser.name || "Unnamed User"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {asset.assigneeUser.email}
          </Typography>
        </Box>
      );
    }
    if (asset.employee) {
      return (
        <Box>
          <Typography variant="body2">
            {asset.employee.firstName} {asset.employee.lastName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {asset.employee.email}
          </Typography>
        </Box>
      );
    }
    return <Typography variant="body2" color="text.secondary">Unassigned</Typography>;
  };

  const assignedCount = assets.filter(a => a.status === "ASSIGNED").length;
  const pendingCount = assets.filter(a => a.status === "PENDING_RETURN").length;

  const renderAssetTable = (assetList: Asset[], showActions = true) => (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow sx={{ "& th": { fontWeight: 700, color: "text.secondary", fontSize: 12, textTransform: "uppercase" } }}>
            <TableCell>Asset</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Serial/Tag</TableCell>
            <TableCell>Assigned To</TableCell>
            <TableCell>Status</TableCell>
            {showActions && <TableCell align="right">Actions</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {assetList.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showActions ? 6 : 5} sx={{ py: 8, textAlign: "center" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.3 }}>
                  inventory_2
                </span>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  No assets found
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            assetList.map((asset) => (
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
                <TableCell>{getAssigneeDisplay(asset)}</TableCell>
                <TableCell>
                  <Chip
                    label={asset.status.replace("_", " ")}
                    size="small"
                    color={getStatusColor(asset.status) as any}
                    sx={{ fontWeight: 600 }}
                  />
                </TableCell>
                {showActions && (
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
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

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

      {myAssignedAssets.length > 0 && (
        <Card variant="outlined" sx={{ borderRadius: 3, mb: 3, border: "2px solid", borderColor: "primary.main" }}>
          <Box sx={{ p: 2, bgcolor: "primary.main", color: "white" }}>
            <Typography variant="h6" fontWeight={700}>
              <span className="material-symbols-outlined" style={{ verticalAlign: "middle", marginRight: 8 }}>assignment_ind</span>
              My Assigned Assets ({myAssignedAssets.length})
            </Typography>
          </Box>
          {renderAssetTable(myAssignedAssets, false)}
        </Card>
      )}

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
        {renderAssetTable(filteredAssets)}
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

      <Dialog 
        open={!!assignDialogOpen} 
        onClose={() => { setAssignDialogOpen(null); setSelectedAssignee(null); }} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{ 
          sx: { 
            borderRadius: 5,
            backgroundImage: "none",
            bgcolor: "background.paper",
            boxShadow: "0 32px 64px -12px rgba(0,0,0,0.5)",
            border: "1px solid",
            borderColor: "divider",
            overflow: "hidden"
          } 
        }}
      >
        <Box sx={{ 
          p: 4, 
          pb: 3, 
          borderBottom: "1px solid", 
          borderColor: "divider", 
          bgcolor: alpha(theme.palette.background.default, 0.4),
          backdropFilter: "blur(10px)"
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Box sx={{ 
              width: 64, 
              height: 64, 
              borderRadius: "20px",
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: "primary.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 8px 20px -4px ${alpha(theme.palette.primary.main, 0.2)}`,
              border: "1px solid",
              borderColor: alpha(theme.palette.primary.main, 0.2)
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 36 }}>assignment_ind</span>
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={900} letterSpacing="-0.03em" sx={{ mb: 0.5 }}>
                Assign Asset
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  {assignDialogOpen?.name}
                </Typography>
                <Box sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: "text.disabled" }} />
                <Typography variant="caption" sx={{ 
                  color: "primary.main", 
                  fontWeight: 700, 
                  textTransform: "uppercase",
                  letterSpacing: "0.05em"
                }}>
                  {assignDialogOpen?.type}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        <DialogContent sx={{ p: 4 }}>
          <Typography variant="caption" sx={{ 
            color: "text.disabled", 
            fontWeight: 800, 
            textTransform: "uppercase", 
            letterSpacing: "0.1em",
            mb: 2.5, 
            display: "block" 
          }}>
            Recipient Type
          </Typography>
          
          <Grid container spacing={2.5} sx={{ mb: 5 }}>
            {[
              { id: "EMPLOYEE", label: "Employee", icon: "badge", desc: "Permanent staff" },
              { id: "ORG_USER", label: "Admin User", icon: "admin_panel_settings", desc: "Organization admins" }
            ].map((type) => (
              <Grid size={{ xs: 6 }} key={type.id}>
                <Paper
                  onClick={() => { setAssigneeType(type.id as any); setSelectedAssignee(null); }}
                  variant="outlined"
                  sx={{
                    p: 3,
                    cursor: "pointer",
                    borderRadius: 4,
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 1.5,
                    bgcolor: assigneeType === type.id ? alpha(theme.palette.primary.main, 0.08) : "background.default",
                    borderColor: assigneeType === type.id ? "primary.main" : "divider",
                    borderWidth: assigneeType === type.id ? 2 : 1,
                    position: "relative",
                    overflow: "hidden",
                    "&::after": assigneeType === type.id ? {
                      content: '""',
                      position: "absolute",
                      top: 10,
                      right: 10,
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                      boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.2)}`
                    } : {},
                    "&:hover": {
                      borderColor: "primary.main",
                      transform: "translateY(-4px)",
                      boxShadow: "0 12px 24px -8px rgba(0,0,0,0.2)"
                    }
                  }}
                >
                  <Box sx={{ 
                    width: 48, 
                    height: 48, 
                    borderRadius: "14px",
                    bgcolor: assigneeType === type.id ? "primary.main" : alpha(theme.palette.text.primary, 0.04),
                    color: assigneeType === type.id ? "white" : "text.secondary",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.3s"
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 28 }}>{type.icon}</span>
                  </Box>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography fontWeight={800} variant="body2">{type.label}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.6 }}>{type.desc}</Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ 
            p: 1, 
            borderRadius: 4, 
            bgcolor: alpha(theme.palette.text.primary, 0.03),
            border: "1px solid",
            borderColor: "divider"
          }}>
            {assigneeType === "EMPLOYEE" ? (
              <Autocomplete
                options={employees}
                getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                value={selectedAssignee as Employee | null}
                onChange={(_, value) => setSelectedAssignee(value)}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    variant="standard"
                    placeholder="Search by name or email..."
                    label="Recipient"
                    fullWidth 
                    InputProps={{
                      ...params.InputProps,
                      disableUnderline: true,
                      sx: { 
                        px: 2, 
                        py: 1,
                        fontSize: "0.95rem",
                        fontWeight: 500
                      }
                    }}
                    InputLabelProps={{
                      shrink: true,
                      sx: { px: 2, pt: 1, fontWeight: 700, color: "text.secondary" }
                    }}
                  />
                )}
                renderOption={(props, option) => {
                   const { key, ...restProps } = props as any;
                   return (
                    <li key={option.id} {...restProps} style={{ padding: "8px 16px" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2, py: 0.5, width: "100%" }}>
                        <Avatar sx={{ 
                          width: 40, 
                          height: 40, 
                          bgcolor: alpha(theme.palette.primary.main, 0.15), 
                          color: "primary.main",
                          fontSize: 14, 
                          fontWeight: 800,
                          borderRadius: "12px"
                        }}>
                          {option.firstName[0]}{option.lastName[0]}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={800}>
                            {option.firstName} {option.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            {option.email}
                          </Typography>
                        </Box>
                      </Box>
                    </li>
                  );
                }}
                noOptionsText="No employees found"
              />
            ) : (
              <Autocomplete
                options={orgUsers}
                getOptionLabel={(option) => option.name || option.email}
                value={selectedAssignee as OrgUser | null}
                onChange={(_, value) => setSelectedAssignee(value)}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    variant="standard"
                    placeholder="Search by name or email..."
                    label="Recipient"
                    fullWidth 
                    InputProps={{
                      ...params.InputProps,
                      disableUnderline: true,
                      sx: { 
                        px: 2, 
                        py: 1,
                        fontSize: "0.95rem",
                        fontWeight: 500
                      }
                    }}
                    InputLabelProps={{
                      shrink: true,
                      sx: { px: 2, pt: 1, fontWeight: 700, color: "text.secondary" }
                    }}
                  />
                )}
                renderOption={(props, option) => {
                  const { key, ...restProps } = props as any;
                  return (
                    <li key={option.id} {...restProps} style={{ padding: "8px 16px" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2, py: 0.5, width: "100%" }}>
                        <Avatar sx={{ 
                          width: 40, 
                          height: 40, 
                          bgcolor: alpha(theme.palette.secondary.main, 0.15), 
                          color: "secondary.main",
                          fontSize: 14, 
                          fontWeight: 800,
                          borderRadius: "12px"
                        }}>
                          {(option.name || option.email)[0].toUpperCase()}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={800}>
                            {option.name || "Unnamed User"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            {option.email}
                          </Typography>
                        </Box>
                      </Box>
                    </li>
                  );
                }}
                noOptionsText="No organization users found"
              />
            )}
          </Box>

          <Box sx={{ 
            mt: 4, 
            p: 2.5, 
            borderRadius: 4, 
            bgcolor: alpha(theme.palette.info.main, 0.05),
            border: "1px dashed",
            borderColor: alpha(theme.palette.info.main, 0.3),
            display: "flex",
            gap: 2,
            alignItems: "flex-start"
          }}>
            <span className="material-symbols-outlined" style={{ color: theme.palette.info.main, fontSize: 20, marginTop: 2 }}>info</span>
            <Typography variant="body2" color="info.main" fontWeight={600} sx={{ lineHeight: 1.5 }}>
              The recipient will receive an automated notification with asset details and tracking link once assigned.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 4, pt: 0, gap: 2 }}>
          <Button 
            fullWidth
            onClick={() => { setAssignDialogOpen(null); setSelectedAssignee(null); }}
            sx={{ 
              borderRadius: 3, 
              px: 3, 
              py: 1.8, 
              fontWeight: 800, 
              color: "text.secondary",
              "&:hover": { bgcolor: "action.hover" }
            }}
          >
            Discard
          </Button>
          <Button
            fullWidth
            variant="contained"
            onClick={handleAssign}
            disabled={loading || !selectedAssignee}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <span className="material-symbols-outlined" style={{ fontWeight: 800 }}>check_circle</span>}
            sx={{ 
              borderRadius: "16px", 
              px: 4, 
              py: 1.8, 
              fontWeight: 900,
              fontSize: "0.95rem",
              textTransform: "none",
              boxShadow: `0 12px 32px -8px ${alpha(theme.palette.primary.main, 0.5)}`,
              transition: "all 0.3s",
              "&:hover": {
                boxShadow: `0 16px 40px -10px ${alpha(theme.palette.primary.main, 0.6)}`,
                transform: "translateY(-2px)"
              },
              "&.Mui-disabled": {
                bgcolor: alpha(theme.palette.primary.main, 0.3),
                color: "rgba(255,255,255,0.5)"
              }
            }}
          >
            {loading ? "Processing..." : "Confirm Assignment"}
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
