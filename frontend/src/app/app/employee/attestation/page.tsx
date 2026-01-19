import { getEmployeeAttestation } from "@/lib/actions/employee-portal";
import { requireEmployeeOffboarding } from "@/lib/employee-auth.server";
import AttestationForm from "./AttestationForm";
import { Box, Typography, Alert, Paper, Chip } from "@mui/material";

export default async function EmployeeAttestationPage() {
  await requireEmployeeOffboarding();
  const { attestation, statement, isSigned } = await getEmployeeAttestation();

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Compliance Attestation
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        As part of your offboarding, you must digitally attest to compliance obligations.
      </Typography>

      <Alert severity="warning" sx={{ mb: 4 }}>
        <Typography variant="body2">
          <strong>Important:</strong> This attestation is legally binding. Once signed, it cannot be modified or revoked.
          Please read the statement carefully before signing.
        </Typography>
      </Alert>

      <Paper sx={{ p: 4 }}>
        {isSigned ? (
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  bgcolor: "success.light",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: "#22c55e" }}>
                  verified_user
                </span>
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Attestation Signed
                </Typography>
                <Chip size="small" label="Completed" color="success" />
              </Box>
            </Box>

            <Box sx={{ bgcolor: "action.hover", p: 3, borderRadius: 2, mb: 3 }}>
              <Typography variant="body1" fontStyle="italic">
                "{statement}"
              </Typography>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Signed on:</strong>{" "}
                {attestation?.signedAt
                  ? new Date(attestation.signedAt).toLocaleString()
                  : "—"}
              </Typography>
              {attestation?.ipAddress && (
                <Typography variant="caption" color="text.secondary">
                  IP Address: {attestation.ipAddress}
                </Typography>
              )}
            </Box>
          </Box>
        ) : (
          <AttestationForm statement={statement} />
        )}
      </Paper>
    </Box>
  );
}
