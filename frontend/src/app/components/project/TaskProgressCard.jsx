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
} from "lucide-react";
import { StatusBadge } from "../shared/StatusBadge.jsx";
import { Button } from "../ui/button.jsx";
import { Skeleton } from "../ui/skeleton.jsx";
import { cn } from "../../lib/utils.js";
import { getDeadlineInfo, getRemainingTimelineText } from "../../lib/projectTimelineStore.js";
import { getDeadlineStatusClass } from "../../lib/projectStatusConfig.js";
import { useState } from "react";
import { toast } from "sonner";
import {
  requestTaskRevision,
  approveTaskSubmission,
  requestUrgentSubmission,
  updateTask,
  listProjects,
} from "../../../data/mockDatabase.js";
import {
  notifyTaskRevisionRequested,
  notifyTaskApproved,
  notifyUrgentSubmissionRequested,
} from "../../../services/notificationHelper.js";

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
  readOnly = false,
  onToggleMiniTask,
}) {
  const navigate = useNavigate();

  const project = listProjects().find((p) => p.id === projectId);
  const ucIndex = Number(task?.useCaseIndex);
  const useCase = project?.useCases?.[ucIndex] || null;
  const displayTitle = task.title || (useCase ? (useCase.name || useCase.nameAndDeadline) : "Task");
  const displayDescription = task.description || (useCase ? useCase.description : "");

  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [isDeclineDisabled, setIsDeclineDisabled] = useState(false);
  const [showViewProductModal, setShowViewProductModal] = useState(false);
  const [isDeclineUnlocked, setIsDeclineUnlocked] = useState(false);

  // Inline editing states for expert
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionInput, setDescriptionInput] = useState(task?.description || "");

  const handleSaveDescription = async () => {
    try {
      updateTask(task.id, { description: descriptionInput.trim() });
      setIsEditingDescription(false);
      toast.success("Cập nhật mô tả nhiệm vụ thành công!");
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    } catch (err) {
      toast.error("Không thể cập nhật mô tả.");
    }
  };

  const handleToggleTask = () => {
    if (role !== "expert" || readOnly) return;
    const isCurrentlyCompleted = task.progress === 100;
    const newStatus = isCurrentlyCompleted ? "not_started" : "completed";
    const newMiniTasks = (task.miniTasks || []).map((mt) => ({
      ...mt,
      isCompleted: !isCurrentlyCompleted,
      status: !isCurrentlyCompleted ? "done" : "pending",
      completedAt: !isCurrentlyCompleted ? new Date().toISOString() : null,
      completedBy: !isCurrentlyCompleted ? (task.assignedTo || "Expert") : null,
    }));

    updateTask(task.id, {
      status: newStatus,
      miniTasks: newMiniTasks,
      approval: newStatus === "completed" ? "Approved" : null,
    });
    window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    toast.success(isCurrentlyCompleted ? "Đã mở lại Task!" : "Đã hoàn thành toàn bộ Task!");
  };

  const handleApproveTask = async () => {
    try {
      const clientName = "Client";
      approveTaskSubmission(task.id, clientName);

      notifyTaskApproved({
        expertUserId: task.assignedTo,
        clientName: clientName,
        taskTitle: task.title,
        projectId,
        taskId: task.id,
      }).catch(() => {});

      toast.success("Milestone đã được phê duyệt thành công!");
      setShowViewProductModal(false);
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    } catch (err) {
      toast.error("Không thể phê duyệt milestone.");
    }
  };

  const handleRequestProduct = async () => {
    try {
      const clientName = "Client";
      requestUrgentSubmission(task.id, clientName);

      notifyUrgentSubmissionRequested({
        expertUserId: task.assignedTo,
        clientName: clientName,
        taskTitle: task.title,
        projectId,
        taskId: task.id,
      }).catch(() => {});

      toast.success(
        "Đã yêu cầu sản phẩm. Chuyên gia đã được thông báo khẩn cấp!",
      );
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    } catch (err) {
      toast.error("Không thể yêu cầu sản phẩm.");
    }
  };

  const handleDeclineFromModal = () => {
    setIsDeclineUnlocked(true);
    setShowDeclineForm(true);
    setShowViewProductModal(false);
    toast.info("Đã mở khóa nút từ chối. Vui lòng điền lý do ở phía dưới.");
  };

  const handleSendDecline = async () => {
    if (!declineReason.trim()) return;
    try {
      const clientName = "Client";
      requestTaskRevision(task.id, clientName, declineReason.trim());

      notifyTaskRevisionRequested({
        expertUserId: task.assignedTo,
        clientName: clientName,
        taskTitle: task.title,
        feedback: declineReason.trim(),
        projectId,
        taskId: task.id,
      }).catch(() => {});

      toast.success("Đã từ chối và gửi phản hồi chỉnh sửa thành công!");
      setShowDeclineForm(false);
      setIsDeclineUnlocked(false);
      setDeclineReason("");

      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    } catch (err) {
      toast.error("Không thể gửi phản hồi từ chối.");
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

  const isUrgent = task?.urgentRequest === true;
  const isDone = task.displayStatus === "Done";

  const isWaitingForApproval = task.status === "waiting_for_approval" || task.status === "Waiting For Approval" || task.status === "pending_review" || task.status === "Pending Review" || task.status === "pending review";
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
          <div className="flex items-center gap-2 flex-wrap">
            {/* Milestone number */}
            <span className="w-6 h-6 rounded-lg bg-accent/10 text-accent flex items-center justify-center text-xs font-bold flex-shrink-0">
              {task.order || task.id?.replace(/\D/g, "").slice(-1) || "#"}
            </span>
            <h3 className={`font-semibold text-base ${
              task.displayStatus === "Done" ? "text-foreground/60 line-through decoration-success/30" : "text-foreground"
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

      {/* Deadline */}
      {deadlineText && (
        <div className="flex items-center gap-1.5 text-sm mb-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            Deadline: <span className="text-foreground">{deadlineText}</span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[13px] font-medium bg-brand-primary-light text-brand-primary flex items-center gap-1">
            <Clock3 className="w-3 h-3 animate-pulse" />
            Còn lại: {getRemainingTimelineText(task.deadline)}
          </span>
          {deadlineInfo && deadlineInfo.urgency === "overdue" && (
            <span className="px-2 py-0.5 rounded-full text-[13px] font-medium bg-red-100 text-red-650 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Quá hạn
            </span>
          )}
        </div>
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
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-success" />
          <span>
            {task.completedMiniTasks}/{task.totalMiniTasks} mini tasks
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock3 className="w-4 h-4 text-primary" />
          <span>{task.progress}% completed</span>
        </div>
      </div>

      {/* Mini tasks / Milestones Checklist */}
      <div className="mt-4 mb-3 border-t border-gray-100 pt-3 text-left">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2.5">
          Milestones / Checklist ({task.miniTasks?.length || 0})
        </span>
        {(!task.miniTasks || task.miniTasks.length === 0) ? (
          <p className="text-xs text-gray-450 italic pl-1">Không có milestone con nào.</p>
        ) : (
          <div className="space-y-2.5">
            {task.miniTasks.map((mt) => {
              const isMtCompleted = mt.isCompleted === true || mt.status === "done" || mt.status === "completed";

              return (
                <div key={mt.id} className="p-3 bg-gray-50/50 border border-gray-200/65 rounded-xl space-y-2">
                  <div className="flex items-start gap-2.5">
                    {role === "expert" && !readOnly ? (
                      <input
                        type="checkbox"
                        checked={isMtCompleted}
                        onChange={() => {
                          if (onToggleMiniTask) {
                            onToggleMiniTask(task.id, mt.id);
                          }
                        }}
                        className="mt-0.5 rounded border-gray-300 text-brand-primary focus:ring-brand-primary h-4 w-4 cursor-pointer"
                      />
                    ) : (
                      <input
                        type="checkbox"
                        checked={isMtCompleted}
                        disabled
                        className="mt-0.5 rounded border-gray-300 text-brand-primary focus:ring-brand-primary h-4 w-4 cursor-not-allowed"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium text-gray-800 text-left",
                        isMtCompleted && "line-through text-gray-400"
                      )}>
                        {mt.title || "Milestone không tên"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {task.evidence && (
        <div className="mx-4 mb-3 p-3 bg-green-50 border border-green-200 rounded-xl text-left font-sans">
          <p className="text-xs font-bold text-green-800 flex items-center gap-1.5 mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            Bằng chứng bàn giao (Handover Evidence):
          </p>
          <p className="text-xs font-mono text-gray-800 bg-white/70 px-2 py-1.5 rounded border border-green-150 break-all leading-normal">
            {task.evidence}
          </p>
        </div>
      )}

      {/* Client vs Expert Actions */}
      <div className="pt-3 border-t border-border">
        {role === "expert" ? (
          <div className="space-y-2">
            {/* Expert: Not all mini tasks done → View Details only */}
            {!allMinisDone && !isRework && (
              <div className="flex justify-end">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() =>
                    navigate(`/${role}/projects/${projectId}/tasks/${task.id}`)
                  }
                >
                  <ArrowRight className="w-4 h-4" />
                  View Details
                </Button>
              </div>
            )}

            {/* Expert: All minis done, no evidence, no product request → Submit Evidence */}
            {allMinisDone && !hasEvidence && !productRequested && !isRework && !isWaitingForApproval && !isDone && (
              <div className="flex justify-end">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() =>
                    navigate(`/${role}/projects/${projectId}/tasks/${task.id}`)
                  }
                >
                  <ArrowRight className="w-4 h-4" />
                  View Details
                </Button>
              </div>
            )}

            {/* Expert: Evidence submitted → Checklist Completed static */}
            {isChecklistCompleted && (
              <div className="flex items-center justify-end gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm font-medium text-amber-700">
                <CheckCircle2 className="w-4 h-4" />
                Evidence Submitted ✓
              </div>
            )}

            {/* Expert: Product requested → Submit Product */}
            {productRequested && !isWaitingForApproval && !isDone && (
              <div className="flex justify-end">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() =>
                    navigate(`/${role}/projects/${projectId}/tasks/${task.id}`)
                  }
                  className="bg-amber-500 text-white hover:bg-amber-600"
                >
                  <Send className="w-4 h-4" />
                  Submit Product
                </Button>
              </div>
            )}

            {/* Expert: Rework → Resubmit Product */}
            {isRework && (
              <div className="flex justify-end">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() =>
                    navigate(`/${role}/projects/${projectId}/tasks/${task.id}`)
                  }
                  className="bg-orange-500 text-white hover:bg-orange-600"
                >
                  <RotateCcw className="w-4 h-4" />
                  Resubmit Product
                </Button>
              </div>
            )}

            {/* Expert: Waiting for Approval → static */}
            {isWaitingForApproval && (
              <div className="flex items-center justify-end gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-sm font-medium text-purple-700">
                <Clock3 className="w-4 h-4" />
                Waiting for Client Approval
              </div>
            )}

            {/* Expert: Done → completed */}
            {isDone && (
              <div className="flex items-center justify-end gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm font-medium text-green-700">
                <CheckCircle2 className="w-4 h-4" />
                Task Completed
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Client: Checklist Completed & product NOT requested → Quick Accept + Request Product */}
            {isChecklistCompleted && !productRequested && (
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

            {/* Client: Checklist Completed & product requested → waiting */}
            {isChecklistCompleted && productRequested && (
              <div className="flex items-center justify-end p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm font-medium gap-2 shadow-sm">
                <Clock3 className="w-4 h-4 text-amber-600 animate-pulse" />
                Waiting for Expert to submit product...
              </div>
            )}

            {/* Client: Waiting for Expert Product → static message */}
            {isWaitingForExpertProduct && (
              <div className="flex items-center justify-end p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm font-medium gap-2 shadow-sm">
                <Clock3 className="w-4 h-4 text-amber-600 animate-pulse" />
                Waiting for Expert to submit product...
              </div>
            )}

            {/* Client: Waiting For Approval WITH deliverables → View Product */}
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

            {/* Client: Rework → static wait message */}
            {isRework && (
              <div className="flex items-center justify-end p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm font-medium gap-2 shadow-sm">
                <RotateCcw className="w-4 h-4 text-orange-600" />
                Waiting for Expert to submit new product...
              </div>
            )}

            {/* Client: Done → completed */}
            {isDone && (
              <div className="flex items-center justify-end p-3 bg-green-50 border border-green-200 rounded-lg text-sm font-medium gap-2 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Task Completed
              </div>
            )}

            {/* Decline/Needs Revision Feedback Form */}
            {showDeclineForm && (
              <div className="bg-destructive-light border border-destructive/20 rounded-lg p-3 space-y-2 mt-2 text-left">
                <label className="block text-xs font-semibold text-destructive">
                  Lý do từ chối (Feedback):
                </label>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Nhập chi tiết lý do từ chối (ví dụ: Sản phẩm bị lỗi layout ở mobile...)"
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
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={!declineReason.trim()}
                    onClick={handleSendDecline}
                    className="px-3 py-1.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    Gửi phản hồi
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Product Deliverables Modal */}
      {showViewProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all animate-fade-in">
          <div className="bg-card rounded-xl border border-border shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all scale-100 animate-zoom-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-secondary border-b border-border">
              <div className="text-left">
                <h3 className="text-lg font-bold text-foreground">Sản phẩm nộp cho: {task.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Chi tiết các file và link do chuyên gia cung cấp</p>
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
                <h4 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2 text-left">
                  <FileText className="w-4 h-4 text-primary" />
                  Sản phẩm chính của Milestone
                </h4>
                {(!task.productLink && !task.productFile) ? (
                  <p className="text-sm text-muted-foreground italic bg-secondary p-4 rounded-lg border border-border text-left">Chưa nộp file hay link chính cho milestone này.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {task.productLink && (
                      <div className="flex flex-col p-3 bg-primary-light rounded-lg border border-primary/10 hover:bg-primary-light/80 transition-colors text-left">
                        <span className="text-xs font-semibold text-primary uppercase">Link sản phẩm</span>
                        <a
                          href={
                            task.productLink.startsWith("http")
                              ? task.productLink
                              : `https://${task.productLink}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary font-medium mt-1 truncate hover:underline flex items-center gap-1"
                        >
                          {task.productLink}
                          <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                        </a>
                      </div>
                    )}
                    {task.productFile && (
                      <div className="flex flex-col p-3 bg-secondary rounded-lg border border-border text-left">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">Tên file sản phẩm</span>
                        <span className="text-sm text-foreground font-medium mt-1 font-mono truncate">
                          {task.productFile}
                        </span>
                      </div>
                    )}
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
                    className="px-5 py-2.5 bg-destructive-light hover:bg-destructive/10 text-destructive font-bold rounded-lg text-sm transition-colors border border-destructive/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    Từ chối (Decline)
                  </button>
                  <button
                    type="button"
                    onClick={handleApproveTask}
                    className="px-5 py-2.5 bg-success hover:bg-success/90 text-success-foreground font-bold rounded-lg text-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Phê duyệt (Accept)
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowViewProductModal(false)}
                  className="px-5 py-2.5 bg-secondary hover:bg-muted text-foreground font-bold rounded-lg text-sm transition-colors border border-border cursor-pointer"
                >
                  Đóng
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
