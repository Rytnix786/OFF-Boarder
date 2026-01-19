import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission } from "@/lib/rbac";
import { getOrgStructure } from "@/lib/actions/organization";
import StructureClient from "./StructureClient";

export default async function StructurePage() {
  const session = await requireActiveOrg();
  
  const canManage = session.currentMembership?.systemRole === "OWNER" ||
                    session.currentMembership?.systemRole === "ADMIN";

  const { departments, jobTitles, locations } = await getOrgStructure();

  return (
    <StructureClient
      departments={departments}
      jobTitles={jobTitles}
      locations={locations}
      canManage={canManage}
    />
  );
}
