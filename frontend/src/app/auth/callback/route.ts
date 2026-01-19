import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { randomBytes, createHash } from "crypto";

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
  roleVersion: number
): Promise<{ sessionToken: string; refreshToken: string | null }> {
  const userAgent = request.headers.get("user-agent");
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";

  const { browserName, browserVersion, osName, osVersion, deviceName } = parseUserAgent(userAgent);

  const deviceId = createHash("sha256")
    .update(`${userAgent || ""}:${ipAddress}`)
    .digest("hex")
    .substring(0, 32);

  const sessionToken = generateSecureToken();
  const refreshToken = generateSecureToken();
  const sessionTokenHash = hashToken(sessionToken);
  const refreshTokenHash = hashToken(refreshToken);

  const longExpiry = 30 * 24 * 60 * 60 * 1000;
  const refreshExpiry = 90 * 24 * 60 * 60 * 1000;

  const expiresAt = new Date(Date.now() + longExpiry);
  const refreshExpiresAt = new Date(Date.now() + refreshExpiry);

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
      authMethod: "oauth",
      rememberDevice: true,
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

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50) + "-" + Math.random().toString(36).substring(2, 8);
}

function setSessionCookies(
  response: NextResponse,
  sessionToken: string,
  refreshToken: string | null
): NextResponse {
  const longExpiry = 30 * 24 * 60 * 60 * 1000;
  const refreshExpiry = 90 * 24 * 60 * 60 * 1000;

  response.cookies.set("device_session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: longExpiry / 1000,
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

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const setup = searchParams.get("setup");
  const inviteToken = searchParams.get("invite");
  const redirectUrl = searchParams.get("redirect");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const existingUser = await prisma.user.findUnique({
        where: { supabaseId: data.user.id },
        include: {
          memberships: {
            include: { organization: true },
          },
        },
      });

      if (existingUser) {
        if (inviteToken) {
          const invitation = await prisma.invitation.findUnique({
            where: { token: inviteToken },
            include: { organization: true },
          });

          if (invitation && 
              invitation.status === "PENDING" && 
              invitation.email.toLowerCase() === existingUser.email.toLowerCase() &&
              new Date() <= invitation.expiresAt) {
            
            const existingMembership = await prisma.membership.findFirst({
              where: { userId: existingUser.id, organizationId: invitation.organizationId },
            });

              if (!existingMembership) {
                await prisma.$transaction([
                  prisma.membership.create({
                    data: {
                      userId: existingUser.id,
                      organizationId: invitation.organizationId,
                      systemRole: invitation.systemRole,
                      status: "ACTIVE",
                      invitedBy: invitation.invitedById,
                      approvedAt: new Date(),
                    },
                  }),
                prisma.invitation.update({
                  where: { id: invitation.id },
                  data: {
                    status: "ACCEPTED",
                    acceptedAt: new Date(),
                    acceptedByUserId: existingUser.id,
                  },
                }),
                prisma.auditLog.create({
                  data: {
                    action: "member.joined",
                    entityType: "Membership",
                    newData: { email: existingUser.email, role: invitation.systemRole },
                    organizationId: invitation.organizationId,
                    userId: existingUser.id,
                  },
                }),
              ]);
                const { sessionToken, refreshToken } = await createUserSession(
                  request,
                  existingUser.id,
                  invitation.organizationId,
                  existingUser.passwordVersion,
                  existingUser.roleVersion
                );
                const response = NextResponse.redirect(`${origin}/app`);
                return setSessionCookies(response, sessionToken, refreshToken);
            }
          }
        }

        const activeOrg = existingUser.memberships.find(
          m => m.status === "ACTIVE" && m.organization.status === "ACTIVE"
        );
        const pendingOrg = existingUser.memberships.find(
          m => m.status === "PENDING" || m.organization.status === "PENDING"
        );
        const targetOrgId = activeOrg?.organizationId || pendingOrg?.organizationId || null;

        const { sessionToken, refreshToken } = await createUserSession(
          request,
          existingUser.id,
          targetOrgId,
          existingUser.passwordVersion,
          existingUser.roleVersion
        );

        if (existingUser.isPlatformAdmin) {
          const response = NextResponse.redirect(`${origin}/admin`);
          return setSessionCookies(response, sessionToken, refreshToken);
        }
        
        if (redirectUrl) {
          const response = NextResponse.redirect(`${origin}${redirectUrl}`);
          return setSessionCookies(response, sessionToken, refreshToken);
        }
        
        if (activeOrg) {
          const response = NextResponse.redirect(`${origin}/app`);
          return setSessionCookies(response, sessionToken, refreshToken);
        }
        
        if (pendingOrg) {
          const response = NextResponse.redirect(`${origin}/pending`);
          return setSessionCookies(response, sessionToken, refreshToken);
        }
        
        const response = NextResponse.redirect(`${origin}/register`);
        return setSessionCookies(response, sessionToken, refreshToken);
      }

      if (inviteToken) {
        const invitation = await prisma.invitation.findUnique({
          where: { token: inviteToken },
          include: { organization: true },
        });

        if (invitation && 
            invitation.status === "PENDING" && 
            invitation.email.toLowerCase() === data.user.email?.toLowerCase() &&
            new Date() <= invitation.expiresAt) {
          
          const userName = data.user.user_metadata?.name || 
                          data.user.user_metadata?.full_name || 
                          data.user.email?.split("@")[0] || 
                          "User";
          const now = new Date();

          const newUser = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
              data: {
                supabaseId: data.user.id,
                email: data.user.email!.toLowerCase(),
                name: userName,
                avatarUrl: data.user.user_metadata?.avatar_url || null,
                updatedAt: now,
              },
            });

              await tx.membership.create({
                data: {
                  userId: user.id,
                  organizationId: invitation.organizationId,
                  systemRole: invitation.systemRole,
                  status: "ACTIVE",
                  invitedBy: invitation.invitedById,
                  approvedAt: now,
                  updatedAt: now,
                },
              });

            await tx.invitation.update({
              where: { id: invitation.id },
              data: {
                status: "ACCEPTED",
                acceptedAt: now,
                acceptedByUserId: user.id,
              },
            });

            await tx.auditLog.create({
              data: {
                action: "member.joined",
                entityType: "Membership",
                newData: { email: user.email, role: invitation.systemRole, joinedViaInvitation: true },
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

            return user;
          });

            const { sessionToken, refreshToken } = await createUserSession(
              request,
              newUser.id,
              invitation.organizationId,
              newUser.passwordVersion,
              newUser.roleVersion
            );
            const response = NextResponse.redirect(`${origin}/app`);
            return setSessionCookies(response, sessionToken, refreshToken);
          }
        }

        if (setup === "true") {
        const pendingInvitation = await prisma.invitation.findFirst({
          where: {
            email: { equals: data.user.email?.toLowerCase(), mode: "insensitive" },
            status: "PENDING",
            expiresAt: { gt: new Date() },
          },
          include: { organization: true },
        });

        if (pendingInvitation) {
          const userName = data.user.user_metadata?.name || 
                          data.user.user_metadata?.full_name || 
                          data.user.email?.split("@")[0] || 
                          "User";
          const now = new Date();

          const newUser = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
              data: {
                supabaseId: data.user.id,
                email: data.user.email!.toLowerCase(),
                name: userName,
                avatarUrl: data.user.user_metadata?.avatar_url || null,
                updatedAt: now,
              },
            });

              await tx.membership.create({
                data: {
                  userId: user.id,
                  organizationId: pendingInvitation.organizationId,
                  systemRole: pendingInvitation.systemRole,
                  status: "ACTIVE",
                  invitedBy: pendingInvitation.invitedById,
                  approvedAt: now,
                  updatedAt: now,
                },
              });

            await tx.invitation.update({
              where: { id: pendingInvitation.id },
              data: {
                status: "ACCEPTED",
                acceptedAt: now,
                acceptedByUserId: user.id,
              },
            });

            await tx.auditLog.create({
              data: {
                action: "member.joined",
                entityType: "Membership",
                newData: { email: user.email, role: pendingInvitation.systemRole },
                organizationId: pendingInvitation.organizationId,
                userId: user.id,
              },
            });

            return user;
          });

            const { sessionToken, refreshToken } = await createUserSession(
              request,
              newUser.id,
              pendingInvitation.organizationId,
              newUser.passwordVersion,
              newUser.roleVersion
            );
            const response = NextResponse.redirect(`${origin}/app`);
            return setSessionCookies(response, sessionToken, refreshToken);
          }

        const userName = data.user.user_metadata?.name || 
                        data.user.user_metadata?.full_name || 
                        data.user.email?.split("@")[0] || 
                        "User";
        const orgName = data.user.user_metadata?.org_name || `${userName}'s Organization`;
        const slug = generateSlug(orgName);
        const now = new Date();

        const result = await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              supabaseId: data.user.id,
              email: data.user.email!.toLowerCase(),
              name: userName,
              avatarUrl: data.user.user_metadata?.avatar_url || null,
              updatedAt: now,
            },
          });

          const organization = await tx.organization.create({
            data: {
              name: orgName,
              slug,
              status: "PENDING",
              updatedAt: now,
            },
          });

          await tx.membership.create({
            data: {
              userId: user.id,
              organizationId: organization.id,
              systemRole: "OWNER",
              status: "ACTIVE",
              updatedAt: now,
            },
          });

          await tx.auditLog.create({
            data: {
              action: "organization.created",
              entityType: "Organization",
              entityId: organization.id,
              newData: { name: organization.name, slug: organization.slug },
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

          return { user, organization };
        });

        const { sessionToken, refreshToken } = await createUserSession(
          request,
          result.user.id,
          result.organization.id,
          result.user.passwordVersion,
          result.user.roleVersion
        );
        const response = NextResponse.redirect(`${origin}/pending`);
        return setSessionCookies(response, sessionToken, refreshToken);
      }

      const userName = data.user.user_metadata?.name || 
                      data.user.user_metadata?.full_name || 
                      data.user.email?.split("@")[0] || 
                      "User";
      const now = new Date();
      
      const newUser = await prisma.user.create({
        data: {
          supabaseId: data.user.id,
          email: data.user.email!.toLowerCase(),
          name: userName,
          avatarUrl: data.user.user_metadata?.avatar_url || null,
          updatedAt: now,
        },
      });

      const { sessionToken, refreshToken } = await createUserSession(
        request,
        newUser.id,
        null,
        newUser.passwordVersion,
        newUser.roleVersion
      );
      const response = NextResponse.redirect(`${origin}/register`);
      return setSessionCookies(response, sessionToken, refreshToken);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
