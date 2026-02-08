import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission, isAdmin } from "@/lib/rbac.server";
import { prisma } from "@/lib/prisma.server";
import { notFound } from "next/navigation";
import {
  getEmployeeSecurityProfile,
  getEmployeeSecurityEvents,
  logSecurityProfileView,
  getEmployeeBlockedIPs,
} from "@/lib/employee-security";
import EmployeeSecurityClient from "./EmployeeSecurityClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EmployeeSecurityPage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireActiveOrg();
  
  await requirePermission(session, "security:read");

  const employee = await prisma.employee.findFirst({
    where: {
      id,
      organizationId: session.currentOrgId!,
    },
    select: {
      id: true,
      employeeId: true,
      firstName: true,
      lastName: true,
      email: true,
      status: true,
      department: { select: { name: true } },
      jobTitle: { select: { title: true } },
    },
  });

  if (!employee) {
    notFound();
  }

  const [securityProfile, securityEventsResult, blockedIPs] = await Promise.all([
    getEmployeeSecurityProfile(id, session.currentOrgId!),
    getEmployeeSecurityEvents(id, session.currentOrgId!, { limit: 20 }),
    getEmployeeBlockedIPs(id, session.currentOrgId!),
  ]);

  await logSecurityProfileView(session, id, session.currentOrgId!);

  const canManage = isAdmin(session);

  return (
    <EmployeeSecurityClient
      employee={employee}
      securityProfile={securityProfile}
      securityEvents={securityEventsResult.events as any[]}
      blockedIPs={blockedIPs}
      canManage={canManage}
      currentUserId={session.user.id}
    />
  );
}
