"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Autocomplete,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Card,
  alpha,
} from "@mui/material";
import { useRouter } from "next/navigation";

type Organization = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
};

export function JoinOrgForm() {
  const router = useRouter();
  const [options, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [requestedRole, setRequestedRole] = useState("CONTRIBUTOR");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const searchOrgs = async (val: string) => {
    if (val.length < 2) {
      setOrganizations([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/organizations/search?query=${encodeURIComponent(val)}`);
      const data = await res.json();
      setOrganizations(data.organizations || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!selectedOrg) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/join-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: selectedOrg.id,
          requestedRole,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        router.refresh();
      } else {
        setError(data.error || "Failed to submit request");
      }
    } catch (e) {
      setError("An unexpected error occurred");
    }
    setSubmitting(false);
  };

  if (success) {
    return (
      <Alert severity="success" sx={{ mt: 2, textAlign: 'left' }}>
        Request submitted! An administrator of <strong>{selectedOrg?.name}</strong> will review your request.
      </Alert>
    );
  }

  return (
    <Card 
      variant="outlined" 
      sx={{ 
        mt: 4, 
        p: 3, 
        textAlign: 'left', 
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.02),
        borderColor: (theme) => alpha(theme.palette.primary.main, 0.1),
      }}
    >
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Request to Join Organization
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Search for an existing organization to join. Your request will be sent to the organization&apos;s admins.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Autocomplete
          fullWidth
          options={options}
          getOptionLabel={(option) => option.name}
          onInputChange={(_, val) => {
            searchOrgs(val);
          }}
          onChange={(_, val) => setSelectedOrg(val)}
          loading={loading}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Organization Name"
              placeholder="Start typing..."
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <React.Fragment>
                    {loading ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </React.Fragment>
                ),
              }}
            />
          )}
        />

        <FormControl fullWidth>
          <InputLabel>Requested Role</InputLabel>
            <Select
              value={requestedRole}
              label="Requested Role"
              onChange={(e) => setRequestedRole(e.target.value)}
            >
              <MenuItem value="CONTRIBUTOR">Contributor (Operational access)</MenuItem>
              <MenuItem value="ADMIN">Admin (Organization management - requires Owner approval)</MenuItem>
            </Select>
        </FormControl>

        <Button
          variant="contained"
          disabled={!selectedOrg || submitting}
          onClick={handleJoin}
          fullWidth
          sx={{ py: 1.5, fontWeight: 700 }}
        >
          {submitting ? "Sending Request..." : "Request to Join"}
        </Button>
      </Box>
    </Card>
  );
}
