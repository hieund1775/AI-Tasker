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
  const displayTitle = useCase ? (useCase.name || useCase.nameAndDeadline || task.title) : task.title;
  const displayDescription = useCase ? (useCase.description || task.description) : task.description;

  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [isDeclineDisabled, setIsDeclineDisabled] = useState(false);
  const [showViewProductModal, setShowViewProductModal] = useState(false);
  const [isDeclineUnlocked, setIsDeclineUnlocked] = useState(false);

  // Inline editing states for expert
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionInput, setDescriptionInput] = useState(task?.description || "");
  const [editingMiniTaskId, setEditingMiniTaskId] = useState(null);
  const [miniTaskTitleInput, setMiniTaskTitleInput] = useState("");

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

  const handleSaveMiniTask = async (mtId) => {
    if (!miniTaskTitleInput.trim()) {
      toast.error("Tiêu đề milestone không được để trống!");
      return;
    }
    try {
      const updatedMiniTasks = (task.miniTasks || []).map((mt) => {
        if (mt.id === mtId) {
          return { ...mt, title: miniTaskTitleInput.trim() };
        }
        return mt;
      });
      updateTask(task.id, { miniTasks: updatedMiniTasks });
      setEditingMiniTaskId(null);
      toast.success("Cập nhật milestone thành công!");
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    } catch (err) {
      toast.error("Không thể cập nhật milestone.");
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
  const isRework = task?.displayStatus === "Rework";

  const isWaitingForApproval =
    task.status === "pending_review" ||
    task.status === "Pending Review" ||
    task.status === "pending review";
  const hasMainProduct = !!(task.productLink || task.productFile);

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border p-5 transition-colors",
        isRework
          ? "border-orange-300 bg-orange-50 shadow-sm"
          : isUrgent
            ? "border-red-300 bg-red-50 shadow-sm"
            : "border-gray-100 hover:border-gray-200 shadow-sm",
      )}
    >
      {/* Task header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap text-left">
            {role === "expert" && !readOnly ? (
              <input
                type="checkbox"
                checked={task.progress === 100}
                onChange={handleToggleTask}
                className="rounded border-gray-305 text-brand-primary focus:ring-brand-primary h-4.5 w-4.5 cursor-pointer flex-shrink-0"
              />
            ) : (
              <input
                type="checkbox"
                checked={task.progress === 100}
                disabled
                className="rounded border-gray-305 text-brand-primary focus:ring-brand-primary h-4.5 w-4.5 cursor-not-allowed flex-shrink-0"
              />
            )}
            
            <h3 className="font-semibold text-gray-900 text-base">
              {displayTitle}
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
      <div className="mb-3 text-left">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mô tả</span>
        </div>
        {isEditingDescription ? (
          <div className="space-y-2 mt-1">
            <textarea
              value={descriptionInput}
              onChange={(e) => setDescriptionInput(e.target.value)}
              placeholder="Nhập mô tả của milestone..."
              rows={2}
              className="w-full text-sm border border-gray-300 rounded-lg p-2 bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setIsEditingDescription(false)}
                className="px-2.5 py-1 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveDescription}
                className="px-2.5 py-1 bg-brand-primary text-white rounded-md font-semibold"
              >
                Lưu
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-655 whitespace-pre-wrap leading-relaxed">
            {displayDescription || <span className="italic text-gray-400">Chưa có mô tả</span>}
          </p>
        )}
      </div>

      {/* Deadline */}
      {deadlineText && (
        <div className="flex items-center gap-1.5 text-sm mb-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-gray-550">
            <Calendar className="w-3.5 h-3.5" />
            Deadline: <span className="text-gray-700">{deadlineText}</span>
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
      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-3">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            task.progress > 0 ? "bg-brand-primary" : "bg-gray-200",
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
              const isEditing = editingMiniTaskId === mt.id;

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
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={miniTaskTitleInput}
                            onChange={(e) => setMiniTaskTitleInput(e.target.value)}
                            placeholder="Tên milestone..."
                            className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary"
                          />
                          <div className="flex justify-end gap-1.5 text-xs">
                            <button
                              type="button"
                              onClick={() => setEditingMiniTaskId(null)}
                              className="px-2 py-1 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveMiniTask(mt.id)}
                              className="px-2 py-1 bg-brand-primary text-white rounded-md font-semibold"
                            >
                              Lưu
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            "text-sm font-medium text-gray-800 text-left",
                            isMtCompleted && "line-through text-gray-400"
                          )}>
                            {mt.title || "Milestone không tên"}
                          </p>
                          {role === "expert" && !readOnly && (
                            <button
                              onClick={() => {
                                setEditingMiniTaskId(mt.id);
                                setMiniTaskTitleInput(mt.title || "");
                              }}
                              className="text-xs text-brand-primary hover:underline font-semibold flex-shrink-0"
                            >
                              Sửa
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Client vs Expert Actions */}
      <div className="pt-3 border-t border-gray-100">
        {role === "expert" ? (
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
        ) : (
          <div className="flex flex-col gap-3">
            {/* Checklist Completed OR Waiting For Approval WITHOUT deliverables: Quick Accept / Accept & Request Product */}
            {(task.displayStatus === "Checklist Completed" ||
              (isWaitingForApproval && !hasMainProduct)) &&
              !isRework && (
                <>
                  {!isUrgent ? (
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={handleApproveTask}
                        disabled={readOnly}
                        className="h-10 px-4 bg-brand-green hover:bg-brand-green/90 text-white text-sm font-semibold rounded-xl transition-all inline-flex items-center gap-1.5 shadow-sm font-sans cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Check className="w-4 h-4" />
                        Phê duyệt (Accept)
                      </button>
                      <button
                        type="button"
                        onClick={handleRequestProduct}
                        disabled={readOnly}
                        className="h-10 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-all inline-flex items-center gap-1.5 shadow-sm font-sans cursor-pointer animate-pulse border-amber-300 bg-amber-50/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:animate-none"
                      >
                        <Clock3 className="w-4 h-4 text-amber-600 animate-spin-slow" />
                        Yêu cầu sản phẩm (Request Product)
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-850 text-sm font-semibold gap-2 font-sans shadow-sm">
                      <Clock3 className="w-4 h-4 text-amber-600 animate-pulse" />
                      Đang chờ Expert nộp sản phẩm (Waiting for Expert
                      submission)...
                    </div>
                  )}
                </>
              )}

            {/* Waiting For Approval State WITH deliverables: View Product only */}
            {isWaitingForApproval && hasMainProduct && (
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowViewProductModal(true)}
                  disabled={readOnly}
                  className="h-10 px-4 bg-brand-primary hover:bg-brand-primary/90 text-white text-sm font-semibold rounded-xl transition-all inline-flex items-center gap-1.5 shadow-sm font-sans cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileText className="w-4 h-4" />
                  Xem sản phẩm (View Product)
                </button>
              </div>
            )}

            {isRework && (
              <div className="flex items-center justify-end p-3 bg-orange-50 border border-orange-200 rounded-xl text-orange-800 text-sm font-semibold gap-2 font-sans shadow-sm">
                <Clock3 className="w-4 h-4 text-orange-600" />
                Đang chờ Expert nộp sản phẩm mới...
              </div>
            )}

            {/* Decline/Needs Revision Feedback Form */}
            {showDeclineForm && (
              <div className="bg-red-50/50 border border-red-200 rounded-xl p-3 space-y-2 mt-2 text-left">
                <label className="block text-xs font-semibold text-red-800 font-sans">
                  Lý do từ chối (Feedback):
                </label>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Nhập chi tiết lý do từ chối (ví dụ: Sản phẩm bị lỗi layout ở mobile...)"
                  rows={3}
                  className="w-full text-sm border border-red-200 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-1 focus:ring-red-400 focus:border-red-400 resize-none font-sans"
                />
                <div className="flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeclineForm(false);
                      setIsDeclineUnlocked(false);
                      setDeclineReason("");
                    }}
                    className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium font-sans cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={!declineReason.trim()}
                    onClick={handleSendDecline}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold disabled:opacity-50 font-sans cursor-pointer"
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
          <div className="bg-white rounded-2xl border border-gray-150 shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all scale-100 animate-zoom-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100">
              <div className="text-left">
                <h3 className="text-lg font-bold text-gray-900 font-sans">
                  Sản phẩm nộp cho: {task.title}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 font-sans">
                  Chi tiết các file và link do chuyên gia cung cấp
                </p>
              </div>
              <button
                onClick={() => setShowViewProductModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Task-level deliverables */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2 text-left font-sans">
                  <FileText className="w-4 h-4 text-brand-primary" />
                  Sản phẩm chính của Milestone
                </h4>
                {!task.productLink && !task.productFile ? (
                  <p className="text-sm text-gray-400 italic bg-gray-50 p-4 rounded-xl border border-gray-100 text-left font-sans">
                    Chưa nộp file hay link chính cho milestone này.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {task.productLink && (
                      <div className="flex flex-col p-3 bg-brand-primary/5 rounded-xl border border-brand-primary/10 hover:bg-brand-primary/10 transition-colors text-left">
                        <span className="text-xs font-semibold text-brand-primary uppercase font-sans">
                          Link sản phẩm
                        </span>
                        <a
                          href={
                            task.productLink.startsWith("http")
                              ? task.productLink
                              : `https://${task.productLink}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-brand-primary font-medium mt-1 truncate hover:underline flex items-center gap-1 font-sans"
                        >
                          {task.productLink}
                          <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                        </a>
                      </div>
                    )}
                    {task.productFile && (
                      <div className="flex flex-col p-3 bg-gray-50 rounded-xl border border-gray-250 text-left">
                        <span className="text-xs font-semibold text-gray-500 uppercase font-sans">
                          Tên file sản phẩm
                        </span>
                        <span className="text-sm text-gray-700 font-medium mt-1 font-mono truncate">
                          {task.productFile}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100 font-sans">
              {isWaitingForApproval ? (
                <>
                  <button
                    type="button"
                    onClick={handleDeclineFromModal}
                    disabled={readOnly}
                    className="px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-755 font-bold rounded-xl text-sm transition-all border border-red-200/50 shadow-sm flex items-center gap-1.5 cursor-pointer font-sans disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="w-4 h-4" />
                    Từ chối (Decline)
                  </button>
                  <button
                    type="button"
                    onClick={handleApproveTask}
                    disabled={readOnly}
                    className="px-5 py-2.5 bg-brand-green hover:bg-brand-green/90 text-white font-bold rounded-xl text-sm transition-all shadow-sm flex items-center gap-1.5 cursor-pointer font-sans disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-4 h-4" />
                    Phê duyệt (Accept)
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowViewProductModal(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-all border border-gray-200 shadow-sm font-sans cursor-pointer"
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
