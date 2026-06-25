import { CheckSquare, Square, Loader2, AlertCircle } from "lucide-react";
import { EmptyState } from "../shared/EmptyState.jsx";
import { StatusBadge } from "../shared/StatusBadge.jsx";
import { cn } from "../../lib/utils.js";

// =============================================================================
// MiniTaskChecklist — reusable mini-task checklist with role-based permissions.
//
// Props:
//   miniTasks     — array of mini task objects
//   editable      — boolean (true for expert, false for client)
//   onToggle      — (taskId, miniTaskId) => void  (only called when editable)
//   compact       — boolean (true for inline card display, false for full detail)
//   emptyMessage  — custom empty message (optional)
//   loading       — boolean, shows skeleton rows
// =============================================================================

export function MiniTaskChecklist({
  miniTasks = [],
  editable = false,
  onToggle,
  compact = true,
  emptyMessage,
  loading = false,
}) {
  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-2 rounded-lg bg-gray-50"
          >
            <div className="w-4 h-4 rounded bg-gray-200" />
            <div className="h-3 bg-gray-200 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (!miniTasks || miniTasks.length === 0) {
    const defaultMessages = {
      expert:
        "Create mini tasks to start tracking your work.",
      client: "Expert has not created mini tasks yet.",
    };
    return (
      <div className="py-4 text-center">
        <p className="text-sm text-gray-400 italic">
          {emptyMessage || (editable ? defaultMessages.expert : defaultMessages.client)}
        </p>
      </div>
    );
  }

  const completedCount = miniTasks.filter(
    (mt) =>
      (mt.isCompleted === true || mt.status === "done" || mt.status === "completed") &&
      mt.status !== "needs_revision"
  ).length;
  const allComplete = completedCount === miniTasks.length && miniTasks.length > 0;

  return (
    <div className={cn("space-y-1", !compact && "space-y-2")}>
      {allComplete && (
        <div className="flex items-center gap-2 text-sm text-brand-green font-medium mb-2 px-1">
          <CheckSquare className="w-4 h-4" />
          All {miniTasks.length} mini tasks completed
        </div>
      )}
      {miniTasks.map((mini, idx) => {
        const isDone =
          (mini.isCompleted === true ||
            mini.status === "done" ||
            mini.status === "completed") &&
          mini.status !== "needs_revision";
        const needsRevision = mini.status === "needs_revision";

        return (
          <div
            key={mini.id || idx}
            className={cn(
              "flex items-start gap-3 rounded-lg transition-colors",
              compact ? "p-1.5" : "p-3 hover:bg-gray-50/50 rounded-lg transition-colors",
              editable && !isDone && "hover:bg-gray-50"
            )}
          >
            {/* Checkbox */}
            {editable ? (
              <button
                type="button"
                onClick={() => onToggle?.(mini.id)}
                className={cn(
                  "flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                  isDone
                    ? "bg-brand-green border-brand-green text-white"
                    : "border-gray-300 hover:border-brand-primary/50"
                )}
                title={isDone ? "Mark as incomplete" : "Mark as complete"}
              >
                {isDone && (
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>
            ) : (
              <div
                className={cn(
                  "flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center",
                  isDone
                    ? "bg-brand-green border-brand-green text-white"
                    : "border-gray-200 bg-gray-50"
                )}
              >
                {isDone && (
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <span
                className={cn(
                  "text-sm",
                  isDone
                    ? "text-gray-400 line-through decoration-gray-300"
                    : "text-gray-800"
                )}
              >
                {mini.title}
              </span>
              {!compact && mini.description && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {mini.description}
                </p>
              )}
              {!compact && mini.estimatedTime && (
                <p className="text-sm text-gray-400 mt-0.5">
                  Est: {mini.estimatedTime}
                </p>
              )}
              {/* Revision info */}
              {needsRevision && (
                <div className="mt-1.5 p-2 bg-orange-50 border border-orange-200 rounded-md">
                  <p className="text-sm font-semibold text-orange-700 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Needs Revision
                  </p>
                  {mini.revisionReason && (
                    <p className="text-sm text-orange-600 mt-0.5">
                      Reason: {mini.revisionReason}
                    </p>
                  )}
                  {mini.revisionRequestedBy && (
                    <p className="text-sm text-orange-500 mt-0.5">
                      Requested by: {mini.revisionRequestedBy}
                    </p>
                  )}
                  {mini.revisionRequestedAt && (
                    <p className="text-sm text-orange-400 mt-0.5">
                      {new Date(mini.revisionRequestedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              )}
              {isDone && mini.completedAt && (
                <div className="mt-1">
                  <p className="text-sm text-brand-green">
                    Completed:{" "}
                    {new Date(mini.completedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  {mini.completedBy && (
                    <p className="text-sm text-brand-green/70">
                      by {mini.completedBy}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Status indicator (compact mode) */}
            {compact && isDone && (
              <span className="flex-shrink-0 text-sm text-brand-green font-medium">
                Done
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
