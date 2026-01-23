"use server";

import { prisma } from "@/lib/prisma.server";
import { AuthSession } from "@/lib/auth-types";
import { createAuditLog } from "@/lib/audit.server";
import { getClientIP } from "@/lib/ip-blocking.server";
import { Prisma } from "@prisma/client";
import {
  PolicyCategory,
  PolicyScope,
  PolicySeverity,
  PolicyType,
  PolicyConfig,
  POLICY_DEFINITIONS,
} from "@/lib/policy-definitions";

export async function getAllPolicies(organizationId: string) {
  const policies = await prisma.securityPolicy.findMany({
    where: { organizationId },
  });

  const result: Record<string, {
    id: string | null;
    policyType: PolicyType;
    name: string;
    description: string;
    enforcement: string;
    trigger: string;
    category: PolicyCategory;
    scope: PolicyScope;
    severity: PolicySeverity;
    icon: string;
    config: Record<string, unknown>;
    isActive: boolean;
    lastTriggeredAt: Date | null;
    triggerCount: number;
  }> = {};
  
  for (const policyType of Object.keys(POLICY_DEFINITIONS) as PolicyType[]) {
    const def = POLICY_DEFINITIONS[policyType];
    const existingPolicy = policies.find((p) => p.policyType === policyType);
    
    if (existingPolicy) {
      result[policyType] = {
        id: existingPolicy.id,
        policyType,
        name: def.name,
        description: def.description,
        enforcement: def.enforcement,
        trigger: def.trigger,
        category: (existingPolicy.category as PolicyCategory) || def.category,
        scope: (existingPolicy.scope as PolicyScope) || def.scope,
        severity: (existingPolicy.severity as PolicySeverity) || def.severity,
        icon: def.icon,
        config: existingPolicy.config as Record<string, unknown>,
        isActive: existingPolicy.isActive,
        lastTriggeredAt: existingPolicy.lastTriggeredAt,
        triggerCount: existingPolicy.triggerCount || 0,
      };
    } else {
      result[policyType] = {
        id: null,
        policyType,
        name: def.name,
        description: def.description,
        enforcement: def.enforcement,
        trigger: def.trigger,
        category: def.category,
        scope: def.scope,
        severity: def.severity,
        icon: def.icon,
        config: def.config as Record<string, unknown>,
        isActive: false,
        lastTriggeredAt: null,
        triggerCount: 0,
      };
    }
  }

  return result;
}

export async function getSecurityPolicies(organizationId: string) {
  return getAllPolicies(organizationId);
}

export async function getPolicy<T extends PolicyType>(
  organizationId: string,
  policyType: T
): Promise<PolicyConfig[T] & { isActive: boolean }> {
  const policy = await prisma.securityPolicy.findFirst({
    where: { organizationId, policyType },
  });

  if (policy && policy.isActive) {
    return { ...(policy.config as PolicyConfig[T]), isActive: true };
  }

  return { ...(POLICY_DEFINITIONS[policyType].config as PolicyConfig[T]), isActive: false };
}

export async function updateSecurityPolicy(
  session: AuthSession,
  organizationId: string,
  policyType: PolicyType,
  config: object,
  isActive: boolean,
  scope?: PolicyScope
) {
  const ipAddress = await getClientIP();
  const def = POLICY_DEFINITIONS[policyType];

  if (!def) {
    throw new Error(`Unknown policy type: ${policyType}`);
  }

  const existingPolicy = await prisma.securityPolicy.findFirst({
    where: { organizationId, policyType },
  });

  let policy;
  if (existingPolicy) {
    policy = await prisma.securityPolicy.update({
      where: { id: existingPolicy.id },
      data: {
        config: config as Prisma.InputJsonValue,
        isActive,
        scope: scope || existingPolicy.scope || def.scope,
        category: def.category,
        severity: def.severity,
        updatedAt: new Date(),
      },
    });
  } else {
    policy = await prisma.securityPolicy.create({
      data: {
        id: `sp_${Date.now()}`,
        organizationId,
        policyType,
        name: def.name,
        description: def.description,
        config: config as Prisma.InputJsonValue,
        isActive,
        scope: scope || def.scope,
        category: def.category,
        severity: def.severity,
        createdBy: session.user.id,
      },
    });
  }

  await createAuditLog(session, organizationId, {
    action: isActive ? "security_policy.enabled" : "security_policy.disabled",
    entityType: "SecurityPolicy",
    entityId: policy.id,
    newData: { policyType, config, isActive, scope: scope || def.scope },
    ipAddress,
  });

  return policy;
}

export async function logPolicyEnforcement(
  organizationId: string,
  policyId: string,
  policyType: PolicyType,
  action: string,
  targetType: string,
  targetId?: string,
  targetName?: string,
  details?: Record<string, unknown>,
  triggeredBy?: string
) {
  await prisma.$executeRaw`
    INSERT INTO "PolicyEnforcementLog" 
    ("id", "organizationId", "policyId", "policyType", "action", "status", "targetType", "targetId", "targetName", "triggeredBy", "details", "createdAt")
    VALUES 
    (${`pel_${Date.now()}`}, ${organizationId}, ${policyId}, ${policyType}, ${action}, 'TRIGGERED', ${targetType}, ${targetId || null}, ${targetName || null}, ${triggeredBy || null}, ${JSON.stringify(details || {})}::jsonb, NOW())
  `;

  await prisma.securityPolicy.update({
    where: { id: policyId },
    data: {
      lastTriggeredAt: new Date(),
      triggerCount: { increment: 1 },
    },
  });
}

export async function getEnforcementLogs(organizationId: string, limit = 50) {
  const logs = await prisma.$queryRaw<Array<{
    id: string;
    policyId: string;
    policyType: string;
    action: string;
    status: string;
    targetType: string;
    targetId: string | null;
    targetName: string | null;
    triggeredBy: string | null;
    details: Record<string, unknown>;
    bypassedBy: string | null;
    bypassReason: string | null;
    createdAt: Date;
  }>>`
    SELECT * FROM "PolicyEnforcementLog" 
    WHERE "organizationId" = ${organizationId}
    ORDER BY "createdAt" DESC
    LIMIT ${limit}
  `;
  return logs;
}

export interface PolicyViolation {
  policyType: PolicyType;
  policyName: string;
  violation: string;
  severity: PolicySeverity;
  canBypass: boolean;
}

export async function checkOffboardingCompletion(
  organizationId: string,
  offboardingId: string,
  employeeId: string
): Promise<{ allowed: boolean; violations: PolicyViolation[] }> {
  const violations: PolicyViolation[] = [];

  // 1. Check Global Policies First (Mandatory Baseline)
  const globalApprovalPolicy = await prisma.globalSecurityPolicy.findUnique({
    where: { policyType: "MANDATORY_APPROVAL_CHAIN" }
  });

  if (globalApprovalPolicy?.isActive) {
    const config = globalApprovalPolicy.config as any;
    const minApprovals = config.minApprovals || 1;
    
    const approvedCount = await prisma.approval.count({
      where: { 
        offboardingId, 
        status: "APPROVED",
        type: "OFFBOARDING" 
      },
    });

    if (approvedCount < minApprovals) {
      violations.push({
        policyType: "MANDATORY_APPROVAL_CHAIN" as any,
        policyName: "Global: Mandatory Approval Chain",
        violation: `Global policy requires at least ${minApprovals} approvals (currently have ${approvedCount})`,
        severity: "HIGH",
        canBypass: false,
      });
    }
  }

  // 2. Check Organization Policies
  const approvalPolicy = await getPolicy(organizationId, "REQUIRE_APPROVAL_COMPLETION");
  if (approvalPolicy.isActive && approvalPolicy.enabled) {
    const pendingApprovals = await prisma.approval.count({
      where: { 
        offboardingId, 
        status: "PENDING" 
      },
    });
    if (pendingApprovals > 0) {
      violations.push({
        policyType: "REQUIRE_APPROVAL_COMPLETION",
        policyName: POLICY_DEFINITIONS.REQUIRE_APPROVAL_COMPLETION.name,
        violation: `${pendingApprovals} approval(s) still pending`,
        severity: "HIGH",
        canBypass: false,
      });
    }
  }

  const assetPolicy = await getPolicy(organizationId, "REQUIRE_ASSET_RETURN");
  if (assetPolicy.isActive && assetPolicy.enabled) {
    const unresolvedAssets = await prisma.asset.count({
      where: {
        employeeId: employeeId,
        status: { notIn: ["RETURNED", "WRITTEN_OFF", "LOST"] },
      },
    });
    if (unresolvedAssets > 0) {
      violations.push({
        policyType: "REQUIRE_ASSET_RETURN",
        policyName: POLICY_DEFINITIONS.REQUIRE_ASSET_RETURN.name,
        violation: `${unresolvedAssets} asset(s) not returned or written off`,
        severity: "HIGH",
        canBypass: assetPolicy.allowWriteOff,
      });
    }
  }

  const execPolicy = await getPolicy(organizationId, "REQUIRE_EXECUTIVE_APPROVAL");
  if (execPolicy.isActive && execPolicy.enabled) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { jobTitle: true },
    });

    if (employee?.jobTitle) {
      const isExecutive = execPolicy.executiveJobTitles.some(
        (title) => employee.jobTitle!.title.toLowerCase().includes(title.toLowerCase())
      );

      if (isExecutive) {
        const execApproval = await prisma.approval.findFirst({
          where: {
            offboardingId,
            status: "APPROVED",
            approver: {
              memberships: {
                some: {
                  organizationId,
                  systemRole: execPolicy.requiredApproverRole as "OWNER" | "ADMIN" | "CONTRIBUTOR",
                },
              },
            },
          },
        });

        if (!execApproval) {
          violations.push({
            policyType: "REQUIRE_EXECUTIVE_APPROVAL",
            policyName: POLICY_DEFINITIONS.REQUIRE_EXECUTIVE_APPROVAL.name,
            violation: "Executive offboarding requires owner-level approval",
            severity: "CRITICAL",
            canBypass: false,
          });
        }
      }
    }
  }

  return {
    allowed: violations.length === 0,
    violations,
  };
}

export async function checkLoginAllowed(
  organizationId: string,
  employeeId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const policy = await getPolicy(organizationId, "BLOCK_LOGIN_ON_OFFBOARDING");
  
  if (!policy.isActive || !policy.enabled) {
    return { allowed: true };
  }

  const activeOffboarding = await prisma.offboarding.findFirst({
    where: {
      employeeId,
      status: { in: ["IN_PROGRESS", "PENDING"] },
    },
  });

  if (activeOffboarding) {
    const policyRecord = await prisma.securityPolicy.findFirst({
      where: { organizationId, policyType: "BLOCK_LOGIN_ON_OFFBOARDING" },
    });

    if (policyRecord) {
      await logPolicyEnforcement(
        organizationId,
        policyRecord.id,
        "BLOCK_LOGIN_ON_OFFBOARDING",
        "LOGIN_BLOCKED",
        "Employee",
        employeeId,
        undefined,
        { offboardingId: activeOffboarding.id }
      );
    }

    return { 
      allowed: false, 
      reason: "Access blocked - offboarding in progress" 
    };
  }

  return { allowed: true };
}

export async function checkRiskThreshold(
  organizationId: string,
  employeeId: string,
  riskScore: number
): Promise<{ lockdown: boolean; escalate: boolean; alert: boolean }> {
  const result = { lockdown: false, escalate: false, alert: false };

  const lockdownPolicy = await getPolicy(organizationId, "RISK_AUTO_LOCKDOWN");
  if (lockdownPolicy.isActive && lockdownPolicy.enabled && riskScore >= lockdownPolicy.riskThreshold) {
    result.lockdown = true;
    
    const policyRecord = await prisma.securityPolicy.findFirst({
      where: { organizationId, policyType: "RISK_AUTO_LOCKDOWN" },
    });
    if (policyRecord) {
      await logPolicyEnforcement(
        organizationId,
        policyRecord.id,
        "RISK_AUTO_LOCKDOWN",
        "AUTO_LOCKDOWN_TRIGGERED",
        "Employee",
        employeeId,
        undefined,
        { riskScore, threshold: lockdownPolicy.riskThreshold }
      );
    }
  }

  const escalatePolicy = await getPolicy(organizationId, "RISK_ESCALATE_APPROVAL");
  if (escalatePolicy.isActive && escalatePolicy.enabled && riskScore >= escalatePolicy.riskThreshold) {
    result.escalate = true;
  }

  const alertPolicy = await getPolicy(organizationId, "RISK_ALERT_SUSPICIOUS");
  if (alertPolicy.isActive && alertPolicy.enabled) {
    result.alert = true;
  }

  return result;
}

export async function checkPolicyEnforcement(
  organizationId: string,
  policyType: PolicyType,
  context?: Record<string, unknown>
): Promise<{ allowed: boolean; reason?: string }> {
  const policy = await getPolicy(organizationId, policyType);

  if (!policy.isActive) {
    return { allowed: true };
  }

  switch (policyType) {
    case "BLOCK_LOGIN_ON_OFFBOARDING": {
      const config = policy as PolicyConfig["BLOCK_LOGIN_ON_OFFBOARDING"] & { isActive: boolean };
      if (config.enabled && context?.isOffboarding) {
        return { allowed: false, reason: "Login blocked during offboarding process" };
      }
      break;
    }

    case "RESTRICT_ADMIN_IP": {
      const config = policy as PolicyConfig["RESTRICT_ADMIN_IP"] & { isActive: boolean };
      if (config.enabled && context?.ipAddress && context?.isAdminAction) {
        const ip = context.ipAddress as string;
        const allowed = config.allowedRanges.some((range) => {
          if (range.includes("/")) {
            return isIPInRange(ip, range);
          }
          return ip === range;
        });
        if (!allowed) {
          return { allowed: false, reason: "Admin action not allowed from this IP address" };
        }
      }
      break;
    }

    case "RISK_AUTO_LOCKDOWN": {
      const config = policy as PolicyConfig["RISK_AUTO_LOCKDOWN"] & { isActive: boolean };
      if (config.enabled && context?.riskScore && (context.riskScore as number) >= config.riskThreshold) {
        return { allowed: false, reason: "Automatic lockdown triggered due to high risk score" };
      }
      break;
    }

    case "SESSION_EXPIRATION": {
      const config = policy as PolicyConfig["SESSION_EXPIRATION"] & { isActive: boolean };
      if (config.enabled && context?.lastActiveAt) {
        const lastActive = new Date(context.lastActiveAt as string);
        const now = new Date();
        const diffMinutes = (now.getTime() - lastActive.getTime()) / (1000 * 60);
        if (diffMinutes > config.timeoutMinutes) {
          return { allowed: false, reason: "Session expired due to inactivity" };
        }
      }
      break;
    }

    case "FAILED_LOGIN_LOCKOUT": {
      const config = policy as PolicyConfig["FAILED_LOGIN_LOCKOUT"] & { isActive: boolean };
      if (config.enabled && context?.failedAttempts) {
        if ((context.failedAttempts as number) >= config.maxAttempts) {
          return { allowed: false, reason: `Account locked after ${config.maxAttempts} failed attempts` };
        }
      }
      break;
    }
  }

  return { allowed: true };
}

function isIPInRange(ip: string, cidr: string): boolean {
  const [rangeIP, bits] = cidr.split("/");
  const mask = ~((1 << (32 - parseInt(bits))) - 1);
  
  const ipNum = ipToNumber(ip);
  const rangeNum = ipToNumber(rangeIP);
  
  return (ipNum & mask) === (rangeNum & mask);
}

function ipToNumber(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
}
