"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Avatar,
  Chip,
  Divider,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateEmployee } from "@/lib/actions/employees";
import { inviteEmployeeToPortal } from "@/lib/actions/employee-invite";

type Employee = {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  hireDate: Date | null;
  department: { id: string; name: string } | null;
  jobTitle: { id: string; title: string } | null;
  location: { id: string; name: string } | null;
  manager: { id: string; firstName: string; lastName: string; email: string } | null;
  directReports: { id: string; firstName: string; lastName: string; email: string }[];
  offboardings: { id: string; status: string; scheduledDate: Date | null; createdAt: Date }[];
  assets?: { id: string; name: string; type: string; serialNumber: string | null; assetTag: string | null; status: string }[];
};

interface EmployeeDetailClientProps {
  employee: Employee;
  canEdit: boolean;
}

export default function EmployeeDetailClient({ employee, canEdit }: EmployeeDetailClientProps) {
  const router = useRouter();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [portalInviteDialogOpen, setPortalInviteDialogOpen] = useState(false);
  const [portalType, setPortalType] = useState<"SUBJECT_PORTAL" | "CONTRIBUTOR_PORTAL">("SUBJECT_PORTAL");
  const [loading, setLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "success";
      case "ON_LEAVE": return "info";
      case "OFFBOARDING": return "warning";
      case "TERMINATED": return "error";
      default: return "default";
    }
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    await updateEmployee(employee.id, formData);
    setEditDialogOpen(false);
    setLoading(false);
    router.refresh();
  };

  const handlePortalInvite = async () => {
    setInviteLoading(true);
    setInviteError(null);
    try {
      const result = await inviteEmployeeToPortal(employee.id, portalType);
      if (result.success) {
        setInviteSuccess(true);
        setTimeout(() => {
          setPortalInviteDialogOpen(false);
          setInviteSuccess(false);
          router.refresh();
        }, 2000);
      } else {
        setInviteError(result.error || "Failed to send invite");
      }
    } catch (err) {
      setInviteError("An unexpected error occurred");
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
        <Link href="/app/employees" style={{ textDecoration: "none", color: "inherit" }}>
          <IconButton>
            <span className="material-symbols-outlined">arrow_back</span>
          </IconButton>
        </Link>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" fontWeight={800}>
            {employee.firstName} {employee.lastName}
          </Typography>
          <Typography color="text.secondary">
            {employee.employeeId} • {employee.email}
          </Typography>
        </Box>
        {canEdit && (
            <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="outlined"
                  color="info"
                  startIcon={<span className="material-symbols-outlined">door_open</span>}
                  onClick={() => setPortalInviteDialogOpen(true)}
                >
                  Invite to Portal
                </Button>
              <Link href={`/app/employees/${employee.id}/security`} style={{ textDecoration: "none" }}>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<span className="material-symbols-outlined">shield</span>}
                >
                  Security
                </Button>
              </Link>
              <Button
                variant="outlined"
                startIcon={<span className="material-symbols-outlined">edit</span>}
                onClick={() => setEditDialogOpen(true)}
              >
                Edit
              </Button>
            </Box>
          )}
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, textAlign: "center", p: 3 }}>
            <Avatar
              sx={{ width: 100, height: 100, mx: "auto", mb: 2, fontSize: 36, bgcolor: "primary.main" }}
            >
              {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
            </Avatar>
            <Typography variant="h5" fontWeight={700}>
              {employee.firstName} {employee.lastName}
            </Typography>
            <Typography color="text.secondary" gutterBottom>
              {employee.jobTitle?.title || "No title"}
            </Typography>
            <Chip
              label={employee.status.replace("_", " ")}
              color={getStatusColor(employee.status) as any}
              sx={{ mt: 1, fontWeight: 600 }}
            />
          </Card>

          {employee.manager && (
            <Card variant="outlined" sx={{ borderRadius: 3, mt: 3 }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Reports To
                </Typography>
                <Link href={`/app/employees/${employee.manager.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, "&:hover": { bgcolor: "action.hover" }, p: 1, borderRadius: 2 }}>
                    <Avatar sx={{ bgcolor: "secondary.main" }}>
                      {employee.manager.firstName.charAt(0)}{employee.manager.lastName.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography fontWeight={600}>
                        {employee.manager.firstName} {employee.manager.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {employee.manager.email}
                      </Typography>
                    </Box>
                  </Box>
                </Link>
              </CardContent>
            </Card>
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Employee Information
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, width: 200 }}>Employee ID</TableCell>
                    <TableCell>{employee.employeeId}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                    <TableCell>{employee.email}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
                    <TableCell>{employee.phone || "—"}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Department</TableCell>
                    <TableCell>{employee.department?.name || "—"}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Job Title</TableCell>
                    <TableCell>{employee.jobTitle?.title || "—"}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
                    <TableCell>{employee.location?.name || "—"}</TableCell>
                  </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Hire Date</TableCell>
                      <TableCell>
                        {employee.hireDate ? new Date(employee.hireDate).toISOString().split("T")[0] : "—"}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
            </CardContent>
          </Card>

          {employee.directReports.length > 0 && (
            <Card variant="outlined" sx={{ borderRadius: 3, mt: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Direct Reports ({employee.directReports.length})
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {employee.directReports.map((report) => (
                    <Link key={report.id} href={`/app/employees/${report.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2, p: 1.5, borderRadius: 2, "&:hover": { bgcolor: "action.hover" } }}>
                        <Avatar sx={{ width: 36, height: 36, fontSize: 14 }}>
                          {report.firstName.charAt(0)}{report.lastName.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography fontWeight={600}>
                            {report.firstName} {report.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {report.email}
                          </Typography>
                        </Box>
                      </Box>
                    </Link>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}

          {employee.offboardings.length > 0 && (
              <Card variant="outlined" sx={{ borderRadius: 3, mt: 3 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    Offboarding History
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {employee.offboardings.map((ob) => (
                      <Link key={ob.id} href={`/app/offboardings/${ob.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.5, borderRadius: 2, "&:hover": { bgcolor: "action.hover" } }}>
                          <Box>
                            <Chip
                              label={ob.status}
                              size="small"
                              color={ob.status === "COMPLETED" ? "success" : ob.status === "IN_PROGRESS" ? "warning" : "default"}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                              Created {new Date(ob.createdAt).toISOString().split("T")[0]}
                            </Typography>
                          </Box>
                          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>chevron_right</span>
                        </Box>
                      </Link>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            )}

            <Card variant="outlined" sx={{ borderRadius: 3, mt: 3 }}>
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Typography variant="h6" fontWeight={700}>
                    Assigned Assets ({employee.assets?.length || 0})
                  </Typography>
                  <Link href="/app/assets" style={{ textDecoration: "none" }}>
                    <Button size="small">View All Assets</Button>
                  </Link>
                </Box>
                <Divider sx={{ my: 2 }} />
                {!employee.assets || employee.assets.length === 0 ? (
                  <Typography color="text.secondary">No assets assigned to this employee</Typography>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {employee.assets.map((asset) => (
                      <Link key={asset.id} href={`/app/assets/${asset.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.5, borderRadius: 2, "&:hover": { bgcolor: "action.hover" } }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <Avatar sx={{ width: 36, height: 36, bgcolor: "primary.light" }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                                {asset.type === "LAPTOP" ? "laptop" : 
                                 asset.type === "PHONE" ? "smartphone" : 
                                 asset.type === "ACCESS_CARD" ? "badge" : 
                                 asset.type === "KEYS" ? "key" : "devices"}
                              </span>
                            </Avatar>
                            <Box>
                              <Typography fontWeight={600}>{asset.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {asset.type} • {asset.serialNumber || asset.assetTag || "No ID"}
                              </Typography>
                            </Box>
                          </Box>
                          <Chip
                            label={asset.status.replace("_", " ")}
                            size="small"
                            color={asset.status === "ASSIGNED" ? "success" : asset.status === "PENDING_RETURN" ? "warning" : "default"}
                          />
                        </Box>
                      </Link>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>

          {employee.status === "ACTIVE" && (
            <Box sx={{ mt: 3 }}>
              <Link href={`/app/offboardings?employeeId=${employee.id}`} style={{ textDecoration: "none" }}>
                <Button
                  variant="contained"
                  color="warning"
                  startIcon={<span className="material-symbols-outlined">person_remove</span>}
                >
                  Start Offboarding
                </Button>
              </Link>
            </Box>
          )}
        </Grid>
      </Grid>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleEdit}>
          <DialogTitle fontWeight={700}>Edit Employee</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="firstName"
                  defaultValue={employee.firstName}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Last Name"
                  name="lastName"
                  defaultValue={employee.lastName}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  defaultValue={employee.email}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Phone"
                  name="phone"
                  defaultValue={employee.phone || ""}
                />
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

      <Dialog 
        open={portalInviteDialogOpen} 
        onClose={() => !inviteLoading && setPortalInviteDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle fontWeight={700}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <span className="material-symbols-outlined">door_open</span>
            Invite to Portal
          </Box>
        </DialogTitle>
        <DialogContent>
          {inviteSuccess ? (
            <Alert severity="success" sx={{ mt: 2 }}>
              Portal invitation sent successfully to {employee.email}!
            </Alert>
          ) : (
            <>
              <Typography color="text.secondary" sx={{ mb: 3, mt: 1 }}>
                Send a portal invitation to <strong>{employee.firstName} {employee.lastName}</strong> ({employee.email}).
                They will receive an email with instructions to access their portal.
              </Typography>

              {inviteError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {inviteError}
                </Alert>
              )}

              <FormControl fullWidth>
                <InputLabel>Portal Type</InputLabel>
                <Select
                  value={portalType}
                  label="Portal Type"
                  onChange={(e) => setPortalType(e.target.value as "SUBJECT_PORTAL" | "CONTRIBUTOR_PORTAL")}
                >
                  <MenuItem value="SUBJECT_PORTAL">
                    <Box>
                      <Typography fontWeight={600}>Subject Portal</Typography>
                      <Typography variant="caption" color="text.secondary">
                        For employees being offboarded - view their own tasks and obligations
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="CONTRIBUTOR_PORTAL">
                    <Box>
                      <Typography fontWeight={600}>Contributor Portal</Typography>
                      <Typography variant="caption" color="text.secondary">
                        For task executors - complete assigned tasks across cases
                      </Typography>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  {portalType === "SUBJECT_PORTAL" 
                    ? "Subject Portal users can only see their own offboarding tasks marked as 'Employee Required'. They cannot view other cases or org data."
                    : "Contributor Portal users can only see and complete tasks specifically assigned to them. They have no access to org settings or unassigned cases."}
                </Typography>
              </Alert>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPortalInviteDialogOpen(false)} disabled={inviteLoading}>
            {inviteSuccess ? "Close" : "Cancel"}
          </Button>
          {!inviteSuccess && (
            <Button 
              variant="contained" 
              onClick={handlePortalInvite} 
              disabled={inviteLoading}
              startIcon={inviteLoading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <span className="material-symbols-outlined">send</span>}
            >
              {inviteLoading ? "Sending..." : "Send Invitation"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
