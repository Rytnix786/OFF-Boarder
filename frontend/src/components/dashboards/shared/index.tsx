"use client";

import React from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Avatar,
  alpha,
  IconButton,
  Tooltip,
  Button,
  Skeleton,
  useTheme,
} from "@mui/material";
import Link from "next/link";
import { stitchTokens } from "@/theme/tokens";

const t = stitchTokens;

export type RiskPosture = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export const riskPostureConfig = {
  LOW: { color: "#10b981", bg: "#10b98115", label: "Secure", icon: "verified_user", summary: "All systems operational" },
  MEDIUM: { color: "#f59e0b", bg: "#f59e0b15", label: "Needs Attention", icon: "shield", summary: "Some items need review" },
  HIGH: { color: "#f97316", bg: "#f9731615", label: "High Risk", icon: "gpp_maybe", summary: "Action required" },
  CRITICAL: { color: "#ef4444", bg: "#ef444415", label: "Critical", icon: "gpp_bad", summary: "Immediate action needed" },
};

export interface KPICardProps {
  label: string;
  value: number | string;
  icon: string;
  color: string;
  href?: string;
  trend?: string;
  trendDirection?: "up" | "down";
  size?: "sm" | "md" | "lg";
}

export function KPICard({ label, value, icon, color, href, trend, trendDirection, size = "md" }: KPICardProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const sizeConfig = {
    sm: { iconSize: 18, iconBox: 36, valueSize: "h5", padding: 2 },
    md: { iconSize: 20, iconBox: 44, valueSize: "h4", padding: 2.5 },
    lg: { iconSize: 24, iconBox: 52, valueSize: "h3", padding: 3 },
  };

  const cfg = sizeConfig[size];

  const content = (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        borderRadius: 3,
        transition: "all 0.2s",
        bgcolor: isDark ? t.colors.background.surfaceLight : "#1a1d1f",
        borderColor: isDark ? t.colors.border.subtle : "rgba(255, 255, 255, 0.08)",
        ...(href && {
          "&:hover": {
            borderColor: color,
            transform: "translateY(-2px)",
            boxShadow: `0 4px 12px ${alpha(color, 0.15)}`,
          },
        }),
      }}
    >
      <CardContent sx={{ p: cfg.padding, "&:last-child": { pb: cfg.padding } }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mb: 1 }}>
          <Box
            sx={{
              width: cfg.iconBox,
              height: cfg.iconBox,
              borderRadius: 2,
              bgcolor: alpha(color, 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: cfg.iconSize, color }}>
              {icon}
            </span>
          </Box>
        </Box>
        <Box sx={{ textAlign: "center" }}>
          <Typography
            variant={cfg.valueSize as any}
            sx={{ fontWeight: 900, color: isDark ? "#FFFFFF" : "#FFFFFF" }}
          >
            {value}
          </Typography>
          <Typography
            variant="caption"
            sx={{ fontWeight: 600, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: 0.3, color: isDark ? "text.secondary" : "rgba(255, 255, 255, 0.6)" }}
          >
            {label}
          </Typography>
          {trend && (
            <Box sx={{ mt: 0.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 14, color: trendDirection === "up" ? "#22c55e" : "#ef4444" }}
              >
                {trendDirection === "up" ? "trending_up" : "trending_down"}
              </span>
              <Typography
                variant="caption"
                sx={{ color: trendDirection === "up" ? "#22c55e" : "#ef4444", fontWeight: 600 }}
              >
                {trend}
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: "none", display: "block" }}>
        {content}
      </Link>
    );
  }

  return content;
}

export interface StatusBannerProps {
  posture: RiskPosture;
}

export function StatusBanner({ posture }: StatusBannerProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const config = riskPostureConfig[posture];

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 2.5,
        py: 1.5,
        borderRadius: 2.5,
        bgcolor: isDark ? alpha(config.color, 0.08) : alpha(config.color, 0.06),
        border: "1px solid",
        borderColor: alpha(config.color, 0.2),
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: 1.5,
          bgcolor: alpha(config.color, 0.15),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: config.color }}>
          {config.icon}
        </span>
      </Box>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: config.color }}>
          {config.label}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
          {config.summary}
        </Typography>
      </Box>
    </Box>
  );
}

export interface RiskPostureBannerProps {
  posture: RiskPosture;
  compact?: boolean;
}

export function RiskPostureBanner({ posture, compact = false }: RiskPostureBannerProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const config = riskPostureConfig[posture];

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        borderColor: alpha(config.color, 0.3),
        background: `linear-gradient(135deg, ${config.bg} 0%, ${alpha(config.color, 0.02)} 100%)`,
      }}
    >
      <CardContent sx={{ p: compact ? 2 : 2.5, "&:last-child": { pb: compact ? 2 : 2.5 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              width: compact ? 40 : 48,
              height: compact ? 40 : 48,
              borderRadius: 2,
              bgcolor: config.bg,
              border: `2px solid ${config.color}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: compact ? 20 : 24, color: config.color }}
            >
              {config.icon}
            </span>
          </Box>
          <Box>
            <Typography variant={compact ? "subtitle2" : "h6"} sx={{ fontWeight: 800, color: config.color, lineHeight: 1.2 }}>
              {config.label}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {config.summary}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export interface MetricCardProps {
  label: string;
  value: number | string;
  icon: string;
  href?: string;
  variant?: "default" | "warning" | "danger" | "success";
  compact?: boolean;
}

export function MetricCard({ label, value, icon, href, variant = "default", compact = false }: MetricCardProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const variantConfig = {
    default: { color: "#00738a", iconBg: isDark ? "#00738a20" : "#00738a10" },
    warning: { color: "#f59e0b", iconBg: isDark ? "#f59e0b20" : "#f59e0b10" },
    danger: { color: "#ef4444", iconBg: isDark ? "#ef444420" : "#ef444410" },
    success: { color: "#10b981", iconBg: isDark ? "#10b98120" : "#10b98110" },
  };

  const cfg = variantConfig[variant];

  const content = (
    <Card
      variant="outlined"
      sx={{
        height: compact ? 72 : 100,
        borderRadius: compact ? 2 : 3,
        transition: "all 0.2s ease",
        bgcolor: isDark ? t.colors.background.surfaceLight : t.colors.background.lightPaper,
        borderColor: isDark ? t.colors.border.subtle : t.colors.border.light,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...(href && {
          cursor: "pointer",
          "&:hover": {
            borderColor: alpha(cfg.color, 0.5),
            transform: "translateY(-2px)",
            boxShadow: `0 4px 12px ${alpha(cfg.color, 0.12)}`,
          },
        }),
      }}
    >
      <CardContent sx={{ p: compact ? 1.5 : 2, "&:last-child": { pb: compact ? 1.5 : 2 }, textAlign: "center", width: "100%" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: compact ? 1.5 : 0, flexDirection: compact ? "row" : "column" }}>
          <Box
            sx={{
              width: compact ? 28 : 36,
              height: compact ? 28 : 36,
              borderRadius: compact ? 1.5 : 2,
              bgcolor: cfg.iconBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              mb: compact ? 0 : 1,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: compact ? 16 : 20, color: cfg.color }}>
              {icon}
            </span>
          </Box>
          <Box sx={{ textAlign: compact ? "left" : "center" }}>
            <Typography
              variant={compact ? "subtitle1" : "h5"}
              sx={{ fontWeight: 800, color: isDark ? "#FFFFFF" : t.colors.text.primary.light, lineHeight: 1, mb: compact ? 0 : 0.5 }}
            >
              {value}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600, fontSize: compact ? "0.6rem" : "0.65rem", textTransform: "uppercase", letterSpacing: 0.3, lineHeight: 1.2, display: "block" }}
            >
              {label}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: "none", display: "block", height: "100%" }}>
        {content}
      </Link>
    );
  }

  return content;
}

export interface ActivityItemProps {
  icon: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  timestamp: Date | string;
  action?: React.ReactNode;
}

export function ActivityItem({ icon, iconColor, title, subtitle, timestamp, action }: ActivityItemProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const past = new Date(date);
    const mins = Math.floor((now.getTime() - past.getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <Box
      sx={{
        px: 3,
        py: 1.5,
        display: "flex",
        alignItems: "center",
        gap: 2,
        "&:hover": { bgcolor: isDark ? t.colors.glass.hover : "#f8fafc" },
      }}
    >
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: 1.5,
          bgcolor: iconColor ? alpha(iconColor, 0.1) : (isDark ? t.colors.glass.hover : "#f3f4f6"),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 14, color: iconColor || "#6b7280" }}>
          {icon}
        </span>
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" fontWeight={600} sx={{ display: "block" }} noWrap>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" noWrap>
            {subtitle}
          </Typography>
        )}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
        {formatTimeAgo(timestamp)}
      </Typography>
      {action}
    </Box>
  );
}

export interface QuickActionProps {
  id: string;
  label: string;
  description: string;
  icon: string;
  href: string;
  color?: string;
  compact?: boolean;
}

export function QuickAction({ label, description, icon, href, color = "#6b7280", compact = false }: QuickActionProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      <Box
        sx={{
          p: compact ? 1 : 1.5,
          borderRadius: 1.5,
          border: "1px solid",
          borderColor: isDark ? t.colors.border.subtle : "divider",
          display: "flex",
          alignItems: "center",
          gap: compact ? 1 : 1.5,
          transition: "all 0.15s",
          "&:hover": {
            bgcolor: isDark ? t.colors.glass.hover : "#f8fafc",
            borderColor: isDark ? alpha(color, 0.4) : "#d1d5db",
          },
        }}
      >
        <Box
          sx={{
            width: compact ? 28 : 36,
            height: compact ? 28 : 36,
            borderRadius: 1,
            bgcolor: isDark ? t.colors.glass.hover : "#f3f4f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: compact ? 16 : 18, color }}>
            {icon}
          </span>
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant={compact ? "caption" : "body2"} fontWeight={600} noWrap>
            {label}
          </Typography>
          {!compact && (
            <Typography variant="caption" color="text.secondary">
              {description}
            </Typography>
          )}
        </Box>
        <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#9ca3af" }}>
          chevron_right
        </span>
      </Box>
    </Link>
  );
}

export interface TaskCardProps {
  id: string;
  name: string;
  employeeName?: string;
  departmentName?: string;
  status: string;
  dueDate?: Date | string | null;
  offboardingId: string;
  isOverdue?: boolean;
  onComplete?: () => void;
}

export function TaskCard({
  name,
  employeeName,
  departmentName,
  status,
  dueDate,
  offboardingId,
  isOverdue,
}: TaskCardProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Link href={`/app/offboardings/${offboardingId}`} style={{ textDecoration: "none", color: "inherit" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 2,
          p: 2,
          borderRadius: 2,
          border: "1px solid",
          borderColor: isOverdue ? "error.main" : (isDark ? t.colors.border.subtle : "divider"),
          bgcolor: isOverdue ? alpha("#ef4444", 0.05) : "transparent",
          transition: "all 0.2s",
          "&:hover": { bgcolor: isDark ? t.colors.glass.hover : "action.hover" },
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.5,
            bgcolor: isOverdue ? alpha("#ef4444", 0.1) : (isDark ? t.colors.glass.hover : "#f3f4f6"),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 16, color: isOverdue ? "#ef4444" : "#6b7280" }}
          >
            {status === "COMPLETED" ? "check_circle" : "pending_actions"}
          </span>
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600}>
            {name}
          </Typography>
          {employeeName && (
            <Typography variant="caption" color="text.secondary">
              {employeeName}
              {departmentName && ` • ${departmentName}`}
            </Typography>
          )}
          {dueDate && (
            <Typography
              variant="caption"
              sx={{ display: "block", color: isOverdue ? "error.main" : "text.secondary" }}
            >
              Due: {new Date(dueDate).toLocaleDateString()}
              {isOverdue && " (Overdue)"}
            </Typography>
          )}
        </Box>
        <Chip
          size="small"
          label={status.replace("_", " ")}
          sx={{
            fontWeight: 600,
            fontSize: "0.65rem",
            height: 22,
            bgcolor:
              status === "COMPLETED"
                ? alpha("#22c55e", 0.1)
                : status === "IN_PROGRESS"
                ? alpha("#f59e0b", 0.1)
                : alpha("#6b7280", 0.1),
            color:
              status === "COMPLETED" ? "#22c55e" : status === "IN_PROGRESS" ? "#f59e0b" : "#6b7280",
          }}
        />
      </Box>
    </Link>
  );
}

export interface SectionCardProps {
  title: string;
  icon?: string;
  iconColor?: string;
  badge?: number | string;
  badgeColor?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  noPadding?: boolean;
}

export function SectionCard({
  title,
  icon,
  iconColor = "#00738a",
  badge,
  badgeColor = "#00738a",
  action,
  children,
  footer,
  noPadding = false,
}: SectionCardProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        bgcolor: isDark ? t.colors.background.surfaceLight : "#1a1d1f",
        borderColor: isDark ? t.colors.border.subtle : "rgba(255, 255, 255, 0.08)",
      }}
    >
      <CardContent sx={{ p: 0 }}>
        <Box
          sx={{
            px: 3,
            py: 2,
            borderBottom: "1px solid",
            borderColor: isDark ? t.colors.border.subtle : "rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            {icon && (
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: iconColor }}>
                {icon}
              </span>
            )}
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#f8fafc" }}>
              {title}
            </Typography>
            {badge !== undefined && (
              <Chip
                label={badge}
                size="small"
                sx={{
                  fontWeight: 700,
                  bgcolor: alpha(badgeColor, 0.15),
                  color: badgeColor,
                  height: 22,
                }}
              />
            )}
          </Box>
          {action}
        </Box>
        <Box sx={noPadding ? {} : { p: 3 }}>{children}</Box>
        {footer && (
          <Box
            sx={{
              px: 3,
              py: 2,
              borderTop: "1px solid",
              borderColor: isDark ? t.colors.border.subtle : "rgba(255, 255, 255, 0.08)",
            }}
          >
            {footer}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export interface OffboardingRowProps {
  id: string;
  employeeFirstName: string;
  employeeLastName: string;
  departmentName?: string;
  status: string;
  riskLevel?: string;
  riskScore?: number;
  progress: number;
  overdueTasks?: number;
  showActions?: boolean;
  isOwnerOrAdmin?: boolean;
  isEscalated?: boolean;
  isLockedDown?: boolean;
}

export function OffboardingRow({
  id,
  employeeFirstName,
  employeeLastName,
  departmentName,
  status,
  riskLevel,
  riskScore,
  progress,
  overdueTasks = 0,
  showActions = true,
  isOwnerOrAdmin = false,
  isEscalated,
  isLockedDown,
}: OffboardingRowProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const riskLevelConfig: Record<string, { color: string; bg: string }> = {
    NORMAL: { color: "#6b7280", bg: "#6b728015" },
    HIGH: { color: "#f97316", bg: "#f9731615" },
    CRITICAL: { color: "#ef4444", bg: "#ef444415" },
  };

  const risk = riskLevelConfig[riskLevel || "NORMAL"];
  const initials = `${employeeFirstName.charAt(0)}${employeeLastName.charAt(0)}`;

  return (
    <Box
      sx={{
        px: 3,
        py: 2,
        borderBottom: "1px solid",
        borderColor: isDark ? t.colors.border.subtle : "divider",
        display: "flex",
        alignItems: "center",
        gap: 2,
        "&:hover": { bgcolor: isDark ? t.colors.glass.hover : "action.hover" },
        "&:last-child": { borderBottom: "none" },
      }}
    >
      <Avatar sx={{ width: 40, height: 40, bgcolor: risk.bg, color: risk.color, fontWeight: 700, fontSize: "0.875rem" }}>
        {initials}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.25 }}>
          <Typography variant="body2" fontWeight={700} noWrap>
            {employeeFirstName} {employeeLastName}
          </Typography>
          {riskScore && riskScore >= 40 && (
            <Box sx={{ px: 0.75, py: 0.25, borderRadius: 1, bgcolor: risk.bg }}>
              <Typography variant="caption" fontWeight={700} color={risk.color}>
                {riskScore}
              </Typography>
            </Box>
          )}
        </Box>
        <Typography variant="caption" color="text.secondary" noWrap>
          {departmentName || "No department"}
        </Typography>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Chip
          label={status.replace("_", " ")}
          size="small"
          sx={{
            fontWeight: 600,
            fontSize: "0.65rem",
            height: 22,
            bgcolor: status === "IN_PROGRESS" ? "#f59e0b15" : "#00738a15",
            color: status === "IN_PROGRESS" ? "#f59e0b" : "#00738a",
          }}
        />
        {overdueTasks > 0 && (
          <Chip
            icon={<span className="material-symbols-outlined" style={{ fontSize: 14 }}>schedule</span>}
            label={`${overdueTasks} overdue`}
            size="small"
            sx={{ fontWeight: 600, fontSize: "0.65rem", height: 22, bgcolor: "#ef444415", color: "#ef4444" }}
          />
        )}
      </Box>
      <Box sx={{ width: 80, textAlign: "right" }}>
        <Typography variant="caption" color="text.secondary">
          {progress}%
        </Typography>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 4,
            borderRadius: 2,
            bgcolor: isDark ? t.colors.glass.hover : "#e5e7eb",
            "& .MuiLinearProgress-bar": { bgcolor: progress === 100 ? "#10b981" : "#00738a" },
          }}
        />
      </Box>
      {showActions && (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Link href={`/app/offboardings/${id}`} style={{ textDecoration: "none" }}>
            <Tooltip title="View Details">
              <IconButton size="small">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>visibility</span>
              </IconButton>
            </Tooltip>
          </Link>
          {isOwnerOrAdmin && riskScore && riskScore >= 40 && !isEscalated && (
            <Link href={`/app/risk-radar/${id}`} style={{ textDecoration: "none" }}>
              <Tooltip title="Escalate">
                <IconButton size="small" sx={{ color: "#f97316" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>priority_high</span>
                </IconButton>
              </Tooltip>
            </Link>
          )}
          {isOwnerOrAdmin && !isLockedDown && (
            <Link href={`/app/offboardings/${id}`} style={{ textDecoration: "none" }}>
              <Tooltip title="Start Lockdown">
                <IconButton size="small" sx={{ color: "#ef4444" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>lock</span>
                </IconButton>
              </Tooltip>
            </Link>
          )}
        </Box>
      )}
    </Box>
  );
}

export interface EmptyStateProps {
  icon: string;
  iconColor?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function DashboardEmptyState({ icon, iconColor = "#10b981", title, description, action }: EmptyStateProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box sx={{ py: 4, textAlign: "center" }}>
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: 2,
          bgcolor: alpha(iconColor, 0.15),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mx: "auto",
          mb: 2,
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 28, color: iconColor }}>
          {icon}
        </span>
      </Box>
      <Typography variant="body1" fontWeight={700} sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: action ? 2 : 0 }}>
          {description}
        </Typography>
      )}
      {action}
    </Box>
  );
}

export interface TimelineStepProps {
  label: string;
  description: string;
  status: "completed" | "current" | "pending";
  date?: string;
}

export function TimelineStep({ label, description, status, date }: TimelineStepProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const statusConfig = {
    completed: { color: "#22c55e", icon: "check_circle", bg: alpha("#22c55e", 0.1) },
    current: { color: "#3b82f6", icon: "radio_button_checked", bg: alpha("#3b82f6", 0.1) },
    pending: { color: "#9ca3af", icon: "radio_button_unchecked", bg: alpha("#9ca3af", 0.1) },
  };

  const cfg = statusConfig[status];

  return (
    <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          bgcolor: cfg.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: cfg.color }}>
          {cfg.icon}
        </span>
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" fontWeight={600} sx={{ color: status === "pending" ? "text.secondary" : "text.primary" }}>
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {description}
        </Typography>
        {date && (
          <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: cfg.color }}>
            {date}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export function DashboardSkeleton({ rows = 5 }: { rows?: number }) {
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

export interface LiveSignalProps {
  hasSignals: boolean;
  signals: Array<{
    id: string;
    eventType: string;
    description: string;
  }>;
}

export function LiveSignalsPanel({ hasSignals, signals }: LiveSignalProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        borderColor: hasSignals ? "#ef444440" : (isDark ? t.colors.border.subtle : "divider"),
        bgcolor: isDark ? t.colors.background.surfaceLight : t.colors.background.lightPaper,
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 20, color: hasSignals ? "#ef4444" : "#10b981" }}
            >
              sensors
            </span>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Live Signals
            </Typography>
          </Box>
          {hasSignals && (
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: "#ef4444",
                animation: "pulse 2s infinite",
                "@keyframes pulse": { "0%, 100%": { opacity: 1 }, "50%": { opacity: 0.4 } },
              }}
            />
          )}
        </Box>

        {!hasSignals ? (
          <Box sx={{ py: 3, textAlign: "center" }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                bgcolor: "#10b98115",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 1.5,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 24, color: "#10b981" }}>
                check_circle
              </span>
            </Box>
            <Typography variant="body2" fontWeight={600} color="text.secondary">
              All Clear
            </Typography>
            <Typography variant="caption" color="text.secondary">
              No active signals
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {signals.slice(0, 5).map((event) => (
              <Box
                key={event.id}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: "#ef444410",
                  border: "1px solid",
                  borderColor: "#ef444430",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#ef4444" }}>
                    warning
                  </span>
                  <Typography variant="caption" fontWeight={600}>
                    {event.eventType.replace(/_/g, " ")}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }} noWrap>
                  {event.description}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export interface SecurityScoreProps {
  score: number;
  stats: {
    completed: number;
    evidencePacks: { sealed: number; total: number };
    auditEvents: number;
  };
}

export function SecurityConfidenceCard({ score, stats }: SecurityScoreProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const color = score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  const label = score >= 90 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Needs Improvement" : "At Risk";

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        bgcolor: isDark ? t.colors.background.surfaceLight : t.colors.background.lightPaper,
        borderColor: isDark ? t.colors.border.subtle : t.colors.border.light,
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20, color }}>
            verified
          </span>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Security Confidence
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 3, mb: 2 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              bgcolor: alpha(color, 0.15),
              border: `3px solid ${color}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography variant="h5" fontWeight={900} color={color}>
              {score}
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight={600}>
              {label}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Based on current operations
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, pt: 1.5, borderTop: "1px solid", borderColor: isDark ? t.colors.border.subtle : "divider" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="caption" color="text.secondary">
              Completed
            </Typography>
            <Typography variant="caption" fontWeight={600}>
              {stats.completed}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="caption" color="text.secondary">
              Evidence Packs
            </Typography>
            <Typography variant="caption" fontWeight={600}>
              {stats.evidencePacks.sealed}/{stats.evidencePacks.total}
            </Typography>
          </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="caption" color="text.secondary">
                Audit Events
              </Typography>
              <Typography variant="caption" fontWeight={600}>
                {stats.auditEvents.toLocaleString()}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }

export interface SetupStatusItem {
  label: string;
  status: "complete" | "required" | "recommended" | "optional";
  href: string;
  description: string;
}

export interface SetupStatusCardProps {
  items: SetupStatusItem[];
}

export function SetupStatusCard({ items }: SetupStatusCardProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const statusConfig = {
    complete: { color: "#10b981", icon: "check_circle", label: "Complete" },
    required: { color: "#ef4444", icon: "error", label: "Required" },
    recommended: { color: "#f59e0b", icon: "info", label: "Recommended" },
    optional: { color: "#6b7280", icon: "radio_button_unchecked", label: "Optional" },
  };

  const completedCount = items.filter(i => i.status === "complete").length;
  const requiredItems = items.filter(i => i.status === "required");

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        bgcolor: isDark ? t.colors.background.surfaceLight : "#fafafa",
        borderColor: isDark ? t.colors.border.subtle : "#e5e7eb",
      }}
    >
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#6b7280" }}>
              checklist
            </span>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Platform Readiness
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {completedCount}/{items.length}
          </Typography>
        </Box>

        {requiredItems.length > 0 && (
          <Box sx={{ mb: 1.5, p: 1, borderRadius: 1, bgcolor: alpha("#ef4444", 0.08), border: `1px solid ${alpha("#ef4444", 0.2)}` }}>
            <Typography variant="caption" sx={{ color: "#ef4444", fontWeight: 600 }}>
              {requiredItems.length} required item{requiredItems.length > 1 ? "s" : ""} need attention
            </Typography>
          </Box>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          {items.map((item) => {
            const cfg = statusConfig[item.status];
            return (
              <Link key={item.label} href={item.href} style={{ textDecoration: "none", color: "inherit" }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    p: 1,
                    borderRadius: 1,
                    "&:hover": { bgcolor: isDark ? t.colors.glass.hover : "#f3f4f6" },
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: cfg.color }}>
                    {cfg.icon}
                  </span>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" fontWeight={600} sx={{ display: "block" }}>
                      {item.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
                      {item.description}
                    </Typography>
                  </Box>
                  <Chip
                    label={cfg.label}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: "0.6rem",
                      fontWeight: 600,
                      bgcolor: alpha(cfg.color, 0.1),
                      color: cfg.color,
                    }}
                  />
                </Box>
              </Link>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
}
