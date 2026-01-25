"use client";

import React, { useState, useContext, useEffect, useCallback, Suspense } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Card,
  Divider,
  alpha,
  Alert,
  CircularProgress,
  IconButton,
  useTheme,
  Chip,
  Tabs,
  Tab,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ColorModeContext } from "@/theme/ThemeRegistry";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

type InvitationInfo = {
  id: string;
  token: string;
  email: string;
  systemRole: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  expiresAt: string;
};

type EmployeeInviteInfo = {
  id: string;
  token: string;
  email: string;
  portalType: string;
  organizationId: string;
  organizationName: string;
  employeeId: string;
  employeeDisplayName: string;
  expiresAt: string;
};

type EmailCheckResult = {
  hasAccount?: boolean;
  hasInvitation?: boolean;
  canCreateOrg?: boolean;
  invitationExpired?: boolean;
  organizationName?: string;
  invitation?: InvitationInfo;
  message?: string;
};

type Organization = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
};

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    }>
      <RegisterContent />
    </Suspense>
  );
}

function RegisterContent() {
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);
  const router = useRouter();
  const searchParams = useSearchParams();
  
    const inviteToken = searchParams.get("invite");
    const prefillEmail = searchParams.get("email");
    const plan = searchParams.get("plan");
    const isTrial = searchParams.get("trial") === "true";
    const decodedEmail = prefillEmail ? decodeURIComponent(prefillEmail).trim().toLowerCase() : "";


  // Tab state: 0 = Create Org, 1 = Join Existing Org
  const [activeTab, setActiveTab] = useState(0);

  // Common fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState(decodedEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  
  // Create Org fields
  const [orgName, setOrgName] = useState("");
  
  // Join Org fields
  const [orgOptions, setOrgOptions] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [orgSearchLoading, setOrgSearchLoading] = useState(false);
  const [requestedRole, setRequestedRole] = useState<"CONTRIBUTOR" | "ADMIN">("CONTRIBUTOR");
  
  // Email check state
  const [emailChecked, setEmailChecked] = useState(false);
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [emailCheckResult, setEmailCheckResult] = useState<EmailCheckResult | null>(null);
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [employeeInvite, setEmployeeInvite] = useState<EmployeeInviteInfo | null>(null);

  const checkEmail = useCallback(async (emailToCheck: string) => {
    if (!emailToCheck || !emailToCheck.includes("@")) {
      setEmailChecked(false);
      setEmailCheckResult(null);
      setInvitation(null);
      setEmployeeInvite(null);
      return;
    }

    setEmailCheckLoading(true);
    try {
      const [inviteRes, employeeInviteRes] = await Promise.all([
        fetch("/api/auth/check-invitation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailToCheck }),
        }),
        fetch(`/api/employee-invites/lookup?email=${encodeURIComponent(emailToCheck)}`),
      ]);

      const data: EmailCheckResult = await inviteRes.json();
      const employeeData = await employeeInviteRes.json();

      setEmailCheckResult(data);
      setEmailChecked(true);
      
      if (data.hasInvitation && data.invitation) {
        setInvitation(data.invitation);
      } else {
        setInvitation(null);
      }

      if (employeeData.found && employeeData.invite) {
        setEmployeeInvite(employeeData.invite);
      } else {
        setEmployeeInvite(null);
      }
    } catch {
      setEmailCheckResult(null);
      setEmployeeInvite(null);
    } finally {
      setEmailCheckLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchInviteByToken = async () => {
      if (inviteToken && !invitation) {
        try {
          const res = await fetch(`/api/invitations/accept?token=${inviteToken}`);
          const data = await res.json();
          if (data.invitation) {
            const inv = data.invitation;
            setInvitation({
              id: inv.id || "",
              token: inviteToken,
              email: inv.email,
              systemRole: inv.systemRole,
              organizationId: inv.organization?.id || "",
              organizationName: inv.organization?.name || "",
              organizationSlug: inv.organization?.slug || "",
              expiresAt: inv.expiresAt || "",
            });
            if (inv.email && !email) {
              setEmail(inv.email.toLowerCase());
            }
          }
        } catch {
          // Ignore errors
        }
      }
    };
    fetchInviteByToken();
  }, [inviteToken, invitation, email]);

  useEffect(() => {
    if (decodedEmail) {
      checkEmail(decodedEmail);
    }
  }, [decodedEmail, checkEmail]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (email && email.includes("@")) {
        checkEmail(email);
        setError(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [email, checkEmail]);

  const searchOrganizations = async (query: string) => {
    if (query.length < 2) {
      setOrgOptions([]);
      return;
    }
    setOrgSearchLoading(true);
    try {
      const res = await fetch(`/api/organizations/search?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      setOrgOptions(data.organizations || []);
    } catch {
      setOrgOptions([]);
    }
    setOrgSearchLoading(false);
  };

    const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      const normalizedEmail = (employeeInvite?.email || invitation?.email || email).trim().toLowerCase().replace(/['"]/g, '');

      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        setLoading(false);
        return;
      }

      if (emailCheckResult?.hasAccount) {
        setError("An account with this email already exists. Please sign in instead.");
        setLoading(false);
        return;
      }

      // Validation based on mode
      if (employeeInvite) {
        // Employee portal invite mode - no extra validation needed
      } else if (invitation) {
        // Invitation mode - no extra validation needed
      } else if (activeTab === 0) {
        // Create org mode
        if (!orgName.trim()) {
          setError("Please enter an organization name");
          setLoading(false);
          return;
        }
      } else {
        // Join org mode
        if (!selectedOrg) {
          setError("Please select an organization to join");
          setLoading(false);
          return;
        }
      }

      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: normalizedEmail,
            password,
            name,
            orgName: (employeeInvite || invitation) ? null : (activeTab === 0 ? orgName : null),
            invitationToken: invitation?.token || null,
            employeeInviteToken: employeeInvite?.token || null,
            // Join request params
            joinOrganizationId: (!employeeInvite && !invitation && activeTab === 1) ? selectedOrg?.id : null,
            requestedRole: (!employeeInvite && !invitation && activeTab === 1) ? requestedRole : null,
          }),
        });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "user_exists") {
          setError("An account with this email already exists. Please sign in to accept the invitation.");
        } else if (data.code === "invitation_expired") {
          setError("This invitation has expired. Please request a new one from your administrator.");
        } else if (data.code === "invitation_used") {
          setError("This invitation has already been used.");
        } else {
          setError(data.error || "Failed to create account");
        }
        return;
      }

      const supabase = createClient();
      
      const attemptSignIn = async (retries = 3, delay = 500): Promise<boolean> => {
        for (let i = 0; i < retries; i++) {
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });
          if (!signInError) {
            return true;
          }
        }
        return false;
      };

      const signedIn = await attemptSignIn();
      
      if (!signedIn) {
        setError("Account created but unable to sign in automatically. Please sign in manually.");
        window.location.href = "/login";
        return;
      }

      window.location.href = "/auth/redirect";
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      
      // Build redirect URL with necessary params
      let redirectUrl = `${window.location.origin}/auth/callback?setup=true`;
      if (invitation) {
        redirectUrl += `&invite=${invitation.token}`;
      } else if (activeTab === 1 && selectedOrg) {
        redirectUrl += `&joinOrg=${selectedOrg.id}&requestedRole=${requestedRole}`;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        setError(error.message);
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const isDark = theme.palette.mode === "dark";

  if (verificationSent) {
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
        <Card
          variant="outlined"
          sx={{
            maxWidth: 450,
            width: "100%",
            borderRadius: 4,
            p: 5,
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              display: "inline-flex",
              bgcolor: "success.main",
              p: 2,
              borderRadius: "50%",
              color: "white",
              mb: 3,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "40px" }}>
              mark_email_read
            </span>
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 900, mb: 2 }}>
            Check Your Email
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            We've sent a verification link to <strong>{email}</strong>. Click the link to activate your account.
          </Typography>
          {invitation && (
            <Alert severity="info" sx={{ mb: 3, textAlign: "left" }}>
              After verifying your email, you'll automatically join <strong>{invitation.organizationName}</strong>.
            </Alert>
          )}
          <Button
            variant="outlined"
            fullWidth
            sx={{ borderRadius: 3 }}
            onClick={() => setVerificationSent(false)}
          >
            Back to Registration
          </Button>
        </Card>
      </Box>
    );
  }

  // Determine page title and subtitle based on mode
    const getPageContent = () => {
      if (employeeInvite) {
        return {
          title: "Employee Portal Access",
          subtitle: `Complete your account to access ${employeeInvite.organizationName}`,
        };
      }
      if (invitation) {
        return {
          title: "Join Organization",
          subtitle: `You've been invited to join ${invitation.organizationName}`,
        };
      }
      if (activeTab === 0) {
        return {
          title: "Create Account",
          subtitle: "Start securing your offboarding process today",
        };
      }
      return {
        title: "Join Organization",
        subtitle: "Request to join an existing organization",
      };
    };

  const pageContent = getPageContent();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 3,
        background: isDark
          ? `radial-gradient(ellipse at top, ${alpha(theme.palette.primary.main, 0.1)}, transparent 60%)`
          : `radial-gradient(ellipse at top, ${alpha(theme.palette.primary.main, 0.05)}, transparent 60%)`,
      }}
    >
      <Box sx={{ position: "absolute", top: 16, right: 16 }}>
        <ThemeToggle size="small" />
      </Box>

      <Card
        variant="outlined"
        sx={{
          maxWidth: 500,
          width: "100%",
          borderRadius: 4,
          p: 5,
          boxShadow: `0 20px 40px ${alpha(theme.palette.text.primary, 0.05)}`,
        }}
      >
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <Box
              sx={{
                display: "inline-flex",
                bgcolor: "primary.main",
                p: 1.5,
                borderRadius: 2,
                color: "white",
                mb: 2,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "32px" }}>
                shield_person
              </span>
            </Box>
          </Link>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -1 }}>
            {pageContent.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontWeight: 500 }}>
            {pageContent.subtitle}
          </Typography>
        </Box>

        {/* Tab selector - only show if no invitation */}
          {!employeeInvite && !invitation && (
          <Tabs
            value={activeTab}
            onChange={(_, v) => {
              setActiveTab(v);
              setError(null);
            }}
            variant="fullWidth"
            sx={{
              mb: 3,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              p: 0.5,
              "& .MuiTab-root": {
                borderRadius: 1.5,
                fontWeight: 700,
                fontSize: "0.85rem",
                minHeight: 44,
                textTransform: "none",
              },
              "& .Mui-selected": {
                bgcolor: "background.paper",
                boxShadow: 1,
              },
              "& .MuiTabs-indicator": {
                display: "none",
              },
            }}
          >
            <Tab 
              label="Create Organization" 
              icon={<span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_business</span>}
              iconPosition="start"
            />
            <Tab 
              label="Join Existing" 
              icon={<span className="material-symbols-outlined" style={{ fontSize: 18 }}>group_add</span>}
              iconPosition="start"
            />
          </Tabs>
          )}

          {isTrial && (
            <Alert 
              severity="success" 
              sx={{ 
                mb: 3, 
                borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                borderColor: alpha(theme.palette.primary.main, 0.2),
                color: "primary.main",
                border: "1px solid",
                "& .MuiAlert-icon": { color: "primary.main" }
              }}
              icon={<span className="material-symbols-outlined">auto_awesome</span>}
            >
              <Typography variant="body2" fontWeight={800} sx={{ letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.75rem" }}>
                14-Day Free Trial Activated
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                You are signing up for the <strong>{plan}</strong> plan. No credit card required.
              </Typography>
            </Alert>
          )}

          {employeeInvite && (
            <Alert 
              severity="info" 
              sx={{ mb: 3, borderRadius: 2 }}
              icon={<span className="material-symbols-outlined">badge</span>}
            >
              <Typography variant="body2" fontWeight={600}>
                Employee Portal Invitation
              </Typography>
              <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
                <strong>Organization:</strong> {employeeInvite.organizationName}
              </Typography>
              <Typography variant="caption" component="div">
                <strong>Employee:</strong> {employeeInvite.employeeDisplayName}
              </Typography>
              <Typography variant="caption" component="div">
                <strong>Portal Type:</strong>{" "}
                <Chip 
                  label={employeeInvite.portalType === "SUBJECT_PORTAL" ? "Employee (Subject)" : "Contributor"} 
                  size="small" 
                  sx={{ ml: 0.5, height: 20 }} 
                />
              </Typography>
            </Alert>
          )}

          {invitation && !employeeInvite && (
          <Alert 
            severity="success" 
            sx={{ mb: 3, borderRadius: 2 }}
            icon={<span className="material-symbols-outlined">celebration</span>}
          >
            <Typography variant="body2" fontWeight={600}>
              Invitation found!
            </Typography>
            <Typography variant="caption">
              You'll join <strong>{invitation.organizationName}</strong> as <Chip label={invitation.systemRole} size="small" sx={{ ml: 0.5, height: 20 }} />
            </Typography>
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {emailCheckResult?.hasAccount && (
          <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
            <Typography variant="body2" fontWeight={600}>
              Account already exists
            </Typography>
            <Typography variant="caption">
              {emailCheckResult.message}{" "}
              <Link href="/login" style={{ color: "inherit", fontWeight: 600 }}>
                Sign in here
              </Link>
            </Typography>
          </Alert>
        )}

        {emailCheckResult?.invitationExpired && (
          <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
            <Typography variant="body2" fontWeight={600}>
              Invitation expired
            </Typography>
            <Typography variant="caption">
              {emailCheckResult.message}
            </Typography>
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={handleRegister}
          sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
          >
            {!employeeInvite && (
            <>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              onClick={handleGoogleSignUp}
              disabled={loading || emailCheckResult?.hasAccount || (!invitation && activeTab === 1 && !selectedOrg)}
              startIcon={
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  width="18"
                  alt="Google"
                />
              }
              sx={{
                borderRadius: 3,
                py: 1.5,
                fontWeight: 700,
                color: "text.primary",
                borderColor: "divider",
                "&:hover": { bgcolor: "action.hover", borderColor: "divider" },
              }}
            >
              Continue with Google
            </Button>

            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Divider sx={{ flexGrow: 1 }} />
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase" }}
              >
                or use email
              </Typography>
              <Divider sx={{ flexGrow: 1 }} />
            </Box>
            </>
            )}

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                fullWidth
                label="Your Name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                size="small"
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />
              <TextField
                fullWidth
                label="Work Email"
                placeholder="you@company.com"
                type="email"
                value={employeeInvite?.email || email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!!employeeInvite || !!invitation}
                size="small"
                InputProps={{
                  endAdornment: emailCheckLoading ? (
                    <CircularProgress size={20} />
                  ) : emailChecked && !emailCheckResult?.hasAccount ? (
                    <span className="material-symbols-outlined" style={{ color: "#22c55e" }}>
                      check_circle
                    </span>
                  ) : null,
                }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />
              <TextField
                fullWidth
                label="Password"
                type="password"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                size="small"
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />

              {/* Create Organization fields */}
              {!employeeInvite && !invitation && activeTab === 0 && (
                <TextField
                  fullWidth
                  label="Organization Name"
                  placeholder="Acme Inc."
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                  size="small"
                  helperText="You'll be the owner of this organization"
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                />
              )}

              {/* Join Organization fields */}
              {!employeeInvite && !invitation && activeTab === 1 && (
              <>
                <Autocomplete
                  fullWidth
                  options={orgOptions}
                  getOptionLabel={(option) => option.name}
                  onInputChange={(_, val) => searchOrganizations(val)}
                  onChange={(_, val) => setSelectedOrg(val)}
                  loading={orgSearchLoading}
                  size="small"
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Search Organization"
                      placeholder="Start typing organization name..."
                      required
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {orgSearchLoading ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: 1,
                            bgcolor: "primary.main",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontWeight: 700,
                            fontSize: 14,
                          }}
                        >
                          {option.name.charAt(0)}
                        </Box>
                        <Box>
                          <Typography fontWeight={600}>{option.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.slug}
                          </Typography>
                        </Box>
                      </Box>
                    </li>
                  )}
                />

                <FormControl fullWidth size="small">
                  <InputLabel>Requested Role</InputLabel>
                    <Select
                      value={requestedRole}
                      label="Requested Role"
                      onChange={(e) => setRequestedRole(e.target.value as "CONTRIBUTOR" | "ADMIN")}
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value="CONTRIBUTOR">
                        <Box>
                          <Typography fontWeight={600}>Contributor</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Operational access - Approved by Admin or Owner
                          </Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value="ADMIN">
                        <Box>
                          <Typography fontWeight={600}>Admin</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Management access - Requires Owner approval
                          </Typography>
                        </Box>
                      </MenuItem>
                    </Select>
                </FormControl>

                {selectedOrg && (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    <Typography variant="body2">
                      Your request to join <strong>{selectedOrg.name}</strong> as <strong>{requestedRole === "CONTRIBUTOR" ? "Contributor" : "Admin"}</strong> will be sent to the organization's {requestedRole === "ADMIN" ? "owners" : "administrators"} for approval.
                    </Typography>
                  </Alert>
                )}
              </>
            )}
          </Box>

          <Button
              fullWidth
              variant="contained"
              size="large"
              type="submit"
              disabled={loading || emailCheckResult?.hasAccount || (!employeeInvite && !invitation && activeTab === 1 && !selectedOrg)}
              sx={{
                borderRadius: 3,
                py: 1.75,
                fontWeight: 800,
                bgcolor: "primary.main",
                boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.2)}`,
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : employeeInvite ? (
                "Create Account & Access Portal"
              ) : invitation ? (
                "Create Account & Join"
              ) : activeTab === 0 ? (
                "Create Account"
              ) : (
                "Create Account & Request to Join"
              )}
            </Button>

          <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
            By signing up, you agree to our{" "}
            <Box component="span" sx={{ color: "primary.main", cursor: "pointer" }}>
              Terms of Service
            </Box>{" "}
            and{" "}
            <Box component="span" sx={{ color: "primary.main", cursor: "pointer" }}>
              Privacy Policy
            </Box>
          </Typography>

          <Box sx={{ textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{" "}
              <Link href="/login" style={{ textDecoration: "none" }}>
                <Box
                  component="span"
                  sx={{
                    color: "primary.main",
                    fontWeight: 700,
                    cursor: "pointer",
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  Sign in
                </Box>
              </Link>
            </Typography>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}
