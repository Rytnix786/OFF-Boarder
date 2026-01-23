"use client";

import { Box, Typography, alpha } from "@mui/material";

interface OrgViewPageHeaderProps {
  title: string;
  description: string;
  icon: string;
}

export function OrgViewPageHeader({ title, description, icon }: OrgViewPageHeaderProps) {
  return (
    <Box sx={{ p: { xs: 3, md: 6 }, pb: 0, mb: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: "8px",
            bgcolor: alpha("#6366f1", 0.1),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid",
            borderColor: alpha("#6366f1", 0.2),
          }}
        >
          <span className="material-symbols-outlined" style={{ color: "#6366f1", fontSize: "20px" }}>
            {icon}
          </span>
        </Box>
        <Typography
          variant="h4"
          fontWeight={900}
          sx={{
            color: "#0f172a",
            letterSpacing: "-0.02em",
            fontSize: { xs: "1.5rem", md: "2rem" },
          }}
        >
          {title}
        </Typography>
      </Box>
      <Typography variant="body1" sx={{ color: "#64748b", fontWeight: 500 }}>
        {description}
      </Typography>
    </Box>
  );
}
