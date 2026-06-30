import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Send, AlertTriangle, CheckCircle2, Ban, Clock } from "lucide-react";
import { useProjectProgress } from "../../hooks/useProjectProgress.js";
import { ProjectHeaderCard } from "../../components/project/ProjectHeaderCard.jsx";
import { ProjectProgressPanel } from "../../components/project/ProjectProgressPanel.jsx";
import { LoadingSkeleton } from "../../components/shared/LoadingSkeleton.jsx";
import { EmptyState } from "../../components/shared/EmptyState.jsx";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import api from "../../../services/api.js";
import { createReport } from "../../../services/reportService.js";
import { cancelProjectContract } from "../../../services/escrowService.js";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { DisputeBanner } from "../../components/shared/DisputeBanner.jsx";
import { ReportForm } from "../../components/report/ReportForm.jsx";
import { safeArray } from "../../lib/safety.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog.jsx";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import { AnimatedReveal } from "../../components/shared/AnimatedReveal.jsx";
import { BackButton } from "../../components/shared/BackButton.jsx";

// =============================================================================
// ExpertProjectManagement — expert-side project progress management page.
// Route: /expert/projects/:id
// =============================================================================

export default function ExpertProjectDetail() {
  const { projectId, id } = useParams();
  const currentProjectId = projectId || id;
  const navigate = useNavigate();

  const {
    project,
    tasks,
    client,
    loading,
    error,
    overallProgress,
    handleToggleMiniTask,
    handleSubmitProjectFinalWork,
    retry,
  } = useProjectProgress(currentProjectId, "expert");

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [projectLink, setProjectLink] = useState("");
  const [projectFile, setProjectFile] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dispute / Report states
  const [report, setReport] = useState(null);
  const [showExplanationModal, setShowExplanationModal] = useState(false);

  // Cancel Contract states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  // New Cancellation Negotiation states
  const [evidenceFileName, setEvidenceFileName] = useState("");
  const [showSendConfirmDialog, setShowSendConfirmDialog] = useState(false);
  const [showPartnerRejectForm, setShowPartnerRejectForm] = useState(false);
  const [partnerRejectReason, setPartnerRejectReason] = useState("");
  const [partnerActionLoading, setPartnerActionLoading] = useState(false);

  const isDisputed = project?.status?.toLowerCase() === "disputed";
  const isContractCancelled = project?.status?.toLowerCase() === "contract_cancelled" || project?.status?.toLowerCase() === "cancel_done";
  const isLocked = isDisputed || isContractCancelled || project?.status === "Awaiting_Cancellation";

  // -- Cancel Contract availability --
  const normalizedStatus = String(project?.status || "").toLowerCase();
  const normalizedFinalDeliveryStatus = String(project?.finalDeliveryStatus || "").toLowerCase();

  const TERMINAL_STATUSES = new Set([
    "completed",
    "cancelled",
    "canceled",
    "contract_cancelled",
    "cancel_done",
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
    && normalizedStatus !== "awaiting_cancellation"
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

  const handleExpertSubmitExplanation = async (explanationData) => {
    try {
      await api.put(`/reports/${report.id}`, {
        expertExplanation: explanationData.description,
        expertExplanationReason: explanationData.reason,
        expertExplanationDescription: explanationData.description,
        expertExplanationDisputeType: explanationData.disputeType,
        expertExplanationDesiredResolution: explanationData.desiredResolution,
        expertExplanationEvidence: explanationData.evidence
      });
      toast.success("Nộp báo cáo phản hồi giải trình thành công!");
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    } catch (err) {
      toast.error(err.message || "Không thể nộp báo cáo giải trình.");
    }
  };



  const handleCancelContractInit = () => {
    if (!cancelReason.trim()) {
      toast.error("Vui lòng nhập lý do hủy hợp đồng.");
      return;
    }
    setShowSendConfirmDialog(true);
  };

  const handleConfirmCancellationSend = async () => {
    setCancelLoading(true);
    try {
      await api.post("/interactions/transaction", {
        projectId: currentProjectId,
        reason: cancelReason,
        evidenceFileName: evidenceFileName || "",
        type: "cancel_contract",
        transactionType: "cancel_contract",
      });
      setShowCancelModal(false);
      setShowSendConfirmDialog(false);
      setCancelReason("");
      setEvidenceFileName("");
      toast.success("Đã gửi yêu cầu hủy hợp đồng lên Admin xét duyệt.");
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
      retry();
    } catch (err) {
      toast.error(err.message || "Không thể gửi yêu cầu hủy hợp đồng.");
    } finally {
      setCancelLoading(false);
    }
  };

  const handlePartnerAcceptCancel = async () => {
    setPartnerActionLoading(true);
    try {
      await api.put(`/reports/${report.id}/partner-accept-cancel`);
      toast.success("Bạn đã đồng ý hủy hợp đồng. Tiền đã được giải ngân/hoàn trả.");
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
      retry();
    } catch (err) {
      toast.error(err.message || "Thao tác thất bại.");
    } finally {
      setPartnerActionLoading(false);
    }
  };

  const handlePartnerRejectCancel = async () => {
    if (!partnerRejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối hủy hợp đồng.");
      return;
    }
    setPartnerActionLoading(true);
    try {
      await api.put(`/reports/${report.id}/partner-reject-cancel`, {
        partnerRejectionReason: partnerRejectReason,
      });
      toast.success("Bạn đã từ chối yêu cầu hủy. Lý do đã được gửi lên Admin.");
      setShowPartnerRejectForm(false);
      setPartnerRejectReason("");
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
      retry();
    } catch (err) {
      toast.error(err.message || "Thao tác thất bại.");
    } finally {
      setPartnerActionLoading(false);
    }
  };

  const handleInitiatorAcceptRejection = async () => {
    setCancelLoading(true);
    try {
      await api.put(`/reports/${report.id}/initiator-accept-rejection`);
      toast.success("Bạn đã chấp nhận từ chối hủy. Dự án hoạt động bình thường trở lại.");
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
      retry();
    } catch (err) {
      toast.error(err.message || "Thao tác thất bại.");
    } finally {
      setCancelLoading(false);
    }
  };

  const handleInitiatorRespondRejection = async () => {
    if (!cancelReason.trim()) {
      toast.error("Vui lòng nhập lý do hủy đầy đủ hơn.");
      return;
    }
    setCancelLoading(true);
    try {
      await api.put(`/reports/${report.id}/initiator-respond-rejection`, {
        reason: cancelReason,
        evidenceFileName: evidenceFileName || "",
      });
      toast.success("Đã phản hồi và gửi lại đơn hủy hợp đồng mới lên Admin.");
      setShowCancelModal(false);
      setCancelReason("");
      setEvidenceFileName("");
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
      retry();
    } catch (err) {
      toast.error(err.message || "Thao tác thất bại.");
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
              className="h-11 px-5 bg-brand-primary text-brand-primary-foreground rounded-lg hover:bg-brand-primary-hover font-semibold text-base inline-flex items-center gap-2 transition-colors"
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
              onClick={() => navigate("/expert/dashboard")}
              className="h-11 px-5 bg-brand-primary text-brand-primary-foreground rounded-lg hover:bg-brand-primary-hover font-semibold text-base inline-flex items-center gap-2 transition-colors"
            >
              Go to Dashboard
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      <BackButton fallback="/expert/dashboard" className="mb-6">
        Quay lại trang chính
      </BackButton>
      <PageHeader
        title="Project Workspace"
        subtitle="Complete tasks, submit deliverables, and track project progress."
        badge={
          project?.status ? (() => {
            const status = project.status.toLowerCase();
            let label = project.status;
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
          </svg>
        }
      />

      <div className="space-y-6">
        {/* Dispute banner */}
        {isDisputed && <DisputeBanner report={report} />}
        {report?.status === "Rejected" && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm font-sans flex items-start gap-2 shadow-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Báo cáo vi phạm đã bị Admin từ chối giải quyết</p>
              {report.rejectionReason && (
                <p className="mt-1 text-muted-foreground"><strong>Lý do từ chối:</strong> {report.rejectionReason}</p>
              )}
            </div>
          </div>
        )}
        {report?.status === "Resolved" && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-sans flex items-start gap-2.5 shadow-sm animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-950">Tranh chấp đã được giải quyết thành công</p>
              <p className="mt-1 text-emerald-800/90">
                {report.moneyAction === "refund" || project?.status?.toLowerCase() === "cancelled" ? (
                  "Dự án đã kết thúc (Huỷ bỏ). Toàn bộ tiền ký quỹ (escrow) đã được Admin hoàn trả lại vào ví của Khách hàng."
                ) : (
                  "Dự án đã kết thúc (Hoàn thành). Toàn bộ tiền ký quỹ (escrow) đã được Admin giải ngân chuyển vào ví của Chuyên gia."
                )}
              </p>
            </div>
          </div>
        )}
        {project?.status === "Awaiting_Cancellation" && report?.disputeType === "cancellation" && (
          <div className="p-6 bg-card border border-amber-300 rounded-2xl shadow-sm text-sm font-sans space-y-4">
            {report.reporterRole === "expert" ? (
              report.status === "Pending Admin" ? (
                <div className="flex items-start gap-3 text-left">
                  <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-foreground text-base">Đơn yêu cầu hủy hợp đồng của bạn đang chờ xét duyệt</h4>
                    <p className="text-muted-foreground mt-1">Đơn hủy đã được gửi lên hệ thống. Admin đang tiến hành duyệt đơn của bạn trước khi chuyển cho đối tác.</p>
                  </div>
                </div>
              ) : report.status === "Awaiting Partner" ? (
                <div className="flex items-start gap-3 text-left">
                  <Clock className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-foreground text-base">Đã gửi yêu cầu hủy cho đối tác (Client)</h4>
                    <p className="text-muted-foreground mt-1">Admin đã thông qua đơn hủy hợp đồng của bạn. Đang chờ Client xem xét phản hồi (Chấp nhận hoặc Từ chối).</p>
                  </div>
                </div>
              ) : report.status === "Returned" ? (
                <div className="space-y-4 text-left">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-foreground text-base text-red-600">Yêu cầu hủy hợp đồng bị đối tác từ chối</h4>
                      <p className="text-muted-foreground mt-1">Client không đồng ý hủy hợp đồng với các lý do sau:</p>
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl mt-2 font-medium text-red-800">
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
                      Chấp nhận từ chối (Dự án chạy lại)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCancelReason(report.reason || "");
                        setShowCancelModal(true);
                      }}
                      className="px-4 py-2 bg-brand-primary text-white rounded-xl font-bold text-sm hover:bg-brand-primary-hover transition-all cursor-pointer"
                    >
                      Phản hồi (Gửi lại đơn hủy mới)
                    </button>
                  </div>
                </div>
              ) : null
            ) : (
              report.status === "Pending Admin" ? (
                <div className="flex items-start gap-3 text-left">
                  <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-foreground text-base">Client yêu cầu hủy hợp đồng</h4>
                    <p className="text-muted-foreground mt-1">Client đã gửi yêu cầu hủy hợp đồng lên Admin. Dự án tạm khóa để chờ Admin xét duyệt.</p>
                  </div>
                </div>
              ) : report.status === "Awaiting Partner" ? (
                <div className="space-y-4 text-left">
                  <div className="flex items-start gap-3 border-b border-border pb-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-foreground text-base">Client yêu cầu hủy hợp đồng</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">Vui lòng xem chi tiết lý do và phương án phân chia tiền ký quỹ bên dưới.</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-foreground">
                      <strong className="text-muted-foreground font-semibold">Lý do hủy:</strong> &quot;{report.reason}&quot;
                    </p>
                    {report.evidence && report.evidence.length > 0 && (
                      <p className="text-xs text-foreground flex items-center gap-1.5 mt-1">
                        <strong className="text-muted-foreground font-semibold">Tài liệu đi kèm:</strong>
                        <span className="text-brand-primary underline cursor-pointer">{report.evidence[0].fileName}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 p-4 bg-muted/40 border border-border rounded-xl text-xs max-w-md">
                    <div className="flex justify-between"><span className="text-muted-foreground">Giá trị hợp đồng:</span><span className="font-semibold text-foreground"><MoneyDisplay amount={report.payoutBreakdown?.contractAmount} /></span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Tiến độ hiện tại:</span><span className="font-semibold text-foreground">{report.payoutBreakdown?.progressPercent}%</span></div>
                    <div className="border-t border-border my-1.5" />
                    <div className="flex justify-between font-bold"><span className="text-foreground">Bạn nhận được (Thanh toán):</span><span className="text-green-600"><MoneyDisplay amount={report.payoutBreakdown?.expertPayout} /></span></div>
                    <div className="flex justify-between font-bold"><span className="text-foreground">Hoàn trả cho Client:</span><span className="text-amber-600"><MoneyDisplay amount={report.payoutBreakdown?.clientRefund} /></span></div>
                    <div className="flex justify-between text-[10px] text-muted-foreground"><span className="italic">* Phí sàn 5% và bồi thường 10% đã được tự động áp dụng.</span></div>
                  </div>

                  {!showPartnerRejectForm ? (
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handlePartnerAcceptCancel}
                        disabled={partnerActionLoading}
                        className="px-5 py-2 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-all cursor-pointer shadow-sm"
                      >
                        Accept (Đồng ý hủy & Nhận tiền)
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPartnerRejectForm(true)}
                        disabled={partnerActionLoading}
                        className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl font-semibold text-sm hover:bg-red-100 transition-all cursor-pointer"
                      >
                        Reject (Từ chối hủy)
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-2 animate-slide-up">
                      <label className="block text-xs font-bold text-foreground/80 uppercase">Lý do từ chối hủy hợp đồng <span className="text-red-500">*</span></label>
                      <textarea
                        rows={2}
                        placeholder="Vui lòng cung cấp lý do bạn từ chối yêu cầu hủy này..."
                        value={partnerRejectReason}
                        onChange={(e) => setPartnerRejectReason(e.target.value)}
                        className="w-full max-w-lg p-3 border border-input rounded-[10px] focus:outline-none focus:border-red-300 text-foreground text-sm"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handlePartnerRejectCancel}
                          disabled={partnerActionLoading}
                          className="px-4 py-1.5 bg-red-600 text-white rounded-xl font-bold text-xs hover:bg-red-700 transition-all cursor-pointer"
                        >
                          Gửi lý do từ chối
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowPartnerRejectForm(false);
                            setPartnerRejectReason("");
                          }}
                          className="px-3 py-1.5 border border-input rounded-xl text-foreground text-xs hover:bg-secondary transition-all cursor-pointer"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : report.status === "Returned" ? (
                <div className="flex items-start gap-3 text-left">
                  <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-foreground text-base">Đã từ chối hủy hợp đồng</h4>
                    <p className="text-muted-foreground mt-1">Bạn đã từ chối yêu cầu hủy của đối tác. Đang chờ đối tác đưa ra phản hồi hoặc chấp nhận hủy bỏ yêu cầu hủy.</p>
                  </div>
                </div>
              ) : null
            )}
          </div>
        )}
        {project?.status === "cancel_done" && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-medium text-left">
            Hợp đồng dự án đã được hủy thành công. Tiền ký quỹ đã được phân chia dựa trên tiến độ dự án ({project?.contractCancellation?.progressPercent || 0}%). Dự án hiện chỉ có thể xem.
          </div>
        )}

        {/* Delivery & Payment Stepper */}
        <AnimatedReveal>
          <ExpertDeliveryStepper project={project} overallProgress={overallProgress} />
        </AnimatedReveal>

            {/* Project header */}
            <AnimatedReveal delay={1}>
              <ProjectHeaderCard
                project={project}
                client={client}
                role="expert"
                overallProgress={overallProgress}
                loading={false}
                onMessage={() => navigate("/messenger")}
              >
                <div className="flex items-center gap-3">
                  {canCancel && (
                    <button
                      type="button"
                      onClick={() => setShowCancelModal(true)}
                      className="h-11 px-4 border border-red-300 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-semibold text-sm inline-flex items-center gap-2 cursor-pointer transition-all shadow-sm"
                    >
                      <Ban className="w-4 h-4" /> Cancel Contract
                    </button>
                  )}

                  {report && (report?.status === "Awaiting Expert" || (report?.status === "Awaiting Both" && !report?.currentRoundExpertSubmitted)) && (
                    <button
                      type="button"
                      onClick={() => setShowExplanationModal(true)}
                      className="h-11 px-4 border border-red-500 text-white bg-red-600 hover:bg-red-700 rounded-lg font-semibold text-sm inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-sm animate-pulse"
                    >
                      <AlertTriangle className="w-4 h-4" /> Gửi báo cáo giải trình
                    </button>
                  )}
                  {report && (
                    (report?.reporterRole === "expert") || 
                    (report?.status === "Awaiting Both" && report?.currentRoundExpertSubmitted) || 
                    (report?.status === "Pending Admin" || report?.status === "Awaiting Evidence" || report?.status === "Awaiting Client")
                  ) && (
                    <div className="h-11 px-4 bg-secondary text-muted-foreground rounded-lg font-semibold text-sm inline-flex items-center gap-1.5 cursor-not-allowed border border-border">
                      <AlertTriangle className="w-4 h-4" /> Đang chờ xử lý...
                    </div>
                  )}
                  {project.status === "completed" && (
                    <button
                      disabled
                      className="h-11 px-5 bg-success/10 text-success border border-success/20 rounded-lg font-semibold text-base inline-flex items-center gap-2 cursor-not-allowed"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Project Complete
                    </button>
                  )}
                </div>
              </ProjectHeaderCard>
            </AnimatedReveal>

            {/* Project Final Handover Section */}
            {overallProgress === 100 && project.status !== "completed" && !isDisputed && (
              <AnimatedReveal delay={2}>
                <div className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-4">
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2 font-sans">
                    <Send className="w-5 h-5 text-brand-primary" /> Final Project Handover
                  </h2>

                  {project.finalWorkDeclineReason && (
                    <div className="p-4 bg-red-50 text-red-800 rounded-xl border border-red-100 text-sm font-sans">
                      <strong className="block font-semibold mb-1">Revision Requested:</strong>
                      {project.finalWorkDeclineReason}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-secondary/60 p-4 rounded-xl font-sans">
                    <div className="space-y-1">
                      <p className="text-sm text-foreground/80">
                        {project.finalDeliveryStatus === "Final Product Submitted" ? (
                          <span className="text-brand-primary font-semibold flex items-center gap-1.5">
                            ✓ Submitted. Waiting for Client review.
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            All tasks complete. Provide the final project link and file for handover.
                          </span>
                        )}
                      </p>
                      {project.finalDeliveryStatus === "Final Product Submitted" && (
                        <div className="text-xs text-muted-foreground space-y-0.5 mt-1 pt-1 border-t border-border">
                          <p><strong>Project Link:</strong> <a href={project.finalProjectLink} target="_blank" rel="noreferrer" className="text-brand-primary hover:underline">{project.finalProjectLink}</a></p>
                          <p><strong>Project File:</strong> <span className="font-semibold text-foreground/80">{project.finalProjectFile}</span></p>
                        </div>
                      )}
                    </div>

                    {project.finalDeliveryStatus !== "Final Product Submitted" && project.finalDeliveryStatus !== "Accepted" ? (
                      <button
                        type="button"
                        onClick={() => setShowSubmitModal(true)}
                        className="h-11 px-6 bg-brand-primary text-brand-primary-foreground rounded-lg hover:bg-brand-primary-hover font-semibold text-base inline-flex items-center gap-2 transition-colors cursor-pointer shrink-0"
                      >
                        <Send className="w-4 h-4" /> Submit Final Work
                      </button>
                    ) : (
                      <button
                        disabled
                        className="h-11 px-6 bg-muted text-muted-foreground border border-input rounded-lg font-semibold text-base inline-flex items-center gap-2 cursor-not-allowed shrink-0"
                      >
                        ✓ Submitted
                      </button>
                    )}
                  </div>
                </div>
              </AnimatedReveal>
            )}

            {/* Project progress panel — expert can toggle mini tasks */}
            <AnimatedReveal delay={3}>
              <ProjectProgressPanel
                tasks={tasks}
                overallProgress={overallProgress}
                role="expert"
                projectId={currentProjectId}
                onToggleMiniTask={(taskId, miniTaskId) =>
                  handleToggleMiniTask(taskId, miniTaskId)
                }
                loading={false}
                readOnly={isDisputed}
              />
            </AnimatedReveal>
      </div>

      {/* Submit Final Work Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all animate-fade-in">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md overflow-hidden text-left animate-zoom-in">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 bg-secondary/60 border-b border-border">
              <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-lg">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground font-sans">Nộp sản phẩm bàn giao cuối cùng</h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-sans">Vui lòng cung cấp link và tệp tin sản phẩm để bàn giao</p>
              </div>
            </div>

            {/* Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!projectLink.trim()) {
                  toast.error("Vui lòng cung cấp Project Link.");
                  return;
                }
                if (!projectFile.trim()) {
                  toast.error("Vui lòng cung cấp tên Project File (.zip, .rar).");
                  return;
                }
                setIsSubmitting(true);
                try {
                  await handleSubmitProjectFinalWork(projectLink.trim(), projectFile.trim());
                  toast.success("Bàn giao sản phẩm tổng thành công!");
                  setShowSubmitModal(false);
                } catch (err) {
                  toast.error("Không thể nộp sản phẩm bàn giao.");
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="p-6 space-y-4 font-sans text-sm"
            >
              <div>
                <label className="block text-foreground/80 font-semibold mb-1">
                  Project Link <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: https://github.com/username/project"
                  value={projectLink}
                  onChange={(e) => setProjectLink(e.target.value)}
                  className="w-full h-11 px-3 border border-input rounded-[10px] focus:outline-none focus:border-brand-primary text-foreground"
                />
              </div>

              <div>
                <label className="block text-foreground/80 font-semibold mb-1">
                  Project Files (.zip, .rar) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: sourcecode-v1.zip"
                  value={projectFile}
                  onChange={(e) => setProjectFile(e.target.value)}
                  className="w-full h-11 px-3 border border-input rounded-[10px] focus:outline-none focus:border-brand-primary text-foreground"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 border border-input text-foreground/80 rounded-xl hover:bg-secondary font-semibold text-sm transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-foreground rounded-xl font-bold text-sm transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Đang gửi..." : "Gửi bàn giao"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Contract Confirmation Modal */}
      {showCancelModal && (() => {
        const contractAmount = project?.escrowAmount || project?.budget || 0;
        const progressRate = overallProgress / 100;
        const progressPayout = Math.round(contractAmount * progressRate * 100) / 100;
        const compensationFee = Math.round(contractAmount * 0.10 * 100) / 100;
        const platformServiceFee = Math.round(contractAmount * 0.05 * 100) / 100;
        const rawClientRefund = (contractAmount - progressPayout) + compensationFee;
        const clientRefund = Math.round(Math.min(contractAmount - platformServiceFee, rawClientRefund) * 100) / 100;
        const expertPayout = Math.round((contractAmount - clientRefund - platformServiceFee) * 100) / 100;
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all animate-fade-in">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100 animate-zoom-in text-left">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 bg-secondary/60 border-b border-border">
              <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground font-sans">Cancel Contract (Expert)</h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-sans">This action will end the project and distribute the escrow with penalties applied to you</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-sm font-sans">
              <div className="space-y-2 p-4 bg-muted/30 border border-border rounded-xl">
                <div className="flex justify-between"><span className="text-muted-foreground">Contract Value:</span><span className="font-semibold text-foreground"><MoneyDisplay amount={contractAmount} /></span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Current Progress:</span><span className="font-semibold text-foreground">{overallProgress}%</span></div>
                <div className="border-t border-border my-2" />
                <div className="flex justify-between"><span className="text-muted-foreground">Your Progress Pay:</span><span className="font-semibold text-foreground"><MoneyDisplay amount={progressPayout} /></span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Client Compensation (10%):</span><span className="font-semibold text-red-600">-<MoneyDisplay amount={compensationFee} /></span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Platform Service Fee (5%):</span><span className="font-semibold text-red-600">-<MoneyDisplay amount={platformServiceFee} /></span></div>
                <div className="border-t border-border my-2" />
                <div className="flex justify-between text-base"><span className="font-bold text-foreground">Your Net Payout:</span><span className={`font-bold ${expertPayout >= 0 ? 'text-green-600' : 'text-red-600'}`}><MoneyDisplay amount={expertPayout} /></span></div>
                <div className="flex justify-between text-base"><span className="font-bold text-foreground">Client Total Refund:</span><span className="font-bold text-emerald-600"><MoneyDisplay amount={clientRefund} /></span></div>
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                As an expert, cancelling the contract requires you to compensate the client by 10% of the budget and cover the 5% platform service fee. This action is irreversible.
              </div>

              <div className="space-y-2">
                <label className="block text-foreground/80 font-semibold text-sm">
                  Lý do hủy hợp đồng <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Tại sao bạn muốn hủy hợp đồng này?"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full p-3 border border-input rounded-[10px] focus:outline-none focus:border-red-300 text-foreground text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-foreground/80 font-semibold text-sm">
                  Đính kèm tài liệu/bằng chứng (Tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: bang_chung.pdf, bao_cao_loi.docx"
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
                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                {cancelLoading ? "Processing..." : "Confirm Cancellation"}
              </button>
            </div>

            {/* Send Confirmation Dialog */}
            {showSendConfirmDialog && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-all animate-fade-in">
                <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm overflow-hidden p-6 text-left">
                  <h4 className="text-base font-bold text-foreground">Xác nhận gửi yêu cầu</h4>
                  <p className="text-sm text-muted-foreground mt-2 font-medium">Bạn có chắc chắn muốn gửi yêu cầu hủy hợp đồng này lên Admin xét duyệt?</p>
                  <div className="flex justify-end gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => setShowSendConfirmDialog(false)}
                      className="px-4 py-1.5 border border-input text-foreground/80 rounded-lg text-xs font-semibold hover:bg-secondary transition-all cursor-pointer"
                    >
                      Hủy (Từ chối)
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmCancellationSend}
                      className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                    >
                      Đồng ý (Accept)
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
            <DialogTitle className="text-xl font-bold text-red-950">
              Gửi phản hồi báo cáo vi phạm
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 bg-secondary/60 border border-border rounded-xl space-y-2 text-sm text-left mb-4">
            {report?.reporterRole === "client" ? (
              <>
                <p className="font-semibold text-foreground">Nội dung tố cáo từ Khách hàng:</p>
                <p className="text-foreground/85"><strong>Lý do:</strong> {report?.reason || report?.reportName}</p>
                <p className="text-foreground/85"><strong>Chi tiết:</strong> {report?.description}</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-foreground">Nội dung phản hồi giải trình từ Khách hàng:</p>
                {report?.clientExplanation ? (
                  <>
                    <p className="text-foreground/85"><strong>Lý do:</strong> {report?.clientExplanationReason || "—"}</p>
                    <p className="text-foreground/85"><strong>Chi tiết:</strong> {report?.clientExplanation}</p>
                  </>
                ) : (
                  <p className="text-muted-foreground italic">Khách hàng chưa nộp phản hồi giải trình.</p>
                )}
              </>
            )}
          </div>
          <ReportForm
            project={project}
            onSubmit={async (formData) => {
              await handleExpertSubmitExplanation(formData);
              setShowExplanationModal(false);
            }}
            onCancel={() => setShowExplanationModal(false)}
            isResponse={true}
            role="expert"
            submitLabel="Gửi phản hồi"
            initialDisputeType={report?.disputeType}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expert Delivery Stepper
// ---------------------------------------------------------------------------

function ExpertDeliveryStepper({ project, overallProgress }) {
  const finalStatus = project?.finalDeliveryStatus || "";
  const isCompleted = project?.status === "completed";

  const steps = [
    { label: "Tasks Done", done: overallProgress === 100, active: overallProgress < 100 },
    { label: "Submit Final Work", done: ["Final Product Submitted", "Accepted", "Declined"].includes(finalStatus) || isCompleted, active: overallProgress === 100 && !["Final Product Submitted", "Accepted", "Declined", "Accepted"].includes(finalStatus) },
    { label: "Client Accepts", done: finalStatus === "Accepted" || isCompleted, active: finalStatus === "Final Product Submitted" },
    { label: "Payment Released", done: isCompleted, active: finalStatus === "Accepted" && !isCompleted },
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
                  step.done ? "bg-success text-white" : step.active ? "bg-brand-primary text-brand-primary-foreground ring-2 ring-brand-primary/30" : "bg-muted text-muted-foreground"
                }`}
              >
                {step.done ? "✓" : i + 1}
              </div>
              <span className={`text-[10px] mt-1.5 font-medium max-w-[64px] text-center leading-tight ${step.done ? "text-success" : step.active ? "text-brand-primary font-semibold" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && <div className={`w-8 sm:w-12 h-0.5 mx-1 mt-[-12px] transition-colors ${step.done ? "bg-success" : "bg-muted"}`} />}
          </div>
        ))}
      </div>
    </div>
  );
}


