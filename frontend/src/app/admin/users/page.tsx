import { requirePlatformAdmin } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";
import UsersClient from "./UsersClient";

export default async function AdminUsersPage() {
  await requirePlatformAdmin();

  const users = await prisma.user.findMany({
    include: {
      memberships: {
        include: {
          organization: { select: { id: true, name: true, status: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return <UsersClient users={users} />;
}
