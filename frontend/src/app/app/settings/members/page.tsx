import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission } from "@/lib/rbac.server";
import { prisma } from "@/lib/prisma.server";
import MembersClient from "./MembersClient";

export default async function MembersPage() {
  const session = await requireActiveOrg();
  await requirePermission(session, "member:read");

  const isOwner = session.currentMembership?.systemRole === "OWNER";
  const isAdmin = session.currentMembership?.systemRole === "ADMIN";
  const canManage = isOwner || isAdmin;

  await prisma.joinRequest.updateMany({
    where: {
      organizationId: session.currentOrgId!,
      status: { in: ["REQUESTED_MEMBER", "REQUESTED_ADMIN"] },
      expiresAt: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });

  const joinRequestStatusFilter = isOwner 
    ? ["REQUESTED_MEMBER", "REQUESTED_ADMIN"] 
    : ["REQUESTED_MEMBER"];

  const [members, invitations, customRoles, joinRequests] = await Promise.all([
    prisma.membership.findMany({
      where: { organizationId: session.currentOrgId!, status: "ACTIVE" },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        roleAssignments: {
          include: {
            customRole: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invitation.findMany({
      where: { organizationId: session.currentOrgId!, status: "PENDING" },
      include: {
        invitedBy: { select: { id: true, name: true, email: true } },
        customRole: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.customRole.findMany({
      where: { organizationId: session.currentOrgId! },
      select: {
        id: true,
        name: true,
        description: true,
        _count: { select: { assignments: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.joinRequest.findMany({
      where: {
        organizationId: session.currentOrgId!,
        status: { in: joinRequestStatusFilter as any },
      },
      include: {
        User_JoinRequest_requesterUserIdToUser: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const joinRequestsMapped = joinRequests.map((jr) => ({
    ...jr,
    requester: jr.User_JoinRequest_requesterUserIdToUser,
  }));

  return (
    <MembersClient
      members={members}
      invitations={invitations}
      customRoles={customRoles}
      joinRequests={joinRequestsMapped}
      canManage={canManage}
      isOwner={isOwner}
      currentUserId={session.user.id}
    />
  );
}
