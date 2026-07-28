import { useNavigate } from "react-router";
import {
  CheckCircle2,
  Clock3,
  Calendar,
  ArrowRight,
  AlertTriangle,
  ExternalLink,
  FileText,
  X,
  Check,
  Send,
  RotateCcw,
  Download,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { StatusBadge } from "../shared/StatusBadge.jsx";
import { Button } from "../ui/button.jsx";
import { Skeleton } from "../ui/skeleton.jsx";
import { cn } from "../../lib/utils.js";
import { getDeadlineInfo } from "../../lib/projectTimelineStore.js";
import { getDeadlineStatusClass } from "../../lib/projectStatusConfig.js";
import { useState } from "react";
import { toast } from "sonner";
import { api, enrichFileUrl } from "../../../services/api.js";

// Helper to parse productFile stored as JSON string { url, name } or plain text
function resolveProductFile(productFile) {
  if (!productFile) return null;
  if (typeof productFile === "object" && (productFile.url || productFile.path)) {
    const rawUrl = productFile.url || productFile.path;
    return {
      url: rawUrl.startsWith("http") ? rawUrl : enrichFileUrl(rawUrl),
      name: productFile.name || rawUrl.split("/").pop(),
    };
  }
  try {
    const parsed = JSON.parse(productFile);
    if (parsed && (parsed.url || parsed.fileUrl || parsed.path)) {
      const fileUrl = parsed.url || parsed.fileUrl || parsed.path;
      return {
        url: fileUrl.startsWith("http") ? fileUrl : enrichFileUrl(fileUrl),
        name: parsed.name || parsed.originalName || fileUrl.split("/").pop(),
      };
    }
  } catch {
    // Legacy plain text
  }
  const cleanStr = String(productFile).trim();
  if (!cleanStr) return null;
  return {
    url: cleanStr.startsWith("http") ? cleanStr : enrichFileUrl(cleanStr),
    name: cleanStr.split("/").pop().split("\\").pop(),
  };
}

async function downloadFileBlob(rawUrl, fileName) {
  if (!rawUrl || rawUrl === "#") return;
  try {
    const response = await fetch(rawUrl);
    const blob = await response.blob();
    const dlUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = dlUrl;
    a.download = fileName || rawUrl.split("/").pop() || "file";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(dlUrl);
  } catch {
    window.open(rawUrl, "_blank");
  }
}
import { useAuth } from "../../hooks/useAuth.js";
import { notifyTaskRevisionRequested, notifyTaskApproved, notifyUrgentSubmissionRequested } from "../../../services/notificationHelper.js";
import { getTaskDeadlineInfo, isTaskOverdue, requestExtension, getExtensionRequest, clearExtensionRequest, extendAllDeadlines, storeExtensionApproval } from "../../lib/taskDeadlineUtils.js";

// =============================================================================
// TaskProgressCard - individual task/milestone card within the project progress view.
//
// Displays high-level summary only (title, status, description, deadline, progress).
// Mini tasks are shown exclusively in the TaskDetailPage via "View Details".
//
// Props:
//   task              - task object with derived progress and status fields
//   role              - "client" | "expert"
//   projectId         - parent project ID (for navigation)
//   loading           - boolean
// =============================================================================

export function TaskProgressCard({
  task,
  role = "client",
  projectId,
  projectStatus,
  loading = false,
  onToggleMiniTask,
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isProjectClosed = ["completed", "cancelled", "cancel_done", "stopped", "terminated"].includes((projectStatus || "").toLowerCase());

  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [isDeclineDisabled, setIsDeclineDisabled] = useState(false);
  const [showViewProductModal, setShowViewProductModal] = useState(false);
  const [isDeclineUnlocked, setIsDeclineUnlocked] = useState(false);
  const [extendDays, setExtendDays] = useState("");
  const [extending, setExtending] = useState(false);

  const handleApproveTask = async () => {
    try {
      const clientName = "Client";
      await api.projects.reviewTask(task.id, { approve: true, feedbackContent: "", feedbackSenderId: user?.id || "00000000-0000-0000-0000-000000000000" });

      notifyTaskApproved({
        expertUserId: task.assignedTo,
        clientName: clientName,
        taskTitle: task.title,
        projectId,
        taskId: task.id,
      }).catch(() => { });

      toast.success("Milestone approved successfully!");
      setShowViewProductModal(false);
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    } catch (err) {
      toast.error("Failed to approve milestone.");
    }
  };

  const handleRequestProduct = async () => {
    try {
      const clientName = "Client";
      await api.projects.updateTaskStatus(task.id, "waiting_expert_product");

      notifyUrgentSubmissionRequested({
        expertUserId: task.assignedTo,
        clientName: clientName,
        taskTitle: task.title,
        projectId,
        taskId: task.id,
      }).catch(() => { });

      toast.success("Deliverable requested. The expert has been notified urgently!");
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    } catch (err) {
      toast.error("Failed to request deliverable.");
    }
  };

  const handleDeclineFromModal = () => {
    setIsDeclineUnlocked(true);
    setShowDeclineForm(true);
    setShowViewProductModal(false);
    toast.info("Decline button unlocked. Please enter the reason below.");
  };

  const handleSendDecline = async () => {
    if (!declineReason.trim()) return;
    try {
      const clientName = "Client";
      await api.projects.reviewTask(task.id, { approve: false, feedbackContent: declineReason.trim(), feedbackSenderId: user?.id || "00000000-0000-0000-0000-000000000000" });

      notifyTaskRevisionRequested({
        expertUserId: task.assignedTo,
        clientName: clientName,
        taskTitle: task.title,
        feedback: declineReason.trim(),
        projectId,
        taskId: task.id,
      }).catch(() => { });

      toast.success("Declined and revision feedback sent successfully!");
      setShowDeclineForm(false);
      setIsDeclineUnlocked(false);
      setDeclineReason("");

      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    } catch (err) {
      toast.error("Failed to send decline feedback.");
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-5 space-y-3">
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

  // Computed deadline from taskDeadlineUtils (after escrow)
  const taskDeadlineData = projectId ? getTaskDeadlineInfo(projectId, task.id, null) : null;
  const computedDeadline = taskDeadlineData?.deadline || task.deadline;
  const computedDeadlineInfo = computedDeadline ? getDeadlineInfo(computedDeadline) : null;
  const isOverdue = projectId ? isTaskOverdue(projectId, task.id, null) : false;

  // Extension request state
  const extendRequest = projectId ? getExtensionRequest(projectId, task.id) : null;
  const isWaitingExtension = extendRequest === "waiting";

  const isUrgent = task?.urgentRequest === true;
  const isDone = task.displayStatus === "Done";

  const isWaitingForApproval =
    task.status?.toLowerCase() === "pending approval" ||
    task.status?.toLowerCase() === "pending_approval" ||
    task.status?.toLowerCase() === "waiting_for_approval" ||
    task.status?.toLowerCase() === "waiting for approval" ||
    task.status?.toLowerCase() === "pending_review" ||
    task.status?.toLowerCase() === "pending review" ||
    task.displayStatus === "Waiting For Approval";
  const isChecklistCompleted = task.displayStatus === "Checklist Completed" || task.status === "checklist_completed";
  const isRework = task.displayStatus === "Rework" || task.status === "rework";
  const isWaitingForExpertProduct = task.displayStatus === "Waiting for Expert Product" || task.status === "waiting_expert_product";
  const hasMainProduct = !!(task.productLink || task.productFile);
  const hasEvidence = !!task.handoverEvidence;
  const allMinisDone = task.completedMiniTasks === task.totalMiniTasks && task.totalMiniTasks > 0;
  const productRequested = task?.urgentRequest === true || task?.productRequested === true;

  return (
    <div className={cn(
      "bg-card rounded-xl border p-5 card-hover",
      isUrgent
        ? "border-destructive/30 bg-destructive-light shadow-sm"
        : "border-border",
      task.displayStatus === "Done" && "border-success/20 bg-success/[0.02]"
    )}>
      {/* Task header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap text-left">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Task Title:</span>
            <h3 className={`font-semibold text-base ${task.displayStatus === "Done" ? "text-foreground/60" : "text-foreground"
              }`}>
              {task.title}
            </h3>
            <StatusBadge
              status={task.displayStatus}
              entity="task"
              className="flex-shrink-0"
            />
            {isUrgent && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive-light text-destructive border border-destructive/20 flex items-center gap-1 flex-shrink-0">
                <AlertTriangle className="w-3 h-3" />
                Urgent Request
              </span>
            )}
          </div>
        </div>
        <span className="text-sm font-medium text-primary font-mono flex-shrink-0">
          {task.progress}%
        </span>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Progress bar */}
      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden mb-3">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            task.progress >= 100 ? "bg-gradient-to-r from-success to-success" :
              task.progress > 0 ? "bg-gradient-to-r from-accent to-accent-hover" :
                "bg-muted"
          )}
          style={{ width: `${task.progress}%` }}
        />
      </div>

      {/* Mini task stats */}
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span>
              {task.completedMiniTasks}/{task.totalMiniTasks} Minitasks
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock3 className="w-4 h-4 text-primary" />
            <span>{task.progress}% completed</span>
          </div>
        </div>
      </div>

      {task.miniTasks && task.miniTasks.length > 0 && (
        <div className="mt-3 p-3 bg-secondary/40 border border-border/80 rounded-lg space-y-2 text-left animate-fade-in mb-3">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Minitask Checklist:</span>
          <div className="space-y-2">
            {task.miniTasks.map((mt, mtIdx) => {
              const isMtCompleted = mt.isCompleted || mt.status === "completed" || mt.status === "done";
              return (
                <div key={mt.id || mtIdx} className="flex items-center justify-between text-xs gap-3 py-0.5">
                  <span className={cn(
                    "font-medium leading-tight",
                    isMtCompleted ? "text-foreground/55" : "text-foreground"
                  )}>
                    {mt.title || `Minitask #${mtIdx + 1}`}
                  </span>
                  <div className="flex-shrink-0">
                    {isMtCompleted ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-success/10 text-success rounded font-semibold text-[10px]">
                        <Check className="w-3 h-3" /> Done
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-destructive/10 text-destructive rounded font-semibold text-[10px]">
                        <X className="w-3 h-3" /> Pending
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* Client vs Expert Actions */}
      <div className="pt-3 border-t border-border">
        {role === "expert" ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Always render View Details button for Expert */}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(`/${role}/projects/${projectId}/tasks/${task.id}`)
              }
              className="cursor-pointer border-border hover:bg-secondary flex items-center gap-1.5"
            >
              <ArrowRight className="w-4 h-4" />
              View Details
            </Button>


            <div className="flex items-center gap-2">
              {/* Expert: Evidence submitted -> Checklist Completed static */}
              {isChecklistCompleted && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-warning-light border border-warning/20 rounded-lg text-xs font-medium text-warning">
                  <CheckCircle2 className="w-4 h-4" />
                  Evidence Submitted Done
                </div>
              )}

              {/* Expert: Product requested -> Submit Product */}
              {productRequested && !isWaitingForApproval && !isDone && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() =>
                    navigate(`/${role}/projects/${projectId}/tasks/${task.id}`)
                  }
                  className="bg-warning-light text-primary-foreground hover:bg-warning cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  Submit Product
                </Button>
              )}

              {/* Expert: Rework -> Resubmit Product */}
              {isRework && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() =>
                    navigate(`/${role}/projects/${projectId}/tasks/${task.id}`)
                  }
                  className="bg-warning-light text-primary-foreground hover:bg-warning cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  Resubmit Product
                </Button>
              )}

              {/* Expert: Waiting for Approval -> static */}
              {isWaitingForApproval && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-warning-light border border-warning/30 rounded-lg text-xs font-medium text-warning">
                  <Clock3 className="w-4 h-4" />
                  Waiting for Client Approval
                </div>
              )}

              {/* Expert: Done -> completed */}
              {isDone && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-success-light border border-success/20 rounded-lg text-xs font-medium text-success">
                  <CheckCircle2 className="w-4 h-4" />
                  Task Completed
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Client: Checklist Completed or Pending Approval without product -> Quick Accept + Request Product */}
            {(isChecklistCompleted || (isWaitingForApproval && !hasMainProduct)) && !productRequested && (
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleApproveTask}
                  className="h-9 px-4 bg-success hover:bg-success/90 text-success-foreground text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Quick Accept
                </button>
                <button
                  type="button"
                  onClick={handleRequestProduct}
                  className="h-9 px-4 bg-card border border-warning/30 hover:bg-warning-light text-foreground text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Clock3 className="w-4 h-4 text-warning" />
                  Request Product
                </button>
              </div>
            )}

            {/* Client: Checklist Completed & product requested -> waiting */}
            {isChecklistCompleted && productRequested && (
              <div className="flex items-center justify-end p-3 bg-warning-light border border-warning/20 rounded-lg text-sm font-medium gap-2 shadow-sm">
                <Clock3 className="w-4 h-4 text-warning animate-pulse" />
                Waiting for Expert to submit product...
              </div>
            )}

            {/* Client: Waiting for Expert Product -> static message */}
            {isWaitingForExpertProduct && (
              <div className="flex items-center justify-end p-3 bg-warning-light border border-warning/20 rounded-lg text-sm font-medium gap-2 shadow-sm">
                <Clock3 className="w-4 h-4 text-warning animate-pulse" />
                Waiting for Expert to submit product...
              </div>
            )}

            {/* Client: Waiting For Approval WITH deliverables -> View Product */}
            {isWaitingForApproval && hasMainProduct && (
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowViewProductModal(true)}
                  className="h-9 px-4 bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  View Product
                </button>
              </div>
            )}

            {/* Client: Rework -> static wait message */}
            {isRework && (
              <div className="flex items-center justify-end p-3 bg-warning-light border border-warning/20 rounded-lg text-sm font-medium gap-2 shadow-sm">
                <RotateCcw className="w-4 h-4 text-warning" />
                Waiting for Expert to submit new product...
              </div>
            )}

            {/* Client: Done -> completed */}
            {isDone && (
              <div className="flex items-center justify-end p-3 bg-success-light border border-success/20 rounded-lg text-sm font-medium gap-2 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-success" />
                Task Completed
              </div>
            )}

            {/* Decline/Needs Revision Feedback Form */}
            {showDeclineForm && (
              <div className="bg-destructive-light border border-destructive/20 rounded-lg p-3 space-y-2 mt-2 text-left">
                <label className="block text-xs font-semibold text-destructive">
                  Decline Reason (Feedback):
                </label>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Enter details for decline (e.g. deliverable has layout bugs on mobile...)"
                  rows={3}
                  className="w-full text-sm border border-destructive/20 rounded-lg p-2.5 bg-card focus:outline-none focus:ring-1 focus:ring-destructive/40 focus:border-destructive/40 resize-none"
                />
                <div className="flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeclineForm(false);
                      setIsDeclineUnlocked(false);
                      setDeclineReason("");
                    }}
                    className="px-3 py-1.5 border border-border text-foreground rounded-lg hover:bg-secondary font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!declineReason.trim()}
                    onClick={handleSendDecline}
                    className="px-3 py-1.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    Submit Feedback
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Product Deliverables Modal */}
      {showViewProductModal && (
        <div data-modal-overlay className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all animate-fade-in">
          <div className="bg-card rounded-xl border border-border shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all scale-100 animate-zoom-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-secondary border-b border-border">
              <div className="text-left">
                <h3 className="text-lg font-semibold text-foreground">Deliverables for: {task.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Details of files and links provided by the expert</p>
              </div>
              <button
                onClick={() => setShowViewProductModal(false)}
                className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Task-level deliverables */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2 text-left">
                  <FileText className="w-4 h-4 text-primary" />
                  Main Deliverable of Milestone
                </h4>
                {(!task.productLink && !task.productFile) ? (
                  <p className="text-sm text-muted-foreground italic bg-secondary p-4 rounded-lg border border-border text-left">No file or link submitted yet for this milestone.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {task.productLink && (
                      <div className="flex flex-col p-3 bg-primary-light rounded-lg border border-primary/10 hover:bg-primary-light/80 transition-colors text-left">
                        <span className="text-xs font-semibold text-primary uppercase">Product Link</span>
                        <a
                          href={task.productLink.startsWith("http") ? task.productLink : `https://${task.productLink}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary font-medium mt-1 truncate hover:underline flex items-center gap-1"
                        >
                          {task.productLink}
                          <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                        </a>
                      </div>
                    )}
                    {task.productFile && (() => {
                      const resolved = resolveProductFile(task.productFile);
                      if (!resolved) return null;
                      return (
                        <div className="flex flex-col p-3 bg-secondary rounded-lg border border-border text-left">
                          <span className="text-xs font-semibold text-muted-foreground uppercase">Attached File</span>
                          <div className="flex items-center justify-between gap-2 mt-1">
                            <span className="text-sm text-foreground font-medium font-mono truncate" title={resolved.name}>
                              {resolved.name}
                            </span>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <a
                                href={resolved.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                                title="View file"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                              <button
                                type="button"
                                onClick={() => downloadFileBlob(resolved.url, resolved.name)}
                                className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors cursor-pointer"
                                title="Download file"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-secondary border-t border-border">
              {isWaitingForApproval ? (
                <>
                  <button
                    type="button"
                    onClick={handleDeclineFromModal}
                    className="px-5 py-2.5 bg-destructive-light hover:bg-destructive/10 text-destructive font-semibold rounded-lg text-sm transition-colors border border-destructive/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    Decline
                  </button>
                  <button
                    type="button"
                    onClick={handleApproveTask}
                    className="px-5 py-2.5 bg-success hover:bg-success/90 text-success-foreground font-semibold rounded-lg text-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Accept
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowViewProductModal(false)}
                  className="px-5 py-2.5 bg-secondary hover:bg-muted text-foreground font-semibold rounded-lg text-sm transition-colors border border-border cursor-pointer"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
