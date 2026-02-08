import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission } from "@/lib/rbac.server";
import { getRiskRadarDashboard } from "@/lib/actions/risk-radar";
import { prisma } from "@/lib/prisma.server";
import { withPrismaRetry } from "@/lib/prisma-resilience";
import RiskRadarClient from "./RiskRadarClient";

export default async function RiskRadarPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const session = await requireActiveOrg();
  await requirePermission(session, "risk:read");

  const filters = {
    department: params.department as string | undefined,
    status: params.status as string | undefined,
    riskLevel: params.riskLevel as "NORMAL" | "HIGH" | "CRITICAL" | undefined,
    dateFrom: params.dateFrom as string | undefined,
    dateTo: params.dateTo as string | undefined,
    page: params.page ? parseInt(params.page as string) : 1,
    pageSize: 20,
  };

  const [dashboardData, departments] = await withPrismaRetry(() => Promise.all([
    getRiskRadarDashboard(filters),
    prisma.department.findMany({
      where: { organizationId: session.currentOrgId! },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]), { retries: 2, baseDelayMs: 250 });

  const canManage = session.currentMembership?.systemRole === "OWNER" ||
                    session.currentMembership?.systemRole === "ADMIN";

  return (
    <RiskRadarClient
      data={dashboardData}
      departments={departments}
      filters={filters}
      canManage={canManage}
    />
  );
}
