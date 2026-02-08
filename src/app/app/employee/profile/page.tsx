import { requireEmployeePortalAuth } from "@/lib/employee-auth.server";
import ProfileClient from "./ProfileClient";

export default async function EmployeeProfilePage() {
  const session = await requireEmployeePortalAuth();
  return <ProfileClient session={session} />;
}
