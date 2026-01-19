"use client";

import { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import { completeEmployeeTask } from "@/lib/actions/employee-portal";
import type { OffboardingTask } from "@prisma/client";

interface TasksListProps {
  tasks: OffboardingTask[];
}

export default function TasksList({ tasks }: TasksListProps) {
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCompleteTask = async (taskId: string) => {
    setLoadingTaskId(taskId);
    setError(null);

    try {
      const result = await completeEmployeeTask(taskId);
      if (!result.success) {
        setError(result.error || "Failed to complete task");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoadingTaskId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "success";
      case "IN_PROGRESS":
        return "warning";
      case "PENDING":
        return "default";
      case "BLOCKED":
        return "error";
      default:
        return "default";
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {tasks.map((task) => (
        <Paper key={task.id} sx={{ p: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {task.name}
                </Typography>
                <Chip
                  size="small"
                  label={task.status.replace("_", " ")}
                  color={getStatusColor(task.status) as "success" | "warning" | "default" | "error"}
                />
                {task.category && (
                  <Chip size="small" label={task.category} variant="outlined" />
                )}
              </Box>
              {task.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {task.description}
                </Typography>
              )}
              <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
                {task.dueDate && (
                  <Typography variant="caption" color="text.secondary">
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                  </Typography>
                )}
                {task.completedAt && (
                  <Typography variant="caption" color="success.main">
                    Completed: {new Date(task.completedAt).toLocaleDateString()}
                  </Typography>
                )}
              </Box>
            </Box>

            {task.status !== "COMPLETED" && (
              <Button
                variant="contained"
                color="primary"
                disabled={loadingTaskId === task.id}
                onClick={() => handleCompleteTask(task.id)}
                startIcon={
                  loadingTaskId === task.id ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      check_circle
                    </span>
                  )
                }
              >
                {loadingTaskId === task.id ? "Completing..." : "Mark Complete"}
              </Button>
            )}
          </Box>
        </Paper>
      ))}
    </Box>
  );
}
