"use client";

import { useState } from "react";
import {
  Dialog,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
  IconButton,
  alpha,
  useTheme,
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
        throw new Error(data.error || "Failed to send message. Please try again later.");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message. Please try again later.");
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
      bgcolor: isDark ? alpha("#fff", 0.03) : alpha("#000", 0.015),
      borderRadius: 1.5,
      transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
      "& fieldset": {
        borderColor: isDark ? alpha("#fff", 0.08) : alpha("#000", 0.1),
        borderWidth: "1px",
      },
      "&:hover fieldset": {
        borderColor: isDark ? alpha("#fff", 0.15) : alpha("#000", 0.2),
      },
      "&.Mui-focused fieldset": {
        borderColor: "#10B981",
        borderWidth: "1.5px",
      },
    },
    "& .MuiInputBase-input": {
      fontSize: "1rem",
      py: 2,
      px: 2.5,
      color: isDark ? "#fff" : "text.primary",
      "&::placeholder": {
        color: isDark ? alpha("#fff", 0.3) : alpha("#000", 0.4),
        opacity: 1,
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
            bgcolor: isDark ? "#0D1117" : "#fff",
            backgroundImage: "none",
            borderRadius: 1.5,
            border: "1px solid",
          borderColor: isDark ? alpha("#fff", 0.08) : alpha("#000", 0.08),
          boxShadow: isDark 
            ? `0 24px 64px -12px rgba(0, 0, 0, 0.8)`
            : `0 24px 64px -12px rgba(0, 0, 0, 0.1)`,
          overflow: "hidden",
          m: 2,
          position: "relative"
        }
      }}
      BackdropProps={{
        sx: {
          bgcolor: isDark ? alpha("#000", 0.85) : alpha("#0F172A", 0.4),
          backdropFilter: "blur(8px)",
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
                borderRadius: "50%",
                bgcolor: alpha("#10B981", 0.1),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 4,
                border: "1px solid",
                borderColor: alpha("#10B981", 0.2),
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 40, color: "#10B981" }}>
                verified_user
              </span>
            </Box>

            <Typography variant="h4" fontWeight={800} sx={{ mb: 2, letterSpacing: -1, color: isDark ? "#fff" : "text.primary" }}>
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
                  borderRadius: 1.5,
                  height: 56,
                  fontWeight: 700,
                  textTransform: "none",
                  bgcolor: "#10B981",
                  "&:hover": { bgcolor: "#059669" }
                }}
              >
              Done
            </Button>
          </MotionBox>
        ) : (
          <MotionBox
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            sx={{ p: 4 }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                <Box sx={{ 
                  width: 64,
                  height: 64,
                  borderRadius: "50%", 
                  bgcolor: alpha("#10B981", 0.1),
                  border: "1px solid",
                  borderColor: alpha("#10B981", 0.2),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span className="material-symbols-outlined" style={{ color: "#10B981", fontSize: 32 }}>
                    shield
                  </span>
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: -0.5, mb: 0.5, color: isDark ? "#fff" : "text.primary" }}>
                    Contact Security Team
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
                    Secure enterprise communication
                  </Typography>
                </Box>
              </Box>
              <IconButton onClick={handleClose} size="small" sx={{ color: "text.secondary", mt: -1 }}>
                <span className="material-symbols-outlined">close</span>
              </IconButton>
            </Box>

              <Box sx={{ 
                bgcolor: alpha("#fff", 0.03), 
                borderRadius: 1.5, 
                p: 2.5, 
                mb: 4,
              border: "1px solid",
              borderColor: alpha("#fff", 0.06),
              display: 'flex',
              gap: 2,
              alignItems: 'flex-start'
            }}>
              <Box sx={{ 
                width: 32, 
                height: 32, 
                borderRadius: "50%", 
                bgcolor: alpha("#10B981", 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                mt: 0.5
              }}>
                <span className="material-symbols-outlined" style={{ color: "#10B981", fontSize: 18 }}>verified</span>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: isDark ? "#fff" : "text.primary", mb: 0.5 }}>
                  Direct Security Access
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", lineHeight: 1.5, display: 'block' }}>
                  This message goes directly to our security team. No sales automation, no marketing funnels.
                </Typography>
              </Box>
            </Box>

              {error && (
                <Box sx={{ 
                  bgcolor: alpha("#EF4444", 0.1), 
                  borderRadius: 1.5, 
                  p: 2.5, 
                  mb: 4,
                border: "1px solid",
                borderColor: alpha("#EF4444", 0.2),
                display: 'flex',
                gap: 2,
                alignItems: 'center'
              }}>
                <Box sx={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: "50%", 
                  bgcolor: alpha("#EF4444", 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span className="material-symbols-outlined" style={{ color: "#EF4444", fontSize: 18 }}>error</span>
                </Box>
                <Typography variant="caption" sx={{ color: "#EF4444", fontWeight: 600 }}>
                  {error}
                </Typography>
              </Box>
            )}

            <Box sx={{ display: "flex", flexDirection: "column", gap: 3.5 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", ml: 0.5 }}>
                      Name
                    </Typography>
                    <TextField
                      placeholder="Hasan"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      fullWidth
                      variant="outlined"
                      sx={inputSx}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", ml: 0.5 }}>
                      Work Email
                    </Typography>
                    <TextField
                      type="email"
                      placeholder="hasan123221@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      fullWidth
                      variant="outlined"
                      sx={inputSx}
                    />
                  </Box>
                </Grid>
              </Grid>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", ml: 0.5 }}>
                  Company Name
                </Typography>
                <TextField
                  placeholder="N/A"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  required
                  fullWidth
                  variant="outlined"
                  sx={inputSx}
                />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", ml: 0.5 }}>
                  Message
                </Typography>
                <TextField
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  fullWidth
                  multiline
                  rows={4}
                  placeholder="I'd like to book a 15-min Offboarding Risk Check. Please"
                  variant="outlined"
                  sx={inputSx}
                />
              </Box>

              <Box sx={{ mt: 1 }}>
                  <Button
                    onClick={handleSubmit}
                    variant="contained"
                    fullWidth
                    disabled={loading}
                    size="large"
                    sx={{ 
                      borderRadius: 1.5,
                      height: 72,
                      fontWeight: 800,
                      textTransform: "none",
                      fontSize: "1.1rem",
                      bgcolor: "#10B981",
                      boxShadow: `0 20px 40px ${alpha("#10B981", 0.2)}`,
                      transition: "all 300ms cubic-bezier(0.22, 1, 0.36, 1)",
                      "&:hover": {
                        bgcolor: "#059669",
                        transform: "translateY(-2px)",
                        boxShadow: `0 24px 48px ${alpha("#10B981", 0.3)}`,
                      },
                      "&.Mui-disabled": {
                        bgcolor: alpha("#10B981", 0.3),
                        color: alpha("#fff", 0.5)
                      }
                    }}
                  >
                  {loading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <CircularProgress size={24} color="inherit" thickness={6} />
                      <span>Sending...</span>
                    </Box>
                  ) : (
                    "Send Secure Message"
                  )}
                </Button>
                <Typography variant="caption" sx={{ 
                  color: "text.secondary", 
                  fontWeight: 600, 
                  display: 'block', 
                  textAlign: 'center',
                  mt: 3,
                  opacity: 0.6
                }}>
                  Response typically within 1 business day.
                </Typography>
              </Box>
            </Box>
          </MotionBox>
        )}
      </AnimatePresence>
    </Dialog>
  );
}
