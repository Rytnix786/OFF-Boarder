"use client";

import { Card, CardContent, Box, Typography, Chip, Button, alpha } from "@mui/material";

interface OrgViewReportCardProps {
  report: {
    id: string;
    title: string;
    description: string;
    icon: string;
    stats: string;
    color: string;
  };
  orgId: string;
}

export function OrgViewReportCard({ report, orgId }: OrgViewReportCardProps) {
  const handleExport = async () => {
    window.open(`/api/reports/${report.id}/export?orgId=${orgId}`, "_blank");
  };

  return (
    <Card 
      sx={{ 
        borderRadius: "24px", 
        height: "100%",
        bgcolor: alpha("#0f172a", 0.4),
        border: "1px solid",
        borderColor: alpha("#ffffff", 0.05),
        backdropFilter: "blur(10px)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": {
          transform: "translateY(-4px)",
          bgcolor: alpha("#0f172a", 0.6),
          borderColor: alpha(report.color, 0.3),
          boxShadow: `0 12px 30px ${alpha("#000000", 0.4)}, 0 0 20px ${alpha(report.color, 0.1)}`,
        }
      }}
    >
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 3, mb: 3 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "16px",
              bgcolor: alpha(report.color, 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid",
              borderColor: alpha(report.color, 0.2),
              flexShrink: 0,
            }}
          >
            <span className="material-symbols-outlined" style={{ color: report.color, fontSize: 28 }}>
              {report.icon}
            </span>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={800} sx={{ color: "#f8fafc", mb: 0.5, lineHeight: 1.2 }}>
              {report.title}
            </Typography>
            <Chip 
              size="small" 
              label={report.stats} 
              sx={{ 
                bgcolor: alpha(report.color, 0.05),
                color: alpha("#f8fafc", 0.7),
                fontWeight: 700,
                fontSize: "0.7rem",
                height: 22,
                border: "1px solid",
                borderColor: alpha(report.color, 0.1),
              }} 
            />
          </Box>
        </Box>
        
        <Typography variant="body2" sx={{ color: "#94a3b8", mb: 4, lineHeight: 1.6, minHeight: 40 }}>
          {report.description}
        </Typography>

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={handleExport}
            startIcon={<span className="material-symbols-outlined" style={{ fontSize: 20 }}>download</span>}
            sx={{ 
              borderRadius: "12px",
              bgcolor: alpha(report.color, 0.8),
              fontWeight: 700,
              textTransform: "none",
              py: 1,
              "&:hover": {
                bgcolor: report.color,
              }
            }}
          >
            Export Audit Data
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
