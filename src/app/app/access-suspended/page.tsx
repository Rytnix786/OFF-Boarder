import { Box, Typography, Card, CardContent, alpha, Button, Divider } from "@mui/material";
import { getAuthSession } from "@/lib/auth.server";
import { SignOutButton } from "./SignOutButton";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

async function getPendingComplianceTasks(userId: string) {
  const employeeLink = await prisma.employeeUserLink.findFirst({
    where: { userId, status: "REVOKED" },
    include: {
      employee: {
        include: {
          offboardings: {
            where: { status: { in: ["IN_PROGRESS", "PENDING"] } },
            include: {
              tasks: {
                where: {
                  status: { in: ["PENDING", "IN_PROGRESS"] },
                  isEmployeeRequired: true,
                }
              },
              attestations: {
                take: 1
              }
            }
          }
        }
      }
    }
  });
  
  if (!employeeLink?.employee?.offboardings?.length) return null;
  
  const offboarding = employeeLink.employee.offboardings[0];
  const hasSignedAttestation = offboarding.attestations.length > 0;
  
  const attestationKeywords = ["attestation", "sign", "acknowledge", "confirm"];
  const assetKeywords = ["asset", "return", "equipment", "laptop", "device"];
  
  // Filter out attestation-related tasks if the attestation is already signed
  const filteredPendingTasks = offboarding.tasks.filter(t => {
    if (hasSignedAttestation) {
      const isAttestationRelated = attestationKeywords.some(kw => 
        t.name.toLowerCase().includes(kw) || t.category?.toLowerCase().includes(kw)
      );
      if (isAttestationRelated) return false;
    }
    return true;
  });
  
  return {
    hasAttestationTask: !hasSignedAttestation && filteredPendingTasks.some(t => 
      attestationKeywords.some(kw => t.name.toLowerCase().includes(kw) || t.category?.toLowerCase().includes(kw))
    ),
    hasAssetReturnTask: filteredPendingTasks.some(t => 
      assetKeywords.some(kw => t.name.toLowerCase().includes(kw) || t.category?.toLowerCase().includes(kw))
    ),
    totalPendingTasks: filteredPendingTasks.length,
    hasSignedAttestation,
  };
}

export default async function AccessSuspendedPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const params = await searchParams;
  const isExpired = params.error === "expired";
  const isSuccess = params.success === "attestation";
  
  const session = await getAuthSession();
  const complianceTasks = session?.user?.id 
    ? await getPendingComplianceTasks(session.user.id) 
    : null;
    
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
      <Card variant="outlined" sx={{ maxWidth: 500, borderRadius: 3, border: "1px solid", borderColor: isSuccess ? "success.light" : "error.light" }}>
        <CardContent sx={{ p: 5, textAlign: "center" }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              bgcolor: alpha(isSuccess ? "#10b981" : "#ef4444", 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 3,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: isSuccess ? "#10b981" : "#ef4444" }}>
              {isSuccess ? "verified" : isExpired ? "timer_off" : "block"}
            </span>
          </Box>
          
          <Typography variant="h5" fontWeight={800} gutterBottom color={isSuccess ? "success.main" : "error.main"}>
            {isSuccess ? "Offboarding Finalized" : isExpired ? "Compliance Window Expired" : "Access Suspended"}
          </Typography>
          
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {isSuccess 
              ? "Thank you for completing your compliance attestation. Your offboarding tasks are now being finalized."
              : isExpired
              ? "Your 24-hour compliance window has closed. You no longer have access to the offboarding portal."
              : "Your account or membership access has been suspended or revoked by an administrator."}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            {isSuccess
              ? "A copy of your signed attestation has been sent to HR. You may now securely log out of this session."
              : isExpired
              ? "If you still need to complete pending tasks or return assets, please contact your HR representative or manager directly."
              : "This action may be part of an offboarding process or a security measure. If you believe this is an error, please contact your organization administrator or IT support department."}
          </Typography>

          {!isExpired && !isSuccess && complianceTasks && complianceTasks.totalPendingTasks > 0 && (
            <>
              <Divider sx={{ my: 3 }} />
              <Box sx={{ 
                bgcolor: alpha("#f59e0b", 0.1), 
                border: "1px solid",
                borderColor: "warning.main",
                borderRadius: 2, 
                p: 2, 
                mb: 3 
              }}>
                <Typography variant="subtitle2" fontWeight={700} color="warning.main" gutterBottom>
                  Pending Compliance Tasks
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  You have {complianceTasks.totalPendingTasks} pending task(s) to complete before your offboarding can be finalized.
                </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {complianceTasks.hasAttestationTask && (
                      <Link href="/app/employee/attestation" style={{ textDecoration: 'none' }}>
                        <Button
                          variant="contained"
                          color="warning"
                          size="small"
                          fullWidth
                          startIcon={<span className="material-symbols-outlined" style={{ fontSize: 18 }}>signature</span>}
                        >
                          Complete Attestation
                        </Button>
                      </Link>
                    )}
                    {complianceTasks.hasAssetReturnTask && (
                      <Link href="/app/employee/assets" style={{ textDecoration: 'none' }}>
                        <Button
                          variant="outlined"
                          color="warning"
                          size="small"
                          fullWidth
                          startIcon={<span className="material-symbols-outlined" style={{ fontSize: 18 }}>inventory_2</span>}
                        >
                          Return Assets
                        </Button>
                      </Link>
                    )}
                  </Box>
              </Box>
            </>
          )}

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
