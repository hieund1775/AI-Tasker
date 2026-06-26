import { useEffect, useRef, useState } from "react";
import { ClipboardList, ArrowRight, ThumbsUp, AlertTriangle, FileText, Check, X, Clock3, RotateCcw } from "lucide-react";
import { EmptyState } from "../shared/EmptyState.jsx";
import { Skeleton } from "../ui/skeleton.jsx";
import { TaskProgressCard } from "./TaskProgressCard.jsx";
import { cn } from "../../lib/utils.js";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { StatusBadge } from "../shared/StatusBadge.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog.jsx";

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
  useCases = [],
  overallProgress = 0,
  role = "client",
  projectId,
  onToggleMiniTask,
  focusTaskId,
  loading = false,
  readOnly = false,
  onApproveTask,
  onRequestUrgentSubmission,
  onRequestRevision,
}) {
  const taskRefs = useRef({});
  const navigate = useNavigate();

  // States for client-side inline task deliverables review modal
  const [activeReviewTask, setActiveReviewTask] = useState(null);
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [activeExpertUseCaseIndex, setActiveExpertUseCaseIndex] = useState(null);

  const handleApprove = async (taskId) => {
    if (readOnly || !onApproveTask) return;
    setActionLoading(true);
    try {
      await onApproveTask(taskId);
      toast.success("Đã phê duyệt milestone thành công!");
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
      setActiveReviewTask(null);
    } catch (err) {
      toast.error("Không thể phê duyệt milestone.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestUrgent = async (taskId) => {
    if (readOnly || !onRequestUrgentSubmission) return;
    setActionLoading(true);
    try {
      await onRequestUrgentSubmission(taskId);
      toast.success("Đã yêu cầu sản phẩm. Chuyên gia đã được thông báo!");
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    } catch (err) {
      toast.error("Không thể yêu cầu sản phẩm.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineSubmit = async (taskId) => {
    if (readOnly || !onRequestRevision || !declineReason.trim()) return;
    setActionLoading(true);
    try {
      await onRequestRevision(taskId, declineReason.trim());
      toast.success("Đã từ chối và gửi phản hồi chỉnh sửa thành công!");
      setShowDeclineForm(false);
      setDeclineReason("");
      setActiveReviewTask(null);
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    } catch (err) {
      toast.error("Không thể gửi phản hồi từ chối.");
    } finally {
      setActionLoading(false);
    }
  };

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
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6 animate-pulse">
        <div className="flex justify-between items-center border-b border-gray-100 pb-4">
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

  if (role === "client" && useCases.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No use cases found"
        description="No use cases found for this project."
        size="md"
      />
    );
  }

  if (role === "expert" && tasks.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No milestones found"
        description="No milestones found for this project."
        size="md"
      />
    );
  }

  const completedTasks = tasks.filter(
    (t) => t.displayStatus === "Done"
  ).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      {/* Overall progress header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Project Progress</h2>
          <p className="text-[15px] text-gray-500">
            Progress is automatically calculated from completed Mini Tasks and Tasks.
          </p>
          {role === "client" ? (
            <p className="text-[13px] text-gray-400 mt-1">
              {useCases.filter(uc => uc.progress === 100).length} of {useCases.length} use cases completed
            </p>
          ) : (
            <p className="text-[13px] text-gray-400 mt-1">
              {completedTasks} of {tasks.length} tasks completed
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[15px] text-gray-500">Overall:</span>
          <span className="text-3xl font-semibold text-brand-primary font-mono">
            {overallProgress}%
          </span>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 bg-brand-primary"
          )}
          style={{ width: `${overallProgress}%` }}
        />
      </div>

      {/* Body content based on role */}
      {role === "client" ? (
        <div className="space-y-4 pt-2">
          <h3 className="text-[15px] font-medium text-gray-500 uppercase tracking-wider text-left">
            Project Use Cases ({useCases.length})
          </h3>
          <div className="space-y-4">
            {useCases.map((uc, i) => {
              const ucTask = tasks.find((t) => Number(t.useCaseIndex) === i);
              const isWaitingForApproval = ucTask?.status === "pending_review" || ucTask?.status === "Pending Review" || ucTask?.status === "pending review";
              const isNeedsRevision = ucTask?.displayStatus === "Rework";
              const isUrgent = ucTask?.urgentRequest === true;
              const hasMainProduct = ucTask ? !!(ucTask.productLink || ucTask.productFile) : false;

              return (
                <div key={i} className="p-5 bg-white border border-gray-255 rounded-2xl text-left space-y-3.5 shadow-sm">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <h4 className="font-bold text-gray-900 text-base font-sans">
                        Use Case #{i + 1}: <span className="font-semibold text-gray-750">{uc.nameAndDeadline}</span>
                      </h4>
                      {uc.durationValue && (
                        <p className="text-xs text-brand-primary font-semibold font-sans mt-0.5">
                          Timeline gốc: {uc.durationValue} {uc.durationUnit === "days" ? "ngày" : uc.durationUnit === "weeks" ? "tuần" : uc.durationUnit === "months" ? "tháng" : uc.durationUnit === "years" ? "năm" : uc.durationUnit}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-brand-primary font-mono bg-brand-primary-light px-2.5 py-1 rounded-full">
                      {uc.progress}%
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 leading-relaxed font-sans pl-3 border-l-2 border-slate-350">
                    {uc.description}
                  </p>

                  {/* Task Status Badge */}
                  {ucTask && (
                    <div className="flex items-center gap-2 text-xs mt-1">
                      <span className="text-gray-400 font-medium">Trạng thái công việc:</span>
                      <StatusBadge status={ucTask.displayStatus} entity="task" />
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-primary transition-all duration-500"
                        style={{ width: `${uc.progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 font-sans">
                      <span>Trạng thái tiến độ</span>
                      <span>{uc.progress === 100 ? "Hoàn thành" : `${uc.progress}%`}</span>
                    </div>
                  </div>

                  {/* Review Actions Panel Inline */}
                  {ucTask && !readOnly && (
                    <div className="pt-2 border-t border-gray-100 flex flex-col gap-2.5">
                      {/* Scenario A: Waiting for approval WITHOUT deliverables */}
                      {(ucTask.displayStatus === "Checklist Completed" || (isWaitingForApproval && !hasMainProduct)) && !isNeedsRevision && (
                        <div className="flex flex-col sm:flex-row gap-2">
                          {!isUrgent ? (
                            <>
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => handleApprove(ucTask.id)}
                                className="h-9 px-3.5 bg-brand-green hover:bg-brand-green/90 text-white text-xs font-semibold rounded-xl transition-all inline-flex items-center justify-center gap-1.5 shadow-sm font-sans cursor-pointer disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Phê duyệt (Accept)
                              </button>
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => handleRequestUrgent(ucTask.id)}
                                className="h-9 px-3.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl transition-all inline-flex items-center justify-center gap-1.5 shadow-sm font-sans cursor-pointer disabled:opacity-50"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Yêu cầu sản phẩm (Request Product)
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold font-sans w-full">
                              <Clock3 className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                              Đang chờ Expert nộp sản phẩm...
                            </div>
                          )}
                        </div>
                      )}

                      {/* Scenario B: Waiting for approval WITH deliverables */}
                      {isWaitingForApproval && hasMainProduct && (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveReviewTask(ucTask);
                              setShowDeclineForm(false);
                              setDeclineReason("");
                            }}
                            className="h-9 px-4 bg-brand-primary text-white hover:bg-brand-primary-hover text-xs font-semibold rounded-xl transition-all inline-flex items-center justify-center gap-1.5 shadow-sm font-sans cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Xem sản phẩm (View Product)
                          </button>
                        </div>
                      )}

                      {/* Scenario C: Needs revision (Rework) */}
                      {isNeedsRevision && (
                        <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-205 rounded-xl text-orange-850 text-xs font-semibold font-sans">
                          <RotateCcw className="w-3.5 h-3.5 text-orange-600" />
                          Đang chờ Expert nộp sản phẩm mới...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-6 pt-2">
          {useCases.map((uc, i) => {
            const ucTasks = tasks.filter((t) => Number(t.useCaseIndex) === i);
            return (
              <div key={i} className="p-5 bg-white border border-gray-200 rounded-2xl text-left space-y-3.5 shadow-sm">
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base font-sans">
                      Use Case #{i + 1}: <span className="font-semibold text-gray-750">{uc.nameAndDeadline || uc.name}</span>
                    </h3>
                    {uc.durationValue && (
                      <p className="text-xs text-brand-primary font-semibold font-sans mt-0.5">
                        Timeline gốc: {uc.durationValue} {uc.durationUnit === "days" ? "ngày" : uc.durationUnit === "weeks" ? "tuần" : uc.durationUnit === "months" ? "tháng" : uc.durationUnit === "years" ? "năm" : uc.durationUnit}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-brand-primary font-mono bg-brand-primary-light px-2.5 py-1 rounded-full">
                      {uc.progress}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveExpertUseCaseIndex(i)}
                      className="h-8 px-3 bg-brand-primary text-white hover:bg-brand-primary-hover text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer font-sans"
                    >
                      Detail
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-600 leading-relaxed font-sans pl-3 border-l-2 border-slate-350">
                  {uc.description}
                </p>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-primary transition-all duration-500"
                      style={{ width: `${uc.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 font-sans">
                    <span>Trạng thái tiến độ</span>
                    <span>{uc.progress === 100 ? "Hoàn thành" : `${uc.progress}%`}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Client View Deliverables Modal */}
      {activeReviewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all flex justify-center items-center">
          <div className="bg-white rounded-2xl border border-gray-150 shadow-2xl w-full max-w-lg overflow-hidden text-left transform scale-100 flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900 font-sans">
                  Sản phẩm nộp cho: {activeReviewTask.title}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 font-sans">
                  Chi tiết sản phẩm do Chuyên gia nộp
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveReviewTask(null)}
                className="p-1.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 font-sans text-sm text-gray-700">
              <div className="space-y-3 p-4 bg-blue-50/40 border border-blue-100 rounded-xl">
                <div>
                  <strong className="block text-gray-500 text-xs uppercase tracking-wider">Link sản phẩm</strong>
                  {activeReviewTask.productLink ? (
                    <a
                      href={activeReviewTask.productLink.startsWith("http") ? activeReviewTask.productLink : `https://${activeReviewTask.productLink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium break-all inline-flex items-center gap-1"
                    >
                      {activeReviewTask.productLink}
                    </a>
                  ) : (
                    <span className="text-gray-400 italic">Chưa cung cấp link</span>
                  )}
                </div>
                <div>
                  <strong className="block text-gray-500 text-xs uppercase tracking-wider">Tệp đính kèm</strong>
                  <span className="font-semibold text-gray-800 break-all">
                    {activeReviewTask.productFile || "Chưa cung cấp file"}
                  </span>
                </div>
              </div>

              {/* Decline Reason textarea inside modal */}
              {showDeclineForm && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <label className="block text-gray-700 font-semibold text-xs animate-slide-up">
                    Lý do từ chối (Feedback) <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Vui lòng cung cấp lý do chi tiết để Chuyên gia sửa đổi..."
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-[10px] focus:outline-none focus:border-brand-primary text-gray-800 text-sm resize-none"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100 font-sans">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setActiveReviewTask(null);
                  setShowDeclineForm(false);
                  setDeclineReason("");
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-semibold text-sm transition-all cursor-pointer"
              >
                Đóng
              </button>

              {!showDeclineForm ? (
                <>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => setShowDeclineForm(true)}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-semibold text-sm transition-all cursor-pointer"
                  >
                    Từ chối (Decline)
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleApprove(activeReviewTask.id)}
                    className="px-5 py-2 bg-brand-green hover:bg-brand-green/90 text-white rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    ✓ Phê duyệt (Accept)
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={actionLoading || !declineReason.trim()}
                  onClick={() => handleDeclineSubmit(activeReviewTask.id)}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all shadow-sm cursor-pointer"
                >
                  Gửi yêu cầu chỉnh sửa (Submit Decline)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expert Use Case Detail Modal */}
      <Dialog
        open={activeExpertUseCaseIndex !== null}
        onOpenChange={(open) => !open && setActiveExpertUseCaseIndex(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto font-sans p-0 rounded-2xl border-none">
          {activeExpertUseCaseIndex !== null && (() => {
            const uc = useCases[activeExpertUseCaseIndex];
            const ucTasks = tasks.filter((t) => Number(t.useCaseIndex) === activeExpertUseCaseIndex);
            return (
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-slate-50 px-6 py-4 border-b border-gray-150 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 font-sans">
                      Chi tiết Use Case #{activeExpertUseCaseIndex + 1}
                    </h3>
                    <p className="text-sm font-semibold text-gray-650 mt-1">
                      {uc.nameAndDeadline || uc.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-brand-primary bg-white border border-brand-primary/10 px-2.5 py-1.5 rounded-lg font-mono">
                      Tiến độ: {uc.progress}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveExpertUseCaseIndex(null)}
                      className="p-1.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 text-left max-h-[60vh] overflow-y-auto">
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                    <h4 className="font-bold text-gray-800 text-sm">Mô tả Use Case:</h4>
                    <p className="text-sm text-gray-700 leading-relaxed">{uc.description}</p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wider">
                      Tasks & Milestones ({ucTasks.length})
                    </h4>
                    {ucTasks.length === 0 ? (
                      <p className="text-sm text-gray-450 italic pl-1">Chưa có milestone/task nào được gán cho Use Case này.</p>
                    ) : (
                      ucTasks.map((task) => (
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
                            readOnly={readOnly}
                            onToggleMiniTask={onToggleMiniTask}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setActiveExpertUseCaseIndex(null)}
                    className="px-5 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl font-bold text-sm transition-all shadow-md cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
