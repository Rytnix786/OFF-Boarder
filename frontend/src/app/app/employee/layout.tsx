import { requireEmployeePortalAuth } from "@/lib/employee-auth";
import EmployeePortalShell from "@/components/app/EmployeePortalShell";

export default async function EmployeePortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireEmployeePortalAuth();

  return <EmployeePortalShell session={session}>{children}</EmployeePortalShell>;
}
