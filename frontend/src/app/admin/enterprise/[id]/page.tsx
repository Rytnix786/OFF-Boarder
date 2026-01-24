"use client";

import React, { use, useState, useEffect } from "react";
import { 
  Box, 
  Typography, 
  IconButton, 
  Skeleton, 
  Button, 
  Paper, 
  alpha, 
  useTheme,
  Alert,
  Snackbar,
  Chip
} from "@mui/material";
import Link from "next/link";
import { SecurityThread } from "@/components/app/SecurityThread";

interface ConversationMetadata {
  id: string;
  organizationId: string | null;
  orgName?: string;
  subject: string;
  contactName: string | null;
  contactEmail: string | null;
  companyName: string | null;
  source: string | null;
}

export default function PlatformEnterpriseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const theme = useTheme();
  const [metadata, setMetadata] = useState<ConversationMetadata | null>(null);
  const [inviting, setInviting] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    fetch(`/api/platform/enterprise/conversations/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.subject) {
          setMetadata({
            ...data,
            orgName: data.organization?.name || data.companyName || "External Visitor"
          });
        }
      })
      .catch(console.error);
  }, [id]);

  const handleInvite = async () => {
    if (!metadata?.contactEmail) return;
    
    setInviting(true);
    try {
      const res = await fetch(`/api/platform/enterprise/conversations/${id}/invite`, {
        method: "POST",
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to send invitation");
      
      setSnackbar({
        open: true,
        message: `Invitation successfully sent to ${metadata.contactEmail}`,
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : "Error sending invitation",
        severity: "error",
      });
    } finally {
      setInviting(false);
    }
  };

  return (
    <Box sx={{ height: "calc(100vh - 120px)", display: "flex", flexDirection: "column" }}>
      <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Link href="/admin/enterprise" passHref style={{ textDecoration: "none" }}>
            <IconButton sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
              <span className="material-symbols-outlined">arrow_back</span>
            </IconButton>
          </Link>
          <Box>
            <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: -1 }}>
              {metadata ? metadata.subject : <Skeleton width={300} />}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                {metadata ? `${metadata.orgName} • Security Thread` : <Skeleton width={200} />}
              </Typography>
              {metadata && !metadata.organizationId && (
                <Chip 
                  label="External Inquiry" 
                  size="small" 
                  sx={{ 
                    height: 20, 
                    fontSize: '0.65rem', 
                    fontWeight: 700,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: 'primary.main',
                    borderRadius: 1
                  }} 
                />
              )}
            </Box>
          </Box>
        </Box>

        {metadata && !metadata.organizationId && metadata.contactEmail && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Paper variant="outlined" sx={{ p: 1.5, px: 2, borderRadius: 2, bgcolor: alpha(theme.palette.background.paper, 0.5) }}>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', mb: 0.5 }}>
                  Visitor Details
                </Typography>
                <Typography variant="body2" fontWeight={700}>{metadata.contactName}</Typography>
                <Typography variant="caption" color="text.secondary">{metadata.contactEmail}</Typography>
              </Box>
            </Paper>
            <Button
              variant="contained"
              disableElevation
              startIcon={<span className="material-symbols-outlined">mail</span>}
              onClick={handleInvite}
              disabled={inviting}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700,
                px: 3,
                height: 48,
                bgcolor: theme.palette.primary.main,
                '&:hover': {
                  bgcolor: theme.palette.primary.dark,
                }
              }}
            >
              {inviting ? "Sending..." : "Invite to Portal"}
            </Button>
          </Box>
        )}
      </Box>

      <Box sx={{ flex: 1, minHeight: 0 }}>
        <SecurityThread isAdmin={true} conversationId={id} />
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2, fontWeight: 600 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
