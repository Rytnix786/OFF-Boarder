"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Chip,
  Avatar,
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

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <Box sx={{ py: 1.5 }}>
      <Typography
        variant="body2"
        sx={{
          color: "text.disabled",
          fontSize: "0.75rem",
          letterSpacing: "0.02em",
          textTransform: "uppercase",
          mb: 0.25,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="body1"
        sx={{
          color: value ? "text.primary" : "text.disabled",
          fontWeight: 400,
        }}
      >
        {value || "—"}
      </Typography>
    </Box>
  );
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

  const portalStatus = session.employeeLink.status === "VERIFIED" ? "Verified" : "Pending";
  const employeeStatus = session.employee.status.replace("_", " ");

  return (
    <Box sx={{ maxWidth: 960, mx: "auto" }}>
      <Box sx={{ mb: 6, pt: 2 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 3 }}>
          <Avatar
            sx={{
              width: 72,
              height: 72,
              bgcolor: alpha("#1a1a2e", 0.08),
              color: "text.primary",
              fontSize: "1.5rem",
              fontWeight: 500,
              letterSpacing: "-0.02em",
            }}
          >
            {session.employee.firstName?.charAt(0)}{session.employee.lastName?.charAt(0)}
          </Avatar>
          <Box sx={{ flex: 1, pt: 0.5 }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 600,
                fontSize: "1.75rem",
                letterSpacing: "-0.02em",
                color: "text.primary",
                mb: 0.5,
              }}
            >
              {session.employee.firstName} {session.employee.lastName}
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: "text.secondary",
                fontSize: "1rem",
                mb: 1.5,
              }}
            >
              {session.employee.jobTitle?.title || "Employee"} · {session.employee.department?.name || session.organizationName}
            </Typography>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Chip
                size="small"
                label={portalStatus}
                sx={{
                  height: 24,
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  bgcolor: portalStatus === "Verified" ? alpha("#16a34a", 0.08) : alpha("#d97706", 0.08),
                  color: portalStatus === "Verified" ? "#16a34a" : "#d97706",
                  border: "none",
                  "& .MuiChip-label": { px: 1.5 },
                }}
              />
              {session.hasActiveOffboarding && (
                <Chip
                  size="small"
                  label="Offboarding"
                  sx={{
                    height: 24,
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    bgcolor: alpha("#dc2626", 0.08),
                    color: "#dc2626",
                    border: "none",
                    "& .MuiChip-label": { px: 1.5 },
                  }}
                />
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      <Grid container spacing={6}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Box sx={{ mb: 5 }}>
            <Typography
              variant="overline"
              sx={{
                color: "text.disabled",
                fontSize: "0.7rem",
                fontWeight: 600,
                letterSpacing: "0.1em",
                display: "block",
                mb: 2,
              }}
            >
              Personal Details
            </Typography>
            <Box
              sx={{
                borderTop: "1px solid",
                borderColor: "divider",
              }}
            >
              <Grid container>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow label="Email" value={session.employee.email} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow label="Phone" value={session.employee.phone} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow label="Employee ID" value={session.employee.employeeId} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow
                    label="Start Date"
                    value={session.employee.hireDate ? new Date(session.employee.hireDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : null}
                  />
                </Grid>
              </Grid>
            </Box>
          </Box>

          <Box>
            <Typography
              variant="overline"
              sx={{
                color: "text.disabled",
                fontSize: "0.7rem",
                fontWeight: 600,
                letterSpacing: "0.1em",
                display: "block",
                mb: 2,
              }}
            >
              Organization
            </Typography>
            <Box
              sx={{
                borderTop: "1px solid",
                borderColor: "divider",
              }}
            >
              <Grid container>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow label="Company" value={session.organizationName} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow label="Department" value={session.employee.department?.name} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow label="Title" value={session.employee.jobTitle?.title} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow label="Location" value={session.employee.location?.name} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow label="Manager" value={session.employee.managerMembership?.user?.name} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow label="Status" value={employeeStatus} />
                </Grid>
              </Grid>
            </Box>
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Box
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: (theme) => theme.palette.mode === "dark" ? alpha("#fff", 0.02) : alpha("#000", 0.02),
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                fontSize: "0.875rem",
                mb: 0.5,
              }}
            >
              Account Security
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                fontSize: "0.8125rem",
                mb: 2.5,
                lineHeight: 1.5,
              }}
            >
              Protect your account with a strong, unique password.
            </Typography>

            {!showPasswordForm ? (
              <Button
                variant="outlined"
                size="small"
                onClick={() => setShowPasswordForm(true)}
                sx={{
                  textTransform: "none",
                  fontWeight: 500,
                  borderColor: "divider",
                  color: "text.primary",
                  "&:hover": {
                    borderColor: "text.secondary",
                    bgcolor: "transparent",
                  },
                }}
              >
                Change password
              </Button>
            ) : (
              <Box component="form" onSubmit={handlePasswordChange}>
                {error && (
                  <Alert
                    severity="error"
                    sx={{
                      mb: 2,
                      py: 0.5,
                      "& .MuiAlert-message": { fontSize: "0.8125rem" },
                    }}
                  >
                    {error}
                  </Alert>
                )}

                <TextField
                  fullWidth
                  label="Current password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  sx={{ mb: 2 }}
                  size="small"
                />

                <TextField
                  fullWidth
                  label="New password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  helperText="Minimum 8 characters"
                  sx={{ mb: 2 }}
                  size="small"
                  FormHelperTextProps={{
                    sx: { fontSize: "0.75rem", mt: 0.5, ml: 0 },
                  }}
                />

                <TextField
                  fullWidth
                  label="Confirm new password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  sx={{ mb: 2.5 }}
                  size="small"
                />

                <Box sx={{ display: "flex", gap: 1.5 }}>
                  <Button
                    type="button"
                    variant="text"
                    size="small"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                      setError(null);
                    }}
                    disabled={isLoading}
                    sx={{
                      textTransform: "none",
                      fontWeight: 500,
                      color: "text.secondary",
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    size="small"
                    disabled={isLoading}
                    sx={{
                      textTransform: "none",
                      fontWeight: 500,
                      boxShadow: "none",
                      "&:hover": { boxShadow: "none" },
                    }}
                  >
                    {isLoading ? <CircularProgress size={18} /> : "Update password"}
                  </Button>
                </Box>
              </Box>
            )}
          </Box>

          {session.hasActiveOffboarding && (
            <Box
              sx={{
                mt: 3,
                p: 3,
                borderRadius: 2,
                bgcolor: alpha("#dc2626", 0.04),
                border: "1px solid",
                borderColor: alpha("#dc2626", 0.12),
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  color: "#b91c1c",
                  mb: 0.5,
                }}
              >
                Offboarding in Progress
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  fontSize: "0.8125rem",
                  lineHeight: 1.5,
                }}
              >
                Please complete your assigned tasks and return any company assets. Your cooperation helps ensure a smooth transition.
              </Typography>
            </Box>
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
