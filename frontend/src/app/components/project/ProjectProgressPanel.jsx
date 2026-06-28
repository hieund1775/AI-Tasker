import { useEffect, useRef } from "react";
import { ClipboardList } from "lucide-react";
import { EmptyState } from "../shared/EmptyState.jsx";
import { Skeleton } from "../ui/skeleton.jsx";
import { TaskProgressCard } from "./TaskProgressCard.jsx";
import { ProjectTimelineIllustration } from "../shared/illustrations/ProjectTimelineIllustration.jsx";
import { cn } from "../../lib/utils.js";

// =============================================================================
// ProjectProgressPanel — overall project progress section with task cards.
//
// Props:
//   tasks              — array of tasks with progress and status
//   overallProgress   — 0-100 number
//   role               — "client" | "expert"
//   projectId          — parent project ID
//   onToggleMiniTask   — (taskId, miniTaskId) => void
//   focusTaskId        — string|null, task to scroll to
//   loading            — boolean
// =============================================================================

export function ProjectProgressPanel({
  tasks = [],
  overallProgress = 0,
  role = "client",
  projectId,
  onToggleMiniTask,
  focusTaskId,
  loading = false,
}) {
  const taskRefs = useRef({});

  // Scroll to focused task when focusTaskId changes
  useEffect(() => {
    if (focusTaskId && taskRefs.current[focusTaskId]) {
      const timer = setTimeout(() => {
        taskRefs.current[focusTaskId]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [focusTaskId, tasks]);

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 space-y-6">
        <div className="flex justify-between items-center border-b border-border pb-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3 w-full rounded-full" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3 pt-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No milestones found"
        description="No milestones found for this project."
        illustration={<ProjectTimelineIllustration size="sm" />}
        size="md"
      />
    );
  }

  const completedTasks = tasks.filter(
    (t) => t.displayStatus === "Done"
  ).length;

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-5">
      {/* Overall progress header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Project Progress</h2>
          <p className="text-sm text-muted-foreground">
            Progress is automatically calculated from completed Mini Tasks.
          </p>
          {tasks.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {completedTasks} of {tasks.length} tasks completed
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Overall</span>
          <span className={`text-4xl font-bold font-mono tracking-tight ${
            overallProgress >= 100 ? "text-success" :
            overallProgress >= 50 ? "text-accent" :
            "text-foreground"
          }`}>
            {overallProgress}<span className="text-lg">%</span>
          </span>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="w-full bg-secondary h-3 rounded-full overflow-hidden shadow-inner">
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r from-accent via-accent to-accent-hover",
            "progress-bar-animated",
            overallProgress > 0 && "progress-bar-active",
            overallProgress >= 100 && "!from-success !via-success !to-success"
          )}
          style={{ width: `${Math.min(overallProgress, 100)}%` }}
        />
      </div>

      {/* Task cards */}
      <div className="space-y-4 pt-2">
        <h3 className="section-header">
          Milestones ({tasks.length})
        </h3>
        <div className="space-y-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              ref={(el) => {
                if (el) taskRefs.current[task.id] = el;
              }}
              id={task.id}
            >
              <TaskProgressCard
                task={task}
                role={role}
                projectId={projectId}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
