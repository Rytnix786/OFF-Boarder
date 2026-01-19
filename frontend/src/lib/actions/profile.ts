"use server";

import { prisma } from "@/lib/prisma.server";
import { requireAuth, requireActiveOrg } from "@/lib/auth.server";
import { createAuditLog } from "@/lib/audit.server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  try {
    const session = await requireAuth();

    const name = formData.get("name") as string || null;
    const avatarUrl = formData.get("avatarUrl") as string || null;

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name || null,
        avatarUrl: avatarUrl || null,
      },
    });

    revalidatePath("/app/settings/profile");
    revalidatePath("/app");
    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to update profile" };
  }
}

export async function changePassword(currentPassword: string, newPassword: string) {
  try {
    const session = await requireActiveOrg();
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      return { success: false, error: "User not found" };
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      return { success: false, error: "Current password is incorrect" };
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    await createAuditLog(session, session.currentOrgId!, {
      action: "user.password_changed" as "user.login",
      entityType: "User",
      entityId: session.user.id,
      newData: { action: "password_changed" },
    });

    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to change password" };
  }
}

export async function getSecurityActivity(limit = 10) {
  const session = await requireActiveOrg();

  const logs = await prisma.auditLog.findMany({
    where: {
      userId: session.user.id,
      action: {
        in: ["user.login", "user.logout", "user.registered", "user.password_changed"],
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      action: true,
      createdAt: true,
      ipAddress: true,
      userAgent: true,
    },
  });

  return logs;
}
