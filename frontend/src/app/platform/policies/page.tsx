"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  alpha,
  useTheme,
  CircularProgress,
  Switch,
  Collapse,
  TextField,
  Button,
  Chip,
} from "@mui/material";
import { stitchTokens } from "@/theme/tokens";
import { usePlatformContext } from "../layout";

const t = stitchTokens;

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

function PolicyCard({
  policy,
  incidentMode,
  onUpdate,
}: {
  policy: GlobalPolicy;
  incidentMode: boolean;
  onUpdate: (id: string, config: PolicyConfig, isActive: boolean) => Promise<void>;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [expanded, setExpanded] = useState(false);
  const [localConfig, setLocalConfig] = useState<PolicyConfig>(policy.config);
  const [saving, setSaving] = useState(false);

  const severityColor =
    policy.severity === "CRITICAL"
      ? "#dc2626"
      : policy.severity === "HIGH"
      ? "#f59e0b"
      : "#6366f1";

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(policy.id, localConfig, policy.isActive);
    setSaving(false);
  };

  const handleToggle = async () => {
    setSaving(true);
    await onUpdate(policy.id, policy.config, !policy.isActive);
    setSaving(false);
  };

  const configEntries = Object.entries(localConfig).filter(
    ([key]) => key !== "enabled"
  );

  return (
    <Box
      sx={{
        bgcolor: incidentMode
          ? alpha("#1c1917", 0.6)
          : isDark
          ? alpha("#18181b", 0.6)
          : "#fff",
        border: "1px solid",
        borderColor: incidentMode
          ? alpha("#dc2626", 0.2)
          : isDark
          ? "#27272a"
          : "#e5e7eb",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          p: 2.5,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
            <Typography
              sx={{
                fontSize: t.typography.fontSize.sm,
                fontWeight: 600,
                color: isDark ? "#fff" : "#0f172a",
              }}
            >
              {policy.name}
            </Typography>
            <Chip
              label={policy.severity}
              size="small"
              sx={{
                height: 20,
                fontSize: 10,
                fontWeight: 600,
                bgcolor: alpha(severityColor, 0.1),
                color: severityColor,
                border: `1px solid ${alpha(severityColor, 0.3)}`,
              }}
            />
            {policy.isMandatory && (
              <Chip
                label="MANDATORY"
                size="small"
                sx={{
                  height: 20,
                  fontSize: 10,
                  fontWeight: 600,
                  bgcolor: alpha("#6366f1", 0.1),
                  color: "#6366f1",
                  border: `1px solid ${alpha("#6366f1", 0.3)}`,
                }}
              />
            )}
            {!policy.canBeWeakened && (
              <Chip
                label="CANNOT WEAKEN"
                size="small"
                sx={{
                  height: 20,
                  fontSize: 10,
                  fontWeight: 600,
                  bgcolor: alpha("#71717a", 0.1),
                  color: isDark ? "#a1a1aa" : "#71717a",
                  border: `1px solid ${alpha("#71717a", 0.3)}`,
                }}
              />
            )}
          </Box>
          <Typography
            sx={{
              fontSize: t.typography.fontSize.xs,
              color: isDark ? "#71717a" : "#6b7280",
              mb: 1,
            }}
          >
            {policy.description}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography
              sx={{
                fontSize: t.typography.fontSize.xs,
                color: isDark ? "#52525b" : "#9ca3af",
              }}
            >
              {policy.enforcementCount30d} enforcements (30d)
            </Typography>
            <Typography
              sx={{
                fontSize: t.typography.fontSize.xs,
                color: isDark ? "#52525b" : "#9ca3af",
              }}
            >
              Type: {policy.policyType}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              bgcolor: policy.isActive
                ? alpha("#22c55e", 0.1)
                : alpha("#71717a", 0.1),
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                bgcolor: policy.isActive ? "#22c55e" : "#71717a",
              }}
            />
            <Typography
              sx={{
                fontSize: t.typography.fontSize.xs,
                fontWeight: 500,
                color: policy.isActive ? "#22c55e" : "#71717a",
              }}
            >
              {policy.isActive ? "Enforced" : "Inactive"}
            </Typography>
          </Box>
          <Switch
            checked={policy.isActive}
            onChange={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
            disabled={saving}
            size="small"
            sx={{
              "& .MuiSwitch-switchBase.Mui-checked": {
                color: incidentMode ? "#dc2626" : "#6366f1",
              },
              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                bgcolor: incidentMode ? "#dc2626" : "#6366f1",
              },
            }}
          />
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 20,
              color: isDark ? "#71717a" : "#9ca3af",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 200ms",
            }}
          >
            expand_more
          </span>
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Box
          sx={{
            px: 2.5,
            pb: 2.5,
            pt: 1,
            borderTop: "1px solid",
            borderColor: incidentMode
              ? alpha("#dc2626", 0.15)
              : isDark
              ? "#27272a"
              : "#e5e7eb",
          }}
        >
          <Typography
            sx={{
              fontSize: t.typography.fontSize.xs,
              fontWeight: 600,
              color: isDark ? "#a1a1aa" : "#52525b",
              mb: 2,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Configuration
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 2,
            }}
          >
            {configEntries.map(([key, value]) => (
              <Box key={key}>
                <Typography
                  sx={{
                    fontSize: t.typography.fontSize.xs,
                    color: isDark ? "#71717a" : "#6b7280",
                    mb: 0.5,
                    textTransform: "capitalize",
                  }}
                >
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </Typography>
                {typeof value === "boolean" ? (
                  <Switch
                    checked={value}
                    onChange={(e) =>
                      setLocalConfig({ ...localConfig, [key]: e.target.checked })
                    }
                    size="small"
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": {
                        color: incidentMode ? "#dc2626" : "#6366f1",
                      },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                        bgcolor: incidentMode ? "#dc2626" : "#6366f1",
                      },
                    }}
                  />
                ) : (
                  <TextField
                    value={value}
                    onChange={(e) => {
                      const newValue =
                        typeof value === "number"
                          ? Number(e.target.value)
                          : e.target.value;
                      setLocalConfig({ ...localConfig, [key]: newValue });
                    }}
                    type={typeof value === "number" ? "number" : "text"}
                    size="small"
                    sx={{
                      width: "100%",
                      "& .MuiOutlinedInput-root": {
                        fontSize: t.typography.fontSize.sm,
                        bgcolor: isDark ? "#09090b" : "#f4f4f5",
                        "& fieldset": {
                          borderColor: isDark ? "#27272a" : "#e5e7eb",
                        },
                        "&:hover fieldset": {
                          borderColor: isDark ? "#3f3f46" : "#d1d5db",
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: incidentMode ? "#dc2626" : "#6366f1",
                        },
                      },
                      "& .MuiInputBase-input": {
                        color: isDark ? "#fff" : "#0f172a",
                        py: 1,
                      },
                    }}
                  />
                )}
              </Box>
            ))}
          </Box>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3, gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setLocalConfig(policy.config)}
              sx={{
                fontSize: t.typography.fontSize.xs,
                textTransform: "none",
                borderColor: isDark ? "#3f3f46" : "#d1d5db",
                color: isDark ? "#a1a1aa" : "#52525b",
                "&:hover": {
                  borderColor: isDark ? "#52525b" : "#9ca3af",
                  bgcolor: "transparent",
                },
              }}
            >
              Reset
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={handleSave}
              disabled={saving}
              sx={{
                fontSize: t.typography.fontSize.xs,
                textTransform: "none",
                bgcolor: incidentMode ? "#dc2626" : "#6366f1",
                "&:hover": {
                  bgcolor: incidentMode ? "#b91c1c" : "#4f46e5",
                },
                "&:disabled": {
                  bgcolor: isDark ? "#27272a" : "#e5e7eb",
                },
              }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}

export default function PlatformPoliciesPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { incidentMode } = usePlatformContext();

  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState<GlobalPolicy[]>([]);

  const fetchPolicies = async () => {
    try {
      const res = await fetch("/api/platform/policies");
      if (res.ok) {
        const data = await res.json();
        setPolicies(data.policies);
      }
    } catch (e) {
      console.error("Failed to fetch policies", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleUpdate = async (id: string, config: PolicyConfig, isActive: boolean) => {
    try {
      const res = await fetch("/api/platform/policies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, config, isActive }),
      });
      if (res.ok) {
        await fetchPolicies();
      }
    } catch (e) {
      console.error("Failed to update policy", e);
    }
  };

  const activeCount = policies.filter((p) => p.isActive).length;
  const mandatoryCount = policies.filter((p) => p.isMandatory).length;
  const totalEnforcements = policies.reduce((sum, p) => sum + p.enforcementCount30d, 0);

  if (loading) {
    return (
      <Box
        sx={{
          height: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress
          size={32}
          sx={{ color: incidentMode ? "#dc2626" : "#6366f1" }}
        />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography
          sx={{
            fontSize: t.typography.fontSize.xl,
            fontWeight: 700,
            color: isDark ? "#fff" : "#0f172a",
            mb: 0.5,
          }}
        >
          Global Security Policies
        </Typography>
        <Typography
          sx={{
            fontSize: t.typography.fontSize.sm,
            color: isDark ? "#71717a" : "#6b7280",
          }}
        >
          Define baseline security policies enforced across all tenants
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 2,
          mb: 4,
        }}
      >
        {[
          {
            label: "Total Policies",
            value: policies.length,
            icon: "policy",
            color: "#6366f1",
          },
          {
            label: "Active",
            value: activeCount,
            icon: "verified",
            color: "#22c55e",
          },
          {
            label: "Mandatory",
            value: mandatoryCount,
            icon: "gavel",
            color: "#f59e0b",
          },
          {
            label: "Enforcements (30d)",
            value: totalEnforcements,
            icon: "shield",
            color: "#6366f1",
          },
        ].map((stat) => (
          <Box
            key={stat.label}
            sx={{
              p: 2.5,
              bgcolor: incidentMode
                ? alpha("#1c1917", 0.6)
                : isDark
                ? alpha("#18181b", 0.6)
                : "#fff",
              border: "1px solid",
              borderColor: incidentMode
                ? alpha("#dc2626", 0.2)
                : isDark
                ? "#27272a"
                : "#e5e7eb",
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1,
                  bgcolor: alpha(stat.color, 0.1),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 18, color: stat.color }}
                >
                  {stat.icon}
                </span>
              </Box>
              <Typography
                sx={{
                  fontSize: t.typography.fontSize.xs,
                  color: isDark ? "#71717a" : "#6b7280",
                }}
              >
                {stat.label}
              </Typography>
            </Box>
            <Typography
              sx={{
                fontSize: t.typography.fontSize["2xl"],
                fontWeight: 700,
                color: isDark ? "#fff" : "#0f172a",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {stat.value}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography
          sx={{
            fontSize: t.typography.fontSize.xs,
            fontWeight: 600,
            color: isDark ? "#71717a" : "#6b7280",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Policy Rules
        </Typography>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {policies.map((policy) => (
          <PolicyCard
            key={policy.id}
            policy={policy}
            incidentMode={incidentMode}
            onUpdate={handleUpdate}
          />
        ))}
      </Box>

      <Box
        sx={{
          mt: 4,
          p: 3,
          bgcolor: incidentMode
            ? alpha("#1c1917", 0.4)
            : isDark
            ? alpha("#18181b", 0.4)
            : "#f9fafb",
          border: "1px solid",
          borderColor: incidentMode
            ? alpha("#dc2626", 0.15)
            : isDark
            ? "#27272a"
            : "#e5e7eb",
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 20,
              color: isDark ? "#71717a" : "#6b7280",
            }}
          >
            info
          </span>
          <Box>
            <Typography
              sx={{
                fontSize: t.typography.fontSize.sm,
                fontWeight: 600,
                color: isDark ? "#a1a1aa" : "#374151",
                mb: 0.5,
              }}
            >
              Policy Enforcement
            </Typography>
            <Typography
              sx={{
                fontSize: t.typography.fontSize.xs,
                color: isDark ? "#71717a" : "#6b7280",
                lineHeight: 1.6,
              }}
            >
              Global policies define the minimum security baseline for all organizations.
              Organizations may extend these policies with stricter rules but cannot weaken
              policies marked as &quot;Cannot Weaken&quot;. All policy changes are logged in
              the platform audit trail.
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
