import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/auth.server";
import { getOrgViewContext } from "@/lib/actions/org-view";
import { prisma } from "@/lib/prisma.server";
import { Box, Typography, Button, alpha, Divider, Chip } from "@mui/material";
import { exitOrgView } from "@/lib/actions/org-view";
import { OrgViewNavigation } from "./OrgViewNavigation";

export default async function OrgViewLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  await requirePlatformAdmin();
  const { orgId } = await params;
  const context = await getOrgViewContext();

  if (!context || context.orgId !== orgId) {
    redirect("/admin/org-view/select");
  }

  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true },
  });

  if (!organization) {
    redirect("/admin/org-view/select");
  }

  const navItems = [
    { label: "Dashboard", icon: "dashboard", href: `/admin/org-view/${orgId}` },
    { label: "Employees", icon: "badge", href: `/admin/org-view/${orgId}/employees` },
    { label: "Offboardings", icon: "group_remove", href: `/admin/org-view/${orgId}/offboardings` },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Org View Banner */}
      <Box
        sx={{
          bgcolor: "#1e293b",
          color: "#f8fafc",
          px: 3,
          py: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 2000,
          borderBottom: "1px solid",
          borderColor: alpha("#ffffff", 0.1),
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              bgcolor: alpha("#6366f1", 0.2),
              color: "#818cf8",
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Org View
          </Box>
          <Typography variant="body2" fontWeight={600}>
            Troubleshooting Mode: <span style={{ color: "#94a3b8" }}>{organization.name}</span>
          </Typography>
          <Chip
            label="READ-ONLY"
            size="small"
            sx={{
              bgcolor: alpha("#f59e0b", 0.1),
              color: "#f59e0b",
              fontWeight: 700,
              fontSize: "0.625rem",
              border: "1px solid",
              borderColor: alpha("#f59e0b", 0.2),
            }}
          />
        </Box>

        <form action={exitOrgView}>
          <Button
            type="submit"
            variant="contained"
            size="small"
            sx={{
              bgcolor: "#ef4444",
              "&:hover": { bgcolor: "#dc2626" },
              textTransform: "none",
              fontWeight: 600,
            }}
          >
            Exit Org View
          </Button>
        </form>
      </Box>

      <Box sx={{ display: "flex", flex: 1 }}>
        {/* Org View Sidebar */}
        <Box
          sx={{
            width: 240,
            bgcolor: "#ffffff",
            borderRight: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <OrgViewNavigation navItems={navItems} />
          <Divider sx={{ my: 1 }} />
          <Box sx={{ p: 2, mt: "auto" }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center" }}>
              Metadata-only view. No raw PII or asset serials exposed.
            </Typography>
          </Box>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, bgcolor: "#f8fafc", overflowY: "auto" }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
