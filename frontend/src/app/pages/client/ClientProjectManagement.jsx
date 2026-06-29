import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { CreditCard, Send, CheckCircle2, Ban, Clock } from "lucide-react";
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
import api from "../../../services/api.js";
import { createReport } from "../../../services/reportService.js";
import { DisputeBanner } from "../../components/shared/DisputeBanner.jsx";
import { ReportForm } from "../../components/report/ReportForm.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog.jsx";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import { AnimatedReveal } from "../../components/shared/AnimatedReveal.jsx";

// =============================================================================
// ClientProjectManagement — client-side project progress management page.
// Route: /client/projects/:id
// =============================================================================

export default function ClientProjectDetail() {
  const { projectId, id } = useParams();
  const currentProjectId = projectId || id;
  const navigate = useNavigate();

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
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Cancel Contract states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelConfirmation, setCancelConfirmation] = useState("");
  const [cancelReason, setCancelReason] = useState("");

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
        setElapsedTime(`${diffSecs} giây trước`);
      } else if (diffMins < 60) {
        setElapsedTime(`${diffMins} phút ${diffSecs % 60} giây trước`);
      } else if (diffHrs < 24) {
        setElapsedTime(`${diffHrs} giờ ${diffMins % 60} phút trước`);
      } else {
        setElapsedTime(`${diffDays} ngày ${diffHrs % 24} giờ trước`);
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [project?.finalWorkSubmittedAt]);

  const isDisputed = project?.status?.toLowerCase() === "disputed";
  const isContractCancelled = project?.status?.toLowerCase() === "contract_cancelled";
  const isLocked = isDisputed || isContractCancelled;

  // ── Cancel Contract availability: block on terminal/final states ──
  const normalizedStatus = String(project?.status || "").toLowerCase();
  const normalizedFinalDeliveryStatus = String(project?.finalDeliveryStatus || "").toLowerCase();

  const TERMINAL_STATUSES = new Set([
    "completed",
    "cancelled",
    "canceled",            // US spelling variant
    "contract_cancelled",
    "stopped",
    "closed",
    "disputed",
    "payment_released",
  ]);

  const FINAL_DELIVERY_DONE = new Set([
    "accepted",
    "final_delivery_accepted",
    "delivery_accepted",
  ]);

  const canCancel =
    !TERMINAL_STATUSES.has(normalizedStatus)
    && !FINAL_DELIVERY_DONE.has(normalizedFinalDeliveryStatus)
    && !project?.finalDeliveryAccepted;

  useEffect(() => {
    if (!currentProjectId) return;
    async function loadReport() {
      try {
        const res = await api.get(`/reports`, { params: { projectId: currentProjectId } });
        const list = res?.data || res || [];
        const activeReport = list.find(r => r.status !== "Rejected" && r.status !== "Resolved");
        setReport(activeReport || list[0] || null);
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
      await api.put(`/reports/${report.id}`, explanationData);
      toast.success("Nộp báo cáo giải trình thành công!");
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    } catch (err) {
      toast.error(err.message || "Không thể nộp báo cáo giải trình.");
    }
  };

  const handleClientSubmitReport = async (reportData) => {
    setReportSubmitting(true);
    try {
      await createReport({
        ...reportData,
        reporterRole: "client",
        reportType: "type1"
      });
      setShowReportForm(false);
      toast.success("Báo cáo vi phạm đã được gửi tới Admin thành công.");
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    } catch (err) {
      toast.error(err.message || "Không thể gửi báo cáo vi phạm.");
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleReleasePayment = async () => {
    setReleaseLoading(true);
    try {
      await releaseProjectMoneyToExpert({
        projectId: currentProjectId,
        amount: project?.budget || 0,
        expertId: project?.assignedExpertId || project?.expertId,
      });
      setShowReleaseConfirmModal(false);
      toast.success("Giải ngân thành công! Dự án đã hoàn thành.");
      
      // Dispatch database update event to trigger refresh
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
      
      // Force reload the hook data
      retry();
    } catch (err) {
      toast.error(err.message || "Không thể thực hiện giải ngân.");
    } finally {
      setReleaseLoading(false);
    }
  };

  const handleCancelContract = async () => {
    if (cancelConfirmation !== "CANCEL") {
      toast.error("Please type CANCEL to confirm.");
      return;
    }
    setCancelLoading(true);
    try {
      await cancelProjectContract(currentProjectId, {
        reason: cancelReason || "Client-initiated contract cancellation",
        confirmationAccepted: true,
      });
      setShowCancelModal(false);
      setCancelConfirmation("");
      setCancelReason("");
      toast.success("Contract cancelled. Escrow has been distributed based on project progress.");
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
      retry();
    } catch (err) {
      toast.error(err.message || "Failed to cancel contract.");
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
              className="h-11 px-5 bg-brand-primary text-brand-primary-foreground rounded-lg hover:bg-brand-primary-hover text-base font-semibold"
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
              className="h-11 px-5 bg-brand-primary text-brand-primary-foreground rounded-lg hover:bg-brand-primary-hover text-base font-semibold"
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
      <PageHeader
        title="Project Workspace"
        subtitle="Track progress, review deliverables, and manage escrow safely."
        badge={
          project?.status && !isLocked ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-light text-accent rounded-full text-xs font-semibold capitalize">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {project.status}
            </span>
          ) : null
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
        {/* Dispute banner */}
        {isDisputed && <DisputeBanner report={report} />}
        {isContractCancelled && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-medium">
            This contract has been cancelled. Escrow has been distributed based on project progress ({project?.contractCancellation?.progressPercent || 0}%). The project is now read-only.
          </div>
        )}

        {isDisputed && report?.status === "Awaiting Client" ? (
          <ClientDisputeExplanationPanel
            report={report}
            onSubmit={handleClientSubmitExplanation}
          />
        ) : (
          <>
            {/* Delivery & Payment Stepper */}
            <AnimatedReveal>
              <DeliveryPaymentStepper project={project} overallProgress={overallProgress} role="client" />
            </AnimatedReveal>

            {/* Realtime Submission Timebar & Timer */}
            {project?.finalDeliveryStatus === "Final Product Submitted" && project?.finalWorkSubmittedAt && (
              <AnimatedReveal>
                <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-pulse mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground text-sm">Sản phẩm tổng thể đã được bàn giao (Real-time Timeline)</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Được nộp lúc: <span className="font-semibold text-foreground">{new Date(project.finalWorkSubmittedAt).toLocaleString("vi-VN")}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Thời gian trôi qua</span>
                      <span className="font-mono text-sm font-bold text-emerald-600">{elapsedTime}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFinalWorkModal(true)}
                      className="px-4 py-2 bg-emerald-600 text-white font-semibold text-xs rounded-lg hover:bg-emerald-700 transition-all cursor-pointer shadow-sm"
                    >
                      Thẩm định ngay
                    </button>
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
                onMessage={() => navigate("/messenger")}
              >
                {/* Action buttons (client only) */}
                <div className="flex items-center gap-3">
                  {/* Cancel Contract — blocked by terminal/final states, NOT by progress */}
                  {canCancel && (
                    <button
                      type="button"
                      onClick={() => setShowCancelModal(true)}
                      className="h-11 px-4 border border-red-300 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-semibold text-sm inline-flex items-center gap-2 cursor-pointer transition-all shadow-sm"
                    >
                      <Ban className="w-4 h-4" /> Cancel Contract
                    </button>
                  )}
                  {overallProgress === 100 && project.status !== "completed" && (
                    <>
                      {/* View Final Work Button */}
                      {project.finalDeliveryStatus === "Final Product Submitted" || project.finalDeliveryStatus === "Accepted" || project.finalDeliveryStatus === "Declined" ? (
                        <button
                          type="button"
                          onClick={() => setShowFinalWorkModal(true)}
                          disabled={isLocked}
                          className={`h-11 px-5 rounded-lg font-semibold text-base inline-flex items-center gap-2 shadow-sm transition-all ${
                            isLocked
                              ? "bg-secondary text-muted-foreground border border-border cursor-not-allowed"
                              : "bg-primary text-primary-foreground hover:bg-primary-hover cursor-pointer"
                          }`}
                        >
                          View Final Work
                        </button>
                      ) : (
                        <div className="flex flex-col items-end gap-1">
                          <button
                            disabled
                            className="h-11 px-5 bg-secondary text-muted-foreground border border-border rounded-lg font-semibold text-base inline-flex items-center gap-2 cursor-not-allowed"
                          >
                            View Final Work
                          </button>
                          <span className="text-xs text-muted-foreground italic">
                            Expert has not submitted the final project deliverables yet.
                          </span>
                        </div>
                      )}

                      {/* Release Payment Button */}
                      {project.finalDeliveryStatus === "Accepted" && !isLocked ? (
                        <button
                          type="button"
                          onClick={() => setShowReleaseConfirmModal(true)}
                          className="h-11 px-5 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-foreground rounded-lg font-semibold text-base inline-flex items-center gap-2 shadow-sm cursor-pointer transition-all"
                        >
                          <CreditCard className="w-4 h-4" /> Release Payment
                        </button>
                      ) : (
                        <div className="flex flex-col items-end gap-1">
                          <button
                            disabled
                            className="h-11 px-5 bg-secondary text-muted-foreground border border-border rounded-lg font-semibold text-base inline-flex items-center gap-2 cursor-not-allowed"
                          >
                            <CreditCard className="w-4 h-4" /> Release Payment
                          </button>
                          <span className="text-xs text-muted-foreground italic text-right max-w-[220px]">
                            {isLocked
                              ? (isContractCancelled
                                ? "Payment settled — contract was cancelled."
                                : "Payment locked — project is under admin dispute review.")
                              : project.finalDeliveryStatus === "Declined"
                              ? "Final delivery was declined. Expert must resubmit."
                              : "Final delivery must be reviewed and accepted before payment can be released."}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  {project.status === "completed" && (
                    <button
                      disabled
                      className="h-11 px-5 bg-success/10 text-success border border-success/20 rounded-lg font-semibold text-base cursor-not-allowed inline-flex items-center gap-2"
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
                onToggleMiniTask={() => {}} // Client cannot toggle
                loading={false}
                readOnly={isLocked}
                project={project}
              />
            </AnimatedReveal>
          </>
        )}
      </div>

      {/* Release Payment Confirmation Modal */}
      {showReleaseConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all animate-fade-in">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 animate-zoom-in text-left">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 bg-secondary/60 border-b border-border">
              <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-lg">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground font-sans">Giải ngân dự án (Release Payment)</h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-sans">Dự án đã đạt 100% hoàn thành</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-sm text-muted-foreground font-sans">
              <p>Bạn có chắc chắn muốn giải ngân cho dự án <strong>{project?.title}</strong>?</p>
              <p className="p-3 bg-muted/50 text-foreground rounded-xl border border-border leading-relaxed">
                Số tiền ký quỹ (<strong><MoneyDisplay amount={project?.budget} /></strong>) đang trong hệ thống Escrow sẽ được chuyển trực tiếp vào tài khoản khả dụng của Chuyên gia (Available Balance và Total Earned). Hành động này không thể hoàn tác.
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
                Hủy
              </button>
              <button
                type="button"
                disabled={releaseLoading}
                onClick={handleReleasePayment}
                className="px-5 py-2 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-foreground rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {releaseLoading ? "Đang xử lý..." : "Đồng ý giải ngân"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Final Work Modal */}
      {showFinalWorkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all animate-fade-in">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100 animate-zoom-in text-left">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 bg-secondary/60 border-b border-border">
              <div className="p-2 bg-muted text-muted-foreground rounded-lg">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground font-sans">Thẩm định sản phẩm tổng thể (View Final Work)</h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-sans">Kiểm tra kỹ lưỡng các sản phẩm Expert đã bàn giao trước khi giải ngân</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-sm text-muted-foreground font-sans">
              <div className="space-y-3 p-4 bg-muted/30 border border-border rounded-xl">
                <p className="font-semibold text-foreground">Sản phẩm bàn giao tổng thể của Expert:</p>
                <div>
                  <strong className="block text-muted-foreground text-xs uppercase tracking-wider">Project Link</strong>
                  <a
                    href={project?.finalProjectLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent hover:underline font-medium break-all"
                  >
                    {project?.finalProjectLink || "Chưa cung cấp link"}
                  </a>
                </div>
                <div>
                  <strong className="block text-muted-foreground text-xs uppercase tracking-wider">Project Files</strong>
                  <span className="font-semibold text-foreground break-all">
                    {project?.finalProjectFile || "Chưa cung cấp file"}
                  </span>
                </div>
                {project?.finalWorkSubmittedAt && (
                  <div className="pt-2.5 border-t border-border mt-3">
                    <strong className="block text-muted-foreground text-xs uppercase tracking-wider mb-1">Thời gian chờ thẩm định</strong>
                    <div className="flex items-center justify-between text-xs bg-secondary/85 px-3 py-2 rounded-lg border border-border">
                      <span className="text-muted-foreground">Đã nộp: {new Date(project.finalWorkSubmittedAt).toLocaleString("vi-VN")}</span>
                      <span className="font-mono font-bold text-accent">{elapsedTime}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Decline Feedback Textarea */}
              {showDeclineForm && (
                <div className="space-y-2 border-t border-border pt-4 animate-slide-up">
                  <label className="block text-foreground/80 font-semibold">
                    Lý do từ chối sản phẩm bàn giao cuối cùng <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Vui lòng cung cấp lý do chi tiết để Expert sửa đổi..."
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
                Đóng
              </button>

              {project.finalDeliveryStatus === "Final Product Submitted" && (
                <>
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
                        onClick={async () => {
                          setActionLoading(true);
                          try {
                            await handleAcceptProjectFinalDelivery();
                            toast.success("Đã chấp nhận sản phẩm bàn giao tổng thể. Nút giải ngân đã được mở khóa.");
                            setShowFinalWorkModal(false);
                          } catch (err) {
                            toast.error("Không thể chấp nhận sản phẩm bàn giao.");
                          } finally {
                            setActionLoading(false);
                          }
                        }}
                        className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        ✓ Chấp nhận sản phẩm tổng
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={async () => {
                        if (!declineFeedback.trim()) {
                          toast.error("Vui lòng nhập lý do từ chối.");
                          return;
                        }
                        setActionLoading(true);
                        try {
                          await handleDeclineProjectFinalDelivery(declineFeedback.trim());
                          toast.success("Đã gửi yêu cầu chỉnh sửa sản phẩm tổng thể.");
                          setShowFinalWorkModal(false);
                          setShowDeclineForm(false);
                          setDeclineFeedback("");
                        } catch (err) {
                          toast.error("Không thể gửi yêu cầu chỉnh sửa.");
                        } finally {
                          setActionLoading(false);
                        }
                      }}
                      className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all shadow-sm cursor-pointer"
                    >
                      Gửi yêu cầu chỉnh sửa (Submit Decline)
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
        const contractAmount = project?.escrowAmount || project?.budget || 0;
        const progressRate = overallProgress / 100;
        const progressPayout = Math.round(contractAmount * progressRate * 100) / 100;
        const compensationFee = Math.round(contractAmount * 0.10 * 100) / 100;
        const platformServiceFee = Math.round(contractAmount * 0.05 * 100) / 100;
        const rawExpertPayout = progressPayout + compensationFee;
        const expertPayout = Math.round(Math.min(contractAmount - platformServiceFee, rawExpertPayout) * 100) / 100;
        const clientRefund = Math.round(Math.max(0, contractAmount - expertPayout - platformServiceFee) * 100) / 100;
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all animate-fade-in">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100 animate-zoom-in text-left">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 bg-secondary/60 border-b border-border">
              <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground font-sans">Cancel Contract</h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-sans">This action will end the project and distribute the escrow based on current progress</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-sm font-sans">
              <div className="space-y-2 p-4 bg-muted/30 border border-border rounded-xl">
                <div className="flex justify-between"><span className="text-muted-foreground">Contract Value:</span><span className="font-semibold text-foreground"><MoneyDisplay amount={contractAmount} /></span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Current Progress:</span><span className="font-semibold text-foreground">{overallProgress}%</span></div>
                <div className="border-t border-border my-2" />
                <div className="flex justify-between"><span className="text-muted-foreground">Expert Progress Pay:</span><span className="font-semibold text-foreground"><MoneyDisplay amount={progressPayout} /></span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Expert Compensation (10%):</span><span className="font-semibold text-foreground"><MoneyDisplay amount={compensationFee} /></span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Platform Service Fee (5%):</span><span className="font-semibold text-foreground"><MoneyDisplay amount={platformServiceFee} /></span></div>
                <div className="border-t border-border my-2" />
                <div className="flex justify-between text-base"><span className="font-bold text-foreground">Expert Total Payout:</span><span className="font-bold text-amber-600"><MoneyDisplay amount={expertPayout} /></span></div>
                <div className="flex justify-between text-base"><span className="font-bold text-foreground">Your Refund:</span><span className="font-bold text-green-600"><MoneyDisplay amount={clientRefund} /></span></div>
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                After cancellation, the project will be closed and cannot be continued. This action cannot be undone.
              </div>

              <div className="space-y-2">
                <label className="block text-foreground/80 font-semibold text-sm">
                  Reason (optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Why are you cancelling this contract?"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full p-3 border border-input rounded-[10px] focus:outline-none focus:border-red-300 text-foreground text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-foreground/80 font-semibold text-sm">
                  Type <span className="text-red-500 font-bold">CANCEL</span> to confirm
                </label>
                <input
                  type="text"
                  placeholder="Type CANCEL"
                  value={cancelConfirmation}
                  onChange={(e) => setCancelConfirmation(e.target.value)}
                  className="w-full p-3 border border-input rounded-[10px] focus:outline-none focus:border-red-400 text-foreground text-sm font-mono"
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
                  setCancelConfirmation("");
                  setCancelReason("");
                }}
                className="px-4 py-2 border border-input text-foreground/80 rounded-xl hover:bg-secondary font-semibold text-sm transition-all cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                disabled={cancelLoading || cancelConfirmation !== "CANCEL"}
                onClick={handleCancelContract}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                {cancelLoading ? "Processing..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Dialog for Report Form */}
      <Dialog open={showReportForm} onOpenChange={setShowReportForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              Báo cáo vi phạm Chuyên gia (Client Report Expert)
            </DialogTitle>
          </DialogHeader>
          <ReportForm
            project={project}
            onSubmit={handleClientSubmitReport}
            onCancel={() => setShowReportForm(false)}
            loading={reportSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delivery & Payment Stepper
// ---------------------------------------------------------------------------

function DeliveryPaymentStepper({ project, overallProgress, role }) {
  const finalStatus = project?.finalDeliveryStatus || "";
  const isCompleted = project?.status === "completed";

  const steps = [
    {
      label: "Tasks Done",
      done: overallProgress === 100,
      active: overallProgress < 100,
    },
    {
      label: "Final Work Submitted",
      done: ["Final Product Submitted", "Accepted", "Declined"].includes(finalStatus),
      active: overallProgress === 100 && !["Final Product Submitted", "Accepted", "Declined"].includes(finalStatus),
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
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step.done
                    ? "bg-success text-white"
                    : step.active
                    ? "bg-brand-primary text-brand-primary-foreground ring-2 ring-brand-primary/30"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step.done ? "✓" : i + 1}
              </div>
              <span
                className={`text-[10px] mt-1.5 font-medium max-w-[64px] text-center leading-tight ${
                  step.done ? "text-success" : step.active ? "text-brand-primary font-semibold" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-8 sm:w-12 h-0.5 mx-1 mt-[-12px] transition-colors ${
                  step.done ? "bg-success" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client Dispute Explanation Panel (Luồng 2 Step 3 response form)
// ---------------------------------------------------------------------------

function ClientDisputeExplanationPanel({ report, onSubmit }) {
  const [explanation, setExplanation] = useState("");
  const [evidenceName, setEvidenceName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!report?.replyDeadline) return;
    function calculateTime() {
      const now = Date.now();
      const deadline = new Date(report.replyDeadline).getTime();
      if (Number.isNaN(deadline)) {
        setTimeLeft("Không xác định");
        return;
      }
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeLeft("HẾT HẠN PHẢN HỒI (Admin có thể xử thua)");
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours} giờ ${minutes} phút ${seconds} giây còn lại`);
      }
    }
    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [report?.replyDeadline]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!explanation.trim()) {
      toast.error("Vui lòng nhập nội dung giải trình.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        clientExplanation: explanation,
        clientExplanationEvidence: evidenceName ? [{ fileName: evidenceName, note: "Bằng chứng khách hàng nộp" }] : []
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-red-200 shadow-lg overflow-hidden font-sans">
      <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-red-950">YÊU CẦU GIẢI TRÌNH TRANH CHẤP THANH TOÁN</h3>
          <p className="text-xs text-red-700 mt-0.5">Chuyên gia báo cáo bạn trì hoãn giải ngân. Vui lòng phản hồi.</p>
        </div>
        <div className="px-3 py-1.5 bg-red-100 text-red-800 rounded-lg text-xs font-bold border border-red-200">
          Hạn chót: {timeLeft || "48 giờ"}
        </div>
      </div>
      <div className="p-6 space-y-6 text-left">
        <div className="p-4 bg-secondary/60 border border-border rounded-xl space-y-3">
          <h4 className="font-bold text-foreground text-sm">Nội dung báo cáo từ Chuyên gia:</h4>
          <p className="text-sm text-foreground/80"><strong>Lý do:</strong> {report.reason || report.reportName}</p>
          <p className="text-sm text-foreground/80"><strong>Mô tả chi tiết:</strong> {report.description}</p>
          {safeArray(report.evidence).length > 0 && (
            <div className="text-xs text-muted-foreground pt-2 border-t border-border">
              <strong>Bằng chứng đính kèm:</strong> {safeArray(report.evidence).map(e => e.fileName || e.name).join(", ")}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-foreground/80 font-semibold mb-1 text-sm">
              Nội dung giải trình của bạn <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="Giải trình lý do bạn chưa giải ngân (ví dụ: sản phẩm chưa đạt chất lượng, Expert chưa sửa lỗi...)"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-[10px] focus:outline-none focus:border-red-500 text-foreground text-sm"
            />
          </div>

          <div>
            <label className="block text-foreground/80 font-semibold mb-1 text-sm">
              Tài liệu / Bằng chứng giải trình (Tên file)
            </label>
            <input
              type="text"
              placeholder="Ví dụ: chat_proof.pdf, qa_report.pdf..."
              value={evidenceName}
              onChange={(e) => setEvidenceName(e.target.value)}
              className="w-full h-11 px-3 border border-input rounded-[10px] focus:outline-none focus:border-red-500 text-foreground text-sm"
            />
          </div>

          <div className="flex items-center justify-end pt-2 border-t border-border">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Đang gửi giải trình..." : "Gửi báo cáo giải trình"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

