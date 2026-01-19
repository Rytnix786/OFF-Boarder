import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getAuthSession, getUserPendingOrgs } from "@/lib/auth.server";
import { getUserPermissions } from "@/lib/rbac";
import { canAccessRoute, getFirstAccessibleRoute } from "@/lib/navigation";
import AppShell from "@/components/app/AppShell";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";

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

    // No blocked membership - check other cases
    if (session.user.isPlatformAdmin) {
      redirect("/admin");
    }
    
    const pendingOrgs = await getUserPendingOrgs(session.user.id);
    if (pendingOrgs.length > 0) {
      redirect("/pending");
    }
    
    redirect("/register");
  }

  // Double-check: If currentMembership exists but org is not ACTIVE
  // This shouldn't happen with current getAuthSession logic, but adding for safety
  if (session.currentMembership.organization.status !== "ACTIVE") {
    redirect("/org-blocked");
  }

  // Check membership status
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
