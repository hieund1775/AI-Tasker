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
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import { ConfirmationModal } from "../../components/shared/ConfirmationModal.jsx";
import { StatusBadge } from "../../components/shared/StatusBadge.jsx";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { BackButton } from "../../components/shared/BackButton.jsx";
import { formatDateTime } from "../../lib/dateUtils.js";
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
  "Pending Admin": { color: "bg-yellow-100 text-yellow-750 border border-yellow-250", label: "Pending Admin" },
  "Awaiting Expert": { color: "bg-amber-100 text-amber-750 border border-amber-250", label: "Awaiting Expert" },
  "Awaiting Client": { color: "bg-blue-100 text-blue-750 border border-blue-250", label: "Awaiting Client" },
  "Awaiting Evidence": { color: "bg-purple-100 text-purple-750 border border-purple-250", label: "Awaiting Evidence" },
  Resolved: { color: "bg-green-100 text-green-750 border border-green-250", label: "Resolved" },
  Rejected: { color: "bg-red-100 text-red-750 border border-red-250", label: "Rejected" },
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

  const [activeTab, setActiveTab] = useState("client");

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    if (report?.reporterRole) {
      setActiveTab(report.reporterRole.toLowerCase());
    }
  }, [report]);

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
    if (!report?.replyDeadline || (report.status !== "Awaiting Expert" && report.status !== "Awaiting Client" && report.status !== "Awaiting Evidence")) {
      setTimeLeft("");
      setIsDeadlineExpired(false);
      return;
    }

    function calculateTime() {
      const now = new Date().getTime();
      const deadline = new Date(report.replyDeadline).getTime();
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
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
          <div className="h-48 bg-gray-200 rounded-2xl" />
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
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <AlertTriangle className="w-12 h-12 text-red-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-500">
            {error || "Report Not Found"}
          </h3>
          <p className="text-sm text-gray-400 mt-1">
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

      {/* ---- Header ---- */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {report.reportName || report.projectTitle || `Report #${id}`}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={report.status} config={REPORT_STATUS_CONFIG} />
            {report.disputeType && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {report.disputeType}
              </span>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-500">
          Submitted: {formatDateTime(report.submittedAt || report.createdAt)}
        </p>
      </div>

      {/* Deadline warning banner */}
      {(report.status === "Awaiting Expert" || report.status === "Awaiting Client") && (
        <div className="mb-6 p-4 bg-red-55/70 border border-red-200 text-red-900 rounded-xl flex items-center justify-between shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-105 rounded-lg text-red-650">
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

      {/* Awaiting Evidence purple countdown banner */}
      {report.status === "Awaiting Evidence" && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 text-purple-900 rounded-xl flex items-center justify-between shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold font-sans">ĐANG TRONG THỜI GIAN BỔ SUNG BẰNG CHỨNG (48 GIỜ)</p>
              <p className="text-xs text-purple-700 font-sans mt-0.5">
                Cả hai bên cần nộp thêm bằng chứng. Trạng thái: <strong>{report.status}</strong>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-mono font-bold">
              {timeLeft}
            </div>
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
            <DetailGrid>
              <DetailItem label="Project ID" value={report.projectId} />
              <DetailItem
                label="Funds in Escrow"
                value={
                  <span className="font-semibold text-brand-primary">
                    <MoneyDisplay
                      amount={report.amount || report.escrowAmount || 0}
                    />
                  </span>
                }
              />
              <DetailItem
                label="Project Status"
                value={report.projectStatus || "—"}
              />
              <DetailItem
                label="Start Date"
                value={
                  report.projectStartDate
                    ? formatDateTime(report.projectStartDate)
                    : "—"
                }
              />
              <DetailItem
                label="Deadline"
                value={
                  report.projectDeadline
                    ? formatDateTime(report.projectDeadline)
                    : "—"
                }
              />
            </DetailGrid>
          </SectionCard>

          {/* Client & Expert info */}
          <SectionCard title="Parties Involved" icon={User}>
            <div className="flex border-b border-gray-200 mb-4 font-sans">
              {(() => {
                const reporter = report.reporterRole ? report.reporterRole.toLowerCase() : "expert";
                const tabsOrder = reporter === "client" ? ["client", "expert"] : ["expert", "client"];
                return tabsOrder.map((role) => {
                  const label = role === "client" ? "Client" : "Expert";
                  const isSelected = activeTab === role;
                  const isReporter = role === reporter;
                  
                  let activeClass = "";
                  if (role === "client") {
                    activeClass = isSelected 
                      ? "border-blue-600 text-blue-600 bg-blue-50/50" 
                      : "border-transparent text-gray-500 hover:text-blue-600 hover:bg-blue-50/20";
                  } else {
                    activeClass = isSelected 
                      ? "border-purple-600 text-purple-600 bg-purple-50/50" 
                      : "border-transparent text-gray-500 hover:text-purple-600 hover:bg-purple-50/20";
                  }
                  
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setActiveTab(role)}
                      className={`flex-1 py-3 text-center border-b-2 font-semibold text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeClass}`}
                    >
                      <span>{label}</span>
                      {isReporter && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-105 text-red-700 font-medium">
                          Reporter (Bên tố cáo)
                        </span>
                      )}
                    </button>
                  );
                });
              })()}
            </div>

            <div className="min-h-[200px] font-sans">
              {(() => {
                const reporter = report.reporterRole ? report.reporterRole.toLowerCase() : "expert";
                if (activeTab === "client") {
                  return (
                    <div className={`p-5 rounded-xl border transition-all relative ${
                      report.status === "Awaiting Client" ? "bg-gray-50/50 border-gray-200 select-none opacity-60" : "bg-blue-50/30 border-blue-100"
                    }`}>
                      {report.status === "Awaiting Client" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/20 z-10">
                          <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">
                            Chờ giải trình...
                          </span>
                        </div>
                      )}
                      <div className="space-y-4 text-left">
                        <div>
                          <p className="text-xs font-bold text-blue-750 uppercase tracking-wider mb-0.5">Client Name</p>
                          <p className="text-base font-semibold text-gray-900">{report.clientName || report.clientId || "—"}</p>
                          {report.clientEmail && <p className="text-xs text-gray-500">{report.clientEmail}</p>}
                        </div>

                        <div className="border-t border-blue-100/50 pt-3">
                          {reporter === "client" ? (
                            <div>
                              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Nội dung tố cáo vi phạm</p>
                              <div className="space-y-2">
                                <p className="text-sm text-gray-800"><strong className="text-gray-700">Lý do:</strong> {report.reason}</p>
                                <p className="text-sm text-gray-800"><strong className="text-gray-700">Chi tiết:</strong> {report.description}</p>
                                <p className="text-sm text-gray-800"><strong className="text-gray-700">Nguyện vọng:</strong> {report.desiredResolution}</p>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Báo cáo phản hồi giải trình</p>
                              {report.clientExplanation ? (
                                <div className="space-y-2">
                                  <p className="text-sm text-gray-850 italic leading-relaxed">&quot;{report.clientExplanation}&quot;</p>
                                  {report.clientExplanationEvidence && report.clientExplanationEvidence.length > 0 && (
                                    <div className="mt-2 text-xs text-gray-500">
                                      <strong>Tài liệu đính kèm:</strong> {report.clientExplanationEvidence.map(e => e.fileName || e.name).join(", ")}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="py-6 text-center text-gray-400">
                                  <p className="text-sm italic">Responder has not responded yet (Chưa có báo cáo phản hồi)</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                } else if (activeTab === "expert") {
                  return (
                    <div className={`p-5 rounded-xl border transition-all relative ${
                      report.status === "Awaiting Expert" ? "bg-gray-50/50 border-gray-200 select-none opacity-60" : "bg-purple-50/30 border-purple-100"
                    }`}>
                      {report.status === "Awaiting Expert" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/20 z-10">
                          <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">
                            Chờ giải trình...
                          </span>
                        </div>
                      )}
                      <div className="space-y-4 text-left">
                        <div>
                          <p className="text-xs font-bold text-purple-750 uppercase tracking-wider mb-0.5">Expert Name</p>
                          <p className="text-base font-semibold text-gray-900">{report.expertName || report.expertId || "—"}</p>
                          {report.expertEmail && <p className="text-xs text-gray-500">{report.expertEmail}</p>}
                        </div>

                        <div className="border-t border-purple-100/50 pt-3">
                          {reporter === "expert" ? (
                            <div>
                              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Nội dung tố cáo vi phạm</p>
                              <div className="space-y-2">
                                <p className="text-sm text-gray-800"><strong className="text-gray-700">Lý do:</strong> {report.reason}</p>
                                <p className="text-sm text-gray-800"><strong className="text-gray-700">Chi tiết:</strong> {report.description}</p>
                                <p className="text-sm text-gray-800"><strong className="text-gray-700">Nguyện vọng:</strong> {report.desiredResolution}</p>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Báo cáo phản hồi giải trình</p>
                              {report.expertExplanation ? (
                                <div className="space-y-2">
                                  <p className="text-sm text-gray-850 italic leading-relaxed">&quot;{report.expertExplanation}&quot;</p>
                                  {report.expertExplanationEvidence && report.expertExplanationEvidence.length > 0 && (
                                    <div className="mt-2 text-xs text-gray-500">
                                      <strong>Tài liệu đính kèm:</strong> {report.expertExplanationEvidence.map(e => e.fileName || e.name).join(", ")}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="py-6 text-center text-gray-400">
                                  <p className="text-sm italic">Responder has not responded yet (Chưa có báo cáo phản hồi)</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </SectionCard>
 
          {/* Report content */}
          <SectionCard title="Report Content" icon={AlertTriangle}>
            <div className="space-y-4 text-left font-sans">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Report Reason *
                </p>
                <p className="text-sm text-gray-900 font-medium">
                  {report.reason || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Dispute Type *
                </p>
                <span className="inline-block text-xs text-brand-primary bg-brand-primary-light px-2.5 py-1 rounded-full font-bold border border-brand-primary/10">
                  {report.disputeType === "financial" ? "Financial (Tài chính)" :
                   report.disputeType === "quality" ? "Quality (Chất lượng)" :
                   report.disputeType === "deadline" ? "Deadline (Tiến độ)" :
                   report.disputeType || "—"}
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Detailed Description *
                </p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {report.description || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Desired Resolution *
                </p>
                <p className="text-sm text-gray-800 font-medium">
                  {report.desiredResolution || "—"}
                </p>
              </div>
            </div>
          </SectionCard>
 
          {/* Evidence */}
          <SectionCard title="Evidence" icon={Eye}>
            {(() => {
              const allEvidence = [
                ...(report.evidence || []).map((e, idx) => ({
                  ...e,
                  id: e.id || `orig-${idx}`,
                  name: e.name || e.fileName || `Evidence ${idx + 1}`,
                  sender: "Original (Bằng chứng tố cáo)",
                })),
                ...(report.clientEvidenceList || []).map((e, idx) => ({
                  ...e,
                  id: `client-${idx}`,
                  name: e.fileName || `Client Evidence ${idx + 1}`,
                  sender: "Client (Tài liệu bổ sung)",
                })),
                ...(report.expertEvidenceList || []).map((e, idx) => ({
                  ...e,
                  id: `expert-${idx}`,
                  name: e.fileName || `Expert Evidence ${idx + 1}`,
                  sender: "Expert (Tài liệu bổ sung)",
                })),
              ];
              if (allEvidence.length === 0) {
                return <p className="text-sm text-gray-400 font-sans">No evidence provided.</p>;
              }
              return (
                <div className="space-y-3 font-sans">
                  {allEvidence.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl bg-gray-50/30 text-left hover:border-gray-300 transition-colors"
                    >
                      <FileText className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {item.name}
                          </p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold border border-gray-200">
                            {item.sender}
                          </span>
                        </div>
                        {item.note && (
                          <p className="text-xs text-gray-500 leading-relaxed">
                            {item.note}
                          </p>
                        )}
                        {item.submittedAt && (
                          <p className="text-[10px] text-gray-400 mt-1">
                            Nộp ngày: {formatDateTime(item.submittedAt)}
                          </p>
                        )}
                      </div>
                      {item.fileUrl && (
                        <a
                          href={item.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 p-2 text-brand-primary hover:text-brand-primary-hover bg-brand-primary-light hover:bg-brand-primary/10 rounded-lg transition"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </SectionCard>
        </div>

        {/* ---- Right: Actions sidebar ---- */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sticky top-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 animate-none">
              Admin Actions
            </h3>

            {/* ---- Pending: Accept / Reject ---- */}
            {isPending && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShowAcceptModal(true)}
                  disabled={actionLoading}
                  className="w-full h-11 px-5 bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer"
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
                  className="w-full h-11 px-5 bg-red-55 text-red-705 hover:bg-red-100 border border-red-200 rounded-[14px] disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer"
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
                  className="w-full h-11 px-5 bg-purple-65 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-[14px] disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer"
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
                  className="w-full h-11 px-5 bg-amber-50 text-amber-755 hover:bg-amber-100 border border-amber-250 rounded-[14px] disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Yêu cầu bằng chứng
                </button>
              </div>
            )}

            {/* ---- Pending Admin / Awaiting Evidence: Settle Options ---- */}
            {(report.status === "Pending Admin" || report.status === "Awaiting Evidence") && (() => {
              const isEvidenceAwaiting = report.status === "Awaiting Evidence" && !isDeadlineExpired;
              return (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleCreateChat}
                    disabled={actionLoading}
                    className="w-full h-11 px-5 bg-purple-65 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-[14px] disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer"
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
                    className="w-full h-11 px-5 bg-amber-50 text-amber-755 hover:bg-amber-100 border border-amber-250 rounded-[14px] disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Yêu cầu bằng chứng
                  </button>

                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider text-left">
                      Settle Decision:
                    </p>
                    {isType2 ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowForcePayoutModal(true)}
                          disabled={actionLoading || isEvidenceAwaiting}
                          className="w-full h-11 px-5 bg-green-600 text-white rounded-[14px] hover:bg-green-700 disabled:opacity-55 disabled:cursor-not-allowed text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer mb-2"
                        >
                          ✓ Force Payout
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowForceRefundModal(true)}
                          disabled={actionLoading || isEvidenceAwaiting}
                          className="w-full h-11 px-5 bg-red-600 text-white rounded-[14px] hover:bg-red-700 disabled:opacity-55 disabled:cursor-not-allowed text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer"
                        >
                          ✗ Force Refund
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowContinueModal(true)}
                          disabled={actionLoading || isEvidenceAwaiting}
                          className="w-full h-11 px-5 bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover disabled:opacity-55 disabled:cursor-not-allowed text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer mb-2"
                        >
                          <Play className="w-4 h-4" />
                          Continue Project
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowStopModal(true)}
                          disabled={actionLoading || isEvidenceAwaiting}
                          className="w-full h-11 px-5 bg-red-65 text-red-705 border border-red-200 rounded-[14px] disabled:opacity-55 disabled:cursor-not-allowed text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer"
                        >
                          <StopCircle className="w-4 h-4" />
                          Stop Project
                        </button>
                      </>
                    )}
                    {isEvidenceAwaiting ? (
                      <p className="text-[11px] text-red-600 font-bold bg-red-50 border border-red-150 p-2.5 rounded-xl mt-3 text-left leading-normal font-sans">
                        ⚠ Các nút phán quyết bị khóa cứng cho đến khi cả hai bên nộp xong bằng chứng bổ sung hoặc hết hạn 48 giờ.
                      </p>
                    ) : report.status === "Awaiting Evidence" && isDeadlineExpired && (
                      <p className="text-[11px] text-green-700 font-bold bg-green-50 border border-green-150 p-2.5 rounded-xl mt-3 text-left leading-normal font-sans">
                        ✓ Hạn nộp bằng chứng đã hết. Trưởng ban trọng tài đã có thể đưa ra phán quyết dựa trên các bằng chứng hiện có.
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ---- Resolved / Closed / Rejected: no actions ---- */}
            {(isResolved || isRejected) && (
              <div className="p-4 bg-gray-50 rounded-lg text-center font-sans border border-gray-150">
                <p className="text-sm font-semibold text-gray-700">
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
                  <p className="text-xs text-gray-500 mt-2 border-t border-gray-100 pt-2 italic">
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
            rejectReasonError ? "border-red-300" : "border-gray-300"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
                stopReasonError ? "border-red-300" : "border-gray-300"
              }`}
              disabled={actionLoading}
            />
            {stopReasonError && (
              <p className="text-xs text-red-500 mt-1">{stopReasonError}</p>
            )}
          </div>

          {/* Money handling */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Handle Escrow Funds:
            </label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition">
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
                  <p className="text-sm font-medium text-gray-800">
                    Refund to Client
                  </p>
                  <p className="text-xs text-gray-500">
                    Refund the full{" "}
                    <MoneyDisplay
                      amount={report?.amount || report?.escrowAmount || 0}
                    />{" "}
                    back to the Client's wallet.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition">
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
                  <p className="text-sm font-medium text-gray-800">
                    Release to Expert
                  </p>
                  <p className="text-xs text-gray-500">
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
            evidenceNoteError ? "border-red-300" : "border-gray-300"
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
            forceReasonError ? "border-red-300" : "border-gray-300"
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
            forceReasonError ? "border-red-300" : "border-gray-300"
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

// ---------------------------------------------------------------------------
// Helper sub-components
// ---------------------------------------------------------------------------

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-gray-400" />}
        {title}
      </h3>
      {children}
    </div>
  );
}

function DetailGrid({ children }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800">{value}</p>
    </div>
  );
}

export default AdminReportDetail;
