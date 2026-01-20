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
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
                <BusinessIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>
                  Organization Profile
                </Typography>
              </Box>

              {!canEdit && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <LockIcon fontSize="small" />
                    <Typography variant="body2">
                      Only organization Owners and Admins can edit these settings.
                    </Typography>
                  </Box>
                </Alert>
              )}

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert severity="success" sx={{ mb: 3 }}>
                  Organization profile updated successfully!
                </Alert>
              )}

              <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Organization Name"
                      value={formData.name}
                      onChange={handleChange("name")}
                      disabled={!canEdit}
                      required
                      helperText="The display name of your organization"
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Slug (URL Identifier)"
                      value={organization.slug}
                      disabled
                      helperText="Organization slug cannot be changed after creation"
                      slotProps={{
                        input: {
                          startAdornment: (
                            <Typography color="text.secondary" sx={{ mr: 0.5 }}>
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
                      helperText="URL to your organization's logo image"
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <Divider sx={{ my: 1 }}>
                      <Chip label="Location & Time" size="small" />
                    </Divider>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Primary Location / HQ"
                      value={formData.primaryLocation}
                      onChange={handleChange("primaryLocation")}
                      disabled={!canEdit}
                      required={organization.isSetupComplete}
                      placeholder="e.g., San Francisco, CA"
                      helperText="Main office or headquarters location"
                      slotProps={{
                        input: {
                          startAdornment: <LocationIcon color="action" sx={{ mr: 1 }} />,
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
                  <Box component="li" key={option.value} {...rest}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%" }}>
                      <Chip 
                        label={option.offset} 
                        size="small" 
                        sx={{ 
                          fontFamily: "monospace", 
                          fontSize: "0.7rem",
                          minWidth: 80,
                          bgcolor: "action.selected",
                        }} 
                      />
                      <Typography variant="body2" noWrap>{option.label}</Typography>
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
                                <>
                                  <TimezoneIcon color="action" sx={{ ml: 0 }} />
                                  {params.InputProps.startAdornment}
                                </>
                              ),
                            },
                          }}
                        />
                      )}
                      PaperComponent={(props) => (
                        <Paper {...props} sx={{ borderRadius: 2, mt: 0.5 }} />
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
                          required={organization.isSetupComplete}
                          placeholder="Search industry..."
                          helperText="Industry or sector of your organization"
                          slotProps={{
                            input: {
                              ...params.InputProps,
                              startAdornment: (
                                <>
                                  <TypeIcon color="action" sx={{ ml: 0 }} />
                                  {params.InputProps.startAdornment}
                                </>
                              ),
                            },
                          }}
                        />
                      )}
                      PaperComponent={(props) => (
                        <Paper {...props} sx={{ borderRadius: 2, mt: 0.5 }} />
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
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                <Avatar
                  src={organization.logoUrl || undefined}
                  sx={{ width: 64, height: 64, bgcolor: "primary.main", fontSize: 28 }}
                >
                  {organization.name.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    {organization.name}
                  </Typography>
                  <Chip
                    label={organization.status}
                    size="small"
                    color={organization.status === "ACTIVE" ? "success" : "warning"}
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    Your Role
                  </Typography>
                  <Chip
                    label={userRole}
                    size="small"
                    color={userRole === "OWNER" ? "primary" : "default"}
                  />
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    Members
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {organization._count.memberships}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    Employees
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {organization._count.employees}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    Offboardings
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {organization._count.offboardings}
                  </Typography>
                </Box>
                <Divider />
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    Created
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {new Date(organization.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    Last Updated
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {new Date(organization.updatedAt).toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {isOwner && (
            <Card variant="outlined" sx={{ borderRadius: 3, mt: 3, bgcolor: "error.50" }}>
              <CardContent sx={{ p: 3 }}>
                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  color="error.main"
                  gutterBottom
                >
                  Danger Zone
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Deleting your organization is permanent and cannot be undone.
                </Typography>
                <Button variant="outlined" color="error" size="small" disabled>
                  Delete Organization
                </Button>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
