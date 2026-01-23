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
  enforcementStatus?: "ENFORCED" | "PARTIAL" | "UI_ONLY";
};

type PolicyDomain = {
  id: string;
  name: string;
  description: string;
  icon: string;
  policies: GlobalPolicy[];
};

const DOMAIN_CONFIG: Record<string, { name: string; description: string; icon: string; order: number }> = {
  AUTHENTICATION: {
    name: "Identity & Access",
    description: "Global controls for platform authentication and session security.",
    icon: "fingerprint",
    order: 1,
  },
  NETWORK: {
    name: "Network & Perimeter",
    description: "Network-level security, IP filtering, and regional access controls.",
    icon: "public",
    order: 2,
  },
  DATA: {
    name: "Data & Privacy",
    description: "Governance for data export, retention, and cryptographic protection.",
    icon: "database",
    order: 3,
  },
  WORKFLOW: {
    name: "Operational Governance",
    description: "Mandatory workflows for offboarding and administrative actions.",
    icon: "account_tree",
    order: 4,
  },
  COMPLIANCE: {
    name: "Audit & Compliance",
    description: "Immutable record keeping and automated evidence collection.",
    icon: "verified",
    order: 5,
  },
};

const POLICY_TO_DOMAIN: Record<string, string> = {
  SESSION_REVOCATION: "AUTHENTICATION",
  IP_BLOCKING: "NETWORK",
  DATA_EXPORT: "DATA",
  EVIDENCE_RETENTION: "COMPLIANCE",
  AUDIT_LOGGING: "COMPLIANCE",
  APPROVAL_CHAIN: "WORKFLOW",
  ACCESS_LOCKDOWN: "AUTHENTICATION",
  RISK_ESCALATION: "WORKFLOW",
};

const EXECUTION_SUMMARIES: Record<string, (config: any) => string> = {
  IP_BLOCKING: (c) => `Blocks IPs for ${c.blockDurationMinutes}m after ${c.maxFailedAttempts} failures. Enforcement is global across all organizations.`,
  SESSION_REVOCATION: (c) => `Expires sessions after ${c.maxSessionAge}h or ${c.idleTimeoutMinutes}m of inactivity. Immediate revocation on user disablement.`,
  APPROVAL_CHAIN: (c) => `Requires ${c.minApprovals} independent approvals for sensitive actions. Requires ${c.requireSecurityRole ? "Security Admin" : "any Admin"} signature.`,
  DATA_EXPORT: (c) => `Restricts exports to ${c.allowedRegions.join(", ")}. Exports exceeding ${c.maxExportRows} rows require secondary authorization.`,
  AUDIT_LOGGING: (c) => `Retains immutable platform logs for ${c.retentionDays} days. Log mirroring occurs within ${c.syncIntervalSeconds}s of event.`,
  ACCESS_LOCKDOWN: (c) => `Triggers immediate token invalidation upon offboarding. Coverage: ${c.coverCloudResources ? "All Cloud Assets" : "Primary SaaS Only"}.`,
  EVIDENCE_RETENTION: (c) => `Locks offboarding evidence for ${c.retentionYears} years. Compliance hash generated and signed on completion.`,
  RISK_ESCALATION: (c) => `Escalates cases with ${c.severityThreshold}+ risk scores. Resolution required within ${c.slaHours} hours.`,
};

const CONFIG_GROUPS: Record<string, { label: string; fields: string[] }[]> = {
  IP_BLOCKING: [
    { label: "Thresholds", fields: ["maxFailedAttempts", "blockDurationMinutes"] },
    { label: "Scope", fields: ["enableGlobalBlocking"] },
  ],
  SESSION_REVOCATION: [
    { label: "Lifetimes", fields: ["maxSessionAge", "idleTimeoutMinutes"] },
    { label: "Security", fields: ["forceMfaOnNewDevice"] },
  ],
  APPROVAL_CHAIN: [
    { label: "Requirements", fields: ["minApprovals", "requireSecurityRole"] },
  ],
  AUDIT_LOGGING: [
    { label: "Storage", fields: ["retentionDays", "syncIntervalSeconds"] },
  ],
};

const CONFIG_LABELS: Record<string, string> = {
  maxFailedAttempts: "Max Failed Attempts",
  blockDurationMinutes: "Block Duration (min)",
  maxSessionAge: "Max Session Age (hrs)",
  idleTimeoutMinutes: "Idle Timeout (min)",
  minApprovals: "Required Approvals",
  requireSecurityRole: "Require Security Admin",
  retentionDays: "Log Retention (days)",
  syncIntervalSeconds: "Sync Interval (sec)",
  enableGlobalBlocking: "Global Blocking Enabled",
  forceMfaOnNewDevice: "Force MFA on New Device",
};

function SeverityBadge({ severity }: { severity: string }) {
  const colors = {
    CRITICAL: { bg: "rgba(220, 38, 38, 0.08)", text: "#dc2626", border: "rgba(220, 38, 38, 0.2)" },
    HIGH: { bg: "rgba(234, 88, 12, 0.08)", text: "#ea580c", border: "rgba(234, 88, 12, 0.2)" },
    MEDIUM: { bg: "rgba(202, 138, 4, 0.08)", text: "#ca8a04", border: "rgba(202, 138, 4, 0.2)" },
    LOW: { bg: "rgba(37, 99, 235, 0.08)", text: "#2563eb", border: "rgba(37, 99, 235, 0.2)" },
  };

  const config = colors[severity as keyof typeof colors] || colors.LOW;

  return (
    <Box
      sx={{
        px: 1,
        py: 0.25,
        borderRadius: 0.5,
        bgcolor: config.bg,
        border: `1px solid ${config.border}`,
        display: "inline-flex",
      }}
    >
      <Typography sx={{ fontSize: "0.625rem", fontWeight: 700, color: config.text, letterSpacing: "0.02em" }}>
        {severity}
      </Typography>
    </Box>
  );
}

function StatusPill({ isEnforced, enforcementStatus }: { isEnforced: boolean; enforcementStatus?: string }) {
  const isReal = enforcementStatus === "ENFORCED" || enforcementStatus === "PARTIAL";
  const isPlanned = enforcementStatus === "UI_ONLY";
  const statusLabel = enforcementStatus === "ENFORCED" ? "Enforced" : enforcementStatus === "PARTIAL" ? "Partial" : "Planned";

  const colors = isReal
    ? { bg: "rgba(22, 163, 74, 0.06)", border: "rgba(22, 163, 74, 0.15)", dot: "#16a34a", text: "#16a34a" }
    : isPlanned
      ? { bg: "rgba(234, 179, 8, 0.06)", border: "rgba(234, 179, 8, 0.15)", dot: "#eab308", text: "#ca8a04" }
      : { bg: "rgba(113, 113, 122, 0.06)", border: "rgba(113, 113, 122, 0.15)", dot: "#71717a", text: "#71717a" };

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        px: 1.5,
        py: 0.5,
        borderRadius: 1,
        bgcolor: colors.bg,
        border: `1px solid ${colors.border}`,
      }}
    >
      <Box
        sx={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          bgcolor: colors.dot,
        }}
      />
      <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: colors.text }}>
        {statusLabel}
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
        bgcolor: incidentMode ? alpha("#1c1917", 0.4) : isDark ? "#0f0f11" : "#ffffff",
        border: "1px solid",
        borderColor: incidentMode ? alpha("#dc2626", 0.12) : isDark ? "#1c1c1f" : "#f1f1f4",
        borderRadius: 2.5,
        overflow: "hidden",
        transition: "all 240ms cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": {
          borderColor: incidentMode ? alpha("#dc2626", 0.3) : isDark ? "#27272a" : "#e2e8f0",
          bgcolor: incidentMode ? alpha("#1c1917", 0.5) : isDark ? "#141417" : "#f8fafc",
          transform: "translateY(-1px)",
          boxShadow: isDark ? "0 12px 40px -12px rgba(0,0,0,0.5)" : "0 12px 40px -12px rgba(0,0,0,0.08)",
        },
      }}
    >
      <Box sx={{ p: 3.5 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2.5 }}>
          <Box sx={{ flex: 1, minWidth: 0, pr: 4 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.75, flexWrap: "wrap" }}>
              <Typography
                sx={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: isDark ? "#fafafa" : "#0f172a",
                  letterSpacing: "-0.015em",
                }}
              >
                {policy.name}
              </Typography>
              <SeverityBadge severity={policy.severity} />
              <AuthorityBadge isMandatory={policy.isMandatory} canBeWeakened={policy.canBeWeakened} />
            </Box>
            <Typography
              sx={{
                fontSize: "0.875rem",
                color: isDark ? "#d4d4d8" : "#4b5563",
                lineHeight: 1.6,
                maxWidth: "70ch",
              }}
            >
              {policy.description}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
            <StatusPill isEnforced={isEnforced} enforcementStatus={policy.enforcementStatus} />
            <Button
              variant="outlined"
              size="small"
              onClick={() => setExpanded(!expanded)}
              endIcon={
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 16,
                    transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 250ms cubic-bezier(0.4, 0, 0.2, 1)",
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
                py: 0.75,
                borderRadius: 1.5,
                borderColor: isDark ? "#27272a" : "#e2e8f0",
                color: isDark ? "#d4d4d8" : "#4b5563",
                bgcolor: isDark ? alpha("#fafafa", 0.02) : alpha("#000", 0.01),
                "&:hover": {
                  borderColor: isDark ? "#3f3f46" : "#cbd5e1",
                  bgcolor: isDark ? alpha("#fafafa", 0.05) : alpha("#000", 0.03),
                },
              }}
            >
              {isLocked ? "View Details" : "Configure Policy"}
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: isDark ? "#52525b" : "#9ca3af" }}>
              corporate_fare
            </span>
            <Typography sx={{ fontSize: "0.75rem", fontWeight: 500, color: isDark ? "#71717a" : "#64748b" }}>
              Global Enforcement
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: isDark ? "#52525b" : "#9ca3af" }}>
              gavel
            </span>
            <Typography sx={{ fontSize: "0.75rem", fontWeight: 500, color: isDark ? "#71717a" : "#64748b" }}>
              {policy.enforcementCount30d} checks (30d)
            </Typography>
          </Box>
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Box
          sx={{
            px: 3.5,
            pb: 4,
            pt: 3,
            borderTop: "1px solid",
            borderColor: incidentMode ? alpha("#dc2626", 0.08) : isDark ? "#1c1c1f" : "#f1f1f4",
            bgcolor: incidentMode ? alpha("#1c1917", 0.3) : isDark ? "#0c0c0e" : alpha("#f8fafc", 0.5),
          }}
        >
          {executionSummary && (
            <Box
              sx={{
                p: 3,
                mb: 4,
                borderRadius: 2,
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
                  mb: 1.5,
                }}
              >
                System Enforcement Logic
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.875rem",
                  color: isDark ? "#d4d4d8" : "#4b5563",
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
      } else {
        const error = await res.json();
        console.error("Failed to update policy:", error);
        alert(`Failed to update policy: ${error.error || "Unknown error"}`);
      }
    } catch (e) {
      console.error("Failed to update policy", e);
      alert("A network error occurred while updating the policy.");
    }
  };

  // Separate enforced/partial policies from UI-only (planned) policies
  const enforcedPolicies = policies.filter(
    (p) => p.enforcementStatus === "ENFORCED" || p.enforcementStatus === "PARTIAL"
  );
  const plannedPolicies = policies.filter((p) => p.enforcementStatus === "UI_ONLY");

  // Build domains only from enforced/partial policies
  const domains: PolicyDomain[] = Object.entries(DOMAIN_CONFIG)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([key, config]) => ({
      id: key,
      ...config,
      policies: enforcedPolicies.filter((p) => POLICY_TO_DOMAIN[p.policyType] === key),
    }))
    .filter((d) => d.policies.length > 0);

  const unassignedEnforcedPolicies = enforcedPolicies.filter((p) => !POLICY_TO_DOMAIN[p.policyType]);
  if (unassignedEnforcedPolicies.length > 0) {
    domains.push({
      id: "OTHER",
      name: "Additional Policies",
      description: "Platform-level security and operational policies.",
      icon: "settings",
      policies: unassignedEnforcedPolicies,
    });
  }

  // Build domains for planned (UI-only) policies
  const plannedDomains: PolicyDomain[] = Object.entries(DOMAIN_CONFIG)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([key, config]) => ({
      id: key,
      ...config,
      policies: plannedPolicies.filter((p) => POLICY_TO_DOMAIN[p.policyType] === key),
    }))
    .filter((d) => d.policies.length > 0);

  const unassignedPlannedPolicies = plannedPolicies.filter((p) => !POLICY_TO_DOMAIN[p.policyType]);
  if (unassignedPlannedPolicies.length > 0) {
    plannedDomains.push({
      id: "OTHER_PLANNED",
      name: "Additional Planned Controls",
      description: "Planned platform-level security controls.",
      icon: "settings",
      policies: unassignedPlannedPolicies,
    });
  }

  // Stats only from enforced/partial policies
  const enforcedCount = enforcedPolicies.filter((p) => p.isActive).length;
  const mandatoryCount = enforcedPolicies.filter((p) => p.isMandatory).length;
  const cannotWeakenCount = enforcedPolicies.filter((p) => !p.canBeWeakened).length;

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
                {enforcedCount} / {enforcedPolicies.length}
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

      {/* Planned Controls Section - UI-only policies that are not yet enforced */}
      {plannedPolicies.length > 0 && (
        <Box sx={{ mt: 6 }}>
          <Box
            sx={{
              mb: 4,
              p: 3,
              borderRadius: 2,
              bgcolor: isDark ? alpha("#eab308", 0.04) : alpha("#eab308", 0.03),
              border: `1px solid ${isDark ? alpha("#eab308", 0.12) : alpha("#eab308", 0.1)}`,
              borderLeft: `4px solid #eab308`,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 22, color: "#eab308", marginTop: 2 }}
              >
                construction
              </span>
              <Box>
                <Typography
                  sx={{
                    fontSize: "1.125rem",
                    fontWeight: 700,
                    color: isDark ? "#fafafa" : "#0f172a",
                    mb: 0.75,
                  }}
                >
                  Planned Controls
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.875rem",
                    color: isDark ? "#a1a1aa" : "#52525b",
                    lineHeight: 1.6,
                  }}
                >
                  The following controls are planned for future implementation. They are not currently
                  enforced and should not be considered active security measures. These items are shown
                  for visibility into the platform roadmap only.
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ opacity: 0.75 }}>
            {plannedDomains.map((domain) => (
              <DomainSection key={`planned-${domain.id}`} domain={domain} incidentMode={incidentMode} onUpdate={handleUpdate} />
            ))}
          </Box>
        </Box>
      )}

      <Box
        sx={{
          mt: 5,
          p: 3.5,
          borderRadius: 2.5,
          bgcolor: incidentMode
            ? alpha("#dc2626", 0.03)
            : isDark
              ? alpha("#6366f1", 0.03)
              : alpha("#6366f1", 0.02),
          border: "1px solid",
          borderColor: incidentMode
            ? alpha("#dc2626", 0.1)
            : isDark
              ? alpha("#6366f1", 0.1)
              : alpha("#6366f1", 0.08),
          borderLeft: `4px solid ${incidentMode ? "#dc2626" : "#6366f1"}`,
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(90deg, ${incidentMode ? alpha("#dc2626", 0.05) : alpha("#6366f1", 0.05)} 0%, transparent 100%)`,
            pointerEvents: "none",
          }
        }}
      >
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 3, position: "relative", zIndex: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              bgcolor: incidentMode ? alpha("#dc2626", 0.1) : alpha("#6366f1", 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 22,
                color: incidentMode ? "#dc2626" : "#6366f1",
                fontWeight: "bold"
              }}
            >
              verified_user
            </span>
          </Box>
          <Box>
            <Typography
              sx={{
                fontSize: "0.9375rem",
                fontWeight: 700,
                color: isDark ? "#fafafa" : "#0f172a",
                mb: 1,
                letterSpacing: "-0.01em"
              }}
            >
              Policy Governance Model
            </Typography>
            <Typography
              sx={{
                fontSize: "0.875rem",
                color: isDark ? "#a1a1aa" : "#475569",
                lineHeight: 1.8,
                maxWidth: "90ch"
              }}
            >
              Global policies define the <Box component="span" sx={{ color: isDark ? "#e2e8f0" : "#1e293b", fontWeight: 600 }}>minimum security baseline</Box> for all organizations.
              Tenants may extend these policies with <Box component="span" sx={{ color: isDark ? "#e2e8f0" : "#1e293b", fontWeight: 600 }}>stricter rules</Box> but are strictly prohibited from
              weakening policies marked as <Box component="span" sx={{ color: incidentMode ? "#f87171" : "#818cf8", fontWeight: 600 }}>mandatory</Box> or <Box component="span" sx={{ color: incidentMode ? "#f87171" : "#818cf8", fontWeight: 600 }}>locked</Box>.
              Every configuration change is cryptographically logged in the platform audit trail for permanent compliance attribution.
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
