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
  { value: "Pacific/Midway", label: "(UTC-11:00) Midway Island, Samoa" },
  { value: "Pacific/Honolulu", label: "(UTC-10:00) Hawaii" },
  { value: "America/Anchorage", label: "(UTC-09:00) Alaska" },
  { value: "America/Los_Angeles", label: "(UTC-08:00) Pacific Time (US & Canada)" },
  { value: "America/Tijuana", label: "(UTC-08:00) Tijuana, Baja California" },
  { value: "America/Denver", label: "(UTC-07:00) Mountain Time (US & Canada)" },
  { value: "America/Phoenix", label: "(UTC-07:00) Arizona" },
  { value: "America/Chihuahua", label: "(UTC-07:00) Chihuahua, La Paz, Mazatlan" },
  { value: "America/Chicago", label: "(UTC-06:00) Central Time (US & Canada)" },
  { value: "America/Mexico_City", label: "(UTC-06:00) Mexico City, Guadalajara" },
  { value: "America/Regina", label: "(UTC-06:00) Saskatchewan" },
  { value: "America/Guatemala", label: "(UTC-06:00) Central America" },
  { value: "America/New_York", label: "(UTC-05:00) Eastern Time (US & Canada)" },
  { value: "America/Bogota", label: "(UTC-05:00) Bogota, Lima, Quito" },
  { value: "America/Indiana/Indianapolis", label: "(UTC-05:00) Indiana (East)" },
  { value: "America/Caracas", label: "(UTC-04:00) Caracas" },
  { value: "America/Halifax", label: "(UTC-04:00) Atlantic Time (Canada)" },
  { value: "America/Santiago", label: "(UTC-04:00) Santiago" },
  { value: "America/La_Paz", label: "(UTC-04:00) La Paz" },
  { value: "America/St_Johns", label: "(UTC-03:30) Newfoundland" },
  { value: "America/Sao_Paulo", label: "(UTC-03:00) Brasilia" },
  { value: "America/Argentina/Buenos_Aires", label: "(UTC-03:00) Buenos Aires" },
  { value: "America/Montevideo", label: "(UTC-03:00) Montevideo" },
  { value: "Atlantic/South_Georgia", label: "(UTC-02:00) Mid-Atlantic" },
  { value: "Atlantic/Azores", label: "(UTC-01:00) Azores" },
  { value: "Atlantic/Cape_Verde", label: "(UTC-01:00) Cape Verde Islands" },
  { value: "UTC", label: "(UTC+00:00) UTC" },
  { value: "Europe/London", label: "(UTC+00:00) London, Dublin, Edinburgh" },
  { value: "Africa/Casablanca", label: "(UTC+00:00) Casablanca, Monrovia" },
  { value: "Europe/Paris", label: "(UTC+01:00) Paris, Berlin, Rome, Madrid" },
  { value: "Europe/Amsterdam", label: "(UTC+01:00) Amsterdam, Brussels, Copenhagen" },
  { value: "Europe/Belgrade", label: "(UTC+01:00) Belgrade, Bratislava, Budapest" },
  { value: "Africa/Lagos", label: "(UTC+01:00) West Central Africa" },
  { value: "Europe/Athens", label: "(UTC+02:00) Athens, Bucharest, Istanbul" },
  { value: "Europe/Helsinki", label: "(UTC+02:00) Helsinki, Kyiv, Riga, Vilnius" },
  { value: "Africa/Cairo", label: "(UTC+02:00) Cairo" },
  { value: "Africa/Johannesburg", label: "(UTC+02:00) Johannesburg, Harare" },
  { value: "Asia/Jerusalem", label: "(UTC+02:00) Jerusalem" },
  { value: "Europe/Moscow", label: "(UTC+03:00) Moscow, St. Petersburg" },
  { value: "Asia/Kuwait", label: "(UTC+03:00) Kuwait, Riyadh" },
  { value: "Africa/Nairobi", label: "(UTC+03:00) Nairobi" },
  { value: "Asia/Baghdad", label: "(UTC+03:00) Baghdad" },
  { value: "Asia/Tehran", label: "(UTC+03:30) Tehran" },
  { value: "Asia/Dubai", label: "(UTC+04:00) Dubai, Abu Dhabi, Muscat" },
  { value: "Asia/Baku", label: "(UTC+04:00) Baku" },
  { value: "Asia/Tbilisi", label: "(UTC+04:00) Tbilisi, Yerevan" },
  { value: "Asia/Kabul", label: "(UTC+04:30) Kabul" },
  { value: "Asia/Karachi", label: "(UTC+05:00) Karachi, Islamabad" },
  { value: "Asia/Tashkent", label: "(UTC+05:00) Tashkent" },
  { value: "Asia/Yekaterinburg", label: "(UTC+05:00) Ekaterinburg" },
  { value: "Asia/Kolkata", label: "(UTC+05:30) Mumbai, Kolkata, New Delhi" },
  { value: "Asia/Colombo", label: "(UTC+05:30) Sri Lanka" },
  { value: "Asia/Kathmandu", label: "(UTC+05:45) Kathmandu" },
  { value: "Asia/Dhaka", label: "(UTC+06:00) Dhaka, Astana" },
  { value: "Asia/Almaty", label: "(UTC+06:00) Almaty, Novosibirsk" },
  { value: "Asia/Yangon", label: "(UTC+06:30) Yangon (Rangoon)" },
  { value: "Asia/Bangkok", label: "(UTC+07:00) Bangkok, Hanoi, Jakarta" },
  { value: "Asia/Krasnoyarsk", label: "(UTC+07:00) Krasnoyarsk" },
  { value: "Asia/Shanghai", label: "(UTC+08:00) Beijing, Shanghai, Hong Kong" },
  { value: "Asia/Singapore", label: "(UTC+08:00) Singapore, Kuala Lumpur" },
  { value: "Asia/Taipei", label: "(UTC+08:00) Taipei" },
  { value: "Australia/Perth", label: "(UTC+08:00) Perth" },
  { value: "Asia/Irkutsk", label: "(UTC+08:00) Irkutsk, Ulaanbaatar" },
  { value: "Asia/Tokyo", label: "(UTC+09:00) Tokyo, Osaka, Sapporo" },
  { value: "Asia/Seoul", label: "(UTC+09:00) Seoul" },
  { value: "Asia/Yakutsk", label: "(UTC+09:00) Yakutsk" },
  { value: "Australia/Adelaide", label: "(UTC+09:30) Adelaide" },
  { value: "Australia/Darwin", label: "(UTC+09:30) Darwin" },
  { value: "Australia/Sydney", label: "(UTC+10:00) Sydney, Melbourne, Canberra" },
  { value: "Australia/Brisbane", label: "(UTC+10:00) Brisbane" },
  { value: "Pacific/Guam", label: "(UTC+10:00) Guam, Port Moresby" },
  { value: "Asia/Vladivostok", label: "(UTC+10:00) Vladivostok" },
  { value: "Pacific/Noumea", label: "(UTC+11:00) Noumea, Solomon Islands" },
  { value: "Asia/Magadan", label: "(UTC+11:00) Magadan" },
  { value: "Pacific/Auckland", label: "(UTC+12:00) Auckland, Wellington" },
  { value: "Pacific/Fiji", label: "(UTC+12:00) Fiji, Marshall Islands" },
  { value: "Asia/Kamchatka", label: "(UTC+12:00) Kamchatka" },
  { value: "Pacific/Tongatapu", label: "(UTC+13:00) Nuku'alofa, Tonga" },
  { value: "Pacific/Apia", label: "(UTC+13:00) Samoa" },
  { value: "Pacific/Kiritimati", label: "(UTC+14:00) Kiritimati (Line Islands)" },
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
