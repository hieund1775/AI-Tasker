// =============================================================================
// TaskCard — single task card with progress bar, status, and action buttons.
//
// Props:
//   task              — task object
//   derivedStatus     — display status string
//   role              — "client" | "expert"
//   completedMiniTasks — number
//   totalMiniTasks    — number
//   progress          — 0-100 number
//   latestLog         — { message } | null
//   canOpenSubmit     — boolean
//   isSubmitDisabled  — boolean
//   submitButtonLabel — string
//   goToTaskAction    — (task, action) => void
//   getTaskStatusClass — (status) => string
//   getTaskStatusLabel — (status) => string
// =============================================================================

import { CheckCircle2, Clock3 } from "lucide-react";
import { TaskActionButtons } from "./TaskActionButtons.jsx";

export function TaskCard({
  task,
  derivedStatus,
  role,
  completedMiniTasks,
  totalMiniTasks,
  progress,
  latestLog,
  canOpenSubmit,
  isSubmitDisabled,
  submitButtonLabel,
  goToTaskAction,
  getTaskStatusClass,
  getTaskStatusLabel,
}) {
  return (
    <div
      id={task.id}
      className="bg-card rounded-xl border border-border p-6 card-hover"
    >
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
        <div className="flex-1 pr-4">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-gradient-to-br from-primary/15 to-primary/5 text-primary rounded-xl flex items-center justify-center font-semibold flex-shrink-0 border border-primary/10">
              {task.id || "?"}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-lg font-semibold text-foreground">
                  {task.title}
                </h3>
                <span
                  className={`px-3 py-1 rounded-full text-[13px] font-medium ${getTaskStatusClass(
                    derivedStatus,
                  )}`}
                >
                  {getTaskStatusLabel(derivedStatus)}
                </span>
              </div>
              <p className="text-muted-foreground mt-2">{task.description}</p>
              <div className="flex flex-wrap items-center gap-5 mt-5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4" />
                  {completedMiniTasks}/{totalMiniTasks}{" "}
                  mini tasks
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock3 className="w-4 h-4" />
                  {progress}% completed
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full max-w-[1280px] bg-secondary rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-accent to-accent-hover h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              {latestLog && (
                <div className="mt-4 text-sm text-muted-foreground">
                  Latest update:{" "}
                  <span className="text-foreground font-medium">
                    {latestLog.message}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <TaskActionButtons
          task={task}
          derivedStatus={derivedStatus}
          role={role}
          canOpenSubmit={canOpenSubmit}
          isSubmitDisabled={isSubmitDisabled}
          submitButtonLabel={submitButtonLabel}
          goToTaskAction={goToTaskAction}
        />
      </div>
    </div>
  );
}
