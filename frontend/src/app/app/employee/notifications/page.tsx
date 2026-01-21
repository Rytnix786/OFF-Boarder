import { requireEmployeePortalAuth } from "@/lib/employee-auth.server";
import { prisma } from "@/lib/prisma.server";
import NotificationsClient from "./NotificationsClient";

export default async function EmployeeNotificationsPage() {
  const session = await requireEmployeePortalAuth();

  const notifications = await prisma.notification.findMany({
    where: {
      userId: session.user.id,
      organizationId: session.organizationId,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return <NotificationsClient notifications={notifications} />;
}
