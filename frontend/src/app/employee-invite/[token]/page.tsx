import { acceptEmployeePortalInvite } from "@/lib/actions/employee-invite";
import { getSupabaseUser } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import InviteAcceptClient from "./InviteAcceptClient";
import { Box, Paper, Typography, Alert, Button } from "@mui/material";
import Link from "next/link";

export default async function EmployeeInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  
  const result = await acceptEmployeePortalInvite(token);

  if (!result.success || !result.invite) {
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
        <Paper sx={{ p: 4, maxWidth: 400, textAlign: "center" }}>
          <Box sx={{ mb: 3 }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 64, color: "#ef4444" }}
            >
              error
            </span>
          </Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Invalid Invitation
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {result.error || "This invitation link is invalid or has expired."}
          </Typography>
          <Link href="/login" passHref style={{ textDecoration: "none" }}>
            <Button variant="contained" color="primary">
              Go to Login
            </Button>
          </Link>
        </Paper>
      </Box>
    );
  }

  const supabaseUser = await getSupabaseUser();
  let currentUser = null;

  if (supabaseUser) {
    currentUser = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
      select: { id: true, email: true },
    });
  }

  const emailMatch = currentUser?.email.toLowerCase() === result.invite.email.toLowerCase();

  if (currentUser && emailMatch) {
    return (
      <InviteAcceptClient
        token={token}
        invite={result.invite}
        userId={currentUser.id}
        isLoggedIn={true}
        emailMatch={true}
      />
    );
  }

  if (currentUser && !emailMatch) {
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
              style={{ fontSize: 64, color: "#f59e0b" }}
            >
              warning
            </span>
          </Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Email Mismatch
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            You are currently signed in as <strong>{currentUser.email}</strong>, but this invitation
            is for <strong>{result.invite.email}</strong>.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Please sign out and sign in with the correct email address, or contact your administrator.
          </Typography>
          <Link href="/login" passHref style={{ textDecoration: "none" }}>
            <Button variant="contained" color="primary">
              Sign Out & Try Again
            </Button>
          </Link>
        </Paper>
      </Box>
    );
  }

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
            style={{ fontSize: 64, color: "#3b82f6" }}
          >
            badge
          </span>
        </Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Employee Portal Invitation
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          You have been invited to join the employee portal at{" "}
          <strong>{result.invite.organization.name}</strong>.
        </Typography>
<Alert severity="info" sx={{ mb: 3, textAlign: "left" }}>
            <Typography variant="body2">
              <strong>For:</strong> {result.invite.employee.firstName} {result.invite.employee.lastName}
              <br />
              <strong>Email:</strong> {result.invite.email}
              <br />
              <strong>Portal Type:</strong> {result.invite.portalType === "SUBJECT_PORTAL" ? "Subject Portal (Your Offboarding)" : "Contributor Portal (Task Executor)"}
            </Typography>
          </Alert>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Please sign in or create an account with the email address{" "}
          <strong>{result.invite.email}</strong> to accept this invitation.
        </Typography>
        <Link
          href={`/login?redirect=/employee-invite/${token}`}
          passHref
          style={{ textDecoration: "none" }}
        >
          <Button variant="contained" color="primary" size="large" fullWidth>
            Sign In to Accept
          </Button>
        </Link>
        <Link
          href={`/register?email=${encodeURIComponent(result.invite.email)}&redirect=/employee-invite/${token}`}
          passHref
          style={{ textDecoration: "none" }}
        >
          <Button variant="outlined" color="primary" size="large" fullWidth sx={{ mt: 2 }}>
            Create Account
          </Button>
        </Link>
      </Paper>
    </Box>
  );
}
