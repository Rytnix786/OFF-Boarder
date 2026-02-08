import "server-only";
import { prisma } from "@/lib/prisma.server";
import { BlockScope, Prisma } from "@prisma/client";
import { headers } from "next/headers";

export async function getClientIP(): Promise<string> {
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map((ip: string) => ip.trim());
    return ips[0];
  }
  const realIP = headersList.get("x-real-ip");
  if (realIP) return realIP;
  const cfConnectingIP = headersList.get("cf-connecting-ip");
  if (cfConnectingIP) return cfConnectingIP;
  return "127.0.0.1";
}

export async function isIPBlocked(
  ipAddress: string,
  organizationId?: string | null,
  employeeId?: string | null,
  checkOffboardingOnly?: boolean
): Promise<{ blocked: boolean; blockedIP: { id: string; reason: string | null; scope: BlockScope } | null }> {
  const now = new Date();
  
  const globalBlock = await prisma.blockedIP.findFirst({
    where: {
      ipAddress,
      scope: BlockScope.GLOBAL,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { id: true, reason: true, scope: true },
  });

  if (globalBlock) {
    return { blocked: true, blockedIP: globalBlock };
  }

  if (organizationId) {
    const orgBlock = await prisma.blockedIP.findFirst({
      where: {
        ipAddress,
        scope: BlockScope.ORGANIZATION,
        organizationId,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { id: true, reason: true, scope: true },
    });

    if (orgBlock) {
      return { blocked: true, blockedIP: orgBlock };
    }
  }

  if (employeeId) {
    const employeeBlockWhere: Prisma.BlockedIPWhereInput = {
      ipAddress,
      scope: "EMPLOYEE",
      employeeId,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    };

    if (checkOffboardingOnly === false) {
      employeeBlockWhere.offboardingOnly = false;
    }

    const employeeBlock = await prisma.blockedIP.findFirst({
      where: employeeBlockWhere,
      select: { id: true, reason: true, scope: true, offboardingOnly: true },
    });

    if (employeeBlock) {
      if (!employeeBlock.offboardingOnly || checkOffboardingOnly) {
        return { blocked: true, blockedIP: employeeBlock };
      }
    }
  }

  return { blocked: false, blockedIP: null };
}

export async function checkIPBlockedForAnyOrg(ipAddress: string): Promise<{
  blocked: boolean;
  blockedIP: { id: string; reason: string | null; organizationId: string | null } | null;
}> {
  const now = new Date();
  const block = await prisma.blockedIP.findFirst({
    where: {
      ipAddress,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { id: true, reason: true, organizationId: true },
    orderBy: { scope: "asc" },
  });

  if (block) {
    return { blocked: true, blockedIP: block };
  }

  return { blocked: false, blockedIP: null };
}

export async function recordBlockedAttempt(params: {
  ipAddress: string;
  blockedIPId?: string | null;
  path?: string;
  method?: string;
  userId?: string;
  userAgent?: string;
}) {
  try {
    const attempt = await prisma.blockedIPAttempt.create({
      data: {
        ipAddress: params.ipAddress,
        blockedIPId: params.blockedIPId,
        path: params.path,
        method: params.method,
        userId: params.userId,
        userAgent: params.userAgent,
      },
    });

    // Enforcement logic for IP_BLOCKING_THRESHOLDS
    const policy = await prisma.globalSecurityPolicy.findUnique({
      where: { policyType: "IP_BLOCKING_THRESHOLDS" }
    });

    if (policy?.isActive) {
      const config = policy.config as { maxFailedAttempts?: number; blockDurationMinutes?: number };
      const maxAttempts = config.maxFailedAttempts || 5;
      const duration = config.blockDurationMinutes || 60;

      const attemptCount = await prisma.blockedIPAttempt.count({
        where: {
          ipAddress: params.ipAddress,
          createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } // Check last 15 mins
        }
      });

      if (attemptCount >= maxAttempts) {
        const existingBlock = await prisma.blockedIP.findFirst({
          where: { 
            ipAddress: params.ipAddress, 
            scope: BlockScope.GLOBAL, 
            organizationId: null 
          }
        });

        if (existingBlock) {
          await prisma.blockedIP.update({
            where: { id: existingBlock.id },
            data: {
              isActive: true,
              expiresAt: new Date(Date.now() + duration * 60 * 1000),
              reason: `Automatic block: Exceeded threshold of ${maxAttempts} failed attempts.`,
              updatedAt: new Date()
            }
          });
        } else {
          await prisma.blockedIP.create({
            data: {
              ipAddress: params.ipAddress,
              scope: BlockScope.GLOBAL,
              reason: `Automatic block: Exceeded threshold of ${maxAttempts} failed attempts.`,
              expiresAt: new Date(Date.now() + duration * 60 * 1000),
              isActive: true,
              createdById: "system"
            }
          });
        }

        await prisma.policyEnforcementLog.create({
          data: {
            policyType: "IP_BLOCKING_THRESHOLDS",
            policyId: policy.id,
            organizationId: "platform", // Global block
            action: "IP_BLOCKED",
            status: "ENFORCED",
            targetType: "IP",
            targetId: params.ipAddress,
            details: { attempts: attemptCount, threshold: maxAttempts }
          }
        });
      }
    }
  } catch (error) {
    console.error("Failed to record blocked attempt:", error);
  }
}

export async function blockIP(params: {
  ipAddress: string;
  scope: BlockScope;
  organizationId?: string | null;
  reason?: string;
  expiresAt?: Date | null;
  createdById: string;
}) {
  return prisma.blockedIP.create({
    data: {
      ipAddress: params.ipAddress,
      scope: params.scope,
      organizationId: params.organizationId,
      reason: params.reason,
      expiresAt: params.expiresAt,
      createdById: params.createdById,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      organization: { select: { id: true, name: true } },
    },
  });
}

export async function unblockIP(id: string) {
  return prisma.blockedIP.update({
    where: { id },
    data: { isActive: false },
  });
}

export async function getBlockedIPs(params: {
  scope?: BlockScope;
  organizationId?: string | null;
  includeInactive?: boolean;
  limit?: number;
  offset?: number;
}) {
  const where: Prisma.BlockedIPWhereInput = {};

  if (params.scope) {
    where.scope = params.scope;
  }

  if (params.organizationId) {
    where.organizationId = params.organizationId;
  } else if (params.scope === BlockScope.GLOBAL) {
    where.organizationId = null;
  }

  if (!params.includeInactive) {
    where.isActive = true;
  }

  const [blockedIPs, total] = await Promise.all([
    prisma.blockedIP.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        organization: { select: { id: true, name: true } },
        _count: { select: { attempts: true } },
      },
      orderBy: { createdAt: "desc" },
      take: params.limit || 50,
      skip: params.offset || 0,
    }),
    prisma.blockedIP.count({ where }),
  ]);

  return { blockedIPs, total };
}

export async function getBlockedIPAttempts(params: {
  blockedIPId?: string;
  ipAddress?: string;
  limit?: number;
  offset?: number;
}) {
  const where: Prisma.BlockedIPAttemptWhereInput = {};

  if (params.blockedIPId) {
    where.blockedIPId = params.blockedIPId;
  }

  if (params.ipAddress) {
    where.ipAddress = params.ipAddress;
  }

  const [attempts, total] = await Promise.all([
    prisma.blockedIPAttempt.findMany({
      where,
      include: {
        User: { select: { id: true, name: true, email: true } },
        blockedIP: { select: { id: true, reason: true, scope: true } },
      },
      orderBy: { createdAt: "desc" },
      take: params.limit || 50,
      skip: params.offset || 0,
    }),
    prisma.blockedIPAttempt.count({ where }),
  ]);

  return { attempts, total };
}

export function validateIPAddress(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^::1$|^([0-9a-fA-F]{1,4}:){1,7}:$|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$/;
  
  if (ipv4Regex.test(ip)) {
    const parts = ip.split(".").map(Number);
    return parts.every((part) => part >= 0 && part <= 255);
  }
  
  return ipv6Regex.test(ip);
}
