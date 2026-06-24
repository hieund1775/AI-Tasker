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
    handleSubmitForReview,
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

  // Find the current task from the tasks array
  const task = tasks.find((t) => t.id === taskId);

  // Derived miniTasks — declared early because handlers below reference it
  const miniTasks = task?.miniTasks || [];

  // ---- Handlers ----

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

  // ---- Derived values ----
  const isExpert = role === "expert";
  const isClient = role === "client";

  const allComplete = task ? areAllMiniTasksCompleted(taskId) : false;
  const hasMiniTasks = miniTasks.length > 0;

  const displayStatus = task ? deriveTaskDisplayStatus(task) : "Not Started";
  const isDone = displayStatus === "Done";
  const isWaitingForApproval = displayStatus === "Waiting For Approval";
  const isReopenRequested = displayStatus === "Reopen Requested";
  const isNeedsRevision = displayStatus === "Needs Revision";
  const isNotStarted = displayStatus === "Not Started";
  const isInProgress = displayStatus === "In Progress";

  // Deadline info for badge
  const deadlineInfo = task?.deadline ? getDeadlineInfo(task.deadline) : null;

  // Expert can toggle mini task checkboxes when task is not Done and not waiting for approval
  const canToggleMiniTasks = isExpert && !isDone && !isWaitingForApproval;

  // Expert can submit for review: all mini tasks complete, not already submitted/approved
  const canSubmitForReview =
    isExpert && allComplete && !isDone && !isWaitingForApproval;

  // Client can approve: task is waiting for approval
  const canApprove = isClient && isWaitingForApproval;

  // Client can request revision: task is waiting for approval
  const canRequestRevision = isClient && isWaitingForApproval;

  // Client can request reopen when task is Done — DEPRECATED: completed tasks are now permanently locked
  const canRequestReopen = false;

  // Client can request urgent submission: task is not Done, not waiting for approval, and overdue/close to deadline
  const isOverdueOrClose = deadlineInfo?.urgency === "overdue" || deadlineInfo?.urgency === "warning";
  const canRequestUrgent = isClient && !isDone && !isWaitingForApproval && isOverdueOrClose;
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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-2xl font-semibold text-gray-900">{task.title}</h1>
              <StatusBadge status={displayStatus} entity="task" />
            </div>

            {task.description && (
              <p className="text-sm text-gray-600 mt-2">{task.description}</p>
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
          </div>

          {/* Status indicators (non-action) */}
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
              Needs Revision
            </p>
            <p className="text-xs text-orange-600 mt-1">
              The client has requested changes to this task.
            </p>
          </div>
        </div>
      )}

      {isWaitingForApproval && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <Clock3 className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-purple-800">
              Waiting For Approval
            </p>
            <p className="text-xs text-purple-600 mt-1">
              {isExpert
                ? "You have submitted this task for client review. The client will approve or request changes."
                : "The expert has submitted this task for your review."}
            </p>
          </div>
        </div>
      )}

      {/* Urgent request banner (Expert sees this) */}
      {isExpert && task?.urgentRequest === true && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">
              Client requested immediate completion and submission for this task.
            </p>
            <p className="text-xs text-red-600 mt-1">
              Please complete all mini tasks and submit this task for review as soon as possible.
            </p>
            {task?.urgentRequestedAt && (
              <p className="text-xs text-red-400 mt-1">
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

        {/* ── Bottom action bar (Submit For Review / Approve / Revise / Urgent) ── */}
        {((isExpert && !isDone && !isWaitingForApproval) || canApprove || canRequestRevision || canRequestReopen || canRequestUrgent) && (
          <div className="pt-4 border-t border-gray-100">
            {/* Expert: Submit For Review */}
            {isExpert && !isDone && !isWaitingForApproval && (
              <div className="space-y-3">
                <Button
                  variant="success"
                  size="default"
                  fullWidth
                  loading={submitLoading}
                  disabled={!allComplete}
                  onClick={handleDoneClick}
                  icon={!submitLoading ? Send : undefined}
                >
                  {submitLoading ? "Submitting..." : "Submit For Review"}
                </Button>
                {!allComplete && (
                  <p className="text-xs text-gray-400 text-center">
                    Complete all mini tasks before submitting this task for review.
                  </p>
                )}
              </div>
            )}

            {/* Client: Approve + Request Revision */}
            {isClient && isWaitingForApproval && (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="success"
                  size="default"
                  fullWidth
                  loading={approveLoading}
                  onClick={handleApproveClick}
                  icon={!approveLoading ? ThumbsUp : undefined}
                >
                  {approveLoading ? "Processing..." : "Approve Task"}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRevisionModal(true);
                    setRevisionStep("select-type");
                    setRevisionType("entire");
                    setSelectedMiniTaskIds(new Set());
                    setRevisionFeedback("");
                  }}
                  className="flex-1 h-11 px-5 bg-orange-600 text-white rounded-[14px] hover:bg-orange-700 text-base font-semibold inline-flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  Request Revision
                </button>
              </div>
            )}

            {/* Client: Request Reopen (DEPRECATED — completed tasks are now permanently locked) */}
            {canRequestReopen && (
              <button
                type="button"
                onClick={handleReopenClick}
                disabled={reopenLoading}
                className="w-full h-11 px-5 bg-orange-600 text-white rounded-[14px] hover:bg-orange-700 disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                {reopenLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Request Reopen
                  </>
                )}
              </button>
            )}

            {/* Client: Request Urgent Submission (overdue/delayed tasks only) */}
            {canRequestUrgent && (
              <div className="space-y-3">
                {urgentAlreadySent ? (
                  <div className="w-full px-5 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Urgent request already sent
                  </div>
                ) : (
                  <Button
                    variant="danger"
                    size="default"
                    fullWidth
                    icon={AlertTriangle}
                    onClick={() => setShowUrgentModal(true)}
                  >
                    Request Urgent Submission
                  </Button>
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
