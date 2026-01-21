"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Avatar,
  Divider,
  TextField,
  Button,
  Alert,
  Snackbar,
  CircularProgress,
  alpha,
} from "@mui/material";
import type { EmployeePortalSession } from "@/lib/employee-auth.server";
import { createClient } from "@/lib/supabase/client";

interface ProfileClientProps {
  session: EmployeePortalSession;
}

export default function ProfileClient({ session }: ProfileClientProps) {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" } | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: currentPassword,
      });

      if (signInError) {
        setError("Current password is incorrect");
        setIsLoading(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
        setIsLoading(false);
        return;
      }

      setSnackbar({ open: true, message: "Password updated successfully", severity: "success" });
      setShowPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError("Failed to update password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const portalStatus = session.employeeLink.status === "VERIFIED" ? "Verified" : "Invited";

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>
          My Profile
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View your profile information
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 3, mb: 3 }}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: "primary.main",
                    fontSize: "2rem",
                    fontWeight: 700,
                  }}
                >
                  {session.employee.firstName?.charAt(0)}{session.employee.lastName?.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight={700}>
                    {session.employee.firstName} {session.employee.lastName}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {session.employee.jobTitle?.title || "Employee"}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                    <Chip
                      size="small"
                      label={portalStatus}
                      sx={{
                        fontWeight: 600,
                        bgcolor: portalStatus === "Verified" ? alpha("#22c55e", 0.1) : alpha("#f59e0b", 0.1),
                        color: portalStatus === "Verified" ? "#22c55e" : "#f59e0b",
                      }}
                    />
                    <Chip
                      size="small"
                      label={session.employee.status.replace("_", " ")}
                      sx={{
                        fontWeight: 600,
                        bgcolor: alpha("#3b82f6", 0.1),
                        color: "#3b82f6",
                      }}
                    />
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                Personal Information
              </Typography>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    First Name
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {session.employee.firstName}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Last Name
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {session.employee.lastName}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Email Address
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {session.employee.email}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Phone Number
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {session.employee.phone || "—"}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Employee ID
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {session.employee.employeeId}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Hire Date
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {session.employee.hireDate
                      ? new Date(session.employee.hireDate).toLocaleDateString()
                      : "—"}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                Organization Information
              </Typography>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Organization
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {session.organizationName}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Department
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {session.employee.department?.name || "—"}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Job Title
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {session.employee.jobTitle?.title || "—"}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Location
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {session.employee.location?.name || "—"}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Manager
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {session.employee.managerMembership?.user?.name || "—"}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                Account Security
              </Typography>

              {!showPasswordForm ? (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Keep your account secure by using a strong password.
                  </Typography>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => setShowPasswordForm(true)}
                    startIcon={<span className="material-symbols-outlined">lock</span>}
                  >
                    Change Password
                  </Button>
                </Box>
              ) : (
                <Box component="form" onSubmit={handlePasswordChange}>
                  {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {error}
                    </Alert>
                  )}

                  <TextField
                    fullWidth
                    label="Current Password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    sx={{ mb: 2 }}
                    size="small"
                  />

                  <TextField
                    fullWidth
                    label="New Password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    helperText="At least 8 characters"
                    sx={{ mb: 2 }}
                    size="small"
                  />

                  <TextField
                    fullWidth
                    label="Confirm New Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    sx={{ mb: 2 }}
                    size="small"
                  />

                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button
                      type="button"
                      variant="outlined"
                      fullWidth
                      onClick={() => {
                        setShowPasswordForm(false);
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                        setError(null);
                      }}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      disabled={isLoading}
                    >
                      {isLoading ? <CircularProgress size={20} /> : "Update"}
                    </Button>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>

          {session.hasActiveOffboarding && (
            <Card
              variant="outlined"
              sx={{
                borderRadius: 3,
                mt: 3,
                borderColor: alpha("#f59e0b", 0.3),
                bgcolor: alpha("#f59e0b", 0.02),
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                  <span className="material-symbols-outlined" style={{ color: "#f59e0b" }}>
                    info
                  </span>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Offboarding Status
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  You have an active offboarding in progress. Please complete all required tasks
                  and return any assets assigned to you.
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar?.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar(null)}
          severity={snackbar?.severity}
          sx={{ width: "100%" }}
        >
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
