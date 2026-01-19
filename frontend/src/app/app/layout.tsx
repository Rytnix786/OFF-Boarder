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

  const isEmployeePortalPath = pathname.startsWith("/app/employee");

  if (isEmployeePortalPath) {
    const employeeSession = await getEmployeePortalSession();
    if (!employeeSession) {
      redirect("/login?redirect=/app/employee");
    }
    return <>{children}</>;
  }

  const session = await getAuthSession();

  if (!session) {
    redirect("/login");
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

    if (session.user.isPlatformAdmin) {
      redirect("/admin");
    }
    
    const employeeLink = await prisma.employeeUserLink.findFirst({
      where: {
        userId: session.user.id,
        status: "VERIFIED",
        organization: { status: "ACTIVE" },
      },
    });
    
    if (employeeLink) {
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
