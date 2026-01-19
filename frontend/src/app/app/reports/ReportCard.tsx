"use client";

import { Card, CardContent, Box, Typography, Chip, Button } from "@mui/material";
import Link from "next/link";

interface ReportCardProps {
  report: {
    id: string;
    title: string;
    description: string;
    icon: string;
    stats: string;
    href: string;
  };
}

export function ReportCard({ report }: ReportCardProps) {
  const handleExport = async () => {
    window.open(`/api/reports/${report.id}/export`, "_blank");
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, height: "100%" }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, mb: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: "primary.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span className="material-symbols-outlined" style={{ color: "white" }}>
              {report.icon}
            </span>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              {report.title}
            </Typography>
            <Chip size="small" label={report.stats} sx={{ mt: 0.5 }} />
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {report.description}
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Link href={report.href} passHref style={{ textDecoration: "none" }}>
            <Button size="small" variant="outlined">
              View
            </Button>
          </Link>
          <Button
            size="small"
            onClick={handleExport}
            startIcon={<span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>}
          >
            Export CSV
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
