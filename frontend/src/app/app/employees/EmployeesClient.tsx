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
  IconButton,
  Button,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Avatar,
  Grid,
  Alert,
  Snackbar,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { createEmployee, deleteEmployee, archiveEmployee, unarchiveEmployee } from "@/lib/actions/employees";
import { useRouter } from "next/navigation";

type OrgMember = {
  id: string;
  systemRole: string;
  user: { id: string; name: string | null; email: string };
};

type Employee = {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: "ACTIVE" | "ON_LEAVE" | "TERMINATED" | "OFFBOARDING" | "ARCHIVED";
  hireDate: Date | null;
  department: { id: string; name: string } | null;
  jobTitle: { id: string; title: string } | null;
  location: { id: string; name: string } | null;
  managerMembership: OrgMember | null;
};

interface EmployeesClientProps {
  employees: Employee[];
  departments: { id: string; name: string }[];
  jobTitles: { id: string; title: string }[];
  locations: { id: string; name: string }[];
  orgMembers: OrgMember[];
  canCreate: boolean;
}

export default function EmployeesClient({
  employees,
  departments,
  jobTitles,
  locations,
  orgMembers,
  canCreate,
}: EmployeesClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; employee: Employee } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" | "warning" | "info" } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; employee: Employee | null; canArchive?: boolean; hasHistory?: boolean }>({ open: false, employee: null });
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [selectedJobTitleId, setSelectedJobTitleId] = useState<string>("");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [selectedManagerMembershipId, setSelectedManagerMembershipId] = useState<string>("");
  const [inviteToPortal, setInviteToPortal] = useState(true);
  const [inviteSuccessDialog, setInviteSuccessDialog] = useState<{ open: boolean; employeeName: string; inviteUrl: string } | null>(null);

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.firstName.toLowerCase().includes(search.toLowerCase()) ||
      emp.lastName.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(search.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter !== "all") {
      matchesStatus = emp.status === statusFilter;
    } else if (!showArchived) {
      matchesStatus = emp.status !== "ARCHIVED";
    }

    let matchesDepartment = true;
    if (departmentFilter !== "all") {
      matchesDepartment = emp.department?.id === departmentFilter;
    }
    
    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("inviteToPortal", inviteToPortal.toString());
    const result = await createEmployee(formData);

    if (result.error) {
        setError(result.error);
      } else {
        setCreateDialogOpen(false);
        setSelectedDepartmentId("");
        setSelectedJobTitleId("");
        setSelectedLocationId("");
        setSelectedManagerMembershipId("");
        
        if (result.invite) {
          const fullUrl = `${window.location.origin}${result.invite.url}`;
          setInviteSuccessDialog({
            open: true,
            employeeName: `${result.employee.firstName} ${result.employee.lastName}`,
            inviteUrl: fullUrl,
          });
        } else {
          setSnackbar({ open: true, message: "Employee created successfully", severity: "success" });
        }
        setInviteToPortal(true);
        router.refresh();
      }
    setLoading(false);
  };

  const handleDeleteClick = async (employee: Employee) => {
    setMenuAnchor(null);
    setLoading(true);
    const result = await deleteEmployee(employee.id);
    setLoading(false);
    
    if (result.error) {
      if ((result as { canArchive?: boolean }).canArchive) {
        setDeleteDialog({ 
          open: true, 
          employee, 
          canArchive: true, 
          hasHistory: (result as { hasHistory?: boolean }).hasHistory 
        });
      } else {
        setSnackbar({ open: true, message: result.error, severity: "error" });
      }
    } else {
      setSnackbar({ open: true, message: "Employee deleted successfully", severity: "success" });
      router.refresh();
    }
  };

  const handleArchive = async (employee: Employee) => {
    setMenuAnchor(null);
    setDeleteDialog({ open: false, employee: null });
    setLoading(true);
    const result = await archiveEmployee(employee.id);
    setLoading(false);
    
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Employee archived successfully", severity: "success" });
      router.refresh();
    }
  };

  const handleUnarchive = async (employee: Employee) => {
    setMenuAnchor(null);
    setLoading(true);
    const result = await unarchiveEmployee(employee.id);
    setLoading(false);
    
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Employee restored from archive", severity: "success" });
      router.refresh();
    }
  };

  const handleForceDelete = async () => {
    if (!deleteDialog.employee) return;
    setLoading(true);
    const result = await deleteEmployee(deleteDialog.employee.id, true);
    setLoading(false);
    setDeleteDialog({ open: false, employee: null });
    
    if (result.error) {
      setSnackbar({ open: true, message: result.error, severity: "error" });
    } else {
      setSnackbar({ open: true, message: "Employee permanently deleted", severity: "success" });
      router.refresh();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "success";
      case "ON_LEAVE": return "info";
      case "OFFBOARDING": return "warning";
      case "TERMINATED": return "error";
      case "ARCHIVED": return "default";
      default: return "default";
    }
  };

  const getManagerDisplayName = (manager: OrgMember | null) => {
    if (!manager) return "—";
    return manager.user.name || manager.user.email;
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Employees</Typography>
          <Typography color="text.secondary">
            {filteredEmployees.length} employees {showArchived || statusFilter === "ARCHIVED" ? "(including archived)" : ""}
          </Typography>
        </Box>
        {canCreate && (
          <Button
            variant="contained"
            startIcon={<span className="material-symbols-outlined">person_add</span>}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            Add Employee
          </Button>
        )}
      </Box>

      <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
        <Box sx={{ p: 2, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
          <TextField
            placeholder="Search by name, email, or ID..."
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>search</span>
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              displayEmpty
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="ACTIVE">Active</MenuItem>
              <MenuItem value="ON_LEAVE">On Leave</MenuItem>
              <MenuItem value="OFFBOARDING">Offboarding</MenuItem>
              <MenuItem value="TERMINATED">Terminated</MenuItem>
              <MenuItem value="ARCHIVED">Archived</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              displayEmpty
            >
              <MenuItem value="all">All Departments</MenuItem>
              {departments.map((d) => (
                <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {statusFilter === "all" && (
            <FormControlLabel
              control={<Checkbox checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} size="small" />}
              label={<Typography variant="body2">Show archived</Typography>}
            />
          )}
        </Box>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: 700, color: "text.secondary", fontSize: 12, textTransform: "uppercase" } }}>
                <TableCell>Employee</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Job Title</TableCell>
                <TableCell>Manager</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 8, textAlign: "center" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.3 }}>
                      people
                    </span>
                    <Typography color="text.secondary" sx={{ mt: 1 }}>
                      {employees.length === 0 ? "No employees yet" : "No matching employees"}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((emp) => (
                  <TableRow key={emp.id} hover sx={{ opacity: emp.status === "ARCHIVED" ? 0.6 : 1 }}>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Avatar sx={{ bgcolor: emp.status === "ARCHIVED" ? "grey.400" : "primary.main" }}>
                          {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography fontWeight={600}>
                            {emp.firstName} {emp.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {emp.email} • {emp.employeeId}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{emp.department?.name || "—"}</TableCell>
                    <TableCell>{emp.jobTitle?.title || "—"}</TableCell>
                    <TableCell>{getManagerDisplayName(emp.managerMembership)}</TableCell>
                    <TableCell>
                      <Chip
                        label={emp.status.replace("_", " ")}
                        size="small"
                        color={getStatusColor(emp.status) as "success" | "info" | "warning" | "error" | "default"}
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => setMenuAnchor({ el: e.currentTarget, employee: emp })}
                      >
                        <span className="material-symbols-outlined">more_vert</span>
                      </IconButton>
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
        <MenuItem onClick={() => router.push(`/app/employees/${menuAnchor?.employee.id}`)}>
          <span className="material-symbols-outlined" style={{ marginRight: 8 }}>visibility</span>
          View Details
        </MenuItem>
          {menuAnchor?.employee.status === "ACTIVE" && (
            <MenuItem onClick={() => { setMenuAnchor(null); router.push(`/app/offboardings?startOffboarding=${menuAnchor?.employee.id}`); }}>
              <span className="material-symbols-outlined" style={{ marginRight: 8 }}>person_remove</span>
              Start Offboarding
            </MenuItem>
          )}
        {menuAnchor?.employee.status === "ARCHIVED" && canCreate && (
          <MenuItem onClick={() => handleUnarchive(menuAnchor.employee)} disabled={loading}>
            <span className="material-symbols-outlined" style={{ marginRight: 8, color: "#22c55e" }}>unarchive</span>
            Restore from Archive
          </MenuItem>
        )}
        {menuAnchor?.employee.status !== "ARCHIVED" && canCreate && (
          <MenuItem onClick={() => handleArchive(menuAnchor!.employee)} disabled={loading}>
            <span className="material-symbols-outlined" style={{ marginRight: 8, color: "#f59e0b" }}>archive</span>
            Archive
          </MenuItem>
        )}
        {canCreate && (
          <MenuItem onClick={() => handleDeleteClick(menuAnchor?.employee!)} disabled={loading}>
            <span className="material-symbols-outlined" style={{ marginRight: 8, color: "#ef4444" }}>delete</span>
            Delete
          </MenuItem>
        )}
      </Menu>

      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, employee: null })}>
        <DialogTitle fontWeight={700}>
          {deleteDialog.hasHistory ? "Cannot Delete Directly" : "Delete Employee?"}
        </DialogTitle>
        <DialogContent>
          {deleteDialog.hasHistory ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              This employee has offboarding history. To preserve audit records, we recommend archiving instead.
            </Alert>
          ) : (
            <Alert severity="error" sx={{ mb: 2 }}>
              This employee has an active offboarding in progress.
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary">
            {deleteDialog.hasHistory 
              ? "Archiving hides the employee from default views while keeping all historical data intact for compliance."
              : "Please complete or cancel the active offboarding before deleting this employee."
            }
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDeleteDialog({ open: false, employee: null })}>Cancel</Button>
          {deleteDialog.canArchive && (
            <Button variant="contained" color="warning" onClick={() => handleArchive(deleteDialog.employee!)}>
              Archive Instead
            </Button>
          )}
          {deleteDialog.hasHistory && (
            <Button variant="outlined" color="error" onClick={handleForceDelete} disabled={loading}>
              Delete Anyway
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <form onSubmit={handleCreate}>
          <DialogTitle fontWeight={700}>Add New Employee</DialogTitle>
          <DialogContent>
            {error && (
              <Box sx={{ mb: 2, p: 2, bgcolor: "error.50", borderRadius: 2 }}>
                <Typography color="error.main" variant="body2">{error}</Typography>
              </Box>
            )}
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Employee ID" name="employeeId" required />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Email" name="email" type="email" required />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="First Name" name="firstName" required />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Last Name" name="lastName" required />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Phone" name="phone" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Hire Date" name="hireDate" type="date" InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Department</InputLabel>
                    <Select 
                      name="departmentId" 
                      label="Department"
                      value={selectedDepartmentId}
                      onChange={(e) => setSelectedDepartmentId(e.target.value)}
                    >
                      <MenuItem value="">None</MenuItem>
                      {departments.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Job Title</InputLabel>
                    <Select 
                      name="jobTitleId" 
                      label="Job Title"
                      value={selectedJobTitleId}
                      onChange={(e) => setSelectedJobTitleId(e.target.value)}
                    >
                      <MenuItem value="">None</MenuItem>
                      {jobTitles.map((j) => <MenuItem key={j.id} value={j.id}>{j.title}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Location</InputLabel>
                    <Select 
                      name="locationId" 
                      label="Location"
                      value={selectedLocationId}
                      onChange={(e) => setSelectedLocationId(e.target.value)}
                    >
                      <MenuItem value="">None</MenuItem>
                      {locations.map((l) => <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Manager (Org User)</InputLabel>
                    <Select 
                      name="managerMembershipId" 
                      label="Manager (Org User)"
                      value={selectedManagerMembershipId}
                      onChange={(e) => setSelectedManagerMembershipId(e.target.value)}
                    >
                      <MenuItem value="">None</MenuItem>
                      {orgMembers.map((m) => (
                        <MenuItem key={m.id} value={m.id}>
                          {m.user.name || m.user.email} ({m.systemRole})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ mt: 1, p: 2, bgcolor: "action.hover", borderRadius: 2 }}>
                    <FormControlLabel
                      control={
                        <Checkbox 
                          checked={inviteToPortal} 
                          onChange={(e) => setInviteToPortal(e.target.checked)} 
                        />
                      }
                      label={
                        <Box>
                          <Typography fontWeight={600}>Invite to Employee Portal</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Send portal invite so employee can complete offboarding tasks
                          </Typography>
                        </Box>
                      }
                    />
                  </Box>
                </Grid>
              </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => { setCreateDialogOpen(false); setSelectedDepartmentId(""); setSelectedJobTitleId(""); setSelectedLocationId(""); setSelectedManagerMembershipId(""); setInviteToPortal(true); setError(null); }}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? "Creating..." : inviteToPortal ? "Create & Invite" : "Create Employee"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={!!inviteSuccessDialog?.open} onClose={() => setInviteSuccessDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <span className="material-symbols-outlined" style={{ color: "#22c55e" }}>check_circle</span>
            Employee Added & Invited
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            <strong>{inviteSuccessDialog?.employeeName}</strong> has been added and invited to the Employee Portal.
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Share this invite link with the employee to complete their portal registration:
          </Typography>
          <TextField
            fullWidth
            value={inviteSuccessDialog?.inviteUrl || ""}
            InputProps={{
              readOnly: true,
              endAdornment: (
                <Button
                  size="small"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteSuccessDialog?.inviteUrl || "");
                    setSnackbar({ open: true, message: "Invite link copied!", severity: "success" });
                  }}
                  startIcon={<span className="material-symbols-outlined" style={{ fontSize: 18 }}>content_copy</span>}
                >
                  Copy
                </Button>
              ),
            }}
            sx={{ "& .MuiInputBase-input": { fontSize: 13 } }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            This link expires in 7 days.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="contained" onClick={() => setInviteSuccessDialog(null)}>
            Done
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar?.open || false}
        autoHideDuration={5000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar?.severity || "info"} onClose={() => setSnackbar(null)}>
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
