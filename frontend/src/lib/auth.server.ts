import "server-only";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma.server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { MembershipWithOrg, AuthSession } from "@/lib/auth-types";

export type { AuthUser, MembershipWithOrg, AuthSession } from "@/lib/auth-types";

export class AuthError extends Error {
  constructor(message: string, public code: "UNAUTHENTICATED" | "UNAUTHORIZED" | "NO_ORG") {
    super(message);
    this.name = "AuthError";
  }
}

async function getCurrentPathname(): Promise<string | null> {
  try {
    const headersList = await headers();
    return headersList.get("x-pathname");
  } catch {
    return null;
  }
}

async function isServerAction(): Promise<boolean> {
  try {
    const headersList = await headers();
    const nextAction = headersList.get("next-action");
    return !!nextAction;
  } catch {
    return false;
  }
}

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
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              status: true,
              isSetupComplete: true,
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  // No longer filter by organization status here, let requireActiveOrg handle it
  const memberships: MembershipWithOrg[] = user.memberships.map((m) => ({
    id: m.id,
    organizationId: m.organizationId,
    systemRole: m.systemRole,
    status: m.status,
    organization: m.organization,
  }));

  // Find the most appropriate current membership
  let currentMembership: MembershipWithOrg | null = null;
  
  if (orgSlug) {
    currentMembership = memberships.find((m) => m.organization.slug === orgSlug) || null;
  } else {
    // Prefer ACTIVE over other statuses if no slug provided
    currentMembership = 
      memberships.find((m) => m.status === "ACTIVE") || 
      memberships[0] || 
      null;
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

export async function getOrgViewSession(orgId: string): Promise<AuthSession | null> {
  const session = await getAuthSession();
  if (!session || !session.user.isPlatformAdmin) return null;

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      status: true,
      isSetupComplete: true,
    },
  });

  if (!org) return null;

  const orgViewMembership: MembershipWithOrg = {
    id: `ov_${org.id}`,
    organizationId: org.id,
    systemRole: "AUDITOR", // Force read-only role
    status: "ACTIVE",
    organization: org,
  };

  return {
    ...session,
    currentMembership: orgViewMembership,
    currentOrgId: org.id,
  };
}

export async function requireAuth(orgSlug?: string): Promise<AuthSession> {
  const session = await getAuthSession(orgSlug);
  if (!session) {
    const inServerAction = await isServerAction();
    if (inServerAction) {
      throw new AuthError("Session expired. Please refresh the page.", "UNAUTHENTICATED");
    }
    const pathname = await getCurrentPathname();
    if (pathname && pathname !== "/login") {
      redirect(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
    redirect("/login");
  }
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
    const inServerAction = await isServerAction();
    if (inServerAction) {
      throw new AuthError("No active organization membership.", "NO_ORG");
    }
    redirect("/pending");
  }

  // Handle suspended or revoked memberships
  if (session.currentMembership.status === "SUSPENDED" || session.currentMembership.status === "REVOKED") {
    const inServerAction = await isServerAction();
    if (inServerAction) {
      throw new AuthError("Your access has been suspended or revoked.", "UNAUTHORIZED");
    }
    redirect("/app/access-suspended");
  }

  // Handle suspended organizations directly
  if (session.currentMembership.organization.status === "SUSPENDED") {
    const inServerAction = await isServerAction();
    if (inServerAction) {
      throw new AuthError("Organization is suspended.", "NO_ORG");
    }
    redirect("/org-blocked");
  }

  if (session.currentMembership.organization.status !== "ACTIVE") {
    const inServerAction = await isServerAction();
    if (inServerAction) {
      throw new AuthError("Organization is not active.", "NO_ORG");
    }
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
