import { useEffect, useRef } from "react";
import { ClipboardList } from "lucide-react";
import { EmptyState } from "../shared/EmptyState.jsx";
import { Skeleton } from "../ui/skeleton.jsx";
import { TaskProgressCard } from "./TaskProgressCard.jsx";
import { ProjectTimelineIllustration } from "../shared/illustrations/ProjectTimelineIllustration.jsx";
import { cn } from "../../lib/utils.js";

function isTaskFinishedForOrdering(task) {
  const status = String(task?.displayStatus || task?.status || "").toLowerCase();
  return (
    [
      "done",
      "completed",
      "checklist completed",
      "checklist_completed",
      "waiting for approval",
      "waiting_for_approval",
      "pending approval",
      "pending_approval",
      "pending review",
      "pending_review",
    ].includes(status)
  );
}

function orderTasksByCompletion(tasks) {
  return tasks
    .map((task, index) => ({ task, index }))
    .sort((a, b) => {
      const aFinished = isTaskFinishedForOrdering(a.task) ? 1 : 0;
      const bFinished = isTaskFinishedForOrdering(b.task) ? 1 : 0;
      return aFinished - bFinished || a.index - b.index;
    })
    .map(({ task }) => task);
}

// =============================================================================
// ProjectProgressPanel - overall project progress section with task cards.
//
// Props:
//   tasks              - array of tasks with progress and status
//   overallProgress   - 0-100 number
//   role               - "client" | "expert"
//   projectId          - parent project ID
//   onToggleMiniTask   - (taskId, miniTaskId) => void
//   focusTaskId        - string|null, task to scroll to
//   loading            - boolean
// =============================================================================

export function ProjectProgressPanel({
  tasks = [],
  overallProgress = 0,
  role = "client",
  projectId,
  onToggleMiniTask,
  focusTaskId,
  loading = false,
  project = null,
}) {
  const taskRefs = useRef({});
  const lastScrolledFocusTaskIdRef = useRef(null);
  const orderedTasks = orderTasksByCompletion(tasks);

  // Scroll to focused task once when returning from a task action page.
  // Do not depend on `tasks`; data refreshes after submit can otherwise pull
  // the user back to the same task while they are scrolling to other tasks.
  useEffect(() => {
    if (!focusTaskId || lastScrolledFocusTaskIdRef.current === focusTaskId) return;

    const timer = setTimeout(() => {
      const target = taskRefs.current[focusTaskId];
      if (!target) return;

      lastScrolledFocusTaskIdRef.current = focusTaskId;
      target.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [focusTaskId]);

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

  if (orderedTasks.length === 0) {
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

  const completedTasks = orderedTasks.filter(
    (t) => t.displayStatus === "Done"
  ).length;

  return (
    <div id="project-progress" className="bg-card rounded-xl border border-border p-6 space-y-6 scroll-mt-28">
      {/* Overall progress header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Project Progress</h2>
          <p className="text-sm text-muted-foreground">
            Progress is automatically calculated from completed mini-tasks.
          </p>
          {orderedTasks.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {completedTasks} of {orderedTasks.length} tasks completed
            </p>
          )}
        </div>
        <div className="flex items-baseline gap-2 rounded-xl border border-border bg-secondary/35 px-3 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Overall</span>
          <span className={`text-lg font-semibold font-mono leading-none tracking-tight ${overallProgress >= 100 ? "text-success" :
              overallProgress >= 50 ? "text-accent" :
                "text-foreground"
            }`}>
            {overallProgress}<span className="text-xs">%</span>
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

      {/* Tasks & Milestones wrapped by Client Use Case cards */}
      {project?.useCases && project.useCases.length > 0 ? (
        <div className="space-y-6 pt-2">
          {project.useCases.map((uc, ucIdx) => {
            const ucTasks = orderTasksByCompletion(tasks.filter((t) => {
              if (t.useCaseId === uc.id) return true;
              const hasValidUseCase = project.useCases.some((item) => item.id === t.useCaseId);
              if (!hasValidUseCase && project.useCases[0]?.id === uc.id) return true;
              return false;
            }));

            // Calculate Use Case progress based on child tasks' minitasks
            let totalMinis = 0;
            let completedMinis = 0;
            ucTasks.forEach((task) => {
              const miniTasks = task.miniTasks || [];
              totalMinis += miniTasks.length;
              completedMinis += miniTasks.filter(
                (mt) => mt.isCompleted === true || mt.status === "done" || mt.status === "completed"
              ).length;
            });
            const ucProgressPercent =
              totalMinis > 0 ? Math.round((completedMinis / totalMinis) * 100) : 0;

            return (
              <div key={uc.id || ucIdx} className="border border-border rounded-2xl overflow-hidden bg-card shadow-sm text-left">
                {/* Use Case Header */}
                <div className="p-4 bg-accent-light/35 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-brand-primary-light text-brand-primary border border-brand-primary/20 rounded-full text-[10px] font-semibold">
                        Client Use Case
                      </span>
                      <h4 className="font-semibold text-foreground text-sm">
                        {uc.title || uc.nameAndDeadline}
                      </h4>
                    </div>
                    {uc.description && (
                      <p className="text-xs text-muted-foreground">{uc.description}</p>
                    )}
                  </div>

                  {/* Use Case Milestone Progress & Duration */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium">Use case progress:</span>
                      <span className="text-xs font-semibold text-primary font-mono">{ucProgressPercent}%</span>
                      <div className="w-20 bg-secondary h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full transition-all duration-500"
                          style={{ width: `${ucProgressPercent}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full font-semibold whitespace-nowrap">
                      {uc.originalDurationDays || 1} days
                    </span>
                  </div>
                </div>

                {/* Tasks belonging to this Use Case */}
                <div className="p-4 space-y-4">
                  {ucTasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-2">
                      No tasks proposed for this use case.
                    </p>
                  ) : (
                    ucTasks.map((task) => (
                      <div
                        key={task.id}
                        ref={(el) => {
                          if (el) taskRefs.current[task.id] = el;
                        }}
                        id={task.id}
                        className="scroll-mt-28"
                      >
                        <TaskProgressCard
                          task={task}
                          role={role}
                          projectId={projectId}
                          onToggleMiniTask={onToggleMiniTask}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Flat fallback list */
        <div className="space-y-4 pt-2">
          <h3 className="section-header">
            Milestones ({tasks.length})
          </h3>
          <div className="space-y-4">
            {orderedTasks.map((task) => (
              <div
                key={task.id}
                ref={(el) => {
                  if (el) taskRefs.current[task.id] = el;
                }}
                id={task.id}
                className="scroll-mt-28"
              >
                <TaskProgressCard
                  task={task}
                  role={role}
                  projectId={projectId}
                  onToggleMiniTask={onToggleMiniTask}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
