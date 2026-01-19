import { Box, Typography, Button, Card, CardContent, alpha, Chip } from "@mui/material";
import Link from "next/link";
import { getAuthSession } from "@/lib/auth.server";
import { getUserPermissions } from "@/lib/rbac";
import { getFirstAccessibleRoute, getRoleDisplayName, getRoleColor } from "@/lib/navigation";

export default async function AccessDeniedPage() {
  const session = await getAuthSession();
  
  let redirectPath = "/app";
  let roleDisplay = "Unknown";
  let roleColor = "#6b7280";
  let reason = "authentication";
  
  if (session) {
    const permissions = await getUserPermissions(session);
    redirectPath = getFirstAccessibleRoute(permissions);
    
    if (session.currentMembership) {
      roleDisplay = getRoleDisplayName(session.currentMembership.systemRole);
      roleColor = getRoleColor(session.currentMembership.systemRole);
      reason = "permissions";
    } else {
      reason = "no_membership";
    }
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
      }}
    >
      <Card variant="outlined" sx={{ maxWidth: 500, borderRadius: 3 }}>
        <CardContent sx={{ p: 5, textAlign: "center" }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              bgcolor: alpha("#6b7280", 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 3,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: "#6b7280" }}>
              shield_lock
            </span>
          </Box>
          
          <Typography variant="h5" fontWeight={800} gutterBottom>
            Page Not Available
          </Typography>
          
          {reason === "permissions" && (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Your current role:
                </Typography>
                <Chip 
                  label={roleDisplay} 
                  sx={{ 
                    bgcolor: alpha(roleColor, 0.15), 
                    color: roleColor, 
                    fontWeight: 700 
                  }} 
                />
              </Box>
              <Typography color="text.secondary" sx={{ mb: 1 }}>
                This page requires permissions not included in the <strong>{roleDisplay}</strong> role.
              </Typography>
            </>
          )}
          
          {reason === "no_membership" && (
            <Typography color="text.secondary" sx={{ mb: 1 }}>
              You are not a member of any active organization.
            </Typography>
          )}
          
          {reason === "authentication" && (
            <Typography color="text.secondary" sx={{ mb: 1 }}>
              Please log in to access this page.
            </Typography>
          )}
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            If you believe you should have access, contact your organization administrator.
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Link href={redirectPath} passHref style={{ textDecoration: "none" }}>
              <Button variant="contained" fullWidth sx={{ fontWeight: 700 }}>
                Go to Dashboard
              </Button>
            </Link>
            
            {session?.memberships && session.memberships.length > 1 && (
              <Typography variant="caption" color="text.secondary">
                You have access to {session.memberships.length} organizations. Try switching organizations if needed.
              </Typography>
            )}
            
            <Typography variant="caption" color="text.disabled">
              You arrived here via a direct link, bookmark, or recent permission change.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
