import { requireEmployeePortalAuth, getEmployeeOffboarding } from "@/lib/employee-auth";
import { EmployeeDashboard } from "@/components/dashboards";

export default async function EmployeeDashboardPage() {
  const session = await requireEmployeePortalAuth();
  const offboarding = session.offboardingId ? await getEmployeeOffboarding(session) : null;

  const offboardingData = offboarding ? {
    id: offboarding.id,
    status: offboarding.status,
    scheduledDate: offboarding.scheduledDate,
    tasks: offboarding.tasks.map(t => ({
      id: t.id,
      name: t.name,
      status: t.status,
      dueDate: t.dueDate,
      completedAt: t.completedAt,
    })),
    assetReturns: offboarding.assetReturns.map(ar => ({
      id: ar.id,
      status: ar.status,
      asset: {
        name: ar.asset.name,
        assetTag: ar.asset.assetTag || "",
      },
    })),
    attestations: offboarding.attestations.map(a => ({
      id: a.id,
      signedAt: a.signedAt,
    })),
  } : null;

  return <EmployeeDashboard session={session} offboarding={offboardingData} />;
}
