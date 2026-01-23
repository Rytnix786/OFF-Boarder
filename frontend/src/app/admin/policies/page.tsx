"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  alpha,
  useTheme,
  CircularProgress,
  Collapse,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
} from "@mui/material";
import { usePlatformContext } from "../AdminPlatformContext";

type PolicyConfig = Record<string, unknown>;

type GlobalPolicy = {
  id: string;
  policyType: string;
  name: string;
  description: string | null;
  config: PolicyConfig;
  isActive: boolean;
  isMandatory: boolean;
  canBeWeakened: boolean;
  severity: string;
  createdAt: string;
  updatedAt: string;
  enforcementCount30d: number;
};

type PolicyDomain = {
  id: string;
  name: string;
  description: string;
  icon: string;
  policies: GlobalPolicy[];
};

const DOMAIN_CONFIG: Record<string, { name: string; description: string; icon: string; order: number }> = {
  ACCESS_CONTROL: {
    name: "Access Control",
    description: "Policies governing authentication, authorization, and session management across all tenants.",
    icon: "lock",
    order: 1,
  },
  COMPLIANCE_EVIDENCE: {
    name: "Compliance & Evidence",
    description: "Policies ensuring audit trail integrity, evidence preservation, and regulatory compliance.",
    icon: "verified_user",
    order: 2,
  },
  RISK_ENFORCEMENT: {
    name: "Risk Enforcement",
    description: "Policies controlling risk assessment, escalation protocols, and security baseline enforcement.",
    icon: "shield",
    order: 3,
  },
};

const POLICY_TO_DOMAIN: Record<string, string> = {
  MFA_REQUIRED: "ACCESS_CONTROL",
  SESSION_TIMEOUT: "ACCESS_CONTROL",
  PASSWORD_COMPLEXITY: "ACCESS_CONTROL",
  IP_ALLOWLIST: "ACCESS_CONTROL",
  ACCESS_LOCKDOWN_ON_OFFBOARDING: "ACCESS_CONTROL",
  SESSION_REVOCATION_RULES: "ACCESS_CONTROL",
  IP_BLOCKING_THRESHOLDS: "ACCESS_CONTROL",
  DATA_RETENTION: "COMPLIANCE_EVIDENCE",
  AUDIT_LOG_RETENTION: "COMPLIANCE_EVIDENCE",
  EVIDENCE_REQUIRED: "COMPLIANCE_EVIDENCE",
  COMPLIANCE_ATTESTATION: "COMPLIANCE_EVIDENCE",
  EVIDENCE_PACK_RETENTION: "COMPLIANCE_EVIDENCE",
  AUDIT_LOG_REQUIREMENTS: "COMPLIANCE_EVIDENCE",
  DATA_EXPORT_CONTROLS: "COMPLIANCE_EVIDENCE",
  RISK_ASSESSMENT: "RISK_ENFORCEMENT",
  HIGH_RISK_APPROVAL: "RISK_ENFORCEMENT",
  OFFBOARDING_TIMEOUT: "RISK_ENFORCEMENT",
  ACCESS_REVIEW_FREQUENCY: "RISK_ENFORCEMENT",
  MANDATORY_APPROVAL_CHAIN: "RISK_ENFORCEMENT",
  HIGH_RISK_ESCALATION: "RISK_ENFORCEMENT",
};

const EXECUTION_SUMMARIES: Record<string, (config: PolicyConfig) => string> = {
  HIGH_RISK_ESCALATION: (config) => {
    const responseTime = Number(config.maxResponseTimeMinutes || config.maxResponseTime || 4);
    const triggers = [];
    if (config.escalateOnCritical) triggers.push("critical risk events");
    if (config.escalateOnDataAccess) triggers.push("sensitive data access");
    return `When ${triggers.join(" or ")} is detected, the platform escalates within ${responseTime} minutes, notifies platform administrators${config.notifyPlatformAdmin ? "" : " (disabled)"}, and ${config.requirePlatformApproval ? "requires platform approval before proceeding" : "restricts sensitive data access pending review"}.`;
  },
  MANDATORY_APPROVAL_CHAIN: (config) => {
    const approvals = Number(config.minApprovals || 2);
    const hours = Number(config.escalateAfterHours || 24);
    const roles = [];
    if (config.requireManagerApproval) roles.push("direct manager");
    if (config.requireHRApproval) roles.push("HR representative");
    return `All high-risk offboardings require ${approvals} approvals from ${roles.join(" and ")}. If not approved within ${hours} hours, the request auto-escalates to platform administrators.`;
  },
  ACCESS_LOCKDOWN_ON_OFFBOARDING: (config) => {
    const delay = Number(config.lockdownDelay || 0);
    const grace = config.allowGracePeriod ? `with a ${config.gracePeriodHours}-hour grace period` : "immediately";
    return `Upon offboarding initiation, all user access is revoked ${delay > 0 ? `within ${delay} minutes` : grace}. ${config.notifyEmployee ? "The employee receives notification. " : ""}${config.notifyManager ? "The manager is notified." : ""}`;
  },
  SESSION_REVOCATION_RULES: (config) => {
    const maxAge = Number(config.maxSessionAge || 24);
    const triggers = [];
    if (config.revokeOnOffboardingStart) triggers.push("offboarding initiation");
    if (config.revokeOnHighRisk) triggers.push("high-risk detection");
    return `Active sessions are terminated upon ${triggers.join(" or ")}. Maximum session duration is ${maxAge} hours. ${config.allowReauthentication ? "Re-authentication is permitted after review." : "Re-authentication is blocked until offboarding completes."}`;
  },
  EVIDENCE_PACK_RETENTION: (config) => {
    const days = Number(config.minRetentionDays || 365);
    const years = Math.floor(days / 365);
    return `All evidence packs are retained for a minimum of ${years > 1 ? `${years} years` : `${days} days`}. ${config.requireSealing ? "Evidence is cryptographically sealed upon creation. " : ""}${config.allowDeletion ? "" : "Manual deletion is prohibited. "}${config.requireAuditTrail ? "All access is logged." : ""}`;
  },
  AUDIT_LOG_REQUIREMENTS: (config) => {
    const days = Number(config.retentionDays || 730);
    const years = Math.floor(days / 365);
    return `${config.logAllActions ? "All security-relevant actions are logged" : "Selected actions are logged"}${config.logIPAddresses ? " with IP addresses" : ""}${config.logUserAgents ? " and user agents" : ""}. Logs are retained for ${years > 1 ? `${years} years` : `${days} days`}${config.immutable ? " and are immutable once written" : ""}.`;
  },
};

const CONFIG_LABELS: Record<string, string> = {
  minApprovals: "Minimum Approvals Required",
  requireManagerApproval: "Require Manager Approval",
  requireHRApproval: "Require HR Approval",
  escalateAfterHours: "Auto-Escalate After (hours)",
  lockdownDelay: "Lockdown Delay (minutes)",
  notifyEmployee: "Notify Employee",
  notifyManager: "Notify Manager",
  allowGracePeriod: "Allow Grace Period",
  gracePeriodHours: "Grace Period Duration (hours)",
  revokeOnOffboardingStart: "Revoke on Offboarding Start",
  revokeOnHighRisk: "Revoke on High Risk Detection",
  maxSessionAge: "Maximum Session Age (hours)",
  allowReauthentication: "Allow Re-authentication",
  maxFailedAttempts: "Failed Attempts Before Block",
  blockDurationMinutes: "Block Duration (minutes)",
  escalateAfterBlocks: "Escalate After Blocks",
  notifyOnBlock: "Notify on Block",
  minRetentionDays: "Minimum Retention (days)",
  requireSealing: "Require Cryptographic Sealing",
  allowDeletion: "Allow Manual Deletion",
  requireAuditTrail: "Require Audit Trail",
  logAllActions: "Log All Actions",
  logIPAddresses: "Log IP Addresses",
  logUserAgents: "Log User Agents",
  retentionDays: "Retention Period (days)",
  immutable: "Immutable Logs",
  escalateOnCritical: "Escalate on Critical Events",
  escalateOnDataAccess: "Escalate on Data Access",
  notifyPlatformAdmin: "Notify Platform Admin",
  requirePlatformApproval: "Require Platform Approval",
  maxResponseTimeMinutes: "Response Time Limit (minutes)",
  maxResponseTime: "Response Time Limit (minutes)",
  blockExportsDuringOffboarding: "Block Exports During Offboarding",
  requireApprovalForExport: "Require Export Approval",
  logAllExports: "Log All Exports",
  maxExportSizeMB: "Maximum Export Size (MB)",
  maxExportSize: "Maximum Export Size (MB)",
};

const CONFIG_GROUPS: Record<string, { label: string; fields: string[] }[]> = {
  HIGH_RISK_ESCALATION: [
    { label: "Escalation Triggers", fields: ["escalateOnCritical", "escalateOnDataAccess"] },
    { label: "Response Actions", fields: ["notifyPlatformAdmin", "requirePlatformApproval"] },
    { label: "Timing", fields: ["maxResponseTimeMinutes", "maxResponseTime"] },
  ],
  MANDATORY_APPROVAL_CHAIN: [
    { label: "Approval Requirements", fields: ["minApprovals", "requireManagerApproval", "requireHRApproval"] },
    { label: "Escalation", fields: ["escalateAfterHours"] },
  ],
  ACCESS_LOCKDOWN_ON_OFFBOARDING: [
    { label: "Timing", fields: ["lockdownDelay", "allowGracePeriod", "gracePeriodHours"] },
    { label: "Notifications", fields: ["notifyEmployee", "notifyManager"] },
  ],
};

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    CRITICAL: { bg: "rgba(220, 38, 38, 0.08)", text: "#dc2626", border: "rgba(220, 38, 38, 0.2)" },
    HIGH: { bg: "rgba(234, 88, 12, 0.08)", text: "#ea580c", border: "rgba(234, 88, 12, 0.2)" },
    MEDIUM: { bg: "rgba(202, 138, 4, 0.08)", text: "#ca8a04", border: "rgba(202, 138, 4, 0.2)" },
    LOW: { bg: "rgba(22, 163, 74, 0.08)", text: "#16a34a", border: "rgba(22, 163, 74, 0.2)" },
  };
  const color = colors[severity] || colors.MEDIUM;
  
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        px: 1.25,
        py: 0.375,
        borderRadius: 0.75,
        bgcolor: color.bg,
        border: `1px solid ${color.border}`,
      }}
    >
      <Typography sx={{ fontSize: "0.625rem", fontWeight: 700, color: color.text, letterSpacing: "0.05em" }}>
        {severity}
      </Typography>
    </Box>
  );
}

function AuthorityBadge({ isMandatory, canBeWeakened }: { isMandatory: boolean; canBeWeakened: boolean }) {
  if (!isMandatory && canBeWeakened) return null;
  
  const label = isMandatory ? "MANDATORY" : "CANNOT WEAKEN";
  
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1.25,
        py: 0.375,
        borderRadius: 0.75,
        bgcolor: "rgba(99, 102, 241, 0.08)",
        border: "1px solid rgba(99, 102, 241, 0.2)",
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 12, color: "#6366f1" }}>lock</span>
      <Typography sx={{ fontSize: "0.625rem", fontWeight: 700, color: "#6366f1", letterSpacing: "0.05em" }}>
        {label}
      </Typography>
    </Box>
  );
}

function StatusPill({ isEnforced }: { isEnforced: boolean }) {
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        px: 1.5,
        py: 0.5,
        borderRadius: 1,
        bgcolor: isEnforced ? "rgba(22, 163, 74, 0.06)" : "rgba(113, 113, 122, 0.06)",
        border: `1px solid ${isEnforced ? "rgba(22, 163, 74, 0.15)" : "rgba(113, 113, 122, 0.15)"}`,
      }}
    >
      <Box
        sx={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          bgcolor: isEnforced ? "#16a34a" : "#71717a",
        }}
      />
      <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: isEnforced ? "#16a34a" : "#71717a" }}>
        {isEnforced ? "Enforced" : "Not Enforced"}
      </Typography>
    </Box>
  );
}

function PolicyCard({
  policy,
  incidentMode,
  onUpdate,
}: {
  policy: GlobalPolicy;
  incidentMode: boolean;
  onUpdate: (id: string, config: PolicyConfig) => Promise<void>;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [expanded, setExpanded] = useState(false);
  const [localConfig, setLocalConfig] = useState<PolicyConfig>(policy.config);
  const [saving, setSaving] = useState(false);

  const isLocked = policy.isMandatory || !policy.canBeWeakened;
  const isEnforced = policy.isActive;
  const executionSummary = EXECUTION_SUMMARIES[policy.policyType];
  const configGroups = CONFIG_GROUPS[policy.policyType];

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(policy.id, localConfig);
    setSaving(false);
    setExpanded(false);
  };

  const configEntries = Object.entries(localConfig).filter(([key]) => key !== "enabled");

  const renderConfigField = (key: string, value: unknown) => {
    const label = CONFIG_LABELS[key] || key.replace(/([A-Z])/g, " $1").trim();
    
    if (typeof value === "boolean") {
      return (
        <Box key={key} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1.5, borderBottom: "1px solid", borderColor: isDark ? "#1f1f23" : "#f3f4f6" }}>
          <Typography sx={{ fontSize: "0.8125rem", color: isDark ? "#a1a1aa" : "#52525b" }}>{label}</Typography>
          <FormControl size="small">
            <Select
              value={value ? "yes" : "no"}
              onChange={(e) => setLocalConfig({ ...localConfig, [key]: e.target.value === "yes" })}
              sx={{
                fontSize: "0.8125rem",
                minWidth: 100,
                "& .MuiOutlinedInput-notchedOutline": { borderColor: isDark ? "#27272a" : "#e5e7eb" },
                "& .MuiSelect-select": { py: 0.75, color: isDark ? "#fafafa" : "#0f172a" },
              }}
            >
              <MenuItem value="yes">Yes</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </Select>
          </FormControl>
        </Box>
      );
    }
    
    return (
      <Box key={key} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1.5, borderBottom: "1px solid", borderColor: isDark ? "#1f1f23" : "#f3f4f6" }}>
        <Typography sx={{ fontSize: "0.8125rem", color: isDark ? "#a1a1aa" : "#52525b" }}>{label}</Typography>
        <TextField
          value={value}
          onChange={(e) => {
            const newValue = typeof value === "number" ? Number(e.target.value) : e.target.value;
            setLocalConfig({ ...localConfig, [key]: newValue });
          }}
          type={typeof value === "number" ? "number" : "text"}
          size="small"
          sx={{
            width: 120,
            "& .MuiOutlinedInput-root": {
              fontSize: "0.8125rem",
              bgcolor: isDark ? "#141416" : "#fff",
              "& fieldset": { borderColor: isDark ? "#27272a" : "#e5e7eb" },
              "&:hover fieldset": { borderColor: isDark ? "#3f3f46" : "#d1d5db" },
              "&.Mui-focused fieldset": { borderColor: incidentMode ? "#dc2626" : "#6366f1" },
            },
            "& .MuiInputBase-input": { color: isDark ? "#fafafa" : "#0f172a", py: 0.75, textAlign: "right" },
          }}
        />
      </Box>
    );
  };

  return (
    <Box
      sx={{
        bgcolor: incidentMode ? alpha("#1c1917", 0.4) : isDark ? "#141416" : "#fff",
        border: "1px solid",
        borderColor: incidentMode ? alpha("#dc2626", 0.12) : isDark ? "#1f1f23" : "#e5e7eb",
        borderRadius: 2,
        overflow: "hidden",
        transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": {
          borderColor: incidentMode ? alpha("#dc2626", 0.3) : isDark ? "#2d2d33" : "#cbd5e1",
          transform: "translateY(-2px)",
          boxShadow: isDark ? "0 8px 30px rgba(0,0,0,0.4)" : "0 8px 30px rgba(0,0,0,0.06)",
        },
      }}
    >
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2 }}>
          <Box sx={{ flex: 1, minWidth: 0, pr: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5, flexWrap: "wrap" }}>
              <Typography
                sx={{
                  fontSize: "0.9375rem",
                  fontWeight: 700,
                  color: isDark ? "#fafafa" : "#0f172a",
                  letterSpacing: "-0.01em",
                }}
              >
                {policy.name}
              </Typography>
              <SeverityBadge severity={policy.severity} />
              <AuthorityBadge isMandatory={policy.isMandatory} canBeWeakened={policy.canBeWeakened} />
            </Box>
            <Typography
              sx={{
                fontSize: "0.8125rem",
                color: isDark ? "#a1a1aa" : "#6b7280",
                lineHeight: 1.7,
              }}
            >
              {policy.description}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
            <StatusPill isEnforced={isEnforced} />
            <Button
              variant="outlined"
              size="small"
              onClick={() => setExpanded(!expanded)}
              endIcon={
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 18,
                    transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 200ms",
                  }}
                >
                  expand_more
                </span>
              }
              sx={{
                fontSize: "0.8125rem",
                fontWeight: 600,
                textTransform: "none",
                px: 2,
                borderColor: isDark ? "#27272a" : "#e5e7eb",
                color: isDark ? "#a1a1aa" : "#52525b",
                "&:hover": {
                  borderColor: isDark ? "#3f3f46" : "#d1d5db",
                  bgcolor: "transparent",
                },
              }}
            >
              {isLocked ? "View" : "Configure"}
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: isDark ? "#3f3f46" : "#d1d5db" }}>
              corporate_fare
            </span>
            <Typography sx={{ fontSize: "0.75rem", color: isDark ? "#52525b" : "#9ca3af" }}>
              All tenants
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: isDark ? "#3f3f46" : "#d1d5db" }}>
              gavel
            </span>
            <Typography sx={{ fontSize: "0.75rem", color: isDark ? "#52525b" : "#9ca3af" }}>
              {policy.enforcementCount30d} enforcements (30d)
            </Typography>
          </Box>
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Box
          sx={{
            px: 3,
            pb: 3,
            pt: 2.5,
            borderTop: "1px solid",
            borderColor: incidentMode ? alpha("#dc2626", 0.08) : isDark ? "#1f1f23" : "#f3f4f6",
            bgcolor: incidentMode ? alpha("#1c1917", 0.3) : isDark ? "#0c0c0e" : "#fafafa",
          }}
        >
          {executionSummary && (
              <Box
                sx={{
                  p: 2.5,
                  mb: 3,
                  borderRadius: 1.5,
                  bgcolor: isDark ? alpha("#6366f1", 0.04) : alpha("#6366f1", 0.03),
                  border: `1px solid ${isDark ? alpha("#6366f1", 0.1) : alpha("#6366f1", 0.08)}`,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    color: "#6366f1",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    mb: 1,
                  }}
                >
                  Execution Logic
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.8125rem",
                    color: isDark ? "#a1a1aa" : "#52525b",
                    lineHeight: 1.7,
                  }}
                >
                  {executionSummary(localConfig)}
                </Typography>
              </Box>
            )}

          {isLocked && (
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: 1.5,
                p: 2,
                mb: 3,
                borderRadius: 1,
                bgcolor: isDark ? alpha("#f59e0b", 0.04) : alpha("#f59e0b", 0.04),
                border: `1px solid ${isDark ? alpha("#f59e0b", 0.12) : alpha("#f59e0b", 0.15)}`,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#f59e0b" }}>info</span>
              <Typography sx={{ fontSize: "0.8125rem", color: isDark ? "#fbbf24" : "#b45309", lineHeight: 1.6 }}>
                {policy.isMandatory
                  ? "This policy is mandatory and cannot be disabled at the platform level. Configuration parameters may be adjusted but enforcement will remain active."
                  : "This policy cannot be weakened below platform baseline. Configuration changes that reduce security posture are not permitted."}
              </Typography>
            </Box>
          )}

          {configGroups ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {configGroups.map((group) => {
                const groupFields = group.fields.filter((f) => localConfig[f] !== undefined);
                if (groupFields.length === 0) return null;
                return (
                  <Box key={group.label}>
                    <Typography
                      sx={{
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                        color: isDark ? "#52525b" : "#9ca3af",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        mb: 1,
                      }}
                    >
                      {group.label}
                    </Typography>
                    <Box sx={{ bgcolor: isDark ? "#141416" : "#fff", borderRadius: 1, border: "1px solid", borderColor: isDark ? "#1f1f23" : "#e5e7eb", px: 2 }}>
                      {groupFields.map((key) => renderConfigField(key, localConfig[key]))}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Box>
              <Typography
                sx={{
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  color: isDark ? "#52525b" : "#9ca3af",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  mb: 1,
                }}
              >
                Configuration Parameters
              </Typography>
              <Box sx={{ bgcolor: isDark ? "#141416" : "#fff", borderRadius: 1, border: "1px solid", borderColor: isDark ? "#1f1f23" : "#e5e7eb", px: 2 }}>
                {configEntries.map(([key, value]) => renderConfigField(key, value))}
              </Box>
            </Box>
          )}

          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3, gap: 1.5 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setLocalConfig(policy.config);
                setExpanded(false);
              }}
              sx={{
                fontSize: "0.8125rem",
                fontWeight: 600,
                textTransform: "none",
                px: 2.5,
                borderColor: isDark ? "#27272a" : "#d1d5db",
                color: isDark ? "#a1a1aa" : "#52525b",
                "&:hover": {
                  borderColor: isDark ? "#3f3f46" : "#9ca3af",
                  bgcolor: "transparent",
                },
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={handleSave}
              disabled={saving}
              sx={{
                fontSize: "0.8125rem",
                fontWeight: 600,
                textTransform: "none",
                px: 2.5,
                bgcolor: incidentMode ? "#b91c1c" : "#4f46e5",
                "&:hover": { bgcolor: incidentMode ? "#991b1b" : "#4338ca" },
                "&:disabled": { bgcolor: isDark ? "#27272a" : "#e5e7eb" },
              }}
            >
              {saving ? "Saving..." : "Save Configuration"}
            </Button>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}

function DomainSection({
  domain,
  incidentMode,
  onUpdate,
}: {
  domain: PolicyDomain;
  incidentMode: boolean;
  onUpdate: (id: string, config: PolicyConfig) => Promise<void>;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const mandatoryCount = domain.policies.filter((p) => p.isMandatory).length;
  const enforcedCount = domain.policies.filter((p) => p.isActive).length;

  return (
    <Box sx={{ mb: 5 }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              bgcolor: incidentMode ? alpha("#dc2626", 0.08) : alpha("#6366f1", 0.08),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 22, color: incidentMode ? "#dc2626" : "#6366f1" }}
            >
              {domain.icon}
            </span>
          </Box>
          <Box>
            <Typography
              sx={{
                fontSize: "1.0625rem",
                fontWeight: 700,
                color: isDark ? "#fafafa" : "#0f172a",
                mb: 0.5,
                letterSpacing: "-0.01em",
              }}
            >
              {domain.name}
            </Typography>
            <Typography sx={{ fontSize: "0.8125rem", color: isDark ? "#71717a" : "#6b7280", lineHeight: 1.5 }}>
              {domain.description}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
          <Box sx={{ textAlign: "right" }}>
            <Typography sx={{ fontSize: "0.6875rem", color: isDark ? "#52525b" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Enforced
            </Typography>
            <Typography sx={{ fontSize: "0.875rem", fontWeight: 600, color: "#16a34a" }}>
              {enforcedCount} / {domain.policies.length}
            </Typography>
          </Box>
          {mandatoryCount > 0 && (
            <Box sx={{ textAlign: "right" }}>
              <Typography sx={{ fontSize: "0.6875rem", color: isDark ? "#52525b" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Mandatory
              </Typography>
              <Typography sx={{ fontSize: "0.875rem", fontWeight: 600, color: "#6366f1" }}>
                {mandatoryCount}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {domain.policies.map((policy) => (
          <PolicyCard key={policy.id} policy={policy} incidentMode={incidentMode} onUpdate={onUpdate} />
        ))}
      </Box>
    </Box>
  );
}

export default function AdminPoliciesPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { incidentMode } = usePlatformContext();

  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState<GlobalPolicy[]>([]);
  const [lastModified, setLastModified] = useState<{ by: string; at: string } | null>(null);

  const fetchPolicies = async () => {
    try {
      const res = await fetch("/api/platform/policies");
      if (res.ok) {
        const data = await res.json();
        setPolicies(data.policies);
        if (data.policies.length > 0) {
          const latest = data.policies.reduce((acc: GlobalPolicy, p: GlobalPolicy) =>
            new Date(p.updatedAt) > new Date(acc.updatedAt) ? p : acc
          );
          setLastModified({
            by: "Platform Administrator",
            at: latest.updatedAt,
          });
        }
      }
    } catch (e) {
      console.error("Failed to fetch policies", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleUpdate = async (id: string, config: PolicyConfig) => {
    try {
      const res = await fetch("/api/platform/policies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, config }),
      });
      if (res.ok) {
        await fetchPolicies();
      }
    } catch (e) {
      console.error("Failed to update policy", e);
    }
  };

  const domains: PolicyDomain[] = Object.entries(DOMAIN_CONFIG)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([key, config]) => ({
      id: key,
      ...config,
      policies: policies.filter((p) => POLICY_TO_DOMAIN[p.policyType] === key),
    }))
    .filter((d) => d.policies.length > 0);

  const unassignedPolicies = policies.filter((p) => !POLICY_TO_DOMAIN[p.policyType]);
  if (unassignedPolicies.length > 0) {
    domains.push({
      id: "OTHER",
      name: "Additional Policies",
      description: "Platform-level security and operational policies.",
      icon: "settings",
      policies: unassignedPolicies,
    });
  }

  const enforcedCount = policies.filter((p) => p.isActive).length;
  const mandatoryCount = policies.filter((p) => p.isMandatory).length;
  const cannotWeakenCount = policies.filter((p) => !p.canBeWeakened).length;

  if (loading) {
    return (
      <Box sx={{ height: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress size={28} sx={{ color: incidentMode ? "#dc2626" : "#6366f1" }} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200 }}>
      <Box sx={{ mb: 5 }}>
        <Typography
          sx={{
            fontSize: "1.75rem",
            fontWeight: 700,
            color: isDark ? "#fafafa" : "#0f172a",
            letterSpacing: "-0.02em",
            mb: 1,
          }}
        >
          Global Security Policies
        </Typography>
        <Typography sx={{ fontSize: "0.9375rem", color: isDark ? "#71717a" : "#6b7280", mb: 3, maxWidth: 720 }}>
          Platform-wide security governance enforced across all tenants. These policies define the security baseline that organizations cannot weaken.
        </Typography>

        <Box
          sx={{
            p: 3,
            borderRadius: 2,
            bgcolor: incidentMode ? alpha("#dc2626", 0.04) : isDark ? "#141416" : "#fff",
            border: "1px solid",
            borderColor: incidentMode ? alpha("#dc2626", 0.15) : isDark ? "#1f1f23" : "#e5e7eb",
            boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.2)" : "0 4px 20px rgba(0,0,0,0.03)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2.5, mb: 3 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 1,
                bgcolor: incidentMode ? alpha("#dc2626", 0.08) : alpha("#6366f1", 0.08),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 24, color: incidentMode ? "#dc2626" : "#6366f1" }}
              >
                gavel
              </span>
            </Box>
            <Box>
              <Typography
                sx={{
                  fontSize: "0.9375rem",
                  fontWeight: 700,
                  color: isDark ? "#fafafa" : "#0f172a",
                  mb: 0.75,
                }}
              >
                Platform Governance Authority
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.875rem",
                  color: isDark ? "#a1a1aa" : "#52525b",
                  lineHeight: 1.6,
                }}
              >
                These policies are enforced across all tenants and cannot be overridden at the organization level.
                Mandatory policies are locked and cannot be disabled. All policy configuration changes are logged in the platform audit trail.
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 0,
              borderTop: "1px solid",
              borderColor: incidentMode ? alpha("#dc2626", 0.1) : isDark ? "#1f1f23" : "#f3f4f6",
              pt: 2.5,
            }}
          >
            <Box sx={{ pr: 4, borderRight: "1px solid", borderColor: incidentMode ? alpha("#dc2626", 0.1) : isDark ? "#1f1f23" : "#f3f4f6" }}>
              <Typography sx={{ fontSize: "0.6875rem", fontWeight: 600, color: isDark ? "#52525b" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.75 }}>
                Last Modified
              </Typography>
              <Typography sx={{ fontSize: "0.875rem", fontWeight: 500, color: isDark ? "#a1a1aa" : "#374151" }}>
                {lastModified ? new Date(lastModified.at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
              </Typography>
            </Box>
            <Box sx={{ px: 4, borderRight: "1px solid", borderColor: incidentMode ? alpha("#dc2626", 0.1) : isDark ? "#1f1f23" : "#f3f4f6" }}>
              <Typography sx={{ fontSize: "0.6875rem", fontWeight: 600, color: isDark ? "#52525b" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.75 }}>
                Policies Enforced
              </Typography>
              <Typography sx={{ fontSize: "0.875rem", fontWeight: 600, color: "#16a34a" }}>
                {enforcedCount} / {policies.length}
              </Typography>
            </Box>
            <Box sx={{ px: 4, borderRight: "1px solid", borderColor: incidentMode ? alpha("#dc2626", 0.1) : isDark ? "#1f1f23" : "#f3f4f6" }}>
              <Typography sx={{ fontSize: "0.6875rem", fontWeight: 600, color: isDark ? "#52525b" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.75 }}>
                Mandatory
              </Typography>
              <Typography sx={{ fontSize: "0.875rem", fontWeight: 600, color: "#6366f1" }}>
                {mandatoryCount}
              </Typography>
            </Box>
            <Box sx={{ pl: 4 }}>
              <Typography sx={{ fontSize: "0.6875rem", fontWeight: 600, color: isDark ? "#52525b" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.75 }}>
                Cannot Weaken
              </Typography>
              <Typography sx={{ fontSize: "0.875rem", fontWeight: 600, color: isDark ? "#a1a1aa" : "#374151" }}>
                {cannotWeakenCount}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {domains.map((domain) => (
        <DomainSection key={domain.id} domain={domain} incidentMode={incidentMode} onUpdate={handleUpdate} />
      ))}

      <Box
        sx={{
          mt: 5,
          p: 3,
          borderRadius: 2,
          bgcolor: incidentMode ? alpha("#1c1917", 0.3) : isDark ? "#0c0c0e" : "#fafafa",
          border: "1px solid",
          borderColor: incidentMode ? alpha("#dc2626", 0.1) : isDark ? "#1f1f23" : "#e5e7eb",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: isDark ? "#52525b" : "#9ca3af" }}>
            info
          </span>
          <Box>
            <Typography sx={{ fontSize: "0.875rem", fontWeight: 600, color: isDark ? "#a1a1aa" : "#374151", mb: 0.75 }}>
              Policy Governance Model
            </Typography>
            <Typography sx={{ fontSize: "0.8125rem", color: isDark ? "#71717a" : "#6b7280", lineHeight: 1.7 }}>
              Global policies define the minimum security baseline for all organizations. Organizations may extend these policies with stricter rules but cannot weaken policies marked as mandatory or locked. All policy configuration changes are logged in the platform audit trail with full attribution and are retained for compliance purposes.
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
