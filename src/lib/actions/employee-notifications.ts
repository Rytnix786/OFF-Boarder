"use server";

import { prisma } from "@/lib/prisma.server";
import { requireEmployeePortalAuth } from "@/lib/employee-auth.server";
import { revalidatePath } from "next/cache";

export type EmployeeNotification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  type: string;
};

export async function markNotificationRead(notificationId: string) {
  const session = await requireEmployeePortalAuth({ allowRevoked: true });
  if (session.employeeLink.status === "REVOKED") return { success: true };

  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId: session.user.id,
      organizationId: session.organizationId,
    },
  });

  if (!notification) {
    return { error: "Notification not found" };
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });

  revalidatePath("/app/employee/notifications");
  return { success: true };
}

export async function markAllNotificationsRead() {
  const session = await requireEmployeePortalAuth({ allowRevoked: true });
  if (session.employeeLink.status === "REVOKED") return { success: true };

  await prisma.notification.updateMany({
    where: {
      userId: session.user.id,
      organizationId: session.organizationId,
      read: false,
    },
    data: { read: true },
  });

  revalidatePath("/app/employee/notifications");
  return { success: true };
}

export async function getUnreadNotificationCount() {
  const session = await requireEmployeePortalAuth({ allowRevoked: true });
  if (session.employeeLink.status === "REVOKED") return 0;

  const count = await prisma.notification.count({
    where: {
      userId: session.user.id,
      organizationId: session.organizationId,
      read: false,
    },
  });

  return count;
}

export async function getRecentNotifications(limit: number = 5): Promise<EmployeeNotification[]> {
  const session = await requireEmployeePortalAuth({ allowRevoked: true });
  if (session.employeeLink.status === "REVOKED") return [];

  const notifications = await prisma.notification.findMany({
    where: {
      userId: session.user.id,
      organizationId: session.organizationId,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      message: true,
      read: true,
      createdAt: true,
      type: true,
    },
  });

  return notifications;
}

export async function markNotificationAsRead(notificationId: string) {
  return markNotificationRead(notificationId);
}
