"use client";

import React from "react";
import {
  Box,
  Typography,
  Chip,
  Paper,
  alpha,
  useTheme,
  LinearProgress,
  Skeleton,
  Button,
  IconButton,
  SxProps,
  Theme,
} from "@mui/material";
import { stitchTokens } from "@/theme/tokens";

const t = stitchTokens;

export function PageHeader({
  title,
  subtitle,
  badge,
  badgeColor = "primary",
  actions,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: "primary" | "success" | "warning" | "error" | "info";
  actions?: React.ReactNode;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const badgeColors = {
    primary: { bg: alpha(t.colors.primary.main, 0.1), border: alpha(t.colors.primary.main, 0.2), text: t.colors.primary.main },
    success: { bg: t.colors.status.successBg, border: t.colors.status.successBorder, text: t.colors.status.success },
    warning: { bg: t.colors.status.warningBg, border: t.colors.status.warningBorder, text: t.colors.status.warning },
    error: { bg: t.colors.status.errorBg, border: t.colors.status.errorBorder, text: t.colors.status.error },
    info: { bg: t.colors.status.infoBg, border: t.colors.status.infoBorder, text: t.colors.status.info },
  };

  return (
    <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, justifyContent: "space-between", alignItems: { xs: "flex-start", md: "flex-end" }, gap: 3, mb: 4 }}>
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
          <Typography variant="h4" fontWeight={700} sx={{ letterSpacing: "-0.02em", color: isDark ? "#FFFFFF" : t.colors.text.primary.light }}>
            {title}
          </Typography>
          {badge && (
            <Chip
              size="small"
              label={badge}
              sx={{
                height: 26,
                fontSize: t.typography.fontSize.xs,
                fontWeight: 600,
                bgcolor: badgeColors[badgeColor].bg,
                color: badgeColors[badgeColor].text,
                border: `1px solid ${badgeColors[badgeColor].border}`,
              }}
            />
          )}
        </Box>
        {subtitle && (
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, fontSize: t.typography.fontSize.base }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && <Box sx={{ display: "flex", gap: 2, flexShrink: 0 }}>{actions}</Box>}
    </Box>
  );
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendDirection = "up",
  color = "primary",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  trend?: string;
  trendDirection?: "up" | "down";
  color?: "primary" | "success" | "warning" | "error" | "info";
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const colors = {
    primary: t.colors.primary.main,
    success: t.colors.status.success,
    warning: t.colors.status.warning,
    error: t.colors.status.error,
    info: t.colors.status.info,
  };

  return (
    <GlassPanel sx={{ p: 3, height: "100%", position: "relative", overflow: "hidden" }}>
      {icon && (
        <Box sx={{ position: "absolute", top: 16, right: 16, opacity: 0.1 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 64 }}>{icon}</span>
        </Box>
      )}
      <Box sx={{ position: "relative", zIndex: 1 }}>
        <Typography variant="overline" color="text.secondary" sx={{ display: "block", mb: 1, fontSize: t.typography.fontSize.xs }}>
          {title}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5, mb: 0.5 }}>
          <Typography variant="h3" fontWeight={700} sx={{ letterSpacing: "-0.02em", color: isDark ? "#FFFFFF" : t.colors.text.primary.light }}>
            {value}
          </Typography>
          {trend && (
            <Box sx={{
              display: "flex", alignItems: "center", gap: 0.5, px: 1, py: 0.5, borderRadius: 1,
              bgcolor: trendDirection === "up" ? t.colors.status.successBg : t.colors.status.errorBg,
              color: trendDirection === "up" ? t.colors.status.success : t.colors.status.error,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                {trendDirection === "up" ? "trending_up" : "trending_down"}
              </span>
              <Typography sx={{ fontSize: t.typography.fontSize.xs, fontWeight: 600 }}>{trend}</Typography>
            </Box>
          )}
        </Box>
        {subtitle && (
          <Typography sx={{ fontSize: t.typography.fontSize.xs, color: "text.secondary" }}>{subtitle}</Typography>
        )}
      </Box>
    </GlassPanel>
  );
}

export function GlassPanel({
  children,
  sx,
  hover = false,
  ...props
}: {
  children: React.ReactNode;
  sx?: SxProps<Theme>;
  hover?: boolean;
} & Omit<React.ComponentProps<typeof Paper>, "sx">) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Paper
      elevation={0}
      sx={{
        bgcolor: isDark ? t.colors.background.surfaceLight : t.colors.background.lightPaper,
        border: `1px solid ${isDark ? t.colors.border.subtle : t.colors.border.light}`,
        borderRadius: t.borderRadius["2xl"],
        transition: t.transitions.default,
        ...(hover && {
          "&:hover": {
            borderColor: isDark ? t.colors.border.default : alpha(t.colors.primary.main, 0.2),
            boxShadow: isDark ? t.shadows.neonSm : t.shadows.md,
          },
        }),
        ...sx,
      }}
      {...props}
    >
      {children}
    </Paper>
  );
}

export function StatusBadge({
  status,
  size = "medium",
}: {
  status: "success" | "warning" | "error" | "info" | "neutral" | "pending" | "processing";
  size?: "small" | "medium";
}) {
  const statusConfig = {
    success: { icon: "check_circle", label: "Completed", color: t.colors.status.success, bg: t.colors.status.successBg, border: t.colors.status.successBorder },
    warning: { icon: "warning", label: "Warning", color: t.colors.status.warning, bg: t.colors.status.warningBg, border: t.colors.status.warningBorder },
    error: { icon: "error", label: "Error", color: t.colors.status.error, bg: t.colors.status.errorBg, border: t.colors.status.errorBorder },
    info: { icon: "info", label: "Info", color: t.colors.status.info, bg: t.colors.status.infoBg, border: t.colors.status.infoBorder },
    neutral: { icon: "circle", label: "Pending", color: t.colors.status.neutral, bg: t.colors.status.neutralBg, border: t.colors.status.neutralBorder },
    pending: { icon: "schedule", label: "Pending", color: t.colors.status.neutral, bg: t.colors.status.neutralBg, border: t.colors.status.neutralBorder },
    processing: { icon: "sync", label: "Processing", color: t.colors.status.warning, bg: t.colors.status.warningBg, border: t.colors.status.warningBorder },
  };

  const config = statusConfig[status];
  const isSmall = size === "small";

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: isSmall ? 0.75 : 1,
        px: isSmall ? 1.25 : 1.5,
        py: isSmall ? 0.5 : 0.75,
        borderRadius: t.borderRadius.full,
        bgcolor: config.bg,
        border: `1px solid ${config.border}`,
      }}
    >
      <Box
        sx={{
          width: isSmall ? 6 : 8,
          height: isSmall ? 6 : 8,
          borderRadius: "50%",
          bgcolor: config.color,
          ...(status === "processing" && {
            animation: "pulse 1.5s infinite",
            "@keyframes pulse": {
              "0%, 100%": { opacity: 1 },
              "50%": { opacity: 0.5 },
            },
          }),
        }}
      />
      <Typography
        sx={{
          fontSize: t.typography.fontSize.xs,
          fontWeight: 600,
          color: config.color,
          textTransform: "uppercase",
          letterSpacing: "0.03em",
        }}
      >
        {config.label}
      </Typography>
    </Box>
  );
}

export function DataTableWrapper({
  children,
  title,
  icon,
  actions,
  footer,
}: {
  children: React.ReactNode;
  title?: string;
  icon?: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <GlassPanel sx={{ overflow: "hidden" }}>
      {(title || actions) && (
        <Box
          sx={{
            px: 3,
            py: 2,
            borderBottom: `1px solid ${isDark ? t.colors.border.subtle : t.colors.border.light}`,
            bgcolor: isDark ? alpha(t.colors.background.surface, 0.5) : "#F8FAFC",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {title && (
            <Typography variant="subtitle1" fontWeight={600} sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: t.typography.fontSize.base }}>
              {icon && <span className="material-symbols-outlined" style={{ fontSize: 20, opacity: 0.7 }}>{icon}</span>}
              {title}
            </Typography>
          )}
          {actions && <Box sx={{ display: "flex", gap: 1 }}>{actions}</Box>}
        </Box>
      )}
      <Box sx={{ overflowX: "auto" }}>{children}</Box>
      {footer && (
        <Box
          sx={{
            px: 3,
            py: 2,
            borderTop: `1px solid ${isDark ? t.colors.border.subtle : t.colors.border.light}`,
            bgcolor: isDark ? alpha(t.colors.background.surface, 0.3) : "#FAFAFA",
          }}
        >
          {footer}
        </Box>
      )}
    </GlassPanel>
  );
}

export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <Box sx={{ py: 8, px: 4, textAlign: "center" }}>
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mx: "auto",
          mb: 3,
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 40, color: theme.palette.primary.main }}>
          {icon}
        </span>
      </Box>
      <Typography variant="h6" fontWeight={600} gutterBottom sx={{ fontSize: t.typography.fontSize.lg }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: "auto", fontSize: t.typography.fontSize.sm }}>
          {description}
        </Typography>
      )}
      {action}
    </Box>
  );
}

export function LoadingState({ rows = 5 }: { rows?: number }) {
  return (
    <Box sx={{ p: 3 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Box key={i} sx={{ display: "flex", gap: 2, mb: 2 }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" height={24} />
            <Skeleton variant="text" width="40%" height={20} />
          </Box>
          <Skeleton variant="rounded" width={80} height={28} />
        </Box>
      ))}
    </Box>
  );
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = true,
  color = "primary",
}: {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  color?: "primary" | "success" | "warning" | "error";
}) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <Box>
      {(label || showValue) && (
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
          {label && <Typography sx={{ fontSize: t.typography.fontSize.xs, color: "text.secondary" }}>{label}</Typography>}
          {showValue && <Typography sx={{ fontSize: t.typography.fontSize.xs, fontWeight: 600 }}>{value} / {max}</Typography>}
        </Box>
      )}
      <LinearProgress
        variant="determinate"
        value={percentage}
        color={color}
        sx={{ height: 8, borderRadius: 4 }}
      />
    </Box>
  );
}

export function ActionButton({
  children,
  icon,
  variant = "contained",
  color = "primary",
  glow = false,
  ...props
}: {
  children: React.ReactNode;
  icon?: string;
  variant?: "contained" | "outlined" | "text";
  color?: "primary" | "secondary" | "error" | "warning" | "info" | "success";
  glow?: boolean;
} & Omit<React.ComponentProps<typeof Button>, "variant" | "color">) {
  return (
    <Button
      variant={variant}
      color={color}
      startIcon={icon && <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>}
      sx={{
        fontSize: t.typography.fontSize.sm,
        ...(glow && variant === "contained" && color === "primary" && {
          boxShadow: t.shadows.neon,
          "&:hover": {
            boxShadow: `${t.shadows.neon}, ${t.shadows.lg}`,
          },
        }),
      }}
      {...props}
    >
      {children}
    </Button>
  );
}

export function IconBtn({
  icon,
  tooltip,
  size = "medium",
  ...props
}: {
  icon: string;
  tooltip?: string;
  size?: "small" | "medium" | "large";
} & Omit<React.ComponentProps<typeof IconButton>, "children">) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const sizes = { small: 16, medium: 20, large: 24 };

  return (
    <IconButton
      size={size}
      sx={{
        bgcolor: isDark ? t.colors.background.surfaceLight : "transparent",
        border: `1px solid ${isDark ? t.colors.border.subtle : t.colors.border.light}`,
        "&:hover": {
          bgcolor: isDark ? t.colors.glass.hover : "#F1F5F9",
          borderColor: isDark ? t.colors.border.default : "#94A3B8",
        },
      }}
      {...props}
    >
      <span className="material-symbols-outlined" style={{ fontSize: sizes[size] }}>{icon}</span>
    </IconButton>
  );
}

export function SectionDivider({ label }: { label?: string }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  if (!label) {
    return <Box sx={{ height: 1, bgcolor: isDark ? t.colors.border.subtle : t.colors.border.light, my: 3 }} />;
  }

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2, my: 3 }}>
      <Box sx={{ flex: 1, height: 1, bgcolor: isDark ? t.colors.border.subtle : t.colors.border.light }} />
      <Typography sx={{ fontSize: t.typography.fontSize.xs, fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</Typography>
      <Box sx={{ flex: 1, height: 1, bgcolor: isDark ? t.colors.border.subtle : t.colors.border.light }} />
    </Box>
  );
}

export function RiskIndicator({ level }: { level: "low" | "medium" | "high" | "critical" }) {
  const config = {
    low: { color: t.colors.status.success, label: "Low", width: 25 },
    medium: { color: t.colors.status.warning, label: "Medium", width: 50 },
    high: { color: t.colors.status.error, label: "High", width: 75 },
    critical: { color: "#DC2626", label: "Critical", width: 100 },
  };

  const c = config[level];

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      <Box sx={{ width: 60, height: 4, borderRadius: 2, bgcolor: alpha(c.color, 0.2), overflow: "hidden" }}>
        <Box sx={{ width: `${c.width}%`, height: "100%", bgcolor: c.color, borderRadius: 2 }} />
      </Box>
      <Typography sx={{ fontSize: t.typography.fontSize.xs, fontWeight: 600, color: c.color, textTransform: "uppercase" }}>
        {c.label}
      </Typography>
    </Box>
  );
}

export type SecuritySettingRowProps = {
  title: string;
  description: string;
  icon?: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
  riskLevel?: "low" | "medium" | "high" | "critical";
  scope?: string;
  onConfigure?: () => void;
  configureLabel?: string;
  children?: React.ReactNode;
};

export function SecuritySettingRow({
  title,
  description,
  icon,
  enabled,
  onToggle,
  disabled = false,
  riskLevel,
  scope,
  onConfigure,
  configureLabel = "Configure",
  children,
}: SecuritySettingRowProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const riskColors = {
    low: { bg: t.colors.status.successBg, text: t.colors.status.success, border: t.colors.status.successBorder },
    medium: { bg: t.colors.status.warningBg, text: t.colors.status.warning, border: t.colors.status.warningBorder },
    high: { bg: t.colors.status.errorBg, text: t.colors.status.error, border: t.colors.status.errorBorder },
    critical: { bg: "rgba(220, 38, 38, 0.1)", text: "#DC2626", border: "rgba(220, 38, 38, 0.2)" },
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        p: 2,
        borderRadius: t.borderRadius.lg,
        bgcolor: isDark ? t.colors.background.surfaceLight : "#f8fafc",
        border: "1px solid",
        borderColor: enabled
          ? alpha(t.colors.status.success, 0.3)
          : isDark
          ? t.colors.border.subtle
          : "#e2e8f0",
        transition: t.transitions.default,
        "&:hover": {
          borderColor: enabled
            ? alpha(t.colors.status.success, 0.5)
            : isDark
            ? t.colors.border.default
            : "#cbd5e1",
        },
      }}
    >
      {icon && (
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: t.borderRadius.md,
            bgcolor: enabled
              ? alpha(t.colors.status.success, 0.1)
              : isDark
              ? t.colors.glass.hover
              : "#f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 20,
              color: enabled ? t.colors.status.success : isDark ? "#94a3b8" : "#64748b",
            }}
          >
            {icon}
          </span>
        </Box>
      )}

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
          <Typography
            sx={{
              fontSize: t.typography.fontSize.sm,
              fontWeight: 600,
              color: isDark ? "#fff" : t.colors.text.primary.light,
            }}
          >
            {title}
          </Typography>
          {riskLevel && (
            <Chip
              label={riskLevel.toUpperCase()}
              size="small"
              sx={{
                height: 20,
                fontSize: t.typography.fontSize.xs,
                fontWeight: 700,
                bgcolor: riskColors[riskLevel].bg,
                color: riskColors[riskLevel].text,
                border: `1px solid ${riskColors[riskLevel].border}`,
                "& .MuiChip-label": { px: 1 },
              }}
            />
          )}
          {scope && (
            <Chip
              label={scope}
              size="small"
              variant="outlined"
              sx={{
                height: 20,
                fontSize: t.typography.fontSize.xs,
                fontWeight: 600,
                borderColor: isDark ? t.colors.border.subtle : "#e2e8f0",
                color: isDark ? "#94a3b8" : "#64748b",
                "& .MuiChip-label": { px: 1 },
              }}
            />
          )}
        </Box>
        <Typography
          sx={{
            fontSize: t.typography.fontSize.xs,
            color: isDark ? t.colors.text.secondary.dark : t.colors.text.secondary.light,
            display: "block",
            lineHeight: 1.5,
          }}
        >
          {description}
        </Typography>
        {children}
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1.5,
            py: 0.5,
            borderRadius: t.borderRadius.full,
            bgcolor: enabled
              ? alpha(t.colors.status.success, 0.1)
              : isDark
              ? t.colors.glass.hover
              : "#f1f5f9",
            minWidth: 80,
            justifyContent: "center",
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor: enabled ? t.colors.status.success : "#94a3b8",
              transition: t.transitions.default,
            }}
          />
          <Typography
            sx={{
              fontWeight: 600,
              color: enabled ? t.colors.status.success : isDark ? "#94a3b8" : "#64748b",
              fontSize: t.typography.fontSize.xs,
            }}
          >
            {enabled ? "Enabled" : "Disabled"}
          </Typography>
        </Box>

        <Box
          component="button"
          onClick={() => !disabled && onToggle(!enabled)}
          disabled={disabled}
          sx={{
            position: "relative",
            width: 44,
            height: 24,
            borderRadius: 12,
            bgcolor: enabled ? t.colors.status.success : isDark ? "#3f3f46" : "#cbd5e1",
            border: "none",
            cursor: disabled ? "not-allowed" : "pointer",
            transition: t.transitions.default,
            opacity: disabled ? 0.5 : 1,
            p: 0,
            "&:hover:not(:disabled)": {
              bgcolor: enabled
                ? alpha(t.colors.status.success, 0.85)
                : isDark
                ? "#52525b"
                : "#94a3b8",
            },
            "&:focus-visible": {
              outline: `2px solid ${t.colors.primary.main}`,
              outlineOffset: 2,
            },
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: 2,
              left: enabled ? 22 : 2,
              width: 20,
              height: 20,
              borderRadius: "50%",
              bgcolor: "#fff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              transition: t.transitions.default,
            }}
          />
        </Box>

        {onConfigure && (
          <Button
            size="small"
            variant="outlined"
            onClick={onConfigure}
            disabled={disabled}
            sx={{
              minWidth: 90,
              px: 2,
              py: 0.5,
              fontSize: t.typography.fontSize.xs,
              fontWeight: 600,
              borderRadius: t.borderRadius.md,
              textTransform: "none",
              borderColor: isDark ? t.colors.border.subtle : "#e2e8f0",
              color: isDark ? "#94a3b8" : "#64748b",
              "&:hover": {
                bgcolor: isDark ? t.colors.glass.hover : "#f1f5f9",
                borderColor: isDark ? t.colors.border.default : "#cbd5e1",
              },
            }}
          >
            {configureLabel}
          </Button>
        )}
      </Box>
    </Box>
  );
}
