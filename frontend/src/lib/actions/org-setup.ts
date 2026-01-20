"use server";

import { prisma } from "@/lib/prisma.server";
import { requireActiveOrg } from "@/lib/auth.server";
import { createAuditLog } from "@/lib/audit.server";
import { revalidatePath } from "next/cache";
import { isValidTimezone } from "@/lib/data/timezones";
import { isValidOrgType } from "@/lib/data/organization-types";

export async function completeOrganizationSetup(formData: FormData) {
  const session = await requireActiveOrg();
  const orgId = session.currentOrgId!;

  if (session.currentMembership?.systemRole !== "OWNER") {
    return { error: "Only the organization owner can complete setup" };
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  });

  if (!org) {
    return { error: "Organization not found" };
  }

  if (org.isSetupComplete) {
    return { error: "Organization setup is already complete" };
  }

  const primaryLocation = formData.get("primaryLocation") as string;
  const timezone = formData.get("timezone") as string;
  const organizationType = formData.get("organizationType") as string;

  if (!primaryLocation?.trim()) {
    return { error: "Primary location is required" };
  }

  if (!timezone?.trim()) {
    return { error: "Timezone is required" };
  }

  if (!isValidTimezone(timezone)) {
    return { error: "Invalid timezone selected" };
  }

  if (!organizationType?.trim()) {
    return { error: "Organization type is required" };
  }

  if (!isValidOrgType(organizationType)) {
    return { error: "Invalid organization type selected" };
  }

  const updated = await prisma.organization.update({
    where: { id: orgId },
    data: {
      primaryLocation,
      timezone,
      organizationType,
      isSetupComplete: true,
      setupCompletedAt: new Date(),
      setupCompletedByUserId: session.user.id,
    },
  });

  await createAuditLog(session, orgId, {
    action: "organization.setup_completed",
    entityType: "Organization",
    entityId: orgId,
    newData: {
      primaryLocation,
      timezone,
      organizationType,
      setupCompletedAt: updated.setupCompletedAt,
      setupCompletedByUserId: session.user.id,
    },
  });

  revalidatePath("/app");
  revalidatePath("/app/setup");

  return { success: true, organization: updated };
}
