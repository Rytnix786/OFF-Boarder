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
} from "@mui/material";
import { updateOrganization } from "@/lib/actions/organization";
import { useRouter } from "next/navigation";

type Organization = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  status: string;
  createdAt: Date;
  _count: { memberships: number; employees: number; offboardings: number };
};

interface OrganizationClientProps {
  organization: Organization;
  canEdit: boolean;
}

export default function OrganizationClient({ organization, canEdit }: OrganizationClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const result = await updateOrganization(formData);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800}>Organization Settings</Typography>
        <Typography color="text.secondary">
          Manage your organization details and preferences
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                General Information
              </Typography>

              {error && (
                <Box sx={{ mb: 2, p: 2, bgcolor: "error.50", borderRadius: 2 }}>
                  <Typography color="error.main" variant="body2">{error}</Typography>
                </Box>
              )}

              {success && (
                <Box sx={{ mb: 2, p: 2, bgcolor: "success.50", borderRadius: 2 }}>
                  <Typography color="success.main" variant="body2">Organization updated successfully!</Typography>
                </Box>
              )}

              <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Organization Name"
                      name="name"
                      defaultValue={organization.name}
                      disabled={!canEdit}
                      required
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Slug"
                      value={organization.slug}
                      disabled
                      helperText="Organization slug cannot be changed"
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Logo URL"
                      name="logoUrl"
                      defaultValue={organization.logoUrl || ""}
                      disabled={!canEdit}
                      placeholder="https://example.com/logo.png"
                    />
                  </Grid>
                </Grid>

                {canEdit && (
                  <Box sx={{ mt: 3 }}>
                    <Button type="submit" variant="contained" disabled={loading}>
                      {loading ? "Saving..." : "Save Changes"}
                    </Button>
                  </Box>
                )}
              </form>
            </CardContent>
          </Card>
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
                  <Typography variant="body2" color="text.secondary">Members</Typography>
                  <Typography variant="body2" fontWeight={600}>{organization._count.memberships}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">Employees</Typography>
                  <Typography variant="body2" fontWeight={600}>{organization._count.employees}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">Offboardings</Typography>
                  <Typography variant="body2" fontWeight={600}>{organization._count.offboardings}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">Created</Typography>
<Typography variant="body2" fontWeight={600}>
                      {new Date(organization.createdAt).toISOString().split("T")[0]}
                    </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 3, mt: 3, bgcolor: "error.50" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} color="error.main" gutterBottom>
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
        </Grid>
      </Grid>
    </Box>
  );
}
