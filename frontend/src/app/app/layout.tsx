import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getAuthSession, getUserPendingOrgs, getSupabaseUser, type MembershipWithOrg } from "@/lib/auth.server";
import { getUserPermissions } from "@/lib/rbac";
import { canAccessRoute } from "@/lib/navigation";
import AppShell from "@/components/app/AppShell";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";

  const isEmployeePortalRoute = pathname.startsWith("/app/employee");

  if (isEmployeePortalRoute) {
    const supabaseUser = await getSupabaseUser();
    if (!supabaseUser) {
      redirect("/login?redirect=/app/employee");
    }
    return <>{children}</>;
  }

  let session = await getAuthSession();

  if (!session) {
    redirect("/login");
  }

  if (!session.currentMembership) {
    const activeMembership = await prisma.membership.findFirst({
      where: {
        userId: session.user.id,
        status: "ACTIVE",
        organization: { status: "ACTIVE" }
      },
      include: {
        organization: { select: { id: true, name: true, slug: true, status: true, logoUrl: true } }
      }
    });

    if (activeMembership) {
      const membershipWithOrg: MembershipWithOrg = {
        id: activeMembership.id,
        organizationId: activeMembership.organizationId,
        systemRole: activeMembership.systemRole,
        status: activeMembership.status,
        organization: activeMembership.organization,
      };
      session = {
        ...session,
        currentMembership: membershipWithOrg,
        currentOrgId: activeMembership.organizationId,
        memberships: session.memberships.length > 0 ? session.memberships : [membershipWithOrg],
      };
    } else {
      const blockedMembership = await prisma.membership.findFirst({
        where: {
          userId: session.user.id,
          status: "ACTIVE",
          organization: {
            status: { in: ["SUSPENDED", "REJECTED"] }
          }
        },
        include: {
          organization: { select: { status: true } }
        }
      });

      if (blockedMembership) {
        redirect("/org-blocked");
      }

      if (session.user.isPlatformAdmin) {
        redirect("/admin");
      }
      
      const pendingOrgs = await getUserPendingOrgs(session.user.id);
      if (pendingOrgs.length > 0) {
        redirect("/pending");
      }
      
      redirect("/pending");
    }
  }

  if (session.currentMembership.organization.status !== "ACTIVE") {
    redirect("/org-blocked");
  }

  if (session.currentMembership.status !== "ACTIVE") {
    redirect("/pending");
  }

  const userPermissions = await getUserPermissions(session);

  if (pathname && pathname !== "/app/access-denied" && !canAccessRoute(pathname, userPermissions)) {
    redirect("/app/access-denied");
  }

  return (
    <AppShell session={session} userPermissions={userPermissions}>
      {children}
    </AppShell>
  );
}
