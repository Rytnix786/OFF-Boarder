import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma.server";
import { randomBytes, createHash } from "crypto";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50) + "-" + Math.random().toString(36).substring(2, 8);
}

function generateSecureToken(): string {
  return randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function parseUserAgent(ua: string | null): {
  browserName: string | null;
  browserVersion: string | null;
  osName: string | null;
  osVersion: string | null;
  deviceName: string | null;
} {
  if (!ua) return { browserName: null, browserVersion: null, osName: null, osVersion: null, deviceName: null };

  let browserName = null;
  let browserVersion = null;
  let osName = null;
  let osVersion = null;
  let deviceName = null;

  if (ua.includes("Chrome")) {
    browserName = "Chrome";
    const match = ua.match(/Chrome\/(\d+\.\d+)/);
    browserVersion = match?.[1] || null;
  } else if (ua.includes("Firefox")) {
    browserName = "Firefox";
    const match = ua.match(/Firefox\/(\d+\.\d+)/);
    browserVersion = match?.[1] || null;
  } else if (ua.includes("Safari") && !ua.includes("Chrome")) {
    browserName = "Safari";
    const match = ua.match(/Version\/(\d+\.\d+)/);
    browserVersion = match?.[1] || null;
  } else if (ua.includes("Edge")) {
    browserName = "Edge";
    const match = ua.match(/Edge\/(\d+\.\d+)/);
    browserVersion = match?.[1] || null;
  }

  if (ua.includes("Windows")) {
    osName = "Windows";
    if (ua.includes("Windows NT 10")) osVersion = "10";
    else if (ua.includes("Windows NT 6.3")) osVersion = "8.1";
  } else if (ua.includes("Mac OS X")) {
    osName = "macOS";
    const match = ua.match(/Mac OS X (\d+[._]\d+)/);
    osVersion = match?.[1]?.replace("_", ".") || null;
  } else if (ua.includes("Linux")) {
    osName = "Linux";
  } else if (ua.includes("Android")) {
    osName = "Android";
    const match = ua.match(/Android (\d+\.?\d*)/);
    osVersion = match?.[1] || null;
  } else if (ua.includes("iPhone") || ua.includes("iPad")) {
    osName = "iOS";
    const match = ua.match(/OS (\d+_\d+)/);
    osVersion = match?.[1]?.replace("_", ".") || null;
  }

  if (ua.includes("Mobile")) deviceName = "Mobile Device";
  else if (ua.includes("Tablet") || ua.includes("iPad")) deviceName = "Tablet";
  else deviceName = "Desktop";

  return { browserName, browserVersion, osName, osVersion, deviceName };
}

async function createUserSession(
  request: NextRequest,
  userId: string,
  organizationId: string | null,
  passwordVersion: number,
  roleVersion: number,
  rememberDevice: boolean
): Promise<{ sessionToken: string; refreshToken: string | null }> {
  const userAgent = request.headers.get("user-agent");
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";

  const { browserName, browserVersion, osName, osVersion, deviceName } = parseUserAgent(userAgent);

  const deviceId = createHash("sha256")
    .update(`${userAgent || ""}:${ipAddress}`)
    .digest("hex")
    .substring(0, 32);

  // Enforcement logic for SESSION_REVOCATION_RULES
  const policy = await prisma.globalSecurityPolicy.findUnique({
    where: { policyType: "SESSION_REVOCATION_RULES" }
  });

  let sessionExpiry = rememberDevice ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  
  if (policy?.isActive) {
    const config = policy.config as any;
    if (config.maxSessionAge) {
      sessionExpiry = Math.min(sessionExpiry, config.maxSessionAge * 60 * 60 * 1000);
    }
  }

  const sessionToken = generateSecureToken();
  const refreshToken = rememberDevice ? generateSecureToken() : null;
  const sessionTokenHash = hashToken(sessionToken);
  const refreshTokenHash = refreshToken ? hashToken(refreshToken) : null;

  const refreshExpiry = 90 * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + sessionExpiry);
  const refreshExpiresAt = refreshToken ? new Date(Date.now() + refreshExpiry) : null;

  await prisma.userSession.updateMany({
    where: { userId },
    data: { isCurrent: false },
  });

  await prisma.userSession.create({
    data: {
      userId,
      organizationId,
      sessionToken: sessionTokenHash,
      refreshToken: refreshTokenHash,
      deviceId,
      deviceName,
      browserName,
      browserVersion,
      osName,
      osVersion,
      ipAddress,
      userAgent,
      authMethod: "password",
      rememberDevice,
      expiresAt,
      refreshExpiresAt,
      passwordVersion,
      roleVersion,
      isCurrent: true,
      lastActiveAt: new Date(),
    },
  });

  return { sessionToken, refreshToken };
}

function setSessionCookies(
  response: NextResponse,
  sessionToken: string,
  refreshToken: string | null,
  rememberDevice: boolean
): NextResponse {
  const sessionExpiry = rememberDevice ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const refreshExpiry = 90 * 24 * 60 * 60 * 1000;

  response.cookies.set("device_session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionExpiry / 1000,
  });

  if (refreshToken) {
    response.cookies.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: refreshExpiry / 1000,
    });
  }

  return response;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { supabaseId, email, name, orgName, invitationToken, redirectUrl, rememberDevice = false } = body;

    if (supabaseId && email) {
      const existingUser = await prisma.user.findUnique({
        where: { supabaseId },
        include: { memberships: { include: { organization: true } } },
      });

      if (existingUser) {
        return NextResponse.json({ user: existingUser, isExisting: true });
      }

      if (invitationToken) {
        const invitation = await prisma.invitation.findUnique({
          where: { token: invitationToken },
          include: { organization: true },
        });

        if (!invitation) {
          return NextResponse.json(
            { error: "Invitation not found" },
            { status: 400 }
          );
        }

        if (invitation.status !== "PENDING") {
          return NextResponse.json(
            { error: "This invitation has already been used or is no longer valid" },
            { status: 400 }
          );
        }

        if (new Date() > invitation.expiresAt) {
          await prisma.invitation.update({
            where: { id: invitation.id },
            data: { status: "EXPIRED" },
          });
          return NextResponse.json(
            { error: "This invitation has expired. Please request a new one." },
            { status: 400 }
          );
        }

        if (invitation.email.toLowerCase() !== email.toLowerCase()) {
          return NextResponse.json(
            { error: "This invitation was sent to a different email address" },
            { status: 403 }
          );
        }

        const result = await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              supabaseId,
              email: email.toLowerCase(),
              name: name || null,
              isPlatformAdmin: false,
            },
          });

            const membership = await tx.membership.create({
              data: {
                userId: user.id,
                organizationId: invitation.organizationId,
                systemRole: invitation.systemRole,
                status: "ACTIVE",
                invitedBy: invitation.invitedById,
                approvedAt: new Date(),
              },
            });

          await tx.invitation.update({
            where: { id: invitation.id },
            data: {
              status: "ACCEPTED",
              acceptedAt: new Date(),
              acceptedByUserId: user.id,
            },
          });

          await tx.auditLog.create({
            data: {
              action: "member.joined",
              entityType: "Membership",
              entityId: membership.id,
              newData: { email: user.email, role: invitation.systemRole, invitedBy: invitation.invitedById },
              organizationId: invitation.organizationId,
              userId: user.id,
            },
          });

          await tx.auditLog.create({
            data: {
              action: "user.registered",
              entityType: "User",
              entityId: user.id,
              newData: { email: user.email, name: user.name, joinedViaInvitation: true },
              organizationId: invitation.organizationId,
              userId: user.id,
            },
          });

          return { user, membership, organization: invitation.organization };
        });

        return NextResponse.json({ ...result, isNew: true, joinedViaInvitation: true });
      }

      const pendingInvitation = await prisma.invitation.findFirst({
        where: {
          email: { equals: email.toLowerCase(), mode: "insensitive" },
          status: "PENDING",
          expiresAt: { gt: new Date() },
        },
        include: { organization: true },
      });

      if (pendingInvitation) {
        return NextResponse.json(
          { 
            error: `You have a pending invitation to join ${pendingInvitation.organization.name}. Please use your invitation link or register with the invitation.`,
            hasInvitation: true,
            organizationName: pendingInvitation.organization.name,
          },
          { status: 400 }
        );
      }

      if (!orgName) {
        return NextResponse.json(
          { error: "Organization name is required for new accounts" },
          { status: 400 }
        );
      }

      const slug = generateSlug(orgName);

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            supabaseId,
            email: email.toLowerCase(),
            name: name || null,
            isPlatformAdmin: false,
          },
        });

        const organization = await tx.organization.create({
          data: {
            name: orgName,
            slug,
            status: "PENDING",
          },
        });

        const membership = await tx.membership.create({
          data: {
            userId: user.id,
            organizationId: organization.id,
            systemRole: "OWNER",
            status: "ACTIVE",
          },
        });

        await tx.auditLog.create({
          data: {
            action: "organization.created",
            entityType: "Organization",
            entityId: organization.id,
            newData: { name: organization.name, slug: organization.slug, status: "PENDING" },
            organizationId: organization.id,
            userId: user.id,
          },
        });

        await tx.auditLog.create({
          data: {
            action: "user.registered",
            entityType: "User",
            entityId: user.id,
            newData: { email: user.email, name: user.name },
            organizationId: organization.id,
            userId: user.id,
          },
        });

        return { user, organization, membership };
      });

      return NextResponse.json({ ...result, isNew: true });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      include: {
        memberships: {
          include: {
            organization: {
              select: { id: true, status: true, name: true },
            },
          },
        },
        employeeUserLinks: {
          where: { status: "VERIFIED" },
          include: {
            organization: { select: { id: true, name: true, status: true } },
          },
        },
      },
    });

    if (!dbUser) {
      return NextResponse.json({ redirectTo: "/register" });
    }

    if (dbUser.isPlatformAdmin) {
      const { sessionToken, refreshToken } = await createUserSession(
        request,
        dbUser.id,
        null,
        dbUser.passwordVersion,
        dbUser.roleVersion,
        rememberDevice
      );
      
      const response = NextResponse.json({ redirectTo: "/admin" });
      return setSessionCookies(response, sessionToken, refreshToken, rememberDevice);
    }

    const activeOrg = dbUser.memberships.find(
      (m) => m.status === "ACTIVE" && m.organization.status === "ACTIVE"
    );

    const activeEmployeeLink = dbUser.employeeUserLinks.find(
      (link) => link.status === "VERIFIED" && link.organization.status === "ACTIVE"
    );

    const pendingOrg = dbUser.memberships.find(
      (m) => m.organization.status === "PENDING"
    );

    const targetOrgId = activeOrg?.organizationId || activeEmployeeLink?.organizationId || pendingOrg?.organizationId || null;

    const { sessionToken, refreshToken } = await createUserSession(
      request,
      dbUser.id,
      targetOrgId,
      dbUser.passwordVersion,
      dbUser.roleVersion,
      rememberDevice
    );

    let targetUrl = "/register";

    if (redirectUrl) {
      const isEmployeeRedirect = redirectUrl.startsWith("/app/employee");
      const isAppRedirect = redirectUrl.startsWith("/app") && !isEmployeeRedirect;
      
      if (isEmployeeRedirect && activeEmployeeLink) {
        targetUrl = redirectUrl;
      } else if (isAppRedirect && activeOrg) {
        targetUrl = redirectUrl;
      } else if (activeOrg) {
        targetUrl = "/app";
      } else if (activeEmployeeLink) {
        targetUrl = "/app/employee";
      } else if (pendingOrg) {
        targetUrl = "/pending";
      }
    } else {
      if (activeOrg) {
        targetUrl = "/app";
      } else if (activeEmployeeLink) {
        targetUrl = "/app/employee";
      } else if (pendingOrg) {
        targetUrl = "/pending";
      }
    }

    const response = NextResponse.json({ redirectTo: targetUrl });
    return setSessionCookies(response, sessionToken, refreshToken, rememberDevice);

  } catch (error) {
    console.error("Auth setup error:", error);
    return NextResponse.json(
      { error: "Failed to set up account" },
      { status: 500 }
    );
  }
}
