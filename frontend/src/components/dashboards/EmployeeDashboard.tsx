import type { EmployeePortalSession } from "@/lib/employee-auth.server";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Avatar,
  LinearProgress,
  Alert,
  alpha,
  Divider,
} from "@mui/material";
import Link from "next/link";
import { TimelineStep, SectionCard, DashboardEmptyState } from "./shared";

interface EmployeeDashboardProps {
  session: EmployeePortalSession;
  offboarding?: {
    id: string;
    status: string;
    scheduledDate: Date | null;
    tasks: Array<{
      id: string;
      name: string;
      status: string;
      dueDate: Date | null;
      completedAt: Date | null;
    }>;
    assetReturns: Array<{
      id: string;
      status: string;
      asset: {
        name: string;
        assetTag: string;
      };
    }>;
    attestations: Array<{
      id: string;
      signedAt: Date | null;
    }>;
  } | null;
}

export function EmployeeDashboard({ session, offboarding }: EmployeeDashboardProps) {
  const now = new Date();

  const taskStats = offboarding
    ? {
        total: offboarding.tasks.length,
        completed: offboarding.tasks.filter((t) => t.status === "COMPLETED").length,
        pending: offboarding.tasks.filter((t) => t.status === "PENDING" || t.status === "IN_PROGRESS").length,
      }
    : { total: 0, completed: 0, pending: 0 };

  const assetStats = offboarding
    ? {
        total: offboarding.assetReturns.length,
        returned: offboarding.assetReturns.filter((a) => a.status === "RETURNED").length,
        pending: offboarding.assetReturns.filter((a) => a.status !== "RETURNED").length,
      }
    : { total: 0, returned: 0, pending: 0 };

  const attestationSigned = offboarding?.attestations && offboarding.attestations.some((a) => a.signedAt);
  const taskProgress = taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0;

  const getStatusSteps = () => {
    if (!offboarding) return [];

    const steps: Array<{ label: string; description: string; status: "completed" | "current" | "pending"; date?: string }> = [];

    steps.push({
      label: "Offboarding Initiated",
      description: "Your offboarding process has started",
      status: "completed",
      date: offboarding.scheduledDate ? new Date(offboarding.scheduledDate).toLocaleDateString("en-US") : undefined,
    });

    if (taskStats.completed > 0) {
      steps.push({
        label: "Tasks In Progress",
        description: `${taskStats.completed} of ${taskStats.total} tasks completed`,
        status: taskStats.completed === taskStats.total ? "completed" : "current",
      });
    } else if (taskStats.total > 0) {
      steps.push({
        label: "Complete Your Tasks",
        description: `${taskStats.pending} tasks require your attention`,
        status: "current",
      });
    }

    if (assetStats.total > 0) {
      steps.push({
        label: "Return Assets",
        description: `${assetStats.returned} of ${assetStats.total} items returned`,
        status: assetStats.returned === assetStats.total ? "completed" : assetStats.returned > 0 ? "current" : "pending",
      });
    }

    steps.push({
      label: "Sign Attestation",
      description: "Acknowledge and complete final steps",
      status: attestationSigned ? "completed" : "pending",
    });

    steps.push({
      label: "Offboarding Complete",
      description: "All tasks and requirements fulfilled",
      status: offboarding.status === "COMPLETED" ? "completed" : "pending",
    });

    return steps;
  };

  const pendingTasks = offboarding?.tasks.filter((t) => t.status === "PENDING" || t.status === "IN_PROGRESS") || [];
  const pendingAssets = offboarding?.assetReturns.filter((a) => a.status !== "RETURNED") || [];

  return (
    <Box>
<Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>
            What do I need to do?
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {session.hasActiveOffboarding
              ? `Hi ${session.employee.firstName}, here are the tasks and actions you need to complete.`
              : "You currently have no pending tasks."}
          </Typography>
        </Box>

      {!session.hasActiveOffboarding ? (
        <Box>
          <Alert
            severity="info"
            sx={{
              mb: 4,
              borderRadius: 3,
              "& .MuiAlert-message": { width: "100%" },
            }}
          >
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
              No Active Offboarding
            </Typography>
            <Typography variant="body2">
              You are currently an active employee at {session.organizationName}. If you believe this is incorrect,
              please contact your HR department.
            </Typography>
          </Alert>

          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                <Avatar sx={{ width: 56, height: 56, bgcolor: "primary.main", fontSize: "1.5rem", fontWeight: 700 }}>
                  {session.employee.firstName?.charAt(0)}{session.employee.lastName?.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    {session.employee.firstName} {session.employee.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {session.employee.jobTitle?.title || "Employee"} • {session.employee.department?.name || "No Department"}
                  </Typography>
                </Box>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Employee ID</Typography>
                  <Typography variant="body2" fontWeight={600}>{session.employee.employeeId}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Email</Typography>
                  <Typography variant="body2" fontWeight={600}>{session.employee.email}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Manager</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {session.employee.managerMembership?.user?.name || "—"}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Location</Typography>
                  <Typography variant="body2" fontWeight={600}>{session.employee.location?.name || "—"}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Box>
      ) : (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card
              variant="outlined"
              sx={{
                borderRadius: 3,
                mb: 3,
                borderColor: alpha("#3b82f6", 0.3),
                bgcolor: alpha("#3b82f6", 0.02),
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: alpha("#3b82f6", 0.1),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 24, color: "#3b82f6" }}>
                        timeline
                      </span>
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        Your Offboarding Progress
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {offboarding?.scheduledDate
                          ? `Scheduled for ${new Date(offboarding.scheduledDate).toLocaleDateString("en-US")}`
                          : "In progress"}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography variant="h4" fontWeight={800} color="#3b82f6">
                      {taskProgress}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Complete
                    </Typography>
                  </Box>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={taskProgress}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: alpha("#3b82f6", 0.1),
                    "& .MuiLinearProgress-bar": { bgcolor: "#3b82f6", borderRadius: 4 },
                  }}
                />
              </CardContent>
            </Card>

            <SectionCard
              title="What Happens Next"
              icon="route"
              iconColor="#3b82f6"
            >
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {getStatusSteps().map((step, idx) => (
                  <Box key={idx} sx={{ display: "flex", gap: 2 }}>
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <TimelineStep
                        label={step.label}
                        description={step.description}
                        status={step.status}
                        date={step.date}
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            </SectionCard>

            {pendingTasks.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <SectionCard
                  title="Tasks to Complete"
                  icon="task_alt"
                  iconColor="#f59e0b"
                  badge={pendingTasks.length}
                  badgeColor="#f59e0b"
                >
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                    {pendingTasks.slice(0, 5).map((task) => {
                      const isOverdue = task.dueDate && new Date(task.dueDate) < now;
                      return (
                        <Link
                          key={task.id}
                          href="/app/employee/tasks"
                          style={{ textDecoration: "none", color: "inherit" }}
                        >
                          <Box
                            sx={{
                              p: 2,
                              borderRadius: 2,
                              border: "1px solid",
                              borderColor: isOverdue ? alpha("#ef4444", 0.3) : "divider",
                              bgcolor: isOverdue ? alpha("#ef4444", 0.03) : "transparent",
                              transition: "all 0.2s",
                              "&:hover": { bgcolor: "action.hover" },
                            }}
                          >
                            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                              <Box
                                sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: "50%",
                                  bgcolor: isOverdue ? alpha("#ef4444", 0.1) : alpha("#f59e0b", 0.1),
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <span
                                  className="material-symbols-outlined"
                                  style={{ fontSize: 18, color: isOverdue ? "#ef4444" : "#f59e0b" }}
                                >
                                  {isOverdue ? "warning" : "pending_actions"}
                                </span>
                              </Box>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" fontWeight={600}>
                                  {task.name}
                                </Typography>
                                {task.dueDate && (
                                  <Typography
                                    variant="caption"
                                    sx={{ color: isOverdue ? "#ef4444" : "text.secondary" }}
                                  >
                                    Due: {new Date(task.dueDate).toLocaleDateString("en-US")}
                                    {isOverdue && " (Overdue)"}
                                  </Typography>
                                )}
                              </Box>
                              <Chip
                                size="small"
                                label={task.status.replace("_", " ")}
                                sx={{
                                  fontWeight: 600,
                                  fontSize: "0.65rem",
                                  height: 22,
                                  bgcolor: alpha("#f59e0b", 0.1),
                                  color: "#f59e0b",
                                }}
                              />
                            </Box>
                          </Box>
                        </Link>
                      );
                    })}
                  </Box>
                </SectionCard>
              </Box>
            )}

            {pendingAssets.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <SectionCard
                  title="Assets to Return"
                  icon="devices"
                  iconColor="#8b5cf6"
                  badge={pendingAssets.length}
                  badgeColor="#8b5cf6"
                >
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                    {pendingAssets.slice(0, 5).map((ar) => (
                      <Link
                        key={ar.id}
                        href="/app/employee/assets"
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            border: "1px solid",
                            borderColor: "divider",
                            transition: "all 0.2s",
                            "&:hover": { bgcolor: "action.hover" },
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <Box
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                bgcolor: alpha("#8b5cf6", 0.1),
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#8b5cf6" }}>
                                devices
                              </span>
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" fontWeight={600}>
                                {ar.asset.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Asset Tag: {ar.asset.assetTag}
                              </Typography>
                            </Box>
                            <Chip
                              size="small"
                              label={ar.status.replace("_", " ")}
                              sx={{
                                fontWeight: 600,
                                fontSize: "0.65rem",
                                height: 22,
                                bgcolor: alpha("#8b5cf6", 0.1),
                                color: "#8b5cf6",
                              }}
                            />
                          </Box>
                        </Box>
                      </Link>
                    ))}
                  </Box>
                </SectionCard>
              </Box>
            )}
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                  <Avatar sx={{ width: 48, height: 48, bgcolor: "primary.main", fontSize: "1.25rem", fontWeight: 700 }}>
                    {session.employee.firstName?.charAt(0)}{session.employee.lastName?.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {session.employee.firstName} {session.employee.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {session.employee.jobTitle?.title || "Employee"}
                    </Typography>
                  </Box>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body2" color="text.secondary">Department</Typography>
                    <Typography variant="body2" fontWeight={600}>{session.employee.department?.name || "—"}</Typography>
                  </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2" color="text.secondary">Manager</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {session.employee.managerMembership?.user?.name || "—"}
                      </Typography>
                    </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body2" color="text.secondary">Location</Typography>
                    <Typography variant="body2" fontWeight={600}>{session.employee.location?.name || "—"}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
<Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                    My Progress
                  </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2" color="text.secondary">Tasks</Typography>
                    <Chip
                      size="small"
                      label={`${taskStats.completed}/${taskStats.total}`}
                      sx={{
                        fontWeight: 600,
                        bgcolor: taskStats.completed === taskStats.total && taskStats.total > 0 ? alpha("#22c55e", 0.1) : alpha("#f59e0b", 0.1),
                        color: taskStats.completed === taskStats.total && taskStats.total > 0 ? "#22c55e" : "#f59e0b",
                      }}
                    />
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2" color="text.secondary">Assets</Typography>
                    <Chip
                      size="small"
                      label={`${assetStats.returned}/${assetStats.total}`}
                      sx={{
                        fontWeight: 600,
                        bgcolor: assetStats.returned === assetStats.total && assetStats.total > 0 ? alpha("#22c55e", 0.1) : alpha("#8b5cf6", 0.1),
                        color: assetStats.returned === assetStats.total && assetStats.total > 0 ? "#22c55e" : "#8b5cf6",
                      }}
                    />
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2" color="text.secondary">Attestation</Typography>
                    <Chip
                      size="small"
                      label={attestationSigned ? "Signed" : "Pending"}
                      sx={{
                        fontWeight: 600,
                        bgcolor: attestationSigned ? alpha("#22c55e", 0.1) : alpha("#ef4444", 0.1),
                        color: attestationSigned ? "#22c55e" : "#ef4444",
                      }}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {!attestationSigned && (
              <Alert
                severity="warning"
                sx={{
                  mb: 3,
                  borderRadius: 3,
                  "& .MuiAlert-message": { width: "100%" },
                }}
              >
                <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                  Action Required
                </Typography>
                <Typography variant="body2">
                  Please sign your compliance attestation to complete your offboarding.
                </Typography>
                <Link href="/app/employee/attestation" style={{ textDecoration: "none" }}>
                  <Typography
                    variant="body2"
                    sx={{ color: "#f59e0b", fontWeight: 600, mt: 1, "&:hover": { textDecoration: "underline" } }}
                  >
                    Sign Attestation →
                  </Typography>
                </Link>
              </Alert>
            )}

            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                  Need Help?
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  If you have questions about your offboarding process, please contact your HR department or manager.
                </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {session.employee.managerMembership?.user && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#6b7280" }}>person</span>
                        <Typography variant="body2">
                          {session.employee.managerMembership.user.name} (Manager)
                        </Typography>
                      </Box>
                    )}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#6b7280" }}>mail</span>
                    <Typography variant="body2">hr@{session.organizationName?.toLowerCase().replace(/\s+/g, "")}.com</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
