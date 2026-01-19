import "server-only";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { MembershipWithOrg, AuthSession } from "@/lib/auth-types";

export type { AuthUser, MembershipWithOrg, AuthSession } from "@/lib/auth-types";

export async function getSupabaseUser() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      return null;
    }
    return data.user;
  } catch {
    return null;
  }
}

export async function getAuthSession(orgSlug?: string): Promise<AuthSession | null> {
  const supabaseUser = await getSupabaseUser();
  if (!supabaseUser) return null;

  const user = await prisma.user.findUnique({
    where: { supabaseId: supabaseUser.id },
    include: {
      memberships: {
        where: { status: "ACTIVE" },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  const activeMemberships = user.memberships.filter(
    (m) => m.organization.status === "ACTIVE"
  );

  const memberships: MembershipWithOrg[] = activeMemberships.map((m) => ({
    id: m.id,
    organizationId: m.organizationId,
    systemRole: m.systemRole,
    status: m.status,
    organization: m.organization,
  }));

  let currentMembership: MembershipWithOrg | null = null;
  if (orgSlug) {
    currentMembership = memberships.find((m) => m.organization.slug === orgSlug) || null;
  } else if (memberships.length > 0) {
    currentMembership = memberships[0];
  }

  return {
      user: {
        id: user.id,
        supabaseId: user.supabaseId,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        isPlatformAdmin: user.isPlatformAdmin,
        createdAt: user.createdAt,
      },
      memberships,
      currentMembership,
      currentOrgId: currentMembership?.organizationId || null,
    };
}

export async function requireAuth(orgSlug?: string): Promise<AuthSession> {
  const session = await getAuthSession(orgSlug);
  if (!session) redirect("/login");
  return session;
}

export async function requirePlatformAdmin(): Promise<AuthSession> {
  const session = await requireAuth();
  if (!session.user.isPlatformAdmin) {
    redirect("/app");
  }
  return session;
}

export async function requireActiveOrg(orgSlug?: string): Promise<AuthSession> {
  const session = await requireAuth(orgSlug);
  if (!session.currentMembership) {
    redirect("/pending");
  }
  if (session.currentMembership.organization.status !== "ACTIVE") {
    redirect("/pending");
  }
  return session;
}

export async function getUserPendingOrgs(userId: string) {
  return prisma.membership.findMany({
    where: {
      userId,
      OR: [
        { status: "PENDING" },
        { organization: { status: { in: ["PENDING", "SUSPENDED"] } } },
      ],
    },
    include: {
      organization: true,
    },
  });
}
