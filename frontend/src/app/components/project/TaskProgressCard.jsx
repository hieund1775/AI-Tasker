import { useNavigate } from "react-router";
import { CheckCircle2, Clock3, Calendar, ArrowRight, AlertTriangle } from "lucide-react";
import { StatusBadge } from "../shared/StatusBadge.jsx";
import { Button } from "../ui/button.jsx";
import { Skeleton } from "../ui/skeleton.jsx";
import { cn } from "../../lib/utils.js";
import { getDeadlineInfo } from "../../lib/projectTimelineStore.js";
import { getDeadlineStatusClass } from "../../lib/projectStatusConfig.js";

// =============================================================================
// TaskProgressCard — individual task/milestone card within the project progress view.
//
// Displays high-level summary only (title, status, description, deadline, progress).
// Mini tasks are shown exclusively in the TaskDetailPage via "View Details".
//
// Props:
//   task              — task object with derived progress and status fields
//   role              — "client" | "expert"
//   projectId         — parent project ID (for navigation)
//   loading           — boolean
// =============================================================================

export function TaskProgressCard({
  task,
  role = "client",
  projectId,
  loading = false,
}) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3 animate-pulse">
        <div className="flex justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3 w-64" />
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
    );
  }

  if (!task) return null;

  const deadlineText = task.deadline
    ? (() => {
        try {
          return new Date(task.deadline).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        } catch {
          return String(task.deadline);
        }
      })()
    : null;

  const deadlineInfo = task.deadline ? getDeadlineInfo(task.deadline) : null;

  const isUrgent = task?.urgentRequest === true;

  return (
    <div className={cn(
      "bg-white rounded-2xl border p-5 transition-colors",
      isUrgent
        ? "border-red-300 bg-red-50 shadow-sm"
        : "border-gray-100 hover:border-gray-200 shadow-sm"
    )}>
      {/* Task header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-base">
              {task.title}
            </h3>
            <StatusBadge
              status={task.displayStatus}
              entity="task"
              className="flex-shrink-0"
            />
            {isUrgent && (
              <span className="px-2.5 py-0.5 rounded-full text-[13px] font-medium bg-red-100 text-red-600 border border-red-200 flex items-center gap-1 flex-shrink-0">
                <AlertTriangle className="w-3 h-3" />
                Urgent Request
              </span>
            )}
          </div>
        </div>
        <span className="text-sm font-medium text-brand-primary font-mono flex-shrink-0">
          {task.progress}%
        </span>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Deadline */}
      {deadlineText && (
        <div className="flex items-center gap-1.5 text-sm mb-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            Deadline: <span className="text-gray-700">{deadlineText}</span>
          </div>
          {deadlineInfo && deadlineInfo.urgency !== "normal" && (
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-[13px] font-medium flex items-center gap-1",
                getDeadlineStatusClass(deadlineInfo.urgency)
              )}
            >
              {deadlineInfo.urgency === "overdue" && (
                <AlertTriangle className="w-3 h-3" />
              )}
              {deadlineInfo.remainingText}
            </span>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-3">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            task.progress > 0
              ? "bg-brand-primary"
              : "bg-gray-200"
          )}
          style={{ width: `${task.progress}%` }}
        />
      </div>

      {/* Mini task stats */}
      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-brand-green" />
          <span>
            {task.completedMiniTasks}/{task.totalMiniTasks} mini tasks
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock3 className="w-4 h-4 text-brand-primary" />
          <span>{task.progress}% completed</span>
        </div>
      </div>

      {/* View Details button */}
      <div className="pt-3 border-t border-gray-100 flex justify-end">
        <Button
          variant="default"
          size="sm"
          onClick={() =>
            navigate(
              `/${role}/projects/${projectId}/tasks/${task.id}`
            )
          }
        >
          <ArrowRight className="w-4 h-4" />
          View Details
        </Button>
      </div>
    </div>
  );
}
