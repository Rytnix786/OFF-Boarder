"use client";

import React, { useState } from "react";
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
  MenuItem,
  Alert,
  CircularProgress,
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
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Asia/Shanghai", label: "China (CST)" },
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "Pacific/Auckland", label: "Auckland" },
  { value: "UTC", label: "UTC" },
];

const ORG_TYPES = [
  { value: "technology", label: "Technology" },
  { value: "healthcare", label: "Healthcare" },
  { value: "finance", label: "Finance & Banking" },
  { value: "education", label: "Education" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "retail", label: "Retail" },
  { value: "consulting", label: "Consulting" },
  { value: "government", label: "Government" },
  { value: "nonprofit", label: "Non-Profit" },
  { value: "other", label: "Other" },
];

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
    organizationType: organization.organizationType || "",
  });

  const isOwner = userRole === "OWNER";

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
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
    formData.organizationType !== (organization.organizationType || "");

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
                    <TextField
                      fullWidth
                      select
                      label="Timezone"
                      value={formData.timezone}
                      onChange={handleChange("timezone")}
                      disabled={!canEdit}
                      required={organization.isSetupComplete}
                      helperText="Primary timezone for scheduling"
                      slotProps={{
                        input: {
                          startAdornment: <TimezoneIcon color="action" sx={{ mr: 1 }} />,
                        },
                      }}
                    >
                      <MenuItem value="">
                        <em>Select timezone...</em>
                      </MenuItem>
                      {TIMEZONES.map((tz) => (
                        <MenuItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      select
                      label="Organization Type"
                      value={formData.organizationType}
                      onChange={handleChange("organizationType")}
                      disabled={!canEdit}
                      required={organization.isSetupComplete}
                      helperText="Industry or sector of your organization"
                      slotProps={{
                        input: {
                          startAdornment: <TypeIcon color="action" sx={{ mr: 1 }} />,
                        },
                      }}
                    >
                      <MenuItem value="">
                        <em>Select type...</em>
                      </MenuItem>
                      {ORG_TYPES.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </TextField>
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
                            organizationType: organization.organizationType || "",
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
