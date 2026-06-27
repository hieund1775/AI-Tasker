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
  onUseCaseSubmitForReview,
  onUseCaseApprove,
  onUseCaseRequestProduct,
  onUseCaseSubmitProduct,
  onUseCaseDeclineProduct,
}) {
  const taskRefs = useRef({});
  const navigate = useNavigate();

  const getTaskDuration = (t) => {
    if (t.durationDays) return Number(t.durationDays);
    if (t.deadline) {
      const start = t.createdAt ? new Date(t.createdAt) : new Date();
      const end = new Date(t.deadline);
      const diffMs = end - start;
      if (diffMs > 0) {
        return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      }
    }
    return 5; // default fallback
  };

  // States for client-side inline task deliverables review modal
  const [activeReviewTask, setActiveReviewTask] = useState(null);
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [activeExpertUseCaseIndex, setActiveExpertUseCaseIndex] = useState(null);

  // States for Use Case product submission
  const [ucProductLink, setUcProductLink] = useState("");
  const [ucProductFile, setUcProductFile] = useState("");
  const [ucProductImage, setUcProductImage] = useState("");

  // States for client-side Use Case review modal
  const [activeReviewUseCaseIndex, setActiveReviewUseCaseIndex] = useState(null);
  const [useCaseDeclineReason, setUseCaseDeclineReason] = useState("");
  const [showUseCaseDeclineForm, setShowUseCaseDeclineForm] = useState(false);

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

  const handleUseCaseSubmitForReviewWrapper = async (useCaseIndex) => {
    if (readOnly || !onUseCaseSubmitForReview) return;
    setActionLoading(true);
    try {
      await onUseCaseSubmitForReview(useCaseIndex);
      toast.success("Đã gửi yêu cầu phê duyệt Use Case thành công!");
    } catch (err) {
      toast.error("Không thể gửi yêu cầu phê duyệt.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUseCaseApproveWrapper = async (useCaseIndex) => {
    if (readOnly || !onUseCaseApprove) return;
    setActionLoading(true);
    try {
      await onUseCaseApprove(useCaseIndex);
      toast.success("Đã phê duyệt Use Case thành công!");
      setActiveReviewUseCaseIndex(null);
    } catch (err) {
      toast.error("Không thể phê duyệt Use Case.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUseCaseRequestProductWrapper = async (useCaseIndex) => {
    if (readOnly || !onUseCaseRequestProduct) return;
    setActionLoading(true);
    try {
      await onUseCaseRequestProduct(useCaseIndex);
      toast.success("Đã yêu cầu sản phẩm bàn giao thành công!");
    } catch (err) {
      toast.error("Không thể yêu cầu sản phẩm bàn giao.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUseCaseSubmitProductWrapper = async (useCaseIndex) => {
    if (readOnly || !onUseCaseSubmitProduct) return;
    if (!ucProductLink.trim() && !ucProductFile.trim() && !ucProductImage.trim()) {
      toast.error("Vui lòng cung cấp ít nhất một liên kết, tệp hoặc hình ảnh!");
      return;
    }
    setActionLoading(true);
    try {
      await onUseCaseSubmitProduct(useCaseIndex, {
        productLink: ucProductLink.trim(),
        productFile: ucProductFile.trim(),
        productImage: ucProductImage.trim()
      });
      toast.success("Đã nộp sản phẩm bàn giao thành công!");
      setUcProductLink("");
      setUcProductFile("");
      setUcProductImage("");
      setActiveExpertUseCaseIndex(null);
    } catch (err) {
      toast.error("Không thể nộp sản phẩm bàn giao.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUseCaseDeclineProductWrapper = async (useCaseIndex) => {
    if (readOnly || !onUseCaseDeclineProduct || !useCaseDeclineReason.trim()) return;
    setActionLoading(true);
    try {
      await onUseCaseDeclineProduct(useCaseIndex, useCaseDeclineReason.trim());
      toast.success("Đã gửi lý do từ chối sản phẩm thành công!");
      setUseCaseDeclineReason("");
      setShowUseCaseDeclineForm(false);
      setActiveReviewUseCaseIndex(null);
    } catch (err) {
      toast.error("Không thể gửi lý do từ chối.");
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
        <div className="space-y-6 pt-2">
          {useCases.map((uc, i) => {
            const ucTasks = tasks.filter((t) => Number(t.useCaseIndex) === i);
            const totalDuration = ucTasks.reduce((sum, t) => sum + getTaskDuration(t), 0);

            return (
              <div key={i} className="p-5 bg-white border border-gray-200 rounded-2xl text-left space-y-4 shadow-sm">
                {/* Use Case Header */}
                <div className="flex justify-between items-start border-b border-gray-100 pb-3 gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-brand-primary bg-brand-primary-light px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                        Use Case #{i + 1}
                      </span>
                      {uc.status === "done" && (
                        <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200 uppercase tracking-wide">
                          Done
                        </span>
                      )}
                      {uc.status === "waiting_client_review" && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 uppercase tracking-wide">
                          Awaiting Review
                        </span>
                      )}
                      {uc.status === "rework" && (
                        <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200 uppercase tracking-wide">
                          Rework
                        </span>
                      )}
                      {uc.status === "submit_product" && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 uppercase tracking-wide">
                          Waiting for Product
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 text-base mt-1.5 break-words">
                      {uc.nameAndDeadline || uc.name}
                    </h3>
                  </div>
                  <div className="text-right text-xs bg-gray-50 px-3 py-1.5 border border-gray-150 rounded-lg shadow-sm shrink-0">
                    <span className="font-bold text-brand-primary block sm:inline">Tổng: {totalDuration || Number(uc.durationDays || 0)} ngày</span>
                  </div>
                </div>

                <p className="text-sm text-gray-600 leading-relaxed font-sans pl-3 border-l-2 border-slate-300">
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

                {/* Use Case Actions for Client */}
                {!readOnly && (
                  <div className="py-2 px-3 bg-slate-50 border border-gray-150 rounded-xl flex items-center justify-between gap-3 text-sm flex-wrap">
                    <span className="text-gray-500 font-semibold">Duyệt Use Case:</span>
                    <div className="flex gap-2">
                      {/* Scenario A: waiting_client_review with NO product submitted */}
                      {uc.status === "waiting_client_review" && !uc.productLink && !uc.productFile && !uc.productImage && (
                        <>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleUseCaseApproveWrapper(i)}
                            className="h-8 px-3 bg-brand-green hover:bg-brand-green/90 text-white text-xs font-semibold rounded-lg transition-all inline-flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" /> Phê duyệt (Accept)
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleUseCaseRequestProductWrapper(i)}
                            className="h-8 px-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-all inline-flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" /> Yêu cầu sản phẩm
                          </button>
                        </>
                      )}

                      {/* Scenario B: waiting_client_review with product submitted */}
                      {uc.status === "waiting_client_review" && (uc.productLink || uc.productFile || uc.productImage) && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveReviewUseCaseIndex(i);
                            setUseCaseDeclineReason("");
                            setShowUseCaseDeclineForm(false);
                          }}
                          className="h-8 px-3.5 bg-brand-primary text-white hover:bg-brand-primary-hover text-xs font-semibold rounded-lg transition-all inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" /> Xem sản phẩm bàn giao
                        </button>
                      )}

                      {/* Scenario C: submit_product or rework or waiting_expert_product (waiting for expert to submit) */}
                      {(uc.status === "submit_product" || uc.status === "rework" || uc.status === "waiting_expert_product") && (
                        <span className="text-xs font-bold text-amber-600 animate-pulse inline-flex items-center gap-1">
                          <Clock3 className="w-3.5 h-3.5 text-amber-500" />
                          Chờ expert gửi sản phẩm
                        </span>
                      )}

                      {/* Scenario D: done */}
                      {uc.status === "done" && (
                        <span className="text-xs font-bold text-green-600 inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-green-500" />
                          Đã nghiệm thu hoàn tất
                        </span>
                      )}

                      {/* Default: in_progress but not yet requested or submitted */}
                      {(!uc.status || uc.status === "in_progress") && (
                        <span className="text-xs font-semibold text-gray-400 italic">
                          Chuyên gia đang thực hiện...
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Tasks List */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Danh sách công việc</h4>
                  {ucTasks.length === 0 ? (
                    <p className="text-sm text-gray-455 italic pl-1">Chưa có công việc nào được gán cho Use Case này.</p>
                  ) : (
                    <div className="space-y-3">
                      {ucTasks.map((task, tIdx) => (
                        <div key={task.id || tIdx} className="p-4 bg-gray-50 border border-gray-150 rounded-xl space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <h5 className="font-bold text-gray-800 text-sm">
                                Task #{tIdx + 1}: {task.title || "Không có tiêu đề"}
                              </h5>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 font-medium">
                                <span className="bg-white border border-gray-200 px-2 py-0.5 rounded text-[11px] font-semibold text-gray-600">
                                  {getTaskDuration(task)} ngày
                                </span>
                                <span>•</span>
                                <span className="font-bold text-gray-900">${task.amount || task.budget || 0}</span>
                              </div>
                            </div>
                            <StatusBadge status={task.displayStatus} entity="task" />
                          </div>

                          {task.description && (
                            <p className="text-xs text-gray-655 pl-2.5 border-l border-gray-300">
                              {task.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-6 pt-2">
          {useCases.map((uc, i) => {
            const ucTasks = tasks.filter((t) => Number(t.useCaseIndex) === i);
            const totalDuration = ucTasks.reduce((sum, t) => sum + getTaskDuration(t), 0);

            return (
              <div key={i} className="p-5 bg-white border border-gray-200 rounded-2xl text-left space-y-4 shadow-sm">
                {/* Use Case Header */}
                <div className="flex justify-between items-start border-b border-gray-100 pb-3 gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-brand-primary bg-brand-primary-light px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                        Use Case #{i + 1}
                      </span>
                      {uc.status === "done" && (
                        <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200 uppercase tracking-wide">
                          Done
                        </span>
                      )}
                      {uc.status === "waiting_client_review" && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 uppercase tracking-wide">
                          Awaiting Review
                        </span>
                      )}
                      {uc.status === "rework" && (
                        <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200 uppercase tracking-wide">
                          Rework
                        </span>
                      )}
                      {uc.status === "submit_product" && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 uppercase tracking-wide">
                          Submit Product
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 text-base mt-1.5 break-words">
                      {uc.nameAndDeadline || uc.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right text-xs bg-gray-50 px-3 py-1.5 border border-gray-150 rounded-lg shadow-sm">
                      <span className="font-bold text-brand-primary block sm:inline">Tổng: {totalDuration || Number(uc.durationDays || 0)} ngày</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigate(`/expert/projects/${projectId}/usecase/${uc.id || i}`);
                      }}
                      className="h-9 px-4 bg-brand-primary text-white hover:bg-brand-primary-hover text-xs font-semibold rounded-xl shadow-sm transition-colors cursor-pointer font-sans"
                    >
                      Update
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-600 leading-relaxed font-sans pl-3 border-l-2 border-slate-300">
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
