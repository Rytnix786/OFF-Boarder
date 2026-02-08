"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Chip,
  TextField,
  Button,
  Alert,
  Snackbar,
  CircularProgress,
  alpha,
  Divider,
  useTheme,
} from "@mui/material";
import type { EmployeePortalSession } from "@/lib/employee-auth.server";
import { createClient } from "@/lib/supabase/client";

interface ProfileClientProps {
  session: EmployeePortalSession;
}

function InfoRow({ label, value, isLocked = true }: { label: string; value: string | null | undefined; isLocked?: boolean }) {
  return (
    <Box sx={{ py: 1.5, display: "flex", alignItems: "flex-start", gap: 1 }}>
      <Box sx={{ flex: 1 }}>
        <Typography
          variant="body2"
          sx={{
            color: "text.disabled",
            fontSize: "0.75rem",
            letterSpacing: "0.02em",
            textTransform: "uppercase",
            mb: 0.25,
            display: "flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          {label}
          {isLocked && (
            <span 
              className="material-symbols-outlined" 
              style={{ fontSize: "0.75rem", opacity: 0.5 }}
            >
              lock
            </span>
          )}
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
    </Box>
  );
}

export default function ProfileClient({ session }: ProfileClientProps) {
  const theme = useTheme();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" } | null>(null);

  const [showContactForm, setShowContactForm] = useState(false);
  const [personalPhone, setPersonalPhone] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [initialContactLoaded, setInitialContactLoaded] = useState(false);

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const res = await fetch("/api/employee-portal/contact-info");
        if (res.ok) {
          const data = await res.json();
          setPersonalPhone(data.personalPhone || "");
          setPersonalEmail(data.personalEmail || "");
        }
      } catch (err) {
        console.error("Failed to fetch contact info:", err);
      } finally {
        setInitialContactLoaded(true);
      }
    };
    fetchContactInfo();
  }, []);

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
    } catch {
      setError("Failed to update password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);
    setContactLoading(true);

    try {
      const res = await fetch("/api/employee-portal/contact-info", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalPhone, personalEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        setContactError(data.error || "Failed to update contact information");
        return;
      }

      setSnackbar({ open: true, message: "Contact information updated", severity: "success" });
      setShowContactForm(false);
    } catch {
      setContactError("Failed to update contact information");
    } finally {
      setContactLoading(false);
    }
  };

  const portalStatus = session.employeeLink.status === "VERIFIED" ? "Verified" : "Pending";
  const employeeStatus = session.employee.status.replace("_", " ");

  return (
    <Box sx={{ maxWidth: 900, mx: "auto" }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            fontSize: "1.5rem",
            letterSpacing: "-0.02em",
            mb: 0.5,
          }}
        >
          My Profile
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View your personal and organizational information
        </Typography>
      </Box>

      <Box
        sx={{
          mb: 4,
            p: 3,
            borderRadius: 4,
            bgcolor: (theme) => theme.palette.mode === "dark" ? alpha("#fff", 0.02) : alpha("#000", 0.01),
            border: "1px solid",
            borderColor: "divider",
            position: "relative",
            overflow: "hidden",
            "&::after": {
              content: '""',
              position: "absolute",
              top: 0,
              right: 0,
              width: "150px",
              height: "150px",
              background: (theme) => `radial-gradient(circle at top right, ${alpha(theme.palette.primary.main, 0.05)}, transparent 70%)`,
              pointerEvents: "none",
            }
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, fontSize: "0.9rem", color: "text.primary" }}
            >
              Account Status
            </Typography>
            <Chip
              size="small"
              label={portalStatus}
              sx={{
                height: 22,
                fontSize: "0.7rem",
                fontWeight: 700,
                bgcolor: alpha("#10b981", 0.1),
                color: "#10b981",
                border: `1px solid ${alpha("#10b981", 0.2)}`,
                boxShadow: `0 0 10px ${alpha("#10b981", 0.1)}`,
              }}
            />
            {session.hasActiveOffboarding && (
              <Chip
                size="small"
                label="Offboarding"
                sx={{
                  height: 22,
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  bgcolor: alpha("#f59e0b", 0.1),
                  color: "#f59e0b",
                  border: `1px solid ${alpha("#f59e0b", 0.2)}`,
                  boxShadow: `0 0 10px ${alpha("#f59e0b", 0.1)}`,
                }}
              />
            )}
          </Box>
          <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.85rem", opacity: 0.8 }}>
            Employment status: <Box component="span" sx={{ color: "text.primary", fontWeight: 600 }}>{employeeStatus}</Box>
          </Typography>
        </Box>


      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <span className="material-symbols-outlined" style={{ fontSize: "1.25rem", color: "inherit", opacity: 0.7 }}>
                badge
              </span>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  letterSpacing: "0.01em",
                }}
              >
                Identity Information
              </Typography>
            </Box>
            <Typography
              variant="caption"
              sx={{
                display: "block",
                mb: 2,
                color: "text.secondary",
                fontSize: "0.75rem",
              }}
            >
              System of record data — cannot be modified
            </Typography>
            <Box
              sx={{
                p: 3,
                borderRadius: 4,
                bgcolor: (theme) => theme.palette.mode === "dark" ? alpha("#fff", 0.015) : "#fff",
                border: "1px solid",
                borderColor: "divider",
                transition: "all 0.3s ease",
                "&:hover": {
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                  boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.2)}`,
                }
              }}
            >
              <InfoRow label="Full Name" value={`${session.employee.firstName} ${session.employee.lastName}`} />
              <Divider sx={{ my: 1 }} />
              <InfoRow label="Primary Email (Login)" value={session.employee.email} />
              <Divider sx={{ my: 1 }} />
              <InfoRow label="Employee ID" value={session.employee.employeeId} />
              <Divider sx={{ my: 1 }} />
              <InfoRow label="Job Title" value={session.employee.jobTitle?.title} />
              <Divider sx={{ my: 1 }} />
              <InfoRow label="Department" value={session.employee.department?.name} />
              <Divider sx={{ my: 1 }} />
              <InfoRow label="Manager" value={session.employee.managerMembership?.user?.name} />
            </Box>
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <span className="material-symbols-outlined" style={{ fontSize: "1.25rem", color: "inherit", opacity: 0.7 }}>
                business
              </span>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  letterSpacing: "0.01em",
                }}
              >
                Organization
              </Typography>
            </Box>
            <Typography
              variant="caption"
              sx={{
                display: "block",
                mb: 2,
                color: "text.secondary",
                fontSize: "0.75rem",
              }}
            >
              Assigned organization and location
            </Typography>
            <Box
              sx={{
                p: 3,
                borderRadius: 4,
                bgcolor: (theme) => theme.palette.mode === "dark" ? alpha("#fff", 0.015) : "#fff",
                border: "1px solid",
                borderColor: "divider",
                transition: "all 0.3s ease",
                "&:hover": {
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                  boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.2)}`,
                }
              }}
            >
              <InfoRow label="Company" value={session.organizationName} />
              <Divider sx={{ my: 1 }} />
              <InfoRow label="Location" value={session.employee.location?.name} />
              <Divider sx={{ my: 1 }} />
              <InfoRow label="Work Phone" value={session.employee.phone} />
              <Divider sx={{ my: 1 }} />
              <InfoRow
                label="Start Date"
                value={session.employee.hireDate ? new Date(session.employee.hireDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : null}
              />
            </Box>
          </Box>
        </Grid>
      </Grid>

      <Box
        sx={{
          mb: 4,
          p: 3,
          borderRadius: 4,
          bgcolor: (theme) => theme.palette.mode === "dark" ? alpha("#0ea5e9", 0.04) : alpha("#0ea5e9", 0.02),
          border: "1px solid",
          borderColor: (theme) => theme.palette.mode === "dark" ? alpha("#0ea5e9", 0.2) : alpha("#0ea5e9", 0.1),
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            background: (theme) => `linear-gradient(135deg, ${alpha("#0ea5e9", 0.05)} 0%, transparent 100%)`,
            pointerEvents: "none",
          }
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <span className="material-symbols-outlined" style={{ fontSize: "1.25rem", color: "#0ea5e9" }}>
              contact_phone
            </span>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 600, fontSize: "0.875rem" }}
            >
              Contact Information
            </Typography>
          </Box>
          {!showContactForm && initialContactLoaded && (
            <Button
              variant="text"
              size="small"
              onClick={() => setShowContactForm(true)}
              sx={{
                textTransform: "none",
                fontWeight: 500,
                fontSize: "0.8125rem",
                color: "#0ea5e9",
              }}
            >
              Edit
            </Button>
          )}
        </Box>
        
        <Typography
          variant="caption"
          sx={{
            display: "block",
            mb: 2,
            color: "text.secondary",
            fontSize: "0.75rem",
            lineHeight: 1.5,
          }}
        >
          For offboarding communication only. Does not affect your login or identity.
        </Typography>

        {!showContactForm ? (
          <Box>
            {!initialContactLoaded ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                <CircularProgress size={20} />
              </Box>
            ) : (
              <>
                <Box sx={{ py: 1 }}>
                  <Typography variant="body2" sx={{ color: "text.disabled", fontSize: "0.75rem", textTransform: "uppercase", mb: 0.25 }}>
                    Personal Phone
                  </Typography>
                  <Typography variant="body1" sx={{ color: personalPhone ? "text.primary" : "text.disabled" }}>
                    {personalPhone || "Not provided"}
                  </Typography>
                </Box>
                <Box sx={{ py: 1 }}>
                  <Typography variant="body2" sx={{ color: "text.disabled", fontSize: "0.75rem", textTransform: "uppercase", mb: 0.25 }}>
                    Personal Email
                  </Typography>
                  <Typography variant="body1" sx={{ color: personalEmail ? "text.primary" : "text.disabled" }}>
                    {personalEmail || "Not provided"}
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        ) : (
          <Box component="form" onSubmit={handleContactUpdate}>
            {contactError && (
              <Alert severity="error" sx={{ mb: 2, py: 0.5, "& .MuiAlert-message": { fontSize: "0.8125rem" } }}>
                {contactError}
              </Alert>
            )}

            <TextField
              fullWidth
              label="Personal phone"
              value={personalPhone}
              onChange={(e) => setPersonalPhone(e.target.value)}
              placeholder="e.g., +1 555-123-4567"
              sx={{ mb: 2 }}
              size="small"
              helperText="For asset return coordination"
              FormHelperTextProps={{ sx: { fontSize: "0.75rem", mt: 0.5, ml: 0 } }}
            />

            <TextField
              fullWidth
              label="Personal email"
              type="email"
              value={personalEmail}
              onChange={(e) => setPersonalEmail(e.target.value)}
              placeholder="e.g., personal@email.com"
              sx={{ mb: 2.5 }}
              size="small"
              helperText="Alternative contact (not your login email)"
              FormHelperTextProps={{ sx: { fontSize: "0.75rem", mt: 0.5, ml: 0 } }}
            />

            <Box sx={{ display: "flex", gap: 1.5 }}>
              <Button
                type="button"
                variant="text"
                size="small"
                onClick={() => {
                  setShowContactForm(false);
                  setContactError(null);
                }}
                disabled={contactLoading}
                sx={{ textTransform: "none", fontWeight: 500, color: "text.secondary" }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                size="small"
                disabled={contactLoading}
                sx={{
                  textTransform: "none",
                  fontWeight: 500,
                  boxShadow: "none",
                  bgcolor: "#0ea5e9",
                  "&:hover": { boxShadow: "none", bgcolor: "#0284c7" },
                }}
              >
                {contactLoading ? <CircularProgress size={18} /> : "Save changes"}
              </Button>
            </Box>
          </Box>
        )}
      </Box>

      <Box
        sx={{
          p: 3,
          borderRadius: 2,
          bgcolor: (theme) => theme.palette.mode === "dark" ? alpha("#fff", 0.02) : alpha("#000", 0.02),
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
          <span className="material-symbols-outlined" style={{ fontSize: "1.25rem", color: "inherit", opacity: 0.7 }}>
            security
          </span>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 600, fontSize: "0.875rem" }}
          >
            Account Security
          </Typography>
        </Box>
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
