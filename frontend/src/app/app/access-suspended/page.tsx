import { Box, Typography, Card, CardContent, alpha } from "@mui/material";
import { getAuthSession } from "@/lib/auth.server";
import { SignOutButton } from "./SignOutButton";

export default async function AccessSuspendedPage() {
  const session = await getAuthSession();
  
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        bgcolor: "background.default",
        p: 3
      }}
    >
      <Card variant="outlined" sx={{ maxWidth: 500, borderRadius: 3, border: "1px solid", borderColor: "error.light" }}>
        <CardContent sx={{ p: 5, textAlign: "center" }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              bgcolor: alpha("#ef4444", 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 3,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: "#ef4444" }}>
              block
            </span>
          </Box>
          
          <Typography variant="h5" fontWeight={800} gutterBottom color="error.main">
            Access Suspended
          </Typography>
          
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Your account or membership access has been suspended or revoked by an administrator.
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            This action may be part of an offboarding process or a security measure. If you believe this is an error, please contact your organization administrator or IT support department.
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <SignOutButton />
            
            <Typography variant="caption" color="text.disabled">
              User ID: {session?.user.id || "Unknown"}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
