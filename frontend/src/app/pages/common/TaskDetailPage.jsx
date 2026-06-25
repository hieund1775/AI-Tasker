import { useState, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import {
  ArrowLeft,
  Calendar,
  Clock3,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Lock,
  ThumbsUp,
  AlertTriangle,
  RotateCcw,
  X,
  Check,
  ExternalLink,
} from "lucide-react";
import { Button } from "../../components/ui/button.jsx";
import { useProjectProgress, deriveTaskDisplayStatus } from "../../hooks/useProjectProgress.js";
import { MiniTaskChecklist } from "../../components/project/MiniTaskChecklist.jsx";
import { TaskActivityTimeline } from "../../components/project/TaskActivityTimeline.jsx";
import { StatusBadge } from "../../components/shared/StatusBadge.jsx";
import { LoadingSkeleton } from "../../components/shared/LoadingSkeleton.jsx";
import { EmptyState } from "../../components/shared/EmptyState.jsx";
import { getDeadlineStatusClass } from "../../lib/projectStatusConfig.js";
import { getDeadlineInfo } from "../../lib/projectTimelineStore.js";
import { cn } from "../../lib/utils.js";
import { toast } from "sonner";
import { updateTask } from "../../../data/mockDatabase.js";
import {
  notifyTaskSubmittedForReview,
  notifyTaskApproved,
  notifyTaskRevisionRequested,
  notifyMiniTaskRevisionRequested,
  notifyUrgentSubmissionRequested,
} from "../../../services/notificationHelper.js";

// =============================================================================
// TaskDetailPage — dedicated task detail page for both client and expert.
//
// Route: /client/projects/:projectId/tasks/:taskId
//        /expert/projects/:projectId/tasks/:taskId
//
// Derives role from URL path.
// =============================================================================

export default function TaskDetailPage() {
  const { projectId, taskId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Derive role from URL path
  const role = location.pathname.startsWith("/expert") ? "expert" : "client";

  // Use the shared hook for project-level data
  const {
    project,
    tasks,
    expert,
    client,
    loading,
    error,
    handleToggleMiniTask,
    handleUpdateMiniTask,
    handleSubmitForReview,
    handleSubmitProduct,
    handleApproveTask,
    handleRequestRevision,
    handleRequestReopen,
    handleRequestUrgentSubmission,
    handleRequestMiniTaskRevision,
    areAllMiniTasksCompleted,
    retry,
  } = useProjectProgress(projectId, role);

  // Local state
  const [submitLoading, setSubmitLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [revisionLoading, setRevisionLoading] = useState(false);
  const [reopenLoading, setReopenLoading] = useState(false);
  const [urgentLoading, setUrgentLoading] = useState(false);
  const [showUrgentModal, setShowUrgentModal] = useState(false);

  // Revision modal state (3-step flow)
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionStep, setRevisionStep] = useState("select-type"); // "select-type" | "select-tasks" | "write-reason"
  const [revisionType, setRevisionType] = useState("entire"); // "entire" | "mini"
  const [selectedMiniTaskIds, setSelectedMiniTaskIds] = useState(new Set());
  const [revisionFeedback, setRevisionFeedback] = useState("");

  // Deliverables Submit modal state
  const [showProductModal, setShowProductModal] = useState(false);
  const [productLinkInput, setProductLinkInput] = useState("");
  const [productFileInput, setProductFileInput] = useState("");
  const [productSubmitLoading, setProductSubmitLoading] = useState(false);
  
  // Client view product modal state
  const [showViewProductModalClient, setShowViewProductModalClient] = useState(false);

  // Find the current task from the tasks array
  const task = tasks.find((t) => t.id === taskId);

  // Derived miniTasks — declared early because handlers below reference it
  const miniTasks = task?.miniTasks || [];

  // ---- Handlers ----

  const handleProductSubmit = useCallback(async () => {
    if (!productLinkInput.trim() && !productFileInput.trim()) {
      toast.error("Vui lòng cung cấp link sản phẩm hoặc file!");
      return;
    }
    setProductSubmitLoading(true);
    try {
      await handleSubmitProduct(taskId, productLinkInput.trim(), productFileInput.trim());
      toast.success("Sản phẩm đã được nộp thành công!");
      setShowProductModal(false);
      
      notifyTaskSubmittedForReview({
        clientUserId: project?.clientId,
        expertName: expert?.fullName || "Expert",
        taskTitle: task?.title,
        projectId,
        taskId,
      }).catch(() => {});
      
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    } catch (err) {
      toast.error("Không thể nộp sản phẩm.");
    } finally {
      setProductSubmitLoading(false);
    }
  }, [taskId, productLinkInput, productFileInput, handleSubmitProduct, project, expert, task, projectId]);

  const handleDoneClick = useCallback(async () => {
    setSubmitLoading(true);
    try {
      handleSubmitForReview(taskId);
      toast.success("Task submitted for client review!");
      // Notify client
      notifyTaskSubmittedForReview({
        clientUserId: project?.clientId,
        expertName: expert?.fullName || "Expert",
        taskTitle: task?.title,
        projectId,
        taskId,
      }).catch(() => {});
      // Redirect back to project progress
      navigate(`/${role}/projects/${projectId}?focusTaskId=${taskId}`, {
        replace: true,
      });
    } catch (err) {
      toast.error("Failed to submit task for review.");
    } finally {
      setSubmitLoading(false);
    }
  }, [taskId, role, projectId, navigate, handleSubmitForReview, project, expert, task]);

  const handleApproveClick = useCallback(async () => {
    setApproveLoading(true);
    try {
      handleApproveTask(taskId);
      toast.success("Task approved!");
      // Notify expert
      notifyTaskApproved({
        expertUserId: project?.assignedExpertId,
        clientName: client?.fullName || "Client",
        taskTitle: task?.title,
        projectId,
        taskId,
      }).catch(() => {});
    } catch (err) {
      toast.error("Failed to approve task.");
    } finally {
      setApproveLoading(false);
    }
  }, [taskId, projectId, handleApproveTask, project, client, task]);

  const handleRevisionClick = useCallback(async () => {
    if (!revisionFeedback.trim()) {
      toast.error("Please provide feedback for the revision request.");
      return;
    }
    setRevisionLoading(true);
    try {
      if (revisionType === "mini") {
        const miniTaskIdsArr = Array.from(selectedMiniTaskIds);
        handleRequestMiniTaskRevision(taskId, miniTaskIdsArr, revisionFeedback.trim());
        // Get mini task titles for notification
        const selectedTitles = miniTasks
          .filter((mt) => selectedMiniTaskIds.has(mt.id))
          .map((mt) => mt.title);
        notifyMiniTaskRevisionRequested({
          expertUserId: project?.assignedExpertId,
          clientName: client?.fullName || "Client",
          taskTitle: task?.title,
          miniTaskTitles: selectedTitles,
          feedback: revisionFeedback.trim(),
          projectId,
          taskId,
        }).catch(() => {});
        toast.success("Revision requested for selected mini tasks. Expert can now edit them.");
      } else {
        handleRequestRevision(taskId, revisionFeedback.trim());
        notifyTaskRevisionRequested({
          expertUserId: project?.assignedExpertId,
          clientName: client?.fullName || "Client",
          taskTitle: task?.title,
          feedback: revisionFeedback.trim(),
          projectId,
          taskId,
        }).catch(() => {});
        toast.success("Revision requested. Expert can now edit.");
      }
      // Reset modal state
      setShowRevisionModal(false);
      setRevisionStep("select-type");
      setRevisionType("entire");
      setSelectedMiniTaskIds(new Set());
      setRevisionFeedback("");
    } catch (err) {
      toast.error("Failed to request revision.");
    } finally {
      setRevisionLoading(false);
    }
  }, [taskId, projectId, revisionFeedback, revisionType, selectedMiniTaskIds, miniTasks,
      handleRequestRevision, handleRequestMiniTaskRevision, project, client, task]);

  const handleReopenClick = useCallback(async () => {
    setReopenLoading(true);
    try {
      handleRequestReopen(taskId);
      toast.success("Reopen requested. Expert can now edit mini tasks.");
    } catch (err) {
      toast.error("Failed to request reopen.");
    } finally {
      setReopenLoading(false);
    }
  }, [taskId, handleRequestReopen]);

  const handleUrgentClick = useCallback(async () => {
    setUrgentLoading(true);
    try {
      handleRequestUrgentSubmission(taskId);
      toast.success("Urgent submission requested. The expert has been notified.");
      // Notify expert
      notifyUrgentSubmissionRequested({
        expertUserId: project?.assignedExpertId,
        clientName: client?.fullName || "Client",
        taskTitle: task?.title,
        projectId,
        taskId,
      }).catch(() => {});
      setShowUrgentModal(false);
    } catch (err) {
      toast.error("Failed to send urgent request.");
    } finally {
      setUrgentLoading(false);
    }
  }, [taskId, projectId, handleRequestUrgentSubmission, project, client, task]);

  const handleDeclineFromModalClient = useCallback(() => {
    setShowViewProductModalClient(false);
    setShowRevisionModal(true);
    setRevisionStep("select-type");
    setRevisionType("entire");
    setSelectedMiniTaskIds(new Set());
    setRevisionFeedback("");
    toast.info("Vui lòng điền chi tiết lý do từ chối.");
  }, []);

  // ---- Derived values ----
  const isExpert = role === "expert";
  const isClient = role === "client";

  const allComplete = task ? areAllMiniTasksCompleted(taskId) : false;
  const hasMiniTasks = miniTasks.length > 0;

  const displayStatus = task ? deriveTaskDisplayStatus(task) : "Not Started";
  const isDone = displayStatus === "Done";
  const isWaitingForApproval = task?.status === "pending_review" || task?.status === "Pending Review" || task?.status === "pending review";
  const hasMainProduct = task ? !!(task.productLink || task.productFile) : false;
  const isReopenRequested = task?.status === "reopen_requested" || task?.status === "Reopen Requested" || task?.status === "reopen requested";
  const isNeedsRevision = displayStatus === "Decline";
  const isNotStarted = displayStatus === "Not Started";
  const isInProgress = displayStatus === "In Progress";
  const isDisputed = project?.status?.toLowerCase() === "disputed";

  // Deadline info for badge
  const deadlineInfo = task?.deadline ? getDeadlineInfo(task.deadline) : null;

  // Expert can toggle mini task checkboxes when task is not Done and not waiting for approval
  const canToggleMiniTasks = isExpert && !isDone && !isWaitingForApproval && !isDisputed;

  // Expert can submit for review: all mini tasks complete, not already submitted/approved
  const canSubmitForReview =
    isExpert && allComplete && !isDone && !isWaitingForApproval && !isDisputed;

  // Client can approve: task is waiting for approval
  const canApprove = isClient && isWaitingForApproval && !isDisputed;

  // Client can request revision: task is waiting for approval
  const canRequestRevision = isClient && isWaitingForApproval && !isDisputed;

  // Client can request reopen when task is Done — DEPRECATED: completed tasks are now permanently locked
  const canRequestReopen = false;

  // Client can request urgent submission: task is not Done, not waiting for approval, and overdue/close to deadline
  const isOverdueOrClose = deadlineInfo?.urgency === "overdue" || deadlineInfo?.urgency === "warning";
  const canRequestUrgent = isClient && !isDone && !isWaitingForApproval && isOverdueOrClose && !isDisputed;
  const urgentAlreadySent = task?.urgentRequest === true;

  // Task is locked (Done) — no modifications allowed
  const isTaskLocked = isDone;

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LoadingSkeleton variant="detail" />
      </div>
    );
  }

  // ---- Error state ----
  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EmptyState
          icon={AlertCircle}
          title="Error loading task"
          description={error}
          action={
            <Button variant="outline" size="default" onClick={retry}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  // ---- Task not found ----
  if (!task) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EmptyState
          icon={AlertCircle}
          title="Task not found"
          description="The requested task could not be found. It may have been removed or you may not have access."
          action={
            <Button variant="outline" size="default" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          }
        />
      </div>
    );
  }

  // ---- Deadline formatting ----
  const deadlineText = task.deadline
    ? (() => {
        try {
          return new Date(task.deadline).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
        } catch {
          return String(task.deadline);
        }
      })()
    : "N/A";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans bg-gray-50 min-h-screen">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <button
          onClick={() => navigate(`/${role}/projects/${projectId}`)}
          className="hover:text-brand-primary transition-colors font-medium"
        >
          Projects
        </button>
        <span>/</span>
        <span className="text-gray-400 truncate max-w-[200px]">
          {project?.title || "Project"}
        </span>
        <span>/</span>
        <span className="text-gray-900 font-semibold truncate max-w-[200px]">
          {task.title}
        </span>
      </div>

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Project
      </button>

      {/* Task header card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8 text-left">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-2xl font-semibold text-gray-900">{task.title}</h1>
              <StatusBadge status={displayStatus} entity="task" />
            </div>

            {task.description && (
              <p className="text-sm text-gray-650 mt-2">{task.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-5 mt-4 text-sm text-gray-500">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Deadline: <span className="text-gray-700">{deadlineText}</span>
                {deadlineInfo && deadlineInfo.urgency !== "normal" && (
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium ml-1.5 flex items-center gap-1",
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
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-brand-green" />
                <span>
                  {task.completedMiniTasks}/{task.totalMiniTasks} mini tasks completed
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock3 className="w-4 h-4 text-brand-primary" />
                Progress: <span className="font-medium text-brand-primary">{task.progress}%</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-4">
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

            {/* Display Product Deliverables */}
            <div className="mt-5 p-4 bg-gray-50 border border-gray-100 rounded-xl">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Sản phẩm bàn giao (Deliverables)
              </h4>
              <div className="space-y-1.5 text-sm">
                <div>
                  <span className="text-gray-500">Link sản phẩm: </span>
                  {task.productLink ? (
                    <a
                      href={task.productLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-primary hover:underline font-semibold"
                    >
                      {task.productLink}
                    </a>
                  ) : (
                    <span className="text-gray-400 italic">Chưa có</span>
                  )}
                </div>
                <div>
                  <span className="text-gray-500">File đính kèm: </span>
                  {task.productFile ? (
                    <span className="font-semibold text-gray-750">{task.productFile}</span>
                  ) : (
                    <span className="text-gray-400 italic">Chưa có</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Expert: Task already submitted, waiting */}
            {isWaitingForApproval && isExpert && (
              <div className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium flex items-center gap-2 border border-purple-200">
                <Clock3 className="w-4 h-4" />
                Waiting for Client Approval
              </div>
            )}

            {/* Client: Task is waiting status */}
            {isWaitingForApproval && isClient && !canApprove && (
              <div className="px-4 py-2 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium flex items-center gap-2 border border-purple-200">
                <Clock3 className="w-4 h-4" />
                Under Review
              </div>
            )}

            {/* Task is completed/locked */}
            {isDone && (
              <div className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm font-medium flex items-center gap-2">
                <Lock className="w-4 h-4 text-brand-green" />
                Task Completed
              </div>
            )}

            {/* Expert: Urgent Request badge */}
            {isExpert && task?.urgentRequest === true && (
              <div className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium flex items-center gap-2 border border-red-300">
                <AlertTriangle className="w-4 h-4" />
                Urgent Request
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status info banner */}
      {isReopenRequested && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-orange-800">
              Reopen Requested
            </p>
            <p className="text-xs text-orange-600 mt-1">
              {isExpert
                ? "The client has requested changes. You can now edit the mini tasks and confirm them again."
                : "You have requested a revision. The expert can now edit the mini tasks."}
            </p>
          </div>
        </div>
      )}

      {isNeedsRevision && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-orange-800">
              Decline
            </p>
            <p className="text-xs text-orange-600 mt-1">
              The client has declined this task and requested changes.
            </p>
          </div>
        </div>
      )}

      {isExpert && isWaitingForApproval && task?.urgentRequest !== true && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <Clock3 className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-purple-800">
              Waiting for Client Approval
            </p>
            <p className="text-xs text-purple-600 mt-1">
              You have submitted this task for client review. The client will approve or request changes.
            </p>
          </div>
        </div>
      )}

      {/* Urgent request banner (Expert sees this) */}
      {isExpert && task?.urgentRequest === true && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              Urgent Request
            </p>
            <p className="text-xs text-red-650 mt-1">
              Client đang yêu cầu sản phẩm khẩn cấp cho task này. Vui lòng nộp sản phẩm để chuyển sang trạng thái chờ duyệt.
            </p>
            {task?.urgentRequestedAt && (
              <p className="text-xs text-red-400 mt-1 font-mono">
                Requested: {new Date(task.urgentRequestedAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
        </div>
      )}

      {isTaskLocked && (
        <div className="bg-brand-green/10 border border-brand-green/20 rounded-lg p-4 mb-6 flex items-start gap-3">
          <Lock className="w-5 h-5 text-brand-green flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-brand-green">
              Task Completed — Locked
            </p>
            <p className="text-xs text-brand-green/80 mt-1">
              This task has been approved and is now locked. No further modifications can be made.
            </p>
          </div>
        </div>
      )}

      {/* Revision request modal (3-step flow) */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            {/* Step 1: Revision Type Selection */}
            {revisionStep === "select-type" && (
              <>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  What would you like to revise?
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Choose whether to reopen the entire task or only specific mini tasks.
                </p>
                <div className="space-y-3 mb-6">
                  <label
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors",
                      revisionType === "entire"
                        ? "border-brand-primary bg-brand-primary-light"
                        : "border-gray-200 hover:border-brand-primary/20"
                    )}
                  >
                    <input
                      type="radio"
                      name="revisionType"
                      value="entire"
                      checked={revisionType === "entire"}
                      onChange={() => setRevisionType("entire")}
                      className="w-4 h-4 text-brand-primary"
                    />
                    <div>
                      <p className="font-semibold text-gray-900">Entire Task</p>
                      <p className="text-xs text-gray-500">Reopen all mini tasks for revision</p>
                    </div>
                  </label>
                  <label
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors",
                      revisionType === "mini"
                        ? "border-brand-primary bg-brand-primary-light"
                        : "border-gray-200 hover:border-brand-primary/20"
                    )}
                  >
                    <input
                      type="radio"
                      name="revisionType"
                      value="mini"
                      checked={revisionType === "mini"}
                      onChange={() => setRevisionType("mini")}
                      className="w-4 h-4 text-brand-primary"
                    />
                    <div>
                      <p className="font-semibold text-gray-900">Specific Mini Tasks</p>
                      <p className="text-xs text-gray-500">Select which mini tasks need revision</p>
                    </div>
                  </label>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRevisionModal(false);
                      setRevisionStep("select-type");
                      setRevisionType("entire");
                      setSelectedMiniTaskIds(new Set());
                      setRevisionFeedback("");
                    }}
                    className="h-11 px-5 border border-gray-300 text-gray-600 rounded-[14px] hover:bg-gray-50 text-base font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (revisionType === "mini") {
                        setRevisionStep("select-tasks");
                      } else {
                        setRevisionStep("write-reason");
                      }
                    }}
                    className="h-11 px-5 bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover text-base font-semibold"
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {/* Step 2: Select Mini Tasks (only for mini task revision) */}
            {revisionStep === "select-tasks" && (
              <>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Select Mini Tasks to Revise
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Check the mini tasks you want the expert to revise.
                </p>
                <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
                  {miniTasks.map((mt) => {
                    const isSelected = selectedMiniTaskIds.has(mt.id);
                    return (
                      <label
                        key={mt.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                          isSelected
                            ? "border-brand-primary bg-brand-primary-light"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            const next = new Set(selectedMiniTaskIds);
                            if (isSelected) next.delete(mt.id);
                            else next.add(mt.id);
                            setSelectedMiniTaskIds(next);
                          }}
                          className="w-4 h-4 text-brand-primary rounded"
                        />
                        <span className="text-sm font-medium text-gray-800">{mt.title}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="flex justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setRevisionStep("select-type");
                      setSelectedMiniTaskIds(new Set());
                    }}
                    className="h-11 px-5 border border-gray-300 text-gray-600 rounded-[14px] hover:bg-gray-50 text-base font-semibold"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setRevisionStep("write-reason")}
                    disabled={selectedMiniTaskIds.size === 0}
                    className="h-11 px-5 bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-base font-semibold"
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {/* Step 3: Revision Reason */}
            {revisionStep === "write-reason" && (
              <>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Provide Revision Reason
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Describe what needs to be changed. This will be shown to the expert.
                </p>
                <textarea
                  value={revisionFeedback}
                  onChange={(e) => setRevisionFeedback(e.target.value)}
                  placeholder="Describe what needs to be changed..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary mb-6 resize-none"
                  rows={4}
                  autoFocus
                />
                <div className="flex justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRevisionModal(false);
                      setRevisionStep("select-type");
                      setRevisionType("entire");
                      setSelectedMiniTaskIds(new Set());
                      setRevisionFeedback("");
                    }}
                    className="h-11 px-5 border border-gray-300 text-gray-600 rounded-[14px] hover:bg-gray-50 text-base font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRevisionClick}
                    disabled={revisionLoading || !revisionFeedback.trim()}
                    className="h-11 px-5 bg-orange-600 text-white rounded-[14px] hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-base font-semibold inline-flex items-center gap-2 transition-colors"
                  >
                    {revisionLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Submit Revision Request
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mini tasks section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-8 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Mini Tasks</h2>
            <p className="text-sm text-gray-500">
              {isExpert
                ? "Track and manage individual work items for this task."
                : "View work breakdown for this task."}
            </p>
          </div>
        </div>

        {/* Mini task checklist */}
        <MiniTaskChecklist
          miniTasks={miniTasks}
          editable={canToggleMiniTasks}
          onToggle={(miniTaskId) => handleToggleMiniTask(taskId, miniTaskId)}
          onUpdate={(miniTaskId, updates) => handleUpdateMiniTask(taskId, miniTaskId, updates)}
          compact={false}
        />

        {/* Client: No mini tasks message */}
        {isClient && !hasMiniTasks && (
          <div className="py-4 text-center">
            <p className="text-sm text-gray-400 italic">
              Mini tasks will be generated from the accepted proposal.
            </p>
          </div>
        )}

        {/* Expert: No mini tasks message */}
        {isExpert && !hasMiniTasks && (
          <div className="py-4 text-center">
            <p className="text-sm text-gray-400 italic">
              Mini tasks are generated from the accepted proposal. Contact the client if tasks are missing.
            </p>
          </div>
        )}

        {/* ── Bottom action bar (Submit Product / Approve / Request Product / View Product) ── */}
        {((isExpert && !isDone) || isClient) && (
          <div className="pt-4 border-t border-gray-100">
            {/* Expert actions: Submit Product / Submit for Review */}
            {isExpert && !isDone && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  {task?.urgentRequest === true ? (
                    <Button
                      variant="default"
                      size="default"
                      fullWidth
                      onClick={() => {
                        setProductLinkInput(task.productLink || "");
                        setProductFileInput(task.productFile || "");
                        setShowProductModal(true);
                      }}
                      className="flex-1 bg-amber-500 text-white hover:bg-amber-600 font-semibold text-base inline-flex items-center justify-center gap-2 h-11 rounded-[14px] cursor-pointer"
                    >
                      <Send className="w-5 h-5" />
                      Submit Product (Nộp sản phẩm)
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="default"
                      fullWidth
                      disabled={!allComplete || isWaitingForApproval}
                      onClick={handleDoneClick}
                      loading={submitLoading}
                      className="flex-1 bg-brand-primary text-white hover:bg-brand-primary-hover font-semibold text-base inline-flex items-center justify-center gap-2 h-11 rounded-[14px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {submitLoading ? "Processing..." : "Submit for Review (Nộp để duyệt)"}
                    </Button>
                  )}
                </div>
                {!allComplete && task?.urgentRequest !== true && (
                  <p className="text-xs text-gray-400 text-center">
                    Tích hoàn thành 100% Mini Tasks để mở khóa nút "Submit for Review".
                  </p>
                )}
                {task?.urgentRequest === true && (
                  <p className="text-xs text-red-500 font-semibold text-center animate-pulse">
                    Client đang yêu cầu sản phẩm khẩn cấp! Nút "Submit Product" đã được mở khóa.
                  </p>
                )}
              </div>
            )}

            {/* Client actions: Quick Accept, Request Product, View Product */}
            {isClient && (
              <div className="space-y-3">
                {/* 1. Checklist Completed OR Waiting for Approval WITHOUT deliverables: Render Accept & Request Product if NOT requested yet */}
                {((task.displayStatus === "Checklist Completed") || (isWaitingForApproval && !hasMainProduct)) && task.urgentRequest !== true && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="success"
                      size="default"
                      fullWidth
                      loading={approveLoading}
                      onClick={handleApproveClick}
                      icon={!approveLoading ? ThumbsUp : undefined}
                      className="flex-1 cursor-pointer font-bold bg-brand-green hover:bg-brand-green/90 text-white border-brand-green"
                    >
                      {approveLoading ? "Processing..." : "Accept (Phê duyệt)"}
                    </Button>
                    <Button
                      variant="danger"
                      size="default"
                      fullWidth
                      loading={urgentLoading}
                      onClick={handleUrgentClick}
                      icon={!urgentLoading ? AlertTriangle : undefined}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white border-amber-500 cursor-pointer font-bold"
                    >
                      {urgentLoading ? "Sending..." : "Request Product (Yêu cầu sản phẩm)"}
                    </Button>
                  </div>
                )}

                {/* 1b. Checklist Completed OR Waiting for Approval WITHOUT deliverables: Render waiting banner if product has been requested */}
                {((task.displayStatus === "Checklist Completed") || (isWaitingForApproval && !hasMainProduct)) && task.urgentRequest === true && (
                  <div className="flex items-center justify-center p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-850 text-base font-semibold gap-2 shadow-sm font-sans">
                    <Clock3 className="w-5 h-5 text-amber-600 animate-pulse" />
                    Đang chờ Expert nộp sản phẩm (Waiting for Expert submission)...
                  </div>
                )}

                {/* 2. Waiting For Approval WITH deliverables: Render View Product */}
                {isWaitingForApproval && hasMainProduct && (
                  <div className="flex justify-end">
                    <Button
                      variant="default"
                      size="default"
                      fullWidth
                      onClick={() => setShowViewProductModalClient(true)}
                      className="flex-1 bg-brand-primary text-white hover:bg-brand-primary-hover font-semibold text-base inline-flex items-center justify-center gap-2 h-11 rounded-[14px] cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      View Product (Xem sản phẩm)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Urgent request confirmation modal */}
      {showUrgentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  Send Urgent Request?
                </h3>
                <p className="text-sm text-gray-600">
                  This task is overdue or delayed. Do you want to request the Expert to complete and submit this task immediately?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button
                variant="outline"
                size="default"
                onClick={() => setShowUrgentModal(false)}
                disabled={urgentLoading}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="default"
                loading={urgentLoading}
                onClick={handleUrgentClick}
                icon={!urgentLoading ? AlertTriangle : undefined}
              >
                {urgentLoading ? "Sending..." : "Send Urgent Request"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Feedbacks Panel */}
      {isNeedsRevision && task.declineReason && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5 mb-8 text-left shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-650" />
            <h3 className="text-lg font-bold text-red-800">
              Lý do từ chối (Decline Reason)
            </h3>
          </div>
          <p className="text-sm font-semibold text-red-700 leading-relaxed bg-white border border-red-200 rounded-lg p-4 font-sans">
            {task.declineReason}
          </p>
        </div>
      )}

      {/* Submit Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6 text-left">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Nộp sản phẩm bàn giao (Deliverables)
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Cung cấp link sản phẩm hoặc tên file đính kèm để gửi cho Client kiểm tra.
            </p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Link sản phẩm
                </label>
                <input
                  type="text"
                  value={productLinkInput}
                  onChange={(e) => setProductLinkInput(e.target.value)}
                  placeholder="https://example.com/demo-product"
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary font-sans"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Tên file
                </label>
                <input
                  type="text"
                  value={productFileInput}
                  onChange={(e) => setProductFileInput(e.target.value)}
                  placeholder="project_output_v1.zip"
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary font-sans"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <Button
                variant="outline"
                size="default"
                onClick={() => setShowProductModal(false)}
                disabled={productSubmitLoading}
              >
                Hủy
              </Button>
              <Button
                variant="default"
                size="default"
                onClick={handleProductSubmit}
                loading={productSubmitLoading}
                disabled={!productLinkInput.trim() && !productFileInput.trim()}
                className="bg-brand-primary text-white hover:bg-brand-primary-hover font-semibold h-11 rounded-[14px]"
              >
                {productSubmitLoading ? "Đang gửi..." : "Gửi sản phẩm"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Client View Product Modal */}
      {showViewProductModalClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all">
          <div className="bg-white rounded-2xl border border-gray-150 shadow-2xl w-full max-w-2xl overflow-hidden text-left">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900 font-sans">Sản phẩm nộp cho: {task?.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5 font-sans">Chi tiết các file và link do chuyên gia cung cấp</p>
              </div>
              <button
                onClick={() => setShowViewProductModalClient(false)}
                className="p-1.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto font-sans">
              <div className="space-y-4">
                {!task?.productLink && !task?.productFile ? (
                  <p className="text-sm text-gray-500 italic text-center">Chuyên gia chưa upload sản phẩm nào.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {task?.productLink && (
                      <div className="flex flex-col p-3 bg-gray-50 rounded-xl border border-gray-250 text-left">
                        <span className="text-xs font-semibold text-gray-500 uppercase font-sans">Link sản phẩm bàn giao</span>
                        <a
                          href={task.productLink.startsWith("http") ? task.productLink : `https://${task.productLink}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-brand-primary font-medium mt-1 truncate hover:underline flex items-center gap-1 font-sans"
                        >
                          {task.productLink}
                          <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                        </a>
                      </div>
                    )}
                    {task?.productFile && (
                      <div className="flex flex-col p-3 bg-gray-50 rounded-xl border border-gray-250 text-left">
                        <span className="text-xs font-semibold text-gray-500 uppercase font-sans">Tên file sản phẩm</span>
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
                    onClick={handleDeclineFromModalClient}
                    className="px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-750 font-bold rounded-xl text-sm transition-all border border-red-200/50 shadow-sm flex items-center gap-1.5 cursor-pointer font-sans"
                  >
                    <X className="w-4 h-4" />
                    Từ chối (Decline)
                  </button>
                  <button
                    type="button"
                    onClick={handleApproveClick}
                    className="px-5 py-2.5 bg-brand-green hover:bg-brand-green/90 text-white font-bold rounded-xl text-sm transition-all shadow-sm flex items-center gap-1.5 cursor-pointer font-sans"
                  >
                    <Check className="w-4 h-4" />
                    Phê duyệt (Accept)
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowViewProductModalClient(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-all border border-gray-200 shadow-sm font-sans cursor-pointer"
                >
                  Đóng
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Activity Timeline */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mt-8">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Activity Timeline</h2>
            <p className="text-sm text-gray-500">
              Chronological record of all task actions.
            </p>
          </div>
        </div>
        <TaskActivityTimeline
          taskId={taskId}
          loading={false}
          compact={false}
        />
      </div>
    </div>
  );
}
