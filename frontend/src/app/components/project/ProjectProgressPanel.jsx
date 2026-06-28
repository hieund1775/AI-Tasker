import { useEffect, useRef, useState } from "react";
import { ClipboardList, ArrowRight, ThumbsUp, AlertTriangle, FileText, Check, X, Clock3, RotateCcw } from "lucide-react";
import { EmptyState } from "../shared/EmptyState.jsx";
import { Skeleton } from "../ui/skeleton.jsx";
import { TaskProgressCard } from "./TaskProgressCard.jsx";
import { ProjectTimelineIllustration } from "../shared/illustrations/ProjectTimelineIllustration.jsx";
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
      <div className="bg-card rounded-xl border border-border p-6 space-y-6">
        <div className="flex justify-between items-center border-b border-border pb-4">
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
        illustration={<ProjectTimelineIllustration size="sm" />}
        size="md"
      />
    );
  }

  const completedTasks = tasks.filter(
    (t) => t.displayStatus === "Done"
  ).length;

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-5">
      {/* Overall progress header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Project Progress</h2>
          <p className="text-sm text-muted-foreground">
            Progress is automatically calculated from completed Mini Tasks.
          </p>
          {tasks.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {completedTasks} of {tasks.length} tasks completed
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Overall</span>
          <span className={`text-4xl font-bold font-mono tracking-tight ${
            overallProgress >= 100 ? "text-success" :
            overallProgress >= 50 ? "text-accent" :
            "text-foreground"
          }`}>
            {overallProgress}<span className="text-lg">%</span>
          </span>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="w-full bg-secondary h-3 rounded-full overflow-hidden shadow-inner">
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r from-accent via-accent to-accent-hover",
            "progress-bar-animated",
            overallProgress > 0 && "progress-bar-active",
            overallProgress >= 100 && "!from-success !via-success !to-success"
          )}
          style={{ width: `${Math.min(overallProgress, 100)}%` }}
        />
      </div>

      {/* Task cards */}
      <div className="space-y-4 pt-2">
        <h3 className="section-header">
          Milestones ({tasks.length})
        </h3>
        <div className="space-y-4">
          {tasks.map((task) => (
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
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
