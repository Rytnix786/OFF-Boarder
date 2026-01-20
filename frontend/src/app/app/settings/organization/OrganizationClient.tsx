"use client";

import React, { useState, useMemo } from "react";
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
} from "@mui/material";
import {
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  AccessTime as TimezoneIcon,
  Category as TypeIcon,
  Lock as LockIcon,
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

export default function OrganizationClient({
  organization,
  canEdit,
  userRole,
}: OrganizationClientProps) {
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

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800}>
          Organization Settings
        </Typography>
        <Typography color="text.secondary">
          Manage your organization profile and preferences
        </Typography>
      </Box>

      <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card variant="outlined" sx={{ borderRadius: 4, overflow: "hidden" }}>
              <Box sx={{ p: 3, borderBottom: "1px solid", borderColor: "divider", bgcolor: "rgba(255, 255, 255, 0.02)" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box sx={{ 
                    p: 1, 
                    borderRadius: 2, 
                    bgcolor: "primary.main", 
                    color: "primary.contrastText",
                    display: "flex"
                  }}>
                    <BusinessIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                      Organization Profile
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Update your company information and regional settings
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <CardContent sx={{ p: 4 }}>
                {!canEdit && (
                  <Alert severity="info" variant="outlined" sx={{ mb: 4, borderRadius: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <LockIcon fontSize="small" />
                      <Typography variant="body2">
                        Only organization Owners and Admins can edit these settings.
                      </Typography>
                    </Box>
                  </Alert>
                )}

                {error && (
                  <Alert severity="error" variant="filled" sx={{ mb: 4, borderRadius: 2 }}>
                    {error}
                  </Alert>
                )}

                {success && (
                  <Alert severity="success" variant="outlined" sx={{ mb: 4, borderRadius: 2 }}>
                    Organization profile updated successfully!
                  </Alert>
                )}

                <form onSubmit={handleSubmit}>
                  <Grid container spacing={4}>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="Organization Name"
                        value={formData.name}
                        onChange={handleChange("name")}
                        disabled={!canEdit}
                        required
                        placeholder="Acme Corp"
                        slotProps={{
                          input: {
                            startAdornment: (
                              <Box sx={{ mr: 1.5, color: "text.secondary", display: "flex" }}>
                                <BusinessIcon fontSize="small" />
                              </Box>
                            )
                          }
                        }}
                      />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="Slug (URL Identifier)"
                        value={organization.slug}
                        disabled
                        slotProps={{
                          input: {
                            startAdornment: (
                              <Typography 
                                variant="body2" 
                                color="text.secondary" 
                                sx={{ 
                                  mr: 1, 
                                  bgcolor: "action.hover", 
                                  px: 1, 
                                  py: 0.5, 
                                  borderRadius: 1,
                                  fontSize: "0.75rem",
                                  fontWeight: 600
                                }}
                              >
                                /org/
                              </Typography>
                            ),
                          },
                        }}
                      />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="Logo URL"
                        value={formData.logoUrl}
                        onChange={handleChange("logoUrl")}
                        disabled={!canEdit}
                        placeholder="https://example.com/logo.png"
                        helperText="Provide a URL to your company logo"
                      />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2, my: 1 }}>
                        <Typography variant="subtitle2" sx={{ whiteSpace: "nowrap", color: "text.secondary", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.7rem" }}>
                          Regional & Industry
                        </Typography>
                        <Divider sx={{ flex: 1 }} />
                      </Box>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Primary Location"
                        value={formData.primaryLocation}
                        onChange={handleChange("primaryLocation")}
                        disabled={!canEdit}
                        required={organization.isSetupComplete}
                        placeholder="e.g., San Francisco, CA"
                        slotProps={{
                          input: {
                            startAdornment: (
                              <Box sx={{ mr: 1, color: "text.secondary", display: "flex" }}>
                                <LocationIcon fontSize="small" />
                              </Box>
                            ),
                          },
                        }}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Autocomplete
                        value={selectedTimezone}
                        onChange={(_, newValue) => handleTimezoneChange(newValue)}
                        options={timezoneOptions}
                        disabled={!canEdit}
                        getOptionLabel={(option) => `${option.offset} — ${option.label}`}
                        filterOptions={(options, { inputValue }) => {
                          const search = inputValue.toLowerCase();
                          return options.filter(opt => opt.searchTerms.includes(search));
                        }}
                        renderOption={(props, option) => {
                          const { key: _key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key: string };
                          return (
                            <Box component="li" key={option.value} {...rest} sx={{ px: "12px !important", py: "8px !important" }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    fontFamily: "monospace", 
                                    minWidth: 70,
                                    px: 1,
                                    py: 0.25,
                                    borderRadius: 1,
                                    bgcolor: "action.hover",
                                    color: "text.secondary",
                                    textAlign: "center",
                                    border: "1px solid",
                                    borderColor: "divider"
                                  }}
                                >
                                  {option.offset}
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>{option.label}</Typography>
                              </Box>
                            </Box>
                          );
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Timezone"
                            required={organization.isSetupComplete}
                            placeholder="Search timezone..."
                            helperText="Primary timezone for scheduling"
                            slotProps={{
                              input: {
                                ...params.InputProps,
                                startAdornment: (
                                  <Box sx={{ display: "flex", alignItems: "center", pl: 1, color: "text.secondary" }}>
                                    <TimezoneIcon fontSize="small" />
                                    {params.InputProps.startAdornment}
                                  </Box>
                                ),
                              },
                            }}
                          />
                        )}
                        PaperComponent={(props) => (
                          <Paper {...props} variant="outlined" sx={{ mt: 1, boxShadow: (t) => t.shadows[10] }} />
                        )}
                        isOptionEqualToValue={(option, value) => option.value === value.value}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Autocomplete
                        value={selectedOrgType}
                        onChange={(_, newValue) => handleOrgTypeChange(newValue)}
                        options={ORGANIZATION_TYPES}
                        disabled={!canEdit}
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
                            <Box component="li" key={option.value} {...rest} sx={{ px: "12px !important", py: "8px !important" }}>
                              <Box sx={{ display: "flex", flexDirection: "column" }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
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
                            required={organization.isSetupComplete}
                            placeholder="Search industry..."
                            helperText="Industry or sector of your organization"
                            slotProps={{
                              input: {
                                ...params.InputProps,
                                startAdornment: (
                                  <Box sx={{ display: "flex", alignItems: "center", pl: 1, color: "text.secondary" }}>
                                    <TypeIcon fontSize="small" />
                                    {params.InputProps.startAdornment}
                                  </Box>
                                ),
                              },
                            }}
                          />
                        )}
                        PaperComponent={(props) => (
                          <Paper {...props} variant="outlined" sx={{ mt: 1, boxShadow: (t) => t.shadows[10] }} />
                        )}
                        isOptionEqualToValue={(option, value) => option.value === value.value}
                      />
                    </Grid>
                </Grid>

                {canEdit && (
                  <Box sx={{ mt: 4, display: "flex", gap: 2 }}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading || !hasChanges}
                      startIcon={loading ? <CircularProgress size={16} /> : null}
                    >
                      {loading ? "Saving..." : "Save Changes"}
                    </Button>
                    {hasChanges && (
                      <Button
                        type="button"
                        variant="outlined"
                        onClick={() =>
                          setFormData({
                            name: organization.name,
                            logoUrl: organization.logoUrl || "",
                            primaryLocation: organization.primaryLocation || "",
                            timezone: organization.timezone || "",
                            organizationType: normalizeOrgType(organization.organizationType) || "",
                          })
                        }
                      >
                        Cancel
                      </Button>
                    )}
                  </Box>
                )}
              </form>
            </CardContent>
          </Card>

          {!isOwner && canEdit && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              As an Admin, you can edit organization settings. Some actions may be
              restricted to the Organization Owner.
            </Alert>
          )}
        </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Card variant="outlined" sx={{ borderRadius: 4, overflow: "hidden" }}>
                <Box sx={{ p: 3, bgcolor: "rgba(255, 255, 255, 0.02)", borderBottom: "1px solid", borderColor: "divider" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar
                      src={organization.logoUrl || undefined}
                      variant="rounded"
                      sx={{ 
                        width: 56, 
                        height: 56, 
                        bgcolor: "primary.main", 
                        fontSize: 24,
                        fontWeight: 800,
                        borderRadius: 2,
                        boxShadow: (t) => t.shadows[4]
                      }}
                    >
                      {organization.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={800} noWrap>
                        {organization.name}
                      </Typography>
                      <Chip
                        label={organization.status}
                        size="small"
                        color={organization.status === "ACTIVE" ? "success" : "warning"}
                        sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase" }}
                      />
                    </Box>
                  </Box>
                </Box>
                
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body2" color="text.secondary">Your Role</Typography>
                      <Chip
                        label={userRole}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600, fontSize: "0.7rem" }}
                      />
                    </Box>
                    
                    <Divider sx={{ borderStyle: "dashed" }} />
                    
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body2" color="text.secondary">Total Members</Typography>
                      <Typography variant="body2" fontWeight={700}>{organization._count.memberships}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body2" color="text.secondary">Active Employees</Typography>
                      <Typography variant="body2" fontWeight={700}>{organization._count.employees}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body2" color="text.secondary">Offboardings</Typography>
                      <Typography variant="body2" fontWeight={700}>{organization._count.offboardings}</Typography>
                    </Box>
                    
                    <Divider sx={{ borderStyle: "dashed" }} />
                    
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="caption" color="text.secondary">Created</Typography>
                        <Typography variant="caption" fontWeight={600}>
                          {new Date(organization.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="caption" color="text.secondary">Last Updated</Typography>
                        <Typography variant="caption" fontWeight={600}>
                          {new Date(organization.updatedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {isOwner && (
                <Card variant="outlined" sx={{ 
                  borderRadius: 4, 
                  border: "1px solid", 
                  borderColor: alpha("#EF4444", 0.2),
                  bgcolor: alpha("#EF4444", 0.02)
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                      <Typography
                        variant="subtitle2"
                        fontWeight={800}
                        color="error.main"
                        sx={{ textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.75rem" }}
                      >
                        Danger Zone
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                      Deleting your organization will permanently remove all data, including employees, assets, and audit logs. This action cannot be undone.
                    </Typography>
                    <Button 
                      variant="outlined" 
                      color="error" 
                      size="small" 
                      fullWidth
                      disabled 
                      sx={{ borderRadius: 2, fontWeight: 700 }}
                    >
                      Delete Organization
                    </Button>
                  </CardContent>
                </Card>
              )}
            </Box>
          </Grid>
      </Grid>
    </Box>
  );
}
