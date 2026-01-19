export type EnhancedAnalyticsData = {
  summary: {
    totalOffboardings: number;
    activeOffboardings: number;
    completedThisMonth: number;
    completedLastMonth: number;
    completionTrend: number;
    highRiskCount: number;
    criticalRiskCount: number;
    averageCompletionDays: number;
    avgCompletionTrend: number;
    overdueTasks: number;
    pendingAssets: number;
    assetBlockingRate: number;
  };
  byStatus: Record<string, number>;
  byRisk: Record<string, number>;
  weeklyTrend: { week: string; completed: number; started: number; highRisk: number }[];
  categoryPerformance: Record<string, { total: number; completed: number; blocked: number; pending: number }>;
  departmentAnalysis: { departmentId: string; departmentName: string; avgDays: number; count: number; vsAverage: number }[];
  avgApprovalDelay: number;
  insights: { 
    type: "positive" | "negative" | "neutral"; 
    category: "performance" | "risk" | "assets" | "process" | "department" | "trend";
    message: string; 
    metric?: string;
    explanation?: string;
    threshold?: number;
    actualValue?: number;
  }[];
  recentOffboardings: {
    id: string;
    status: string;
    riskLevel: string | null;
    createdAt: Date;
    completedDate: Date | null;
    scheduledDate: Date | null;
    employee: { firstName: string; lastName: string; department: { name: string } | null };
    completedTasks: number;
    totalTasks: number;
    duration: number;
  }[];
  completionTimeDistribution: { bucket: string; count: number }[];
  assetImpact: {
    blockedByAssets: number;
    totalWithAssets: number;
    avgDelayDays: number;
    assetReturnRate: number;
  };
};
