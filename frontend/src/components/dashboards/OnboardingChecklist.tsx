import { Box, Typography, Card, CardContent, Button, LinearProgress, alpha, Collapse } from "@mui/material";
import Link from "next/link";
import { OnboardingStatus } from "@/lib/actions/onboarding-checklist";

interface OnboardingChecklistProps {
  status: OnboardingStatus;
  orgName: string;
}

export function OnboardingChecklist({ status, orgName }: OnboardingChecklistProps) {
  const { tasks, completedCount, totalCount, isComplete } = status;
  const progress = Math.round((completedCount / totalCount) * 100);

  if (isComplete) {
    return (
      <Card
        variant="outlined"
        sx={{
          mb: 4,
          borderRadius: 2.5,
          bgcolor: alpha("#059669", 0.04),
          borderColor: alpha("#059669", 0.2),
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 4,
            height: "100%",
            bgcolor: "#059669",
          }}
        />
        <CardContent sx={{ py: 2.5, px: 3, "&:last-child": { pb: 2.5 } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: alpha("#059669", 0.12),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: "#059669" }}>
                check_circle
              </span>
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#059669" }}>
                Setup Complete
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {orgName} is fully configured and ready for offboarding operations.
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const incompleteTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 4,
        borderRadius: 2.5,
        borderColor: alpha("#3b82f6", 0.25),
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 4,
          height: "100%",
          bgcolor: "#3b82f6",
        }}
      />
      <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
        <Box sx={{ px: 3, py: 2.5, borderBottom: "1px solid", borderColor: "divider" }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: -0.3 }}>
                Get Started with OffboardHQ
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Complete these steps to set up {orgName} for offboarding operations.
              </Typography>
            </Box>
            <Box sx={{ textAlign: "right" }}>
              <Typography variant="h5" sx={{ fontWeight: 800, color: "primary.main" }}>
                {completedCount}/{totalCount}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                completed
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                flex: 1,
                height: 8,
                borderRadius: 4,
                bgcolor: alpha("#3b82f6", 0.1),
                "& .MuiLinearProgress-bar": {
                  bgcolor: "#3b82f6",
                  borderRadius: 4,
                },
              }}
            />
            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", minWidth: 36 }}>
              {progress}%
            </Typography>
          </Box>
        </Box>

        <Box>
          {incompleteTasks.map((task, index) => (
            <Box
              key={task.id}
              sx={{
                px: 3,
                py: 2,
                borderBottom: index < incompleteTasks.length - 1 || completedTasks.length > 0 ? "1px solid" : "none",
                borderColor: "divider",
                display: "flex",
                alignItems: "center",
                gap: 2,
                bgcolor: "background.paper",
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: alpha("#3b82f6", 0.08),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#3b82f6" }}>
                  {task.icon}
                </span>
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {task.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                  {task.description}
                </Typography>
              </Box>
              <Link href={task.href} style={{ textDecoration: "none" }}>
                <Button
                  variant="outlined"
                  size="small"
                  sx={{
                    fontWeight: 600,
                    borderRadius: 1.5,
                    textTransform: "none",
                    flexShrink: 0,
                  }}
                >
                  {task.actionLabel}
                </Button>
              </Link>
            </Box>
          ))}

          {completedTasks.length > 0 && (
            <Box sx={{ bgcolor: alpha("#059669", 0.02) }}>
              {completedTasks.map((task, index) => (
                <Box
                  key={task.id}
                  sx={{
                    px: 3,
                    py: 1.5,
                    borderBottom: index < completedTasks.length - 1 ? "1px solid" : "none",
                    borderColor: "divider",
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    opacity: 0.7,
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1.5,
                      bgcolor: alpha("#059669", 0.1),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#059669" }}>
                      check
                    </span>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: "text.secondary", textDecoration: "line-through" }}>
                    {task.title}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
