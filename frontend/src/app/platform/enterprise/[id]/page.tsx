"use client";

import React, { use } from "react";
import { Box, Typography, IconButton } from "@mui/material";
import Link from "next/link";
import { SecurityThread } from "@/components/app/SecurityThread";

export default function PlatformEnterpriseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <Box sx={{ height: "calc(100vh - 120px)", display: "flex", flexDirection: "column" }}>
      <Box sx={{ mb: 4, display: "flex", alignItems: "center", gap: 2 }}>
        <Link href="/platform/enterprise" passHref style={{ textDecoration: "none" }}>
          <IconButton sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
            <span className="material-symbols-outlined">arrow_back</span>
          </IconButton>
        </Link>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: -1 }}>
            Enterprise Security Thread
          </Typography>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            Platform Support Interface • Support ID: {id}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0 }}>
        <SecurityThread isAdmin={true} conversationId={id} />
      </Box>
    </Box>
  );
}
