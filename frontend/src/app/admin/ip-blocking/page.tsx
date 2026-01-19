import { prisma } from "@/lib/prisma";
import { BlockScope } from "@prisma/client";
import GlobalIPBlockingClient from "./GlobalIPBlockingClient";

export default async function GlobalIPBlockingPage() {
  const blockedIPs = await prisma.blockedIP.findMany({
    where: {
      scope: BlockScope.GLOBAL,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { attempts: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return <GlobalIPBlockingClient blockedIPs={blockedIPs} />;
}
