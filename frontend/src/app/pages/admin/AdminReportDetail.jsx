// =============================================================================
// AdminReportDetail — Full dispute report detail & handling page.
//
// Admin actions:
//   1. View report details (project, client, expert, evidence, etc.)
//   2. Accept Report -> project -> Disputed, lock actions
//   3. Reject Report -> reason required, notification to Expert
//   4. Create confrontation group chat (Admin + Client + Expert)
//   5. Continue Project (unlock, resume)
//   6. Stop Project + handle escrow money (refund/release)
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  MessageCircle,
  Play,
  StopCircle,
  User,
  FileText,
  AlertTriangle,
  Loader2,
  Eye,
  Download,
  Shield,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import { ConfirmationModal } from "../../components/shared/ConfirmationModal.jsx";
import { StatusBadge } from "../../components/shared/StatusBadge.jsx";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { BackButton } from "../../components/shared/BackButton.jsx";
import { formatDateTime } from "../../lib/dateUtils.js";
import { safeArray, safeDateFormat } from "../../lib/safety.js";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import { SectionCard } from "../../components/shared/SectionCard.jsx";
import api from "../../../services/api.js";
import {
  getReportDetail,
  acceptReport,
  rejectReport,
} from "../../../services/reportService.js";
import {
  pauseProjectAsDisputed,
  continueProject,
  stopProject,
  createDisputeChat,
} from "../../../services/disputeService.js";
import {
  refundProjectMoneyToClient,
  releaseProjectMoneyToExpert,
} from "../../../services/escrowService.js";

// ---------------------------------------------------------------------------
// Status configs
// ---------------------------------------------------------------------------

const REPORT_STATUS_CONFIG = {
  "Pending Admin": { color: "bg-yellow-100 text-yellow-700 border border-yellow-200", label: "Pending Admin" },
  "Awaiting Expert": { color: "bg-amber-100 text-amber-700 border border-amber-200", label: "Awaiting Expert" },
  "Awaiting Client": { color: "bg-secondary text-secondary-foreground border border-border", label: "Awaiting Client" },
  Resolved: { color: "bg-green-100 text-green-700 border border-green-200", label: "Resolved" },
  Rejected: { color: "bg-red-100 text-red-700 border border-red-200", label: "Rejected" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Tab state for Client/Expert panels — reporter is default
  const [activePartyTab, setActivePartyTab] = useState("reporter"); // "reporter" | "responder"

  // Modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showContinueModal, setShowContinueModal] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [stopReason, setStopReason] = useState("");
  const [moneyAction, setMoneyAction] = useState("refund"); // "refund" | "release"
  const [rejectReasonError, setRejectReasonError] = useState("");
  const [stopReasonError, setStopReasonError] = useState("");

  // Fetch report detail
  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getReportDetail(id);
      setReport(data);
    } catch (err) {
      setError(err.message || "Unable to load report details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const showToast = useCallback((message) => {
    setFeedback(message);
    setTimeout(() => setFeedback(null), 5000);
  }, []);

  const [timeLeft, setTimeLeft] = useState("");
  const [isDeadlineExpired, setIsDeadlineExpired] = useState(false);

  // Evidence modal states
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [evidenceNote, setEvidenceNote] = useState("");
  const [evidenceNoteError, setEvidenceNoteError] = useState("");

  // Force modals states
  const [showForcePayoutModal, setShowForcePayoutModal] = useState(false);
  const [showForceRefundModal, setShowForceRefundModal] = useState(false);
  const [forceReason, setForceReason] = useState("");
  const [forceReasonError, setForceReasonError] = useState("");

  useEffect(() => {
    if (!report?.replyDeadline || (report.status !== "Awaiting Expert" && report.status !== "Awaiting Client")) {
      setTimeLeft("");
      setIsDeadlineExpired(false);
      return;
    }

    function calculateTime() {
      const now = Date.now();
      const deadline = new Date(report.replyDeadline).getTime();
      if (Number.isNaN(deadline)) {
        setTimeLeft("N/A");
        setIsDeadlineExpired(false);
        return;
      }
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeLeft("HẾT HẠN PHẢN HỒI (Deadline Expired)");
        setIsDeadlineExpired(true);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s remaining`);
        setIsDeadlineExpired(false);
      }
    }

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [report?.replyDeadline, report?.status]);

  const handleDefaultSettle = useCallback(async () => {
    setActionLoading(true);
    try {
      if (report.status === "Awaiting Expert") {
        await api.put(`/reports/${report.id}`, {
          action: "stop",
          moneyAction: "refund",
          reason: "Expert quá hạn phản hồi giải trình. Hệ thống tự động hoàn tiền cho Khách hàng."
        });
        showToast("Đã xử thắng mặc định cho Khách hàng: Hoàn trả toàn bộ số tiền ký quỹ.");
      } else if (report.status === "Awaiting Client") {
        await api.put(`/reports/${report.id}`, {
          action: "force_payout",
          reason: "Khách hàng quá hạn phản hồi giải trình. Hệ thống tự động giải ngân cho Chuyên gia."
        });
        showToast("Đã xử thắng mặc định cho Chuyên gia: Giải ngân toàn bộ số tiền ký quỹ.");
      }
      fetchReport();
    } catch (err) {
      showToast(err.message || "Lỗi khi xử lý mặc định.");
    } finally {
      setActionLoading(false);
    }
  }, [report, fetchReport, showToast]);

  const handleRequestMoreEvidence = useCallback(async () => {
    if (!evidenceNote.trim()) {
      setEvidenceNoteError("Vui lòng nhập lý do/nội dung yêu cầu bằng chứng.");
      return;
    }
    setActionLoading(true);
    try {
      await api.put(`/reports/${report.id}`, {
        action: "requestMoreEvidence",
        adminNote: evidenceNote
      });
      showToast("Đã gửi yêu cầu bổ sung bằng chứng và gia hạn thêm 48 giờ phản hồi.");
      setEvidenceNote("");
      setEvidenceNoteError("");
      setShowEvidenceModal(false);
      fetchReport();
    } catch (err) {
      showToast(err.message || "Lỗi khi yêu cầu bằng chứng.");
    } finally {
      setActionLoading(false);
    }
  }, [report, evidenceNote, fetchReport, showToast]);

  const handleForcePayout = useCallback(async () => {
    if (!forceReason.trim()) {
      setForceReasonError("Please enter the reason for force payout.");
      return;
    }
    setActionLoading(true);
    try {
      await api.put(`/reports/${report.id}`, {
        action: "force_payout",
        reason: forceReason
      });
      showToast("Đã cưỡng chế giải ngân cho Chuyên gia thành công.");
      setForceReason("");
      setForceReasonError("");
      setShowForcePayoutModal(false);
      fetchReport();
    } catch (err) {
      showToast(err.message || "Lỗi cưỡng chế giải ngân.");
    } finally {
      setActionLoading(false);
    }
  }, [report, forceReason, fetchReport, showToast]);

  const handleForceRefund = useCallback(async () => {
    if (!forceReason.trim()) {
      setForceReasonError("Please enter the reason for force refund.");
      return;
    }
    setActionLoading(true);
    try {
      await api.put(`/reports/${report.id}`, {
        action: "force_refund",
        reason: forceReason
      });
      showToast("Đã hoàn tiền cưỡng chế cho Khách hàng thành công.");
      setForceReason("");
      setForceReasonError("");
      setShowForceRefundModal(false);
      fetchReport();
    } catch (err) {
      showToast(err.message || "Lỗi hoàn tiền cưỡng chế.");
    } finally {
      setActionLoading(false);
    }
  }, [report, forceReason, fetchReport, showToast]);

  // -----------------------------------------------------------------------
  // Accept Report
  // -----------------------------------------------------------------------
  const handleAcceptReport = useCallback(async () => {
    setActionLoading(true);
    try {
      await acceptReport(id);
      // Pause project as disputed
      if (report?.projectId) {
        await pauseProjectAsDisputed(report.projectId, { reportId: id });
      }
      setReport((prev) => ({ ...prev, status: "Accepted" }));
      showToast("Report accepted. Project is now in Disputed status.");
    } catch (err) {
      showToast(err.message || "Error accepting report.");
    } finally {
      setActionLoading(false);
      setShowAcceptModal(false);
    }
  }, [id, report?.projectId, showToast]);

  // -----------------------------------------------------------------------
  // Reject Report
  // -----------------------------------------------------------------------
  const handleRejectReport = useCallback(async () => {
    if (!rejectReason.trim()) {
      setRejectReasonError("Please enter a rejection reason.");
      return;
    }
    setActionLoading(true);
    try {
      await rejectReport(id, { reason: rejectReason });
      setReport((prev) => ({ ...prev, status: "Rejected", rejectionReason: rejectReason }));
      showToast(
        `Report rejected. Notification sent to Expert with reason: "${rejectReason}"`,
      );
      setRejectReason("");
      setRejectReasonError("");
    } catch (err) {
      showToast(err.message || "Error rejecting report.");
    } finally {
      setActionLoading(false);
      setShowRejectModal(false);
    }
  }, [id, rejectReason, showToast]);

  // -----------------------------------------------------------------------
  // Create Dispute Chat
  // -----------------------------------------------------------------------
  const handleCreateChat = useCallback(async () => {
    setActionLoading(true);
    try {
      await createDisputeChat({
        reportId: id,
        projectId: report?.projectId,
        clientId: report?.clientId,
        expertId: report?.expertId,
        adminId: user?.id,
      });
      showToast("3-party dispute chat has been created.");
    } catch (err) {
      showToast(err.message || "Error creating chat group.");
    } finally {
      setActionLoading(false);
    }
  }, [id, report, user?.id, showToast]);

  // -----------------------------------------------------------------------
  // Continue Project
  // -----------------------------------------------------------------------
  const handleContinueProject = useCallback(async () => {
    setActionLoading(true);
    try {
      await continueProject(report?.projectId, { reportId: id });
      setReport((prev) => ({ ...prev, status: "Resolved", resolution: "continued" }));
      showToast("Project has been resumed. Client and Expert can continue working.");
    } catch (err) {
      showToast(err.message || "Error continuing project.");
    } finally {
      setActionLoading(false);
      setShowContinueModal(false);
    }
  }, [report?.projectId, id, showToast]);

  // -----------------------------------------------------------------------
  // Stop Project + Handle Money
  // -----------------------------------------------------------------------
  const handleStopProject = useCallback(async () => {
    if (!stopReason.trim()) {
      setStopReasonError("Please enter a final decision reason.");
      return;
    }
    setActionLoading(true);
    try {
      // 1. Stop the project
      await stopProject(report?.projectId, {
        reason: stopReason,
        moneyAction,
        reportId: id,
      });

      // 2. Handle escrow money
      if (moneyAction === "refund") {
        await refundProjectMoneyToClient({
          projectId: report?.projectId,
          amount: report?.amount || report?.escrowAmount || 0,
          clientId: report?.clientId,
          reportId: id,
          reason: stopReason,
        });
        showToast("Full project amount has been refunded to Client.");
      } else {
        await releaseProjectMoneyToExpert({
          projectId: report?.projectId,
          amount: report?.amount || report?.escrowAmount || 0,
          expertId: report?.expertId,
          reportId: id,
        });
        showToast("Full project amount has been released to Expert.");
      }

      setReport((prev) => ({
        ...prev,
        status: "Resolved",
        resolution: "stopped",
        moneyAction,
      }));
      setStopReason("");
      setStopReasonError("");
    } catch (err) {
      showToast(err.message || "Error stopping project.");
    } finally {
      setActionLoading(false);
      setShowStopModal(false);
    }
  }, [report, moneyAction, stopReason, id, showToast]);

  // -----------------------------------------------------------------------
  // Render: loading
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-64 bg-muted rounded-2xl" />
          <div className="h-48 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render: error / not found
  // -----------------------------------------------------------------------
  if (error || !report) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <BackButton fallback="/admin/disputes" className="mb-6">
          Back to Dispute List
        </BackButton>
        <div className="bg-card rounded-xl border border-border p-12 text-center shadow-sm">
          <AlertTriangle className="w-12 h-12 text-red-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">
            {error || "Report Not Found"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            This report may have been removed or does not exist.
          </p>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Derived state
  // -----------------------------------------------------------------------
  const isPending = report.status === "Pending";
  const isAccepted = report.status === "Accepted";
  const isResolved = report.status === "Resolved";
  const isRejected = report.status === "Rejected";
  const isType1 = report.reportType !== "type2";
  const isType2 = report.reportType === "type2";
  const canHandleMoney = report.status === "Pending Admin";

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BackButton fallback="/admin/disputes" className="mb-4">
        Back to Dispute List
      </BackButton>

      {/* Feedback toast */}
      {feedback && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {feedback}
        </div>
      )}

      <PageHeader
        title={report.reportName || report.projectTitle || `Report #${id}`}
        subtitle="Dispute Report Detail — review evidence, collect responses, and make an escrow-safe decision."
        badge={<StatusBadge status={report.status} config={REPORT_STATUS_CONFIG} />}
        illustration={
          <svg width="180" height="140" viewBox="0 0 180 140" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M90 15 L110 25 L110 45 L90 55 L70 45 L70 25 Z" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
            <circle cx="90" cy="35" r="12" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
            <line x1="90" y1="23" x2="90" y2="47" stroke="currentColor" strokeWidth="0.3" opacity="0.2" />
            <line x1="78" y1="35" x2="102" y2="35" stroke="currentColor" strokeWidth="0.3" opacity="0.2" />
            <rect x="55" y="70" width="70" height="50" rx="8" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
            <line x1="65" y1="80" x2="115" y2="80" stroke="currentColor" strokeWidth="0.3" opacity="0.2" />
            <line x1="65" y1="88" x2="105" y2="88" stroke="currentColor" strokeWidth="0.3" opacity="0.15" />
            <line x1="65" y1="96" x2="110" y2="96" stroke="currentColor" strokeWidth="0.3" opacity="0.15" />
          </svg>
        }
      />

      {/* Deadline warning banner */}
      {(report.status === "Awaiting Expert" || report.status === "Awaiting Client") && (
        <div className="mb-6 p-4 bg-red-50/70 border border-red-200 text-red-900 rounded-xl flex items-center justify-between shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg text-red-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold font-sans">ĐANG TRONG THỜI GIAN GIẢI TRÌNH TRANH CHẤP</p>
              <p className="text-xs text-red-755 font-sans mt-0.5">
                Bên bị cáo có tối đa 48 giờ để gửi báo cáo giải trình. Trạng thái: <strong>{report.status}</strong>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-mono font-bold">
              {timeLeft}
            </div>
            {isDeadlineExpired && (
              <button
                type="button"
                onClick={handleDefaultSettle}
                disabled={actionLoading}
                className="h-10 px-4 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-lg shadow transition-all cursor-pointer flex items-center gap-1"
              >
                Default Settle (Xử thua mặc định)
              </button>
            )}
          </div>
        </div>
      )}

      {/* ---- Rejection notification preview ---- */}
      {isRejected && report.rejectionReason && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <h3 className="text-sm font-semibold text-red-800 mb-1">
            Rejection notification sent to Expert:
          </h3>
          <p className="text-sm text-red-700">
            Your report for project{" "}
            <strong>{report.projectTitle || report.projectId}</strong> has been
            rejected by Admin. Reason: {report.rejectionReason}
          </p>
          <p className="text-xs text-red-500 mt-1">
            Response time: {formatDateTime(new Date())}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ---- Left: Report details ---- */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project info */}
          <SectionCard title="Project Information" icon={FileText}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Project ID</p>
                <p className="text-sm text-foreground">{report.projectId}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Funds in Escrow</p>
                <p className="text-sm text-foreground"><span className="font-semibold text-brand-primary"><MoneyDisplay amount={report.amount || report.escrowAmount || 0} /></span></p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Project Status</p>
                <p className="text-sm text-foreground">{report.projectStatus || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Start Date</p>
                <p className="text-sm text-foreground">{report.projectStartDate ? formatDateTime(report.projectStartDate) : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Deadline</p>
                <p className="text-sm text-foreground">{report.projectDeadline ? formatDateTime(report.projectDeadline) : "—"}</p>
              </div>
            </div>
          </SectionCard>

          {/* Client & Expert info — Tab-based */}
          <SectionCard title="Parties Involved" icon={User}>
            {(() => {
              const isReporterClient = report.reporterRole === "client" || report.reportType === "type2";
              const reporterLabel = isReporterClient ? "Client (Reporter)" : "Expert (Reporter)";
              const responderLabel = isReporterClient ? "Expert (Responder)" : "Client (Responder)";
              const reporterName = isReporterClient
                ? (report.clientName || report.clientId || "—")
                : (report.expertName || report.expertId || "—");
              const responderName = isReporterClient
                ? (report.expertName || report.expertId || "—")
                : (report.clientName || report.clientId || "—");
              const reporterEmail = isReporterClient ? report.clientEmail : report.expertEmail;
              const responderEmail = isReporterClient ? report.expertEmail : report.clientEmail;
              // Reporter explanation
              const reporterExplanation = isReporterClient ? report.clientExplanation : report.expertExplanation;
              const reporterEvidence = isReporterClient ? report.clientExplanationEvidence : report.expertExplanationEvidence;
              // Responder explanation
              const responderExplanation = isReporterClient ? report.expertExplanation : report.clientExplanation;
              const responderEvidence = isReporterClient ? report.expertExplanationEvidence : report.clientExplanationEvidence;
              const hasResponderResponded = !!responderExplanation;

              return (
                <div className="space-y-4">
                  {/* Tab bar */}
                  <div className="flex border-b border-border">
                    <button
                      type="button"
                      onClick={() => setActivePartyTab("reporter")}
                      className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                        activePartyTab === "reporter"
                          ? "border-brand-primary text-brand-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {reporterLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePartyTab("responder")}
                      className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                        activePartyTab === "responder"
                          ? "border-brand-primary text-brand-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {responderLabel}
                      {!hasResponderResponded && (
                        <span className="ml-1.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold">
                          Pending
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Tab content */}
                  {activePartyTab === "reporter" ? (
                    <div className="p-4 bg-muted/40 rounded-xl border border-border">
                      <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                        Reporter
                      </p>
                      <p className="text-base font-semibold text-foreground">{reporterName}</p>
                      {reporterEmail && <p className="text-xs text-muted-foreground mb-3">{reporterEmail}</p>}
                      <div className="mt-3 pt-3 border-t border-border text-xs">
                        <strong className="block text-foreground/80 font-semibold mb-1">Report filed:</strong>
                        <p className="text-muted-foreground leading-relaxed">{report.reason || report.reportName || "—"}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-muted/40 rounded-xl border border-border">
                      <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                        Responder
                      </p>
                      <p className="text-base font-semibold text-foreground">{responderName}</p>
                      {responderEmail && <p className="text-xs text-muted-foreground mb-3">{responderEmail}</p>}
                      {hasResponderResponded ? (
                        <div className="mt-3 pt-3 border-t border-border text-xs">
                          <strong className="block text-foreground/80 font-semibold mb-1">Giải trình phản hồi:</strong>
                          <p className="text-muted-foreground italic leading-relaxed">
                            {responderExplanation}
                          </p>
                          {safeArray(responderEvidence).length > 0 && (
                            <div className="mt-2 text-[11px] text-muted-foreground">
                              <strong>Tài liệu:</strong> {safeArray(responderEvidence).map(e => e.fileName || e.name).join(", ")}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-3 pt-3 border-t border-border text-xs">
                          <span className="text-muted-foreground italic">
                            {report.status === "Awaiting Expert" || report.status === "Awaiting Client"
                              ? "Responder has not responded yet. Waiting for explanation..."
                              : "Responder has not responded yet."}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </SectionCard>

          {/* Report content */}
          <SectionCard title="Report Content" icon={AlertTriangle}>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Report Reason
                </p>
                <p className="text-sm text-foreground">
                  {report.reason || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Detailed Description
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {report.description || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Desired Resolution
                </p>
                <p className="text-sm text-foreground">
                  {report.desiredResolution || "—"}
                </p>
              </div>
            </div>
          </SectionCard>

          {/* Evidence */}
          <SectionCard title="Evidence" icon={Eye}>
            {!report.evidence || report.evidence.length === 0 ? (
              <p className="text-sm text-muted-foreground">No evidence provided.</p>
            ) : (
              <div className="space-y-3">
                {safeArray(report.evidence).map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="flex items-start gap-3 p-3 border border-border rounded-lg"
                  >
                    <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {item.name || `Evidence ${idx + 1}`}
                      </p>
                      {item.note && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.note}
                        </p>
                      )}
                    </div>
                    {item.fileUrl && (
                      <a
                        href={item.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 p-1.5 text-brand-primary hover:text-brand-primary-hover transition"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* ---- Right: Actions sidebar ---- */}
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sticky top-4">
            <h3 className="text-sm font-semibold text-foreground/80 mb-4 animate-none">
              Admin Actions
            </h3>

            {/* ---- Pending: Accept / Reject ---- */}
            {isPending && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShowAcceptModal(true)}
                  disabled={actionLoading}
                  className="w-full h-11 px-5 bg-brand-primary text-brand-primary-foreground rounded-[14px] hover:bg-brand-primary-hover disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Accept Report
                </button>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(true)}
                  disabled={actionLoading}
                  className="w-full h-11 px-5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-[14px] disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  Reject Report
                </button>
              </div>
            )}

            {/* ---- Awaiting Expert / Client: Chat / Evidence ---- */}
            {(report.status === "Awaiting Expert" || report.status === "Awaiting Client") && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleCreateChat}
                  disabled={actionLoading}
                  className="w-full h-11 px-5 bg-muted text-foreground hover:bg-muted/80 border border-border rounded-[14px] disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MessageCircle className="w-4 h-4" />
                  )}
                  Create Dispute Chat
                </button>
                <button
                  type="button"
                  onClick={() => setShowEvidenceModal(true)}
                  disabled={actionLoading}
                  className="w-full h-11 px-5 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-[14px] disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Yêu cầu bằng chứng
                </button>
              </div>
            )}

            {/* ---- Pending Admin: Settle Options ---- */}
            {report.status === "Pending Admin" && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleCreateChat}
                  disabled={actionLoading}
                  className="w-full h-11 px-5 bg-muted text-foreground hover:bg-muted/80 border border-border rounded-[14px] disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MessageCircle className="w-4 h-4" />
                  )}
                  Create Dispute Chat
                </button>
                <button
                  type="button"
                  onClick={() => setShowEvidenceModal(true)}
                  disabled={actionLoading}
                  className="w-full h-11 px-5 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-[14px] disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Yêu cầu bằng chứng
                </button>

                <div className="border-t border-border/60 pt-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                    Settle Decision:
                  </p>
                  {isType2 ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowForcePayoutModal(true)}
                        disabled={actionLoading}
                        className="w-full h-11 px-5 bg-green-600 text-white rounded-[14px] hover:bg-green-700 disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer mb-2"
                      >
                        ✓ Force Payout
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowForceRefundModal(true)}
                        disabled={actionLoading}
                        className="w-full h-11 px-5 bg-red-600 text-white rounded-[14px] hover:bg-red-700 disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        ✗ Force Refund
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowContinueModal(true)}
                        disabled={actionLoading}
                        className="w-full h-11 px-5 bg-brand-primary text-brand-primary-foreground rounded-[14px] hover:bg-brand-primary-hover disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer mb-2"
                      >
                        <Play className="w-4 h-4" />
                        Continue Project
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowStopModal(true)}
                        disabled={actionLoading}
                        className="w-full h-11 px-5 bg-red-100 text-red-700 border border-red-200 rounded-[14px] disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <StopCircle className="w-4 h-4" />
                        Stop Project
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ---- Resolved / Closed / Rejected: no actions ---- */}
            {(isResolved || isRejected) && (
              <div className="p-4 bg-secondary/60 rounded-lg text-center font-sans border border-border">
                <p className="text-sm font-semibold text-foreground/80">
                  {isResolved
                    ? `Resolved — ${
                        report.resolution === "force_payout"
                          ? "Forced Payout to Expert"
                          : report.resolution === "force_refund"
                            ? "Forced Refund to Client"
                            : report.moneyAction === "refund"
                              ? "Refunded to Client"
                              : report.moneyAction === "release"
                                ? "Released to Expert"
                                : report.resolution === "continued"
                                  ? "Project continued"
                                  : "Handled"
                      }`
                    : isRejected
                      ? "Report rejected"
                      : "Report closed"}
                </p>
                {report.adminNote && (
                  <p className="text-xs text-muted-foreground mt-2 border-t border-border/60 pt-2 italic">
                    Ghi chú: {report.adminNote}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <ConfirmationModal
        open={showAcceptModal}
        onOpenChange={setShowAcceptModal}
        title="Accept Report"
        description="When you accept this report, the project will change to Disputed status and all Client/Expert actions will be locked. Are you sure?"
        confirmLabel="Accept"
        variant="default"
        loading={actionLoading}
        onConfirm={handleAcceptReport}
      />

      {/* Reject Report Modal */}
      <ConfirmationModal
        open={showRejectModal}
        onOpenChange={setShowRejectModal}
        title="Reject Report"
        description="Please enter the rejection reason. A notification will be sent to the Expert."
        confirmLabel="Reject"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleRejectReport}
      >
        <textarea
          value={rejectReason}
          onChange={(e) => {
            setRejectReason(e.target.value);
            if (rejectReasonError) setRejectReasonError("");
          }}
          placeholder="Enter the reason for rejecting this report..."
          rows={3}
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-red-500 resize-vertical ${
            rejectReasonError ? "border-red-300" : "border-input"
          }`}
          disabled={actionLoading}
        />
        {rejectReasonError && (
          <p className="text-xs text-red-500 mt-1">{rejectReasonError}</p>
        )}
      </ConfirmationModal>

      {/* Continue Project Modal */}
      <ConfirmationModal
        open={showContinueModal}
        onOpenChange={setShowContinueModal}
        title="Continue Project"
        description="The project will be unlocked and Client/Expert can continue working. The report will be marked as resolved."
        confirmLabel="Continue Project"
        variant="default"
        loading={actionLoading}
        onConfirm={handleContinueProject}
      />

      {/* Stop Project Modal */}
      <ConfirmationModal
        open={showStopModal}
        onOpenChange={setShowStopModal}
        title="Stop Project & Handle Funds"
        description="Please enter the final decision reason and choose how to handle the full project funds held in escrow."
        confirmLabel={
          moneyAction === "refund"
            ? "Refund to Client"
            : "Release to Expert"
        }
        variant="danger"
        loading={actionLoading}
        onConfirm={handleStopProject}
      >
        <div className="space-y-4">
          {/* Stop reason */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Final Decision Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={stopReason}
              onChange={(e) => {
                setStopReason(e.target.value);
                if (stopReasonError) setStopReasonError("");
              }}
              placeholder="Enter reason for stopping the project..."
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-red-500 resize-vertical ${
                stopReasonError ? "border-red-300" : "border-input"
              }`}
              disabled={actionLoading}
            />
            {stopReasonError && (
              <p className="text-xs text-red-500 mt-1">{stopReasonError}</p>
            )}
          </div>

          {/* Money handling */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Handle Escrow Funds:
            </label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-secondary/60 transition">
                <input
                  type="radio"
                  name="moneyAction"
                  value="refund"
                  checked={moneyAction === "refund"}
                  onChange={() => setMoneyAction("refund")}
                  className="mt-0.5"
                  disabled={actionLoading}
                />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Refund to Client
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Refund the full{" "}
                    <MoneyDisplay
                      amount={report?.amount || report?.escrowAmount || 0}
                    />{" "}
                    back to the Client's wallet.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-secondary/60 transition">
                <input
                  type="radio"
                  name="moneyAction"
                  value="release"
                  checked={moneyAction === "release"}
                  onChange={() => setMoneyAction("release")}
                  className="mt-0.5"
                  disabled={actionLoading}
                />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Release to Expert
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Transfer the full{" "}
                    <MoneyDisplay
                      amount={report?.amount || report?.escrowAmount || 0}
                    />{" "}
                    to the Expert's wallet.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </ConfirmationModal>

      {/* Request More Evidence Modal */}
      <ConfirmationModal
        open={showEvidenceModal}
        onOpenChange={setShowEvidenceModal}
        title="Yêu cầu bổ sung bằng chứng"
        description="Gửi thông báo yêu cầu cung cấp thêm bằng chứng. Thời gian phản hồi sẽ được gia hạn thêm 48 giờ kể từ lúc gửi."
        confirmLabel="Gửi yêu cầu"
        variant="default"
        loading={actionLoading}
        onConfirm={handleRequestMoreEvidence}
      >
        <textarea
          value={evidenceNote}
          onChange={(e) => {
            setEvidenceNote(e.target.value);
            if (evidenceNoteError) setEvidenceNoteError("");
          }}
          placeholder="Nhập nội dung/lý do chi tiết yêu cầu bổ sung bằng chứng..."
          rows={3}
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-brand-primary resize-vertical ${
            evidenceNoteError ? "border-red-300" : "border-input"
          }`}
          disabled={actionLoading}
        />
        {evidenceNoteError && (
          <p className="text-xs text-red-500 mt-1">{evidenceNoteError}</p>
        )}
      </ConfirmationModal>

      {/* Force Payout Modal */}
      <ConfirmationModal
        open={showForcePayoutModal}
        onOpenChange={setShowForcePayoutModal}
        title="Cưỡng chế giải ngân (Force Payout)"
        description="Quyết định cưỡng chế chuyển toàn bộ số tiền ký quỹ trong Escrow cho Chuyên gia. Dự án sẽ chuyển thành trạng thái Hoàn thành."
        confirmLabel="✓ Xác nhận Force Payout"
        variant="default"
        loading={actionLoading}
        onConfirm={handleForcePayout}
      >
        <textarea
          value={forceReason}
          onChange={(e) => {
            setForceReason(e.target.value);
            if (forceReasonError) setForceReasonError("");
          }}
          placeholder="Nhập lý do cưỡng chế giải ngân..."
          rows={3}
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-brand-primary resize-vertical ${
            forceReasonError ? "border-red-300" : "border-input"
          }`}
          disabled={actionLoading}
        />
        {forceReasonError && (
          <p className="text-xs text-red-500 mt-1">{forceReasonError}</p>
        )}
      </ConfirmationModal>

      {/* Force Refund Modal */}
      <ConfirmationModal
        open={showForceRefundModal}
        onOpenChange={setShowForceRefundModal}
        title="Cưỡng chế hoàn tiền (Force Refund)"
        description="Quyết định cưỡng chế hoàn trả toàn bộ số tiền ký quỹ trong Escrow cho Khách hàng. Dự án sẽ chuyển thành trạng thái Bị hủy."
        confirmLabel="✗ Xác nhận Force Refund"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleForceRefund}
      >
        <textarea
          value={forceReason}
          onChange={(e) => {
            setForceReason(e.target.value);
            if (forceReasonError) setForceReasonError("");
          }}
          placeholder="Nhập lý do cưỡng chế hoàn tiền..."
          rows={3}
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-red-500 resize-vertical ${
            forceReasonError ? "border-red-300" : "border-input"
          }`}
          disabled={actionLoading}
        />
        {forceReasonError && (
          <p className="text-xs text-red-500 mt-1">{forceReasonError}</p>
        )}
      </ConfirmationModal>
    </div>
  );
}

export default AdminReportDetail;
