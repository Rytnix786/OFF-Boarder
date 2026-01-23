"use client";

import React, { useState, useMemo } from "react";
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
  TablePagination,
  TableSortLabel,
  Tooltip,
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
  offboardings?: { id: string; status: string }[];
  _count?: { employeePortalInvites: number; employeeUserLinks: number };
};

interface EmployeesClientProps {
  employees: Employee[];
  departments: { id: string; name: string }[];
  jobTitles: { id: string; title: string }[];
  locations: { id: string; name: string }[];
  orgMembers: OrgMember[];
  canCreate: boolean;
  isOrgView?: boolean;
}

type SortField = "name" | "department" | "jobTitle" | "status" | "hireDate";
type SortDirection = "asc" | "desc";

export default function EmployeesClient({
  employees,
  departments,
  jobTitles,
  locations,
  orgMembers,
  canCreate,
  isOrgView,
}: EmployeesClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [jobTitleFilter, setJobTitleFilter] = useState("all");
  const [hasOffboardingFilter, setHasOffboardingFilter] = useState<"all" | "yes" | "no">("all");
  const [portalInvitedFilter, setPortalInvitedFilter] = useState<"all" | "yes" | "no">("all");
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
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const filteredAndSortedEmployees = useMemo(() => {
    let result = employees.filter((emp) => {
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

      const matchesDepartment = departmentFilter === "all" || emp.department?.id === departmentFilter;
      const matchesLocation = locationFilter === "all" || emp.location?.id === locationFilter;
      const matchesJobTitle = jobTitleFilter === "all" || emp.jobTitle?.id === jobTitleFilter;
      
      let matchesOffboarding = true;
      if (hasOffboardingFilter === "yes") {
        matchesOffboarding = (emp.offboardings?.length ?? 0) > 0;
      } else if (hasOffboardingFilter === "no") {
        matchesOffboarding = (emp.offboardings?.length ?? 0) === 0;
      }

      let matchesPortalInvited = true;
      if (portalInvitedFilter === "yes") {
        matchesPortalInvited = (emp._count?.employeePortalInvites ?? 0) > 0 || (emp._count?.employeeUserLinks ?? 0) > 0;
      } else if (portalInvitedFilter === "no") {
        matchesPortalInvited = (emp._count?.employeePortalInvites ?? 0) === 0 && (emp._count?.employeeUserLinks ?? 0) === 0;
      }
      
      return matchesSearch && matchesStatus && matchesDepartment && matchesLocation && matchesJobTitle && matchesOffboarding && matchesPortalInvited;
    });

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
          break;
        case "department":
          comparison = (a.department?.name || "").localeCompare(b.department?.name || "");
          break;
        case "jobTitle":
          comparison = (a.jobTitle?.title || "").localeCompare(b.jobTitle?.title || "");
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        case "hireDate":
          const dateA = a.hireDate ? new Date(a.hireDate).getTime() : 0;
          const dateB = b.hireDate ? new Date(b.hireDate).getTime() : 0;
          comparison = dateA - dateB;
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [employees, search, statusFilter, departmentFilter, locationFilter, jobTitleFilter, hasOffboardingFilter, portalInvitedFilter, showArchived, sortField, sortDirection]);

  const paginatedEmployees = useMemo(() => {
    return filteredAndSortedEmployees.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredAndSortedEmployees, page, rowsPerPage]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setDepartmentFilter("all");
    setLocationFilter("all");
    setJobTitleFilter("all");
    setHasOffboardingFilter("all");
    setPortalInvitedFilter("all");
    setShowArchived(false);
    setPage(0);
  };

  const activeFilterCount = [
    statusFilter !== "all" ? 1 : 0,
    departmentFilter !== "all" ? 1 : 0,
    locationFilter !== "all" ? 1 : 0,
    jobTitleFilter !== "all" ? 1 : 0,
    hasOffboardingFilter !== "all" ? 1 : 0,
    portalInvitedFilter !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

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
            {filteredAndSortedEmployees.length} of {employees.length} employees {showArchived || statusFilter === "ARCHIVED" ? "(including archived)" : ""}
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
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            sx={{ width: 280 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>search</span>
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
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
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select
              value={departmentFilter}
              onChange={(e) => { setDepartmentFilter(e.target.value); setPage(0); }}
              displayEmpty
            >
              <MenuItem value="all">All Departments</MenuItem>
              {departments.map((d) => (
                <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select
              value={locationFilter}
              onChange={(e) => { setLocationFilter(e.target.value); setPage(0); }}
              displayEmpty
            >
              <MenuItem value="all">All Locations</MenuItem>
              {locations.map((l) => (
                <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select
              value={jobTitleFilter}
              onChange={(e) => { setJobTitleFilter(e.target.value); setPage(0); }}
              displayEmpty
            >
              <MenuItem value="all">All Job Titles</MenuItem>
              {jobTitles.map((j) => (
                <MenuItem key={j.id} value={j.id}>{j.title}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select
              value={hasOffboardingFilter}
              onChange={(e) => { setHasOffboardingFilter(e.target.value as "all" | "yes" | "no"); setPage(0); }}
              displayEmpty
            >
              <MenuItem value="all">All Offboarding</MenuItem>
              <MenuItem value="yes">Has Offboarding</MenuItem>
              <MenuItem value="no">No Offboarding</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select
              value={portalInvitedFilter}
              onChange={(e) => { setPortalInvitedFilter(e.target.value as "all" | "yes" | "no"); setPage(0); }}
              displayEmpty
            >
              <MenuItem value="all">All Portal Status</MenuItem>
              <MenuItem value="yes">Portal Invited</MenuItem>
              <MenuItem value="no">Not Invited</MenuItem>
            </Select>
          </FormControl>
          {statusFilter === "all" && (
            <FormControlLabel
              control={<Checkbox checked={showArchived} onChange={(e) => { setShowArchived(e.target.checked); setPage(0); }} size="small" />}
              label={<Typography variant="body2">Show archived</Typography>}
            />
          )}
          {activeFilterCount > 0 && (
            <Tooltip title="Clear all filters">
              <Button size="small" onClick={clearFilters} startIcon={<span className="material-symbols-outlined" style={{ fontSize: 16 }}>filter_alt_off</span>}>
                Clear ({activeFilterCount})
              </Button>
            </Tooltip>
          )}
        </Box>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: 700, color: "text.secondary", fontSize: 12, textTransform: "uppercase" } }}>
                <TableCell>
                  <TableSortLabel
                    active={sortField === "name"}
                    direction={sortField === "name" ? sortDirection : "asc"}
                    onClick={() => handleSort("name")}
                  >
                    Employee
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortField === "department"}
                    direction={sortField === "department" ? sortDirection : "asc"}
                    onClick={() => handleSort("department")}
                  >
                    Department
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortField === "jobTitle"}
                    direction={sortField === "jobTitle" ? sortDirection : "asc"}
                    onClick={() => handleSort("jobTitle")}
                  >
                    Job Title
                  </TableSortLabel>
                </TableCell>
                <TableCell>Manager</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortField === "status"}
                    direction={sortField === "status" ? sortDirection : "asc"}
                    onClick={() => handleSort("status")}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedEmployees.length === 0 ? (
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
                  paginatedEmployees.map((emp) => (
                    <TableRow 
                      key={emp.id} 
                      hover 
                      sx={{ 
                        opacity: emp.status === "ARCHIVED" ? 0.6 : 1, 
                        cursor: isOrgView ? "default" : "pointer" 
                      }} 
                      onClick={() => !isOrgView && router.push(`/app/employees/${emp.id}`)}
                    >

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
                        onClick={(e) => { e.stopPropagation(); setMenuAnchor({ el: e.currentTarget, employee: emp }); }}
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
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={filteredAndSortedEmployees.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Card>

      <Menu
        anchorEl={menuAnchor?.el}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem 
          onClick={() => !isOrgView && router.push(`/app/employees/${menuAnchor?.employee.id}`)}
          disabled={isOrgView}
        >
          <span className="material-symbols-outlined" style={{ marginRight: 8 }}>visibility</span>
          View Details
        </MenuItem>
          {menuAnchor?.employee.status === "ACTIVE" && !isOrgView && (
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
