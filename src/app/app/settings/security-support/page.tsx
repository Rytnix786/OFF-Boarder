"use client";

import React from "react";
import { Box, Typography, Breadcrumbs, Link as MuiLink } from "@mui/material";
import Link from "next/link";
import { SecurityThread } from "@/components/app/SecurityThread";

export default function SecuritySupportPage() {
  return (
    <Box sx={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column", p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 4 }}>
        <Breadcrumbs sx={{ mb: 1 }}>
          <Link href="/dashboard" passHref style={{ textDecoration: 'none' }}>
            <MuiLink component="span" underline="hover" color="inherit" sx={{ fontSize: '0.85rem' }}>
              Dashboard
            </MuiLink>
          </Link>
          <Typography color="text.primary" sx={{ fontSize: '0.85rem', fontWeight: 500 }}>Security Support</Typography>
        </Breadcrumbs>
        <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: -1, mb: 0.5 }}>
          Security & Compliance Support
        </Typography>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          Direct, encrypted communication with OffboardHQ security team. For enterprise-grade coordination.
        </Typography>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0 }}>
        <SecurityThread />
      </Box>
    </Box>
  );
}
