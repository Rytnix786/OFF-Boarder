"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Chip,
  Divider,
  Grid,
  Avatar,
  Alert,
  CircularProgress,
  Autocomplete,
  Paper,
  alpha,
  Popper,
  PopperProps,
  useTheme,
  Stack,
  Fade,
} from "@mui/material";
import {
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  AccessTime as TimezoneIcon,
  Category as TypeIcon,
  Lock as LockIcon,
  Save as SaveIcon,
  WarningAmber as WarningIcon,
} from "@mui/icons-material";
import { updateOrganizationProfile } from "@/lib/actions/organization";
import { useRouter } from "next/navigation";
import { getTimezoneOptions, type TimezoneOption } from "@/lib/data/timezones";
import { ORGANIZATION_TYPES, normalizeOrgType, type OrgTypeOption } from "@/lib/data/organization-types";

type Organization = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  primaryLocation: string | null;
  timezone: string | null;
  organizationType: string | null;
  isSetupComplete: boolean;
  _count: { memberships: number; employees: number; offboardings: number };
};

interface OrganizationClientProps {
  organization: Organization;
  canEdit: boolean;
  userRole: string;
}

// Custom Popper component to ensure consistent placement
const CustomPopper = (props: PopperProps) => (
  <Popper
    {...props}
    placement="bottom-start"
    modifiers={[
      { name: "flip", enabled: false },
      { name: "preventOverflow", enabled: true, options: { boundary: "viewport" } },
    ]}
    sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}
  />
);

export default function OrganizationClient({
  organization,
  canEdit,
  userRole,
}: OrganizationClientProps) {
  const theme = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: organization.name,
    logoUrl: organization.logoUrl || "",
    primaryLocation: organization.primaryLocation || "",
    timezone: organization.timezone || "",
    organizationType: normalizeOrgType(organization.organizationType) || "",
  });

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const isOwner = userRole === "OWNER";

  const timezoneOptions = useMemo(() => getTimezoneOptions(), []);
  const selectedTimezone = useMemo(
    () => timezoneOptions.find(tz => tz.value === formData.timezone) || null,
    [timezoneOptions, formData.timezone]
  );
  const selectedOrgType = useMemo(
    () => ORGANIZATION_TYPES.find(t => t.value === formData.organizationType) || null,
    [formData.organizationType]
  );

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    setSuccess(false);
    setError(null);
  };

  const handleTimezoneChange = (newValue: TimezoneOption | null) => {
    setFormData((prev) => ({ ...prev, timezone: newValue?.value || "" }));
    setSuccess(false);
    setError(null);
  };

  const handleOrgTypeChange = (newValue: OrgTypeOption | null) => {
    setFormData((prev) => ({ ...prev, organizationType: newValue?.value || "" }));
    setSuccess(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const data = new FormData();
    data.append("name", formData.name);
    data.append("logoUrl", formData.logoUrl);
    data.append("primaryLocation", formData.primaryLocation);
    data.append("timezone", formData.timezone);
    data.append("organizationType", formData.organizationType);

    const result = await updateOrganizationProfile(data);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      router.refresh();
    }
    setLoading(false);
  };

  const hasChanges =
    formData.name !== organization.name ||
    formData.logoUrl !== (organization.logoUrl || "") ||
    formData.primaryLocation !== (organization.primaryLocation || "") ||
    formData.timezone !== (organization.timezone || "") ||
    formData.organizationType !== normalizeOrgType(organization.organizationType);

  // Styled components alternatives using sx for better control
  const sectionTitleSx = {
    color: "text.primary",
    fontWeight: 600,
    fontSize: "1.1rem",
    letterSpacing: "-0.01em",
    mb: 1,
  };

  const textFieldSx = {
    '& .MuiInputLabel-root': {
      fontSize: '0.9rem',
      fontWeight: 500,
      color: alpha(theme.palette.text.primary, 0.7),
    },
    '& .MuiOutlinedInput-root': {
      backgroundColor: alpha(theme.palette.background.paper, 0.4),
      transition: theme.transitions.create(['border-color', 'box-shadow', 'background-color']),
      '&:hover': {
        backgroundColor: alpha(theme.palette.background.paper, 0.6),
      },
      '&.Mui-focused': {
        backgroundColor: alpha(theme.palette.background.paper, 0.8),
        boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
      }
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", py: 2 }}>
      <Stack spacing={1} sx={{ mb: 5 }}>
        <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: "-0.02em" }}>
          Organization Settings
        </Typography>
        <Typography color="text.secondary" variant="body1">
          Configure your enterprise identity and regional operations
        </Typography>
      </Stack>

      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <Stack spacing={4}>
            <Card 
              variant="outlined" 
              sx={{ 
                borderRadius: 4, 
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                bgcolor: alpha(theme.palette.background.paper, 0.3),
                backdropFilter: "blur(8px)",
              }}
            >
              <Box sx={{ p: 3, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box sx={{ 
                    p: 1.25, 
                    borderRadius: "12px", 
                    bgcolor: alpha(theme.palette.primary.main, 0.1), 
                    color: "primary.main",
                    display: "flex"
                  }}>
                    <BusinessIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography sx={sectionTitleSx}>
                      Corporate Profile
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Core identity settings for {organization.name}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              <CardContent sx={{ p: 4 }}>
                {!canEdit && (
                  <Fade in={true}>
                    <Alert 
                      severity="info" 
                      icon={<LockIcon fontSize="small" />}
                      sx={{ 
                        mb: 4, 
                        borderRadius: 3, 
                        bgcolor: alpha(theme.palette.info.main, 0.05),
                        border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                        color: "info.main"
                      }}
                    >
                      Administrative permissions are required to modify these enterprise settings.
                    </Alert>
                  </Fade>
                )}

                {error && (
                  <Alert severity="error" sx={{ mb: 4, borderRadius: 3 }}>
                    {error}
                  </Alert>
                )}

                {success && (
                  <Alert severity="success" sx={{ mb: 4, borderRadius: 3 }}>
                    Organization profile updated successfully.
                  </Alert>
                )}

                <form onSubmit={handleSubmit}>
                  <Stack spacing={4}>
                      <Grid container spacing={3}>
                        <Grid item xs={12}>
                          <TextField
                            id="org-name-field"
                            fullWidth
                            label="Organization Name"
                            value={formData.name}
                            onChange={handleChange("name")}
                            disabled={!canEdit}
                            required
                            placeholder="Acme Corp"
                            sx={textFieldSx}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            id="org-slug-field"
                            fullWidth
                            label="Identifier (Slug)"
                            value={organization.slug}
                            disabled
                            helperText="Used for your unique organization URL"
                            sx={{
                              ...textFieldSx,
                              '& .MuiOutlinedInput-root': {
                                ...textFieldSx['& .MuiOutlinedInput-root'],
                                bgcolor: alpha(theme.palette.action.disabledBackground, 0.05),
                              }
                            }}
                            InputProps={{
                              startAdornment: (
                                <Typography 
                                  variant="body2" 
                                  color="text.disabled" 
                                  sx={{ 
                                    mr: 1, 
                                    bgcolor: alpha(theme.palette.action.disabledBackground, 0.1), 
                                    px: 1, 
                                    py: 0.25, 
                                    borderRadius: 1,
                                    fontSize: "0.75rem",
                                    fontWeight: 700
                                  }}
                                >
                                  /org/
                                </Typography>
                              ),
                            }}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            id="org-logo-field"
                            fullWidth
                            label="Logo Asset URL"
                            value={formData.logoUrl}
                            onChange={handleChange("logoUrl")}
                            disabled={!canEdit}
                            placeholder="https://cdn.acme.com/logo.png"
                            helperText="External link to your company logo"
                            sx={textFieldSx}
                          />
                        </Grid>
                      </Grid>


                    <Box>
                      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                        <Typography variant="overline" sx={{ fontWeight: 800, color: "text.disabled", letterSpacing: "0.1em" }}>
                          Regional & Industry Operations
                        </Typography>
                        <Divider sx={{ flex: 1, borderColor: alpha(theme.palette.divider, 0.05) }} />
                      </Stack>

                        <Grid container spacing={3}>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              id="org-location-field"
                              fullWidth
                              label="Operational Headquarters"
                              value={formData.primaryLocation}
                              onChange={handleChange("primaryLocation")}
                              disabled={!canEdit}
                              required={organization.isSetupComplete}
                              placeholder="e.g., London, UK"
                              sx={textFieldSx}
                              InputProps={{
                                startAdornment: (
                                  <LocationIcon fontSize="small" sx={{ mr: 1, color: alpha(theme.palette.text.secondary, 0.5) }} />
                                ),
                              }}
                            />
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <Autocomplete
                              id="org-timezone-autocomplete"
                              value={selectedTimezone}
                              onChange={(_, newValue) => handleTimezoneChange(newValue)}
                              options={timezoneOptions}
                              disabled={!canEdit}
                              getOptionLabel={(option) => `${option.offset} — ${option.label}`}
                              filterOptions={(options, { inputValue }) => {
                                const search = inputValue.toLowerCase();
                                return options.filter(opt => opt.searchTerms.includes(search));
                              }}
                              PopperComponent={CustomPopper}
                              renderOption={(props, option) => {
                                const { key, ...rest } = props as any;
                                return (
                                  <Box component="li" key={option.value} {...rest} sx={{ px: "16px !important", py: "12px !important" }}>
                                    <Stack direction="row" spacing={2} alignItems="center" sx={{ width: "100%" }}>
                                      <Typography 
                                        variant="caption" 
                                        sx={{ 
                                          fontFamily: theme.typography.fontFamily, 
                                          minWidth: 75,
                                          px: 1,
                                          py: 0.5,
                                          borderRadius: 1.5,
                                          bgcolor: alpha(theme.palette.primary.main, 0.05),
                                          color: "primary.main",
                                          fontWeight: 700,
                                          textAlign: "center",
                                          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
                                        }}
                                      >
                                        {option.offset}
                                      </Typography>
                                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{option.label}</Typography>
                                    </Stack>
                                  </Box>
                                );
                              }}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label="Enterprise Timezone"
                                  required={organization.isSetupComplete}
                                  sx={textFieldSx}
                                  InputProps={{
                                    ...params.InputProps,
                                    startAdornment: (
                                      <>
                                        <TimezoneIcon fontSize="small" sx={{ ml: 1, mr: -0.5, color: alpha(theme.palette.text.secondary, 0.5) }} />
                                        {params.InputProps.startAdornment}
                                      </>
                                    ),
                                  }}
                                />
                              )}
                              PaperComponent={(props) => (
                                <Paper {...props} elevation={0} sx={{ mt: 1, borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, overflow: "hidden", boxShadow: theme.shadows[10] }} />
                              )}
                              isOptionEqualToValue={(option, value) => option.value === value.value}
                            />
                          </Grid>

                          <Grid item xs={12}>
                            <Autocomplete
                              id="org-type-autocomplete"
                              value={selectedOrgType}
                              onChange={(_, newValue) => handleOrgTypeChange(newValue)}
                              options={ORGANIZATION_TYPES}
                              disabled={!canEdit}
                              groupBy={(option) => {
                                const labels: Record<string, string> = {
                                  business: "Commercial Entities",
                                  public: "Government & Public Sector",
                                  specialized: "Regulated Industries",
                                };
                                return labels[option.category] || option.category;
                              }}
                              getOptionLabel={(option) => option.label}
                              PopperComponent={CustomPopper}
                              renderOption={(props, option) => {
                                const { key, ...rest } = props as any;
                                return (
                                  <Box component="li" key={option.value} {...rest} sx={{ px: "16px !important", py: "14px !important" }}>
                                    <Stack spacing={0.5}>
                                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                        {option.label}
                                      </Typography>
                                      {option.description && (
                                        <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.8 }}>
                                          {option.description}
                                        </Typography>
                                      )}
                                    </Stack>
                                  </Box>
                                );
                              }}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label="Organization Classification"
                                  required={organization.isSetupComplete}
                                  sx={textFieldSx}
                                  InputProps={{
                                    ...params.InputProps,
                                    startAdornment: (
                                      <>
                                        <TypeIcon fontSize="small" sx={{ ml: 1, mr: -0.5, color: alpha(theme.palette.text.secondary, 0.5) }} />
                                        {params.InputProps.startAdornment}
                                      </>
                                    ),
                                  }}
                                />
                              )}
                              PaperComponent={(props) => (
                                <Paper {...props} elevation={0} sx={{ mt: 1, borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, overflow: "hidden", boxShadow: theme.shadows[10] }} />
                              )}
                              isOptionEqualToValue={(option, value) => option.value === value.value}
                            />
                          </Grid>
                        </Grid>

                    </Box>

                    {canEdit && (
                      <Stack direction="row" spacing={2} sx={{ pt: 2 }}>
                        <Button
                          type="submit"
                          variant="contained"
                          disabled={loading || !hasChanges}
                          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                          sx={{ 
                            px: 4, 
                            py: 1.25, 
                            borderRadius: 2.5, 
                            fontWeight: 700, 
                            boxShadow: theme.shadows[4],
                            '&:not(:disabled):hover': {
                              boxShadow: theme.shadows[8],
                            }
                          }}
                        >
                          {loading ? "Processing..." : "Commit Changes"}
                        </Button>
                        {hasChanges && (
                          <Button
                            type="button"
                            variant="text"
                            onClick={() =>
                              setFormData({
                                name: organization.name,
                                logoUrl: organization.logoUrl || "",
                                primaryLocation: organization.primaryLocation || "",
                                timezone: organization.timezone || "",
                                organizationType: normalizeOrgType(organization.organizationType) || "",
                              })
                            }
                            sx={{ color: "text.secondary", fontWeight: 600 }}
                          >
                            Discard
                          </Button>
                        )}
                      </Stack>
                    )}
                  </Stack>
                </form>
              </CardContent>
            </Card>

            {!isOwner && canEdit && (
              <Alert 
                severity="warning" 
                variant="outlined"
                icon={<WarningIcon fontSize="small" />}
                sx={{ borderRadius: 3, borderColor: alpha(theme.palette.warning.main, 0.2), bgcolor: alpha(theme.palette.warning.main, 0.02) }}
              >
                <Typography variant="body2">
                  <strong>Administrative Notice:</strong> You are currently managing this organization as an Admin. Critical ownership transitions are restricted to the primary account holder.
                </Typography>
              </Alert>
            )}
          </Stack>
        </Grid>

        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            <Card 
              variant="outlined" 
              sx={{ 
                borderRadius: 4, 
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                bgcolor: alpha(theme.palette.background.paper, 0.3),
                backdropFilter: "blur(8px)",
              }}
            >
              <Box sx={{ p: 3, bgcolor: alpha(theme.palette.primary.main, 0.02), borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}` }}>
                <Stack direction="row" spacing={2.5} alignItems="center">
                  <Avatar
                    src={organization.logoUrl || undefined}
                    variant="rounded"
                    sx={{ 
                      width: 60, 
                      height: 60, 
                      bgcolor: alpha(theme.palette.primary.main, 0.1), 
                      color: "primary.main",
                      fontSize: 24,
                      fontWeight: 900,
                      borderRadius: 2.5,
                      border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`
                    }}
                  >
                    {organization.name.charAt(0)}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={800} noWrap sx={{ mb: 0.5 }}>
                      {organization.name}
                    </Typography>
                    <Chip
                      label={organization.status}
                      size="small"
                      sx={{ 
                        height: 22, 
                        fontSize: "0.6rem", 
                        fontWeight: 800, 
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        bgcolor: organization.status === "ACTIVE" ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.warning.main, 0.1),
                        color: organization.status === "ACTIVE" ? "success.main" : "warning.main",
                        border: `1px solid ${alpha(organization.status === "ACTIVE" ? theme.palette.success.main : theme.palette.warning.main, 0.2)}`
                      }}
                    />
                  </Box>
                </Stack>
              </Box>
              
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2.5}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">Current Authority</Typography>
                    <Chip
                      label={userRole}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 700, fontSize: "0.65rem", borderRadius: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.02) }}
                    />
                  </Stack>
                  
                  <Divider sx={{ borderColor: alpha(theme.palette.divider, 0.05) }} />
                  
                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Organization Size</Typography>
                      <Typography variant="body2" fontWeight={700}>{organization._count.memberships} Users</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Security Scope</Typography>
                      <Typography variant="body2" fontWeight={700}>{organization._count.employees} Records</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Processed Flows</Typography>
                      <Typography variant="body2" fontWeight={700}>{organization._count.offboardings} Cases</Typography>
                    </Stack>
                  </Stack>
                  
                  <Divider sx={{ borderColor: alpha(theme.palette.divider, 0.05) }} />
                  
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.disabled">Onboarded</Typography>
                      <Typography variant="caption" fontWeight={700} color="text.secondary">
                        {mounted ? new Date(organization.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : "—"}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.disabled">Last Synchronization</Typography>
                      <Typography variant="caption" fontWeight={700} color="text.secondary">
                        {mounted ? new Date(organization.updatedAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : "—"}
                      </Typography>
                    </Stack>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            {isOwner && (
              <Card 
                variant="outlined" 
                sx={{ 
                  borderRadius: 4, 
                  border: `1px solid ${alpha(theme.palette.error.main, 0.15)}`,
                  bgcolor: alpha(theme.palette.error.main, 0.02),
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    bgcolor: alpha(theme.palette.error.main, 0.04),
                    borderColor: alpha(theme.palette.error.main, 0.3),
                    boxShadow: `0 8px 32px ${alpha(theme.palette.error.main, 0.1)}`,
                  }
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <WarningIcon color="error" sx={{ fontSize: 18 }} />
                      <Typography
                        variant="subtitle2"
                        fontWeight={800}
                        color="error.main"
                        sx={{ textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.7rem" }}
                      >
                        Enterprise Termination
                      </Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.6 }}>
                      Permanently decommission this organization. This will immediately purge all memberships, employee records, and security audit logs.
                    </Typography>
                    <Button 
                      variant="contained" 
                      color="error" 
                      size="medium" 
                      fullWidth
                      disabled 
                      sx={{ 
                        borderRadius: 2.5, 
                        fontWeight: 800, 
                        py: 1,
                        bgcolor: alpha(theme.palette.error.main, 0.1),
                        color: theme.palette.error.main,
                        boxShadow: "none",
                        '&:hover': {
                          bgcolor: alpha(theme.palette.error.main, 0.2),
                        }
                      }}
                    >
                      Delete Organization
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
