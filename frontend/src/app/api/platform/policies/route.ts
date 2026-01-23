import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { requirePlatformAdmin, getCurrentPlatformAdmin } from "@/lib/platform-auth";

const DEFAULT_POLICIES = [
  {
    policyType: "MANDATORY_APPROVAL_CHAIN",
    name: "Mandatory Approval Chain",
    description: "Prevents unauthorized offboardings by requiring documented approval from multiple stakeholders before access revocation proceeds. Protects against insider threats and ensures accountability.",
    config: {
      minApprovals: 2,
      requireManagerApproval: true,
      requireHRApproval: true,
      escalateAfterHours: 24,
    },
    severity: "HIGH",
    isMandatory: true,
    canBeWeakened: false,
    isActive: true,
  },
  {
    policyType: "ACCESS_LOCKDOWN_ON_OFFBOARDING",
    name: "Immediate Access Lockdown",
    description: "Eliminates the window of opportunity for data exfiltration or system sabotage by immediately suspending all access upon offboarding initiation. Critical for protecting sensitive assets during transition.",
    config: {
      lockdownDelay: 0,
      notifyEmployee: true,
      notifyManager: true,
      allowGracePeriod: false,
      gracePeriodHours: 0,
    },
    severity: "CRITICAL",
    isMandatory: false,
    canBeWeakened: false,
    isActive: true,
  },
  {
    policyType: "SESSION_REVOCATION_RULES",
    name: "Session Revocation Policy",
    description: "Enforces immediate or conditional session termination to prevent unauthorized access during risk events. Ensures that compromised or terminated accounts cannot maintain active sessions.",
    config: {
      revokeOnOffboardingStart: true,
      revokeOnHighRisk: true,
      maxSessionAge: 24,
      allowReauthentication: false,
    },
    severity: "HIGH",
    isMandatory: false,
    canBeWeakened: true,
    isActive: true,
  },
  {
    policyType: "IP_BLOCKING_THRESHOLDS",
    name: "IP Blocking Thresholds",
    description: "Automatically blocks suspicious network origins after repeated failed access attempts. Protects against brute force attacks and unauthorized access from known malicious sources.",
    config: {
      maxFailedAttempts: 5,
      blockDurationMinutes: 60,
      escalateAfterBlocks: 3,
      notifyOnBlock: true,
    },
    severity: "MEDIUM",
    isMandatory: false,
    canBeWeakened: true,
    isActive: true,
  },
  {
    policyType: "EVIDENCE_PACK_RETENTION",
    name: "Evidence Pack Retention",
    description: "Guarantees regulatory compliance and legal defensibility by preserving complete audit evidence for the required retention period. Essential for SOC 2, GDPR, and litigation readiness.",
    config: {
      minRetentionDays: 365,
      requireSealing: true,
      allowDeletion: false,
      requireAuditTrail: true,
    },
    severity: "HIGH",
    isMandatory: true,
    canBeWeakened: false,
    isActive: true,
  },
  {
    policyType: "AUDIT_LOG_REQUIREMENTS",
    name: "Audit Log Requirements",
    description: "Maintains a tamper-proof record of all security-relevant actions across the platform. Required for compliance frameworks and incident forensics. Logs are immutable once written.",
    config: {
      logAllActions: true,
      logIPAddresses: true,
      logUserAgents: true,
      retentionDays: 730,
      immutable: true,
    },
    severity: "CRITICAL",
    isMandatory: true,
    canBeWeakened: false,
    isActive: true,
  },
  {
    policyType: "HIGH_RISK_ESCALATION",
    name: "High Risk Escalation",
    description: "Automatically escalates offboarding events involving privileged access, sensitive data exposure, or anomalous behavior to platform administrators for immediate review.",
    config: {
      escalateOnCritical: true,
      escalateOnDataAccess: true,
      notifyPlatformAdmin: true,
      requirePlatformApproval: false,
      maxResponseTimeMinutes: 4,
    },
    severity: "CRITICAL",
    isMandatory: false,
    canBeWeakened: false,
    isActive: true,
  },
  {
    policyType: "DATA_EXPORT_CONTROLS",
    name: "Data Export Controls",
    description: "Prevents unauthorized data extraction during the offboarding window by requiring explicit approval for all exports. Protects intellectual property and sensitive business data.",
    config: {
      blockExportsDuringOffboarding: true,
      requireApprovalForExport: true,
      logAllExports: true,
      maxExportSizeMB: 100,
    },
    severity: "HIGH",
    isMandatory: false,
    canBeWeakened: true,
    isActive: true,
  },
];

export async function GET() {
  try {
    await requirePlatformAdmin();

    let policies = await prisma.globalSecurityPolicy.findMany({
      orderBy: [{ severity: "desc" }, { name: "asc" }],
    });

    if (policies.length === 0) {
      await prisma.globalSecurityPolicy.createMany({
        data: DEFAULT_POLICIES.map((p) => ({
          ...p,
          id: p.policyType.toLowerCase().replace(/_/g, "-"),
          updatedAt: new Date(),
        })),
        skipDuplicates: true,
      });
      policies = await prisma.globalSecurityPolicy.findMany({
        orderBy: [{ severity: "desc" }, { name: "asc" }],
      });
    }

    const enforcementStats = await prisma.policyEnforcementLog.groupBy({
      by: ["policyType"],
      _count: { id: true },
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    });

    const statsMap = enforcementStats.reduce((acc, stat) => {
      acc[stat.policyType] = stat._count.id;
      return acc;
    }, {} as Record<string, number>);

    const policiesWithStats = policies.map((policy) => ({
      ...policy,
      enforcementCount30d: statsMap[policy.policyType] || 0,
    }));

    return NextResponse.json({ policies: policiesWithStats });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Platform admin access required" }, { status: 403 });
      }
    }
    console.error("Platform policies error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await getCurrentPlatformAdmin();

    const body = await request.json();
    const { id, config } = body;

    if (!id) {
      return NextResponse.json({ error: "Policy ID required" }, { status: 400 });
    }

    const existingPolicy = await prisma.globalSecurityPolicy.findUnique({
      where: { id },
    });

    if (!existingPolicy) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    if (existingPolicy.isMandatory || !existingPolicy.canBeWeakened) {
      const configWithoutEnabled = { ...config };
      delete configWithoutEnabled.enabled;
      
      const updatedPolicy = await prisma.globalSecurityPolicy.update({
        where: { id },
        data: {
          config: config !== undefined ? configWithoutEnabled : existingPolicy.config,
          isActive: true,
          updatedAt: new Date(),
        },
      });

      await prisma.platformAuditLog.create({
        data: {
          action: "GLOBAL_POLICY_CONFIGURED",
          entityType: "GlobalSecurityPolicy",
          entityId: id,
          oldData: existingPolicy as object,
          newData: updatedPolicy as object,
          userId: admin.id,
          userName: admin.name || admin.email,
          severity: "WARNING",
        },
      });

      return NextResponse.json({ policy: updatedPolicy });
    }

    const configWithoutEnabled = { ...config };
    delete configWithoutEnabled.enabled;

    const updatedPolicy = await prisma.globalSecurityPolicy.update({
      where: { id },
      data: {
        config: config !== undefined ? configWithoutEnabled : existingPolicy.config,
        updatedAt: new Date(),
      },
    });

    await prisma.platformAuditLog.create({
      data: {
        action: "GLOBAL_POLICY_UPDATED",
        entityType: "GlobalSecurityPolicy",
        entityId: id,
        oldData: existingPolicy as object,
        newData: updatedPolicy as object,
        userId: admin.id,
        userName: admin.name || admin.email,
        severity: "WARNING",
      },
    });

    return NextResponse.json({ policy: updatedPolicy });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Platform admin access required" }, { status: 403 });
      }
    }
    console.error("Platform policy update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
