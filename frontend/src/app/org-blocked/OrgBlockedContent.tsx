"use client";

import { useState } from "react";
import { Box, Card, CardContent, Typography, Chip, Button, Divider, Alert } from "@mui/material";
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
            maxWidth: 500, 
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
              Access Blocked
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
                  Reason
                </Typography>
                <Typography variant="body2">
                  {org.rejectionReason}
                </Typography>
              </Alert>
            ) : (
              <Alert 
                severity="info" 
                sx={{ mb: 3, textAlign: "left", borderRadius: 2 }}
              >
                <Typography variant="body2">
                  {isSuspended 
                    ? "Your organization has been temporarily suspended. This may be due to policy violations or administrative review."
                    : "Your organization's registration was not approved by the platform administrators."}
                </Typography>
              </Alert>
            )}

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
                What can you do?
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  Contact your organization administrator for more information
                </Typography>
                {isSuspended && (
                  <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                    Wait for the suspension to be lifted by platform administrators
                  </Typography>
                )}
                <Typography component="li" variant="body2">
                  {isRejected 
                    ? "Register a new organization with correct information"
                    : "Reach out to platform support if you believe this is an error"}
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
              Contact Support
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
