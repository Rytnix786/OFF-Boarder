import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission } from "@/lib/rbac.server";
import { prisma } from "@/lib/prisma.server";
import { notFound } from "next/navigation";
import EmployeeDetailClient from "./EmployeeDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EmployeeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireActiveOrg();
  await requirePermission(session, "employee:read");

  const [employee, departments, jobTitles, locations, orgMembers, portalInvites, userLinks] = await Promise.all([
    prisma.employee.findFirst({
      where: {
        id,
        organizationId: session.currentOrgId!,
      },
      include: {
        department: true,
        jobTitle: true,
        location: true,
        managerMembership: { 
          select: { 
            id: true, 
            systemRole: true,
            user: { select: { id: true, name: true, email: true } } 
          } 
        },
        offboardings: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            status: true,
            scheduledDate: true,
            createdAt: true,
          },
        },
        assets: {
          select: {
            id: true,
            name: true,
            type: true,
            serialNumber: true,
            assetTag: true,
            status: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.department.findMany({ 
      where: { organizationId: session.currentOrgId! },
      orderBy: { name: "asc" },
    }),
    prisma.jobTitle.findMany({ 
      where: { organizationId: session.currentOrgId! },
      orderBy: { title: "asc" },
    }),
    prisma.location.findMany({ 
      where: { organizationId: session.currentOrgId! },
      orderBy: { name: "asc" },
    }),
    prisma.membership.findMany({ 
      where: { 
        organizationId: session.currentOrgId!, 
        status: "ACTIVE",
        systemRole: { in: ["OWNER", "ADMIN", "CONTRIBUTOR"] },
      },
      select: { 
        id: true, 
        systemRole: true,
        user: { select: { id: true, name: true, email: true } } 
      },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.employeePortalInvite.findMany({
      where: { employeeId: id, organizationId: session.currentOrgId! },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        invitedBy: { select: { name: true, email: true } },
        acceptedBy: { select: { name: true, email: true } },
      },
    }),
    prisma.employeeUserLink.findMany({
      where: { employeeId: id, organizationId: session.currentOrgId! },
      include: {
        user: { select: { id: true, name: true, email: true } },
        linkedBy: { select: { name: true, email: true } },
      },
    }),
  ]);

  if (!employee) {
    notFound();
  }

  const canEdit = session.currentMembership?.systemRole === "OWNER" ||
                  session.currentMembership?.systemRole === "ADMIN";

  return (
    <EmployeeDetailClient 
      employee={employee} 
      canEdit={canEdit}
      departments={departments}
      jobTitles={jobTitles}
      locations={locations}
      orgMembers={orgMembers}
      portalInvites={portalInvites}
      userLinks={userLinks}
    />
  );
}
