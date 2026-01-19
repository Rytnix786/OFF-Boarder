import { getEmployeeTasks } from "@/lib/actions/employee-portal";
import { requireEmployeeOffboarding } from "@/lib/employee-auth";
import TasksList from "./TasksList";
import { Box, Typography, Alert } from "@mui/material";

export default async function EmployeeTasksPage() {
  await requireEmployeeOffboarding();
  const tasks = await getEmployeeTasks();

  const pendingTasks = tasks.filter((t) => t.status === "PENDING" || t.status === "IN_PROGRESS");
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED");

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        My Tasks
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Complete the tasks below as part of your offboarding process.
      </Typography>

      {tasks.length === 0 ? (
        <Alert severity="info">
          <Typography variant="body2">You have no tasks assigned at this time.</Typography>
        </Alert>
      ) : (
        <>
          {pendingTasks.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                Pending Tasks ({pendingTasks.length})
              </Typography>
              <TasksList tasks={pendingTasks} />
            </Box>
          )}

          {completedTasks.length > 0 && (
            <Box>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                Completed Tasks ({completedTasks.length})
              </Typography>
              <TasksList tasks={completedTasks} />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
