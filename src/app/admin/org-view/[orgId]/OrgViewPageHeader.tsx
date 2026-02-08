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
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1.5 }}>
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: "12px",
            bgcolor: alpha("#6366f1", 0.1),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid",
            borderColor: alpha("#6366f1", 0.3),
            boxShadow: "0 0 20px rgba(99, 102, 241, 0.15)",
          }}
        >
          <span className="material-symbols-outlined" style={{ color: "#818cf8", fontSize: "24px" }}>
            {icon}
          </span>
        </Box>
        <Typography
          variant="h4"
          fontWeight={900}
          sx={{
            color: "#f8fafc",
            letterSpacing: "-0.03em",
            fontSize: { xs: "1.75rem", md: "2.5rem" },
            textShadow: "0 2px 10px rgba(0,0,0,0.3)",
          }}
        >
          {title}
        </Typography>
      </Box>
      <Typography variant="body1" sx={{ color: "#94a3b8", fontWeight: 500, maxWidth: "700px", lineHeight: 1.6 }}>
        {description}
      </Typography>
    </Box>
  );
}
