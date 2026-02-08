import { requirePlatformAdmin } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma.server";
import UsersClient from "./UsersClient";

export default async function AdminUsersPage() {
  await requirePlatformAdmin();

  const users = await prisma.user.findMany({
    where: { isPlatformAdmin: true },
    include: {
      memberships: {
        include: {
          organization: { select: { id: true, name: true, status: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Convert Date fields to strings for serialization
  const serializedUsers = users.map(user => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    memberships: user.memberships.map(membership => ({
      ...membership,
      createdAt: membership.createdAt.toISOString(),
      updatedAt: membership.updatedAt.toISOString(),
    })),
  }));

  return <UsersClient users={serializedUsers} />;
}
