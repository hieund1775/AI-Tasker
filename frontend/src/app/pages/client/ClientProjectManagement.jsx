import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { CreditCard, Send, CheckCircle2, Ban, Clock, AlertTriangle, X, Star, ExternalLink, Download, File as FileIcon } from "lucide-react";
import { useProjectProgress } from "../../hooks/useProjectProgress.js";
import { ProjectHeaderCard } from "../../components/project/ProjectHeaderCard.jsx";
import { ProjectProgressPanel } from "../../components/project/ProjectProgressPanel.jsx";
import { LoadingSkeleton } from "../../components/shared/LoadingSkeleton.jsx";
import { EmptyState } from "../../components/shared/EmptyState.jsx";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { safeArray, safeDateFormat } from "../../lib/safety.js";
import { releaseProjectMoneyToExpert } from "../../../services/escrowService.js";
import { cancelProjectContract } from "../../../services/escrowService.js";
import api, { enrichFileUrl } from "../../../services/api.js";
import { createReport } from "../../../services/reportService.js";
import {
  notifyPaymentReleased,
  notifyFinalDeliveryAccepted,
  notifyFinalDeliveryDeclined,
  notifyContractCancelledExpert,
  notifyContractCancelledClient,
} from "../../../services/notificationHelper.js";
import { DisputeBanner } from "../../components/shared/DisputeBanner.jsx";
import { ReportForm } from "../../components/report/ReportForm.jsx";
import { uploadEvidenceFiles } from "../../../services/reportService.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog.jsx";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import { AnimatedReveal } from "../../components/shared/AnimatedReveal.jsx";
import { BackButton } from "../../components/shared/BackButton.jsx";
import { useAuth } from "../../hooks/useAuth.js";

// =============================================================================
// ClientProjectManagement - client-side project progress management page.
// Route: /client/projects/:id
// =============================================================================

export default function ClientProjectDetail() {
  const { projectId, id } = useParams();
  const currentProjectId = projectId || id;
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    project,
    tasks,
    expert,
    loading,
    error,
    overallProgress,
    handleToggleMiniTask,
    handleAcceptProjectFinalDelivery,
    handleDeclineProjectFinalDelivery,
    retry,
  } = useProjectProgress(currentProjectId, "client");

  const [showReleaseConfirmModal, setShowReleaseConfirmModal] = useState(false);
  const [releaseLoading, setReleaseLoading] = useState(false);

  const [showFinalWorkModal, setShowFinalWorkModal] = useState(false);
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineFeedback, setDeclineFeedback] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Dispute / Report states
  const [report, setReport] = useState(null);
  const [showExplanationModal, setShowExplanationModal] = useState(false);

  // Cancel Contract states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // New Cancellation Negotiation states
  const [evidenceFileName, setEvidenceFileName] = useState("");
  const [showSendConfirmDialog, setShowSendConfirmDialog] = useState(false);
  const [showPartnerRejectForm, setShowPartnerRejectForm] = useState(false);
  const [partnerRejectReason, setPartnerRejectReason] = useState("");
  const [partnerActionLoading, setPartnerActionLoading] = useState(false);

  // 2-round escalation tracking
  // cancelAttemptCount = number of times Expert declined Client's cancellation request
  // 1st time: Soft Cancel (normal)
  // 2nd+ time: Automatically escalates to Binding Dispute
  const cancelAttemptCount = currentProjectId
    ? parseInt(localStorage.getItem(`cancel_attempt_count_${String(currentProjectId).toLowerCase()}`) || "0", 10)
    : 0;
  const cancelLocked = currentProjectId
    ? localStorage.getItem(`cancel_locked_${String(currentProjectId).toLowerCase()}`) === "true"
    : false;
  const isEscalatedRound = cancelAttemptCount >= 1;  // Already declined at least once

  const [showRejectedBanner, setShowRejectedBanner] = useState(true);

  // Review & Evaluation states
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewSaved, setReviewSaved] = useState(false);
  const [isReviewDismissed, setIsReviewDismissed] = useState(false);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [expertReply, setExpertReply] = useState(null);
  const [editedReview, setEditedReview] = useState(null);
  const [originalReview, setOriginalReview] = useState(null);

  useEffect(() => {
    if (currentProjectId) {
      // Fetch original review from backend API
      api.reviews.getReviewByProject(currentProjectId)
        .then((res) => {
          if (res && res.id) {
            setReviewSaved(true);
            const orig = { id: res.id, rating: res.rating || 0, comment: res.comment || "" };
            setOriginalReview(orig);
            setRating(res.rating || 0);
            setComment(res.comment || "");
            setEditedReview(null);

            if (res.expertReply) {
              setExpertReply({ replyText: res.expertReply, date: res.replyCreatedAt });
            } else {
              setExpertReply(null);
            }
          } else {
            setReviewSaved(false);
            setOriginalReview(null);
            setRating(0);
            setComment("");
            setExpertReply(null);
          }
        })
        .catch(() => {
            setReviewSaved(false);
            setOriginalReview(null);
            setRating(0);
            setComment("");
            setExpertReply(null);
        });
      
      const dismissed = localStorage.getItem(`dismissed_review_${currentProjectId}`) === "true";
      setIsReviewDismissed(dismissed);
    }
  }, [currentProjectId]);

  const handleSaveReview = () => {
    if (rating === 0) {
      toast.error("Please select a rating (from 1 to 5 stars).");
      return;
    }
    setIsSavingReview(true);
    const reviewData = {
      projectId: currentProjectId,
      rating: rating,
      comment: comment.trim(),
    };

    if (originalReview && originalReview.id) {
      // This is the edit turn (second time), call update API
      api.reviews.updateReview(originalReview.id, reviewData)
        .then(() => {
          setOriginalReview({ ...originalReview, ...reviewData });
          setReviewSaved(true);
          toast.success("Expert review updated successfully!");
          window.dispatchEvent(new CustomEvent("aitasker_db_update"));
        })
        .catch(() => toast.error("Failed to update review"))
        .finally(() => setIsSavingReview(false));
    } else {
      // This is the first evaluation turn
      api.reviews.createReview(reviewData)
        .then((res) => {
          setOriginalReview({ id: res.id, ...reviewData });
          setReviewSaved(true);
          toast.success("Thank you for submitting your review!");
          window.dispatchEvent(new CustomEvent("aitasker_db_update"));
        })
        .catch(() => toast.error("Failed to save review"))
        .finally(() => setIsSavingReview(false));
    }
  };

  const handleDismissReview = () => {
    localStorage.setItem(`dismissed_review_${currentProjectId}`, "true");
    setIsReviewDismissed(true);
  };

  useEffect(() => {
    if (report?.id && report?.status === "Rejected") {
      const isDismissed = localStorage.getItem(`dismissed_rejection_report_${report.id}`) === "true";
      setShowRejectedBanner(!isDismissed);
    }
  }, [report?.id, report?.status]);

  const [elapsedTime, setElapsedTime] = useState("");

  useEffect(() => {
    if (!project?.finalWorkSubmittedAt) return;
    const updateElapsed = () => {
      const submittedAt = new Date(project.finalWorkSubmittedAt);
      const diffMs = Date.now() - submittedAt.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHrs = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHrs / 24);

      if (diffSecs < 60) {
        setElapsedTime(`${diffSecs} seconds ago`);
      } else if (diffMins < 60) {
        setElapsedTime(`${diffMins} minutes ${diffSecs % 60} seconds ago`);
      } else if (diffHrs < 24) {
        setElapsedTime(`${diffHrs} hours ${diffMins % 60} minutes ago`);
      } else {
        setElapsedTime(`${diffDays} days ${diffHrs % 24} hours ago`);
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [project?.finalWorkSubmittedAt]);

  const isDisputed = project?.status?.toLowerCase() === "disputed";
  const isContractCancelled = project?.status?.toLowerCase() === "contract_cancelled" || project?.status?.toLowerCase() === "cancel_done";
  const isLocked =
    isDisputed ||
    isContractCancelled ||
    (project?.status === "Awaiting_Cancellation" &&
      report &&
      (report.reporterRole === "client" || (report.reporterRole === "expert" && report.status !== "Pending Admin" && report.status !== "Pending")));

  const allTasksApproved = tasks && tasks.length > 0 && tasks.every(t => {
    const rawStatus = t.status?.toLowerCase();
    return rawStatus === "completed" || rawStatus === "done";
  });

  // Cancel Contract availability
  // Block ONLY when project is fully 100% completed and done (all tasks approved + status completed).
  // Always show for other states (including disputed, awaiting, etc.)
  const normalizedStatus = String(project?.status || "").toLowerCase();
  const normalizedFinalDeliveryStatus = String(project?.finalDeliveryStatus || "").toLowerCase();

  // Hard terminal states where cancellation makes no sense
  const HARD_TERMINAL_STATUSES = new Set([
    "completed",
    "cancelled",
    "canceled",
    "contract_cancelled",
    "cancel_done",
    "stopped",
    "closed",
    "payment_released",
  ]);

  const FINAL_DELIVERY_DONE = new Set([
    "accepted",
    "final_delivery_accepted",
    "delivery_accepted",
  ]);

  // For client: hide cancel button when all tasks are approved (100% progress) or terminal
  const isProjectFullyDone =
    allTasksApproved
    || HARD_TERMINAL_STATUSES.has(normalizedStatus)
    || FINAL_DELIVERY_DONE.has(normalizedFinalDeliveryStatus)
    || project?.finalDeliveryAccepted;

  const canCancel =
    !isProjectFullyDone
    && normalizedStatus !== "awaiting_cancellation"
    && !HARD_TERMINAL_STATUSES.has(normalizedStatus)
    && !cancelLocked;

  useEffect(() => {
    if (!currentProjectId) return;
    async function loadReport() {
      try {
        const res = await api.get(`/reports`, { params: { projectId: currentProjectId } });
        const list = res?.data || res || [];
        const activeReport = list.find(r => r.status !== "Rejected" && r.status !== "Resolved") || list[0] || null;
        if (activeReport) {
          activeReport.reporterRole = (activeReport.reporterRole || activeReport.ReporterRole || "").toLowerCase();
          activeReport.disputeType = (activeReport.disputeType || activeReport.DisputeType || "").toLowerCase();
          activeReport.reportType = (activeReport.reportType || activeReport.ReportType || "").toLowerCase();
          if (activeReport.historyLogs && !activeReport.additionalRounds) {
            activeReport.additionalRounds = activeReport.historyLogs;
          } else if (activeReport.historyLogsJson && !activeReport.additionalRounds) {
            try {
              activeReport.additionalRounds = JSON.parse(activeReport.historyLogsJson);
            } catch (e) { }
          }
        }
        setReport(activeReport);
      } catch (err) {
        console.error("Error loading report:", err);
      }
    }
    loadReport();

    const handleDbUpdate = () => {
      loadReport();
      retry();
    };
    window.addEventListener("aitasker_db_update", handleDbUpdate);
    return () => {
      window.removeEventListener("aitasker_db_update", handleDbUpdate);
    };
  }, [currentProjectId, retry]);

  const handleClientSubmitExplanation = async (explanationData) => {
    try {
      const isCancellation = report?.reportType === "cancellation" || report?.disputeType === "cancellation";
      if (isCancellation) {
        await api.put(`/reports/${report.id}/partner-reject-cancel`, {
          partnerRejectionReason: explanationData.reason || explanationData.description || "Decline contract cancellation request",
        });
      } else {
        let evidenceUrl = explanationData.evidenceUrl || null;
        if (Array.isArray(explanationData.evidence) && explanationData.evidence.length > 0) {
          evidenceUrl = await uploadEvidenceFiles(explanationData.evidence);
        }
        await api.put(`/reports/${report.id}/partner-submit-response?userId=${user?.id || user?.Id}`, {
          explanation: explanationData.description || explanationData.reason || "",
          desiredResolution: explanationData.desiredResolution || "",
          evidenceUrl: evidenceUrl,
          userId: user?.id || user?.Id
        });
      }
      toast.success("Submitted response explanation successfully!");
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    } catch (err) {
      toast.error(err.message || "Failed to submit response explanation.");
    }
  };



  const handleReleasePayment = async () => {
    setReleaseLoading(true);
    try {
      const releaseAmount = project?.budget ?? project?.Budget ?? project?.escrowBalance ?? project?.EscrowBalance ?? 0;
      const targetExpertId = project?.assignedExpertId ?? project?.expertId ?? project?.ExpertId;
      const targetTitle = project?.title ?? project?.Title ?? project?.jobPost?.title ?? "Project";

      try {
        await releaseProjectMoneyToExpert({
          projectId: currentProjectId,
          amount: releaseAmount,
          expertId: targetExpertId,
        });
      } catch (escrowErr) {
        console.warn("Backend releaseProjectMoneyToExpert failed, proceeding with frontend override:", escrowErr);
      }

      // Record local release in localStorage
      const releases = JSON.parse(localStorage.getItem("escrow_releases") || "[]");
      releases.push({
        projectId: currentProjectId,
        amount: Number(releaseAmount),
        expertId: targetExpertId,
        clientId: user?.id || user?.Id,
        projectTitle: targetTitle,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem("escrow_releases", JSON.stringify(releases));

      try {
        await api.projects.updateStatus(currentProjectId, "completed");
      } catch (apiErr) {
        console.warn("Backend updateStatus failed (stub), using frontend override:", apiErr);
      }

      // Update override status
      localStorage.setItem(`project_status_${currentProjectId}`, "completed");

      setShowReleaseConfirmModal(false);
      toast.success("Payout released successfully! Project completed.");

      // Notify expert that payment has been released
      notifyPaymentReleased({
        expertUserId: project?.assignedExpertId || project?.expertId,
        clientName: user?.fullName || user?.name || "Client",
        projectTitle: project?.title || project?.jobPost?.title || "Project",
        amount: `${Number(project?.budget || 0).toLocaleString("vi-VN")} VND`,
        projectId: currentProjectId,
      }).catch(() => { });

      // Dispatch database update event to trigger refresh
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));

      // Force reload the hook data
      retry();
    } catch (err) {
      toast.error(err.message || "Failed to release payout.");
    } finally {
      setReleaseLoading(false);
    }
  };

  const handleCancelContractInit = () => {
    if (!cancelReason.trim()) {
      toast.error("Please enter a contract cancellation reason.");
      return;
    }
    setShowSendConfirmDialog(true);
  };

  const handleConfirmCancellationSend = async () => {
    setCancelLoading(true);
    const finalReason = cancelAttemptCount >= 1 ? `[ESCALATED BINDING DISPUTE] ${cancelReason}` : cancelReason;
    try {
      await api.reports.create({
        projectId: currentProjectId,
        reporterId: user.id,
        reporterRole: "client",
        reason: finalReason,
        description: finalReason,
        evidenceUrl: evidenceFileName || "",
        reportType: "cancellation",
        disputeType: "cancellation",
      });
      setShowCancelModal(false);
      setShowSendConfirmDialog(false);
      setCancelReason("");
      setEvidenceFileName("");
      toast.success("Sent contract cancellation request for Admin review.");
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
      retry();
    } catch (err) {
      toast.error(err.message || "Failed to send contract cancellation request.");
    } finally {
      setCancelLoading(false);
    }
  };

  const handlePartnerAcceptCancel = async () => {
    setPartnerActionLoading(true);
    try {
      await api.put(`/reports/${report.id}/partner-accept-cancel`);

      // Notify both parties about cancellation
      const projectTitle = project?.title || project?.jobPost?.title || "Project";
      const reporterIsExpert = report?.reporterRole?.toLowerCase() === "expert";
      const expertId = project?.assignedExpertId || project?.expertId;
      const clientId = project?.clientId;

      // Compensate wallets based on dynamic 60% calculations vs backend database stubs
      const escrowTotal = project?.budget ?? 0;
      const prog = overallProgress;
      const progressRate = prog / 100;
      const platformFee = Math.round(escrowTotal * 0.05);
      const penaltyFee = Math.round(escrowTotal * 0.10);
      const progressAmount = Math.round(escrowTotal * progressRate);

      const isClientReporter = (report.reporterRole || report.ReporterRole || "").toLowerCase() === "client";
      let correctExpertPayout = 0;
      let correctClientRefund = 0;

      if (isClientReporter) {
        correctExpertPayout = progressAmount + penaltyFee;
        correctClientRefund = escrowTotal - platformFee - correctExpertPayout;
      } else {
        correctExpertPayout = Math.max(0, progressAmount - penaltyFee - platformFee);
        correctClientRefund = escrowTotal - correctExpertPayout - platformFee;
      }

      const stubExpert = report.escrowPayExpert || 0;
      const stubClient = report.escrowRefundClient || 0;

      const diffExpert = correctExpertPayout - stubExpert;
      const diffClient = correctClientRefund - stubClient;

      if (diffExpert !== 0 && expertId) {
        try {
          if (diffExpert > 0) {
            await api.payments.depositWallet(expertId, diffExpert);
          } else {
            await api.payments.withdraw(expertId, Math.abs(diffExpert));
          }
        } catch (e) {
          console.warn("Expert wallet compensation failed:", e);
        }
      }
      if (diffClient !== 0 && clientId) {
        try {
          if (diffClient > 0) {
            await api.payments.depositWallet(clientId, diffClient);
          } else {
            await api.payments.withdraw(clientId, Math.abs(diffClient));
          }
        } catch (e) {
          console.warn("Client wallet compensation failed:", e);
        }
      }

      if (platformFee > 0) {
        try {
          await api.post("/interactions/transaction", {
            projectId: currentProjectId,
            amount: platformFee,
            sourceWalletId: clientId,
            reportId: report?.id,
            status: "completed",
            type: "PlatformFee",
            transactionType: "PlatformFee",
            description: `platform fee -5% (client cancel)`,
          });
        } catch (feeErr) {
          console.warn("Client cancel platform fee transaction failed:", feeErr);
        }
      }

      const projIdLower = String(currentProjectId).toLowerCase();
      
      const cancellationMetadata = JSON.stringify({
        expertPayout: correctExpertPayout,
        clientRefund: correctClientRefund,
        isEscalatedVerdict: false,
        reason: "Client accepted cancellation"
      });
      
      try {
        await api.projects.updateStatus(currentProjectId, "Cancelled");
        await api.projects.updateMetadata(currentProjectId, cancellationMetadata);
      } catch (err) {
        console.warn("Backend update status/metadata failed", err);
      }
      toast.success("You agreed to cancel the contract. Funds have been split/refunded.");

      // Expert gets payout notification
      notifyContractCancelledExpert({
        expertUserId: expertId,
        projectTitle,
        expertPayout: project?.budget ? project.budget * 0.1 : 0,
        projectId: currentProjectId,
      }).catch(() => { });

      // Client gets refund notification
      notifyContractCancelledClient({
        clientUserId: clientId,
        projectTitle,
        clientRefund: project?.budget ? project.budget * 0.9 : 0,
        projectId: currentProjectId,
      }).catch(() => { });

      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
      retry();
    } catch (err) {
      toast.error(err.message || "Action failed.");
    } finally {
      setPartnerActionLoading(false);
    }
  };

  const handlePartnerRejectCancel = async () => {
    if (!partnerRejectReason.trim()) {
      toast.error("Please enter the reason for declining cancellation.");
      return;
    }
    setPartnerActionLoading(true);
    try {
      await api.put(`/reports/${report.id}/partner-reject-cancel`, {
        partnerRejectionReason: partnerRejectReason,
      });

      // Increment cancelAttemptCount when partner declines the cancellation request
      const projIdLower = String(currentProjectId).toLowerCase();
      const currentCount = Number(localStorage.getItem(`cancel_attempt_count_${projIdLower}`) || 0);
      localStorage.setItem(`cancel_attempt_count_${projIdLower}`, currentCount + 1);

      toast.success("You declined the cancellation request. Reason sent to Admin.");
      setShowPartnerRejectForm(false);
      setPartnerRejectReason("");
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
      retry();
    } catch (err) {
      toast.error(err.message || "Action failed.");
    } finally {
      setPartnerActionLoading(false);
    }
  };

  const handleInitiatorAcceptRejection = async () => {
    setCancelLoading(true);
    try {
      await api.put(`/reports/${report.id}/initiator-accept-rejection`);

      // KEEP cancel_attempt_count - do not reset to preserve escalation eligibility
      // if Client cancels again after being declined, it enters Binding Dispute immediately.
      // Only clear count when the contract is actually terminated (partner accepts cancellation).

      toast.success("You accepted the decline. The project resumes normal operations.");
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
      retry();
    } catch (err) {
      toast.error(err.message || "Action failed.");
    } finally {
      setCancelLoading(false);
    }
  };

  const handleInitiatorRespondRejection = async () => {
    if (!cancelReason.trim()) {
      toast.error("Please enter a more detailed cancellation reason.");
      return;
    }
    setCancelLoading(true);
    const projIdLower = String(currentProjectId).toLowerCase();
    const currentCount = parseInt(localStorage.getItem(`cancel_attempt_count_${projIdLower}`) || "0", 10);
    const newCount = currentCount + 1;
    localStorage.setItem(`cancel_attempt_count_${projIdLower}`, String(newCount));

    const finalReason = newCount >= 1 ? `[ESCALATED BINDING DISPUTE] ${cancelReason}` : cancelReason;
    try {
      await api.put(`/reports/${report.id}/initiator-respond-rejection`, {
        reason: finalReason,
        evidenceFileName: evidenceFileName || "",
      });

      if (newCount >= 1) {
        toast.success("Cancellation request has escalated to Binding Dispute (Round 2). Admin will issue a final verdict.", { duration: 6000 });
      } else {
        toast.success("Responded and submitted a new cancellation request to Admin.");
      }

      setShowCancelModal(false);
      setCancelReason("");
      setEvidenceFileName("");
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
      retry();
    } catch (err) {
      toast.error(err.message || "Action failed.");
    } finally {
      setCancelLoading(false);
    }
  };

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LoadingSkeleton variant="dashboard" />
      </div>
    );
  }

  // ---- Error state ----
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EmptyState
          icon={AlertCircle}
          title="Error loading project"
          description={error}
          action={
            <button
              onClick={retry}
              className="h-10 px-4 bg-brand-primary text-brand-primary-foreground rounded-lg hover:bg-brand-primary-hover text-base font-semibold"
            >
              Retry
            </button>
          }
        />
      </div>
    );
  }

  // ---- Project not found ----
  if (!project) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EmptyState
          icon={AlertCircle}
          title="Project not found"
          description="The requested project could not be found."
          action={
            <button
              onClick={() => navigate("/client/my-projects")}
              className="h-10 px-4 bg-brand-primary text-brand-primary-foreground rounded-lg hover:bg-brand-primary-hover text-base font-semibold"
            >
              Go to My Projects
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      <BackButton fallback="/client/my-projects" className="mb-6">
        Back to My Projects
      </BackButton>
      <PageHeader
        title="Project Workspace"
        subtitle="Track progress, review deliverables, and manage escrow safely."
        badge={
          project?.status ? (() => {
            let status = project.status.toLowerCase();
            let label = project.status;
            if (status === "awaiting_cancellation" && report && (report.status === "Pending Admin" || report.status === "Pending")) {
              status = "inprogress";
              label = "In Progress";
            }
            let colorClasses = "bg-accent-light text-accent";
            if (report?.status === "Resolved") {
              label = "End a quarrel";
              colorClasses = "bg-success/15 text-success border border-success/20";
            } else if (status === "completed") {
              colorClasses = "bg-success/15 text-success border border-success/20";
            } else if (status === "cancelled" || status === "canceled") {
              colorClasses = "bg-success/15 text-success border border-success/20";
            } else if (status === "disputed") {
              colorClasses = "bg-destructive/15 text-destructive border border-destructive/20 animate-pulse";
            }
            return (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold capitalize ${colorClasses}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                {label}
              </span>
            );
          })() : null
        }
        illustration={
          <svg width="220" height="120" viewBox="0 0 220 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="30" width="40" height="8" rx="4" fill="currentColor" opacity="0.25" />
            <rect x="60" y="30" width="40" height="8" rx="4" fill="currentColor" opacity="0.35" />
            <rect x="110" y="30" width="40" height="8" rx="4" fill="currentColor" opacity="0.2" />
            <rect x="160" y="30" width="40" height="8" rx="4" fill="currentColor" opacity="0.15" />
            <line x1="30" y1="38" x2="30" y2="60" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
            <line x1="80" y1="38" x2="80" y2="60" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
            <line x1="130" y1="38" x2="130" y2="60" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
            <line x1="180" y1="38" x2="180" y2="60" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
            <circle cx="30" cy="68" r="5" fill="currentColor" opacity="0.4" />
            <circle cx="80" cy="68" r="5" fill="currentColor" opacity="0.3" />
            <circle cx="130" cy="68" r="5" fill="currentColor" opacity="0.2" />
            <circle cx="180" cy="68" r="5" fill="currentColor" opacity="0.1" />
            <line x1="35" y1="68" x2="75" y2="68" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
            <line x1="85" y1="68" x2="125" y2="68" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
            <line x1="135" y1="68" x2="175" y2="68" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
            <text x="30" y="88" textAnchor="middle" fontSize="6" fill="currentColor" opacity="0.35">Tasks</text>
            <text x="80" y="88" textAnchor="middle" fontSize="6" fill="currentColor" opacity="0.3">Submit</text>
            <text x="130" y="88" textAnchor="middle" fontSize="6" fill="currentColor" opacity="0.2">Accept</text>
            <text x="180" y="88" textAnchor="middle" fontSize="6" fill="currentColor" opacity="0.15">Pay</text>
          </svg>
        }
      />

      <div className="space-y-6">
        {/* Multi-Stage Cancellation Negotiation Widget */}
        {isLocked && project?.status === "Awaiting_Cancellation" && (report?.disputeType === "cancellation" || report?.reportType === "cancellation") && (
          <div className="p-6 bg-card border border-warning/35 rounded-2xl shadow-sm text-sm font-sans space-y-4">
            {report.reporterRole === "client" ? (
              report.status === "Pending Admin" ? (
                <div className="flex items-start gap-3 text-left">
                  <Clock className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-foreground text-base">Your contract cancellation request is awaiting review</h4>
                    <p className="text-muted-foreground mt-1">The cancellation request has been submitted. Admin is reviewing your request before forwarding it to the partner.</p>
                  </div>
                </div>
              ) : report.status === "Awaiting Partner" ? (
                <div className="flex items-start gap-3 text-left">
                  <Clock className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-foreground text-base">Cancellation request sent to partner (Expert)</h4>
                    <p className="text-muted-foreground mt-1">Admin has approved your cancellation request. Awaiting Expert's review (Accept or Decline).</p>
                  </div>
                </div>
              ) : report.status === "Returned" ? (
                <div className="space-y-4 text-left">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-foreground text-base text-destructive">Contract cancellation request declined by partner</h4>
                      <p className="text-muted-foreground mt-1">Expert does not agree to cancel the contract for the following reasons:</p>
                      <div className="p-3 bg-destructive-light border border-destructive/20 rounded-xl mt-2 font-medium text-destructive">
                        &quot;{report.partnerRejectionReason}&quot;
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleInitiatorAcceptRejection}
                      disabled={cancelLoading}
                      className="px-4 py-2 border border-input rounded-xl text-foreground font-semibold text-sm hover:bg-secondary transition-all cursor-pointer"
                    >
                      Accept Decline (Project Resumes)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCancelReason(report.reason || "");
                        setShowCancelModal(true);
                      }}
                      className="px-4 py-2 bg-brand-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-brand-primary-hover transition-all cursor-pointer"
                    >
                      Respond (Submit New Cancellation)
                    </button>
                  </div>
                </div>
              ) : null
            ) : (
              report.status === "Pending Admin" ? (
                <div className="flex items-start gap-3 text-left">
                  <Clock className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-foreground text-base">Expert requested contract cancellation</h4>
                    <p className="text-muted-foreground mt-1">Expert has submitted a contract cancellation request to Admin. The project is temporarily locked awaiting Admin review.</p>
                  </div>
                </div>
              ) : report.status === "Awaiting Partner" ? (
                <div className="space-y-4 text-left">
                  <div className="flex items-start gap-3 border-b border-border pb-3">
                    <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-foreground text-base">Expert requested contract cancellation</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">Please see the cancellation reason and escrow split details below.</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-foreground">
                      <strong className="text-muted-foreground font-semibold">Cancellation Reason:</strong> &quot;{report.reason}&quot;
                    </p>
                    {report.evidence && report.evidence.length > 0 && (
                      <p className="text-xs text-foreground flex items-center gap-1.5 mt-1">
                        <strong className="text-muted-foreground font-semibold">Attached Documents:</strong>
                        <span className="text-brand-primary underline cursor-pointer">{report.evidence[0].fileName}</span>
                      </p>
                    )}
                  </div>

                  {(() => {
                    const escrowTotal = report.payoutBreakdown?.contractAmount ?? project?.budget ?? 0;
                    const prog = report.payoutBreakdown?.progressPercent ?? overallProgress;
                    const progressRate = prog / 100;
                    const platformFee = report.payoutBreakdown?.platformServiceFee ?? Math.round(escrowTotal * 0.05);
                    const penaltyFee = Math.round(escrowTotal * 0.10);
                    const progressAmount = Math.round(escrowTotal * progressRate);

                    const isClientReporter = (report.reporterRole || report.ReporterRole || "").toLowerCase() === "client";
                    let expertPayout = 0;
                    let clientRefund = 0;

                    if (isClientReporter) {
                      // Client cancels -> Client is at fault -> Client is penalized
                      // Expert receives: progress + penalty
                      // Client receives: total - platform fee - expert payout
                      expertPayout = report.payoutBreakdown?.expertPayout ?? (progressAmount + penaltyFee);
                      clientRefund = report.payoutBreakdown?.clientRefund ?? (escrowTotal - platformFee - expertPayout);
                    } else {
                      // Expert cancels -> Expert is at fault -> Expert is penalized
                      // Expert receives: progress - penalty - platform fee
                      // Client receives: total - expert payout - platform fee
                      expertPayout = report.payoutBreakdown?.expertPayout ?? Math.max(0, progressAmount - penaltyFee - platformFee);
                      clientRefund = report.payoutBreakdown?.clientRefund ?? (escrowTotal - expertPayout - platformFee);
                    }

                    return (
                      <div className="space-y-1.5 p-4 bg-muted/40 border border-border rounded-xl text-xs max-w-md">
                        <div className="flex justify-between"><span className="text-muted-foreground">Contract Value:</span><span className="font-semibold text-foreground"><MoneyDisplay amount={escrowTotal} /></span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Current Progress:</span><span className="font-semibold text-foreground">{prog}%</span></div>
                        <div className="border-t border-border my-1.5" />
                        <div className="flex justify-between"><span className="text-muted-foreground">Platform fee (collected by system):</span><span className="font-semibold text-warning">5% to <MoneyDisplay amount={platformFee} /></span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Cancellation penalty fee:</span><span className="font-semibold text-destructive">10% to <MoneyDisplay amount={penaltyFee} /></span></div>
                        <div className="border-t border-border my-1.5" />
                        <div className="flex justify-between font-semibold"><span className="text-foreground">You receive (Refund):</span><span className="text-success"><MoneyDisplay amount={clientRefund} /></span></div>
                        <div className="flex justify-between font-semibold"><span className="text-foreground">Payment to Expert:</span><span className="text-warning"><MoneyDisplay amount={expertPayout} /></span></div>
                      </div>
                    );
                  })()}

                  {!showPartnerRejectForm ? (
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handlePartnerAcceptCancel}
                        disabled={partnerActionLoading}
                        className="px-5 py-2 bg-success text-primary-foreground rounded-lg font-medium text-sm hover:bg-success/85 transition-all cursor-pointer shadow-sm"
                      >
                        Accept (Agree to cancel & Receive funds)
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPartnerRejectForm(true)}
                        disabled={partnerActionLoading}
                        className="px-4 py-2 bg-destructive-light text-destructive border border-destructive/20 rounded-lg font-medium text-sm hover:bg-destructive-light transition-all cursor-pointer"
                      >
                        Reject (Decline cancellation)
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-2 animate-slide-up">
                      <label className="block text-xs font-semibold text-foreground/80 uppercase">Reason for declining cancellation <span className="text-destructive">*</span></label>
                      <textarea
                        rows={2}
                        placeholder="Please provide the reason why you decline this cancellation request..."
                        value={partnerRejectReason}
                        onChange={(e) => setPartnerRejectReason(e.target.value)}
                        className="w-full max-w-lg p-3 border border-input rounded-[10px] focus:outline-none focus:border-destructive/35 text-foreground text-sm"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handlePartnerRejectCancel}
                          disabled={partnerActionLoading}
                          className="px-4 py-1.5 bg-destructive text-primary-foreground rounded-lg font-medium text-xs hover:bg-destructive transition-all cursor-pointer"
                        >
                          Submit Decline Reason
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowPartnerRejectForm(false);
                            setPartnerRejectReason("");
                          }}
                          className="px-3 py-1.5 border border-input rounded-xl text-foreground text-xs hover:bg-secondary transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : report.status === "Returned" ? (
                <div className="flex items-start gap-3 text-left">
                  <Clock className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-foreground text-base">Contract cancellation declined</h4>
                    <p className="text-muted-foreground mt-1">You declined the partner's cancellation request. Awaiting partner's response or request withdrawal.</p>
                  </div>
                </div>
              ) : null
            )}
          </div>
        )}
        {project?.status === "cancel_done" && (
          <div className="p-4 bg-destructive-light border border-destructive/20 rounded-xl text-destructive text-sm font-medium text-left">
            The project contract was successfully cancelled. Escrow funds split based on project progress ({project?.contractCancellation?.progressPercent || 0}%). Project is now read-only.
          </div>
        )}
        {/* Dispute banner */}
        {isDisputed && <DisputeBanner report={report} />}
        {report?.status === "Rejected" && report?.reporterRole === "client" && showRejectedBanner && (
          <div className="p-4 bg-warning-light border border-warning/20 rounded-xl text-warning text-sm font-sans flex items-start justify-between gap-2 shadow-sm relative">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Violation report declined by Admin</p>
                {(() => {
                  const reasonText = report.rejectionReason || report.RejectionReason || report.adminNote || report.AdminNote || report.note || report.Note;
                  return reasonText ? (
                    <p className="mt-1 text-muted-foreground"><strong>Decline Reason:</strong> {reasonText}</p>
                  ) : null;
                })()}
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => {
                setShowRejectedBanner(false);
                localStorage.setItem(`dismissed_rejection_report_${report.id}`, "true");
              }} 
              className="text-warning hover:text-warning transition-colors p-1 rounded-lg hover:bg-warning-light"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {report?.status === "Resolved" && (
          <div className="p-4 bg-success-light border border-success/20 rounded-xl text-success text-sm font-sans flex items-start gap-2.5 shadow-sm animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-success">Dispute resolved successfully</p>
              <p className="mt-1 text-success/90">
                {report.moneyAction === "refund" || project?.status?.toLowerCase() === "cancelled" ? (
                  "The project has ended (Cancelled). All escrow funds have been refunded to the Client's wallet by Admin."
                ) : (
                  "The project has ended (Completed). All escrow funds have been released to the Expert's wallet by Admin."
                )}
              </p>
            </div>
          </div>
        )}
        {isContractCancelled && (
          <div className="p-4 bg-destructive-light border border-destructive/20 rounded-xl text-destructive text-sm font-medium">
            This contract has been cancelled. Escrow has been distributed based on project progress ({project?.contractCancellation?.progressPercent || 0}%). The project is now read-only.
          </div>
        )}

        {/* Delivery & Payment Stepper */}
        <AnimatedReveal>
          <DeliveryPaymentStepper project={project} overallProgress={overallProgress} role="client" allTasksApproved={allTasksApproved} />
        </AnimatedReveal>

        {/* Evaluation / Review Section */}
        {project?.status === "completed" && !isReviewDismissed && (
          <AnimatedReveal>
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6 relative text-left space-y-4 mb-6 mt-6">
              {/* Close button */}
              <button
                type="button"
                onClick={handleDismissReview}
                className="absolute top-4 right-4 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                title="Close Review"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 border-b border-border pb-3">
                <div className="p-2 bg-warning-light/10 text-warning rounded-lg">
                  <Star className="w-5 h-5 fill-warning" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground font-sans">Expert Evaluation</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 font-sans">Project completed successfully. Please take a moment to evaluate the expert's service quality.</p>
                </div>
              </div>

              {reviewSaved ? (
                <div className="space-y-4 font-sans text-xs">
                  {/* ORIGINAL REVIEW BLOCK */}
                  {originalReview && (
                    <div className="space-y-2 border-b border-border/40 pb-3 text-left">
                      <div className="flex items-center justify-between p-3 bg-success/5 border border-success/15 text-success rounded-lg font-medium">
                        <span>Done Original Review</span>
                        <div className="flex items-center gap-0.5 ml-2">
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < originalReview.rating ? "fill-warning text-warning" : "text-border"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {originalReview.comment && (
                        <div className="p-3 bg-secondary/30 rounded-xl border border-border text-muted-foreground pl-7 relative leading-relaxed">
                          <span className="absolute left-2 text-sm text-warning/70 font-semibold select-none leading-none">"</span>
                          {originalReview.comment}
                        </div>
                      )}
                    </div>
                  )}

                  {/* EXPERT REPLY BLOCK */}
                  {expertReply?.replyText && (
                    <div className="p-3.5 bg-brand-primary-light/10 border border-brand-primary/20 rounded-xl text-xs space-y-1 text-left">
                      <span className="font-semibold text-brand-primary block">Expert Response (Thank You):</span>
                      <p className="text-muted-foreground">{expertReply.replyText}</p>
                    </div>
                  )}
                  {expertReply?.requestRevisionText && (
                    <div className="p-3.5 bg-warning-light/10 border border-warning/20 rounded-xl text-xs space-y-1 text-left">
                      <span className="font-semibold text-warning block">Expert Response & Revision Request:</span>
                      <p className="text-muted-foreground">{expertReply.requestRevisionText}</p>
                    </div>
                  )}

                  {/* CLIENT EDITED REVIEW BLOCK */}
                  {editedReview && (
                    <div className="space-y-2 pt-3 border-t border-border/40 text-left">
                      <div className="flex items-center justify-between p-3 bg-success/10 border border-success/20 text-success rounded-lg font-medium">
                        <span>Done Edited Review</span>
                        <div className="flex items-center gap-0.5 ml-2">
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < editedReview.rating ? "fill-warning text-warning" : "text-border"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {editedReview.comment && (
                        <div className="p-3 bg-success/5 border border-success/10 rounded-xl text-muted-foreground pl-7 relative leading-relaxed">
                          <span className="absolute left-2 text-sm text-success/60 font-semibold select-none leading-none">"</span>
                          {editedReview.comment}
                        </div>
                      )}
                    </div>
                  )}

                  {/* BUTTON TO OPEN REVISION FORM */}
                  {expertReply?.requestRevisionText && !editedReview && (
                    <div className="p-4 bg-warning-light border border-warning/15 rounded-xl text-xs space-y-2 text-left animate-pulse mt-2">
                      <p className="text-muted-foreground font-medium">You can adjust this review based on the expert's request (one-time edit only).</p>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setRating(originalReview?.rating || 0);
                            setComment(originalReview?.comment || "");
                            setReviewSaved(false);
                          }}
                          className="px-4 py-1.5 bg-warning-light hover:bg-warning text-primary-foreground rounded-lg font-semibold text-xs shadow-sm transition-colors cursor-pointer"
                        >
                          Adjust Review
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 font-sans text-left">
                  {/* Show previous review thread during editing */}
                  {originalReview && (
                    <div className="space-y-2 border-b border-border/40 pb-3">
                      <p className="text-xs text-muted-foreground font-semibold">Your Original Review:</p>
                      <div className="flex items-center gap-0.5 mb-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < originalReview.rating ? "fill-warning text-warning" : "text-border"
                            }`}
                          />
                        ))}
                      </div>
                      {originalReview.comment && (
                        <p className="text-xs text-muted-foreground italic bg-secondary/20 p-2 rounded-lg border border-border">"{originalReview.comment}"</p>
                      )}
                    </div>
                  )}

                  {expertReply?.requestRevisionText && (
                    <div className="p-3 bg-warning-light/10 border border-warning/20 rounded-xl text-xs text-left text-muted-foreground">
                      <span className="font-semibold text-warning">Adjusting review based on Expert's response:</span>
                      <p className="mt-1 font-medium bg-background/40 p-2 rounded border border-warning/15">"{expertReply.requestRevisionText}"</p>
                    </div>
                  )}

                  {/* Stars Row */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-foreground/80 font-medium">Select new rating:</span>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }, (_, i) => {
                        const starValue = i + 1;
                        return (
                          <button
                            type="button"
                            key={i}
                            onClick={() => setRating(starValue)}
                            onMouseEnter={() => setHoverRating(starValue)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-0.5 hover:scale-110 transition-transform cursor-pointer"
                          >
                            <Star
                              className={`w-6 h-6 transition-all ${
                                starValue <= (hoverRating || rating)
                                  ? "fill-warning text-warning"
                                  : "text-muted hover:text-warning"
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Comment Textarea */}
                  <div className="space-y-1.5">
                    <span className="text-xs text-foreground/80 font-medium">New comment:</span>
                    <textarea
                      rows={3}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Your evaluation comments..."
                      className="w-full p-3 text-sm border border-input rounded-xl focus:outline-none focus:border-brand-primary text-foreground bg-card"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    {originalReview && (
                      <button
                        type="button"
                        onClick={() => setReviewSaved(true)}
                        className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl font-medium text-sm transition-colors cursor-pointer"
                      >
                        Cancel Edit
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveReview}
                      disabled={isSavingReview}
                      className="px-5 py-2 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-foreground rounded-lg font-medium text-sm shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSavingReview ? "Submitting..." : "Submit Review"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </AnimatedReveal>
        )}
        {/* Realtime Submission Timebar */}
        {project?.finalDeliveryStatus === "Final Product Submitted" && project?.finalWorkSubmittedAt && (
          <AnimatedReveal>
            <div className="p-5 bg-success-light border border-success/20 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-pulse mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-success-light text-success rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">Overall deliverables submitted (Final handover)</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Submitted at: <span className="font-semibold text-foreground">{new Date(project.finalWorkSubmittedAt).toLocaleString("en-US")}</span>
                  </p>
                </div>
              </div>
            </div>
          </AnimatedReveal>
        )}
        {/* Project header */}
        <AnimatedReveal delay={1}>
          <ProjectHeaderCard
            project={project}
            expert={expert}
            role="client"
            overallProgress={overallProgress}
            loading={false}
            onMessage={() => navigate(`/messenger/${expert?.id || expert?.Id || project?.expertId || ""}`)}
          >
            {/* Action buttons (client only) */}
            <div className="flex items-center gap-3">
              {canCancel && (
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className={`h-10 px-4 border rounded-lg font-semibold text-sm inline-flex items-center gap-2 cursor-pointer transition-all shadow-sm ${cancelAttemptCount >= 1
                      ? "border-warning text-primary-foreground bg-warning hover:bg-warning/85 animate-pulse"
                      : "border-destructive/35 text-destructive bg-destructive-light hover:bg-destructive-light"
                    }`}
                >
                  <Ban className="w-4 h-4" /> {cancelAttemptCount >= 1 ? "Escalate to Dispute" : "Cancel Contract"}
                </button>
              )}

              {!["completed", "cancelled", "cancel_done", "stopped", "terminated"].includes((project?.status || "").toLowerCase()) && (
                <>
                  {cancelLocked && (
                    <span className="h-10 px-4 border border-input text-muted-foreground bg-secondary rounded-lg font-semibold text-sm inline-flex items-center gap-2 cursor-not-allowed shadow-sm" title="Cancellation request officially rejected and locked by Admin">
                      Cancel Locked
                    </span>
                  )}

                  {report && (report?.status === "Awaiting Client" || ((report?.status === "Awaiting Both" || report?.status === "Awaiting Evidence") && !report?.currentRoundClientSubmitted)) && (
                    <button
                      type="button"
                      onClick={() => setShowExplanationModal(true)}
                      className="h-10 px-4 border border-destructive text-primary-foreground bg-destructive hover:bg-destructive rounded-lg font-semibold text-sm inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-sm animate-pulse"
                    >
                      <AlertTriangle className="w-4 h-4" /> Submit Explanation
                    </button>
                  )}
                  {report && (
                    (report?.reporterRole === "client" && (report?.status === "Pending" || report?.status === "Pending Admin")) ||
                    report?.status === "Awaiting Expert" ||
                    ((report?.status === "Awaiting Both" || report?.status === "Awaiting Evidence") && report?.currentRoundClientSubmitted)
                  ) && (
                      <div className="h-10 px-4 bg-secondary text-muted-foreground rounded-lg font-semibold text-sm inline-flex items-center gap-1.5 cursor-not-allowed border border-border">
                        <AlertTriangle className="w-4 h-4" /> Awaiting review...
                      </div>
                    )}
                </>
              )}
              {allTasksApproved && (
                <>
                  {/* View Final Work Button - always visible once final product submitted or accepted */}
                  {(project.finalDeliveryStatus === "Final Product Submitted" || project.finalDeliveryStatus === "Accepted" || project.status === "completed" || project.status === "payment_released") && (
                    <button
                      type="button"
                      onClick={() => setShowFinalWorkModal(true)}
                      className="h-10 px-4 rounded-lg font-semibold text-base inline-flex items-center gap-2 shadow-sm transition-all bg-primary text-primary-foreground hover:bg-primary-hover cursor-pointer"
                    >
                      View Final Work
                    </button>
                  )}

                  {/* Declined state - waiting resubmit */}
                  {project.finalDeliveryStatus === "Declined" && project.status !== "completed" && (
                    <button
                      disabled
                      className="h-10 px-4 bg-secondary text-muted-foreground border border-border rounded-lg font-semibold text-base inline-flex items-center gap-2 cursor-not-allowed"
                    >
                      Awaiting Expert resubmission
                    </button>
                  )}

                  {/* Not submitted yet */}
                  {!project.finalDeliveryStatus && project.status !== "completed" && (
                    <button
                      disabled
                      className="h-10 px-4 bg-secondary text-muted-foreground border border-border rounded-lg font-semibold text-base inline-flex items-center gap-2 cursor-not-allowed"
                    >
                      View Final Work
                    </button>
                  )}

                  {/* Release Payment Button - only before completed */}
                  {project.status !== "completed" && project.status !== "payment_released" && (
                    project.finalDeliveryStatus === "Accepted" && !isLocked ? (
                      <button
                        type="button"
                        onClick={() => setShowReleaseConfirmModal(true)}
                        className="h-10 px-4 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-foreground rounded-lg font-semibold text-base inline-flex items-center gap-2 shadow-sm cursor-pointer transition-all"
                      >
                        <CreditCard className="w-4 h-4" /> Release Payment
                      </button>
                    ) : project.finalDeliveryStatus !== "Accepted" && project.status !== "completed" ? (
                      <button
                        disabled
                        className="h-10 px-4 bg-secondary text-muted-foreground border border-border rounded-lg font-semibold text-base inline-flex items-center gap-2 cursor-not-allowed"
                      >
                        <CreditCard className="w-4 h-4" /> Release Payment
                      </button>
                    ) : null
                  )}
                </>
              )}
              {(project.status === "completed" || project.status === "payment_released") && (
                <button
                  disabled
                  className="h-10 px-4 bg-success/10 text-success border border-success/20 rounded-lg font-semibold text-base cursor-not-allowed inline-flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Payment Released
                </button>
              )}
            </div>
          </ProjectHeaderCard>
        </AnimatedReveal>

        {/* Project progress panel */}
        <AnimatedReveal delay={2}>
          <ProjectProgressPanel
            tasks={tasks}
            overallProgress={overallProgress}
            role="client"
            projectId={currentProjectId}
            onToggleMiniTask={() => { }} // Client cannot toggle
            loading={false}
            readOnly={isLocked}
            project={project}
          />
        </AnimatedReveal>
      </div>

      {/* Release Payment Confirmation Modal */}
      {showReleaseConfirmModal && (
        <div data-modal-overlay className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all animate-fade-in">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 animate-zoom-in text-left">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 bg-secondary/60 border-b border-border">
              <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-lg">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground font-sans">Release Payment</h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-sans">Project is 100% completed</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-sm text-muted-foreground font-sans">
              <p>Are you sure you want to release payment for the project <strong>{project?.title}</strong>?</p>
              <p className="p-3 bg-muted/50 text-foreground rounded-xl border border-border leading-relaxed">
                Escrow funds (<strong><MoneyDisplay amount={project?.budget} /></strong>) will be transferred directly to the Expert's wallet (Available Balance and Total Earned). This action cannot be undone.
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-secondary/60 border-t border-border font-sans">
              <button
                type="button"
                disabled={releaseLoading}
                onClick={() => setShowReleaseConfirmModal(false)}
                className="px-4 py-2 border border-input text-foreground/80 rounded-xl hover:bg-secondary font-semibold text-sm transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={releaseLoading}
                onClick={handleReleasePayment}
                className="px-5 py-2 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-foreground rounded-lg font-medium text-sm transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {releaseLoading ? "Processing..." : "Confirm Release"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Final Work Modal */}
      {showFinalWorkModal && (
        <div data-modal-overlay className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all animate-fade-in">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100 animate-zoom-in text-left">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 bg-secondary/60 border-b border-border">
              <div className="p-2 bg-muted text-muted-foreground rounded-lg">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground font-sans">View Final Work</h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-sans">Review final deliverables submitted by Expert before releasing payment</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-sm text-muted-foreground font-sans">
              <div className="space-y-3 p-4 bg-muted/30 border border-border rounded-xl">
                <p className="font-semibold text-foreground">Expert Final Deliverables:</p>
                <div>
                  <strong className="block text-muted-foreground text-xs uppercase tracking-wider mb-0.5">Project Link</strong>
                  {project?.finalProjectLink ? (
                    <a
                      href={project.finalProjectLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline font-medium break-all"
                    >
                      {project.finalProjectLink}
                    </a>
                  ) : (
                    <span className="text-sm font-semibold text-muted-foreground">None</span>
                  )}
                </div>
                <div>
                  <strong className="block text-muted-foreground text-xs uppercase tracking-wider">Project Files</strong>
                  {(() => {
                    const raw = project?.finalProjectFile;
                    if (!raw) return <span className="text-sm text-muted-foreground italic">File not provided</span>;
                    let fileInfo = { url: "", name: raw };
                    try {
                      const parsed = JSON.parse(raw);
                      if (parsed?.url || parsed?.fileUrl || parsed?.path) {
                        const fileUrl = parsed.url || parsed.fileUrl || parsed.path;
                        fileInfo = {
                          url: fileUrl.startsWith("http") ? fileUrl : enrichFileUrl(fileUrl),
                          name: parsed.name || parsed.originalName || fileUrl.split("/").pop(),
                        };
                      }
                    } catch {
                      const cleanStr = String(raw).trim();
                      fileInfo = { url: cleanStr.startsWith("http") ? cleanStr : enrichFileUrl(cleanStr), name: cleanStr.split("/").pop().split("\\").pop() };
                    }
                    const getToken = () => sessionStorage.getItem("token") || sessionStorage.getItem("authToken") || sessionStorage.getItem("jwt");
                    const handleView = async () => {
                      try {
                        const res = await fetch(fileInfo.url, { headers: { Authorization: `Bearer ${getToken()}` } });
                        const blob = await res.blob();
                        const type = res.headers.get("content-type") || blob.type || "application/octet-stream";
                        const viewUrl = URL.createObjectURL(new Blob([blob], { type }));
                        window.open(viewUrl, "_blank");
                        setTimeout(() => URL.revokeObjectURL(viewUrl), 30000);
                      } catch { window.open(fileInfo.url, "_blank"); }
                    };
                    const handleDownload = async () => {
                      try {
                        const res = await fetch(fileInfo.url, { headers: { Authorization: `Bearer ${getToken()}` } });
                        const blob = await res.blob();
                        const dlUrl = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = dlUrl; a.download = fileInfo.name;
                        document.body.appendChild(a); a.click(); a.remove();
                        URL.revokeObjectURL(dlUrl);
                      } catch { window.open(fileInfo.url, "_blank"); }
                    };
                    return (
                      <div className="flex items-center gap-2 mt-1">
                        <FileIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-accent font-medium break-all text-sm flex-1 truncate" title={fileInfo.name}>
                          {fileInfo.name}
                        </span>
                        <button type="button" onClick={handleView} className="p-1 text-muted-foreground hover:text-brand-primary rounded-md transition-colors cursor-pointer flex-shrink-0" title="View file">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={handleDownload} className="p-1 text-muted-foreground hover:text-brand-primary rounded-md transition-colors cursor-pointer flex-shrink-0" title="Download file">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })()}
                </div>
                {project?.finalWorkSubmittedAt && (
                  <div className="pt-2.5 border-t border-border mt-3">
                    <strong className="block text-muted-foreground text-xs uppercase tracking-wider mb-1">Submission Time</strong>
                    <div className="flex items-center justify-between text-xs bg-secondary/85 px-3 py-2 rounded-lg border border-border">
                      <span className="text-muted-foreground">Submitted: {new Date(project.finalWorkSubmittedAt).toLocaleString("en-US")}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Decline Feedback Textarea */}
              {showDeclineForm && (
                <div className="space-y-2 border-t border-border pt-4 animate-slide-up">
                  <label className="block text-foreground/80 font-semibold">
                    Decline Reason for Final Deliverables <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Please provide details for Expert to edit..."
                    value={declineFeedback}
                    onChange={(e) => setDeclineFeedback(e.target.value)}
                    className="w-full p-3 border border-input rounded-[10px] focus:outline-none focus:border-brand-primary text-foreground"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-wrap items-center justify-end gap-3 px-6 py-4 bg-secondary/60 border-t border-border font-sans">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setShowFinalWorkModal(false);
                  setShowDeclineForm(false);
                  setDeclineFeedback("");
                }}
                className="px-4 py-2 border border-input text-foreground/80 rounded-xl hover:bg-secondary font-semibold text-sm transition-all cursor-pointer"
              >
                Close
              </button>

              {project.finalDeliveryStatus === "Final Product Submitted" && (
                <>
                  {!showDeclineForm ? (
                    <>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => setShowDeclineForm(true)}
                        className="px-4 py-2 bg-destructive-light hover:bg-destructive-light text-destructive border border-destructive/20 rounded-lg font-medium text-sm transition-all cursor-pointer"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={async () => {
                          setActionLoading(true);
                          try {
                            await handleAcceptProjectFinalDelivery();
                            toast.success("Final deliverables accepted. Release payment button is unlocked.");
                            // Notify expert their final delivery was accepted
                            notifyFinalDeliveryAccepted({
                              expertUserId: project?.assignedExpertId || project?.expertId,
                              clientName: user?.fullName || user?.name || "Client",
                              projectTitle: project?.title || project?.jobPost?.title || "Project",
                              projectId: currentProjectId,
                            }).catch(() => { });
                            setShowFinalWorkModal(false);
                          } catch (err) {
                            toast.error("Failed to accept final deliverables.");
                          } finally {
                            setActionLoading(false);
                          }
                        }}
                        className="px-5 py-2 bg-success hover:bg-success/85 text-primary-foreground rounded-lg font-medium text-sm transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        Done Accept Final Deliverables
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={async () => {
                        if (!declineFeedback.trim()) {
                          toast.error("Please enter decline reason.");
                          return;
                        }
                        setActionLoading(true);
                        try {
                          await handleDeclineProjectFinalDelivery(declineFeedback.trim());
                          toast.success("Revision request for final deliverables submitted.");
                          // Notify expert their final delivery was declined
                          notifyFinalDeliveryDeclined({
                            expertUserId: project?.assignedExpertId || project?.expertId,
                            clientName: user?.fullName || user?.name || "Client",
                            projectTitle: project?.title || project?.jobPost?.title || "Project",
                            feedback: declineFeedback.trim(),
                            projectId: currentProjectId,
                          }).catch(() => { });
                          setShowFinalWorkModal(false);
                          setShowDeclineForm(false);
                          setDeclineFeedback("");
                        } catch (err) {
                          toast.error("Failed to submit revision request.");
                        } finally {
                          setActionLoading(false);
                        }
                      }}
                      className="px-5 py-2 bg-destructive hover:bg-destructive text-primary-foreground rounded-lg font-medium text-sm transition-all shadow-sm cursor-pointer"
                    >
                      Submit Decline & Revision Request
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Cancel Contract Confirmation Modal */}
      {showCancelModal && (() => {
        // Pre-compute breakdown for modal preview
        const contractAmount = project?.escrowBalance || project?.EscrowBalance || project?.escrowAmount || project?.budget || 0;
        const progressRate = overallProgress / 100;

        // Cancellation split formula:
        // - Platform fee 5%: collected by admin
        // - Penalty fee 10%: collected from the cancelling party
        // - Expert receives: 10% penalty fee + progress payout (progress%)
        // - Client receives: total - 5% platform fee - 10% penalty fee - progress payout
        //   = escrow * (0.85 - progressRate)
        // Example: escrow=1000, progress=10%
        //   platformFee=50, penaltyFee=100, progressAmount=100
        //   Expert=100+100=200, Client=1000-150-100=750
        const platformFee = Math.round(contractAmount * 0.05);
        const penaltyFee = Math.round(contractAmount * 0.10);
        const progressAmount = Math.round(contractAmount * progressRate);
        const expertPayout = penaltyFee + progressAmount;
        const clientRefund = contractAmount - platformFee - penaltyFee - progressAmount;
        return (
          <div data-modal-overlay className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all animate-fade-in">
            <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100 animate-zoom-in text-left">
              {/* Header */}
              <div className={`flex items-center gap-3 px-6 py-4 bg-secondary/60 border-b border-border ${cancelAttemptCount >= 1 ? "bg-warning-light border-warning/20" : ""}`}>
                <div className={`p-2 rounded-lg ${cancelAttemptCount >= 1 ? "bg-warning-light text-warning" : "bg-destructive-light text-destructive"}`}>
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-lg font-semibold font-sans ${cancelAttemptCount >= 1 ? "text-warning" : "text-foreground"}`}>
                    {cancelAttemptCount >= 1 ? "Escalate Cancel to Admin (Binding Dispute)" : "Cancel Contract"}
                  </h3>
                  <p className={`text-xs mt-0.5 font-sans ${cancelAttemptCount >= 1 ? "text-warning/80" : "text-muted-foreground"}`}>
                    {cancelAttemptCount >= 1 ? "Your previous cancellation was rejected. This request will be escalated to Admin for a final binding decision." : "Terminate contract & split escrow based on progress"}
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4 text-sm font-sans">
                <div className="space-y-2 p-4 bg-muted/30 border border-border rounded-xl">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Escrow:</span><span className="font-semibold text-foreground"><MoneyDisplay amount={contractAmount} /></span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Current Progress:</span><span className="font-semibold text-foreground">{overallProgress}%</span></div>
                  <div className="border-t border-border my-2" />
                  <div className="flex justify-between"><span className="text-muted-foreground">Platform fee (collected by system):</span><span className="font-semibold text-warning">5% to <MoneyDisplay amount={platformFee} /></span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Cancellation penalty fee:</span><span className="font-semibold text-destructive">10% to <MoneyDisplay amount={penaltyFee} /></span></div>
                  <div className="border-t border-border my-2" />
                  <div className="flex justify-between text-base"><span className="font-semibold text-foreground">Payment to Expert:</span><span className="font-semibold text-warning"><MoneyDisplay amount={expertPayout} /></span></div>
                  <div className="flex justify-between text-base"><span className="font-semibold text-foreground">You receive (minus 15% fee):</span><span className="font-semibold text-success"><MoneyDisplay amount={clientRefund} /></span></div>
                </div>

                <div className="p-3 bg-destructive-light border border-destructive/20 rounded-xl text-destructive text-xs">
                  After cancellation, the project will be closed and cannot be continued. This action cannot be undone.
                </div>

                <div className="space-y-2">
                  <label className="block text-foreground/80 font-semibold text-sm">
                    Cancellation Reason <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Why do you want to cancel this contract?"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full p-3 border border-input rounded-[10px] focus:outline-none focus:border-destructive/35 text-foreground text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-foreground/80 font-semibold text-sm">
                    Attach documents/evidence (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. evidence.pdf, supporting_docs.docx"
                    value={evidenceFileName}
                    onChange={(e) => setEvidenceFileName(e.target.value)}
                    className="w-full p-3 border border-input rounded-[10px] focus:outline-none focus:border-brand-primary text-foreground text-sm"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-secondary/60 border-t border-border font-sans">
                <button
                  type="button"
                  disabled={cancelLoading}
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason("");
                    setEvidenceFileName("");
                  }}
                  className="px-4 py-2 border border-input text-foreground/80 rounded-xl hover:bg-secondary font-semibold text-sm transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={cancelLoading}
                  onClick={report?.status === "Returned" ? handleInitiatorRespondRejection : handleCancelContractInit}
                  className="px-5 py-2 bg-destructive hover:bg-destructive disabled:bg-destructive/45 text-primary-foreground rounded-lg font-medium text-sm transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  {cancelLoading ? "Processing..." : "Confirm Cancellation"}
                </button>
              </div>

              {/* Send Confirmation Dialog */}
              {showSendConfirmDialog && (
                <div data-modal-overlay className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-all animate-fade-in">
                  <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm overflow-hidden p-6 text-left">
                    <h4 className="text-base font-semibold text-foreground">Confirm Submission</h4>
                    <p className="text-sm text-muted-foreground mt-2 font-medium">Are you sure you want to submit this contract cancellation request for Admin review?</p>
                    <div className="flex justify-end gap-3 mt-4">
                      <button
                        type="button"
                        onClick={() => setShowSendConfirmDialog(false)}
                        className="px-4 py-1.5 border border-input text-foreground/80 rounded-lg text-xs font-semibold hover:bg-secondary transition-all cursor-pointer"
                      >
                        Cancel (Decline)
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmCancellationSend}
                        className="px-4 py-1.5 bg-destructive hover:bg-destructive text-primary-foreground rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer"
                      >
                        Agree (Accept)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}



{/* Dialog for Explanation Form */}
      <Dialog open={showExplanationModal} onOpenChange={setShowExplanationModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-destructive">
              Submit Response to Report
            </DialogTitle>
          </DialogHeader>
          <ReportForm
            project={project}
            onSubmit={async (formData) => {
              await handleClientSubmitExplanation(formData);
              setShowExplanationModal(false);
            }}
            onCancel={() => setShowExplanationModal(false)}
            isResponse={true}
            role="client"
            submitLabel="Submit Response"
            initialDisputeType={report?.disputeType}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delivery & Payment Stepper
// ---------------------------------------------------------------------------

function DeliveryPaymentStepper({ project, overallProgress, role, allTasksApproved }) {
  const finalStatus = project?.finalDeliveryStatus || "";
  const isCompleted = project?.status === "completed";

  const steps = [
    {
      label: "Tasks Done",
      done: allTasksApproved,
      active: !allTasksApproved,
    },
    {
      label: "Final Work Submitted",
      done: ["Final Product Submitted", "Accepted", "Declined"].includes(finalStatus),
      active: allTasksApproved && !["Final Product Submitted", "Accepted", "Declined"].includes(finalStatus),
    },
    {
      label: "Delivery Accepted",
      done: finalStatus === "Accepted" || isCompleted,
      active: finalStatus === "Final Product Submitted",
    },
    {
      label: "Payment Released",
      done: isCompleted,
      active: finalStatus === "Accepted" && !isCompleted,
    },
  ];

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
      <h3 className="text-sm font-semibold text-foreground/80 mb-4">Delivery & Payment Progress</h3>
      <div className="flex flex-wrap items-center gap-0">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${step.done
                  ? "bg-success text-primary-foreground"
                  : step.active
                    ? "bg-brand-primary text-brand-primary-foreground ring-2 ring-brand-primary/30"
                    : "bg-muted text-muted-foreground"
                  }`}
              >
                {step.done ? "Done" : i + 1}
              </div>
              <span
                className={`text-[10px] mt-1.5 font-medium max-w-[64px] text-center leading-tight ${step.done ? "text-success" : step.active ? "text-brand-primary font-semibold" : "text-muted-foreground"
                  }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-8 sm:w-12 h-0.5 mx-1 mt-[-12px] transition-colors ${step.done ? "bg-success" : "bg-muted"
                  }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
