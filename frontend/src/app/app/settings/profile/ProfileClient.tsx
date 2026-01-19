"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Grid,
  TextField,
  Button,
  Chip,
  Divider,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Snackbar,
  alpha,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { updateProfile, changePassword } from "@/lib/actions/profile";

interface ProfileClientProps {
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    isPlatformAdmin: boolean;
    createdAt: Date;
  };
  membership: {
    systemRole: string;
    status: string;
    organization: {
      name: string;
    };
  };
  securityActivity: Array<{
    id: string;
    action: string;
    createdAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
  }>;
}

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  
  if (score <= 2) return { score: 25, label: "Weak", color: "#ef4444" };
  if (score <= 3) return { score: 50, label: "Fair", color: "#f59e0b" };
  if (score <= 4) return { score: 75, label: "Good", color: "#22c55e" };
  return { score: 100, label: "Strong", color: "#10b981" };
}

function formatAction(action: string): string {
  switch (action) {
    case "user.login": return "Signed in";
    case "user.logout": return "Signed out";
    case "user.registered": return "Account created";
    case "user.password_changed": return "Password changed";
    case "user.password_reset": return "Password reset";
    default: return action;
  }
}

function getRoleColor(role: string): string {
  switch (role) {
    case "OWNER": return "#8b5cf6";
    case "ADMIN": return "#3b82f6";
    case "AUDITOR": return "#f59e0b";
    case "MEMBER": return "#22c55e";
    default: return "#6b7280";
  }
}

function getRoleDisplayName(role: string): string {
  switch (role) {
    case "OWNER": return "Owner";
    case "ADMIN": return "Administrator";
    case "AUDITOR": return "Auditor";
    case "MEMBER": return "Member";
    default: return role;
  }
}

export default function ProfileClient({ user, membership, securityActivity }: ProfileClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" } | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const passwordStrength = getPasswordStrength(newPassword);
  const roleColor = getRoleColor(membership.systemRole);
  const userName = user.name || "User";
  const userInitials = userName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const result = await updateProfile(formData);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      router.refresh();
    }
    setLoading(false);
  };

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    if (passwordStrength.score < 50) {
      setPasswordError("Please choose a stronger password");
      return;
    }

    setPasswordLoading(true);

    const result = await changePassword(currentPassword, newPassword);

    if (result.error) {
      setPasswordError(result.error);
    } else {
      setSnackbar({ open: true, message: "Password changed successfully", severity: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setPasswordLoading(false);
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800}>Profile</Typography>
        <Typography color="text.secondary">
          Manage your account settings and security
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
            <Box sx={{ 
              background: `linear-gradient(135deg, ${alpha(roleColor, 0.15)} 0%, ${alpha(roleColor, 0.05)} 100%)`,
              p: 4, 
              textAlign: "center",
              borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
            }}>
              <Avatar
                src={user.avatarUrl || undefined}
                sx={{ 
                  width: 88, 
                  height: 88, 
                  mx: "auto", 
                  mb: 2, 
                  fontSize: 32, 
                  fontWeight: 700,
                  bgcolor: roleColor,
                  border: `3px solid ${alpha(roleColor, 0.3)}`,
                }}
              >
                {userInitials}
              </Avatar>
              <Typography variant="h6" fontWeight={700}>
                {userName}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {user.email}
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "center", gap: 1, flexWrap: "wrap" }}>
                <Chip 
                  size="small"
                  label={getRoleDisplayName(membership.systemRole)}
                  sx={{ 
                    fontWeight: 700,
                    bgcolor: alpha(roleColor, 0.12),
                    color: roleColor,
                    border: `1px solid ${alpha(roleColor, 0.2)}`,
                  }}
                />
                {user.isPlatformAdmin && (
                  <Chip 
                    size="small"
                    label="Platform Admin"
                    sx={{ 
                      fontWeight: 700,
                      bgcolor: alpha("#ef4444", 0.1),
                      color: "#ef4444",
                      border: `1px solid ${alpha("#ef4444", 0.2)}`,
                    }}
                  />
                )}
              </Box>
            </Box>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box>
                  <Typography variant="overline" color="text.secondary" sx={{ fontSize: "0.65rem", letterSpacing: "0.08em" }}>
                    Organization
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {membership.organization.name}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="overline" color="text.secondary" sx={{ fontSize: "0.65rem", letterSpacing: "0.08em" }}>
                    Account Status
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ 
                      width: 8, 
                      height: 8, 
                      borderRadius: "50%", 
                      bgcolor: membership.status === "ACTIVE" ? "#22c55e" : "#f59e0b" 
                    }} />
                    <Typography variant="body2" fontWeight={600}>
                      {membership.status === "ACTIVE" ? "Active" : membership.status}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="overline" color="text.secondary" sx={{ fontSize: "0.65rem", letterSpacing: "0.08em" }}>
                    Member Since
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {new Date(user.createdAt).toLocaleDateString("en-US", { 
                      year: "numeric", 
                      month: "long", 
                      day: "numeric" 
                    })}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
                <Box sx={{ 
                  width: 36, 
                  height: 36, 
                  borderRadius: 2, 
                  bgcolor: alpha("#3b82f6", 0.1),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#3b82f6" }}>person</span>
                </Box>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>Account Information</Typography>
                  <Typography variant="caption" color="text.secondary">Update your personal details</Typography>
                </Box>
              </Box>
              <form onSubmit={handleSubmit}>
                {error && (
                  <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
                )}
                {success && (
                  <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>Profile updated successfully</Alert>
                )}
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Full Name"
                      name="name"
                      defaultValue={user.name || ""}
                      size="small"
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      type="email"
                      value={user.email}
                      disabled
                      size="small"
                      helperText="Contact your administrator to change your email"
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Avatar URL"
                      name="avatarUrl"
                      defaultValue={user.avatarUrl || ""}
                      placeholder="https://example.com/avatar.jpg"
                      size="small"
                      helperText="Enter a URL to an image for your profile picture"
                    />
                  </Grid>
                </Grid>
                <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
                  <Button type="submit" variant="contained" disabled={loading} sx={{ fontWeight: 600 }}>
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </Box>
              </form>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
                <Box sx={{ 
                  width: 36, 
                  height: 36, 
                  borderRadius: 2, 
                  bgcolor: alpha("#f59e0b", 0.1),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#f59e0b" }}>key</span>
                </Box>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>Password</Typography>
                  <Typography variant="caption" color="text.secondary">Update your password to keep your account secure</Typography>
                </Box>
              </Box>
              <form onSubmit={handleChangePassword}>
                {passwordError && (
                  <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{passwordError}</Alert>
                )}
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Current Password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      size="small"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="New Password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      size="small"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Confirm New Password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      size="small"
                      error={confirmPassword.length > 0 && newPassword !== confirmPassword}
                    />
                  </Grid>
                  {newPassword && (
                    <Grid size={{ xs: 12 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <LinearProgress
                          variant="determinate"
                          value={passwordStrength.score}
                          sx={{
                            flex: 1,
                            height: 6,
                            borderRadius: 3,
                            bgcolor: "grey.200",
                            "& .MuiLinearProgress-bar": {
                              bgcolor: passwordStrength.color,
                            },
                          }}
                        />
                        <Typography variant="caption" sx={{ color: passwordStrength.color, fontWeight: 600, minWidth: 50 }}>
                          {passwordStrength.label}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                        Use 8+ characters with uppercase, lowercase, numbers, and symbols
                      </Typography>
                    </Grid>
                  )}
                </Grid>
                <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
                  <Button type="submit" variant="contained" color="warning" disabled={passwordLoading} sx={{ fontWeight: 600 }}>
                    {passwordLoading ? "Updating..." : "Update Password"}
                  </Button>
                </Box>
              </form>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
                <Box sx={{ 
                  width: 36, 
                  height: 36, 
                  borderRadius: 2, 
                  bgcolor: alpha("#6b7280", 0.1),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#6b7280" }}>history</span>
                </Box>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>Security Activity</Typography>
                  <Typography variant="caption" color="text.secondary">Recent account activity and sign-ins</Typography>
                </Box>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em" }}>Activity</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em" }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em" }}>IP Address</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {securityActivity.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} sx={{ textAlign: "center", py: 4 }}>
                          <Typography color="text.secondary">No recent activity</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      securityActivity.map((activity) => (
                        <TableRow key={activity.id} hover>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#6b7280" }}>
                                {activity.action === "user.login" ? "login" : 
                                 activity.action === "user.logout" ? "logout" :
                                 activity.action.includes("password") ? "key" : "info"}
                              </span>
                              <Typography variant="body2">{formatAction(activity.action)}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(activity.createdAt).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                              {activity.ipAddress || "—"}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar?.open || false}
        autoHideDuration={5000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar?.severity || "success"} onClose={() => setSnackbar(null)}>
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
