import { prisma } from "@/lib/prisma.server";
import { requirePlatformAdmin } from "@/lib/auth.server";
import OrgSelectorClient from "./OrgSelectorClient";

export default async function OrgSelectorPage() {
  await requirePlatformAdmin();

  const organizations = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <OrgSelectorClient organizations={organizations} />
  );
}
