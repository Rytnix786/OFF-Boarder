export type PolicyCategory = 
  | "OFFBOARDING_ENFORCEMENT"
  | "RISK_BASED"
  | "ASSET_RECOVERY"
  | "PLATFORM_SECURITY";

export type PolicyScope = "ORG_WIDE" | "HIGH_RISK_ONLY" | "EXECUTIVE_ONLY";

export type PolicySeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type OffboardingPolicyType =
  | "BLOCK_LOGIN_ON_OFFBOARDING"
  | "REQUIRE_APPROVAL_COMPLETION"
  | "REQUIRE_ASSET_RETURN"
  | "REQUIRE_EXECUTIVE_APPROVAL"
  | "RISK_AUTO_LOCKDOWN"
  | "RISK_ESCALATE_APPROVAL"
  | "RISK_ALERT_SUSPICIOUS"
  | "ASSET_MANDATORY_RETURN"
  | "ASSET_RECOVERY_DEADLINE"
  | "ASSET_MISSING_ESCALATION";

export type PlatformSecurityPolicyType =
  | "RESTRICT_ADMIN_IP"
  | "FAILED_LOGIN_LOCKOUT"
  | "SESSION_EXPIRATION";

export type PolicyType = OffboardingPolicyType | PlatformSecurityPolicyType;

export const OFFBOARDING_POLICY_TYPES: OffboardingPolicyType[] = [
  "BLOCK_LOGIN_ON_OFFBOARDING",
  "REQUIRE_APPROVAL_COMPLETION",
  "REQUIRE_ASSET_RETURN",
  "REQUIRE_EXECUTIVE_APPROVAL",
  "RISK_AUTO_LOCKDOWN",
  "RISK_ESCALATE_APPROVAL",
  "RISK_ALERT_SUSPICIOUS",
  "ASSET_MANDATORY_RETURN",
  "ASSET_RECOVERY_DEADLINE",
  "ASSET_MISSING_ESCALATION",
];

export const PLATFORM_SECURITY_POLICY_TYPES: PlatformSecurityPolicyType[] = [
  "RESTRICT_ADMIN_IP",
  "FAILED_LOGIN_LOCKOUT",
  "SESSION_EXPIRATION",
];

export type PolicyConfig = {
  BLOCK_LOGIN_ON_OFFBOARDING: { enabled: boolean };
  REQUIRE_APPROVAL_COMPLETION: { enabled: boolean; requiredApprovers: string[] };
  REQUIRE_ASSET_RETURN: { enabled: boolean; allowWriteOff: boolean };
  REQUIRE_EXECUTIVE_APPROVAL: { enabled: boolean; executiveJobTitles: string[]; requiredApproverRole: string };
  RISK_AUTO_LOCKDOWN: { enabled: boolean; riskThreshold: number };
  RISK_ESCALATE_APPROVAL: { enabled: boolean; riskThreshold: number; escalateTo: string };
  RISK_ALERT_SUSPICIOUS: { enabled: boolean; alertRecipients: string[] };
  ASSET_MANDATORY_RETURN: { enabled: boolean; assetTypes: string[] };
  ASSET_RECOVERY_DEADLINE: { enabled: boolean; deadlineDays: number };
  ASSET_MISSING_ESCALATION: { enabled: boolean; escalateAfterDays: number; escalateTo: string };
  RESTRICT_ADMIN_IP: { enabled: boolean; allowedRanges: string[] };
  FAILED_LOGIN_LOCKOUT: { enabled: boolean; maxAttempts: number; lockoutMinutes: number };
  SESSION_EXPIRATION: { enabled: boolean; timeoutMinutes: number; warnBeforeMinutes: number };
};

export interface PolicyDefinition {
  name: string;
  description: string;
  enforcement: string;
  trigger: string;
  category: PolicyCategory;
  scope: PolicyScope;
  severity: PolicySeverity;
  icon: string;
  config: object;
}

export const POLICY_DEFINITIONS: Record<PolicyType, PolicyDefinition> = {
  BLOCK_LOGIN_ON_OFFBOARDING: {
    name: "Block Logins Immediately",
    description: "Prevent employee access the moment offboarding begins",
    enforcement: "Blocks all authentication attempts for employees in offboarding status",
    trigger: "When offboarding process is initiated",
    category: "OFFBOARDING_ENFORCEMENT",
    scope: "ORG_WIDE",
    severity: "CRITICAL",
    icon: "lock_person",
    config: { enabled: false },
  },
  REQUIRE_APPROVAL_COMPLETION: {
    name: "Require All Approvals",
    description: "Block offboarding completion until all required approvals are obtained",
    enforcement: "Prevents offboarding from being marked complete without all approvals",
    trigger: "When attempting to complete offboarding",
    category: "OFFBOARDING_ENFORCEMENT",
    scope: "ORG_WIDE",
    severity: "HIGH",
    icon: "approval",
    config: { enabled: false, requiredApprovers: ["manager", "hr", "it"] },
  },
  REQUIRE_ASSET_RETURN: {
    name: "Require Asset Return",
    description: "Block offboarding completion until all assets are returned or written off",
    enforcement: "Prevents completion if any assigned assets remain unresolved",
    trigger: "When attempting to complete offboarding",
    category: "OFFBOARDING_ENFORCEMENT",
    scope: "ORG_WIDE",
    severity: "HIGH",
    icon: "devices",
    config: { enabled: false, allowWriteOff: true },
  },
  REQUIRE_EXECUTIVE_APPROVAL: {
    name: "Executive Approval Required",
    description: "Require elevated approval for executive or high-risk employee offboardings",
    enforcement: "Routes executive offboardings through additional approval chain",
    trigger: "When offboarding executive-level employees",
    category: "OFFBOARDING_ENFORCEMENT",
    scope: "EXECUTIVE_ONLY",
    severity: "CRITICAL",
    icon: "admin_panel_settings",
    config: { enabled: false, executiveJobTitles: ["Director", "VP", "C-Level", "Chief"], requiredApproverRole: "OWNER" },
  },
  RISK_AUTO_LOCKDOWN: {
    name: "Auto-Lockdown on Risk",
    description: "Automatically trigger access lockdown when risk score exceeds threshold",
    enforcement: "Initiates immediate access revocation when risk threshold is breached",
    trigger: "When employee risk score exceeds configured threshold",
    category: "RISK_BASED",
    scope: "ORG_WIDE",
    severity: "CRITICAL",
    icon: "crisis_alert",
    config: { enabled: false, riskThreshold: 75 },
  },
  RISK_ESCALATE_APPROVAL: {
    name: "Escalate on Risk Increase",
    description: "Add additional approval requirements when risk score increases",
    enforcement: "Adds escalation approver to approval chain when risk increases",
    trigger: "When risk score increases above threshold during offboarding",
    category: "RISK_BASED",
    scope: "ORG_WIDE",
    severity: "HIGH",
    icon: "trending_up",
    config: { enabled: false, riskThreshold: 60, escalateTo: "security_team" },
  },
  RISK_ALERT_SUSPICIOUS: {
    name: "Alert on Suspicious Activity",
    description: "Generate critical alerts when suspicious activity is detected post-offboarding",
    enforcement: "Creates immediate alerts and logs for security team review",
    trigger: "When post-offboarding suspicious activity is detected",
    category: "RISK_BASED",
    scope: "ORG_WIDE",
    severity: "HIGH",
    icon: "warning",
    config: { enabled: false, alertRecipients: [] },
  },
  ASSET_MANDATORY_RETURN: {
    name: "Mandatory Asset Return",
    description: "Enforce mandatory return of specified asset types before offboarding completion",
    enforcement: "Blocks completion until specified asset types are physically returned",
    trigger: "When attempting to complete offboarding with outstanding assets",
    category: "ASSET_RECOVERY",
    scope: "ORG_WIDE",
    severity: "HIGH",
    icon: "inventory_2",
    config: { enabled: false, assetTypes: ["Laptop", "Phone", "Security Key", "Access Card"] },
  },
  ASSET_RECOVERY_DEADLINE: {
    name: "Asset Recovery Deadline",
    description: "Set deadlines for asset recovery with automatic escalation",
    enforcement: "Tracks asset return deadlines and triggers escalation when missed",
    trigger: "When asset recovery deadline is approaching or passed",
    category: "ASSET_RECOVERY",
    scope: "ORG_WIDE",
    severity: "MEDIUM",
    icon: "schedule",
    config: { enabled: false, deadlineDays: 7 },
  },
  ASSET_MISSING_ESCALATION: {
    name: "Missing Asset Escalation",
    description: "Automatically escalate risk when assets remain missing",
    enforcement: "Increases risk score and notifies management when assets are not returned",
    trigger: "When assets remain unreturned after deadline",
    category: "ASSET_RECOVERY",
    scope: "ORG_WIDE",
    severity: "HIGH",
    icon: "report_problem",
    config: { enabled: false, escalateAfterDays: 14, escalateTo: "manager" },
  },
  RESTRICT_ADMIN_IP: {
    name: "Admin IP Restrictions",
    description: "Restrict administrative actions to trusted IP address ranges",
    enforcement: "Blocks admin operations from untrusted network locations",
    trigger: "When admin action is attempted from unauthorized IP",
    category: "PLATFORM_SECURITY",
    scope: "ORG_WIDE",
    severity: "HIGH",
    icon: "vpn_lock",
    config: { enabled: false, allowedRanges: [] },
  },
  FAILED_LOGIN_LOCKOUT: {
    name: "Failed Login Lockout",
    description: "Lock accounts after repeated failed authentication attempts",
    enforcement: "Temporarily locks account access after failed attempt threshold",
    trigger: "When failed login attempts exceed limit",
    category: "PLATFORM_SECURITY",
    scope: "ORG_WIDE",
    severity: "MEDIUM",
    icon: "password",
    config: { enabled: true, maxAttempts: 5, lockoutMinutes: 15 },
  },
  SESSION_EXPIRATION: {
    name: "Session Expiration",
    description: "Automatically expire sessions after period of inactivity",
    enforcement: "Forces re-authentication after idle timeout",
    trigger: "When session exceeds idle timeout",
    category: "PLATFORM_SECURITY",
    scope: "ORG_WIDE",
    severity: "LOW",
    icon: "timer",
    config: { enabled: true, timeoutMinutes: 60, warnBeforeMinutes: 5 },
  },
};

export const CATEGORY_INFO: Record<PolicyCategory, { name: string; description: string; icon: string }> = {
  OFFBOARDING_ENFORCEMENT: {
    name: "Offboarding Enforcement",
    description: "Core policies that control how offboarding is executed and completed",
    icon: "verified_user",
  },
  RISK_BASED: {
    name: "Risk-Based Policies",
    description: "Automatic enforcement based on Risk Radar signals and thresholds",
    icon: "radar",
  },
  ASSET_RECOVERY: {
    name: "Asset Recovery",
    description: "Policies governing physical and digital asset return requirements",
    icon: "devices",
  },
  PLATFORM_SECURITY: {
    name: "Platform Security",
    description: "Enterprise controls for authentication, sessions, and network access",
    icon: "security",
  },
};

export const OFFBOARDING_CATEGORIES: PolicyCategory[] = [
  "OFFBOARDING_ENFORCEMENT",
  "RISK_BASED", 
  "ASSET_RECOVERY",
];
