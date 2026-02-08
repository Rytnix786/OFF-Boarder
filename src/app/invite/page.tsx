"use client";

import React, { useState, useEffect, Suspense } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  alpha,
  Alert,
} from "@mui/material";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function InvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [invitation, setInvitation] = useState<{
    email: string;
    systemRole: string;
    organization: { name: string };
  } | null>(null);

  useEffect(() => {
    const checkAuthAndInvitation = async () => {
      if (!token) {
        setError("Invalid invitation link");
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);

      try {
        const res = await fetch(`/api/invitations/accept?token=${token}`);
        const data = await res.json();
        
        if (data.error) {
          setError(data.error);
        } else {
          setInvitation(data.invitation);
        }
      } catch {
        setError("Failed to load invitation");
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndInvitation();
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true);
    setError(null);

    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

        if (data.error) {
          if (data.error.includes("logged in")) {
            router.push(`/login?redirect=/invite?token=${token}`);
          } else {
            setError(data.error);
          }
        } else {
          router.push("/pending");
        }
    } catch {
      setError("Failed to accept invitation");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
        }}
      >
        <CircularProgress />
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
        p: 3,
      }}
    >
      <Card variant="outlined" sx={{ maxWidth: 480, width: "100%", borderRadius: 4 }}>
        <CardContent sx={{ p: 5, textAlign: "center" }}>
          {error ? (
            <>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  bgcolor: (theme) => alpha(theme.palette.error.main, 0.1),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 3,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 40, color: "#ef4444" }}>
                  error
                </span>
              </Box>
              <Typography variant="h5" fontWeight={800} gutterBottom>
                {error.includes("expired") ? "Invitation Expired" : 
                 error.includes("used") ? "Invitation Already Used" : 
                 "Invalid Invitation"}
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                {error}
              </Typography>
              {error.includes("expired") && (
                <Alert severity="info" sx={{ mb: 3, textAlign: "left" }}>
                  Please contact your organization administrator to request a new invitation.
                </Alert>
              )}
              <Link href="/login" passHref style={{ textDecoration: "none" }}>
                <Button variant="contained">
                  Go to Login
                </Button>
              </Link>
            </>
          ) : invitation ? (
            <>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 3,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 40 }}>
                  mail
                </span>
              </Box>
              <Typography variant="h5" fontWeight={800} gutterBottom>
                You're Invited!
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                You've been invited to join <strong>{invitation.organization.name}</strong> as a{" "}
                <strong>{invitation.systemRole}</strong>.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Invitation sent to: <strong>{invitation.email}</strong>
              </Typography>
              
              {isAuthenticated ? (
                <>
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={handleAccept}
                    disabled={accepting}
                    sx={{ borderRadius: 2, py: 1.5, fontWeight: 700, mb: 2 }}
                  >
                    {accepting ? "Accepting..." : "Accept Invitation"}
                  </Button>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                    After accepting, an administrator will need to approve your membership.
                  </Typography>
                </>
              ) : (
                <>
                  <Alert severity="info" sx={{ mb: 3, textAlign: "left" }}>
                    <Typography variant="body2" fontWeight={600}>
                      Create an account to join
                    </Typography>
                    <Typography variant="caption">
                      You need to create an account with <strong>{invitation.email}</strong> to accept this invitation.
                    </Typography>
                  </Alert>
                  <Link 
                    href={`/register?email=${encodeURIComponent(invitation.email)}&invite=${token}`} 
                    passHref 
                    style={{ textDecoration: "none" }}
                  >
                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      sx={{ borderRadius: 2, py: 1.5, fontWeight: 700, mb: 2 }}
                    >
                      Create Account & Join
                    </Button>
                  </Link>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Already have an account?{" "}
                    <Link 
                      href={`/login?redirect=${encodeURIComponent(`/invite?token=${token}`)}`} 
                      style={{ textDecoration: "none", color: "inherit", fontWeight: 600 }}
                    >
                      Sign in
                    </Link>
                  </Typography>
                </>
              )}
            </>
          ) : null}
        </CardContent>
      </Card>
    </Box>
  );
}

export default function InvitationPage() {
  return (
    <Suspense fallback={
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    }>
      <InvitationContent />
    </Suspense>
  );
}
