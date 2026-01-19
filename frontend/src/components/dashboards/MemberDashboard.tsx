import { prisma } from "@/lib/prisma.server";
import { AuthSession } from "@/lib/auth-types";
import { Box, Typography, Card, CardContent, Grid, Button, Chip, LinearProgress, Avatar, alpha } from "@mui/material";
import Link from "next/link";
import {
  KPICard,
  SectionCard,
  TaskCard,
  QuickAction,
  DashboardEmptyState,
} from "./shared";
import { getExcludedOffboardingIdsForUser } from "@/lib/rbac.server";

interface MemberDashboardProps {
  session: AuthSession;
}

export async function MemberDashboard({ session }: MemberDashboardProps) {
  const orgId = session.currentOrgId!;
  const userId = session.user.id;
  const now = new Date();

  const excludedOffboardingIds = await getExcludedOffboardingIdsForUser(userId, orgId);

  const [
    assignedTasks,
    myOffboardings,
    recentCompletedTasks,
    totalTasksCompleted,
  ] = await Promise.all([
    prisma.offboardingTask.findMany({
      where: {
        offboarding: { 
          organizationId: orgId, 
          status: { in: ["PENDING", "IN_PROGRESS"] },
          id: { notIn: excludedOffboardingIds },
        },
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
      include: {
        offboarding: {
          select: {
            id: true,
            employee: { select: { firstName: true, lastName: true, department: { select: { name: true } } } },
          },
        },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 20,
    }),
    prisma.offboarding.findMany({
      where: { 
        organizationId: orgId, 
        status: { in: ["PENDING", "IN_PROGRESS", "PENDING_APPROVAL"] },
        id: { notIn: excludedOffboardingIds },
      },
      include: {
        employee: { select: { firstName: true, lastName: true, email: true, department: { select: { name: true } } } },
        tasks: { select: { id: true, status: true, dueDate: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.offboardingTask.findMany({
      where: {
        offboarding: { 
          organizationId: orgId,
          id: { notIn: excludedOffboardingIds },
        },
        status: "COMPLETED",
        completedAt: { not: null },
      },
      include: {
        offboarding: {
          select: {
            employee: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { completedAt: "desc" },
      take: 5,
    }),
    prisma.offboardingTask.count({
      where: { 
        offboarding: { 
          organizationId: orgId,
          id: { notIn: excludedOffboardingIds },
        }, 
        status: "COMPLETED" 
      },
    }),
  ]);

  const pendingTasks = assignedTasks;
  const overdueTasks = pendingTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now);
  const upcomingDeadlines = pendingTasks
    .filter((t) => t.dueDate && new Date(t.dueDate) >= now)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);
  const activeCases = myOffboardings.filter((o) => o.status !== "COMPLETED");

  const stats = [
    { label: "Pending Tasks", value: pendingTasks.length, icon: "pending_actions", color: "#f59e0b" },
    { label: "Overdue", value: overdueTasks.length, icon: "warning", color: overdueTasks.length > 0 ? "#ef4444" : "#6b7280" },
    { label: "Active Cases", value: activeCases.length, icon: "folder_open", color: "#3b82f6" },
    { label: "Completed", value: totalTasksCompleted, icon: "task_alt", color: "#22c55e" },
  ];

  const quickActions = [
    { id: "offboardings", label: "View Offboardings", description: "See cases you can help with", icon: "folder_open", href: "/app/offboardings" },
    { id: "employees", label: "Browse Employees", description: "View employee directory", icon: "people", href: "/app/employees" },
    { id: "assets", label: "View Assets", description: "Equipment and resources", icon: "inventory_2", href: "/app/assets" },
    { id: "profile", label: "My Profile", description: "Manage your account", icon: "person", href: "/app/settings/profile" },
  ];

  return (
    <Box>
      <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            My Tasks
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Your assigned tasks and offboardings at {session.currentMembership?.organization.name}
          </Typography>
        </Box>
        <Chip
            label="CONTRIBUTOR"
            sx={{ bgcolor: "#22c55e", color: "white", fontWeight: 700, height: 28 }}
          />
      </Box>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {stats.map((stat) => (
          <Grid size={{ xs: 6, sm: 3 }} key={stat.label}>
            <KPICard
              label={stat.label}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
              size="sm"
            />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <SectionCard
            title="My Pending Tasks"
            icon="pending_actions"
            iconColor="#f59e0b"
            badge={pendingTasks.length}
            badgeColor={pendingTasks.length > 0 ? "#f59e0b" : "#6b7280"}
            action={
              <Link href="/app/offboardings" passHref style={{ textDecoration: "none" }}>
                <Button size="small" sx={{ fontWeight: 600 }}>View All</Button>
              </Link>
            }
          >
            {pendingTasks.length === 0 ? (
              <DashboardEmptyState
                icon="check_circle"
                iconColor="#22c55e"
                title="All caught up!"
                description="No pending tasks assigned to you"
              />
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {pendingTasks.slice(0, 8).map((task) => {
                  const isOverdue = task.dueDate && new Date(task.dueDate) < now;
                  return (
                    <TaskCard
                      key={task.id}
                      id={task.id}
                      name={task.name}
                      employeeName={`${task.offboarding.employee.firstName} ${task.offboarding.employee.lastName}`}
                      departmentName={task.offboarding.employee.department?.name}
                      status={task.status}
                      dueDate={task.dueDate}
                      offboardingId={task.offboarding.id}
                      isOverdue={isOverdue || false}
                    />
                  );
                })}
              </Box>
            )}
          </SectionCard>

          {overdueTasks.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Card
                variant="outlined"
                sx={{
                  borderRadius: 3,
                  borderColor: alpha("#ef4444", 0.4),
                  bgcolor: alpha("#ef4444", 0.03),
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 2,
                        bgcolor: alpha("#ef4444", 0.1),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#ef4444" }}>
                        priority_high
                      </span>
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700} color="#ef4444">
                        Overdue Tasks
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {overdueTasks.length} task{overdueTasks.length !== 1 ? "s" : ""} require{overdueTasks.length === 1 ? "s" : ""} immediate attention
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                    {overdueTasks.slice(0, 3).map((task) => (
                      <TaskCard
                        key={task.id}
                        id={task.id}
                        name={task.name}
                        employeeName={`${task.offboarding.employee.firstName} ${task.offboarding.employee.lastName}`}
                        departmentName={task.offboarding.employee.department?.name}
                        status={task.status}
                        dueDate={task.dueDate}
                        offboardingId={task.offboarding.id}
                        isOverdue={true}
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Box>
          )}

          <Box sx={{ mt: 3 }}>
            <SectionCard
              title="Active Cases I Can Help With"
              icon="folder_open"
              iconColor="#3b82f6"
              badge={activeCases.length}
              noPadding
            >
              {activeCases.length === 0 ? (
                <Box sx={{ p: 3, textAlign: "center" }}>
                  <Typography variant="body2" color="text.secondary">
                    No active offboardings at the moment
                  </Typography>
                </Box>
              ) : (
                <Box>
                  {activeCases.slice(0, 5).map((ob, idx) => {
                    const completedTasks = ob.tasks.filter((t) => t.status === "COMPLETED" || t.status === "SKIPPED").length;
                    const progress = ob.tasks.length > 0 ? Math.round((completedTasks / ob.tasks.length) * 100) : 0;
                    const overdueTasks = ob.tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "COMPLETED" && t.status !== "SKIPPED").length;

                    return (
                      <Link key={ob.id} href={`/app/offboardings/${ob.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                        <Box
                          sx={{
                            px: 3,
                            py: 2,
                            borderBottom: idx < activeCases.length - 1 ? "1px solid" : "none",
                            borderColor: "divider",
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            "&:hover": { bgcolor: "action.hover" },
                          }}
                        >
                          <Avatar sx={{ width: 40, height: 40, bgcolor: "#3b82f615", color: "#3b82f6", fontWeight: 700, fontSize: "0.875rem" }}>
                            {ob.employee.firstName.charAt(0)}{ob.employee.lastName.charAt(0)}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={700} noWrap>
                              {ob.employee.firstName} {ob.employee.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {ob.employee.department?.name || "No department"}
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Chip
                              label={ob.status.replace("_", " ")}
                              size="small"
                              sx={{
                                fontWeight: 600,
                                fontSize: "0.65rem",
                                height: 22,
                                bgcolor: ob.status === "IN_PROGRESS" ? "#f59e0b15" : "#3b82f615",
                                color: ob.status === "IN_PROGRESS" ? "#f59e0b" : "#3b82f6",
                              }}
                            />
                            {overdueTasks > 0 && (
                              <Chip
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
                              sx={{ height: 4, borderRadius: 2, bgcolor: "#e5e7eb", "& .MuiLinearProgress-bar": { bgcolor: progress === 100 ? "#10b981" : "#3b82f6" } }}
                            />
                          </Box>
                        </Box>
                      </Link>
                    );
                  })}
                </Box>
              )}
            </SectionCard>
          </Box>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <span className="material-symbols-outlined" style={{ color: "#f59e0b", fontSize: 20 }}>
                  schedule
                </span>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Upcoming Deadlines
                </Typography>
              </Box>
              {upcomingDeadlines.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No upcoming deadlines
                </Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {upcomingDeadlines.map((task) => {
                    const daysLeft = Math.ceil(
                      (new Date(task.dueDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    );
                    const isUrgent = daysLeft <= 1;
                    return (
                      <Link
                        key={task.id}
                        href={`/app/offboardings/${task.offboarding.id}`}
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        <Box
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: isUrgent ? alpha("#ef4444", 0.1) : "action.hover",
                            transition: "all 0.2s",
                            "&:hover": { bgcolor: isUrgent ? alpha("#ef4444", 0.15) : "action.selected" },
                          }}
                        >
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {task.name}
                          </Typography>
                          <Typography variant="caption" color={isUrgent ? "error" : "text.secondary"}>
                            {daysLeft <= 0 ? "Due today" : `${daysLeft} day${daysLeft > 1 ? "s" : ""} left`}
                          </Typography>
                        </Box>
                      </Link>
                    );
                  })}
                </Box>
              )}
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                Quick Actions
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {quickActions.map((action) => (
                  <QuickAction
                    key={action.id}
                    id={action.id}
                    label={action.label}
                    description={action.description}
                    icon={action.icon}
                    href={action.href}
                    color="#3b82f6"
                  />
                ))}
              </Box>
            </CardContent>
          </Card>

          {recentCompletedTasks.length > 0 && (
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <span className="material-symbols-outlined" style={{ color: "#22c55e", fontSize: 20 }}>
                    task_alt
                  </span>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Recently Completed
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {recentCompletedTasks.map((task) => (
                    <Box
                      key={task.id}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: alpha("#22c55e", 0.05),
                        border: `1px solid ${alpha("#22c55e", 0.2)}`,
                      }}
                    >
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {task.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {task.offboarding.employee.firstName} {task.offboarding.employee.lastName}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
