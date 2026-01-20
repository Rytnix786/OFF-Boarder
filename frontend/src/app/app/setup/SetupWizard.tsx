"use client";

import { useState, useMemo } from "react";
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
  Alert,
  CircularProgress,
  alpha,
  useTheme,
  Checkbox,
  FormControlLabel,
  Autocomplete,
  Chip,
  Paper,
} from "@mui/material";
import { completeOrganizationSetup } from "@/lib/actions/org-setup";
import { getTimezoneOptions, getTimezoneDisplay } from "@/lib/data/timezones";
import { ORGANIZATION_TYPES, getOrgTypeLabel, normalizeOrgType } from "@/lib/data/organization-types";

type Props = {
  organization: {
    id: string;
    name: string;
    primaryLocation: string | null;
    timezone: string | null;
    organizationType: string | null;
  };
};

const steps = ["Organization Info", "Confirmation"];

export default function SetupWizard({ organization }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [primaryLocation, setPrimaryLocation] = useState(organization.primaryLocation || "");
  const [timezone, setTimezone] = useState(organization.timezone || "");
  const [organizationType, setOrganizationType] = useState(normalizeOrgType(organization.organizationType) || "");
  const [confirmed, setConfirmed] = useState(false);

  const timezoneOptions = useMemo(() => getTimezoneOptions(), []);
  const selectedTimezone = useMemo(
    () => timezoneOptions.find(tz => tz.value === timezone) || null,
    [timezoneOptions, timezone]
  );
  const selectedOrgType = useMemo(
    () => ORGANIZATION_TYPES.find(t => t.value === organizationType) || null,
    [organizationType]
  );

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

            <Autocomplete
              value={selectedTimezone}
              onChange={(_, newValue) => setTimezone(newValue?.value || "")}
              options={timezoneOptions}
              getOptionLabel={(option) => `${option.offset} — ${option.label}`}
              filterOptions={(options, { inputValue }) => {
                const search = inputValue.toLowerCase();
                return options.filter(opt => opt.searchTerms.includes(search));
              }}
              renderOption={(props, option) => {
                const { key: _key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key: string };
                return (
                  <Box component="li" key={option.value} {...rest}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
                      <Chip 
                        label={option.offset} 
                        size="small" 
                        sx={{ 
                          fontFamily: "monospace", 
                          minWidth: 90,
                          bgcolor: "action.selected",
                        }} 
                      />
                      <Typography variant="body2">{option.label}</Typography>
                    </Box>
                  </Box>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Default Timezone"
                  required
                  placeholder="Search by city, region, or UTC offset..."
                  helperText="Type to search timezones (e.g., 'New York', 'UTC+5', 'Tokyo')"
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                />
              )}
              PaperComponent={(props) => (
                <Paper {...props} sx={{ borderRadius: 2, mt: 0.5 }} />
              )}
              isOptionEqualToValue={(option, value) => option.value === value.value}
            />

            <Autocomplete
              value={selectedOrgType}
              onChange={(_, newValue) => setOrganizationType(newValue?.value || "")}
              options={ORGANIZATION_TYPES}
              groupBy={(option) => {
                const labels: Record<string, string> = {
                  business: "Business",
                  public: "Public Sector",
                  specialized: "Specialized Industries",
                };
                return labels[option.category] || option.category;
              }}
              getOptionLabel={(option) => option.label}
              filterOptions={(options, { inputValue }) => {
                const search = inputValue.toLowerCase();
                return options.filter(opt =>
                  opt.label.toLowerCase().includes(search) ||
                  opt.value.toLowerCase().includes(search) ||
                  opt.description?.toLowerCase().includes(search)
                );
              }}
              renderOption={(props, option) => {
                const { key: _key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key: string };
                return (
                  <Box component="li" key={option.value} {...rest}>
                    <Box sx={{ display: "flex", flexDirection: "column" }}>
                      <Typography variant="body2" fontWeight={500}>
                        {option.label}
                      </Typography>
                      {option.description && (
                        <Typography variant="caption" color="text.secondary">
                          {option.description}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Organization Type"
                  required
                  placeholder="Search by industry type..."
                  helperText="Select your industry to get recommended organizational structure"
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                />
              )}
              PaperComponent={(props) => (
                <Paper {...props} sx={{ borderRadius: 2, mt: 0.5 }} />
              )}
              isOptionEqualToValue={(option, value) => option.value === value.value}
            />
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
                <li><strong>Timezone:</strong> {timezone ? getTimezoneDisplay(timezone) : "Not selected"}</li>
                <li><strong>Type:</strong> {getOrgTypeLabel(organizationType) || "Not selected"}</li>
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
