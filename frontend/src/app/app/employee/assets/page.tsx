import { getEmployeeAssets } from "@/lib/actions/employee-portal";
import { requireEmployeeOffboarding } from "@/lib/employee-auth";
import AssetsList from "./AssetsList";
import { Box, Typography, Alert } from "@mui/material";

export default async function EmployeeAssetsPage() {
  await requireEmployeeOffboarding();
  const assetReturns = await getEmployeeAssets();

  const pendingReturns = assetReturns.filter((ar) => ar.status !== "RETURNED");
  const completedReturns = assetReturns.filter((ar) => ar.status === "RETURNED");

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Asset Returns
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Return company assets and upload proof of return for tracking.
      </Typography>

      {assetReturns.length === 0 ? (
        <Alert severity="info">
          <Typography variant="body2">You have no assets assigned for return.</Typography>
        </Alert>
      ) : (
        <>
          {pendingReturns.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                Pending Returns ({pendingReturns.length})
              </Typography>
              <AssetsList assetReturns={pendingReturns} />
            </Box>
          )}

          {completedReturns.length > 0 && (
            <Box>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                Completed Returns ({completedReturns.length})
              </Typography>
              <AssetsList assetReturns={completedReturns} />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
