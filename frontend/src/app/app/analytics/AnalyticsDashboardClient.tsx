"use client";

import React from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  LinearProgress,
  alpha,
  Tooltip as MuiTooltip,
  IconButton,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Link from "next/link";
import { EnhancedAnalyticsData } from "@/lib/types";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

interface AnalyticsDashboardClientProps {
  analytics: EnhancedAnalyticsData;
}

function TrendArrow({ value, inverted = false }: { value: number; inverted?: boolean }) {
  const isPositive = inverted ? value < 0 : value > 0;
  const isNeutral = Math.abs(value) < 5;
  
  if (isNeutral) {
    return (
      <Box component="span" sx={{ color: "text.secondary", display: "inline-flex", alignItems: "center", ml: 0.5 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>trending_flat</span>
      </Box>
    );
  }
  
  return (
    <Box 
      component="span" 
      sx={{ 
        color: isPositive ? "success.main" : "error.main", 
        display: "inline-flex", 
        alignItems: "center",
        ml: 0.5,
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
        {isPositive ? "trending_up" : "trending_down"}
      </span>
    </Box>
  );
}

function InsightCard({ 
  icon, 
  title, 
  value, 
  trend,
  trendLabel,
  subtitle,
  color = "primary",
  inverted = false,
}: {
  icon: string;
  title: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  subtitle?: string;
  color?: "primary" | "success" | "warning" | "error" | "info";
  inverted?: boolean;
}) {
  const theme = useTheme();
  const colorMap = {
    primary: theme.palette.primary.main,
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
    info: theme.palette.info.main,
  };
  
  return (
    <Card 
      variant="outlined" 
      sx={{ 
        borderRadius: 3, 
        height: "100%",
        borderColor: alpha(colorMap[color], 0.2),
        background: alpha(colorMap[color], 0.02),
        transition: "all 0.2s",
        "&:hover": {
          borderColor: alpha(colorMap[color], 0.4),
          background: alpha(colorMap[color], 0.05),
        },
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: alpha(colorMap[color], 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span className="material-symbols-outlined" style={{ color: colorMap[color], fontSize: 20 }}>
              {icon}
            </span>
          </Box>
          {trend !== undefined && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <TrendArrow value={trend} inverted={inverted} />
              {trendLabel && (
                <Typography variant="caption" color="text.secondary">
                  {trendLabel}
                </Typography>
              )}
            </Box>
          )}
        </Box>
        
        <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>
          {value}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          {title}
        </Typography>
        
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyChart({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  const theme = useTheme();
  return (
    <Box sx={{ 
      height: "100%",
      minHeight: 200,
      display: "flex", 
      flexDirection: "column",
      alignItems: "center", 
      justifyContent: "center",
      bgcolor: alpha(theme.palette.divider, 0.05),
      borderRadius: 2,
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: 40, color: theme.palette.text.secondary, opacity: 0.4 }}>
        {icon}
      </span>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {title}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {subtitle}
      </Typography>
    </Box>
  );
}

export default function AnalyticsDashboardClient({ analytics }: AnalyticsDashboardClientProps) {
  const theme = useTheme();
  const { 
    summary, 
    byStatus, 
    byRisk, 
    weeklyTrend, 
    insights, 
    recentOffboardings, 
    categoryPerformance, 
    departmentAnalysis, 
    avgApprovalDelay,
    completionTimeDistribution,
    assetImpact,
  } = analytics;

  const statusChipColors: Record<string, "warning" | "info" | "secondary" | "success" | "default"> = {
    PENDING: "warning",
    IN_PROGRESS: "info",
    PENDING_APPROVAL: "secondary",
    COMPLETED: "success",
    CANCELLED: "default",
  };

  const statusProgressColors: Record<string, "warning" | "info" | "secondary" | "success" | "inherit"> = {
    PENDING: "warning",
    IN_PROGRESS: "info",
    PENDING_APPROVAL: "secondary",
    COMPLETED: "success",
    CANCELLED: "inherit",
  };

  const statusLabels: Record<string, string> = {
    PENDING: "Pending",
    IN_PROGRESS: "In Progress",
    PENDING_APPROVAL: "Awaiting Approval",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  };

  const riskColors: Record<string, "default" | "warning" | "error"> = {
    NORMAL: "default",
    HIGH: "warning",
    CRITICAL: "error",
  };

  const totalByRisk = Object.values(byRisk).reduce((a, b) => a + b, 0) || 1;

  const riskChartData = [
    { name: "Normal", value: byRisk.NORMAL || 0, color: theme.palette.success.main },
    { name: "High", value: byRisk.HIGH || 0, color: theme.palette.warning.main },
    { name: "Critical", value: byRisk.CRITICAL || 0, color: theme.palette.error.main },
  ].filter(d => d.value > 0);

  const hasRiskData = riskChartData.length > 0;
  const hasActivityData = weeklyTrend.some(w => w.completed > 0 || w.started > 0 || w.highRisk > 0);
  const hasCompletionData = completionTimeDistribution.some(d => d.count > 0);
  const hasAssetData = assetImpact.totalWithAssets > 0;

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800}>Analytics</Typography>
        <Typography color="text.secondary">
          Offboarding performance and operational health
        </Typography>
        </Box>

        {insights.length > 0 && (
          <Card 
            variant="outlined" 
            sx={{ 
              mb: 4, 
              borderRadius: 3,
              borderColor: alpha(theme.palette.divider, 0.5),
            }}
          >
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      Key Insights
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Rule-based analysis explaining your metrics
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <MuiTooltip title="Insights are currently generated via heuristic security rules and organizational baseline thresholds.">
                      <Chip 
                        label="Rule-Based"
                        size="small"
                        sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), color: theme.palette.info.main, fontWeight: 700, fontSize: "0.65rem" }}
                      />
                    </MuiTooltip>
                    <Chip 
                      label={`${insights.length} insight${insights.length > 1 ? "s" : ""}`}
                      size="small"
                      sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}
                    />
                  </Box>
                </Box>
              
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {insights.slice(0, 5).map((insight, i) => {
                  const categoryIcons: Record<string, string> = {
                    performance: "speed",
                    risk: "shield",
                    assets: "inventory_2",
                    process: "account_tree",
                    department: "corporate_fare",
                    trend: "trending_up",
                  };
                  const categoryLabels: Record<string, string> = {
                    performance: "Performance",
                    risk: "Risk",
                    assets: "Assets",
                    process: "Process",
                    department: "Department",
                    trend: "Trend",
                  };
                  return (
                    <Box 
                      key={i}
                      sx={{ 
                        p: 2,
                        borderRadius: 2,
                        bgcolor: insight.type === "negative" 
                          ? alpha(theme.palette.error.main, 0.04)
                          : insight.type === "positive"
                          ? alpha(theme.palette.success.main, 0.04)
                          : alpha(theme.palette.info.main, 0.04),
                        border: `1px solid ${
                          insight.type === "negative" 
                            ? alpha(theme.palette.error.main, 0.15)
                            : insight.type === "positive"
                            ? alpha(theme.palette.success.main, 0.15)
                            : alpha(theme.palette.info.main, 0.15)
                        }`,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 1.5,
                            bgcolor: insight.type === "negative" 
                              ? alpha(theme.palette.error.main, 0.1)
                              : insight.type === "positive"
                              ? alpha(theme.palette.success.main, 0.1)
                              : alpha(theme.palette.info.main, 0.1),
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <span 
                            className="material-symbols-outlined" 
                            style={{ 
                              fontSize: 18,
                              color: insight.type === "negative" 
                                ? theme.palette.error.main
                                : insight.type === "positive"
                                ? theme.palette.success.main
                                : theme.palette.info.main,
                            }}
                          >
                            {categoryIcons[insight.category] || "info"}
                          </span>
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5, flexWrap: "wrap" }}>
                            <Typography variant="body2" fontWeight={700}>
                              {insight.message}
                            </Typography>
                            <Chip 
                              label={categoryLabels[insight.category] || insight.category}
                              size="small"
                              sx={{ 
                                height: 20,
                                fontSize: 10,
                                fontWeight: 600,
                                bgcolor: alpha(theme.palette.text.primary, 0.06),
                              }}
                            />
                          </Box>
                          {insight.metric && (
                            <Typography variant="caption" fontWeight={600} sx={{ 
                              color: insight.type === "negative" 
                                ? theme.palette.error.main
                                : insight.type === "positive"
                                ? theme.palette.success.main
                                : theme.palette.info.main,
                              display: "block",
                              mb: 0.5,
                            }}>
                              {insight.metric}
                            </Typography>
                          )}
                          {insight.explanation && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.5 }}>
                              {insight.explanation}
                            </Typography>
                          )}
                        </Box>
                        {insight.type === "negative" && (
                          <span 
                            className="material-symbols-outlined" 
                            style={{ 
                              fontSize: 18,
                              color: theme.palette.error.main,
                              opacity: 0.7,
                            }}
                          >
                            priority_high
                          </span>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
              
              {insights.length === 0 && (
                <Box sx={{ 
                  textAlign: "center", 
                  py: 4,
                  bgcolor: alpha(theme.palette.divider, 0.05),
                  borderRadius: 2,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 32, color: theme.palette.text.secondary, opacity: 0.4 }}>
                    lightbulb
                  </span>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Insights will appear as more data is collected
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <InsightCard
            icon="schedule"
            title="Avg Completion Time"
            value={`${summary.averageCompletionDays} days`}
            trend={summary.avgCompletionTrend}
            trendLabel={summary.avgCompletionTrend !== 0 ? `${Math.abs(Math.round(summary.avgCompletionTrend))}% vs last month` : undefined}
            color={summary.avgCompletionTrend > 0 ? "success" : summary.avgCompletionTrend < -10 ? "error" : "primary"}
            inverted={true}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <InsightCard
            icon="check_circle"
            title="Completed This Month"
            value={summary.completedThisMonth}
            trend={summary.completionTrend}
            trendLabel={summary.completedLastMonth > 0 ? `vs ${summary.completedLastMonth} last month` : undefined}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <InsightCard
            icon="pending_actions"
            title="Active Offboardings"
            value={summary.activeOffboardings}
            subtitle={`${summary.totalOffboardings} total all-time`}
            color="info"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <InsightCard
            icon="warning"
            title="High Risk Cases"
            value={summary.highRiskCount + summary.criticalRiskCount}
            subtitle={summary.criticalRiskCount > 0 ? `${summary.criticalRiskCount} critical` : undefined}
            color={summary.criticalRiskCount > 0 ? "error" : summary.highRiskCount > 0 ? "warning" : "success"}
          />
        </Grid>
      </Grid>

      <Card variant="outlined" sx={{ borderRadius: 3, mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>
              Offboardings Over Time
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Weekly activity showing completed, started, and high-risk offboardings
            </Typography>
          </Box>
          
          {hasActivityData ? (
            <Box sx={{ height: 280, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.palette.success.main} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={theme.palette.success.main} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorStarted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorHighRisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.palette.error.main} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={theme.palette.error.main} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                  <XAxis 
                    dataKey="week" 
                    tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                    axisLine={{ stroke: theme.palette.divider }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                    axisLine={{ stroke: theme.palette.divider }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 8,
                      boxShadow: theme.shadows[3],
                    }}
                    labelStyle={{ color: theme.palette.text.primary, fontWeight: 600 }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: 16 }}
                    formatter={(value) => <span style={{ color: theme.palette.text.secondary, fontSize: 12 }}>{value}</span>}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="completed" 
                    name="Completed"
                    stroke={theme.palette.success.main} 
                    fillOpacity={1} 
                    fill="url(#colorCompleted)" 
                    strokeWidth={2}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="started" 
                    name="Started"
                    stroke={theme.palette.primary.main} 
                    fillOpacity={1} 
                    fill="url(#colorStarted)" 
                    strokeWidth={2}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="highRisk" 
                    name="High Risk"
                    stroke={theme.palette.error.main} 
                    fillOpacity={1} 
                    fill="url(#colorHighRisk)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          ) : (
            <EmptyChart 
              icon="show_chart" 
              title="No activity data yet"
              subtitle="Chart will populate as offboardings are created"
            />
          )}
        </CardContent>
      </Card>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
                Risk Distribution
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Security risk levels across all cases
              </Typography>
              
              {hasRiskData ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <Box sx={{ width: 160, height: 160 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={riskChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {riskChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: theme.palette.background.paper,
                              border: `1px solid ${theme.palette.divider}`,
                              borderRadius: 8,
                            }}
                            formatter={(value) => [`${value} cases`, ""]}
                          />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    {riskChartData.map((item) => (
                      <Box key={item.name} sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: item.color }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={500}>{item.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.value} ({Math.round((item.value / totalByRisk) * 100)}%)
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              ) : (
                <EmptyChart 
                  icon="pie_chart"
                  title="No risk data available"
                  subtitle="Create offboardings to see risk distribution"
                />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
                Time-to-Completion
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                How long offboardings take to complete
              </Typography>
              
              {hasCompletionData ? (
                <Box sx={{ height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={completionTimeDistribution} layout="vertical" margin={{ left: 10, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} horizontal={false} />
                      <XAxis 
                        type="number" 
                        tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                        axisLine={{ stroke: theme.palette.divider }}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="bucket" 
                        tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={70}
                      />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 8,
                          }}
                          formatter={(value) => [`${value} offboardings`, "Count"]}
                        />
                      <Bar 
                        dataKey="count" 
                        fill={theme.palette.primary.main} 
                        radius={[0, 4, 4, 0]}
                        barSize={24}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <EmptyChart 
                  icon="bar_chart"
                  title="No completion data yet"
                  subtitle="Complete offboardings to see timing distribution"
                />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
                Asset Impact Analysis
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                How asset recovery affects offboarding completion
              </Typography>
              
              {hasAssetData ? (
                <Box>
                  <Box sx={{ display: "flex", gap: 3, mb: 3 }}>
                    <Box sx={{ flex: 1, textAlign: "center", p: 2, bgcolor: alpha(theme.palette.warning.main, 0.05), borderRadius: 2 }}>
                      <Typography variant="h4" fontWeight={700} color="warning.main">
                        {assetImpact.blockedByAssets}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Blocked by Assets
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, textAlign: "center", p: 2, bgcolor: alpha(theme.palette.success.main, 0.05), borderRadius: 2 }}>
                      <Typography variant="h4" fontWeight={700} color="success.main">
                        {Math.round(assetImpact.assetReturnRate)}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Return Rate
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.05), borderRadius: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: theme.palette.info.main }}>
                        info
                      </span>
                      <Typography variant="body2">
                        {assetImpact.totalWithAssets} offboarding{assetImpact.totalWithAssets !== 1 ? "s" : ""} involve asset returns
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ) : (
                <EmptyChart 
                  icon="inventory_2"
                  title="No asset data available"
                  subtitle="Asset tracking will appear as returns are recorded"
                />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
                Status Distribution
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Current offboarding pipeline
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {Object.entries(byStatus)
                  .filter(([_, count]) => count > 0)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => {
                    const total = Object.values(byStatus).reduce((a, b) => a + b, 0) || 1;
                    return (
                      <Box key={status}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                          <Typography variant="body2" fontWeight={500}>
                            {statusLabels[status] || status}
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {count} <Typography component="span" variant="caption" color="text.secondary">({Math.round((count / total) * 100)}%)</Typography>
                          </Typography>
                        </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(count / total) * 100}
                        sx={{ height: 8, borderRadius: 4, bgcolor: alpha(theme.palette.divider, 0.3) }}
                        color={statusProgressColors[status]}
                        />
                      </Box>
                    );
                  })}
                {Object.values(byStatus).every(v => v === 0) && (
                  <Typography color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
                    No offboardings yet
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        </Grid>

        <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
            Recent Offboardings
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Latest cases with progress and duration
          </Typography>
          {recentOffboardings.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: theme.palette.text.secondary, opacity: 0.5 }}>
                group_remove
              </span>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                No offboardings yet
              </Typography>
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow sx={{ "& th": { fontWeight: 700, color: "text.secondary", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 } }}>
                  <TableCell>Employee</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Risk</TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentOffboardings.map((o) => {
                  const progress = o.totalTasks > 0 ? (o.completedTasks / o.totalTasks) * 100 : 0;
                  return (
                    <TableRow key={o.id} hover sx={{ "&:last-child td": { borderBottom: 0 } }}>
                      <TableCell>
                        <Typography fontWeight={600} variant="body2">
                          {o.employee.firstName} {o.employee.lastName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {o.employee.department?.name || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                      <Chip 
                        label={statusLabels[o.status] || o.status} 
                        size="small" 
                        color={statusChipColors[o.status]}
                          sx={{ fontWeight: 500, fontSize: 11 }}
                        />
                      </TableCell>
                      <TableCell>
                        {o.riskLevel && o.riskLevel !== "NORMAL" ? (
                          <Chip 
                            label={o.riskLevel} 
                            size="small" 
                            color={riskColors[o.riskLevel] || "default"}
                            icon={<span className="material-symbols-outlined" style={{ fontSize: 14 }}>warning</span>}
                            sx={{ fontWeight: 500, fontSize: 11 }}
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">Normal</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ minWidth: 120 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={progress} 
                            sx={{ flex: 1, height: 6, borderRadius: 3 }}
                            color={o.status === "COMPLETED" ? "success" : "primary"}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 35 }}>
                            {Math.round(progress)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {o.duration} days
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Link href={`/app/offboardings/${o.id}`} style={{ textDecoration: "none" }}>
                          <IconButton size="small">
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                          </IconButton>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
