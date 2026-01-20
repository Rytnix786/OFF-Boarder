"use client";

import React, { useState, useContext, Suspense } from "react";
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
  Checkbox,
  FormControlLabel,
  Tooltip,
} from "@mui/material";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient, setRememberMe, clearRememberMe } from "@/lib/supabase/client";
import { ColorModeContext } from "@/theme/ThemeRegistry";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    }>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberDevice, setRememberDevice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
          setRememberMe(rememberDevice);
          
          const supabase = createClient();
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (error) {
            setError(error.message);
            return;
          }

          if (!data.user) {
            setError("Login failed. Please try again.");
            return;
          }

          const response = await fetch("/api/auth/setup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              redirectUrl: redirectUrl || undefined,
              rememberDevice 
            }),
          });

          const result = await response.json();
          
          if (!response.ok) {
            setError(result.error || "Failed to complete login");
            return;
          }

          window.location.href = result.redirectTo || "/app";
      } catch (err) {
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setResetEmailSent(true);
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ""}`,
        },
      });

      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const isDark = theme.palette.mode === "dark";

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
        <IconButton onClick={colorMode.toggleColorMode} size="small">
          <span className="material-symbols-outlined">
            {isDark ? "light_mode" : "dark_mode"}
          </span>
        </IconButton>
      </Box>

      <Card
        variant="outlined"
        sx={{
          maxWidth: 450,
          width: "100%",
          borderRadius: 4,
          p: 5,
          boxShadow: `0 20px 40px ${alpha(theme.palette.text.primary, 0.05)}`,
        }}
      >
        <Box sx={{ textAlign: "center", mb: 4 }}>
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
            {forgotPasswordMode ? "Reset Password" : "Welcome Back"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontWeight: 500 }}>
            {forgotPasswordMode
              ? "Enter your email to receive a reset link"
              : "Sign in to your OffboardHQ account"}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {resetEmailSent && (
          <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
            Password reset link sent! Check your email.
          </Alert>
        )}

        {!forgotPasswordMode ? (
          <Box
            component="form"
            onSubmit={handleLogin}
            sx={{ display: "flex", flexDirection: "column", gap: 3 }}
          >
            <Button
              fullWidth
              variant="outlined"
              size="large"
              onClick={handleGoogleLogin}
              disabled={loading}
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

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                fullWidth
                label="Work Email"
                placeholder="you@company.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
              />
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
              />
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Tooltip
                title="Keep me signed in on this device for 30 days. Your session will still end if your password changes, your role changes, or an admin revokes access."
                arrow
                placement="top"
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rememberDevice}
                      onChange={(e) => setRememberDevice(e.target.checked)}
                      size="small"
                      sx={{
                        color: "text.secondary",
                        "&.Mui-checked": { color: "primary.main" },
                      }}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontWeight: 500, color: "text.secondary" }}>
                      Remember this device
                    </Typography>
                  }
                  sx={{ m: 0 }}
                />
              </Tooltip>
              <Typography
                variant="caption"
                sx={{
                  color: "primary.main",
                  fontWeight: 600,
                  cursor: "pointer",
                  "&:hover": { textDecoration: "underline" },
                }}
                onClick={() => setForgotPasswordMode(true)}
              >
                Forgot password?
              </Typography>
            </Box>

            <Button
              fullWidth
              variant="contained"
              size="large"
              type="submit"
              disabled={loading}
              sx={{
                borderRadius: 3,
                py: 2,
                fontWeight: 800,
                bgcolor: "primary.main",
                boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.2)}`,
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "Sign In"}
            </Button>

            <Box sx={{ textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Don't have an account?{" "}
                <Link href="/register" style={{ textDecoration: "none" }}>
                  <Box
                    component="span"
                    sx={{
                      color: "primary.main",
                      fontWeight: 700,
                      cursor: "pointer",
                      "&:hover": { textDecoration: "underline" },
                    }}
                  >
                    Create one
                  </Box>
                </Link>
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box
            component="form"
            onSubmit={handleForgotPassword}
            sx={{ display: "flex", flexDirection: "column", gap: 3 }}
          >
            <TextField
              fullWidth
              label="Email Address"
              placeholder="you@company.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
            />

            <Button
              fullWidth
              variant="contained"
              size="large"
              type="submit"
              disabled={loading || resetEmailSent}
              sx={{
                borderRadius: 3,
                py: 2,
                fontWeight: 800,
                bgcolor: "primary.main",
                boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.2)}`,
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "Send Reset Link"}
            </Button>

            <Box sx={{ textAlign: "center" }}>
              <Typography
                variant="body2"
                sx={{
                  color: "primary.main",
                  fontWeight: 600,
                  cursor: "pointer",
                  "&:hover": { textDecoration: "underline" },
                }}
                onClick={() => {
                  setForgotPasswordMode(false);
                  setResetEmailSent(false);
                  setError(null);
                }}
              >
                Back to Sign In
              </Typography>
            </Box>
          </Box>
        )}
      </Card>
    </Box>
  );
}
