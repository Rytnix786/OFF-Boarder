"use server";

import { prisma } from "@/lib/prisma.server";
import { requireEmployeePortalAuth } from "@/lib/employee-auth.server";
import { revalidatePath } from "next/cache";

export async function markNotificationRead(notificationId: string) {
  const session = await requireEmployeePortalAuth();

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
  const session = await requireEmployeePortalAuth();

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
  const session = await requireEmployeePortalAuth();

  const count = await prisma.notification.count({
    where: {
      userId: session.user.id,
      organizationId: session.organizationId,
      read: false,
    },
  });

  return count;
}
