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
import { inviteEmployeeToPortal, revokeEmployeePortalAccess } from "@/lib/actions/employee-invite";

type OrgMember = {
  id: string;
  systemRole: string;
  user: { id: string; name: string | null; email: string };
};

type PortalInvite = {
  id: string;
  status: string;
  portalType: string;
  email: string;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
  invitedBy: { name: string | null; email: string } | null;
  acceptedBy: { name: string | null; email: string } | null;
};

type UserLink = {
  id: string;
  status: string;
  portalType: string;
  verifiedAt: Date | null;
  revokedAt: Date | null;
  revokedReason: string | null;
  user: { id: string; name: string | null; email: string };
  linkedBy: { name: string | null; email: string } | null;
};

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
  managerMembership: OrgMember | null;
  offboardings: { id: string; status: string; scheduledDate: Date | null; createdAt: Date }[];
  assets?: { id: string; name: string; type: string; serialNumber: string | null; assetTag: string | null; status: string }[];
};

interface EmployeeDetailClientProps {
  employee: Employee;
  canEdit: boolean;
  departments: { id: string; name: string }[];
  jobTitles: { id: string; title: string }[];
  locations: { id: string; name: string }[];
  orgMembers: OrgMember[];
  portalInvites: PortalInvite[];
  userLinks: UserLink[];
}

export default function EmployeeDetailClient({ 
  employee, 
  canEdit,
  departments,
  jobTitles,
  locations,
  orgMembers,
  portalInvites,
  userLinks,
}: EmployeeDetailClientProps) {
  const router = useRouter();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [portalInviteDialogOpen, setPortalInviteDialogOpen] = useState(false);
  const [portalType, setPortalType] = useState<"SUBJECT_PORTAL" | "CONTRIBUTOR_PORTAL">("SUBJECT_PORTAL");
  const [loading, setLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(employee.department?.id || "");
  const [selectedJobTitleId, setSelectedJobTitleId] = useState(employee.jobTitle?.id || "");
  const [selectedLocationId, setSelectedLocationId] = useState(employee.location?.id || "");
  const [selectedManagerId, setSelectedManagerId] = useState(employee.managerMembership?.id || "");
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

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
    setEditError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("departmentId", selectedDepartmentId);
    formData.set("jobTitleId", selectedJobTitleId);
    formData.set("locationId", selectedLocationId);
    formData.set("managerMembershipId", selectedManagerId);
    const result = await updateEmployee(employee.id, formData);
    if (result.error) {
      setEditError(result.error);
    } else {
      setEditDialogOpen(false);
      router.refresh();
    }
    setLoading(false);
  };

  const openEditDialog = () => {
    setSelectedDepartmentId(employee.department?.id || "");
    setSelectedJobTitleId(employee.jobTitle?.id || "");
    setSelectedLocationId(employee.location?.id || "");
    setSelectedManagerId(employee.managerMembership?.id || "");
    setEditError(null);
    setEditDialogOpen(true);
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

  const handleRevokeAccess = async (linkId: string) => {
    if (!confirm("Are you sure you want to revoke this employee's portal access?")) return;
    setRevokeLoading(true);
    const result = await revokeEmployeePortalAccess(linkId);
    if (!result.success) {
      alert(result.error || "Failed to revoke access");
    }
    setRevokeLoading(false);
    router.refresh();
  };

  const handleResendInvite = async () => {
    setResendLoading(true);
    const result = await inviteEmployeeToPortal(employee.id, portalType);
    if (result.success) {
      alert("Invitation resent successfully");
    } else {
      alert(result.error || "Failed to resend invitation");
    }
    setResendLoading(false);
    router.refresh();
  };

  const getPortalStatus = () => {
    const activeLink = userLinks.find(l => l.status === "VERIFIED");
    if (activeLink) return { status: "verified", link: activeLink };
    
    const revokedLink = userLinks.find(l => l.status === "REVOKED");
    if (revokedLink) return { status: "revoked", link: revokedLink };
    
    const pendingInvite = portalInvites.find(i => i.status === "PENDING" && new Date(i.expiresAt) > new Date());
    if (pendingInvite) return { status: "pending", invite: pendingInvite };
    
    const acceptedInvite = portalInvites.find(i => i.status === "ACCEPTED");
    if (acceptedInvite) return { status: "accepted", invite: acceptedInvite };
    
    const expiredInvite = portalInvites.find(i => i.status === "PENDING" && new Date(i.expiresAt) <= new Date());
    if (expiredInvite) return { status: "expired", invite: expiredInvite };
    
    return { status: "not_invited" };
  };

  const portalStatus = getPortalStatus();

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
                onClick={openEditDialog}
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

        {employee.managerMembership && (
          <Card variant="outlined" sx={{ borderRadius: 3, mt: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Reports To
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, p: 1, borderRadius: 2 }}>
                <Avatar sx={{ bgcolor: "secondary.main" }}>
                  {(employee.managerMembership.user.name || employee.managerMembership.user.email).charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography fontWeight={600}>
                    {employee.managerMembership.user.name || employee.managerMembership.user.email}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {employee.managerMembership.user.email} • {employee.managerMembership.systemRole}
                  </Typography>
                </Box>
              </Box>
              </CardContent>
            </Card>
          )}

          <Card variant="outlined" sx={{ borderRadius: 3, mt: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Portal Status
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box sx={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: 2, 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    bgcolor: portalStatus.status === "verified" ? "success.100" : 
                             portalStatus.status === "pending" ? "warning.100" :
                             portalStatus.status === "revoked" ? "error.100" : "grey.100"
                  }}>
                    <span className="material-symbols-outlined" style={{ 
                      fontSize: 24,
                      color: portalStatus.status === "verified" ? "#22c55e" : 
                             portalStatus.status === "pending" ? "#f59e0b" :
                             portalStatus.status === "revoked" ? "#ef4444" : "#9ca3af"
                    }}>
                      {portalStatus.status === "verified" ? "verified_user" : 
                       portalStatus.status === "pending" ? "schedule_send" :
                       portalStatus.status === "revoked" ? "block" :
                       portalStatus.status === "expired" ? "timer_off" : "person_off"}
                    </span>
                  </Box>
                  <Box>
                    <Typography fontWeight={600}>
                      {portalStatus.status === "verified" && "Portal Access Verified"}
                      {portalStatus.status === "pending" && "Invitation Pending"}
                      {portalStatus.status === "accepted" && "Invitation Accepted"}
                      {portalStatus.status === "revoked" && "Access Revoked"}
                      {portalStatus.status === "expired" && "Invitation Expired"}
                      {portalStatus.status === "not_invited" && "Not Invited"}
                    </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {portalStatus.status === "verified" && portalStatus.link && 
                                `Verified ${isMounted ? new Date(portalStatus.link.verifiedAt!).toLocaleDateString("en-US") : "..."}`}
                              {portalStatus.status === "pending" && portalStatus.invite && 
                                `Sent ${isMounted ? new Date(portalStatus.invite.createdAt).toLocaleDateString("en-US") : "..."} • Expires ${isMounted ? new Date(portalStatus.invite.expiresAt).toLocaleDateString("en-US") : "..."}`}
                              {portalStatus.status === "revoked" && portalStatus.link && 
                                `Revoked ${isMounted ? new Date(portalStatus.link.revokedAt!).toLocaleDateString("en-US") : "..."}${portalStatus.link.revokedReason ? ` - ${portalStatus.link.revokedReason}` : ""}`}
                              {portalStatus.status === "expired" && "Invitation has expired"}
                              {portalStatus.status === "not_invited" && "Employee has not been invited to the portal"}
                            </Typography>
                  </Box>
                </Box>
                {canEdit && (
                  <Box sx={{ display: "flex", gap: 1 }}>
                    {portalStatus.status === "verified" && portalStatus.link && (
                      <Button 
                        size="small" 
                        color="error" 
                        variant="outlined"
                        onClick={() => handleRevokeAccess(portalStatus.link!.id)}
                        disabled={revokeLoading}
                        startIcon={<span className="material-symbols-outlined" style={{ fontSize: 16 }}>block</span>}
                      >
                        {revokeLoading ? "Revoking..." : "Revoke Access"}
                      </Button>
                    )}
                    {(portalStatus.status === "pending" || portalStatus.status === "expired") && (
                      <Button 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                        onClick={handleResendInvite}
                        disabled={resendLoading}
                        startIcon={<span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>}
                      >
                        {resendLoading ? "Sending..." : "Resend Invite"}
                      </Button>
                    )}
                    {(portalStatus.status === "not_invited" || portalStatus.status === "revoked") && (
                      <Button 
                        size="small" 
                        color="primary" 
                        variant="contained"
                        onClick={() => setPortalInviteDialogOpen(true)}
                        startIcon={<span className="material-symbols-outlined" style={{ fontSize: 16 }}>send</span>}
                      >
                        Invite to Portal
                      </Button>
                    )}
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
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
                          {employee.hireDate ? (isMounted ? new Date(employee.hireDate).toISOString().split("T")[0] : "...") : "—"}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
              </CardContent>
            </Card>

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
                                Created {isMounted ? new Date(ob.createdAt).toISOString().split("T")[0] : "..."}
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

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <form onSubmit={handleEdit}>
          <DialogTitle fontWeight={700}>Edit Employee</DialogTitle>
          <DialogContent>
            {editError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {editError}
              </Alert>
            )}
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
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  defaultValue={employee.email}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Phone"
                  name="phone"
                  defaultValue={employee.phone || ""}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={selectedDepartmentId}
                    label="Department"
                    onChange={(e) => setSelectedDepartmentId(e.target.value)}
                  >
                    <MenuItem value="">None</MenuItem>
                    {departments.map((d) => (
                      <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Job Title</InputLabel>
                  <Select
                    value={selectedJobTitleId}
                    label="Job Title"
                    onChange={(e) => setSelectedJobTitleId(e.target.value)}
                  >
                    <MenuItem value="">None</MenuItem>
                    {jobTitles.map((j) => (
                      <MenuItem key={j.id} value={j.id}>{j.title}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Location</InputLabel>
                  <Select
                    value={selectedLocationId}
                    label="Location"
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                  >
                    <MenuItem value="">None</MenuItem>
                    {locations.map((l) => (
                      <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Manager</InputLabel>
                  <Select
                    value={selectedManagerId}
                    label="Manager"
                    onChange={(e) => setSelectedManagerId(e.target.value)}
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
