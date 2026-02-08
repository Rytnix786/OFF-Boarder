"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Button,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Alert,
} from "@mui/material";
import { signAttestation } from "@/lib/actions/employee-portal";

interface AttestationFormProps {
  statement: string;
}

export default function AttestationForm({ statement }: AttestationFormProps) {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSign = async () => {
    if (!agreed) return;

    setLoading(true);
    setError(null);

      try {
        const result = await signAttestation();
        if (result.success) {
          router.push("/app/access-suspended?success=attestation");
          router.refresh();
        } else {
          setError(result.error || "Failed to sign attestation");
        }
      } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            bgcolor: "warning.light",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 32, color: "#f59e0b" }}>
            pending
          </span>
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Attestation Required
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please read and sign the statement below
          </Typography>
        </Box>
      </Box>

      <Box sx={{ bgcolor: "action.hover", p: 3, borderRadius: 2, mb: 3 }}>
        <Typography variant="body1" fontStyle="italic">
          "{statement}"
        </Typography>
      </Box>

      <FormControlLabel
        control={
          <Checkbox
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            color="primary"
          />
        }
        label={
          <Typography variant="body2">
            I have read and understand the above statement. I confirm that it is true and accurate
            to the best of my knowledge.
          </Typography>
        }
        sx={{ mb: 3, alignItems: "flex-start" }}
      />

      <Button
        variant="contained"
        color="primary"
        size="large"
        disabled={!agreed || loading}
        onClick={handleSign}
        startIcon={
          loading ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <span className="material-symbols-outlined">draw</span>
          )
        }
        fullWidth
      >
        {loading ? "Signing..." : "Sign Attestation"}
      </Button>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2, textAlign: "center" }}>
        By clicking "Sign Attestation", you are digitally signing this document.
        This action is recorded and cannot be undone.
      </Typography>
    </Box>
  );
}
