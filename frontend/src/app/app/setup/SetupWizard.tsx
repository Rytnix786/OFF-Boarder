"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  alpha,
  useTheme,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { completeOrganizationSetup } from "@/lib/actions/org-setup";

type Props = {
  organization: {
    id: string;
    name: string;
    primaryLocation: string | null;
    timezone: string | null;
    organizationType: string | null;
  };
};

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (US & Canada)" },
  { value: "America/Chicago", label: "Central Time (US & Canada)" },
  { value: "America/Denver", label: "Mountain Time (US & Canada)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)" },
  { value: "America/Anchorage", label: "Alaska" },
  { value: "Pacific/Honolulu", label: "Hawaii" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris, Berlin, Rome" },
  { value: "Europe/Moscow", label: "Moscow" },
  { value: "Asia/Dubai", label: "Dubai" },
  { value: "Asia/Kolkata", label: "India Standard Time" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Asia/Shanghai", label: "Beijing, Shanghai" },
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "Pacific/Auckland", label: "Auckland" },
];

const ORG_TYPES = [
  { value: "COMPANY", label: "Company / Corporation" },
  { value: "STARTUP", label: "Startup" },
  { value: "AGENCY", label: "Agency" },
  { value: "NONPROFIT", label: "Non-Profit Organization" },
  { value: "GOVERNMENT", label: "Government Entity" },
  { value: "EDUCATION", label: "Educational Institution" },
  { value: "HEALTHCARE", label: "Healthcare Organization" },
  { value: "CONTRACTOR", label: "Contractor / Consulting" },
  { value: "OTHER", label: "Other" },
];

const steps = ["Organization Info", "Confirmation"];

export default function SetupWizard({ organization }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [primaryLocation, setPrimaryLocation] = useState(organization.primaryLocation || "");
  const [timezone, setTimezone] = useState(organization.timezone || "");
  const [organizationType, setOrganizationType] = useState(organization.organizationType || "");
  const [confirmed, setConfirmed] = useState(false);

  const handleNext = () => {
    if (activeStep === 0) {
      if (!primaryLocation.trim()) {
        setError("Primary location is required");
        return;
      }
      if (!timezone) {
        setError("Timezone is required");
        return;
      }
      if (!organizationType) {
        setError("Organization type is required");
        return;
      }
    }
    setError(null);
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setError(null);
    setActiveStep((prev) => prev - 1);
  };

  const handleComplete = async () => {
    if (!confirmed) {
      setError("Please confirm the information is correct");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set("primaryLocation", primaryLocation);
    formData.set("timezone", timezone);
    formData.set("organizationType", organizationType);

    const result = await completeOrganizationSetup(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push("/app");
    router.refresh();
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
      <Card
        variant="outlined"
        sx={{
          maxWidth: 600,
          width: "100%",
          borderRadius: 4,
          p: 4,
          boxShadow: `0 20px 40px ${alpha(theme.palette.text.primary, 0.05)}`,
        }}
      >
        <Box sx={{ textAlign: "center", mb: 4 }}>
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
              domain_add
            </span>
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -1 }}>
            Organization Setup
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Complete setup for <strong>{organization.name}</strong>
          </Typography>
        </Box>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {activeStep === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <TextField
              fullWidth
              label="Primary Location / Headquarters"
              placeholder="e.g., New York, USA"
              value={primaryLocation}
              onChange={(e) => setPrimaryLocation(e.target.value)}
              required
              helperText="Where is your organization primarily based?"
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />

            <FormControl fullWidth required>
              <InputLabel>Default Timezone</InputLabel>
              <Select
                value={timezone}
                label="Default Timezone"
                onChange={(e) => setTimezone(e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                {TIMEZONES.map((tz) => (
                  <MenuItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Organization Type</InputLabel>
              <Select
                value={organizationType}
                label="Organization Type"
                onChange={(e) => setOrganizationType(e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                {ORG_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}

        {activeStep === 1 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                Please review your organization details:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                <li><strong>Organization:</strong> {organization.name}</li>
                <li><strong>Primary Location:</strong> {primaryLocation}</li>
                <li><strong>Timezone:</strong> {TIMEZONES.find(tz => tz.value === timezone)?.label || timezone}</li>
                <li><strong>Type:</strong> {ORG_TYPES.find(t => t.value === organizationType)?.label || organizationType}</li>
              </Box>
            </Alert>

            <Box sx={{ bgcolor: "action.hover", p: 2, borderRadius: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2">
                    I confirm that this information is correct and understand that my organization will be ready for use after completing this setup.
                  </Typography>
                }
              />
            </Box>
          </Box>
        )}

        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            sx={{ borderRadius: 2 }}
          >
            Back
          </Button>
          
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleComplete}
              disabled={loading || !confirmed}
              sx={{ borderRadius: 2, px: 4 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "Complete Setup"}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              sx={{ borderRadius: 2, px: 4 }}
            >
              Continue
            </Button>
          )}
        </Box>
      </Card>
    </Box>
  );
}
