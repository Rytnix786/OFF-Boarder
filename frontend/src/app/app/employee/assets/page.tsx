import { getEmployeeAssets, getEmployeeAssignedAssets } from "@/lib/actions/employee-portal";
import { requireEmployeePortalAuth } from "@/lib/employee-auth.server";
import AssetsClient from "./AssetsClient";
import { Box } from "@mui/material";

export default async function EmployeeAssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const params = await searchParams;
  const session = await requireEmployeePortalAuth();
  
  const [assetReturns, assignedAssets] = await Promise.all([
    session.offboardingId ? getEmployeeAssets() : Promise.resolve([]),
    getEmployeeAssignedAssets(),
  ]);

  return (
    <Box>
      <AssetsClient 
        assetReturns={assetReturns} 
        assignedAssets={assignedAssets}
        initialAssetId={params.id}
      />
    </Box>
  );
}
