import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission } from "@/lib/rbac.server";
import { getAssetById, getAssetHistory } from "@/lib/actions/assets";
import { prisma } from "@/lib/prisma.server";
import { notFound } from "next/navigation";
import AssetDetailClient from "./AssetDetailClient";

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireActiveOrg();
  await requirePermission(session, "asset:read");

  const result = await getAssetById(id);
  
  if (result.error || !result.asset) {
    notFound();
  }

  const historyResult = await getAssetHistory(id);

  const employees = await prisma.employee.findMany({
    where: { 
      organizationId: session.currentOrgId!, 
      status: { in: ["ACTIVE", "ON_LEAVE", "OFFBOARDING"] } 
    },
    select: { 
      id: true, 
      firstName: true, 
      lastName: true, 
      email: true,
      offboardings: {
        select: { id: true, status: true }
      }
    },
  });

  const canManage = session.currentMembership?.systemRole === "OWNER" ||
                    session.currentMembership?.systemRole === "ADMIN";

  return (
    <AssetDetailClient 
      asset={result.asset as any} 
      history={historyResult.logs as any[] || []} 
      employees={employees}
      canManage={canManage}
    />
  );
}
