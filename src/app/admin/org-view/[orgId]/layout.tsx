import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/auth.server";
import { getOrgViewContext } from "@/lib/actions/org-view";
import { prisma } from "@/lib/prisma.server";
import { exitOrgView } from "@/lib/actions/org-view";
import { OrgViewLayoutClient } from "./OrgViewLayoutClient";

export default async function OrgViewLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  await requirePlatformAdmin();
  const { orgId } = await params;
  const context = await getOrgViewContext();

  if (!context || context.orgId !== orgId) {
    redirect("/admin/org-view/select");
  }

  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true },
  });

  if (!organization) {
    redirect("/admin/org-view/select");
  }

  const navItems = [
    { label: "Dashboard", icon: "dashboard", href: `/admin/org-view/${orgId}` },
    { label: "Employees", icon: "badge", href: `/admin/org-view/${orgId}/employees` },
    { label: "Offboardings", icon: "group_remove", href: `/admin/org-view/${orgId}/offboardings` },
  ];

  return (
    <OrgViewLayoutClient 
      organizationName={organization.name}
      navItems={navItems}
      exitAction={exitOrgView}
    >
      {children}
    </OrgViewLayoutClient>
  );
}
