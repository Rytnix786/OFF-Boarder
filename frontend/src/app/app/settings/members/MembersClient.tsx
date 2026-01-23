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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Menu,
  Avatar,
  Tabs,
  Tab,
  Grid,
  Alert,
  Tooltip,
  Divider,
  FormHelperText,
} from "@mui/material";
import {
  inviteMember,
  removeMember,
  updateMemberRole,
  revokeInvitation,
  suspendMember,
  reactivateMember,
} from "@/lib/actions/members";
import { useRouter } from "next/navigation";

type Member = {
  id: string;
  userId: string;
  systemRole: "OWNER" | "ADMIN" | "CONTRIBUTOR" | "AUDITOR";
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "REVOKED";
  createdAt: Date;
  user: { id: string; name: string | null; email: string; avatarUrl: string | null };
  roleAssignments?: { customRole: { id: string; name: string } }[];
};

type Invitation = {
  id: string;
  email: string;
  systemRole: "OWNER" | "ADMIN" | "CONTRIBUTOR" | "AUDITOR";
  customRoleId: string | null;
  customRole?: { id: string; name: string } | null;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  expiresAt: Date;
  createdAt: Date;
  invitedBy: { id: string; name: string | null; email: string };
};

type JoinRequest = {
  id: string;
  requesterEmail: string;
  requestedRole: "CONTRIBUTOR" | "ADMIN";
  status: "REQUESTED_MEMBER" | "REQUESTED_ADMIN" | "APPROVED" | "DENIED" | "EXPIRED";
  createdAt: Date;
  expiresAt: Date;
  requester: { id: string; name: string | null; email: string; avatarUrl: string | null };
};

type CustomRole = {
  id: string;
  name: string;
  description: string | null;
  _count: { assignments: number };
};

interface MembersClientProps {
  members: Member[];
  invitations: Invitation[];
  customRoles: CustomRole[];
  joinRequests: JoinRequest[];
  canManage: boolean;
  isOwner: boolean;
  currentUserId: string;
}

const SYSTEM_ROLE_INFO = {
  ADMIN: {
    label: "Admin",
    description: "Full management access. Can manage members, settings, and all operations.",
    color: "primary" as const,
  },
  MEMBER: {
    label: "Member",
    description: "Operational access. Can manage offboardings and day-to-day tasks.",
    color: "default" as const,
  },
  AUDITOR: {
    label: "Auditor",
    description: "Read-only access. Can view audit logs and compliance reports.",
    color: "info" as const,
  },
};

export default function MembersClient({ 
  members, 
  invitations, 
  customRoles, 
  joinRequests,
  canManage, 
  isOwner,
  currentUserId 
}: MembersClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [denyDialogOpen, setDenyDialogOpen] = useState(false);
  const [denyingRequestId, setDenyingRequestId] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState("");
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; member: Member } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSystemRole, setInviteSystemRole] = useState<"ADMIN" | "MEMBER" | "AUDITOR">("MEMBER");
  const [inviteCustomRoleId, setInviteCustomRoleId] = useState<string>("");

  const activeMembers = members.filter((m) => m.status === "ACTIVE");
  const nonActiveMembers = members.filter((m) => m.status === "SUSPENDED" || m.status === "REVOKED");
  const memberRequests = joinRequests.filter((jr) => jr.status === "REQUESTED_MEMBER");
  const adminRequests = joinRequests.filter((jr) => jr.status === "REQUESTED_ADMIN");

  const hasCustomRoles = customRoles.length > 0;
  const requiresAccessRole = hasCustomRoles;

  const resetInviteForm = () => {
    setInviteEmail("");
    setInviteSystemRole("MEMBER");
    setInviteCustomRoleId("");
    setError(null);
  };

  const handleInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (requiresAccessRole && !inviteCustomRoleId) {
      setError("Access Role is required when custom roles are configured.");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set("email", inviteEmail);
    formData.set("role", inviteSystemRole);
    if (inviteCustomRoleId) {
      formData.set("customRoleId", inviteCustomRoleId);
    }

    const result = await inviteMember(formData);

    if (result.error) {
      setError(result.error);
    } else {
      setInviteDialogOpen(false);
      resetInviteForm();
      router.refresh();
    }
    setLoading(false);
  };

  const handleApproveJoinRequest = async (requestId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/join-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to approve request");
      }
    } catch (e) {
      alert("An error occurred");
    }
    setLoading(false);
  };

  const handleDenyJoinRequest = async () => {
    if (!denyingRequestId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/join-requests/${denyingRequestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deny", reason: denyReason }),
      });
      if (res.ok) {
        setDenyDialogOpen(false);
        setDenyingRequestId(null);
        setDenyReason("");
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to deny request");
      }
    } catch (e) {
      alert("An error occurred");
    }
    setLoading(false);
  };

  const openDenyDialog = (requestId: string) => {
    setDenyingRequestId(requestId);
    setDenyDialogOpen(true);
  };

  const handleRemove = async (membershipId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    setLoading(true);
    const result = await removeMember(membershipId);
    if (result.error) alert(result.error);
    setMenuAnchor(null);
    router.refresh();
    setLoading(false);
  };

  const handleRoleChange = async (membershipId: string, newRole: "ADMIN" | "CONTRIBUTOR" | "AUDITOR") => {
    setLoading(true);
    await updateMemberRole(membershipId, newRole);
    setMenuAnchor(null);
    router.refresh();
    setLoading(false);
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    setLoading(true);
    await revokeInvitation(invitationId);
    router.refresh();
    setLoading(false);
  };

  const handleSuspend = async (membershipId: string) => {
    setLoading(true);
    await suspendMember(membershipId);
    setMenuAnchor(null);
    router.refresh();
    setLoading(false);
  };

  const handleReactivate = async (membershipId: string) => {
    setLoading(true);
    await reactivateMember(membershipId);
    setMenuAnchor(null);
    router.refresh();
    setLoading(false);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "OWNER": return "error";
      case "ADMIN": return "primary";
      case "MEMBER": return "default";
      case "AUDITOR": return "info";
      default: return "default";
    }
  };

    const getStatusColor = (status: string) => {
      switch (status) {
        case "ACTIVE": return "success";
        case "PENDING": return "warning";
        case "SUSPENDED": return "error";
        case "REVOKED": return "error";
        default: return "default";
      }
    };

  const totalPendingRequests = memberRequests.length + adminRequests.length;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Members</Typography>
          <Typography color="text.secondary">
            {activeMembers.length} active members
          </Typography>
        </Box>
        {canManage && (
          <Button
            variant="contained"
            startIcon={<span className="material-symbols-outlined">person_add</span>}
            onClick={() => setInviteDialogOpen(true)}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            Invite Member
          </Button>
        )}
      </Box>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{ borderBottom: "1px solid", borderColor: "divider", px: 2 }}
          >
            <Tab label={`Active (${activeMembers.length})`} />
            <Tab
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  Join Requests
                  {totalPendingRequests > 0 && (
                    <Chip label={totalPendingRequests} size="small" color="warning" sx={{ height: 20, fontSize: 11 }} />
                  )}
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  Invitations
                  {invitations.length > 0 && (
                    <Chip label={invitations.length} size="small" color="info" sx={{ height: 20, fontSize: 11 }} />
                  )}
                </Box>
              }
            />
            <Tab label={`Suspended/Revoked (${nonActiveMembers.length})`} />
          </Tabs>

        {tab === 0 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ "& th": { fontWeight: 700, color: "text.secondary", fontSize: 12, textTransform: "uppercase" } }}>
                  <TableCell>Member</TableCell>
                  <TableCell>Account Type</TableCell>
                  {hasCustomRoles && <TableCell>Access Role</TableCell>}
                  <TableCell>Status</TableCell>
                  <TableCell>Joined</TableCell>
                  {canManage && <TableCell align="right">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {activeMembers.map((member) => (
                  <TableRow key={member.id} hover>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Avatar src={member.user.avatarUrl || undefined} sx={{ bgcolor: "primary.main" }}>
                          {member.user.name?.charAt(0) || member.user.email.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography fontWeight={600}>
                            {member.user.name || "No name"}
                            {member.userId === currentUserId && " (You)"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">{member.user.email}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={member.systemRole} size="small" color={getRoleColor(member.systemRole) as any} sx={{ fontWeight: 600 }} />
                    </TableCell>
                    {hasCustomRoles && (
                      <TableCell>
                        {member.roleAssignments && member.roleAssignments.length > 0 ? (
                          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                            {member.roleAssignments.map((ra) => (
                              <Chip 
                                key={ra.customRole.id} 
                                label={ra.customRole.name} 
                                size="small" 
                                variant="outlined"
                                sx={{ fontWeight: 600, fontSize: "0.7rem" }} 
                              />
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.secondary">No access role</Typography>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <Chip label={member.status} size="small" color={getStatusColor(member.status) as any} variant="outlined" />
                    </TableCell>
                    <TableCell>{new Date(member.createdAt).toISOString().split("T")[0]}</TableCell>
                    {canManage && (
                      <TableCell align="right">
                        {member.systemRole !== "OWNER" && member.userId !== currentUserId && (
                          <IconButton size="small" onClick={(e) => setMenuAnchor({ el: e.currentTarget, member })}>
                            <span className="material-symbols-outlined">more_vert</span>
                          </IconButton>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {tab === 1 && (
          <Box>
            {adminRequests.length > 0 && isOwner && (
              <Box sx={{ p: 2, bgcolor: "warning.50", borderBottom: "1px solid", borderColor: "divider" }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#f59e0b" }}>shield_person</span>
                  Admin Requests (Owner Only)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  These users are requesting Admin access. Only organization owners can approve admin requests.
                </Typography>
              </Box>
            )}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ "& th": { fontWeight: 700, color: "text.secondary", fontSize: 12, textTransform: "uppercase" } }}>
                    <TableCell>Requester</TableCell>
                    <TableCell>Requested Role</TableCell>
                    <TableCell>Request Type</TableCell>
                    <TableCell>Expires</TableCell>
                    {canManage && <TableCell align="right">Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {joinRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ py: 8, textAlign: "center" }}>
                        <Typography color="text.secondary">No pending join requests</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    joinRequests.map((jr) => {
                      const isAdminReq = jr.status === "REQUESTED_ADMIN";
                      const canApprove = isAdminReq ? isOwner : canManage;
                      
                      return (
                        <TableRow key={jr.id} hover sx={isAdminReq ? { bgcolor: "warning.50" } : {}}>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                              <Avatar sx={{ bgcolor: isAdminReq ? "warning.main" : "info.main" }}>
                                {jr.requester.name?.charAt(0) || jr.requester.email.charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography fontWeight={600}>{jr.requester.name || "No name"}</Typography>
                                <Typography variant="caption" color="text.secondary">{jr.requester.email}</Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={jr.requestedRole} 
                              size="small" 
                              color={getRoleColor(jr.requestedRole) as any}
                              sx={{ fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Tooltip title={isAdminReq ? "Requires Owner approval" : "Can be approved by Admin or Owner"}>
                                <Chip 
                                  label={isAdminReq ? "Admin Request" : "Member Request"}
                                  size="small"
                                  variant="outlined"
                                  color={isAdminReq ? "warning" : "default"}
                                  icon={
                                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                      {isAdminReq ? "shield_person" : "person"}
                                    </span>
                                  }
                                />
                              </Tooltip>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color={new Date(jr.expiresAt) < new Date() ? "error" : "text.secondary"}>
                              {new Date(jr.expiresAt).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          {canManage && (
                            <TableCell align="right">
                              {canApprove ? (
                                <>
                                  <Button 
                                    size="small" 
                                    variant="contained" 
                                    color="success" 
                                    onClick={() => handleApproveJoinRequest(jr.id)} 
                                    disabled={loading} 
                                    sx={{ mr: 1 }}
                                  >
                                    Approve
                                  </Button>
                                  <Button 
                                    size="small" 
                                    variant="outlined" 
                                    color="error" 
                                    onClick={() => openDenyDialog(jr.id)} 
                                    disabled={loading}
                                  >
                                    Deny
                                  </Button>
                                </>
                              ) : (
                                <Tooltip title="Only organization owners can approve admin requests">
                                  <Chip label="Owner Required" size="small" variant="outlined" color="warning" />
                                </Tooltip>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {tab === 2 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ "& th": { fontWeight: 700, color: "text.secondary", fontSize: 12, textTransform: "uppercase" } }}>
                  <TableCell>Email</TableCell>
                  <TableCell>Account Type</TableCell>
                  {hasCustomRoles && <TableCell>Access Role</TableCell>}
                  <TableCell>Invited By</TableCell>
                  <TableCell>Expires</TableCell>
                  {canManage && <TableCell align="right">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {invitations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={hasCustomRoles ? 6 : 5} sx={{ py: 8, textAlign: "center" }}>
                      <Typography color="text.secondary">No pending invitations</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  invitations.map((inv) => (
                    <TableRow key={inv.id} hover>
                      <TableCell>
                        <Typography fontWeight={600}>{inv.email}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={inv.systemRole} size="small" />
                      </TableCell>
                      {hasCustomRoles && (
                        <TableCell>
                          {inv.customRole ? (
                            <Chip label={inv.customRole.name} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                          ) : (
                            <Typography variant="caption" color="text.secondary">None assigned</Typography>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <Typography variant="body2">{inv.invitedBy.name || inv.invitedBy.email}</Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(inv.expiresAt).toISOString().split("T")[0]}
                      </TableCell>
                      {canManage && (
                        <TableCell align="right">
                          <Button size="small" variant="outlined" color="error" onClick={() => handleRevokeInvitation(inv.id)} disabled={loading}>
                            Revoke
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {tab === 3 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ "& th": { fontWeight: 700, color: "text.secondary", fontSize: 12, textTransform: "uppercase" } }}>
                  <TableCell>Member</TableCell>
                  <TableCell>Account Type</TableCell>
                  {hasCustomRoles && <TableCell>Access Role</TableCell>}
                  <TableCell>Status</TableCell>
                  <TableCell>Joined</TableCell>
                  {canManage && <TableCell align="right">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {nonActiveMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={hasCustomRoles ? 6 : 5} sx={{ py: 8, textAlign: "center" }}>
                      <Typography color="text.secondary">No suspended or revoked members</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  nonActiveMembers.map((member) => (
                    <TableRow key={member.id} hover>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Avatar src={member.user.avatarUrl || undefined} sx={{ bgcolor: "grey.400" }}>
                            {member.user.name?.charAt(0) || member.user.email.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography fontWeight={600} color="text.secondary">
                              {member.user.name || "No name"}
                            </Typography>
                            <Typography variant="caption" color="text.disabled">{member.user.email}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={member.systemRole} size="small" variant="outlined" color="default" sx={{ opacity: 0.7 }} />
                      </TableCell>
                      {hasCustomRoles && (
                        <TableCell>
                          <Typography variant="caption" color="text.disabled">Read-only</Typography>
                        </TableCell>
                      )}
                      <TableCell>
                        <Chip 
                          label={member.status} 
                          size="small" 
                          color={member.status === "REVOKED" ? "error" : "warning"} 
                          variant="filled" 
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: "text.disabled" }}>{new Date(member.createdAt).toISOString().split("T")[0]}</TableCell>
                      {canManage && (
                        <TableCell align="right">
                          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                            {member.status === "SUSPENDED" && (
                              <Button 
                                size="small" 
                                variant="outlined" 
                                color="success" 
                                onClick={() => handleReactivate(member.id)}
                              >
                                Reactivate
                              </Button>
                            )}
                            {member.status === "REVOKED" && (
                              <Tooltip title="This member has been revoked and access is blocked.">
                                <Chip label="Revoked" size="small" color="error" variant="outlined" sx={{ fontWeight: 700 }} />
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <Menu anchorEl={menuAnchor?.el} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem disabled sx={{ fontSize: 12, color: "text.secondary" }}>Change Account Type</MenuItem>
        {["ADMIN", "MEMBER", "AUDITOR"].map((role) => (
          <MenuItem
            key={role}
            onClick={() => handleRoleChange(menuAnchor!.member.id, role as any)}
            selected={menuAnchor?.member.systemRole === role}
            disabled={loading}
          >
            {role}
          </MenuItem>
        ))}
        <MenuItem divider />
        {menuAnchor?.member.status === "ACTIVE" ? (
          <MenuItem onClick={() => handleSuspend(menuAnchor.member.id)} disabled={loading}>
            <span className="material-symbols-outlined" style={{ marginRight: 8, color: "#f59e0b" }}>pause_circle</span>
            Suspend
          </MenuItem>
        ) : (
          <MenuItem onClick={() => handleReactivate(menuAnchor!.member.id)} disabled={loading}>
            <span className="material-symbols-outlined" style={{ marginRight: 8, color: "#22c55e" }}>play_circle</span>
            Reactivate
          </MenuItem>
        )}
        <MenuItem onClick={() => handleRemove(menuAnchor!.member.id)} disabled={loading}>
          <span className="material-symbols-outlined" style={{ marginRight: 8, color: "#ef4444" }}>person_remove</span>
          Remove
        </MenuItem>
      </Menu>

      <Dialog 
        open={inviteDialogOpen} 
        onClose={() => { setInviteDialogOpen(false); resetInviteForm(); }} 
        maxWidth="sm" 
        fullWidth
      >
        <form onSubmit={handleInvite}>
          <DialogTitle fontWeight={700}>
            Invite Member
          </DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Grid container spacing={3} sx={{ mt: 0 }}>
              <Grid size={{ xs: 12 }}>
                <TextField 
                  fullWidth 
                  label="Email Address" 
                  type="email" 
                  required 
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Role Assignment
                  </Typography>
                </Divider>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth required>
                  <InputLabel>Account Type</InputLabel>
                  <Select 
                    label="Account Type" 
                    value={inviteSystemRole}
                    onChange={(e) => setInviteSystemRole(e.target.value as any)}
                  >
                    {Object.entries(SYSTEM_ROLE_INFO).map(([key, info]) => (
                      <MenuItem key={key} value={key}>
                        <Box>
                          <Typography fontWeight={600}>{info.label}</Typography>
                          <Typography variant="caption" color="text.secondary">{info.description}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    <Tooltip title="Account Type determines system-level capabilities." placement="bottom-start">
                      <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 0.5, cursor: "help" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>info</span>
                        Controls system-level access
                      </Box>
                    </Tooltip>
                  </FormHelperText>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth required={requiresAccessRole} error={requiresAccessRole && !inviteCustomRoleId && !!error}>
                  <InputLabel>Access Role</InputLabel>
                  <Select 
                    label="Access Role"
                    value={inviteCustomRoleId}
                    onChange={(e) => setInviteCustomRoleId(e.target.value)}
                    displayEmpty
                  >
                    {!requiresAccessRole && (
                      <MenuItem value="">
                        <Typography color="text.secondary">No access role</Typography>
                      </MenuItem>
                    )}
                    {customRoles.map((role) => (
                      <MenuItem key={role.id} value={role.id}>
                        <Box>
                          <Typography fontWeight={600}>{role.name}</Typography>
                          {role.description && (
                            <Typography variant="caption" color="text.secondary">{role.description}</Typography>
                          )}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    {customRoles.length === 0 ? (
                      <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>info</span>
                        No custom roles configured.
                      </Box>
                    ) : (
                      <Tooltip title="Access Role defines granular permissions." placement="bottom-start">
                        <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 0.5, cursor: "help" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>info</span>
                          {requiresAccessRole ? "Required — " : ""}Defines granular permissions
                        </Box>
                      </Tooltip>
                    )}
                  </FormHelperText>
                </FormControl>
              </Grid>
            </Grid>

            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
              Invitation expires in 7 days.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => { setInviteDialogOpen(false); resetInviteForm(); }}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={loading || (requiresAccessRole && !inviteCustomRoleId)}
            >
              {loading ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={denyDialogOpen} onClose={() => setDenyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Deny Join Request</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Provide a reason for denying this request. The requester will be notified.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason (optional)"
            value={denyReason}
            onChange={(e) => setDenyReason(e.target.value)}
            placeholder="e.g., Not authorized to join this organization"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setDenyDialogOpen(false); setDenyReason(""); }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDenyJoinRequest} disabled={loading}>
            {loading ? "Denying..." : "Deny Request"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
