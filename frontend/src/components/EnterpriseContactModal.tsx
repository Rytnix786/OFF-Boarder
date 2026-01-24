"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  alpha,
  useTheme,
  InputLabel,
  FormControl,
  Grid,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";

interface EnterpriseContactModalProps {
  open: boolean;
  onClose: () => void;
  initialMessage?: string;
}

const MotionBox = motion.create(Box);

export function EnterpriseContactModal({
  open,
  onClose,
  initialMessage = "",
}: EnterpriseContactModalProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState(initialMessage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!name || !email || !company || !message) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/enterprise/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, message }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setName("");
      setEmail("");
      setCompany("");
      setMessage(initialMessage);
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      bgcolor: isDark ? alpha("#fff", 0.02) : alpha("#000", 0.01),
      borderRadius: 2,
      transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
      "& fieldset": {
        borderColor: isDark ? alpha("#fff", 0.1) : alpha("#000", 0.1),
        borderWidth: "1px",
      },
      "&:hover fieldset": {
        borderColor: isDark ? alpha("#fff", 0.2) : alpha("#000", 0.2),
      },
      "&.Mui-focused fieldset": {
        borderColor: theme.palette.primary.main,
        borderWidth: "1px",
        boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.12)}`,
      },
    },
    "& .MuiInputBase-input": {
      fontSize: "0.95rem",
      py: 1.75,
      px: 2,
    },
    "& .MuiInputLabel-root": {
      fontSize: "0.85rem",
      fontWeight: 600,
      color: "text.secondary",
      transform: "none",
      position: "relative",
      mb: 1,
      "&.Mui-focused": {
        color: "primary.main",
      },
    },
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: isDark ? "#0A0D14" : "#fff",
          backgroundImage: isDark 
            ? `radial-gradient(circle at 50% -20%, ${alpha(theme.palette.primary.main, 0.15)} 0%, transparent 70%)`
            : "none",
          borderRadius: 4,
          border: "1px solid",
          borderColor: isDark ? alpha("#fff", 0.08) : alpha("#000", 0.08),
          boxShadow: isDark 
            ? `0 24px 64px -12px rgba(0, 0, 0, 0.8), inset 0 1px 1px ${alpha("#fff", 0.05)}`
            : `0 24px 64px -12px rgba(0, 0, 0, 0.1)`,
          overflow: "hidden",
          m: 2
        }
      }}
      BackdropProps={{
        sx: {
          bgcolor: isDark ? alpha("#000", 0.8) : alpha("#0F172A", 0.4),
          backdropFilter: "blur(12px)",
        }
      }}
    >
      <AnimatePresence mode="wait">
        {success ? (
          <MotionBox
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            sx={{ p: { xs: 4, md: 8 }, textAlign: "center" }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: 4,
                bgcolor: alpha(theme.palette.success.main, 0.1),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 4,
                border: "1px solid",
                borderColor: alpha(theme.palette.success.main, 0.2),
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 40, color: theme.palette.success.main }}>
                verified_user
              </span>
            </Box>

            <Typography variant="h4" fontWeight={800} sx={{ mb: 2, letterSpacing: -1 }}>
              Securely Received
            </Typography>
            <Typography variant="body1" sx={{ color: "text.secondary", mb: 6, lineHeight: 1.6, maxWidth: 360, mx: "auto" }}>
              Our security team has been notified. We’ll respond as soon as possible.
            </Typography>

            <Button
              onClick={handleClose}
              variant="contained"
              fullWidth
              size="large"
              sx={{ 
                borderRadius: 2,
                height: 56,
                fontWeight: 700,
                textTransform: "none",
              }}
            >
              Back to Overview
            </Button>
          </MotionBox>
        ) : (
          <MotionBox
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <DialogTitle sx={{ p: 4, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                <Box sx={{ 
                  width: 52,
                  height: 52,
                  borderRadius: 2, 
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  border: "1px solid",
                  borderColor: alpha(theme.palette.primary.main, 0.2),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span className="material-symbols-outlined" style={{ color: theme.palette.primary.main, fontSize: 28 }}>
                    security
                  </span>
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: -1, mb: 0.5 }}>
                    Contact Security Team
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
                    Routes directly to Platform Admin Security.
                  </Typography>
                </Box>
              </Box>
              <IconButton onClick={handleClose} size="small" sx={{ color: "text.secondary" }}>
                <span className="material-symbols-outlined">close</span>
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 4, pt: 1 }}>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 4 }}>
                No marketing automation. Dedicated enterprise support.
              </Typography>

              {error && (
                <Alert severity="error" variant="outlined" sx={{ mb: 4, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <Grid container spacing={2.5}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel shrink>Name</InputLabel>
                      <TextField
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        fullWidth
                        variant="outlined"
                        sx={inputSx}
                      />
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel shrink>Work Email</InputLabel>
                      <TextField
                        type="email"
                        placeholder="name@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        fullWidth
                        variant="outlined"
                        sx={inputSx}
                      />
                    </FormControl>
                  </Grid>
                </Grid>

                <FormControl fullWidth>
                  <InputLabel shrink>Company Name</InputLabel>
                  <TextField
                    placeholder="Organization name"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    required
                    fullWidth
                    variant="outlined"
                    sx={inputSx}
                  />
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel shrink>Message</InputLabel>
                  <TextField
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    fullWidth
                    multiline
                    rows={4}
                    placeholder="How can our security team help you?"
                    variant="outlined"
                    sx={inputSx}
                  />
                </FormControl>
              </Box>
            </DialogContent>

            <DialogActions sx={{ p: 4, pt: 0, flexDirection: 'column', gap: 2 }}>
              <Button
                onClick={handleSubmit}
                variant="contained"
                fullWidth
                disabled={loading || !name || !email || !company || !message}
                size="large"
                sx={{ 
                  borderRadius: 2,
                  height: 60,
                  fontWeight: 800,
                  textTransform: "none",
                  fontSize: "1.05rem",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: `0 12px 24px ${alpha(theme.palette.primary.main, 0.25)}`,
                  transition: "all 300ms cubic-bezier(0.22, 1, 0.36, 1)",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: `0 16px 32px ${alpha(theme.palette.primary.main, 0.4)}`,
                  }
                }}
              >
                {loading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CircularProgress size={20} color="inherit" thickness={6} />
                    <span>Sending Secure Message...</span>
                  </Box>
                ) : (
                  <>
                    <Box
                      component="span"
                      sx={{
                        position: "absolute",
                        top: 0,
                        left: "-100%",
                        width: "100%",
                        height: "100%",
                        background: `linear-gradient(90deg, transparent, ${alpha("#fff", 0.2)}, transparent)`,
                        animation: "shimmer 3s infinite",
                        "@keyframes shimmer": {
                          "0%": { left: "-100%" },
                          "100%": { left: "100%" }
                        }
                      }}
                    />
                    Send Secure Message
                  </>
                )}
              </Button>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
                We’ll respond as soon as possible.
              </Typography>
            </DialogActions>
          </MotionBox>
        )}
      </AnimatePresence>
    </Dialog>
  );
}
