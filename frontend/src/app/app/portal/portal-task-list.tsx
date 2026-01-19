"use client";

import { useState } from "react";
import { completePortalTask } from "@/lib/actions/portal-tasks";

type SubjectTask = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  dueDate: Date | null;
  offboardingId: string;
};

type ContributorTask = SubjectTask & {
  subjectName: string;
};

type Props = {
  tasks: SubjectTask[] | ContributorTask[];
  mode: "subject" | "contributor";
};

export function PortalTaskList({ tasks, mode }: Props) {
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async (taskId: string) => {
    setCompletingId(taskId);
    setError(null);
    
    try {
      const result = await completePortalTask(taskId);
      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError("Failed to complete task");
    } finally {
      setCompletingId(null);
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 bg-[#141414] rounded-lg border border-[#262626]">
        <span className="material-symbols-outlined text-4xl text-[#444] mb-3">
          check_circle
        </span>
        <p className="text-[#888]">No pending tasks</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}
      
      {tasks.map((task) => {
        const isContributorTask = mode === "contributor" && "subjectName" in task;
        const isPending = task.status === "PENDING";
        const isInProgress = task.status === "IN_PROGRESS";
        const isCompleted = task.status === "COMPLETED";
        
        return (
          <div
            key={task.id}
            className={`p-4 rounded-lg border transition-colors ${
              isCompleted
                ? "bg-[#141414] border-[#262626] opacity-60"
                : "bg-[#141414] border-[#262626] hover:border-[#333]"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                isCompleted
                  ? "bg-emerald-500/10"
                  : isPending
                  ? "bg-amber-500/10"
                  : "bg-blue-500/10"
              }`}>
                <span className={`material-symbols-outlined text-lg ${
                  isCompleted
                    ? "text-emerald-500"
                    : isPending
                    ? "text-amber-500"
                    : "text-blue-500"
                }`}>
                  {isCompleted ? "check_circle" : isPending ? "pending" : "play_circle"}
                </span>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`font-medium ${isCompleted ? "text-[#666]" : "text-white"}`}>
                    {task.name}
                  </h3>
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    isCompleted
                      ? "bg-emerald-500/10 text-emerald-400"
                      : isPending
                      ? "bg-amber-500/10 text-amber-400"
                      : "bg-blue-500/10 text-blue-400"
                  }`}>
                    {task.status.replace(/_/g, " ")}
                  </span>
                </div>
                
                {task.description && (
                  <p className={`text-sm mb-2 ${isCompleted ? "text-[#555]" : "text-[#888]"}`}>
                    {task.description}
                  </p>
                )}
                
                <div className="flex items-center gap-4 text-xs text-[#666]">
                  {task.dueDate && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">calendar_today</span>
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}
                  {isContributorTask && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">person</span>
                      {(task as ContributorTask).subjectName}
                    </span>
                  )}
                </div>
              </div>
              
              {!isCompleted && (
                <button
                  onClick={() => handleComplete(task.id)}
                  disabled={completingId === task.id}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {completingId === task.id ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-sm">
                        progress_activity
                      </span>
                      Completing...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">
                        check
                      </span>
                      Complete
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
