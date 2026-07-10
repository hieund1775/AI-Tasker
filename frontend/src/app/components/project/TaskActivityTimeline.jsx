import { useEffect, useState, useCallback } from "react";
import { Clock, CheckCircle2, FileText, Edit3, Send, ThumbsUp, RotateCcw, Unlock, AlertTriangle } from "lucide-react";
import { getTaskAuditLogs, formatAuditMessage } from "../../lib/auditTrail.js";
import { EmptyState } from "../shared/EmptyState.jsx";
import { safeArray, safeDateTimeFormat } from "../../lib/safety.js";
import { cn } from "../../lib/utils.js";

// =============================================================================
// TaskActivityTimeline — chronological activity feed for a single task.
//
// Props:
//   taskId    — the task to show activity for
//   loading   — boolean (optional)
//   compact   — boolean, show compact version (optional)
// =============================================================================

const ACTION_ICONS = {
  mini_task_created: Edit3,
  mini_task_completed: CheckCircle2,
  mini_tasks_confirmed: FileText,
  mini_tasks_unlocked: Unlock,
  task_submitted_for_review: Send,
  task_approved: ThumbsUp,
  task_revision_requested: RotateCcw,
  task_reopened: RotateCcw,
  mini_task_revision_requested: RotateCcw,
  urgent_submission_requested: AlertTriangle,
};

const ACTION_COLORS = {
  mini_task_created: "bg-primary-light text-primary",
  mini_task_completed: "bg-success-light text-success",
  mini_tasks_confirmed: "bg-accent-light text-accent",
  mini_tasks_unlocked: "bg-warning-light text-warning",
  task_submitted_for_review: "bg-primary-light text-primary",
  task_approved: "bg-success-light text-success",
  task_revision_requested: "bg-destructive-light text-destructive",
  task_reopened: "bg-destructive-light text-destructive",
  mini_task_revision_requested: "bg-destructive-light text-destructive",
  urgent_submission_requested: "bg-destructive-light text-destructive",
};

export function TaskActivityTimeline({ taskId, loading = false, compact = false }) {
  const [logs, setLogs] = useState([]);

  const loadLogs = useCallback(() => {
    if (!taskId) return;
    const entries = getTaskAuditLogs(taskId);
    setLogs(entries);
  }, [taskId]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Listen for DB updates to refresh timeline
  useEffect(() => {
    const handleDbUpdate = () => {
      loadLogs();
    };
    window.addEventListener("aitasker_db_update", handleDbUpdate);
    return () => {
      window.removeEventListener("aitasker_db_update", handleDbUpdate);
    };
  }, [loadLogs]);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-secondary flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-secondary rounded w-1/3" />
              <div className="h-3 bg-secondary rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="py-4">
        <EmptyState
          icon={Clock}
          title="No activity yet"
          description="Task actions will appear here as they happen."
          size="sm"
        />
      </div>
    );
  }

  return (
    <div className={cn("space-y-0", compact ? "max-h-64 overflow-y-auto" : "max-h-96 overflow-y-auto")}>
      {safeArray(logs).map((entry, idx) => {
        const IconComponent = ACTION_ICONS[entry.action] || FileText;
        const colorClasses = ACTION_COLORS[entry.action] || "bg-secondary text-muted-foreground";
        const isLast = idx === logs.length - 1;

        return (
          <div key={entry.id} className="flex gap-3">
            {/* Timeline connector */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                  colorClasses
                )}
              >
                <IconComponent className="w-3.5 h-3.5" />
              </div>
              {!isLast && (
                <div className="w-px flex-1 bg-border my-1" />
              )}
            </div>

            {/* Content */}
            <div className={cn("flex-1 min-w-0", !isLast && "pb-4")}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-foreground">
                  {entry.actorName || entry.actor}
                </span>
                <span className="text-sm text-muted-foreground">
                  {safeDateTimeFormat(entry.timestamp, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {formatAuditMessage(entry)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
