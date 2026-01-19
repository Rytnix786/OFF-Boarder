import { requirePlatformAdmin } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import UserDetailsClient from "./UserDetailsClient";

export default async function UserDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePlatformAdmin();
  
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      memberships: {
        include: {
          organization: { select: { id: true, name: true, slug: true, status: true } },
        },
      },
    },
  });

  if (!user) {
    notFound();
  }

  return <UserDetailsClient user={user} />;
}
