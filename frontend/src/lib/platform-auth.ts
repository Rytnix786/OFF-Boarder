import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma.server";

export type PlatformAdminSession = {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  isPlatformAdmin: true;
};

export async function requirePlatformAdmin(): Promise<PlatformAdminSession> {
  const supabase = await createClient();
  const { data: { user: authUser }, error } = await supabase.auth.getUser();

  if (error || !authUser) {
    throw new Error("UNAUTHORIZED");
  }

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      isPlatformAdmin: true,
    },
  });

  if (!user || !user.isPlatformAdmin) {
    throw new Error("FORBIDDEN");
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    isPlatformAdmin: true,
  };
}

export async function getCurrentPlatformAdmin(): Promise<{ id: string; email: string; name: string | null }> {
  const session = await requirePlatformAdmin();
  return session.user;
}

export async function logPlatformAction({
  action,
  entityType,
  entityId,
  organizationId,
  targetOrgName,
  oldData,
  newData,
  metadata,
  userId,
  userName,
  severity = "INFO",
  ipAddress,
  userAgent,
}: {
  action: string;
  entityType: string;
  entityId?: string;
  organizationId?: string;
  targetOrgName?: string;
  oldData?: object;
  newData?: object;
  metadata?: object;
  userId: string;
  userName?: string;
  severity?: "INFO" | "WARNING" | "CRITICAL";
  ipAddress?: string;
  userAgent?: string;
}) {
  return prisma.platformAuditLog.create({
    data: {
      action,
      entityType,
      entityId,
      organizationId,
      targetOrgName,
      oldData: oldData || undefined,
      newData: newData || undefined,
      metadata: metadata || undefined,
      userId,
      userName,
      severity,
      ipAddress,
      userAgent,
    },
  });
}
