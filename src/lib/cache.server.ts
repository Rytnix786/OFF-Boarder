import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma.server";
import { createClient } from "@/lib/supabase/server";

const CACHE_TTL = {
  notifications: 30 * 1000,
  analytics: 60 * 1000,
  offboardingList: 30 * 1000,
};

const memoryCache = new Map<string, { data: unknown; expiresAt: number }>();

function getCached<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T, ttl: number): T {
  memoryCache.set(key, { data, expiresAt: Date.now() + ttl });
  return data;
}

export function invalidateCache(pattern: string) {
  for (const key of memoryCache.keys()) {
    if (key.includes(pattern)) {
      memoryCache.delete(key);
    }
  }
}

export function invalidateOrgCache(orgId: string) {
  invalidateCache(`org:${orgId}`);
}

export function invalidateUserCache(userId: string) {
  invalidateCache(`user:${userId}`);
}

export const getNotificationsWithCount = cache(async (userId: string, orgId?: string) => {
  const cacheKey = `user:${userId}:org:${orgId || "all"}:notifications`;
  const cached = getCached<{ notifications: unknown[]; unreadCount: number }>(cacheKey);
  if (cached) return cached;

  const supabase = await createClient();

  let query = supabase
    .from("Notification")
    .select("id, type, title, message, link, read, createdAt")
    .eq("userId", userId);
  
  if (orgId) {
    query = query.eq("organizationId", orgId);
  }

  let countQuery = supabase
    .from("Notification")
    .select("id", { count: "exact", head: true })
    .eq("userId", userId)
    .eq("read", false);

  if (orgId) {
    countQuery = countQuery.eq("organizationId", orgId);
  }

  const [notificationsResult, countResult] = await Promise.all([
    query.order("createdAt", { ascending: false }).limit(20),
    countQuery,
  ]);

  const notifications = notificationsResult.data || [];
  const unreadCount = countResult.count || 0;

  return setCache(cacheKey, { notifications, unreadCount }, CACHE_TTL.notifications);
});

export const getAnalyticsSnapshot = cache(async (orgId: string) => {
  const cacheKey = `org:${orgId}:analytics`;
  const cached = getCached<unknown>(cacheKey);
  if (cached) return cached;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let snapshot = await prisma.analyticsSnapshot.findFirst({
    where: {
      organizationId: orgId,
      snapshotDate: today,
    },
  });

  if (!snapshot) {
    snapshot = await refreshAnalyticsSnapshot(orgId);
  }

  const recentOffboardings = await prisma.offboarding.findMany({
    where: { organizationId: orgId },
    select: {
      id: true,
      status: true,
      riskLevel: true,
      createdAt: true,
      employee: {
        select: { firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const result = {
    summary: {
      totalOffboardings: snapshot.totalOffboardings,
      activeOffboardings: snapshot.activeOffboardings,
      completedThisMonth: snapshot.completedThisMonth,
      highRiskCount: snapshot.highRiskCount + snapshot.criticalRiskCount,
      averageCompletionDays: snapshot.averageCompletionDays,
      overdueTasks: snapshot.overdueTasks,
    },
    byStatus: {
      PENDING: snapshot.pendingOffboardings,
      IN_PROGRESS: snapshot.inProgressOffboardings,
      PENDING_APPROVAL: snapshot.pendingApprovalOffboardings,
      COMPLETED: snapshot.completedOffboardings,
      CANCELLED: snapshot.cancelledOffboardings,
    },
    byRisk: {
      NORMAL: snapshot.normalRiskCount,
      HIGH: snapshot.highRiskCount,
      CRITICAL: snapshot.criticalRiskCount,
    },
    recentOffboardings,
    monthlyTrend: snapshot.monthlyTrend || [],
  };

  return setCache(cacheKey, result, CACHE_TTL.analytics);
});

import { EnhancedAnalyticsData } from "./types";

export const getEnhancedAnalytics = cache(async (orgId: string): Promise<EnhancedAnalyticsData> => {
  const cacheKey = `org:${orgId}:enhanced-analytics`;
  const cached = getCached<EnhancedAnalyticsData>(cacheKey);
  if (cached) return cached;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const [
    statusCounts,
    riskCounts,
    completedThisMonth,
    completedLastMonth,
    overdueTasks,
    allOffboardings,
    tasksByCategory,
    assetReturns,
    departmentStats,
    approvalDelays,
  ] = await Promise.all([
    prisma.offboarding.groupBy({
      by: ["status"],
      where: { organizationId: orgId },
      _count: { id: true },
    }),
    prisma.offboarding.groupBy({
      by: ["riskLevel"],
      where: { organizationId: orgId },
      _count: { id: true },
    }),
    prisma.offboarding.count({
      where: {
        organizationId: orgId,
        status: "COMPLETED",
        completedDate: { gte: thirtyDaysAgo },
      },
    }),
    prisma.offboarding.count({
      where: {
        organizationId: orgId,
        status: "COMPLETED",
        completedDate: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      },
    }),
    prisma.offboardingTask.count({
      where: {
        offboarding: { organizationId: orgId },
        status: "PENDING",
        dueDate: { lt: new Date() },
      },
    }),
    prisma.offboarding.findMany({
      where: {
        organizationId: orgId,
        createdAt: { gte: ninetyDaysAgo },
      },
      select: {
        id: true,
        status: true,
        riskLevel: true,
        createdAt: true,
        completedDate: true,
        scheduledDate: true,
        employee: {
          select: {
            firstName: true,
            lastName: true,
            department: { select: { id: true, name: true } },
          },
        },
        tasks: {
          select: {
            id: true,
            name: true,
            category: true,
            status: true,
            dueDate: true,
            completedAt: true,
            createdAt: true,
          },
        },
        assetReturns: {
          select: { id: true, status: true },
        },
        approvals: {
          select: { id: true, status: true, createdAt: true, approvedAt: true },
        },
      },
    }),
    prisma.offboardingTask.groupBy({
      by: ["category", "status"],
      where: {
        offboarding: { organizationId: orgId },
        category: { not: null },
      },
      _count: { id: true },
    }),
    prisma.assetReturn.groupBy({
      by: ["status"],
      where: {
        offboarding: { organizationId: orgId },
      },
      _count: { id: true },
    }),
    prisma.offboarding.findMany({
      where: {
        organizationId: orgId,
        status: "COMPLETED",
        completedDate: { not: null },
        employee: { departmentId: { not: null } },
      },
      select: {
        createdAt: true,
        completedDate: true,
        employee: {
          select: {
            department: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.approval.findMany({
      where: {
        offboarding: { organizationId: orgId },
        status: "APPROVED",
        approvedAt: { not: null },
      },
      select: {
        createdAt: true,
        approvedAt: true,
      },
    }),
  ]);

  const statusMap = Object.fromEntries(statusCounts.map(s => [s.status, s._count.id]));
  const riskMap = Object.fromEntries(riskCounts.map(r => [r.riskLevel, r._count.id]));

  const completedOffboardingsForAvg = allOffboardings.filter(
    o => o.status === "COMPLETED" && o.completedDate
  );
  const avgCompletionDays = completedOffboardingsForAvg.length > 0
    ? completedOffboardingsForAvg.reduce((sum, o) => {
        const days = (o.completedDate!.getTime() - o.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0) / completedOffboardingsForAvg.length
    : 0;

  const lastMonthCompleted = allOffboardings.filter(
    o => o.status === "COMPLETED" && o.completedDate && o.completedDate >= sixtyDaysAgo && o.completedDate < thirtyDaysAgo
  );
  const lastMonthAvgDays = lastMonthCompleted.length > 0
    ? lastMonthCompleted.reduce((sum, o) => {
        const days = (o.completedDate!.getTime() - o.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0) / lastMonthCompleted.length
    : avgCompletionDays;

  const avgCompletionTrend = lastMonthAvgDays > 0 
    ? ((lastMonthAvgDays - avgCompletionDays) / lastMonthAvgDays) * 100
    : 0;

  const trendData: { date: string; completed: number; delayed: number; highRisk: number }[] = [];
  for (let i = 89; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    
    const dayOffboardings = allOffboardings.filter(o => {
      const created = o.createdAt.toISOString().split("T")[0];
      return created === dateStr;
    });

    trendData.push({
      date: dateStr,
      completed: dayOffboardings.filter(o => o.status === "COMPLETED").length,
      delayed: dayOffboardings.filter(o => 
        o.scheduledDate && new Date() > o.scheduledDate && o.status !== "COMPLETED"
      ).length,
      highRisk: dayOffboardings.filter(o => 
        o.riskLevel === "HIGH" || o.riskLevel === "CRITICAL"
      ).length,
    });
  }

  const weeklyTrend: { week: string; completed: number; started: number; highRisk: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (i * 7 + 6));
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() - (i * 7));
    
    const weekLabel = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    
    const weekOffboardings = allOffboardings.filter(o => {
      return o.createdAt >= weekStart && o.createdAt <= weekEnd;
    });
    const completedInWeek = allOffboardings.filter(o => {
      return o.completedDate && o.completedDate >= weekStart && o.completedDate <= weekEnd;
    });

    weeklyTrend.push({
      week: weekLabel,
      started: weekOffboardings.length,
      completed: completedInWeek.length,
      highRisk: weekOffboardings.filter(o => 
        o.riskLevel === "HIGH" || o.riskLevel === "CRITICAL"
      ).length,
    });
  }

  const categoryPerformance: Record<string, { total: number; completed: number; blocked: number; pending: number }> = {};
  tasksByCategory.forEach(tc => {
    const cat = tc.category || "Uncategorized";
    if (!categoryPerformance[cat]) {
      categoryPerformance[cat] = { total: 0, completed: 0, blocked: 0, pending: 0 };
    }
    categoryPerformance[cat].total += tc._count.id;
    if (tc.status === "COMPLETED") categoryPerformance[cat].completed += tc._count.id;
    if (tc.status === "BLOCKED") categoryPerformance[cat].blocked += tc._count.id;
    if (tc.status === "PENDING") categoryPerformance[cat].pending += tc._count.id;
  });

  const assetReturnStats = Object.fromEntries(assetReturns.map(ar => [ar.status, ar._count.id]));
  const pendingAssets = assetReturnStats["PENDING"] || 0;
  const totalAssets = Object.values(assetReturnStats).reduce((a, b) => a + b, 0);
  const assetBlockingRate = totalAssets > 0 ? (pendingAssets / totalAssets) * 100 : 0;

  const deptCompletionTimes: Record<string, { total: number; count: number; name: string }> = {};
  departmentStats.forEach(o => {
    if (o.employee.department && o.completedDate) {
      const deptId = o.employee.department.id;
      if (!deptCompletionTimes[deptId]) {
        deptCompletionTimes[deptId] = { total: 0, count: 0, name: o.employee.department.name };
      }
      const days = (o.completedDate.getTime() - o.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      deptCompletionTimes[deptId].total += days;
      deptCompletionTimes[deptId].count += 1;
    }
  });

  const deptAnalysis = Object.entries(deptCompletionTimes).map(([id, data]) => ({
    departmentId: id,
    departmentName: data.name,
    avgDays: data.count > 0 ? data.total / data.count : 0,
    count: data.count,
    vsAverage: avgCompletionDays > 0 ? ((data.total / data.count) / avgCompletionDays) : 1,
  })).sort((a, b) => b.avgDays - a.avgDays);

  const avgApprovalDelay = approvalDelays.length > 0
    ? approvalDelays.reduce((sum, a) => {
        const days = (a.approvedAt!.getTime() - a.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0) / approvalDelays.length
    : 0;

  type InsightType = { 
    type: "positive" | "negative" | "neutral"; 
    category: "performance" | "risk" | "assets" | "process" | "department" | "trend";
    message: string; 
    metric?: string;
    explanation?: string;
    threshold?: number;
    actualValue?: number;
  };
  const insights: InsightType[] = [];
  
  const blockedByCategory = Object.entries(categoryPerformance)
    .filter(([_, data]) => data.blocked > 0)
    .sort((a, b) => b[1].blocked - a[1].blocked);
  
  if (blockedByCategory.length > 0) {
    const topBlocker = blockedByCategory[0];
    const blockedPct = topBlocker[1].total > 0 
      ? Math.round((topBlocker[1].blocked / topBlocker[1].total) * 100) 
      : 0;
    insights.push({
      type: "negative",
      category: "process",
      message: `${topBlocker[0]} tasks are the #1 cause of offboarding delays`,
      metric: `${topBlocker[1].blocked} blocked tasks`,
      explanation: `${blockedPct}% of ${topBlocker[0].toLowerCase()} tasks are currently blocked, creating bottlenecks in the offboarding process.`,
      threshold: 20,
      actualValue: blockedPct,
    });
  }

  if (assetBlockingRate > 20) {
    insights.push({
      type: "negative",
      category: "assets",
      message: `Asset recovery is blocking ${Math.round(assetBlockingRate)}% of offboarding completions`,
      metric: `${pendingAssets} assets pending return`,
      explanation: `When assets aren't returned promptly, offboardings cannot be marked complete. This creates compliance gaps and delays final processing.`,
      threshold: 20,
      actualValue: assetBlockingRate,
    });
  } else if (pendingAssets > 0) {
    insights.push({
      type: "neutral",
      category: "assets",
      message: `${pendingAssets} asset${pendingAssets > 1 ? "s" : ""} pending return`,
      explanation: `Asset recovery is within acceptable thresholds but should be monitored.`,
    });
  }

  const slowestDept = deptAnalysis[0];
  if (slowestDept && slowestDept.vsAverage > 1.3 && slowestDept.count >= 2) {
    const deviation = Math.round((slowestDept.vsAverage - 1) * 100);
    insights.push({
      type: deviation > 50 ? "negative" : "neutral",
      category: "department",
      message: `${slowestDept.departmentName} offboardings take ${slowestDept.vsAverage.toFixed(1)}× longer than org average`,
      metric: `${Math.round(slowestDept.avgDays)} days vs ${Math.round(avgCompletionDays)} days org avg`,
      explanation: `Based on ${slowestDept.count} completed offboardings. Consider reviewing ${slowestDept.departmentName}-specific workflows for optimization opportunities.`,
      threshold: 30,
      actualValue: deviation,
    });
  }

  if (avgApprovalDelay > 0.5) {
    insights.push({
      type: avgApprovalDelay > 2 ? "negative" : "neutral",
      category: "process",
      message: `Approval steps add ${avgApprovalDelay.toFixed(1)} days to completion time`,
      explanation: `Each approval workflow introduces wait time. Consider streamlining approval chains or adding auto-approval rules for low-risk cases.`,
      threshold: 1,
      actualValue: avgApprovalDelay,
    });
  }
  
  if (avgCompletionTrend > 15) {
    insights.push({
      type: "positive",
      category: "performance",
      message: `Completion time improved ${Math.abs(Math.round(avgCompletionTrend))}% vs last month`,
      metric: `Now averaging ${Math.round(avgCompletionDays)} days`,
      explanation: `Process improvements are paying off. Continue monitoring to maintain this positive trend.`,
      threshold: 15,
      actualValue: avgCompletionTrend,
    });
  } else if (avgCompletionTrend < -15) {
    insights.push({
      type: "negative",
      category: "performance",
      message: `Completion time increased ${Math.abs(Math.round(avgCompletionTrend))}% vs last month`,
      metric: `Now averaging ${Math.round(avgCompletionDays)} days`,
      explanation: `Offboardings are taking longer than before. Review recent cases to identify common blockers.`,
      threshold: 15,
      actualValue: Math.abs(avgCompletionTrend),
    });
  }

  const criticalCount = riskMap["CRITICAL"] || 0;
  const highCount = riskMap["HIGH"] || 0;
  const totalRisk = criticalCount + highCount;
  const totalActive = (statusMap["PENDING"] || 0) + (statusMap["IN_PROGRESS"] || 0) + (statusMap["PENDING_APPROVAL"] || 0);
  const riskRatio = totalActive > 0 ? (totalRisk / totalActive) * 100 : 0;
  
  if (criticalCount > 0) {
    insights.push({
      type: "negative",
      category: "risk",
      message: `${criticalCount} critical-risk offboarding${criticalCount > 1 ? "s" : ""} require immediate attention`,
      metric: "Security exposure active",
      explanation: `Critical risk cases typically involve employees with elevated access or sensitive data exposure. Prioritize these for immediate completion.`,
      actualValue: criticalCount,
    });
  } else if (highCount > 0 && riskRatio > 30) {
    insights.push({
      type: "negative",
      category: "risk",
      message: `${Math.round(riskRatio)}% of active offboardings are high-risk`,
      metric: `${highCount} high-risk case${highCount > 1 ? "s" : ""}`,
      explanation: `A high concentration of elevated-risk cases increases security exposure. Consider accelerating these offboardings.`,
      threshold: 30,
      actualValue: riskRatio,
    });
  } else if (totalRisk === 0 && totalActive > 0) {
    insights.push({
      type: "positive",
      category: "risk",
      message: `All active offboardings are at normal risk level`,
      explanation: `No elevated security concerns among current cases.`,
    });
  }

  if (overdueTasks > 0) {
    const overdueRatio = totalActive > 0 ? (overdueTasks / totalActive) : 0;
    insights.push({
      type: "negative",
      category: "process",
      message: `${overdueTasks} task${overdueTasks > 1 ? "s" : ""} are past their due date`,
      metric: overdueRatio > 0.5 ? "Widespread delays" : "Action required",
      explanation: `Overdue tasks delay offboarding completion and may create compliance issues. Check task assignments and blockers.`,
      actualValue: overdueTasks,
    });
  }

  const recentWeeks = weeklyTrend.slice(-4);
  const olderWeeks = weeklyTrend.slice(-8, -4);
  const recentHighRisk = recentWeeks.reduce((sum, w) => sum + w.highRisk, 0);
  const olderHighRisk = olderWeeks.reduce((sum, w) => sum + w.highRisk, 0);
  
  if (recentHighRisk > olderHighRisk && recentHighRisk > 2) {
    insights.push({
      type: "negative",
      category: "trend",
      message: `High-risk cases have increased in recent weeks`,
      metric: `${recentHighRisk} in last 4 weeks vs ${olderHighRisk} prior`,
      explanation: `Monitor for patterns — this could indicate changes in workforce or process gaps being exploited.`,
    });
  }

  const completionTrend = completedLastMonth > 0 
    ? ((completedThisMonth - completedLastMonth) / completedLastMonth) * 100 
    : (completedThisMonth > 0 ? 100 : 0);

  if (completedThisMonth > completedLastMonth && completedThisMonth > 0) {
    insights.push({
      type: "positive",
      category: "trend",
      message: `Offboarding throughput increased ${Math.round(completionTrend)}% this month`,
      metric: `${completedThisMonth} completed vs ${completedLastMonth} last month`,
      explanation: `Higher completion rates indicate improved process efficiency or increased team capacity.`,
    });
  }

  insights.sort((a, b) => {
    const typeOrder = { negative: 0, neutral: 1, positive: 2 };
    return typeOrder[a.type] - typeOrder[b.type];
  });

  const recentOffboardings = await prisma.offboarding.findMany({
    where: { organizationId: orgId },
    select: {
      id: true,
      status: true,
      riskLevel: true,
      createdAt: true,
      completedDate: true,
      scheduledDate: true,
      employee: {
        select: { 
          firstName: true, 
          lastName: true,
          department: { select: { name: true } },
        },
      },
      _count: {
        select: { tasks: true, assetReturns: true },
      },
      tasks: {
        where: { status: "COMPLETED" },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const totalOffboardings = Object.values(statusMap).reduce((a, b) => a + b, 0);
    const activeOffboardings = (statusMap["PENDING"] || 0) + 
      (statusMap["IN_PROGRESS"] || 0) + 
      (statusMap["PENDING_APPROVAL"] || 0);

  const completionTimeDistribution = [
    { bucket: "< 1 day", count: 0 },
    { bucket: "1-3 days", count: 0 },
    { bucket: "3-7 days", count: 0 },
    { bucket: "> 7 days", count: 0 },
  ];

  completedOffboardingsForAvg.forEach(o => {
    const days = (o.completedDate!.getTime() - o.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (days < 1) completionTimeDistribution[0].count++;
    else if (days <= 3) completionTimeDistribution[1].count++;
    else if (days <= 7) completionTimeDistribution[2].count++;
    else completionTimeDistribution[3].count++;
  });

  const offboardingsWithAssets = allOffboardings.filter(o => o.assetReturns.length > 0);
  const blockedByAssets = offboardingsWithAssets.filter(o => 
    o.assetReturns.some(ar => ar.status === "PENDING") && o.status !== "COMPLETED"
  ).length;
  
  const completedWithAssets = offboardingsWithAssets.filter(o => o.status === "COMPLETED" && o.completedDate);
  let totalAssetDelay = 0;
  completedWithAssets.forEach(o => {
    const pendingAssetCount = o.assetReturns.filter(ar => ar.status === "PENDING").length;
    if (pendingAssetCount > 0) {
      totalAssetDelay += pendingAssetCount * 0.5;
    }
  });
  
  const returnedAssets = assetReturnStats["RETURNED"] || 0;
  const assetReturnRate = totalAssets > 0 ? (returnedAssets / totalAssets) * 100 : 0;

  const assetImpact = {
    blockedByAssets,
    totalWithAssets: offboardingsWithAssets.length,
    avgDelayDays: completedWithAssets.length > 0 ? totalAssetDelay / completedWithAssets.length : 0,
    assetReturnRate,
  };

    const result = {
    summary: {
      totalOffboardings,
      activeOffboardings,
      completedThisMonth,
      completedLastMonth,
      completionTrend,
      highRiskCount: highCount,
      criticalRiskCount: criticalCount,
      averageCompletionDays: Math.round(avgCompletionDays),
      avgCompletionTrend,
      overdueTasks,
      pendingAssets,
      assetBlockingRate,
    },
    byStatus: {
      PENDING: statusMap["PENDING"] || 0,
      IN_PROGRESS: statusMap["IN_PROGRESS"] || 0,
      PENDING_APPROVAL: statusMap["PENDING_APPROVAL"] || 0,
      COMPLETED: statusMap["COMPLETED"] || 0,
      CANCELLED: statusMap["CANCELLED"] || 0,
    },
    byRisk: {
      NORMAL: riskMap["NORMAL"] || 0,
      HIGH: highCount,
      CRITICAL: criticalCount,
    },
    weeklyTrend,
    categoryPerformance,
    departmentAnalysis: deptAnalysis.slice(0, 5),
    avgApprovalDelay,
    insights,
    recentOffboardings: recentOffboardings.map(o => ({
        ...o,
        completedTasks: o.tasks.length,
        totalTasks: o._count.tasks,
        duration: o.completedDate 
          ? Math.round((o.completedDate.getTime() - o.createdAt.getTime()) / (1000 * 60 * 60 * 24))
          : Math.round((new Date().getTime() - o.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      })),
      completionTimeDistribution,
      assetImpact,
    };

  return setCache(cacheKey, result, CACHE_TTL.analytics);
});

export async function refreshAnalyticsSnapshot(orgId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [statusCounts, riskCounts, completedThisMonth, overdueTasks, recentForTrend] = await Promise.all([
    prisma.offboarding.groupBy({
      by: ["status"],
      where: { organizationId: orgId },
      _count: { id: true },
    }),
    prisma.offboarding.groupBy({
      by: ["riskLevel"],
      where: { organizationId: orgId },
      _count: { id: true },
    }),
    prisma.offboarding.count({
      where: {
        organizationId: orgId,
        status: "COMPLETED",
        completedDate: { gte: thirtyDaysAgo },
      },
    }),
    prisma.offboardingTask.count({
      where: {
        offboarding: { organizationId: orgId },
        status: "PENDING",
        dueDate: { lt: new Date() },
      },
    }),
    prisma.offboarding.findMany({
      where: {
        organizationId: orgId,
        createdAt: { gte: ninetyDaysAgo },
      },
      select: { createdAt: true },
    }),
  ]);

  const completedOffboardings = await prisma.offboarding.findMany({
    where: {
      organizationId: orgId,
      status: "COMPLETED",
      completedDate: { not: null },
    },
    select: { createdAt: true, completedDate: true },
    take: 100,
  });

  const avgDays = completedOffboardings.length > 0
    ? completedOffboardings.reduce((sum, o) => {
        const days = (o.completedDate!.getTime() - o.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0) / completedOffboardings.length
    : 0;

  const statusMap = Object.fromEntries(statusCounts.map(s => [s.status, s._count.id]));
  const riskMap = Object.fromEntries(riskCounts.map(r => [r.riskLevel, r._count.id]));

  const trendByDate = recentForTrend.reduce((acc, o) => {
    const date = o.createdAt.toISOString().split("T")[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const monthlyTrend = Object.entries(trendByDate)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalOffboardings = Object.values(statusMap).reduce((a, b) => a + b, 0);
  const activeOffboardings = (statusMap["PENDING"] || 0) + 
    (statusMap["IN_PROGRESS"] || 0) + 
    (statusMap["PENDING_APPROVAL"] || 0);

  const snapshot = await prisma.analyticsSnapshot.upsert({
    where: {
      organizationId_snapshotDate: {
        organizationId: orgId,
        snapshotDate: today,
      },
    },
    update: {
      totalOffboardings,
      activeOffboardings,
      completedOffboardings: statusMap["COMPLETED"] || 0,
      cancelledOffboardings: statusMap["CANCELLED"] || 0,
      pendingOffboardings: statusMap["PENDING"] || 0,
      inProgressOffboardings: statusMap["IN_PROGRESS"] || 0,
      pendingApprovalOffboardings: statusMap["PENDING_APPROVAL"] || 0,
      normalRiskCount: riskMap["NORMAL"] || 0,
      highRiskCount: riskMap["HIGH"] || 0,
      criticalRiskCount: riskMap["CRITICAL"] || 0,
      completedThisMonth,
      overdueTasks,
      averageCompletionDays: Math.round(avgDays),
      monthlyTrend,
      updatedAt: new Date(),
    },
    create: {
      organizationId: orgId,
      snapshotDate: today,
      totalOffboardings,
      activeOffboardings,
      completedOffboardings: statusMap["COMPLETED"] || 0,
      cancelledOffboardings: statusMap["CANCELLED"] || 0,
      pendingOffboardings: statusMap["PENDING"] || 0,
      inProgressOffboardings: statusMap["IN_PROGRESS"] || 0,
      pendingApprovalOffboardings: statusMap["PENDING_APPROVAL"] || 0,
      normalRiskCount: riskMap["NORMAL"] || 0,
      highRiskCount: riskMap["HIGH"] || 0,
      criticalRiskCount: riskMap["CRITICAL"] || 0,
      completedThisMonth,
      overdueTasks,
      averageCompletionDays: Math.round(avgDays),
      monthlyTrend,
    },
  });

  invalidateOrgCache(orgId);
  
  return snapshot;
}

export const getOffboardingListCached = cache(async (
  orgId: string, 
  options?: { status?: string; riskLevel?: string }
) => {
  const cacheKey = `org:${orgId}:offboardings:${options?.status || "all"}:${options?.riskLevel || "all"}`;
  const cached = getCached<unknown[]>(cacheKey);
  if (cached) return cached;

  const where: Record<string, unknown> = { organizationId: orgId };
  if (options?.status && options.status !== "all") {
    where.status = options.status;
  }
  if (options?.riskLevel && options.riskLevel !== "all") {
    where.riskLevel = options.riskLevel;
  }

  const offboardings = await prisma.offboarding.findMany({
    where,
    select: {
      id: true,
      status: true,
      riskLevel: true,
      scheduledDate: true,
      createdAt: true,
      completedDate: true,
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          department: { select: { name: true } },
          jobTitle: { select: { title: true } },
        },
      },
      _count: {
        select: {
          tasks: true,
          approvals: true,
          assetReturns: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return setCache(cacheKey, offboardings, CACHE_TTL.offboardingList);
});
