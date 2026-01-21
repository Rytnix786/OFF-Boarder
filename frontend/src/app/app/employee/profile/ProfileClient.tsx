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
  const initials = `${session.employee.firstName?.charAt(0) || ""}${session.employee.lastName?.charAt(0) || ""}`;

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Box
            sx={{
              position: "relative",
              p: 4,
              borderRadius: 4,
              background: (theme) =>
                theme.palette.mode === "dark"
                  ? `linear-gradient(145deg, ${alpha("#10b981", 0.12)} 0%, ${alpha("#059669", 0.06)} 50%, ${alpha("#047857", 0.02)} 100%)`
                  : `linear-gradient(145deg, ${alpha("#10b981", 0.08)} 0%, ${alpha("#059669", 0.04)} 50%, ${alpha("#047857", 0.02)} 100%)`,
              border: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? alpha("#10b981", 0.2) : alpha("#10b981", 0.15),
              boxShadow: (theme) =>
                theme.palette.mode === "dark"
                  ? `0 0 60px ${alpha("#10b981", 0.08)}, 0 4px 20px ${alpha("#000", 0.2)}`
                  : `0 0 60px ${alpha("#10b981", 0.06)}, 0 4px 20px ${alpha("#000", 0.05)}`,
              overflow: "hidden",
              "&::before": {
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "1px",
                background: `linear-gradient(90deg, transparent, ${alpha("#10b981", 0.4)}, transparent)`,
              },
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <Box
                sx={{
                  position: "relative",
                  mb: 3,
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    inset: -6,
                    borderRadius: "50%",
                    background: `conic-gradient(from 0deg, ${alpha("#10b981", 0.3)}, ${alpha("#059669", 0.1)}, ${alpha("#10b981", 0.3)})`,
                    animation: "spin 8s linear infinite",
                    "@keyframes spin": {
                      from: { transform: "rotate(0deg)" },
                      to: { transform: "rotate(360deg)" },
                    },
                  }}
                />
                <Avatar
                  sx={{
                    position: "relative",
                    width: 88,
                    height: 88,
                    bgcolor: "#10b981",
                    color: "#fff",
                    fontSize: "1.75rem",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    boxShadow: `0 0 30px ${alpha("#10b981", 0.4)}, 0 4px 12px ${alpha("#000", 0.15)}`,
                  }}
                >
                  {initials}
                </Avatar>
              </Box>

              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  fontSize: "1.5rem",
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
                  fontSize: "0.95rem",
                  mb: 2,
                }}
              >
                {session.employee.jobTitle?.title || "Employee"}
              </Typography>

              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "center", mb: 3 }}>
                <Chip
                  size="small"
                  label={portalStatus}
                  sx={{
                    height: 26,
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    bgcolor: alpha("#10b981", 0.15),
                    color: "#10b981",
                    border: `1px solid ${alpha("#10b981", 0.3)}`,
                    "& .MuiChip-label": { px: 1.5 },
                  }}
                />
                {session.hasActiveOffboarding && (
                  <Chip
                    size="small"
                    label="Offboarding"
                    sx={{
                      height: 26,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      bgcolor: alpha("#f59e0b", 0.15),
                      color: "#f59e0b",
                      border: `1px solid ${alpha("#f59e0b", 0.3)}`,
                      "& .MuiChip-label": { px: 1.5 },
                    }}
                  />
                )}
              </Box>

              <Box
                sx={{
                  width: "100%",
                  pt: 2,
                  borderTop: "1px solid",
                  borderColor: (theme) =>
                    theme.palette.mode === "dark" ? alpha("#fff", 0.08) : alpha("#000", 0.06),
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    fontSize: "0.8rem",
                  }}
                >
                  {session.employee.department?.name || "—"} · {session.organizationName}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              mt: 3,
              p: 3,
              borderRadius: 3,
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
              Keep your account protected.
            </Typography>

            {!showPasswordForm ? (
              <Button
                variant="outlined"
                size="small"
                fullWidth
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
                borderRadius: 3,
                bgcolor: alpha("#f59e0b", 0.06),
                border: "1px solid",
                borderColor: alpha("#f59e0b", 0.2),
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  color: "#d97706",
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
                Complete your tasks and return company assets.
              </Typography>
            </Box>
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
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
