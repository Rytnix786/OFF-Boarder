"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Paper, Typography, Button, Alert, CircularProgress } from "@mui/material";
import { completeEmployeePortalInvite } from "@/lib/actions/employee-invite";

interface InviteAcceptClientProps {
  token: string;
  invite: {
    id: string;
    email: string;
    portalType: "SUBJECT_PORTAL" | "CONTRIBUTOR_PORTAL";
    organization: {
      id: string;
      name: string;
      slug: string;
    };
    employee: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  userId: string;
  isLoggedIn: boolean;
  emailMatch: boolean;
}

export default function InviteAcceptClient({
  token,
  invite,
  userId,
  isLoggedIn,
  emailMatch,
}: InviteAcceptClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setLoading(true);
    setError(null);

    try {
const result = await completeEmployeePortalInvite(token, userId);
        if (result.success) {
          router.push("/app/portal");
        } else {
        setError(result.error || "Failed to accept invitation");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 2,
      }}
    >
      <Paper sx={{ p: 4, maxWidth: 500, textAlign: "center" }}>
        <Box sx={{ mb: 3 }}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 64, color: "#22c55e" }}
          >
            check_circle
          </span>
        </Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Accept Portal Access
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          You are about to activate your employee portal access at{" "}
          <strong>{invite.organization.name}</strong>.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3, textAlign: "left" }}>
            {error}
          </Alert>
        )}

        <Alert severity="info" sx={{ mb: 3, textAlign: "left" }}>
          <Typography variant="body2">
            <strong>Employee:</strong> {invite.employee.firstName} {invite.employee.lastName}
            <br />
            <strong>Organization:</strong> {invite.organization.name}
            <br />
            <strong>Portal Type:</strong> {invite.portalType === "SUBJECT_PORTAL" ? "Subject Portal" : "Contributor Portal"}
          </Typography>
        </Alert>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {invite.portalType === "SUBJECT_PORTAL"
            ? "By accepting, you will be able to view and complete your offboarding tasks, upload required documents, and track your progress."
            : "By accepting, you will be able to view and complete tasks assigned to you across offboarding cases."}
        </Typography>

        <Button
          variant="contained"
          color="primary"
          size="large"
          fullWidth
          disabled={loading}
          onClick={handleAccept}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {loading ? "Accepting..." : "Accept & Continue"}
        </Button>
      </Paper>
    </Box>
  );
}
