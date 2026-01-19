"use client";

import React, { useState, useTransition } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  alpha,
  useTheme,
  Chip,
  Collapse,
  Slider,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { stitchTokens } from "@/theme/tokens";
import {
  PolicyCategory,
  PolicyScope,
  PolicySeverity,
  OFFBOARDING_POLICY_TYPES,
  OffboardingPolicyType,
  OFFBOARDING_CATEGORIES,
} from "@/lib/policy-definitions";
import { SecuritySettingRow } from "@/components/ui/StitchUI";

const t = stitchTokens;

type Policy = {
  id: string | null;
  policyType: string;
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
};

type EnforcementLog = {
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
};

type CategoryInfo = Record<PolicyCategory, { name: string; description: string; icon: string }>;

interface SecurityPoliciesClientProps {
  policies: Record<string, Policy>;
  enforcementLogs: EnforcementLog[];
  categoryInfo: CategoryInfo;
}

const severityMap: Record<PolicySeverity, "low" | "medium" | "high" | "critical"> = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

const scopeLabels: Record<PolicyScope, string> = {
  ORG_WIDE: "Organization-wide",
  HIGH_RISK_ONLY: "High-risk only",
  EXECUTIVE_ONLY: "Executive only",
};

function PolicyStatusBadge({ isActive, isDark }: { isActive: boolean; isDark: boolean }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        p: 1.5,
        borderRadius: 1.5,
        bgcolor: isActive
          ? alpha("#10b981", isDark ? 0.15 : 0.08)
          : alpha("#94a3b8", isDark ? 0.15 : 0.08),
        border: "1px solid",
        borderColor: isActive
          ? alpha("#10b981", 0.3)
          : alpha("#94a3b8", 0.2),
      }}
    >
      <Box
        sx={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          bgcolor: isActive ? "#10b981" : "#94a3b8",
        }}
      />
      <Box>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            color: isActive ? "#10b981" : "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            fontSize: "0.65rem",
          }}
        >
          Policy Status
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: isActive ? "#10b981" : (isDark ? "#94a3b8" : "#64748b"),
          }}
        >
          {isActive ? "Enabled" : "Disabled"}
        </Typography>
      </Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ ml: "auto", fontSize: "0.7rem" }}
      >
        Use toggle above to change
      </Typography>
    </Box>
  );
}

interface PolicyCardProps {
  policy: Policy;
  isExpanded: boolean;
  onToggle: () => void;
  onExpand: () => void;
  onSave: (config: Record<string, unknown>) => Promise<void>;
  disabled: boolean;
  saveSuccess: boolean;
}

function PolicyCard({ policy, isExpanded, onToggle, onExpand, onSave, disabled, saveSuccess }: PolicyCardProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [localConfig, setLocalConfig] = useState<Record<string, unknown>>(policy.config);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    setLocalConfig(policy.config);
  }, [policy.config]);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(localConfig);
    setIsSaving(false);
  };

  const handleCancel = () => {
    setLocalConfig(policy.config);
    onExpand();
  };

  const renderConfigFields = () => {
    const policyType = policy.policyType as OffboardingPolicyType;
    const config = localConfig as Record<string, unknown>;

    switch (policyType) {
      case "BLOCK_LOGIN_ON_OFFBOARDING":
        return (
          <Box sx={{ display: "grid", gap: 2.5 }}>
            <PolicyStatusBadge isActive={policy.isActive} isDark={isDark} />
            <Typography variant="body2" color="text.secondary">
              This policy has no additional configuration. Enable or disable using the toggle above.
            </Typography>
          </Box>
        );

      case "REQUIRE_APPROVAL_COMPLETION":
        return (
          <Box sx={{ display: "grid", gap: 2.5 }}>
            <PolicyStatusBadge isActive={policy.isActive} isDark={isDark} />
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Required Approvers</Typography>
              <TextField fullWidth size="small" value={(config.requiredApprovers as string[])?.join(", ") || ""} onChange={(e) => setLocalConfig({ ...config, requiredApprovers: e.target.value.split(",").map((s) => s.trim()) })} helperText="Comma-separated list (e.g., manager, hr, it)" />
            </Box>
          </Box>
        );

      case "REQUIRE_ASSET_RETURN":
        return (
          <Box sx={{ display: "grid", gap: 2.5 }}>
            <PolicyStatusBadge isActive={policy.isActive} isDark={isDark} />
            <FormControlLabel
              control={<Checkbox checked={(config.allowWriteOff as boolean) ?? true} onChange={(e) => setLocalConfig({ ...config, allowWriteOff: e.target.checked })} />}
              label={<Typography variant="body2">Allow write-off as alternative to return</Typography>}
            />
          </Box>
        );

      case "REQUIRE_EXECUTIVE_APPROVAL":
        return (
          <Box sx={{ display: "grid", gap: 2.5 }}>
            <PolicyStatusBadge isActive={policy.isActive} isDark={isDark} />
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Executive Job Titles</Typography>
              <TextField fullWidth size="small" value={(config.executiveJobTitles as string[])?.join(", ") || ""} onChange={(e) => setLocalConfig({ ...config, executiveJobTitles: e.target.value.split(",").map((s) => s.trim()) })} helperText="Comma-separated list (e.g., Director, VP, C-Level)" />
            </Box>
          </Box>
        );

      case "RISK_AUTO_LOCKDOWN":
        return (
          <Box sx={{ display: "grid", gap: 2.5 }}>
            <PolicyStatusBadge isActive={policy.isActive} isDark={isDark} />
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Risk Score Threshold</Typography>
              <Box sx={{ px: 1 }}>
                <Slider
                  value={(config.riskThreshold as number) ?? 75}
                  onChange={(_, v) => setLocalConfig({ ...config, riskThreshold: v })}
                  min={50}
                  max={100}
                  step={5}
                  marks={[{ value: 50, label: "50" }, { value: 75, label: "75" }, { value: 100, label: "100" }]}
                  valueLabelDisplay="on"
                />
              </Box>
            </Box>
          </Box>
        );

      case "RISK_ESCALATE_APPROVAL":
        return (
          <Box sx={{ display: "grid", gap: 2.5 }}>
            <PolicyStatusBadge isActive={policy.isActive} isDark={isDark} />
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Risk Threshold for Escalation</Typography>
              <Box sx={{ px: 1, mb: 2 }}>
                <Slider
                  value={(config.riskThreshold as number) ?? 60}
                  onChange={(_, v) => setLocalConfig({ ...config, riskThreshold: v })}
                  min={30}
                  max={90}
                  step={5}
                  valueLabelDisplay="on"
                />
              </Box>
            </Box>
            <TextField fullWidth size="small" label="Escalate to" value={(config.escalateTo as string) || ""} onChange={(e) => setLocalConfig({ ...config, escalateTo: e.target.value })} helperText="Role or team to escalate to" />
          </Box>
        );

      case "RISK_ALERT_SUSPICIOUS":
        return (
          <Box sx={{ display: "grid", gap: 2.5 }}>
            <PolicyStatusBadge isActive={policy.isActive} isDark={isDark} />
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Alert Recipients</Typography>
              <TextField fullWidth size="small" value={(config.alertRecipients as string[])?.join(", ") || ""} onChange={(e) => setLocalConfig({ ...config, alertRecipients: e.target.value.split(",").map((s) => s.trim()) })} helperText="Comma-separated email addresses" />
            </Box>
          </Box>
        );

      case "ASSET_MANDATORY_RETURN":
        return (
          <Box sx={{ display: "grid", gap: 2.5 }}>
            <PolicyStatusBadge isActive={policy.isActive} isDark={isDark} />
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Asset Types Requiring Return</Typography>
              <TextField fullWidth size="small" value={(config.assetTypes as string[])?.join(", ") || ""} onChange={(e) => setLocalConfig({ ...config, assetTypes: e.target.value.split(",").map((s) => s.trim()) })} helperText="Comma-separated asset types (e.g., Laptop, Phone, Security Key)" />
            </Box>
          </Box>
        );

      case "ASSET_RECOVERY_DEADLINE":
        return (
          <Box sx={{ display: "grid", gap: 2.5 }}>
            <PolicyStatusBadge isActive={policy.isActive} isDark={isDark} />
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Recovery Deadline</Typography>
              <TextField fullWidth size="small" type="number" value={(config.deadlineDays as number) || 7} onChange={(e) => setLocalConfig({ ...config, deadlineDays: parseInt(e.target.value) })} helperText="Days allowed for asset recovery from offboarding start" inputProps={{ min: 1, max: 90 }} />
            </Box>
          </Box>
        );

      case "ASSET_MISSING_ESCALATION":
        return (
          <Box sx={{ display: "grid", gap: 2.5 }}>
            <PolicyStatusBadge isActive={policy.isActive} isDark={isDark} />
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <TextField size="small" type="number" label="Escalate after (days)" value={(config.escalateAfterDays as number) || 14} onChange={(e) => setLocalConfig({ ...config, escalateAfterDays: parseInt(e.target.value) })} helperText="Days before escalation" inputProps={{ min: 1, max: 90 }} />
              <TextField size="small" label="Escalate to" value={(config.escalateTo as string) || ""} onChange={(e) => setLocalConfig({ ...config, escalateTo: e.target.value })} helperText="Role to escalate to" />
            </Box>
          </Box>
        );

      default:
        return (
          <Box sx={{ display: "grid", gap: 2.5 }}>
            <PolicyStatusBadge isActive={policy.isActive} isDark={isDark} />
            <Typography variant="body2" color="text.secondary">
              No additional configuration options available for this policy.
            </Typography>
          </Box>
        );
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        transition: "all 0.2s ease",
        bgcolor: isDark ? t.colors.background.surfaceLight : "#fff",
        borderColor: isExpanded
          ? alpha("#00738a", 0.4)
          : policy.isActive
            ? alpha("#10b981", 0.3)
            : isDark
            ? t.colors.border.subtle
            : "#e2e8f0",
        "&:hover": {
          borderColor: isExpanded
            ? alpha("#00738a", 0.5)
            : policy.isActive
              ? alpha("#10b981", 0.5)
              : alpha("#00738a", 0.2),
        },
      }}
    >
      <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
        <Box sx={{ p: 2.5 }}>
          <SecuritySettingRow
            title={policy.name}
            description={policy.description}
            icon={policy.icon}
            enabled={policy.isActive}
            onToggle={onToggle}
            disabled={disabled}
            riskLevel={severityMap[policy.severity]}
            scope={scopeLabels[policy.scope]}
            onConfigure={onExpand}
            configureLabel={isExpanded ? "Close" : "Configure"}
          />
        </Box>

        <Collapse in={isExpanded}>
          <Box
            sx={{
              px: 2.5,
              pb: 2.5,
              borderTop: "1px solid",
              borderColor: isDark ? t.colors.border.subtle : "#e2e8f0",
            }}
          >
            <Box sx={{ pt: 2.5 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mb: 2.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                    What it enforces
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, fontSize: "0.8rem" }}>
                    {policy.enforcement}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                    When it triggers
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, fontSize: "0.8rem" }}>
                    {policy.trigger}
                  </Typography>
                </Box>
              </Box>

              {renderConfigFields()}

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mt: 3,
                  pt: 2.5,
                  borderTop: "1px solid",
                  borderColor: isDark ? t.colors.border.subtle : "#e2e8f0",
                }}
              >
                <Box>
                  {saveSuccess ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#10b981" }}>
                        check_circle
                      </span>
                      <Typography variant="caption" sx={{ color: "#10b981", fontWeight: 600 }}>
                        Configuration saved successfully
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      Changes are recorded in Audit Logs
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: "flex", gap: 1.5 }}>
                  <Button
                    size="small"
                    onClick={handleCancel}
                    disabled={isSaving}
                    sx={{
                      minWidth: 80,
                      px: 2,
                      py: 0.75,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      borderRadius: 1.5,
                      textTransform: "none",
                      color: "text.secondary",
                      "&:hover": { bgcolor: isDark ? t.colors.glass.hover : "#f1f5f9" },
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleSave}
                    disabled={isSaving || disabled}
                    sx={{
                      minWidth: 140,
                      px: 2.5,
                      py: 0.75,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      borderRadius: 1.5,
                      textTransform: "none",
                      bgcolor: "#1e293b",
                      color: "#fff",
                      "&:hover": { bgcolor: "#0f172a" },
                      "&:disabled": { bgcolor: "#94a3b8", color: "#fff" },
                    }}
                  >
                    {isSaving ? "Saving..." : "Save Configuration"}
                  </Button>
                </Box>
              </Box>
            </Box>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}

export default function SecurityPoliciesClient({
  policies,
  enforcementLogs,
  categoryInfo,
}: SecurityPoliciesClientProps) {
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);
  const [saveSuccessPolicy, setSaveSuccessPolicy] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  const offboardingPolicies = Object.values(policies).filter(
    p => OFFBOARDING_POLICY_TYPES.includes(p.policyType as OffboardingPolicyType)
  );

  const policiesByCategory = offboardingPolicies.reduce((acc, policy) => {
    if (!acc[policy.category]) {
      acc[policy.category] = [];
    }
    acc[policy.category].push(policy);
    return acc;
  }, {} as Record<PolicyCategory, Policy[]>);

  const activePoliciesCount = offboardingPolicies.filter((p) => p.isActive).length;
  const totalPoliciesCount = offboardingPolicies.length;
  const criticalPoliciesActive = offboardingPolicies.filter((p) => p.isActive && p.severity === "CRITICAL").length;

  const handleTogglePolicy = async (policy: Policy) => {
    setLoading(true);
    try {
      const response = await fetch("/api/security-policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyType: policy.policyType,
          config: policy.config,
          isActive: !policy.isActive,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to toggle policy");
      }

      startTransition(() => router.refresh());
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred");
    }
    setLoading(false);
  };

  const handleExpandPolicy = (policyType: string) => {
    setExpandedPolicy(expandedPolicy === policyType ? null : policyType);
    setSaveSuccessPolicy(null);
  };

  const handleSavePolicy = async (policy: Policy, config: Record<string, unknown>) => {
    setLoading(true);

    try {
      const response = await fetch("/api/security-policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyType: policy.policyType,
          config: config,
          isActive: policy.isActive,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save policy configuration");
      }

      setSaveSuccessPolicy(policy.policyType);
      setTimeout(() => setSaveSuccessPolicy(null), 5000);
      startTransition(() => router.refresh());
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred");
    }
    setLoading(false);
  };

  const formatTimeAgo = (date: Date) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Security Policies
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Offboarding enforcement rules that directly affect offboarding execution and Risk Radar
          </Typography>
        </Box>
        <Button
          variant="outlined"
          onClick={() => setShowLogs(!showLogs)}
          startIcon={<span className="material-symbols-outlined" style={{ fontSize: 18 }}>history</span>}
          sx={{ fontWeight: 600, borderRadius: 2 }}
        >
          {showLogs ? "Hide Logs" : "Enforcement Logs"}
        </Button>
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 2,
          py: 1.5,
          mb: 4,
          borderRadius: 2,
          bgcolor: isDark ? alpha("#f59e0b", 0.1) : alpha("#f59e0b", 0.05),
          border: "1px solid",
          borderColor: alpha("#f59e0b", 0.3),
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#f59e0b" }}>
          warning
        </span>
        <Typography variant="body2" sx={{ color: isDark ? "#fcd34d" : "#92400e" }}>
          <strong>These rules directly affect offboarding execution and Risk Radar.</strong> For platform-level security settings (session expiration, login lockout, IP restrictions), go to{" "}
          <Button
            variant="text"
            size="small"
            onClick={() => router.push("/app/settings/security")}
            sx={{ p: 0, minWidth: "auto", fontWeight: 700, textTransform: "none", fontSize: "inherit", verticalAlign: "baseline", color: isDark ? "#fcd34d" : "#92400e" }}
          >
            Security Settings
          </Button>
          .
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
          gap: 2,
          mb: 4,
        }}
      >
        <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: isDark ? t.colors.background.surfaceLight : "#fff", borderColor: isDark ? t.colors.border.subtle : "#e2e8f0" }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: alpha("#10b981", 0.1), display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#10b981" }}>verified_user</span>
              </Box>
              <Typography variant="h4" fontWeight={800}>{activePoliciesCount}</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">Active policies</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: isDark ? t.colors.background.surfaceLight : "#fff", borderColor: isDark ? t.colors.border.subtle : "#e2e8f0" }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: alpha("#dc2626", 0.1), display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#dc2626" }}>crisis_alert</span>
              </Box>
              <Typography variant="h4" fontWeight={800}>{criticalPoliciesActive}</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">Critical policies active</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: isDark ? t.colors.background.surfaceLight : "#fff", borderColor: isDark ? t.colors.border.subtle : "#e2e8f0" }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: alpha("#3b82f6", 0.1), display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#3b82f6" }}>policy</span>
              </Box>
              <Typography variant="h4" fontWeight={800}>{totalPoliciesCount}</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">Total policies</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: isDark ? t.colors.background.surfaceLight : "#fff", borderColor: isDark ? t.colors.border.subtle : "#e2e8f0" }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: alpha("#f59e0b", 0.1), display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#f59e0b" }}>history</span>
              </Box>
              <Typography variant="h4" fontWeight={800}>{enforcementLogs.length}</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">Recent enforcements</Typography>
          </CardContent>
        </Card>
      </Box>

      <Collapse in={showLogs}>
        <Card variant="outlined" sx={{ borderRadius: 2, mb: 4, bgcolor: isDark ? t.colors.background.surfaceLight : "#fff", borderColor: isDark ? t.colors.border.subtle : "#e2e8f0" }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#6b7280" }}>history</span>
              <Typography variant="subtitle1" fontWeight={700}>Recent Policy Enforcements</Typography>
            </Box>
            {enforcementLogs.length === 0 ? (
              <Box sx={{ py: 4, textAlign: "center" }}>
                <Typography color="text.secondary">No enforcement logs yet</Typography>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {enforcementLogs.map((log) => (
                  <Box
                    key={log.id}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: isDark ? t.colors.glass.hover : "#f9fafb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Chip label={log.policyType.replace(/_/g, " ")} size="small" sx={{ fontSize: "0.65rem", fontWeight: 600 }} />
                      <Typography variant="body2">{log.action.replace(/_/g, " ")}</Typography>
                      {log.targetName && (
                        <Typography variant="body2" color="text.secondary">
                          on {log.targetName}
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {formatTimeAgo(log.createdAt)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Collapse>

      {OFFBOARDING_CATEGORIES.map((category) => {
        const categoryPolicies = policiesByCategory[category];
        if (!categoryPolicies || categoryPolicies.length === 0) return null;
        
        return (
          <Box key={category} sx={{ mb: 5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1.5,
                  bgcolor: isDark ? t.colors.glass.hover : "#f3f4f6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#6b7280" }}>
                  {categoryInfo[category].icon}
                </span>
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                  {categoryInfo[category].name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {categoryInfo[category].description}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {categoryPolicies.map((policy) => (
                <PolicyCard
                  key={policy.policyType}
                  policy={policy}
                  isExpanded={expandedPolicy === policy.policyType}
                  onToggle={() => handleTogglePolicy(policy)}
                  onExpand={() => handleExpandPolicy(policy.policyType)}
                  onSave={(config) => handleSavePolicy(policy, config)}
                  disabled={loading || isPending}
                  saveSuccess={saveSuccessPolicy === policy.policyType}
                />
              ))}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
