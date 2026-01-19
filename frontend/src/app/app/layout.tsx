import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getAuthSession, getUserPendingOrgs, getSupabaseUser } from "@/lib/auth.server";
import { getUserPermissions } from "@/lib/rbac";
import { canAccessRoute, getFirstAccessibleRoute } from "@/lib/navigation";
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

  const session = await getAuthSession();

  if (!session) {
    redirect("/login");
  }

  // Check if user has a membership in SUSPENDED or REJECTED org
  // This needs to happen before the currentMembership check to avoid redirect loops
  if (!session.currentMembership) {
    // Check for blocked org membership directly from DB
    // (since getAuthSession filters out non-ACTIVE org memberships)
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
      // User has membership in a blocked org - send to org-blocked page
      redirect("/org-blocked");
    }

    // Platform admins without org membership go to admin panel
    if (session.user.isPlatformAdmin) {
      redirect("/admin");
    }
    
    // Check for pending orgs or join requests
    const pendingOrgs = await getUserPendingOrgs(session.user.id);
    if (pendingOrgs.length > 0) {
      redirect("/pending");
    }
    
    // No memberships at all - user needs to create or join an org
    redirect("/pending");
  }

  // Safety check: If currentMembership exists but org is not ACTIVE
  // This shouldn't happen with current getAuthSession logic, but adding for safety
  if (session.currentMembership.organization.status !== "ACTIVE") {
    redirect("/org-blocked");
  }

  // Check membership status - ensure user's membership is active
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
