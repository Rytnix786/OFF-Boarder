import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission } from "@/lib/rbac.server";
import { getOrgStructure, getOrgTypeForStructure } from "@/lib/actions/organization";
import StructureClient from "./StructureClient";

export default async function StructurePage() {
  const session = await requireActiveOrg();
  
  const canManage = session.currentMembership?.systemRole === "OWNER" ||
                    session.currentMembership?.systemRole === "ADMIN";

  const [{ departments, jobTitles, locations }, { orgType, preset }] = await Promise.all([
    getOrgStructure(),
    getOrgTypeForStructure(),
  ]);

  return (
    <StructureClient
      departments={departments}
      jobTitles={jobTitles}
      locations={locations}
      canManage={canManage}
      orgType={orgType}
      preset={preset}
    />
  );
}
