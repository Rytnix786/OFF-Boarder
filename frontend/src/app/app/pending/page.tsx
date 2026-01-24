import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma.server";
import { Box, Card, CardContent, Typography, Chip, Button, Divider, Alert } from "@mui/material";
import Link from "next/link";
import { SignOutButton } from "./SignOutButton";
import { JoinOrgForm } from "./JoinOrgForm";

export default async function PendingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) redirect("/login");
  
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
  });
  
  if (!dbUser) redirect("/register");

  const memberships = await prisma.membership.findMany({
    where: { userId: dbUser.id },
    include: { organization: true },
  });

  const activeMembership = memberships.find(
    (m) => m.status === "ACTIVE" && m.organization.status === "ACTIVE"
  );

  // Check for SUSPENDED or REJECTED org - redirect to org-blocked
  const blockedMembership = memberships.find(
    (m) => m.status === "ACTIVE" && 
    (m.organization.status === "SUSPENDED" || m.organization.status === "REJECTED")
  );

  if (blockedMembership) {
    redirect("/org-blocked");
  }

  const pendingOrg = memberships.find(
    (m) => m.organization.status === "PENDING" && m.systemRole === "OWNER"
  );

  const joinRequests = await prisma.joinRequest.findMany({
    where: { requesterUserId: dbUser.id },
    include: { organization: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  });

  const pendingJoinRequest = joinRequests.find(
    (jr) => jr.status === "REQUESTED_MEMBER" || jr.status === "REQUESTED_ADMIN"
  );

  const deniedJoinRequest = joinRequests.find((jr) => jr.status === "DENIED");
  const expiredJoinRequest = joinRequests.find((jr) => jr.status === "EXPIRED");

  const getStatusLabel = (status: string) => {
    if (status === "REQUESTED_MEMBER") return "Pending (Member)";
    if (status === "REQUESTED_ADMIN") return "Pending (Admin)";
    return status;
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 3,
      }}
    >
      <Card variant="outlined" sx={{ maxWidth: 500, width: "100%", borderRadius: 4 }}>
          <CardContent sx={{ p: 5, textAlign: "center" }}>
            {activeMembership ? (
              <>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    bgcolor: "rgba(34, 197, 94, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mx: "auto",
                    mb: 3,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 40, color: "#22c55e" }}>
                    check_circle
                  </span>
                </Box>
                <Chip label="Active" color="success" sx={{ mb: 2, fontWeight: 600 }} />
                <Typography variant="h5" fontWeight={800} gutterBottom>
                  Organization Ready
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                  You have access to &quot;{activeMembership.organization.name}&quot;.
                </Typography>
                <Link href="/app" passHref style={{ textDecoration: 'none' }}>
                  <Button variant="contained" size="large" fullWidth>
                    Go to Dashboard
                  </Button>
                </Link>
              </>
            ) : pendingOrg ? (
            <>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  bgcolor: "rgba(245, 158, 11, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 3,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 40, color: "#f59e0b" }}>
                  hourglass_empty
                </span>
              </Box>
              <Chip label="Pending Approval" color="warning" sx={{ mb: 2, fontWeight: 600 }} />
              <Typography variant="h5" fontWeight={800} gutterBottom>
                Awaiting Platform Approval
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Your organization &quot;{pendingOrg.organization.name}&quot; is pending review by our team.
                We&apos;ll notify you once your organization is approved.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This usually takes 1-2 business days.
              </Typography>
            </>
          ) : pendingJoinRequest ? (
            <>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  bgcolor: "rgba(59, 130, 246, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 3,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 40, color: "#3b82f6" }}>
                  pending
                </span>
              </Box>
              <Chip 
                label={getStatusLabel(pendingJoinRequest.status)} 
                color="info" 
                sx={{ mb: 2, fontWeight: 600 }} 
              />
              <Typography variant="h5" fontWeight={800} gutterBottom>
                Awaiting {pendingJoinRequest.status === "REQUESTED_ADMIN" ? "Owner" : "Admin"} Approval
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                You&apos;ve requested to join &quot;{pendingJoinRequest.organization.name}&quot; as{" "}
                <strong>{pendingJoinRequest.requestedRole}</strong>.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {pendingJoinRequest.status === "REQUESTED_ADMIN" 
                  ? "Only organization owners can approve admin requests."
                  : "An organization admin or owner needs to approve your request."}
              </Typography>
              <Alert severity="info" sx={{ textAlign: "left", mt: 2 }}>
                <Typography variant="body2">
                  <strong>Expires:</strong> {new Date(pendingJoinRequest.expiresAt).toLocaleDateString()}
                </Typography>
              </Alert>
            </>
          ) : deniedJoinRequest ? (
            <>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  bgcolor: "rgba(239, 68, 68, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 3,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 40, color: "#ef4444" }}>
                  cancel
                </span>
              </Box>
              <Chip label="Denied" color="error" sx={{ mb: 2, fontWeight: 600 }} />
              <Typography variant="h5" fontWeight={800} gutterBottom>
                Join Request Denied
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Your request to join &quot;{deniedJoinRequest.organization.name}&quot; was denied.
              </Typography>
              {deniedJoinRequest.resolutionReason && (
                <Box sx={{ bgcolor: "rgba(239, 68, 68, 0.1)", p: 2, borderRadius: 2, mb: 3, textAlign: "left" }}>
                  <Typography variant="body2" color="error.main">
                    <strong>Reason:</strong> {deniedJoinRequest.resolutionReason}
                  </Typography>
                </Box>
              )}
              <JoinOrgForm />
            </>
          ) : expiredJoinRequest ? (
            <>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  bgcolor: "rgba(245, 158, 11, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 3,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 40, color: "#f59e0b" }}>
                  schedule
                </span>
              </Box>
              <Chip label="Expired" color="warning" sx={{ mb: 2, fontWeight: 600 }} />
              <Typography variant="h5" fontWeight={800} gutterBottom>
                Join Request Expired
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Your request to join &quot;{expiredJoinRequest.organization.name}&quot; has expired.
                You can submit a new request below.
              </Typography>
              <JoinOrgForm />
            </>
          ) : (
            <>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  bgcolor: "rgba(59, 130, 246, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 3,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 40, color: "#3b82f6" }}>
                  info
                </span>
              </Box>
              <Typography variant="h5" fontWeight={800} gutterBottom>
                No Active Organization
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                You don&apos;t have access to any active organization. You can create a new one or request to join an existing one.
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Link href="/register" passHref style={{ textDecoration: 'none' }}>
                  <Button variant="contained">
                    Create Organization
                  </Button>
                </Link>
              </Box>

              <JoinOrgForm />
            </>
            )}

            <Divider sx={{ my: 3 }} />
            <SignOutButton />
        </CardContent>
      </Card>
    </Box>
  );
}
