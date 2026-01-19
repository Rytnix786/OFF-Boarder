"use client";

import React, { useState, useEffect, useContext, Suspense } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Card,
  alpha,
  Alert,
  CircularProgress,
  IconButton,
  useTheme,
  LinearProgress,
} from "@mui/material";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ColorModeContext } from "@/theme/ThemeRegistry";

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  
  if (score <= 2) return { score: 25, label: "Weak", color: "#ef4444" };
  if (score <= 3) return { score: 50, label: "Fair", color: "#f59e0b" };
  if (score <= 4) return { score: 75, label: "Good", color: "#22c55e" };
  return { score: 100, label: "Strong", color: "#10b981" };
}

function ResetPasswordContent() {
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  const passwordStrength = getPasswordStrength(password);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSessionReady(true);
      }
    });
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (passwordStrength.score < 50) {
      setError("Please choose a stronger password");
      return;
    }

    setLoading(true);

      try {
        const supabase = createClient();
        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
          setError(error.message);
          return;
        }

        await fetch("/api/sessions/invalidate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "PASSWORD_CHANGED" }),
        });

        setSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 3000);
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
            Set New Password
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontWeight: 500 }}>
            Create a strong password for your account
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {success ? (
          <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
            Password updated successfully! Redirecting to login...
          </Alert>
        ) : !sessionReady ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Verifying reset link...
            </Typography>
          </Box>
        ) : (
          <Box
            component="form"
            onSubmit={handleResetPassword}
            sx={{ display: "flex", flexDirection: "column", gap: 3 }}
          >
            <Box>
              <TextField
                fullWidth
                label="New Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
              />
              {password && (
                <Box sx={{ mt: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={passwordStrength.score}
                      sx={{
                        flex: 1,
                        height: 6,
                        borderRadius: 3,
                        bgcolor: "grey.200",
                        "& .MuiLinearProgress-bar": {
                          bgcolor: passwordStrength.color,
                        },
                      }}
                    />
                    <Typography variant="caption" sx={{ color: passwordStrength.color, fontWeight: 600 }}>
                      {passwordStrength.label}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                    Use 8+ characters with uppercase, lowercase, numbers, and symbols
                  </Typography>
                </Box>
              )}
            </Box>

            <TextField
              fullWidth
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              error={confirmPassword.length > 0 && password !== confirmPassword}
              helperText={confirmPassword.length > 0 && password !== confirmPassword ? "Passwords do not match" : ""}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
            />

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
              {loading ? <CircularProgress size={24} color="inherit" /> : "Update Password"}
            </Button>

            <Box sx={{ textAlign: "center" }}>
              <Link href="/login" style={{ textDecoration: "none" }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: "primary.main",
                    fontWeight: 600,
                    cursor: "pointer",
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  Back to Sign In
                </Typography>
              </Link>
            </Box>
          </Box>
        )}
      </Card>
    </Box>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
