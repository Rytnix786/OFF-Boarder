import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getAuthSession, getUserPendingOrgs } from "@/lib/auth.server";
import { getUserPermissions } from "@/lib/rbac.server";
import { canAccessRoute, getFirstAccessibleRoute } from "@/lib/navigation";
import AppShell from "@/components/app/AppShell";
import { prisma } from "@/lib/prisma.server";
import { getEmployeePortalSession } from "@/lib/employee-auth.server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";

  // 1. Get the standard Auth session first to understand the user's primary identity
  const session = await getAuthSession();

  // 2. Handle Employee Portal paths with awareness of both sessions
  const isEmployeePortalPath = pathname.startsWith("/app/employee");

  if (isEmployeePortalPath) {
    const employeeSession = await getEmployeePortalSession();
    
    // If no employee session and no admin session, force login
    if (!employeeSession && !session) {
      redirect("/login?redirect=/app/employee");
    }
    
    // If no employee session but has admin session, allow viewing if they have a link
    // Otherwise, they shouldn't be here
    if (!employeeSession && session) {
      const employeeLink = await prisma.employeeUserLink.findFirst({
        where: { userId: session.user.id },
      });
      
      if (!employeeLink) {
        redirect("/app"); // Back to main dashboard
      }
      
      // If they have a link but it's not verified yet, or they are just an admin
      // we might want to let them see the portal if we have a "preview" mode
      // but for now, if requireEmployeePortalAuth would fail, we should protect it
    }
    
    return <>{children}</>;
  }

  // 3. Protect all other /app routes
  if (!session) {
    redirect("/login");
  }

  // Exempt status pages from redirection logic to prevent loops
  const statusPages = [
    "/app/pending",
    "/app/access-suspended",
    "/app/access-denied",
    "/org-blocked"
  ];
  
  if (statusPages.includes(pathname)) {
    return <>{children}</>;
  }

  if (!session.currentMembership) {
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

    // Check for revoked/suspended memberships
    const revokedMembership = await prisma.membership.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ["SUSPENDED", "REVOKED"] }
      }
    });

    if (revokedMembership && !session.user.isPlatformAdmin) {
      redirect("/app/access-suspended");
    }

    if (session.user.isPlatformAdmin) {
      redirect("/admin");
    }
    
    const employeeLink = await prisma.employeeUserLink.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ["VERIFIED", "REVOKED"] },
        organization: { status: "ACTIVE" },
      },
    });
    
    if (employeeLink && session.memberships.length === 0) {
      if (employeeLink.status === "REVOKED") {
        redirect("/app/access-suspended");
      }
      redirect("/app/employee");
    }
    
    const pendingOrgs = await getUserPendingOrgs(session.user.id);
    if (pendingOrgs.length > 0) {
      redirect("/pending");
    }
    
    redirect("/register");
  }

  if (session.currentMembership.organization.status !== "ACTIVE") {
    redirect("/org-blocked");
  }

  if (session.currentMembership.status !== "ACTIVE") {
    redirect("/pending");
  }

  const isSetupRoute = pathname.startsWith("/app/setup");
  const isProfileRoute = pathname.startsWith("/app/settings/profile");
  const allowedWithoutSetup = isSetupRoute || isProfileRoute;

  if (
    !session.currentMembership.organization.isSetupComplete &&
    session.currentMembership.systemRole === "OWNER" &&
    !allowedWithoutSetup
  ) {
    redirect("/app/setup");
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
