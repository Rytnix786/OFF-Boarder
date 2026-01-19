"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Divider,
} from "@mui/material";

const SUPPORT_EMAIL = "support@offboardhq.com";

type SupportCategory =
  | "ACCOUNT_ACCESS"
  | "ORGANIZATION_BLOCKED"
  | "ORGANIZATION_SUSPENDED"
  | "ORGANIZATION_REJECTED"
  | "BILLING"
  | "TECHNICAL_ISSUE"
  | "FEATURE_REQUEST"
  | "SECURITY_CONCERN"
  | "OTHER";

const categoryLabels: Record<SupportCategory, string> = {
  ACCOUNT_ACCESS: "Account Access Issue",
  ORGANIZATION_BLOCKED: "Organization Blocked",
  ORGANIZATION_SUSPENDED: "Organization Suspended",
  ORGANIZATION_REJECTED: "Organization Rejected",
  BILLING: "Billing Question",
  TECHNICAL_ISSUE: "Technical Issue",
  FEATURE_REQUEST: "Feature Request",
  SECURITY_CONCERN: "Security Concern",
  OTHER: "Other",
};

interface SupportContext {
  organizationId?: string;
  organizationName?: string;
  organizationStatus?: string;
  pageSource?: string;
}

interface SupportTicketModalProps {
  open: boolean;
  onClose: () => void;
  userEmail?: string;
  prefilledCategory?: SupportCategory;
  prefilledSubject?: string;
  context?: SupportContext;
}

export function SupportTicketModal({
  open,
  onClose,
  userEmail = "",
  prefilledCategory,
  prefilledSubject = "",
  context,
}: SupportTicketModalProps) {
  const [category, setCategory] = useState<SupportCategory>(
    prefilledCategory || "OTHER"
  );
  const [subject, setSubject] = useState(prefilledSubject);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(userEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    ticketNumber: string;
  } | null>(null);

  const handleSubmit = async () => {
    if (!email || !subject || !message) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/support-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          subject,
          message,
          email,
          organizationId: context?.organizationId,
          context: {
            ...context,
            submittedAt: new Date().toISOString(),
            userAgent: typeof window !== "undefined" ? navigator.userAgent : null,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create ticket");
      }

      setSuccess({ ticketNumber: data.ticketNumber });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setCategory(prefilledCategory || "OTHER");
      setSubject(prefilledSubject);
      setMessage("");
      setEmail(userEmail);
      setError(null);
      setSuccess(null);
      onClose();
    }
  };

  if (success) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogContent sx={{ textAlign: "center", py: 5 }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              bgcolor: "success.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 3,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 48, color: "white" }}
            >
              check
            </span>
          </Box>

          <Typography variant="h5" fontWeight={700} gutterBottom>
            Ticket Created Successfully
          </Typography>

          <Box
            sx={{
              bgcolor: "action.hover",
              borderRadius: 2,
              p: 2,
              my: 3,
            }}
          >
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Your Ticket Number
            </Typography>
            <Typography
              variant="h4"
              fontWeight={900}
              sx={{ fontFamily: "monospace", letterSpacing: 1 }}
            >
              {success.ticketNumber}
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary">
            We&apos;ve received your request and will respond to{" "}
            <strong>{email}</strong> as soon as possible.
          </Typography>

          <Alert severity="info" sx={{ mt: 3, textAlign: "left" }}>
            <Typography variant="body2">
              Save your ticket number for reference. You can also email us
              directly at{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} style={{ fontWeight: 600 }}>
                {SUPPORT_EMAIL}
              </a>{" "}
              and include this ticket number.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            onClick={handleClose}
            variant="contained"
            fullWidth
            size="large"
            sx={{ borderRadius: 2 }}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: "primary.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 24, color: "white" }}
            >
              support_agent
            </span>
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Contact Support
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Submit a support ticket
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {context?.organizationName && (
          <Box sx={{ mb: 3, p: 2, bgcolor: "action.hover", borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Organization Context
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography fontWeight={600}>
                {context.organizationName}
              </Typography>
              {context.organizationStatus && (
                <Chip
                  label={context.organizationStatus}
                  size="small"
                  color={
                    context.organizationStatus === "SUSPENDED"
                      ? "warning"
                      : context.organizationStatus === "REJECTED"
                      ? "error"
                      : "default"
                  }
                />
              )}
            </Box>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <TextField
            label="Your Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
            disabled={!!userEmail}
          />

          <FormControl fullWidth required>
            <InputLabel>Category</InputLabel>
            <Select
              value={category}
              label="Category"
              onChange={(e) => setCategory(e.target.value as SupportCategory)}
            >
              {Object.entries(categoryLabels).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            fullWidth
            placeholder="Brief description of your issue"
          />

          <TextField
            label="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            fullWidth
            multiline
            rows={5}
            placeholder="Describe your issue in detail. Include any relevant information that might help us assist you faster."
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Prefer email? Contact us directly at
          </Typography>
          <Typography
            component="a"
            href={`mailto:${SUPPORT_EMAIL}`}
            sx={{
              color: "primary.main",
              fontWeight: 600,
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            {SUPPORT_EMAIL}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !email || !subject || !message}
          startIcon={
            loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                send
              </span>
            )
          }
        >
          {loading ? "Submitting..." : "Submit Ticket"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
