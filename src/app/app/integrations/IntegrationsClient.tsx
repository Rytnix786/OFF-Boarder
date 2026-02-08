"use client";

import React from "react";
import { Box, Typography, Card, CardContent, Chip, Button, Grid, alpha, useTheme } from "@mui/material";

type Integration = {
  id: string;
  type: string;
  name: string;
  status: string;
  lastSyncAt: Date | null;
};

const AVAILABLE_INTEGRATIONS = [
  { type: "google_workspace", name: "Google Workspace", icon: "mail", description: "Revoke Gmail, Drive, and other Google services" },
  { type: "okta", name: "Okta", icon: "key", description: "Disable SSO and identity provider access" },
  { type: "slack", name: "Slack", icon: "chat", description: "Remove from Slack workspaces and channels" },
  { type: "github", name: "GitHub", icon: "code", description: "Remove from GitHub organization and repos" },
  { type: "aws", name: "AWS", icon: "cloud", description: "Revoke IAM credentials and console access" },
  { type: "azure_ad", name: "Azure AD", icon: "cloud_circle", description: "Disable Microsoft 365 and Azure access" },
  { type: "jira", name: "Jira", icon: "task_alt", description: "Remove from Jira projects and boards" },
  { type: "salesforce", name: "Salesforce", icon: "business", description: "Deactivate Salesforce user account" },
];

interface IntegrationsClientProps {
  integrations: Integration[];
  canManage: boolean;
}

export default function IntegrationsClient({ integrations, canManage }: IntegrationsClientProps) {
  const theme = useTheme();

  const getIntegrationStatus = (type: string) => {
    return integrations.find((i) => i.type === type);
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800}>Integrations</Typography>
        <Typography color="text.secondary">
          Connect your tools to automate access revocation during offboarding
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {AVAILABLE_INTEGRATIONS.map((integration) => {
          const connected = getIntegrationStatus(integration.type);
          const isConnected = connected?.status === "connected";

          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={integration.type}>
              <Card
                variant="outlined"
                sx={{
                  borderRadius: 3,
                  height: "100%",
                  borderColor: isConnected ? "success.main" : "divider",
                  borderWidth: isConnected ? 2 : 1,
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: isConnected
                          ? alpha(theme.palette.success.main, 0.1)
                          : "action.hover",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: 24,
                          color: isConnected ? theme.palette.success.main : theme.palette.text.secondary,
                        }}
                      >
                        {integration.icon}
                      </span>
                    </Box>
                    <Chip
                      label={isConnected ? "Connected" : "Not Connected"}
                      size="small"
                      color={isConnected ? "success" : "default"}
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>

                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    {integration.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3, minHeight: 40 }}>
                    {integration.description}
                  </Typography>

                  {isConnected && connected?.lastSyncAt && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                      Last synced: {new Date(connected.lastSyncAt).toLocaleString()}
                    </Typography>
                  )}

                  {canManage && (
                    <Button
                      fullWidth
                      variant={isConnected ? "outlined" : "contained"}
                      color={isConnected ? "error" : "primary"}
                      sx={{ borderRadius: 2 }}
                    >
                      {isConnected ? "Disconnect" : "Connect"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Box sx={{ mt: 4, p: 3, bgcolor: "action.hover", borderRadius: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Need a different integration?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          We're constantly adding new integrations. Let us know what tools you need to connect.
        </Typography>
        <Button variant="outlined" size="small">
          Request Integration
        </Button>
      </Box>
    </Box>
  );
}
