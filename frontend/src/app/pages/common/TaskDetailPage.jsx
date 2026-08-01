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
  MessageSquare,
  Download,
  ExternalLink,
  FileText,
  Upload,
  Paperclip,
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
import { getTaskDeadlineInfo, isTaskOverdue } from "../../lib/taskDeadlineUtils.js";
import { getFileSizeErrorMessage, validateUploadFiles } from "../../lib/fileValidation.js";
import { cn } from "../../lib/utils.js";
import { safeArray, safeDateFormat, safeDateTimeFormat } from "../../lib/safety.js";
import { toast } from "sonner";
import { api } from "../../../services/api.js";
import { enrichFileUrl } from "../../../services/api.js";
import {
  notifyTaskSubmittedForReview,
  notifyTaskApproved,
  notifyTaskRevisionRequested,
  notifyMiniTaskRevisionRequested,
  notifyUrgentSubmissionRequested,
} from "../../../services/notificationHelper.js";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import { SectionCard } from "../../components/shared/SectionCard.jsx";
import { BackButton } from "../../components/shared/BackButton.jsx";

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
    // Legacy: plain text filename or URL
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
  const enriched = rawUrl.startsWith("http") ? rawUrl : enrichFileUrl(rawUrl);
  try {
    const response = await fetch(enriched);
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = fileName || enriched.split("/").pop() || "downloaded-file";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  } catch (err) {
    window.open(enriched, "_blank");
  }
}

// =============================================================================
// TaskDetailPage - dedicated task detail page for both client and expert.
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
    handleSubmitHandoverEvidence,
    handleQuickAccept,
    handleRequestProduct,
    handleSubmitForReview,
    handleSubmitProduct,
    handleApproveTask,
    handleRequestRevision,
    handleRequestReopen,
    handleRequestUrgentSubmission,
    handleRequestMiniTaskRevision,
    handleExpertSubmitProduct,
    handleClientAcceptProduct,
    handleClientDeclineProduct,
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
  const [revisionStep, setRevisionStep] = useState("write-reason"); // "select-type" | "select-tasks" | "write-reason"
  const [revisionType, setRevisionType] = useState("entire"); // "entire" | "mini"
  const [selectedMiniTaskIds, setSelectedMiniTaskIds] = useState(new Set());
  const [revisionFeedback, setRevisionFeedback] = useState("");

  // Deliverables Submit modal state
  const [showProductModal, setShowProductModal] = useState(false);
  const [productLinkInput, setProductLinkInput] = useState("");
  const [productFileInput, setProductFileInput] = useState("");
  const [productFileObject, setProductFileObject] = useState(null);
  const [productFileError, setProductFileError] = useState("");
  const [productSubmitLoading, setProductSubmitLoading] = useState(false);

  // Client view product modal state
  const [showViewProductModalClient, setShowViewProductModalClient] = useState(false);

  // Evidence submission modal state
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [evidenceGitSha, setEvidenceGitSha] = useState("");
  const [evidenceReportLink, setEvidenceReportLink] = useState("");
  const [evidenceExplanation, setEvidenceExplanation] = useState("");
  const [evidenceSubmitting, setEvidenceSubmitting] = useState(false);

  // Find the current task from the tasks array
  const safeTasks = safeArray(tasks);
  const task = safeTasks.find((t) => t.id === taskId);

  // Derived miniTasks - declared early because handlers below reference it
  const miniTasks = safeArray(task?.miniTasks);

  // ---- Evidence submission handler ----
  const handleEvidenceSubmit = useCallback(async () => {
    setEvidenceSubmitting(true);
    try {
      const success = await handleSubmitHandoverEvidence(taskId, {
        gitSha: "",
        reportLink: "",
        explanation: "Handover evidence submitted by Expert.",
      });
      if (success) {
        toast.success("Handover evidence submitted! Task is now Checklist Completed.");
        window.dispatchEvent(new CustomEvent("aitasker_db_update"));
        navigate(`/${role}/projects/${projectId}#project-progress`, {
          replace: true,
        });
      } else {
        toast.error("Failed to submit evidence.");
      }
      setShowEvidenceModal(false);
    } catch (err) {
      toast.error("Failed to submit evidence.");
    } finally {
      setEvidenceSubmitting(false);
    }
  }, [taskId, role, projectId, navigate, handleSubmitHandoverEvidence]);

  // ---- Handlers ----

  const handleProductSubmit = useCallback(async () => {
    if (!productLinkInput.trim() && !productFileObject) {
      toast.error("Please provide a product link or file!");
      return;
    }
    setProductSubmitLoading(true);
    try {
      let productFileValue = "";
      if (productFileObject) {
        const formData = new FormData();
        formData.append("file", productFileObject);
        try {
          const result = await api.post("/JobPosts/upload-file", formData, { isFormData: true });
          if (result?.url) {
            productFileValue = JSON.stringify({
              url: result.url,
              name: productFileObject.name,
              size: productFileObject.size,
              type: productFileObject.type,
            });
          }
        } catch (err) {
          console.warn("Failed to upload product file:", err);
          toast.error("File upload failed. Please try again.");
          setProductSubmitLoading(false);
          return;
        }
      }
      const success = await handleSubmitProduct(taskId, productLinkInput.trim(), productFileValue);
      if (success) {
        toast.success("Deliverables submitted successfully.");
        setShowProductModal(false);
        setProductFileError("");

        notifyTaskSubmittedForReview({
          clientUserId: project?.clientId || project?.ClientId || client?.id,
          expertName: expert?.fullName || "Expert",
          taskTitle: task?.title,
          projectId,
          taskId,
        }).catch(() => { });
      } else {
        toast.error("Failed to submit product.");
      }

      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    } catch (err) {
      toast.error("Failed to submit product.");
    } finally {
      setProductSubmitLoading(false);
    }
  }, [taskId, productLinkInput, productFileObject, handleSubmitProduct, project, expert, task, projectId]);

  const handleDoneClick = useCallback(async () => {
    setSubmitLoading(true);
    try {
      const success = await handleSubmitForReview(taskId);
      if (success) {
        toast.success("Task submitted for client review!");
        // Notify client
        notifyTaskSubmittedForReview({
          clientUserId: project?.clientId || project?.ClientId || client?.id,
          expertName: expert?.fullName || "Expert",
          taskTitle: task?.title,
          projectId,
          taskId,
        }).catch(() => { });
        // Redirect back to project progress
        navigate(`/${role}/projects/${projectId}#project-progress`, {
          replace: true,
        });
      } else {
        toast.error("Failed to submit task for review.");
      }
    } catch (err) {
      toast.error("Failed to submit task for review.");
    } finally {
      setSubmitLoading(false);
    }
  }, [taskId, role, projectId, navigate, handleSubmitForReview, project, expert, task]);

  const handleApproveClick = useCallback(async () => {
    setApproveLoading(true);
    try {
      const success = await handleApproveTask(taskId);
      if (success) {
        toast.success("Task approved!");
        // Notify expert
        notifyTaskApproved({
          expertUserId: project?.expertId || project?.ExpertId || project?.assignedExpertId,
          clientName: client?.fullName || "Client",
          taskTitle: task?.title,
          projectId,
          taskId,
        }).catch(() => { });
        window.dispatchEvent(new CustomEvent("aitasker_db_update"));
      } else {
        toast.error("Failed to approve task.");
      }
    } catch (err) {
      toast.error("Failed to approve task.");
    } finally {
      setApproveLoading(false);
    }
  }, [taskId, projectId, handleApproveTask, project, client, task]);

  const handleQuickAcceptClick = useCallback(async () => {
    setApproveLoading(true);
    try {
      const success = await handleQuickAccept(taskId);
      if (success) {
        toast.success("Task accepted! (Quick Accept)");
        window.dispatchEvent(new CustomEvent("aitasker_db_update"));
        navigate(`/${role}/projects/${projectId}#project-progress`, {
          replace: true,
        });
      } else {
        toast.error("Failed to accept task.");
      }
    } catch (err) {
      toast.error("Failed to accept task.");
    } finally {
      setApproveLoading(false);
    }
  }, [taskId, role, projectId, navigate, handleQuickAccept]);

  const handleRevisionClick = useCallback(async () => {
    if (!revisionFeedback.trim()) {
      toast.error("Please provide feedback for the revision request.");
      return;
    }
    setRevisionLoading(true);
    try {
      if (revisionType === "mini") {
        const miniTaskIdsArr = Array.from(selectedMiniTaskIds);
        await handleRequestMiniTaskRevision(taskId, miniTaskIdsArr, revisionFeedback.trim());
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
        }).catch(() => { });
        toast.success("Revision requested for selected mini-tasks. The expert can now edit them.");
      } else {
        await handleRequestRevision(taskId, revisionFeedback.trim());
        notifyTaskRevisionRequested({
          expertUserId: project?.expertId || project?.ExpertId || project?.assignedExpertId,
          clientName: client?.fullName || "Client",
          taskTitle: task?.title,
          feedback: revisionFeedback.trim(),
          projectId,
          taskId,
        }).catch(() => { });
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
      await handleRequestReopen(taskId);
      toast.success("Reopen requested. The expert can now edit mini-tasks.");
    } catch (err) {
      toast.error("Failed to request reopen.");
    } finally {
      setReopenLoading(false);
    }
  }, [taskId, handleRequestReopen]);

  const handleUrgentClick = useCallback(async () => {
    setUrgentLoading(true);
    try {
      await handleRequestUrgentSubmission(taskId);
      toast.success("Urgent submission requested. The expert has been notified.");
      // Notify expert
      notifyUrgentSubmissionRequested({
        expertUserId: project?.assignedExpertId,
        clientName: client?.fullName || "Client",
        taskTitle: task?.title,
        projectId,
        taskId,
      }).catch(() => { });
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
    toast.info("Please fill in decline reason details.");
  }, []);

  // ---- Derived values ----
  const isExpert = role === "expert";
  const isClient = role === "client";

  const allComplete = task ? areAllMiniTasksCompleted(taskId) : false;
  const hasMiniTasks = miniTasks.length > 0;

  const displayStatus = task ? deriveTaskDisplayStatus(task) : "Not Started";
  const isDone = displayStatus === "Done";
  const isWaitingForApproval =
    task?.status?.toLowerCase() === "pending approval" ||
    task?.status?.toLowerCase() === "pending_approval" ||
    task?.status?.toLowerCase() === "waiting_for_approval" ||
    task?.status?.toLowerCase() === "waiting for approval" ||
    task?.status?.toLowerCase() === "pending_review" ||
    task?.status?.toLowerCase() === "pending review" ||
    displayStatus === "Waiting For Approval";
  const hasMainProduct = task ? !!(task.productLink || task.productFile) : false;
  const isReopenRequested = task?.status === "reopen_requested" || task?.status === "Reopen Requested" || task?.status === "reopen requested";
  const isNeedsRevision = !isDone && !isWaitingForApproval && !!task?.declineReason;
  const isNotStarted = displayStatus === "Not Started";
  const isInProgress = displayStatus === "In Progress";
  const isDisputed = project?.status?.toLowerCase() === "disputed";
  const isProjectClosed = ["completed", "cancelled", "cancel_done", "stopped", "terminated"].includes((project?.status || "").toLowerCase());

  // Deadline info for badge - use computed deadline from taskDeadlineUtils
  const taskDeadlineData = projectId ? getTaskDeadlineInfo(projectId, taskId, null) : null;
  const computedDeadline = taskDeadlineData?.deadline || task?.deadline;
  const deadlineInfo = computedDeadline ? getDeadlineInfo(computedDeadline) : null;
  const taskOverdue = projectId ? isTaskOverdue(projectId, taskId, null) : false;

  // Expert can toggle mini task checkboxes when task is not Done and not waiting for approval
  const canToggleMiniTasks = isExpert && !isDone && !isWaitingForApproval && !isDisputed && !isProjectClosed;

  // Expert can submit for review: all mini tasks complete, not already submitted/approved
  const canSubmitForReview =
    isExpert && allComplete && !isDone && !isWaitingForApproval && !isDisputed && !isProjectClosed;

  // Client can approve: task is waiting for approval
  const canApprove = isClient && isWaitingForApproval && !isDisputed && !isProjectClosed;

  // Client can request revision: task is waiting for approval
  const canRequestRevision = isClient && isWaitingForApproval && !isDisputed && !isProjectClosed;

  // Client can request reopen when task is Done - DEPRECATED: completed tasks are now permanently locked
  const canRequestReopen = false;

  // Client can request urgent submission: task is not Done, not waiting for approval, and overdue/close to deadline
  const isOverdueOrClose = deadlineInfo?.urgency === "overdue" || deadlineInfo?.urgency === "warning";
  const canRequestUrgent = isClient && !isDone && !isWaitingForApproval && isOverdueOrClose && !isDisputed;
  const urgentAlreadySent = task?.urgentRequest === true;

  // Task is locked (Done) - no modifications allowed
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
  const deadlineText = safeDateFormat(computedDeadline, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen space-y-6">
      <BackButton fallback={`/${role}/projects/${projectId}`} className="mb-0">
        Back to project
      </BackButton>

      <PageHeader
        title={task.title}
        subtitle={task.description || undefined}
        badge={
          <div className="flex items-center gap-2">
            <StatusBadge status={displayStatus} entity="task" />
          </div>
        }
        actions={
          <div className="flex items-center gap-3 flex-shrink-0">
            {isWaitingForApproval && isExpert && (
              <div className="px-4 py-2 bg-accent-light text-accent rounded-lg text-sm font-medium flex items-center gap-2 border border-accent/20">
                <Clock3 className="w-4 h-4" /> Waiting for Client Approval
              </div>
            )}
            {isWaitingForApproval && isClient && !canApprove && (
              <div className="px-4 py-2 bg-accent-light text-accent rounded-lg text-sm font-medium flex items-center gap-2 border border-accent/20">
                <Clock3 className="w-4 h-4" /> Under Review
              </div>
            )}
            {isDone && (
              <div className="inline-flex items-center gap-2 rounded-lg border border-success/25 bg-success-light px-3 py-1.5 text-sm font-semibold text-success">
                <Lock className="w-4 h-4" /> Task Completed
              </div>
            )}
          </div>
        }
        compact
      />

      <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-2 lg:items-center">
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-foreground">Task Progress</h3>
            <div className="grid w-full grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-secondary/35 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-0.5">Tasks</p>
                <p className="font-semibold text-foreground text-sm">
                  {task.completedMiniTasks}/{task.totalMiniTasks} completed
                </p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/35 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-0.5">Progress</p>
                <p className="font-semibold text-foreground text-sm">{task.progress}%</p>
              </div>
            </div>

          </div>

          <TaskAcceptanceStepper
            displayStatus={displayStatus}
            isWaitingForApproval={isWaitingForApproval}
            isDone={isDone}
            hasMainProduct={hasMainProduct}
            task={task}
          />
        </div>
      </div>

      {/* Deliverables Panel */}
      {hasMainProduct && (
        <div className="bg-card rounded-xl border border-border p-4 text-left shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <h3 className="text-xs font-semibold text-foreground/85 font-sans uppercase tracking-wider">
              Submitted Deliverables
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {task.productLink && (
              <div className="flex flex-col p-3 bg-secondary/60 rounded-xl border border-border/80 text-left">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase font-sans">Product link</span>
                <a
                  href={task.productLink.startsWith("http") ? task.productLink : `https://${task.productLink}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-primary hover:text-brand-primary-hover font-semibold mt-1 truncate hover:underline flex items-center gap-0.5"
                >
                  {task.productLink}
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>
            )}
            {task.productFile && (
              <div className="flex flex-col p-3 bg-secondary/60 rounded-xl border border-border/80 text-left">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase font-sans">Attached File</span>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="text-xs text-foreground/80 font-mono truncate">
                    {(() => { const r = resolveProductFile(task.productFile); return r ? r.name : task.productFile; })()}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <a
                      href={(() => { const r = resolveProductFile(task.productFile); return r ? r.url : "#"; })()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-muted-foreground hover:text-brand-primary hover:bg-brand-primary/10 rounded-md transition-colors"
                      title="View file"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={(e) => {
                        const r = resolveProductFile(task.productFile);
                        if (r) downloadFileBlob(r.url, r.name);
                      }}
                      className="p-1.5 text-muted-foreground hover:text-brand-primary hover:bg-brand-primary/10 rounded-md transition-colors cursor-pointer"
                      title="Download file"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status info banner */}
      {isReopenRequested && (
        <div className="bg-warning-light border border-warning/20 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warning">
              Reopen requested
            </p>
            <p className="text-xs text-warning mt-1">
              {isExpert
                ? "The client has requested changes. You can now edit the mini-tasks and confirm them again."
                : "You have requested a revision. The expert can now edit the mini-tasks."}
            </p>
          </div>
        </div>
      )}

      {isNeedsRevision && (
        <div className="bg-warning-light border border-warning/20 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warning">
              Decline
            </p>
            <p className="text-xs text-warning mt-1">
              The client has declined this task and requested changes.
            </p>
          </div>
        </div>
      )}

      {isExpert && isWaitingForApproval && task?.urgentRequest !== true && (
        <div className="bg-accent-light border border-accent/20 rounded-lg p-4 flex items-start gap-3">
          <Clock3 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-accent">
              Waiting for client approval
            </p>
            <p className="text-xs text-accent mt-1">
              You have submitted this task for client review. The client will approve or request changes.
            </p>
          </div>
        </div>
      )}

      {/* Urgent request banner (Expert sees this) */}
      {isExpert && task?.urgentRequest === true && (
        <div className="bg-destructive-light border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-destructive">
              Urgent request
            </p>
            <p className="text-xs text-destructive mt-1">
              Client is requesting product urgently. Please submit deliverables to proceed.
            </p>
            {task?.urgentRequestedAt && (
              <p className="text-xs text-destructive/70 mt-1 font-mono">
                Requested: {safeDateTimeFormat(task.urgentRequestedAt, {
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
        <div className="bg-success-light border border-success/20 rounded-lg p-4 flex items-start gap-3">
          <Lock className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-success">
              Task completed - locked
            </p>
            <p className="text-xs text-success/80 mt-1">
              This task has been approved and is now locked. No further modifications can be made.
            </p>
          </div>
        </div>
      )}

      {/* Revision request modal (Provide Revision Reason directly) */}
      {showRevisionModal && (
        <div data-modal-overlay className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/55">
          <div className="bg-card rounded-lg shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Provide revision reason
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Describe what needs to be changed. This will be shown to the expert.
            </p>
            <textarea
              value={revisionFeedback}
              onChange={(e) => setRevisionFeedback(e.target.value)}
              placeholder="Describe what needs to be changed..."
              className="w-full px-3 py-2 text-sm border border-input rounded-lg focus:ring-2 focus:ring-ring/50 focus:border-ring mb-6 resize-none bg-input-background"
              rows={4}
              autoFocus
            />
            <div className="flex justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowRevisionModal(false);
                  setRevisionFeedback("");
                }}
                className="h-9 px-4 border border-border text-foreground rounded-lg hover:bg-secondary text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevisionClick}
                disabled={revisionLoading || !revisionFeedback.trim()}
                className="h-9 px-4 bg-warning text-warning-foreground rounded-lg hover:bg-warning/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium inline-flex items-center gap-2 transition-colors"
              >
                {revisionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit revision request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mini-tasks section */}
      <div className="bg-card rounded-lg border border-border p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Task: {task?.title}</h2>
            <p className="text-sm text-muted-foreground">
              {isExpert
                ? "Track and manage individual work items for this task."
                : "View work breakdown for this task."}
            </p>
          </div>
        </div>

        {/* Mini-task checklist */}
        <MiniTaskChecklist
          miniTasks={miniTasks}
          editable={canToggleMiniTasks}
          isClosed={isProjectClosed}
          onToggle={(miniTaskId) => handleToggleMiniTask(taskId, miniTaskId)}
          onUpdate={(miniTaskId, updates) => handleUpdateMiniTask(taskId, miniTaskId, updates)}
          compact={false}
        />

        {/* Client: No mini-tasks message */}
        {isClient && !hasMiniTasks && (
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground italic">
              Mini-tasks will be generated from the accepted proposal.
            </p>
          </div>
        )}

        {/* Expert: No mini-tasks message */}
        {isExpert && !hasMiniTasks && (
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground italic">
              Mini-tasks are generated from the accepted proposal. Contact the client if tasks are missing.
            </p>
          </div>
        )}

        {((isExpert && !isDone) || isClient) && (
          <div className="pt-4 border-t border-border">
            {/* Expert actions: Submit Evidence / Submit Product */}
            {isExpert && !isDone && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  {task?.urgentRequest === true || task?.productRequested === true || task?.status === "waiting_expert_product" || displayStatus === "Waiting for Expert Product" || isNeedsRevision || !!(task?.productLink || task?.productFile) ? (
                    <Button
                      variant="default"
                      size="default"
                      disabled={isWaitingForApproval}
                      onClick={() => {
                        setProductLinkInput(task.productLink || "");
                        setProductFileInput(task.productFile || "");
                        setProductFileObject(null);
                        setShowProductModal(true);
                      }}
                      className="mx-auto w-fit min-w-0 border border-brand-primary/45 bg-brand-primary-light px-4 text-brand-primary shadow-sm hover:border-brand-primary hover:bg-brand-primary hover:text-brand-primary-foreground font-semibold text-base inline-flex items-center justify-center gap-2 h-10 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5" />
                      {isWaitingForApproval ? "Waiting for Client approval" : "Submit Product"}
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="default"
                      fullWidth
                      disabled={!allComplete || isWaitingForApproval || displayStatus === "Checklist Completed"}
                      onClick={() => setShowEvidenceModal(true)}
                      className="flex-1 bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover font-semibold text-base inline-flex items-center justify-center gap-2 h-10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      {allComplete && !task?.handoverEvidence ? "Submit handover evidence" : displayStatus === "Checklist Completed" ? "Evidence submitted" : "Complete mini-tasks first"}
                    </Button>
                  )}
                </div>
                {!allComplete && task?.urgentRequest !== true && task?.productRequested !== true && task?.status !== "waiting_expert_product" && (
                  <p className="text-xs text-muted-foreground text-center">
                    Complete 100% of mini-tasks to unlock evidence submission.
                  </p>
                )}
                {(task?.urgentRequest === true || task?.productRequested === true) && (
                  <p className="text-xs text-destructive font-semibold text-center animate-pulse">
                    Client has requested product delivery! Submit Product is now unlocked.
                  </p>
                )}
                {(task?.status === "waiting_expert_product" || displayStatus === "Waiting for Expert Product") && (
                  <p className="text-xs text-warning font-semibold text-center animate-pulse">
                    Client requested revisions! Please submit updated deliverables above.
                  </p>
                )}
              </div>
            )}

            {/* Client actions: Quick Accept, Request Product, View Product */}
            {isClient && (
              <div className="space-y-3">
                {/* 1. Checklist Completed or Pending Approval without product: Render Quick Accept & Request Product */}
                {(isWaitingForApproval || displayStatus === "Checklist Completed") && !task.productRequested && !hasMainProduct && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="success"
                      size="default"
                      fullWidth
                      loading={approveLoading}
                      onClick={handleQuickAcceptClick}
                      icon={!approveLoading ? ThumbsUp : undefined}
                      className="flex-1 cursor-pointer font-semibold bg-brand-green hover:bg-brand-green/90 text-primary-foreground border-brand-green"
                    >
                      {approveLoading ? "Processing..." : "Quick Accept"}
                    </Button>
                    <Button
                      variant="danger"
                      size="default"
                      fullWidth
                      loading={urgentLoading}
                      onClick={async () => {
                        setUrgentLoading(true);
                        try {
                          const success = await handleRequestProduct(taskId);
                          if (success) {
                            toast.success("Product requested from expert!");
                            window.dispatchEvent(new CustomEvent("aitasker_db_update"));
                          } else {
                            toast.error("Failed to request product.");
                          }
                        } catch (err) {
                          toast.error("Failed to request product.");
                        } finally {
                          setUrgentLoading(false);
                        }
                      }}
                      icon={!urgentLoading ? AlertTriangle : undefined}
                      className="flex-1 bg-warning-light hover:bg-warning text-primary-foreground border-warning cursor-pointer font-semibold"
                    >
                      {urgentLoading ? "Sending..." : "Request Product"}
                    </Button>
                  </div>
                )}

                {/* 1b. Waiting for Expert Product: Show static wait message */}
                {task.displayStatus === "Waiting for Expert Product" && (
                  <div className="bg-warning-light border border-warning/20 rounded-lg p-4 text-center">
                    <p className="text-warning font-medium text-sm">
                      Waiting for Expert to submit product...
                    </p>
                  </div>
                )}
                {((task.displayStatus === "Checklist Completed") || (isWaitingForApproval && !hasMainProduct)) && task.urgentRequest === true && (
                  <div className="flex items-center justify-center p-4 bg-warning-light border border-warning/20 rounded-2xl text-warning text-base font-semibold gap-2 shadow-sm font-sans">
                    <Clock3 className="w-5 h-5 text-warning animate-pulse" />
                    Waiting for Expert submission...
                  </div>
                )}

                {/* 2. Deliverables submitted: ALWAYS Render View Product button */}
                {hasMainProduct && (
                  <div className="flex justify-end mt-2">
                    <Button
                      variant="default"
                      size="default"
                      fullWidth
                      onClick={() => setShowViewProductModalClient(true)}
                      className="flex-1 bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover font-semibold text-base inline-flex items-center justify-center gap-2 h-10 rounded-lg cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      View Product
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
        <div data-modal-overlay className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/55">
          <div className="bg-card rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive-light flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Send Urgent Request?
                </h3>
                <p className="text-sm text-muted-foreground">
                  This task is overdue or delayed. Do you want to request the Expert to complete and submit this task immediately?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
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
        <div className="bg-destructive-light border-2 border-destructive/35 rounded-xl p-5 text-left shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h3 className="text-lg font-semibold text-destructive">
              Decline Reason
            </h3>
          </div>
          <p className="text-sm font-semibold text-destructive leading-relaxed bg-card border border-destructive/20 rounded-lg p-4 font-sans">
            {task.declineReason}
          </p>
        </div>
      )}

      {/* Submit Product Modal */}
      {showProductModal && (
        <div data-modal-overlay className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/55">
          <div className="bg-card rounded-xl shadow-xl max-w-md w-full mx-4 p-6 text-left">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Submit Deliverables
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Provide product link or attached file to submit to Client.
            </p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-foreground/80 mb-1">
                  Product link
                </label>
                <input
                  type="text"
                  value={productLinkInput}
                  onChange={(e) => setProductLinkInput(e.target.value)}
                  placeholder="https://example.com/demo-product"
                  className="w-full px-3.5 py-2 text-sm border border-input rounded-xl focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary font-sans"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground/80 mb-1">
                  Attach File
                </label>
                <label className="flex items-center gap-2 px-3.5 py-2.5 text-sm border border-dashed border-input rounded-xl cursor-pointer hover:border-brand-primary/50 hover:bg-secondary/60 transition-colors">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className={productFileObject ? "text-foreground font-medium" : "text-muted-foreground"}>
                    {productFileObject ? productFileObject.name : "Choose file..."}
                  </span>
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const validation = validateUploadFiles([file]);
                        if (!validation.valid) {
                          const message = getFileSizeErrorMessage(file);
                          toast.error(message);
                          setProductFileError(message);
                          setProductFileObject(null);
                          e.target.value = "";
                          return;
                        }
                      }
                      setProductFileError("");
                      setProductFileObject(file || null);
                    }}
                    className="hidden"
                  />
                </label>
                {productFileError && (
                  <p className="mt-1.5 text-xs font-medium text-destructive">
                    {productFileError}
                  </p>
                )}
                {productFileObject && (
                  <button
                    type="button"
                    onClick={() => {
                      setProductFileObject(null);
                      setProductFileError("");
                    }}
                    className="mt-1 text-xs text-destructive hover:text-destructive font-medium"
                  >
                    Remove file
                  </button>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="default"
                onClick={() => {
                  setShowProductModal(false);
                  setProductFileObject(null);
                  setProductFileError("");
                }}
                disabled={productSubmitLoading}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="default"
                onClick={handleProductSubmit}
                loading={productSubmitLoading}
                disabled={productSubmitLoading || (!productLinkInput.trim() && !productFileObject)}
                className="bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover font-semibold h-10 rounded-lg"
              >
                {productSubmitLoading ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Client View Product Modal */}
      {showViewProductModalClient && (
        <div data-modal-overlay className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-2xl overflow-hidden text-left">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-secondary/60 border-b border-border">
              <div>
                <h3 className="text-lg font-semibold text-foreground font-sans">Deliverables for: {task?.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-sans">Details of deliverables provided by the expert</p>
              </div>
              <button
                onClick={() => setShowViewProductModalClient(false)}
                className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-muted-foreground transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto font-sans">
              <div className="space-y-4">
                {!task?.productLink && !task?.productFile && !task?.miniTasks?.some(mt => mt.productLink || mt.productFile) ? (
                  <p className="text-sm text-muted-foreground italic text-center">No deliverables uploaded yet.</p>
                ) : (
                  <div className="space-y-4">
                    {(task?.productLink || task?.productFile) && (
                      <div className="p-4 bg-muted/40 rounded-xl border border-border/80 text-left space-y-3">
                        <h4 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">Main Task Deliverables</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {task?.productLink && (
                            <div className="flex flex-col p-3 bg-secondary/60 rounded-xl border border-border text-left">
                              <span className="text-xs font-semibold text-muted-foreground uppercase font-sans">Handover product link</span>
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
                            <div className="flex flex-col p-3 bg-secondary/60 rounded-xl border border-border text-left">
                              <span className="text-xs font-semibold text-muted-foreground uppercase font-sans">Attached File</span>
                              <div className="flex items-center justify-between gap-2 mt-1">
                                <span className="text-sm text-foreground/80 font-medium font-mono truncate">
                                  {(() => { const r = resolveProductFile(task.productFile); return r ? r.name : task.productFile; })()}
                                </span>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      const r = resolveProductFile(task.productFile);
                                      if (r) downloadFileBlob(r.url, r.name);
                                    }}
                                    className="p-1.5 text-muted-foreground hover:text-brand-primary hover:bg-brand-primary/10 rounded-md transition-colors cursor-pointer"
                                    title="Download file"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {task?.miniTasks?.some(mt => mt.productLink || mt.productFile) && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider text-left">Mini-Task Deliverables</h4>
                        <div className="space-y-2">
                          {task.miniTasks
                            .filter(mt => mt.productLink || mt.productFile)
                            .map((mt, idx) => (
                              <div key={mt.id || idx} className="p-3.5 bg-muted/40 rounded-xl border border-border/80 text-left space-y-2">
                                <p className="text-xs font-semibold text-foreground">{mt.title}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {mt.productLink && (
                                    <div className="flex flex-col p-2.5 bg-secondary/60 rounded-lg border border-border">
                                      <span className="text-[10px] font-semibold text-muted-foreground uppercase font-sans">Product link</span>
                                      <a
                                        href={mt.productLink.startsWith("http") ? mt.productLink : `https://${mt.productLink}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-brand-primary font-medium mt-0.5 truncate hover:underline flex items-center gap-1 font-sans"
                                      >
                                        {mt.productLink}
                                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                      </a>
                                    </div>
                                  )}
                                  {mt.productFile && (
                                    <div className="flex flex-col p-2.5 bg-secondary/60 rounded-lg border border-border">
                                      <span className="text-[10px] font-semibold text-muted-foreground uppercase font-sans">Attached File</span>
                                      <div className="flex items-center justify-between gap-2 mt-0.5">
                                        <span className="text-xs text-foreground/80 font-medium font-mono truncate">
                                          {(() => { const r = resolveProductFile(mt.productFile); return r ? r.name : mt.productFile; })()}
                                        </span>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              const r = resolveProductFile(mt.productFile);
                                              if (r) downloadFileBlob(r.url, r.name);
                                            }}
                                            className="p-1 text-muted-foreground hover:text-brand-primary hover:bg-brand-primary/10 rounded-md transition-colors cursor-pointer"
                                            title="Download file"
                                          >
                                            <Download className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-secondary/60 border-t border-border font-sans">
              {isWaitingForApproval ? (
                <>
                  <button
                    type="button"
                    onClick={handleDeclineFromModalClient}
                    className="px-5 py-2.5 bg-destructive-light hover:bg-destructive-light text-destructive font-medium rounded-lg text-sm transition-all border border-destructive/20/50 shadow-sm flex items-center gap-1.5 cursor-pointer font-sans"
                  >
                    <X className="w-4 h-4" />
                    Decline
                  </button>
                  <button
                    type="button"
                    onClick={handleApproveClick}
                    className="px-5 py-2.5 bg-brand-green hover:bg-brand-green/90 text-primary-foreground font-medium rounded-lg text-sm transition-all shadow-sm flex items-center gap-1.5 cursor-pointer font-sans"
                  >
                    <Check className="w-4 h-4" />
                    Accept
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowViewProductModalClient(false)}
                  className="px-5 py-2.5 bg-secondary hover:bg-muted text-foreground/80 font-medium rounded-lg text-sm transition-all border border-border shadow-sm font-sans cursor-pointer"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Evidence Submission Modal (Expert) */}
      {showEvidenceModal && (
        <div data-modal-overlay className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-secondary/60 border-b border-border">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Confirm Submission of Handover Evidence</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Milestone: {task?.title}
                </p>
              </div>
              <button onClick={() => setShowEvidenceModal(false)} className="p-1.5 rounded-full hover:bg-muted cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-center">
              <p className="text-sm text-foreground/80 font-sans">
                Are you sure you want to mark this milestone as completed and notify the Client?
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEvidenceModal(false)}
                  className="flex-1 px-4 py-2.5 bg-secondary hover:bg-muted rounded-lg font-medium text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEvidenceSubmit}
                  disabled={evidenceSubmitting}
                  className="flex-1 px-4 py-2.5 bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {evidenceSubmitting ? "Submitting..." : "Confirm & Send"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Timeline */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Activity Timeline</h2>
            <p className="text-sm text-muted-foreground">
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

// ---------------------------------------------------------------------------
// Task Acceptance Stepper - visual progress row
// ---------------------------------------------------------------------------

function TaskAcceptanceStepper({ displayStatus, isWaitingForApproval, isDone, hasMainProduct, task }) {
  const steps = [
    { label: "Mini-tasks done", done: displayStatus === "Checklist Completed" || isWaitingForApproval || isDone, active: displayStatus !== "Checklist Completed" && !isWaitingForApproval && !isDone },
    { label: "Evidence Submitted", done: displayStatus === "Checklist Completed" || isWaitingForApproval || isDone, active: false },
    { label: "Product Delivered", done: hasMainProduct || isDone, active: displayStatus === "Checklist Completed" && !hasMainProduct },
    { label: "Client Approved", done: isDone, active: isWaitingForApproval },
  ];

  return (
    <div className="w-full">
      <div className="flex w-full items-start">
        {steps.map((step, i) => (
          <div key={step.label} className="flex min-w-0 flex-1 items-start last:flex-none">
            <div className="flex w-20 shrink-0 flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${step.done ? "bg-brand-primary text-brand-primary-foreground" : step.active ? "bg-brand-primary text-brand-primary-foreground ring-2 ring-brand-primary/30" : "bg-muted text-muted-foreground"
                  }`}
              >
                {step.done ? "Done" : i + 1}
              </div>
              <span className={`text-[10px] mt-1.5 font-medium max-w-[64px] text-center leading-tight ${step.done ? "text-brand-primary" : step.active ? "text-brand-primary font-semibold" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 min-w-8 flex-1 mt-4 transition-colors ${step.done ? "bg-brand-primary" : "bg-muted"}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
