import { requireActiveOrg } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";
import { BlockScope } from "@prisma/client";
import { getSecurityPolicies } from "@/lib/security-policies";
import SecuritySettingsClient from "./SecuritySettingsClient";

export default async function SecuritySettingsPage() {
  const session = await requireActiveOrg();
  
  const membership = session.memberships.find(
    (m) => m.organizationId === session.currentOrgId
  );
  const canManage = membership?.systemRole === "OWNER" || membership?.systemRole === "ADMIN";

  if (!canManage) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Access Denied</h1>
        <p>You do not have permission to access this page.</p>
      </div>
    );
  }

  const [blockedIPs, securityPolicies, recentSecurityEvents] = await Promise.all([
    prisma.blockedIP.findMany({
      where: {
        scope: BlockScope.ORGANIZATION,
        organizationId: session.currentOrgId!,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { attempts: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    getSecurityPolicies(session.currentOrgId!),
    prisma.securityEvent.findMany({
      where: { organizationId: session.currentOrgId! },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <SecuritySettingsClient
      blockedIPs={blockedIPs}
      securityPolicies={securityPolicies}
      recentSecurityEvents={recentSecurityEvents}
      organizationId={session.currentOrgId!}
    />
  );
}
