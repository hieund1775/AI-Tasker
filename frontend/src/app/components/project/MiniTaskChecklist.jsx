import { CheckSquare, Square, Loader2, AlertCircle, Edit3 } from "lucide-react";
import { EmptyState } from "../shared/EmptyState.jsx";
import { StatusBadge } from "../shared/StatusBadge.jsx";
import { cn } from "../../lib/utils.js";
import { safeDateTimeFormat } from "../../lib/safety.js";
import { useState } from "react";
import { toast } from "sonner";

// =============================================================================
// MiniTaskChecklist — reusable mini-task checklist with role-based permissions.
//
// Props:
//   miniTasks     — array of mini task objects
//   editable      — boolean (true for expert, false for client)
//   onToggle      — (taskId, miniTaskId) => void  (only called when editable)
//   onUpdate      — (miniTaskId, updates) => void (new prop for inline edit)
//   compact       — boolean (true for inline card display, false for full detail)
//   emptyMessage  — custom empty message (optional)
//   loading       — boolean, shows skeleton rows
// =============================================================================

export function MiniTaskChecklist({
  miniTasks = [],
  editable = false,
  onToggle,
  onUpdate,
  compact = true,
  emptyMessage,
  loading = false,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editFile, setEditFile] = useState("");

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-2 rounded-lg bg-secondary"
          >
            <div className="w-4 h-4 rounded bg-muted" />
            <div className="h-3 bg-muted rounded w-3/4" />
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
        <p className="text-sm text-muted-foreground italic">
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

  const startEditing = (mini) => {
    setEditingId(mini.id);
    setEditTitle(mini.title || "");
    setEditDesc(mini.description || "");
    setEditLink(mini.productLink || "");
    setEditFile(mini.productFile || "");
  };

  const handleSave = async (miniId) => {
    if (!editTitle.trim()) {
      toast.error("Tiêu đề không được để trống!");
      return;
    }
    try {
      await onUpdate?.(miniId, {
        title: editTitle.trim(),
        description: editDesc.trim(),
        productLink: editLink.trim() || null,
        productFile: editFile.trim() || null,
      });
      toast.success("Cập nhật MiniTask thành công!");
      setEditingId(null);
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    } catch (err) {
      toast.error("Không thể cập nhật MiniTask.");
    }
  };

  return (
    <div className={cn("space-y-1", !compact && "space-y-2")}>
      {allComplete && (
        <div className="flex items-center gap-2 text-sm text-success font-medium mb-2 px-1">
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
        const isEditingThis = editingId === mini.id;

        return (
          <div
            key={mini.id || idx}
            className={cn(
              "flex items-start gap-3 rounded-lg transition-colors border border-transparent",
              compact ? "p-1.5" : "p-3 hover:bg-secondary/50 rounded-lg",
              editable && !isDone && !isEditingThis && "hover:bg-secondary"
            )}
          >
            {/* Checkbox (only show when not editing) */}
            {!isEditingThis && (
              editable ? (
                <button
                  type="button"
                  onClick={() => onToggle?.(mini.id)}
                  className={cn(
                    "flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                    isDone
                      ? "bg-success border-success text-success-foreground"
                      : "border-input hover:border-primary/50"
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
                      ? "bg-success border-success text-success-foreground"
                      : "border-border bg-muted"
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
              )
            )}

            {/* Content / Edit Form */}
            {isEditingThis ? (
              <div className="flex-1 min-w-0 space-y-3 p-3 bg-secondary rounded-lg border border-border text-left">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Tiêu đề MiniTask</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-ring bg-input-background"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Mô tả</label>
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-1.5 text-sm border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-ring resize-none bg-input-background"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Link sản phẩm</label>
                    <input
                      type="text"
                      value={editLink}
                      onChange={(e) => setEditLink(e.target.value)}
                      placeholder="https://example.com/product"
                      className="w-full px-3 py-1.5 text-sm border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-ring bg-input-background"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Tên file đính kèm</label>
                    <input
                      type="text"
                      value={editFile}
                      onChange={(e) => setEditFile(e.target.value)}
                      placeholder="artifact_v1.zip"
                      className="w-full px-3 py-1.5 text-sm border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-ring bg-input-background"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 text-xs pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="px-2.5 py-1.5 border border-border text-foreground rounded-md hover:bg-secondary font-semibold"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave(mini.id)}
                    className="px-2.5 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary-hover font-semibold"
                  >
                    Lưu
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 min-w-0">
                <span
                  className={cn(
                    "text-sm",
                    isDone
                      ? "text-muted-foreground line-through decoration-muted-foreground/30"
                      : "text-foreground font-medium"
                  )}
                >
                  {mini.title}
                </span>
                {!compact && mini.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {mini.description}
                  </p>
                )}
                {!compact && mini.estimatedTime && (
                  <p className="text-sm text-muted-foreground mt-0.5 font-mono">
                    Est: {mini.estimatedTime}
                  </p>
                )}

                {/* Deliverables details */}
                {(mini.productLink || mini.productFile) && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs bg-secondary p-2 rounded-lg border border-border w-fit">
                    {mini.productLink && (
                      <a
                        href={mini.productLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline font-semibold flex items-center gap-0.5"
                      >
                        Link sản phẩm
                      </a>
                    )}
                    {mini.productFile && (
                      <span className="text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded border border-border">
                        File: {mini.productFile}
                      </span>
                    )}
                  </div>
                )}

                {/* Revision info */}
                {needsRevision && (
                  <div className="mt-1.5 p-2 bg-warning-light border border-warning/20 rounded-md text-left">
                    <p className="text-sm font-semibold text-warning flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Needs Revision
                    </p>
                    {mini.revisionReason && (
                      <p className="text-sm text-warning mt-0.5">
                        Reason: {mini.revisionReason}
                      </p>
                    )}
                    {mini.revisionRequestedBy && (
                      <p className="text-sm text-warning mt-0.5">
                        Requested by: {mini.revisionRequestedBy}
                      </p>
                    )}
                    {mini.revisionRequestedAt && (
                      <p className="text-sm text-warning/70 mt-0.5 font-mono">
                        {safeDateTimeFormat(mini.revisionRequestedAt, {
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
                  <div className="mt-1 text-left">
                    <p className="text-sm text-success">
                      Completed:{" "}
                      <span className="font-mono">
                        {safeDateTimeFormat(mini.completedAt, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </p>
                    {mini.completedBy && (
                      <p className="text-sm text-success/70">
                        by {mini.completedBy}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Action buttons (Sửa / Done tag) */}
            {!isEditingThis && (
              <div className="flex-shrink-0 flex items-center gap-2">
                {editable && !isDone && (
                  <button
                    type="button"
                    onClick={() => startEditing(mini)}
                    className="text-xs font-semibold text-accent hover:text-accent-hover px-2.5 py-1 border border-border rounded-lg bg-card transition-colors cursor-pointer"
                  >
                    Sửa
                  </button>
                )}
                {compact && isDone && (
                  <span className="text-sm text-success font-medium">
                    Done
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
