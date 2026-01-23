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
} from "@mui/material";

interface EnterpriseContactModalProps {
  open: boolean;
  onClose: () => void;
  initialMessage?: string;
}

export function EnterpriseContactModal({
  open,
  onClose,
  initialMessage = "",
}: EnterpriseContactModalProps) {
  const theme = useTheme();
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

  if (success) {
    return (
      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth="xs" 
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#0f172a",
            backgroundImage: "none",
            borderRadius: 4,
            border: "1px solid",
            borderColor: alpha("#ffffff", 0.1),
          }
        }}
      >
        <DialogContent sx={{ textAlign: "center", py: 6 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              bgcolor: alpha(theme.palette.success.main, 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 3,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 32, color: theme.palette.success.main }}
            >
              check_circle
            </span>
          </Box>

          <Typography variant="h5" fontWeight={800} sx={{ color: "white", mb: 1 }}>
            Message Delivered
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 4 }}>
            Your inquiry has been sent directly to our security team. 
            We'll get back to you at <strong>{email}</strong> shortly.
          </Typography>

          <Button
            onClick={handleClose}
            variant="contained"
            fullWidth
            size="large"
            sx={{ 
              borderRadius: 2,
              bgcolor: "white",
              color: "black",
              fontWeight: 700,
              textTransform: "none",
              "&:hover": { bgcolor: alpha("#ffffff", 0.9) }
            }}
          >
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: "#0f172a",
          backgroundImage: "none",
          borderRadius: 4,
          border: "1px solid",
          borderColor: alpha("#ffffff", 0.1),
        }
      }}
    >
      <DialogTitle sx={{ p: 3, pb: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ 
            p: 1, 
            borderRadius: 1.5, 
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span className="material-symbols-outlined" style={{ color: theme.palette.primary.main }}>
              security
            </span>
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ color: "white", letterSpacing: -0.5 }}>
              Contact Security Team
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
              Secure enterprise communication
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={handleClose} size="small" sx={{ color: "text.secondary" }}>
          <span className="material-symbols-outlined">close</span>
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: alpha("#ffffff", 0.03), border: "1px solid", borderColor: alpha("#ffffff", 0.05) }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: theme.palette.primary.main, marginTop: 2 }}>
              info
            </span>
            <Box>
              <Typography variant="body2" sx={{ color: "white", fontWeight: 600, mb: 0.5 }}>
                Direct Security Access
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: 'block' }}>
                This message goes directly to our security team. No sales automation, no marketing funnels.
              </Typography>
            </Box>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              label="Name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
              variant="outlined"
            />
            <TextField
              label="Work Email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              variant="outlined"
            />
          </Box>

          <TextField
            label="Company Name"
            placeholder="Organization name"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
            fullWidth
            variant="outlined"
          />

          <TextField
            label="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            fullWidth
            multiline
            rows={5}
            placeholder="How can our security team help you?"
            variant="outlined"
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button
          onClick={handleSubmit}
          variant="contained"
          fullWidth
          disabled={loading || !name || !email || !company || !message}
          size="large"
          sx={{ 
            borderRadius: 2,
            height: 56,
            fontWeight: 700,
            textTransform: "none",
            fontSize: "1rem",
            boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.2)}`,
            "&.Mui-disabled": {
              bgcolor: alpha("#ffffff", 0.05),
              color: alpha("#ffffff", 0.3)
            }
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CircularProgress size={20} color="inherit" />
              <span>Sending...</span>
            </Box>
          ) : (
            "Send Secure Message"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
