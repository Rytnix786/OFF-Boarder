"use client";

import { useState } from "react";
import { Box, Card, CardContent, Typography, Chip, Button, Divider, Alert, Stepper, Step, StepLabel } from "@mui/material";
import { useRouter } from "next/navigation";
import { SignOutButton } from "./SignOutButton";
import { SupportTicketModal } from "@/components/SupportTicketModal";
import { createClient } from "@/lib/supabase/client";

interface OrgBlockedContentProps {
  org: {
    id: string;
    name: string;
    status: string;
    rejectionReason: string | null;
  };
  userEmail: string;
}

export function OrgBlockedContent({ org, userEmail }: OrgBlockedContentProps) {
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const router = useRouter();

  const handleRegisterNewOrg = async () => {
    setRegisterLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/register");
    } catch {
      setRegisterLoading(false);
    }
  };

  const isSuspended = org.status === "SUSPENDED";
  const isRejected = org.status === "REJECTED";

  const bgGradient = isSuspended 
    ? "radial-gradient(ellipse at top, rgba(245, 158, 11, 0.08), transparent 60%)"
    : "radial-gradient(ellipse at top, rgba(239, 68, 68, 0.08), transparent 60%)";

  const prefilledCategory = isSuspended ? "ORGANIZATION_SUSPENDED" : "ORGANIZATION_REJECTED";
  const prefilledSubject = isSuspended 
    ? `Organization Suspended: ${org.name}` 
    : `Organization Rejected: ${org.name}`;

  const suspendedSteps = [
    { label: "Suspended", description: "Your organization is currently suspended" },
    { label: "Under Review", description: "Platform admin reviewing your case" },
    { label: "Reactivated", description: "Access restored when resolved" },
  ];

  const rejectedSteps = [
    { label: "Rejected", description: "Registration was not approved" },
    { label: "Appeal or Re-register", description: "Contact support or create new org" },
    { label: "Approved", description: "Gain access upon approval" },
  ];

  return (
    <>
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
          p: 3,
          background: bgGradient,
        }}
      >
        <Card 
          variant="outlined" 
          sx={{ 
            maxWidth: 560, 
            width: "100%", 
            borderRadius: 4,
            borderColor: isSuspended ? "warning.main" : "error.main",
            borderWidth: 2,
          }}
        >
          <CardContent sx={{ p: 5, textAlign: "center" }}>
            <Box
              sx={{
                width: 100,
                height: 100,
                borderRadius: "50%",
                bgcolor: isSuspended 
                  ? "rgba(245, 158, 11, 0.15)" 
                  : "rgba(239, 68, 68, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 3,
              }}
            >
              <span 
                className="material-symbols-outlined" 
                style={{ 
                  fontSize: 56, 
                  color: isSuspended ? "#f59e0b" : "#ef4444" 
                }}
              >
                {isSuspended ? "pause_circle" : "block"}
              </span>
            </Box>

            <Chip 
              label={isSuspended ? "Organization Suspended" : "Organization Rejected"} 
              color={isSuspended ? "warning" : "error"} 
              sx={{ mb: 2, fontWeight: 700, fontSize: "0.9rem", py: 2.5 }} 
            />

            <Typography variant="h4" fontWeight={900} gutterBottom sx={{ letterSpacing: -0.5 }}>
              {isSuspended ? "Temporarily Blocked" : "Access Denied"}
            </Typography>

            <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
              {org.name}
            </Typography>

            {isRejected && org.rejectionReason ? (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 3, 
                  textAlign: "left",
                  borderRadius: 2,
                  "& .MuiAlert-message": { width: "100%" }
                }}
                icon={
                  <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
                    info
                  </span>
                }
              >
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  Rejection Reason
                </Typography>
                <Typography variant="body2">
                  {org.rejectionReason}
                </Typography>
              </Alert>
            ) : isSuspended ? (
              <Alert 
                severity="warning" 
                sx={{ mb: 3, textAlign: "left", borderRadius: 2 }}
              >
                <Typography variant="body2">
                  <strong>This is a temporary suspension.</strong> Your organization data is preserved. 
                  A platform administrator can reactivate your organization once the issue is resolved.
                </Typography>
              </Alert>
            ) : (
              <Alert 
                severity="info" 
                sx={{ mb: 3, textAlign: "left", borderRadius: 2 }}
              >
                <Typography variant="body2">
                  Your organization&apos;s registration was not approved. You can contact support to appeal 
                  or register a new organization with updated information.
                </Typography>
              </Alert>
            )}

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2, textAlign: "left" }}>
                Recovery Path
              </Typography>
              <Stepper activeStep={0} alternativeLabel sx={{ mb: 2 }}>
                {(isSuspended ? suspendedSteps : rejectedSteps).map((step) => (
                  <Step key={step.label}>
                    <StepLabel>
                      <Typography sx={{ fontSize: "0.75rem", fontWeight: 600 }}>{step.label}</Typography>
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>

            <Box 
              sx={{ 
                bgcolor: "action.hover", 
                p: 3, 
                borderRadius: 2, 
                mb: 3,
                textAlign: "left"
              }}
            >
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                What you can do now
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  <strong>Contact Support</strong> - Submit a ticket to appeal or get more information
                </Typography>
                {isSuspended && (
                  <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                    <strong>Wait for Resolution</strong> - A platform admin will review and can reactivate your organization
                  </Typography>
                )}
                {isRejected && (
                  <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                    <strong>Register New Organization</strong> - Create a new organization with correct information
                  </Typography>
                )}
                <Typography component="li" variant="body2">
                  <strong>Sign Out</strong> - If you have access to another organization, sign out and sign in again
                </Typography>
              </Box>
            </Box>

            <Button
              variant="contained"
              color={isSuspended ? "warning" : "error"}
              fullWidth
              size="large"
              onClick={() => setSupportModalOpen(true)}
              sx={{ 
                borderRadius: 3, 
                py: 1.5, 
                fontWeight: 700,
                mb: 2
              }}
              startIcon={
                <span className="material-symbols-outlined">support_agent</span>
              }
            >
              Contact Support to {isSuspended ? "Request Reactivation" : "Appeal Decision"}
            </Button>

            {isRejected && (
                <Button 
                  variant="outlined" 
                  fullWidth
                  size="large"
                  onClick={handleRegisterNewOrg}
                  disabled={registerLoading}
                  sx={{ borderRadius: 3, py: 1.5, fontWeight: 700, mb: 2 }}
                  startIcon={
                    <span className="material-symbols-outlined">add_business</span>
                  }
                >
                  {registerLoading ? "Signing out..." : "Register New Organization"}
                </Button>
              )}

            <Divider sx={{ my: 3 }} />
            
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, mb: 2 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#6b7280" }}>info</span>
              <Typography variant="caption" color="text.secondary">
                This is a terminal state. You cannot access the application until resolved.
              </Typography>
            </Box>
            
            <SignOutButton />
          </CardContent>
        </Card>
      </Box>

      <SupportTicketModal
        open={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
        userEmail={userEmail}
        prefilledCategory={prefilledCategory as "ORGANIZATION_SUSPENDED" | "ORGANIZATION_REJECTED"}
        prefilledSubject={prefilledSubject}
        context={{
          organizationId: org.id,
          organizationName: org.name,
          organizationStatus: org.status,
          pageSource: "org-blocked",
        }}
      />
    </>
  );
}
