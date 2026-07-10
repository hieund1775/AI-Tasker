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
  AlertCircle,
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
import {
  notifyDisputeFiled,
  notifyDisputeResolved,
  notifyMoreEvidenceRequested,
  notifyCancelRequestSubmitted,
} from "../../../services/notificationHelper.js";
import { getOverallProgress } from "../../lib/projectTimelineStore.js";

// ---------------------------------------------------------------------------
// Status configs
// ---------------------------------------------------------------------------

const REPORT_STATUS_CONFIG = {
  "Pending Admin": { color: "bg-yellow-100 text-yellow-750 border border-yellow-250", label: "Pending Admin" },
  Pending: { color: "bg-yellow-100 text-yellow-750 border border-yellow-250", label: "Pending Admin" },
  "Awaiting Expert": { color: "bg-amber-100 text-amber-750 border border-amber-250", label: "Awaiting Expert" },
  "Awaiting Client": { color: "bg-blue-100 text-blue-750 border border-blue-250", label: "Awaiting Client" },
  "Awaiting Evidence": { color: "bg-purple-100 text-purple-750 border border-purple-250", label: "Awaiting Evidence" },
  "Awaiting Both": { color: "bg-purple-100 text-purple-750 border border-purple-250", label: "Awaiting Both Sides" },
  "Awaiting Partner": { color: "bg-amber-100 text-amber-750 border border-amber-250", label: "Awaiting Partner" },
  Returned: { color: "bg-rose-100 text-rose-750 border border-rose-250", label: "Returned" },
  Resolved: { color: "bg-green-100 text-green-750 border border-green-250", label: "Resolved" },
  Accepted: { color: "bg-green-100 text-green-750 border border-green-250", label: "Resolved" },
  Rejected: { color: "bg-red-100 text-red-750 border border-red-250", label: "Rejected" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

// Helper to normalize file evidence from a potential string (filename or JSON array) or array of files into a stable array of objects.
function normalizeEvidence(evidence) {
  if (!evidence) return [];
  if (Array.isArray(evidence)) {
    return evidence.map(e => {
      if (typeof e === "string") {
        return { fileUrl: e, fileName: e.split("/").pop() || "Evidence File" };
      }
      return {
        fileUrl: e.fileUrl || e.url || (typeof e.file === "string" ? e.file : ""),
        fileName: e.fileName || e.name || "Evidence File"
      };
    }).filter(e => e.fileUrl);
  }
  if (typeof evidence === "string") {
    const trimmed = evidence.trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        return normalizeEvidence(parsed);
      } catch (e) { }
    }
    return [{ fileUrl: evidence, fileName: evidence.split("/").pop() || "Evidence File" }];
  }
  return [];
}

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

  const initialRound = (() => {
    const local = localStorage.getItem(`dispute_initial_round_${id}`);
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) { }
    }
    return null;
  })();

  const reportForPartiesInvolved = (initialRound && report) ? {
    ...report,
    clientExplanation: initialRound.client.explanation,
    clientExplanationEvidence: initialRound.client.evidence,
    clientExplanationDesiredResolution: initialRound.client.desiredResolution,
    expertExplanation: initialRound.expert.explanation,
    expertExplanationEvidence: initialRound.expert.evidence,
    expertExplanationDesiredResolution: initialRound.expert.desiredResolution,
    evidenceUrl: initialRound.client.evidence || initialRound.expert.evidence,
  } : report;

  // Fetch report detail
  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getReportDetail(id);
      if (data) {
        const localStatus = localStorage.getItem(`report_status_${id}`);
        if (localStatus) {
          data.status = localStatus;
        }
        if (data.historyLogs && !data.additionalRounds) {
          data.additionalRounds = data.historyLogs;
        } else if (data.historyLogsJson && !data.additionalRounds) {
          try {
            data.additionalRounds = JSON.parse(data.historyLogsJson);
          } catch (e) {
            console.warn("Failed to parse historyLogsJson:", e);
          }
        }
        if (data.reason && data.reason.includes("[ESCALATED BINDING DISPUTE]")) {
          data.escalated = true;
          data.attemptRound = 2;
          data.reason = data.reason.replace("[ESCALATED BINDING DISPUTE]", "").trim();
        }
        if (data.projectId || data.ProjectId) {
          const projId = data.projectId || data.ProjectId;
          data.projectId = projId; // normalize
          try {
            const projectData = await api.projects.getById(projId);
            if (projectData) {
              const tasks = projectData.tasks || projectData.Tasks || [];
              const calculatedProgress = getOverallProgress(tasks);
              if (!data.payoutBreakdown) {
                data.payoutBreakdown = {};
              }
              data.payoutBreakdown.progressPercent = calculatedProgress;
              data.payoutBreakdown.contractAmount = projectData.EscrowBalance || projectData.escrowBalance || projectData.Budget || projectData.budget || projectData.escrowAmount || projectData.EscrowAmount || 0;

              const pAmount = data.payoutBreakdown.contractAmount;
              data.amount = pAmount;
              data.escrowAmount = pAmount;
              data.projectTitle = projectData.Title || projectData.title || projectData.ProjectTitle || projectData.projectTitle || data.projectTitle;
              data.projectDeadline = data.projectDeadline || projectData.EndDate || projectData.endDate || projectData.Deadline || projectData.deadline;
              data.projectStartDate = data.projectStartDate || projectData.StartDate || projectData.startDate || projectData.CreatedAt || projectData.createdAt;

              // Enrich clientId/expertId from project
              const pClientId = projectData.ClientId || projectData.clientId;
              const pExpertId = projectData.AssignedExpertId || projectData.assignedExpertId || projectData.ExpertId || projectData.expertId;
              if (pClientId) data.clientId = data.clientId || data.ClientId || pClientId;
              if (pExpertId) data.expertId = data.expertId || data.ExpertId || pExpertId;

              // Robust reporterRole normalization: cross-reference reporterId with project's clientId/expertId
              const rawRole = (data.reporterRole || data.ReporterRole || "").toLowerCase();
              if (rawRole === "client" || rawRole === "expert") {
                data.reporterRole = rawRole;
              } else {
                // reporterRole is empty/missing — determine by comparing reporterId
                const repId = (data.reporterId || data.ReporterId || "").toString().toLowerCase();
                if (repId && pClientId && repId === pClientId.toString().toLowerCase()) {
                  data.reporterRole = "client";
                } else if (repId && pExpertId && repId === pExpertId.toString().toLowerCase()) {
                  data.reporterRole = "expert";
                } else {
                  data.reporterRole = rawRole || "client"; // fallback
                }
              }
            }
          } catch (projErr) {
            console.warn("Failed to fetch project for progress calculation:", projErr);
          }
        }
        // Normalize disputeType
        data.disputeType = data.disputeType || data.DisputeType || "";
        data.reportType = data.reportType || data.ReportType || "";
      }
      setReport(data);
    } catch (err) {
      setError(err.message || "Unable to load report details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const [activeTab, setActiveTab] = useState("client");
  const [activePartyTab, setActivePartyTab] = useState("reporter");

  useEffect(() => {
    fetchReport();
    const handleUpdate = () => {
      fetchReport();
    };
    window.addEventListener("aitasker_db_update", handleUpdate);
    return () => {
      window.removeEventListener("aitasker_db_update", handleUpdate);
    };
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
  const [evidenceTarget, setEvidenceTarget] = useState("both"); // "client" | "expert" | "both"

  // Request both additional states
  const [showRequestBothModal, setShowRequestBothModal] = useState(false);
  const [requestBothNote, setRequestBothNote] = useState("");
  const [requestBothNoteError, setRequestBothNoteError] = useState("");

  // Force modals states
  const [showForcePayoutModal, setShowForcePayoutModal] = useState(false);
  const [showForceRefundModal, setShowForceRefundModal] = useState(false);
  const [forceReason, setForceReason] = useState("");
  const [forceReasonError, setForceReasonError] = useState("");

  useEffect(() => {
    if (!report?.replyDeadline || (report.status !== "Awaiting Expert" && report.status !== "Awaiting Client" && report.status !== "Awaiting Evidence" && report.status !== "Awaiting Both")) {
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
    const staffId = user?.id || user?.Id || JSON.parse(sessionStorage.getItem("aitasker_user_info") || localStorage.getItem("aitasker_user_info") || "{}")?.id;
    try {
      if (report.status === "Awaiting Expert") {
        await stopProject(report?.projectId, {
          reason: "Expert quá hạn phản hồi giải trình. Hệ thống tự động hoàn tiền cho Khách hàng.",
          moneyAction: "refund",
          reportId: report.id,
          staffId,
        });
        showToast("Đã xử thắng mặc định cho Khách hàng: Hoàn trả toàn bộ số tiền ký quỹ.");
      } else if (report.status === "Awaiting Client") {
        await stopProject(report?.projectId, {
          reason: "Khách hàng quá hạn phản hồi giải trình. Hệ thống tự động giải ngân cho Chuyên gia.",
          moneyAction: "release",
          reportId: report.id,
          staffId,
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
      let actionName = "requestEvidenceBoth";
      let successMsg = "Đã gửi yêu cầu bổ sung thông tin giải trình tới cả 2 bên và gia hạn thêm 48 giờ phản hồi.";

      if (evidenceTarget === "client") {
        actionName = "requestEvidenceClient";
        successMsg = "Đã gửi yêu cầu bổ sung bằng chứng tới Client và gia hạn thêm 48 giờ phản hồi.";
      } else if (evidenceTarget === "expert") {
        actionName = "requestEvidenceExpert";
        successMsg = "Đã gửi yêu cầu bổ sung bằng chứng tới Expert và gia hạn thêm 48 giờ phản hồi.";
      } else {
        actionName = "requestEvidenceBoth";
        successMsg = "Đã gửi yêu cầu bổ sung thông tin giải trình tới cả 2 bên và gia hạn thêm 48 giờ phản hồi.";
      }

      const isCancellation = report.reportType === "cancellation" || report.disputeType === "cancellation";
      if (isCancellation) {
        await api.put(`/reports/${report.id}`, {
          action: actionName,
          adminNote: evidenceNote
        });
      } else {
        await api.put(`/reports/${report.id}/admin-request-more-evidence`, {
          target: evidenceTarget,
          adminNote: evidenceNote
        });
      }
      showToast(successMsg);

      // Notify targeted parties
      const projectTitle = report?.projectTitle || report?.projectName || "Dự án";
      if (evidenceTarget === "client" || evidenceTarget === "both" || !evidenceTarget) {
        notifyMoreEvidenceRequested({
          userId: report?.clientId,
          userRole: "client",
          projectTitle,
          adminNote: evidenceNote,
          projectId: report?.projectId,
        }).catch(() => { });
      }
      if (evidenceTarget === "expert" || evidenceTarget === "both" || !evidenceTarget) {
        notifyMoreEvidenceRequested({
          userId: report?.expertId,
          userRole: "expert",
          projectTitle,
          adminNote: evidenceNote,
          projectId: report?.projectId,
        }).catch(() => { });
      }

      setEvidenceNote("");
      setEvidenceNoteError("");
      setShowEvidenceModal(false);
      fetchReport();
    } catch (err) {
      showToast(err.message || "Lỗi khi yêu cầu bằng chứng.");
    } finally {
      setActionLoading(false);
    }
  }, [report, evidenceNote, evidenceTarget, fetchReport, showToast]);

  const handleRequestAdditionalBoth = useCallback(async () => {
    if (!requestBothNote.trim()) {
      setRequestBothNoteError("Vui lòng nhập lý do/nội dung yêu cầu giải trình bổ sung.");
      return;
    }
    setActionLoading(true);
    try {
      // BACKUP giải trình vào localStorage TRƯỚC KHI bị ghi đè ở Backend
      const currentClientExp = report?.clientExplanation || report?.clientExplanationDescription || "";
      const currentExpertExp = report?.expertExplanation || report?.expertExplanationDescription || "";

      const initialSaved = localStorage.getItem(`dispute_initial_round_${id}`);
      if (!initialSaved) {
        if (currentClientExp || currentExpertExp) {
          const initialRoundData = {
            client: {
              explanation: currentClientExp,
              evidence: report?.clientExplanationEvidence || report?.evidenceUrl || "",
              desiredResolution: report?.clientExplanationDesiredResolution || "",
              submittedAt: report?.updatedAt || report?.createdAt || new Date().toISOString(),
            },
            expert: {
              explanation: currentExpertExp,
              evidence: report?.expertExplanationEvidence || report?.evidenceUrl || "",
              desiredResolution: report?.expertExplanationDesiredResolution || "",
              submittedAt: report?.updatedAt || report?.createdAt || new Date().toISOString(),
            }
          };
          localStorage.setItem(`dispute_initial_round_${id}`, JSON.stringify(initialRoundData));
        }
      } else {
        // Đã có initial round (Vòng 1), vậy lần gửi tiếp theo này là đóng băng Vòng bổ sung trước đó (Vòng 2, 3...)
        const existingRounds = JSON.parse(localStorage.getItem(`dispute_rounds_history_${id}`) || "[]");
        const nextRoundNumber = existingRounds.length + 1;

        const newHistoryRound = {
          round: nextRoundNumber,
          adminNote: report?.adminNote || "Yêu cầu giải trình bổ sung",
          client: {
            explanation: currentClientExp,
            evidence: report?.clientExplanationEvidence || "",
            desiredResolution: report?.clientExplanationDesiredResolution || "",
            submittedAt: report?.updatedAt || new Date().toISOString(),
          },
          expert: {
            explanation: currentExpertExp,
            evidence: report?.expertExplanationEvidence || "",
            desiredResolution: report?.expertExplanationDesiredResolution || "",
            submittedAt: report?.updatedAt || new Date().toISOString(),
          }
        };
        existingRounds.push(newHistoryRound);
        localStorage.setItem(`dispute_rounds_history_${id}`, JSON.stringify(existingRounds));
      }

      const isCancellation = report.reportType === "cancellation" || report.disputeType === "cancellation";
      if (isCancellation) {
        await api.put(`/reports/${report.id}`, {
          action: "requestAdditionalBoth",
          adminNote: requestBothNote
        });
      } else {
        await api.put(`/reports/${report.id}/admin-request-more-evidence`, {
          target: "both",
          adminNote: requestBothNote
        });
      }
      showToast("Đã gửi yêu cầu bổ sung thông tin giải trình tới cả 2 bên và gia hạn thêm 48 giờ phản hồi.");
      setRequestBothNote("");
      setRequestBothNoteError("");
      setShowRequestBothModal(false);
      fetchReport();
    } catch (err) {
      showToast(err.message || "Lỗi khi gửi yêu cầu.");
    } finally {
      setActionLoading(false);
    }
  }, [report, requestBothNote, fetchReport, showToast, id]);

  const handleForcePayout = useCallback(async () => {
    if (!forceReason.trim()) {
      setForceReasonError("Please enter the reason for force payout.");
      return;
    }
    setActionLoading(true);
    const staffId = user?.id || user?.Id || JSON.parse(sessionStorage.getItem("aitasker_user_info") || localStorage.getItem("aitasker_user_info") || "{}")?.id;
    try {
      const disputeId = localStorage.getItem(`dispute_id_for_report_${id}`) || id;
      await stopProject(report?.projectId, {
        reason: forceReason,
        moneyAction: "release",
        reportId: disputeId,
        staffId,
      });

      try {
        await api.payments.releaseEscrow({ projectId: report?.projectId });
      } catch (e) {
        console.warn("Manual releaseEscrow by admin failed:", e);
      }

      // Override trạng thái và lưu local
      localStorage.setItem(`project_status_${report?.projectId}`, "completed");
      localStorage.setItem(`report_status_${id}`, "Resolved");

      showToast("Đã cưỡng chế giải ngân cho Chuyên gia thành công.");

      // Notify both parties dispute resolved
      const projectTitle = report?.projectTitle || report?.projectName || "Dự án";
      notifyDisputeResolved({ userId: report?.expertId, userRole: "expert", projectTitle, resolution: "Expert được giải ngân", projectId: report?.projectId }).catch(() => { });
      notifyDisputeResolved({ userId: report?.clientId, userRole: "client", projectTitle, resolution: "Expert được giải ngân", projectId: report?.projectId }).catch(() => { });

      setForceReason("");
      setForceReasonError("");
      setShowForcePayoutModal(false);
      fetchReport();
    } catch (err) {
      showToast(err.message || "Lỗi cưỡng chế giải ngân.");
    } finally {
      setActionLoading(false);
    }
  }, [report, forceReason, fetchReport, showToast, id, user]);

  const handleForceRefund = useCallback(async () => {
    if (!forceReason.trim()) {
      setForceReasonError("Please enter the reason for force refund.");
      return;
    }
    setActionLoading(true);
    const staffId = user?.id || user?.Id || JSON.parse(sessionStorage.getItem("aitasker_user_info") || localStorage.getItem("aitasker_user_info") || "{}")?.id;
    try {
      const disputeId = localStorage.getItem(`dispute_id_for_report_${id}`) || id;
      await stopProject(report?.projectId, {
        reason: forceReason,
        moneyAction: "refund",
        reportId: disputeId,
        staffId,
      });

      try {
        await refundProjectMoneyToClient({
          projectId: report?.projectId,
          amount: report?.amount || report?.escrowAmount || 0,
          clientId: report?.clientId,
          reportId: id,
          reason: forceReason,
        });
      } catch (e) {
        console.warn("Manual refundProjectMoneyToClient by admin failed:", e);
      }

      // Override trạng thái và lưu local
      localStorage.setItem(`project_status_${report?.projectId}`, "cancelled");
      localStorage.setItem(`report_status_${id}`, "Resolved");

      showToast("Đã hoàn tiền cưỡng chế cho Khách hàng thành công.");

      // Notify both parties dispute resolved
      const projectTitle = report?.projectTitle || report?.projectName || "Dự án";
      notifyDisputeResolved({ userId: report?.clientId, userRole: "client", projectTitle, resolution: "Client được hoàn tiền", projectId: report?.projectId }).catch(() => { });
      notifyDisputeResolved({ userId: report?.expertId, userRole: "expert", projectTitle, resolution: "Client được hoàn tiền", projectId: report?.projectId }).catch(() => { });

      setForceReason("");
      setForceReasonError("");
      setShowForceRefundModal(false);
      fetchReport();
    } catch (err) {
      showToast(err.message || "Lỗi hoàn tiền cưỡng chế.");
    } finally {
      setActionLoading(false);
    }
  }, [report, forceReason, fetchReport, showToast, id, user]);

  // -----------------------------------------------------------------------
  // Accept Report
  // -----------------------------------------------------------------------
  const handleAcceptReport = useCallback(async () => {
    setActionLoading(true);
    const staffId = user?.id || user?.Id || JSON.parse(sessionStorage.getItem("aitasker_user_info") || localStorage.getItem("aitasker_user_info") || "{}")?.id;
    try {
      await acceptReport(id, report);
      // Pause project as disputed
      if (report?.projectId) {
        const res = await pauseProjectAsDisputed(report.projectId, { reportId: id, staffId });
        const disputeId = res?.disputeId || res?.DisputeId || res?.data?.disputeId || res?.data?.DisputeId;
        if (disputeId) {
          localStorage.setItem(`dispute_id_for_report_${id}`, disputeId);
        }
        localStorage.setItem(`project_status_${report.projectId}`, "disputed");
      }
      setReport((prev) => ({ ...prev, status: "Accepted" }));
      showToast("Report accepted. Project is now in Disputed status.");

      // Notify accused party that a dispute has been filed against them
      const accusedUserId = report?.reporterRole?.toLowerCase() === "client"
        ? report?.expertId
        : report?.clientId;
      const accusedRole = report?.reporterRole?.toLowerCase() === "client" ? "expert" : "client";

      notifyDisputeFiled({
        accusedUserId,
        accusedRole,
        reporterName: report?.reporterName || report?.clientName || report?.expertName || "Bên khởi kiện",
        projectTitle: report?.projectTitle || report?.projectName || "Dự án",
        deadline: "48 giờ",
        projectId: report?.projectId,
        reportId: id,
      }).catch(() => { });
    } catch (err) {
      showToast(err.message || "Error accepting report.");
    } finally {
      setActionLoading(false);
      setShowAcceptModal(false);
    }
  }, [id, report, showToast]);

  const handleAdminApproveCancel = useCallback(async () => {
    setActionLoading(true);
    try {
      await api.put(`/reports/${id}/admin-approve-cancel`);
      showToast("Đã duyệt yêu cầu hủy hợp đồng và chuyển tiếp cho đối tác.");

      // Notify the partner that a cancel request was approved
      const partnerUserId = report?.reporterRole?.toLowerCase() === "client" ? report?.expertId : report?.clientId;
      notifyCancelRequestSubmitted({
        partnerUserId: partnerUserId,
        projectTitle: report?.projectTitle || report?.projectName || "Dự án",
        requesterName: report?.reporterName || "Đối tác",
        projectId: report?.projectId,
      }).catch(() => { });

      fetchReport();
    } catch (err) {
      showToast(err.message || "Lỗi khi duyệt yêu cầu.");
    } finally {
      setActionLoading(false);
    }
  }, [id, fetchReport, showToast]);

  const handleAdminRejectCancel = useCallback(async () => {
    if (!rejectReason.trim()) {
      setRejectReasonError("Vui lòng nhập lý do từ chối hủy hợp đồng.");
      return;
    }
    setActionLoading(true);
    try {
      await api.put(`/reports/${id}/admin-reject-cancel`, {
        adminNote: rejectReason,
      });
      showToast("Đã từ chối đơn hủy hợp đồng. Dự án hoạt động lại bình thường.");
      setRejectReason("");
      setRejectReasonError("");
      setShowRejectModal(false);
      fetchReport();
    } catch (err) {
      showToast(err.message || "Lỗi khi từ chối yêu cầu.");
    } finally {
      setActionLoading(false);
    }
  }, [id, rejectReason, fetchReport, showToast]);



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
      await rejectReport(id, { reason: rejectReason, reportType: report?.reportType, disputeType: report?.disputeType, reportName: report?.reportName });
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
  }, [id, rejectReason, report, showToast]);

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
      const isCancellation =
        String(report?.reportType || "").toLowerCase() === "cancellation" ||
        String(report?.disputeType || "").toLowerCase() === "cancellation";

      try {
        if (isCancellation) {
          // Đối với đơn hủy: Gọi từ chối đơn hủy ở Backend C#
          await api.put(`/reports/${id}/admin-reject-cancel`, {
            adminNote: "Admin khôi phục dự án",
            AdminNote: "Admin khôi phục dự án"
          });
        } else {
          // Đối với Dispute thường: Gọi API bác bỏ tố cáo để DB khôi phục dự án sang In Progress!
          await api.put(`/reports/${id}/admin-reject-report`, {
            reason: "Admin tiếp tục dự án",
            Reason: "Admin tiếp tục dự án"
          });
        }
      } catch (err) {
        console.warn("Backend continue execution failed, using frontend fallback...", err);
      }

      // Override trạng thái dự án ở Frontend
      localStorage.setItem(`project_status_${report?.projectId}`, "inprogress");
      // Lưu trạng thái Báo cáo là Resolved
      localStorage.setItem(`report_status_${id}`, "Resolved");

      setReport((prev) => ({ ...prev, status: "Resolved", resolution: "continued" }));
      showToast("Project has been resumed. Client and Expert can continue working.");

      // Notify both parties dispute resolved
      const projectTitle = report?.projectTitle || report?.projectName || "Dự án";
      notifyDisputeResolved({ userId: report?.clientId, userRole: "client", projectTitle, resolution: "Dự án được tiếp tục", projectId: report?.projectId }).catch(() => { });
      notifyDisputeResolved({ userId: report?.expertId, userRole: "expert", projectTitle, resolution: "Dự án được tiếp tục", projectId: report?.projectId }).catch(() => { });

      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
      fetchReport();
    } catch (err) {
      showToast(err.message || "Error continuing project.");
    } finally {
      setActionLoading(false);
      setShowContinueModal(false);
    }
  }, [report, id, fetchReport, showToast]);

  // -----------------------------------------------------------------------
  // Stop Project + Handle Money
  // -----------------------------------------------------------------------
  const handleStopProject = useCallback(async () => {
    if (!stopReason.trim()) {
      setStopReasonError("Please enter a final decision reason.");
      return;
    }
    setActionLoading(true);
    const staffId = user?.id || user?.Id || JSON.parse(sessionStorage.getItem("aitasker_user_info") || localStorage.getItem("aitasker_user_info") || "{}")?.id;
    try {
      const isCancellation = report?.reportType === "cancellation" || report?.disputeType === "cancellation";
      if (isCancellation) {
        // Đối với đơn hủy: Gọi duyệt đơn hủy để chuyển tiếp cho đối tác
        await api.put(`/reports/${id}/admin-approve-cancel`);
        showToast("Đã duyệt yêu cầu hủy hợp đồng và chuyển tiếp cho đối tác.");
      } else {
        // Đối với Dispute tài chính thường: phán quyết chia tiền cưỡng chế
        const disputeId = localStorage.getItem(`dispute_id_for_report_${id}`) || id;
        try {
          // 1. Stop the project
          await stopProject(report?.projectId, {
            reason: stopReason,
            moneyAction,
            reportId: disputeId,
            staffId,
          });
        } catch (e) {
          console.warn("Backend dispute verdict failed, using fallback payout/refund...", e);
        }

        // 2. Handle escrow money
        const projectTitle = report?.projectTitle || report?.projectName || "Dự án";
        const escrowTotal = report?.amount || report?.escrowAmount || 0;
        const payoutAmount = Math.round(escrowTotal * 0.95);
        const platformFee = escrowTotal - payoutAmount;

        if (moneyAction === "refund") {
          try {
            await api.payments.depositWallet(report?.clientId, payoutAmount);
          } catch (depositErr) {
            console.warn("depositWallet client refund failed:", depositErr);
          }
          try {
            await refundProjectMoneyToClient({
              projectId: report?.projectId,
              amount: escrowTotal,
              clientId: report?.clientId,
              reportId: id,
              reason: `${stopReason}`,
            });
          } catch (e) {
            console.warn("refundProjectMoneyToClient failed:", e);
          }
          try {
            await api.post("/interactions/transaction", {
              projectId: report?.projectId,
              amount: -platformFee,
              sourceWalletId: report?.clientId,
              reportId: id,
              type: "PlatformFee",
              transactionType: "PlatformFee",
              description: `phí hệ thống -5%`,
            });
          } catch (feeErr) { }
          showToast(`Full project amount (minus 5% system fee) has been refunded to Client.`);
          notifyDisputeResolved({ userId: report?.clientId, userRole: "client", projectTitle, resolution: "Client được hoàn tiền (-5% phí sàn)", projectId: report?.projectId }).catch(() => { });
          notifyDisputeResolved({ userId: report?.expertId, userRole: "expert", projectTitle, resolution: "Client được hoàn tiền (-5% phí sàn)", projectId: report?.projectId }).catch(() => { });
          localStorage.setItem(`project_status_${report?.projectId}`, "cancelled");
        } else {
          try {
            await api.payments.depositWallet(report?.expertId, payoutAmount);
          } catch (depositErr) {
            console.warn("depositWallet expert release failed:", depositErr);
          }
          try {
            await api.post("/interactions/transaction", {
              projectId: report?.projectId,
              amount: escrowTotal,
              expertId: report?.expertId,
              reportId: id,
              type: "release_payment",
              transactionType: "release_payment",
              description: `Dispute verdict: Release escrow to Expert for project ${report?.projectId}`,
            });
          } catch (e) {
            console.warn("releasePayment transaction log failed:", e);
          }
          try {
            await api.post("/interactions/transaction", {
              projectId: report?.projectId,
              amount: -platformFee,
              sourceWalletId: report?.expertId,
              reportId: id,
              type: "PlatformFee",
              transactionType: "PlatformFee",
              description: `phí hệ thống -5%`,
            });
          } catch (feeErr) { }
          showToast(`Full project amount (minus 5% system fee) has been released to Expert.`);
          notifyDisputeResolved({ userId: report?.expertId, userRole: "expert", projectTitle, resolution: "Expert được giải ngân (-5% phí sàn)", projectId: report?.projectId }).catch(() => { });
          notifyDisputeResolved({ userId: report?.clientId, userRole: "client", projectTitle, resolution: "Expert được giải ngân (-5% phí sàn)", projectId: report?.projectId }).catch(() => { });
          localStorage.setItem(`project_status_${report?.projectId}`, "cancelled");
        }
        localStorage.setItem(`report_status_${id}`, "Resolved");
      }

      setReport((prev) => ({
        ...prev,
        status: "Resolved",
        resolution: "stopped",
        moneyAction,
      }));
      setStopReason("");
      setStopReasonError("");
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
      fetchReport();
    } catch (err) {
      showToast(err.message || "Error stopping project.");
    } finally {
      setActionLoading(false);
      setShowStopModal(false);
    }
  }, [report, moneyAction, stopReason, id, user, fetchReport, showToast]);

  // -----------------------------------------------------------------------
  // Escalated Cancellation Binding Verdict Handler (Vòng 2+)
  // -----------------------------------------------------------------------
  const handleExecuteEscalatedVerdict = useCallback(async (verdictType) => {
    setActionLoading(true);
    try {
      const escrowTotal = report?.amount || report?.escrowAmount || 0;
      const progressPercent = report?.payoutBreakdown?.progressPercent ?? 30;
      const progressRate = progressPercent / 100;
      const projectTitle = report?.projectTitle || report?.projectName || "Dự án";

      if (verdictType === "reject_lock") {
        // Bác bỏ yêu cầu hủy và khóa
        try {
          await api.put(`/reports/${id}/admin-reject-cancel`, {
            adminNote: "Admin bác đơn hủy và khóa yêu cầu hủy trong tương lai.",
          });
        } catch (e) {
          console.warn("Backend admin-reject-cancel failed, using frontend fallback...", e);
        }
        localStorage.setItem(`project_status_${report?.projectId}`, "inprogress");
        localStorage.setItem(`cancel_locked_${report?.projectId}`, "true");
        localStorage.setItem(`report_status_${id}`, "Rejected");

        showToast("Đã bác bỏ đơn hủy hợp đồng và khóa chức năng hủy của dự án này.");
        notifyDisputeResolved({ userId: report?.clientId, userRole: "client", projectTitle, resolution: "Yêu cầu hủy bị bác bỏ. Hợp đồng tiếp tục.", projectId: report?.projectId }).catch(() => { });
        notifyDisputeResolved({ userId: report?.expertId, userRole: "expert", projectTitle, resolution: "Yêu cầu hủy bị bác bỏ. Hợp đồng tiếp tục.", projectId: report?.projectId }).catch(() => { });
      } else {
        // Hủy dự án và phân chia tiền
        const platformFee = Math.round(escrowTotal * 0.05);
        const penaltyFee = Math.round(escrowTotal * 0.10);
        const progressAmount = Math.round(escrowTotal * progressRate);

        let expertPayout = 0;
        let clientRefund = 0;

        if (verdictType === "client_fault") {
          // Lỗi Client: Client chịu phạt 10% -> đền Expert
          expertPayout = progressAmount + penaltyFee;
          clientRefund = escrowTotal - expertPayout - platformFee;
        } else if (verdictType === "expert_fault") {
          // Lỗi Expert: Expert chịu phạt 10% -> đền Client
          expertPayout = Math.max(0, progressAmount - penaltyFee - platformFee);
          clientRefund = escrowTotal - expertPayout - platformFee;
        } else if (verdictType === "split_fault") {
          // Chia đôi lỗi: Không có đền bù
          expertPayout = progressAmount;
          clientRefund = escrowTotal - expertPayout - platformFee;
        }

        // Thực hiện chuyển tiền ví
        try {
          if (expertPayout > 0) {
            try {
              await api.payments.depositWallet(report?.expertId, expertPayout);
            } catch (depositErr) {
              console.warn("depositWallet expert payout failed:", depositErr);
            }
            try {
              await releaseProjectMoneyToExpert({
                projectId: report?.projectId,
                amount: expertPayout,
                expertId: report?.expertId,
                reportId: id,
              });
            } catch (e) {
              console.warn("Release to expert failed inside escalated verdict, recording fallback transaction log...", e);
              try {
                await api.post("/interactions/transaction", {
                  projectId: report?.projectId,
                  amount: expertPayout,
                  expertId: report?.expertId,
                  reportId: id,
                  type: "release_payment",
                  transactionType: "release_payment",
                  description: `Escalated verdict fallback: Release to Expert for project ${report?.projectId}`,
                });
              } catch (err) { }
            }
          }
          if (clientRefund > 0) {
            try {
              await api.payments.depositWallet(report?.clientId, clientRefund);
            } catch (depositErr) {
              console.warn("depositWallet client refund failed:", depositErr);
            }
            try {
              await refundProjectMoneyToClient({
                projectId: report?.projectId,
                amount: clientRefund,
                clientId: report?.clientId,
                reportId: id,
                reason: `Escalated Cancel Settle: ${verdictType}`,
              });
            } catch (e) {
              console.warn("Refund to client failed inside escalated verdict:", e);
            }
          }
          if (platformFee > 0) {
            try {
              await api.post("/interactions/transaction", {
                projectId: report?.projectId,
                amount: -platformFee,
                reportId: id,
                type: "PlatformFee",
                transactionType: "PlatformFee",
                description: `phí hệ thống -5%`,
              });
            } catch (feeErr) { }
          }
        } catch (moneyErr) {
          console.warn("Escalated money distribution api failed, using fallback...", moneyErr);
        }

        // Lưu trạng thái
        localStorage.setItem(`project_status_${report?.projectId}`, "cancelled");
        localStorage.setItem(`report_status_${id}`, "Resolved");

        showToast(`Đã giải quyết tranh chấp hủy hợp đồng (${verdictType}). Tiền đã được phân chia.`);
        notifyDisputeResolved({ userId: report?.clientId, userRole: "client", projectTitle, resolution: `Hợp đồng đã hủy. Bạn được nhận lại ${clientRefund.toLocaleString()} VND.`, projectId: report?.projectId }).catch(() => { });
        notifyDisputeResolved({ userId: report?.expertId, userRole: "expert", projectTitle, resolution: `Hợp đồng đã hủy. Bạn nhận được ${expertPayout.toLocaleString()} VND.`, projectId: report?.projectId }).catch(() => { });
      }

      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
      fetchReport();
    } catch (err) {
      showToast(err.message || "Lỗi xử lý tranh chấp hủy hợp đồng.");
    } finally {
      setActionLoading(false);
    }
  }, [report, id, fetchReport, showToast]);

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
  const isPending = report.status === "Pending" || report.status === "Pending Admin";
  const isAccepted = report.status === "Accepted" && report.disputeType !== "cancellation";
  const isResolved = report.status === "Resolved" || report.status === "cancel_done" || (report.disputeType === "cancellation" && report.status === "Accepted");
  const isRejected = report.status === "Rejected";
  const isType1 = report.reportType !== "type2";
  const isType2 = report.reportType === "type2";
  const canHandleMoney = report.status === "Pending Admin" || report.status === "Pending";

  // Derived fields for Reporter and Responder
  const isReporterClient = (report.reporterRole || report.ReporterRole || "").toLowerCase() === "client" || report.reportType === "type2";
  const isReporterTab = activePartyTab === "reporter";

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

  // Reporter details
  const reporterExplanation = isReporterClient ? report.clientExplanation : report.expertExplanation;
  const reporterEvidence = isReporterClient ? report.clientExplanationEvidence : report.expertExplanationEvidence;

  // Responder details
  const responderReason = isReporterClient ? report.expertExplanationReason : report.clientExplanationReason;
  const responderDescription = isReporterClient ? report.expertExplanationDescription : report.clientExplanationDescription;
  const responderExplanation = isReporterClient ? report.expertExplanation : report.clientExplanation;
  const responderDesiredResolution = isReporterClient ? report.expertExplanationDesiredResolution : report.clientExplanationDesiredResolution;
  const responderEvidence = isReporterClient ? report.expertExplanationEvidence : report.clientExplanationEvidence;
  const hasResponderResponded = !!responderExplanation;



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
      {(report.status === "Awaiting Expert" || report.status === "Awaiting Client" || report.status === "Awaiting Both") && (
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

      <div className="space-y-6">
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
              label="Start Date"
              value={
                report.projectStartDate
                  ? formatDateTime(report.projectStartDate)
                  : "—"
              }
            />
            <DetailItem
              label="Deadline"
              value={(() => {
                if (!report.projectDeadline) return "—";
                const num = Number(report.projectDeadline);
                if (!Number.isNaN(num) && num < 1000) {
                  const d = new Date(report.projectStartDate || new Date());
                  d.setDate(d.getDate() + num);
                  return formatDateTime(d.toISOString());
                }
                return formatDateTime(report.projectDeadline);
              })()}
            />
          </DetailGrid>
        </SectionCard>

        {report.disputeType === "cancellation" ? (
          <SectionCard title="Chi tiết yêu cầu hủy hợp đồng" icon={FileText}>
            <div className="p-6 bg-card border border-border rounded-xl space-y-4 text-left text-sm font-sans">
              <div>
                <strong className="text-muted-foreground block text-xs uppercase tracking-wider">Người yêu cầu hủy:</strong>
                <span className="text-base font-semibold text-foreground">
                  {(report.reporterRole || report.ReporterRole || "").toLowerCase() === "client" ? `Khách hàng (Client): ${report.clientName}` : `Chuyên gia (Expert): ${report.expertName}`}
                </span>
              </div>
              <div>
                <strong className="text-muted-foreground block text-xs uppercase tracking-wider">Lý do yêu cầu hủy:</strong>
                <p className="mt-1 text-sm text-foreground bg-muted/40 p-4 border border-border rounded-xl font-medium">
                  &quot;{report.reason}&quot;
                </p>
              </div>
              {report.evidence && report.evidence.length > 0 && (
                <div>
                  <strong className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Tài liệu đính kèm:</strong>
                  <span className="text-brand-primary underline flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    {report.evidence[0].fileName}
                  </span>
                </div>
              )}

              <div className="border-t border-border pt-4">
                <strong className="text-muted-foreground block text-xs uppercase tracking-wider mb-2">Phương án chia tiền ký quỹ (Escrow Split):</strong>
                {(() => {
                  const escrowTotal = report.payoutBreakdown?.contractAmount ?? (report.amount || report.escrowAmount || 0);
                  const progress = report.payoutBreakdown?.progressPercent ?? 30;
                  const progressRate = progress / 100;

                  const platformFee = Math.round(escrowTotal * 0.05);
                  const penaltyFee = Math.round(escrowTotal * 0.10);
                  const progressAmount = Math.round(escrowTotal * progressRate);

                  const isEscalated = report.escalated === true || String(report.status).toLowerCase() === "escalated" || String(report.status).toLowerCase() === "disputed";
                  const isClientReporter = (report.reporterRole || report.ReporterRole || "").toLowerCase() === "client";

                  if (!isEscalated) {
                    let expertPayout = 0;
                    let clientRefund = 0;

                    if (isClientReporter) {
                      // Client hủy → Client là người sai → Client bị phạt
                      // Expert nhận: tiến độ + phí phạt
                      // Client nhận: tổng - phí sàn - expert nhận
                      expertPayout = report.payoutBreakdown?.expertPayout ?? (progressAmount + penaltyFee);
                      clientRefund = report.payoutBreakdown?.clientRefund ?? (escrowTotal - platformFee - expertPayout);
                    } else {
                      // Expert hủy → Expert là người sai → Expert bị phạt
                      // Expert nhận: tiến độ - phí phạt - phí sàn
                      // Client nhận: tổng - expert nhận - phí sàn
                      expertPayout = report.payoutBreakdown?.expertPayout ?? Math.max(0, progressAmount - penaltyFee - platformFee);
                      clientRefund = report.payoutBreakdown?.clientRefund ?? (escrowTotal - expertPayout - platformFee);
                    }

                    return (
                      <div className="space-y-1.5 p-4 bg-muted/30 border border-border rounded-xl text-xs max-w-md">
                        <div className="flex justify-between"><span className="text-muted-foreground">Giá trị hợp đồng:</span><span className="font-semibold text-foreground"><MoneyDisplay amount={escrowTotal} /></span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Tiến độ hiện tại:</span><span className="font-semibold text-foreground">{progress}%</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Người yêu cầu hủy:</span><span className="font-semibold text-blue-600">{isClientReporter ? "Khách hàng (Client)" : "Chuyên gia (Expert)"}</span></div>
                        <div className="border-t border-border my-1.5" />
                        <div className="flex justify-between"><span className="text-muted-foreground">Phí sàn (Hệ thống thu):</span><span className="font-semibold text-orange-500">5% → <MoneyDisplay amount={platformFee} /></span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Phí phạt hủy hợp đồng:</span><span className="font-semibold text-red-500">10% → <MoneyDisplay amount={penaltyFee} /></span></div>
                        <div className="border-t border-border my-1.5" />
                        {isClientReporter ? (
                          <>
                            <div className="flex justify-between font-semibold"><span className="text-foreground">Thanh toán Expert (tiến độ + phạt):</span><span className="text-amber-600"><MoneyDisplay amount={expertPayout} /></span></div>
                            <div className="flex justify-between font-semibold"><span className="text-foreground">Hoàn tiền Client:</span><span className="text-green-600"><MoneyDisplay amount={clientRefund} /></span></div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between font-semibold"><span className="text-foreground">Thanh toán Expert (tiến độ - phạt - sàn):</span><span className="text-amber-600"><MoneyDisplay amount={expertPayout} /></span></div>
                            <div className="flex justify-between font-semibold"><span className="text-foreground">Hoàn tiền Client:</span><span className="text-green-600"><MoneyDisplay amount={clientRefund} /></span></div>
                          </>
                        )}
                      </div>
                    );
                  }

                  // === ESCALATED SCENARIOS ===
                  // Scenario 1: Client Fault (Client là người sai)
                  // Expert nhận: tiến độ + phạt
                  // Client nhận: tổng - phí sàn - expert nhận
                  const expertPayoutClientFault = progressAmount + penaltyFee;
                  const clientRefundClientFault = escrowTotal - platformFee - expertPayoutClientFault;

                  // Scenario 2: Expert Fault (Expert là người sai)
                  // Expert nhận: tiến độ - phạt - phí sàn
                  // Client nhận: tổng - expert nhận - phí sàn
                  const expertPayoutExpertFault = Math.max(0, progressAmount - penaltyFee - platformFee);
                  const clientRefundExpertFault = escrowTotal - expertPayoutExpertFault - platformFee;

                  // Scenario 3: Split Fault (Chia đôi lỗi - không phạt ai)
                  // Expert nhận tiến độ, Client nhận phần còn lại (trừ phí sàn)
                  const expertPayoutSplitFault = progressAmount;
                  const clientRefundSplitFault = escrowTotal - platformFee - progressAmount;

                  return (
                    <div className="space-y-4 p-4 bg-muted/30 border border-border rounded-xl text-xs max-w-lg">
                      <div className="space-y-1.5">
                        <div className="flex justify-between"><span className="text-muted-foreground">Giá trị hợp đồng:</span><span className="font-semibold text-foreground"><MoneyDisplay amount={escrowTotal} /></span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Tiến độ hiện tại:</span><span className="font-semibold text-foreground">{progress}%</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Phí sàn (Khấu trừ đầu tiên 5%):</span><span className="font-semibold text-orange-600"><MoneyDisplay amount={platformFee} /></span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Phí phạt vi phạm (10%):</span><span className="font-semibold text-red-500"><MoneyDisplay amount={penaltyFee} /></span></div>
                      </div>

                      <div className="border-t border-border pt-3 space-y-3">
                        <div>
                          <p className="font-bold text-red-650 mb-1">TRƯỜNG HỢP 1: LỖI DO CLIENT (Client Fault)</p>
                          <div className="pl-2 border-l-2 border-red-200 space-y-1">
                            <div className="flex justify-between"><span className="text-muted-foreground">Thanh toán Expert (tiến độ + phạt):</span><span className="font-semibold text-amber-600"><MoneyDisplay amount={expertPayoutClientFault} /></span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Hoàn tiền Client:</span><span className="font-semibold text-green-600"><MoneyDisplay amount={clientRefundClientFault} /></span></div>
                          </div>
                        </div>

                        <div>
                          <p className="font-bold text-red-650 mb-1">TRƯỜNG HỢP 2: LỖI DO EXPERT (Expert Fault)</p>
                          <div className="pl-2 border-l-2 border-amber-200 space-y-1">
                            <div className="flex justify-between"><span className="text-muted-foreground">Thanh toán Expert (tiến độ - phạt - sàn):</span><span className="font-semibold text-amber-600"><MoneyDisplay amount={expertPayoutExpertFault} /></span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Hoàn tiền Client:</span><span className="font-semibold text-green-600"><MoneyDisplay amount={clientRefundExpertFault} /></span></div>
                          </div>
                        </div>

                        <div>
                          <p className="font-bold text-slate-700 mb-1">TRƯỜNG HỢP 3: CHIA ĐÔI LỖI (Split Fault)</p>
                          <div className="pl-2 border-l-2 border-slate-300 space-y-1">
                            <div className="flex justify-between"><span className="text-muted-foreground">Thanh toán Expert (tiến độ):</span><span className="font-semibold text-amber-600"><MoneyDisplay amount={expertPayoutSplitFault} /></span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Hoàn tiền Client:</span><span className="font-semibold text-green-600"><MoneyDisplay amount={clientRefundSplitFault} /></span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {report.partnerRejectionReason && (
                <div className="border-t border-border pt-4">
                  <strong className="text-red-650 block text-xs uppercase tracking-wider">Đối tác từ chối hủy hợp đồng với lý do:</strong>
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl mt-2 font-medium text-red-800">
                    &quot;{report.partnerRejectionReason}&quot;
                  </div>
                  <p className="text-xs text-muted-foreground italic mt-1">Hệ thống đã tự động trả đơn hủy về cho người yêu cầu tự quyết định (Chấp nhận hoặc Phản hồi).</p>
                </div>
              )}
            </div>
          </SectionCard>
        ) : (
          <>
            {/* 1. Lịch sử các vòng giải trình bổ sung cũ đã đóng băng (Vòng 1, Vòng 2...) */}
            {(() => {
              const historyRounds = JSON.parse(localStorage.getItem(`dispute_rounds_history_${id}`) || "[]");
              if (historyRounds.length === 0) return null;

              return historyRounds.map((roundData) => (
                <SectionCard
                  key={roundData.round}
                  title={`Bằng chứng & Giải trình (Vòng ${roundData.round})`}
                  icon={FileText}
                  className="border-amber-200 bg-amber-50/10 mb-6"
                >
                  <div className="p-6 bg-card border border-border rounded-xl space-y-6 text-left text-sm font-sans">
                    {roundData.adminNote && (
                      <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs leading-relaxed font-sans">
                        <strong>Nội dung yêu cầu của Admin:</strong> &quot;{roundData.adminNote}&quot;
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Client side */}
                      <div className="space-y-3 p-4 bg-blue-50/20 border border-blue-100 rounded-xl">
                        <h4 className="text-sm font-bold text-blue-800">Khách hàng (Client) - Giải trình cũ</h4>
                        <div>
                          <strong className="text-xs text-muted-foreground block uppercase tracking-wider">Giải trình bổ sung:</strong>
                          <p className="mt-1 text-sm text-foreground bg-white/70 p-3 border border-blue-50 rounded-lg whitespace-pre-wrap">{roundData.client.explanation || "—"}</p>
                        </div>
                        {roundData.client.evidence && (
                          <div className="flex items-center gap-2 mt-1">
                            <a href={roundData.client.evidence} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 underline text-sm break-all font-medium cursor-pointer">View Evidence Link</a>
                            <a href={roundData.client.evidence} download className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors" title="Download">
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        )}
                        <div>
                          <strong className="text-xs text-muted-foreground block uppercase tracking-wider">Đề xuất giải quyết:</strong>
                          <p className="mt-1 text-xs text-foreground font-semibold text-blue-700 bg-blue-50 p-2 rounded">{roundData.client.desiredResolution || "—"}</p>
                        </div>
                      </div>

                      {/* Expert side */}
                      <div className="space-y-3 p-4 bg-purple-50/20 border border-purple-100 rounded-xl">
                        <h4 className="text-sm font-bold text-purple-800">Chuyên gia (Expert) - Giải trình cũ</h4>
                        <div>
                          <strong className="text-xs text-muted-foreground block uppercase tracking-wider">Giải trình bổ sung:</strong>
                          <p className="mt-1 text-sm text-foreground bg-white/70 p-3 border border-purple-50 rounded-lg whitespace-pre-wrap">{roundData.expert.explanation || "—"}</p>
                        </div>
                        {roundData.expert.evidence && (
                          <div>
                            <strong className="text-xs text-muted-foreground block uppercase tracking-wider">Bằng chứng đính kèm:</strong>
                            <a href={roundData.expert.evidence} target="_blank" rel="noreferrer" className="text-purple-600 hover:text-purple-800 underline text-sm block mt-1 break-all font-medium cursor-pointer">View Evidence Link</a>
                          </div>
                        )}
                        <div>
                          <strong className="text-xs text-muted-foreground block uppercase tracking-wider">Đề xuất giải quyết:</strong>
                          <p className="mt-1 text-xs text-foreground font-semibold text-purple-700 bg-purple-50 p-2 rounded">{roundData.expert.desiredResolution || "—"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              ));
            })()}

            {/* 2. Khung Bằng chứng & Giải trình mới nhất (vòng đang nộp bổ sung hiện tại, lấy từ Backend) */}
            {initialRound && (() => {
              const historyRounds = JSON.parse(localStorage.getItem(`dispute_rounds_history_${id}`) || "[]");
              const currentRoundNumber = historyRounds.length + 1;
              return (
                <SectionCard
                  title={`Bằng chứng & Giải trình (Vòng ${currentRoundNumber})`}
                  icon={FileText}
                  className="border-amber-250 bg-amber-50/20 mb-6"
                >
                  <div className="p-6 bg-card border border-border rounded-xl space-y-6 text-left text-sm font-sans">
                    <div className="p-3 bg-amber-55 border border-amber-250 text-amber-900 rounded-lg text-xs leading-relaxed font-sans">
                      <strong>Nội dung yêu cầu của Admin:</strong> &quot;{report.adminNote || "Yêu cầu giải trình bổ sung"}&quot;
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Client side latest statement */}
                      <div className="space-y-3 p-4 bg-blue-55/10 border border-blue-100 rounded-xl">
                        <h4 className="text-sm font-bold text-blue-800">Khách hàng (Client) - Giải trình mới</h4>
                        <div>
                          <strong className="text-xs text-muted-foreground block uppercase tracking-wider">Nội dung giải trình bổ sung mới nhất:</strong>
                          <p className="mt-1 text-sm text-foreground bg-white/70 p-3 border border-blue-50 rounded-lg whitespace-pre-wrap">
                            {report.clientExplanation || "Bên Client chưa nộp giải trình bổ sung..."}
                          </p>
                        </div>
                        {report.clientExplanationEvidence && (
                          <div>
                            <strong className="text-xs text-muted-foreground block uppercase tracking-wider">Bằng chứng bổ sung mới nhất:</strong>
                            <a
                              href={report.clientExplanationEvidence}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline text-sm block mt-1 break-all font-medium cursor-pointer"
                            >
                              View Evidence Link
                            </a>
                          </div>
                        )}
                        <div>
                          <strong className="text-xs text-muted-foreground block uppercase tracking-wider">Đề xuất giải quyết:</strong>
                          <p className="mt-1 text-xs text-foreground font-semibold text-blue-700 bg-blue-50 p-2 rounded">{report.clientExplanationDesiredResolution || "—"}</p>
                        </div>
                      </div>

                      {/* Expert side latest statement */}
                      <div className="space-y-3 p-4 bg-purple-55/10 border border-purple-100 rounded-xl">
                        <h4 className="text-sm font-bold text-purple-800">Chuyên gia (Expert) - Giải trình mới</h4>
                        <div>
                          <strong className="text-xs text-muted-foreground block uppercase tracking-wider">Nội dung giải trình bổ sung mới nhất:</strong>
                          <p className="mt-1 text-sm text-foreground bg-white/70 p-3 border border-purple-50 rounded-lg whitespace-pre-wrap">
                            {report.expertExplanation || "Bên Expert chưa nộp giải trình bổ sung..."}
                          </p>
                        </div>
                        {report.expertExplanationEvidence && (
                          <div>
                            <strong className="text-xs text-muted-foreground block uppercase tracking-wider">Bằng chứng bổ sung mới nhất:</strong>
                            <a
                              href={report.expertExplanationEvidence}
                              target="_blank"
                              rel="noreferrer"
                              className="text-purple-600 hover:text-purple-800 underline text-sm block mt-1 break-all font-medium cursor-pointer"
                            >
                              View Evidence Link
                            </a>
                          </div>
                        )}
                        <div>
                          <strong className="text-xs text-muted-foreground block uppercase tracking-wider">Đề xuất giải quyết:</strong>
                          <p className="mt-1 text-xs text-foreground font-semibold text-purple-700 bg-purple-50 p-2 rounded">{report.expertExplanationDesiredResolution || "—"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              );
            })()}

            {(() => {
              const report = reportForPartiesInvolved; // Shadowing toàn diện cho Parties Involved!
              return (
                <SectionCard title="Parties Involved" icon={User}>
                  <div className="flex border-b border-gray-200 mb-4 font-sans">
                    {(() => {
                      const report = reportForPartiesInvolved; // Variable Shadowing!
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
                          <div className={`p-5 rounded-xl border transition-all relative ${report.status === "Awaiting Client" ? "bg-gray-50/50 border-gray-200 select-none opacity-60" : "bg-blue-50/30 border-blue-100"
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

                                      {normalizeEvidence(report.evidence).length > 0 && (
                                        <div className="mt-3 pt-2 border-t border-blue-100/50">
                                          <strong className="text-xs text-gray-500 block mb-1">Tài liệu đính kèm lúc tố cáo:</strong>
                                          <div className="space-y-1">
                                            {normalizeEvidence(report.evidence).map((e, idx) => (
                                              <a
                                                key={idx}
                                                href={e.fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-blue-600 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                                              >
                                                <FileText className="w-3.5 h-3.5" />
                                                {e.fileName || e.name || `Tài liệu tố cáo ${idx + 1}`}
                                              </a>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Báo cáo phản hồi giải trình</p>
                                    {report.clientExplanation ? (
                                      <div className="space-y-2">
                                        <p className="text-sm text-gray-800"><strong className="text-gray-700">Lý do:</strong> {report.clientExplanationReason || report.clientExplanation}</p>
                                        <p className="text-sm text-gray-800"><strong className="text-gray-700">Chi tiết:</strong> {report.clientExplanation}</p>
                                        <p className="text-sm text-gray-800"><strong className="text-gray-700">Nguyện vọng:</strong> {report.clientExplanationDesiredResolution || "—"}</p>
                                        {normalizeEvidence(report.clientExplanationEvidence).length > 0 && (
                                          <div className="mt-2 text-xs text-gray-500">
                                            <strong>Tài liệu đính kèm:</strong>
                                            <div className="mt-1 space-y-1">
                                              {normalizeEvidence(report.clientExplanationEvidence).map((e, eIdx) => (
                                                <a
                                                  key={eIdx}
                                                  href={e.fileUrl}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-blue-600 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                                                >
                                                  <FileText className="w-3.5 h-3.5" />
                                                  {e.fileName || e.name || `Tài liệu ${eIdx + 1}`}
                                                </a>
                                              ))}
                                            </div>
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
                          <div className={`p-5 rounded-xl border transition-all relative ${report.status === "Awaiting Expert" ? "bg-gray-50/50 border-gray-200 select-none opacity-60" : "bg-purple-50/30 border-purple-100"
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

                                      {normalizeEvidence(report.evidence).length > 0 && (
                                        <div className="mt-3 pt-2 border-t border-purple-100/50">
                                          <strong className="text-xs text-gray-500 block mb-1">Tài liệu đính kèm lúc tố cáo:</strong>
                                          <div className="space-y-1">
                                            {normalizeEvidence(report.evidence).map((e, idx) => (
                                              <a
                                                key={idx}
                                                href={e.fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-purple-600 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                                              >
                                                <FileText className="w-3.5 h-3.5" />
                                                {e.fileName || e.name || `Tài liệu tố cáo ${idx + 1}`}
                                              </a>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Báo cáo phản hồi giải trình</p>
                                    {report.expertExplanation ? (
                                      <div className="space-y-2">
                                        <p className="text-sm text-gray-800"><strong className="text-gray-700">Lý do:</strong> {report.expertExplanationReason || report.expertExplanation}</p>
                                        <p className="text-sm text-gray-800"><strong className="text-gray-700">Chi tiết:</strong> {report.expertExplanation}</p>
                                        <p className="text-sm text-gray-800"><strong className="text-gray-700">Nguyện vọng:</strong> {report.expertExplanationDesiredResolution || "—"}</p>
                                        {normalizeEvidence(report.expertExplanationEvidence).length > 0 && (
                                          <div className="mt-2 text-xs text-gray-500">
                                            <strong>Tài liệu đính kèm:</strong>
                                            <div className="mt-1 space-y-1">
                                              {normalizeEvidence(report.expertExplanationEvidence).map((e, eIdx) => (
                                                <a
                                                  key={eIdx}
                                                  href={e.fileUrl}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-purple-600 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                                                >
                                                  <FileText className="w-3.5 h-3.5" />
                                                  {e.fileName || e.name || `Tài liệu ${eIdx + 1}`}
                                                </a>
                                              ))}
                                            </div>
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
              );
            })()}
          </>
        )}

        {/* Form bổ sung (Additional Statements History) */}
        {report.disputeType !== "cancellation" && report.additionalRounds && report.additionalRounds.length > 0 && (
          <SectionCard title="Giải trình bổ sung từ hai bên" icon={FileText}>
            <div className="space-y-6">
              {report.additionalRounds.map((round, idx) => (
                <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                  <h4 className="text-sm font-bold text-gray-850 mb-3 border-b pb-2">
                    Vòng giải trình bổ sung #{round.roundNumber}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Client additional submission */}
                    <div className="bg-blue-50/20 border border-blue-100 rounded-xl p-4 text-left">
                      <h5 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span> Client
                      </h5>
                      {round.clientExplanation ? (
                        <div className="space-y-2 text-xs">
                          <p className="text-gray-700"><strong>Lý do:</strong> {round.clientExplanationReason || "—"}</p>
                          <p className="text-gray-750"><strong>Chi tiết:</strong> {round.clientExplanation || "—"}</p>
                          <p className="text-gray-755"><strong>Nguyện vọng:</strong> {round.clientExplanationDesiredResolution || "—"}</p>
                          {normalizeEvidence(round.clientExplanationEvidence).length > 0 && (
                            <div className="pt-2 border-t border-blue-100/50 mt-2">
                              <strong className="text-gray-500 block mb-1">Tài liệu đính kèm:</strong>
                              <div className="space-y-1">
                                {normalizeEvidence(round.clientExplanationEvidence).map((e, eIdx) => (
                                  <a
                                    key={eIdx}
                                    href={e.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    {e.fileName || e.name || `Tài liệu ${eIdx + 1}`}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">Chưa nộp giải trình bổ sung...</p>
                      )}
                    </div>

                    {/* Expert additional submission */}
                    <div className="bg-purple-50/20 border border-purple-100 rounded-xl p-4 text-left">
                      <h5 className="text-xs font-bold text-purple-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span> Expert
                      </h5>
                      {round.expertExplanation ? (
                        <div className="space-y-2 text-xs">
                          <p className="text-gray-700"><strong>Lý do:</strong> {round.expertExplanationReason || "—"}</p>
                          <p className="text-gray-755"><strong>Chi tiết:</strong> {round.expertExplanation || "—"}</p>
                          <p className="text-gray-755"><strong>Nguyện vọng:</strong> {round.expertExplanationDesiredResolution || "—"}</p>
                          {normalizeEvidence(round.expertExplanationEvidence).length > 0 && (
                            <div className="pt-2 border-t border-purple-100/50 mt-2">
                              <strong className="text-gray-500 block mb-1">Tài liệu đính kèm:</strong>
                              <div className="space-y-1">
                                {normalizeEvidence(round.expertExplanationEvidence).map((e, eIdx) => (
                                  <a
                                    key={eIdx}
                                    href={e.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-purple-600 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    {e.fileName || e.name || `Tài liệu ${eIdx + 1}`}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">Chưa nộp giải trình bổ sung...</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ---- Bottom: Admin Actions Section ---- */}
        <SectionCard title="Admin Actions" icon={AlertTriangle}>
          <div className="font-sans">
            {report.disputeType === "cancellation" ? (
              <div className="space-y-4 font-sans text-left">
                {(report.status === "Pending Admin" || report.status === "Pending") && (
                  <div>
                    {report.escalated || report.attemptRound >= 2 ? (
                      <div className="space-y-4 font-sans">
                        <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl text-orange-800 text-sm leading-relaxed mb-3">
                          <p className="font-bold">🚨 Binding Dispute (Hủy hợp đồng Vòng {report.attemptRound || 2} — Quyết định ràng buộc)</p>
                          <p className="mt-1">Yêu cầu hủy đã leo thang sau khi đối tác từ chối. Hãy chọn phán quyết phân định lỗi để hệ thống tự động phân chia tiền Escrow:</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => handleExecuteEscalatedVerdict("client_fault")}
                            disabled={actionLoading}
                            className="h-11 px-4 bg-red-650 text-white rounded-[12px] hover:bg-red-700 font-semibold text-sm transition cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            ⚖️ Lỗi Client (Phạt Client 10% → Đền Expert)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExecuteEscalatedVerdict("expert_fault")}
                            disabled={actionLoading}
                            className="h-11 px-4 bg-orange-600 text-white rounded-[12px] hover:bg-orange-700 font-semibold text-sm transition cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            ⚖️ Lỗi Expert (Phạt Expert 10% → Đền Client)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExecuteEscalatedVerdict("split_fault")}
                            disabled={actionLoading}
                            className="h-11 px-4 bg-amber-600 text-white rounded-[12px] hover:bg-amber-700 font-semibold text-sm transition cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            ⚖️ Chia đôi lỗi (Mỗi bên chịu phạt 5%)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExecuteEscalatedVerdict("reject_lock")}
                            disabled={actionLoading}
                            className="h-11 px-4 bg-gray-600 text-white rounded-[12px] hover:bg-gray-700 font-semibold text-sm transition cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            🔒 Bác đơn hủy & Khóa chức năng hủy
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={handleAdminApproveCancel}
                          disabled={actionLoading}
                          className="flex-1 h-11 px-5 bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer"
                        >
                          {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                          Duyệt gửi đối tác (Approve)
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowRejectModal(true)}
                          disabled={actionLoading}
                          className="flex-1 h-11 px-5 bg-red-55 text-red-705 hover:bg-red-100 border border-red-200 rounded-[14px] disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          Từ chối đơn hủy (Reject)
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {report.status === "Awaiting Partner" && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center text-amber-800 font-medium">
                    Đang chờ đối tác phản hồi đơn hủy hợp đồng...
                  </div>
                )}
                {report.status === "Returned" && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center text-rose-750 font-medium">
                    Đối tác đã từ chối yêu cầu hủy. Đã trả đơn về người yêu cầu giải quyết.
                  </div>
                )}
                {(report.status === "Resolved" || report.status === "Accepted") && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center text-green-700 font-medium">
                    Đơn hủy hợp đồng đã được giải quyết thành công (Dự án đã đóng).
                  </div>
                )}
                {report.status === "Rejected" && (
                  <div className="p-4 bg-red-55/10 border border-red-200 rounded-xl text-center text-red-700 font-medium">
                    Đơn hủy hợp đồng đã bị từ chối/hủy bỏ (Dự án tiếp tục hoạt động).
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Accept/Reject only when still Pending (not yet both submitted) */}
                {isPending && report.status !== "Awaiting Both" && (
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setShowAcceptModal(true)}
                      disabled={actionLoading}
                      className="flex-1 h-11 px-5 bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer"
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
                      className="flex-1 h-11 px-5 bg-red-55 text-red-705 hover:bg-red-100 border border-red-200 rounded-[14px] disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer"
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

                {/* ---- Awaiting Both: Settle Options (chỉ hiện khi đủ 2 bản) ---- */}
                {(report.status === "Awaiting Both" || (report.status === "Awaiting Evidence" && isDeadlineExpired)) && (() => {
                  const isEvidenceAwaiting = false; // Awaiting Both = cả 2 đã nộp → không lock
                  return (
                    <div className="space-y-4">
                      <div className="text-left">
                        <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">
                          Settle Decision:
                        </p>
                        <div className="flex flex-wrap gap-3">
                          <>
                            <button
                              type="button"
                              onClick={() => setShowContinueModal(true)}
                              disabled={actionLoading || isEvidenceAwaiting}
                              className="h-11 px-5 bg-green-600 text-white rounded-[14px] hover:bg-green-700 disabled:opacity-55 disabled:cursor-not-allowed text-sm font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer"
                            >
                              <Play className="w-4 h-4" />
                              Continue Project
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowStopModal(true)}
                              disabled={actionLoading || isEvidenceAwaiting}
                              className="h-11 px-5 bg-red-600 text-white rounded-[14px] hover:bg-red-700 disabled:opacity-55 disabled:cursor-not-allowed text-sm font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer"
                            >
                              <StopCircle className="w-4 h-4" />
                              Stop and Release Payment
                            </button>
                          </>
                          <button
                            type="button"
                            onClick={() => setShowRequestBothModal(true)}
                            disabled={actionLoading || isEvidenceAwaiting}
                            className="h-11 px-5 bg-purple-600 text-white rounded-[14px] hover:bg-purple-700 disabled:opacity-55 disabled:cursor-not-allowed text-sm font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer"
                          >
                            <MessageCircle className="w-4 h-4" />
                            Gửi cả 2 bản (Yêu cầu bổ sung)
                          </button>
                        </div>
                        {isEvidenceAwaiting ? (
                          <p className="text-[11px] text-red-600 font-bold bg-red-50 border border-red-150 p-2.5 rounded-xl mt-3 text-left leading-normal">
                            ⚠ Các nút phán quyết bị khóa cứng cho đến khi cả hai bên nộp xong bằng chứng bổ sung hoặc hết hạn 48 giờ.
                          </p>
                        ) : report.status === "Awaiting Evidence" && isDeadlineExpired && (
                          <p className="text-[11px] text-green-700 font-bold bg-green-50 border border-green-150 p-2.5 rounded-xl mt-3 text-left leading-normal">
                            ✓ Hạn nộp bằng chứng đã hết. Trọng tài viên đã có thể đưa ra phán quyết dựa trên các bằng chứng hiện có.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
            
            {/* ---- Resolved / Closed / Rejected: no actions ---- */}
            {(isResolved || isRejected) && (
              <div className="p-4 bg-gray-50 rounded-lg text-center border border-gray-150">
                <p className="text-sm font-semibold text-gray-700">
                  {isResolved
                    ? `Resolved — ${report.resolution === "force_payout"
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
        </SectionCard>
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
        title={report?.disputeType === "cancellation" ? "Từ chối yêu cầu hủy" : "Reject Report"}
        description={report?.disputeType === "cancellation" ? "Vui lòng nhập lý do từ chối yêu cầu hủy hợp đồng này." : "Please enter the rejection reason. A notification will be sent to the Expert."}
        confirmLabel={report?.disputeType === "cancellation" ? "Từ chối (Reject)" : "Reject"}
        variant="danger"
        loading={actionLoading}
        onConfirm={report?.disputeType === "cancellation" ? handleAdminRejectCancel : handleRejectReport}
      >
        <textarea
          value={rejectReason}
          onChange={(e) => {
            setRejectReason(e.target.value);
            if (rejectReasonError) setRejectReasonError("");
          }}
          placeholder="Enter the reason for rejecting this report..."
          rows={3}
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-red-500 resize-vertical ${rejectReasonError ? "border-red-300" : "border-gray-300"
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
        title="Stop and Release Payment"
        description="Please enter the final decision reason and choose how to handle the project funds held in escrow."
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
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-red-500 resize-vertical ${stopReasonError ? "border-red-300" : "border-gray-300"
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
        title={
          evidenceTarget === "client"
            ? "Yêu cầu Client bổ sung bằng chứng"
            : evidenceTarget === "expert"
              ? "Yêu cầu Expert bổ sung bằng chứng"
              : "Yêu cầu cả hai bên bổ sung giải trình"
        }
        description={
          evidenceTarget === "client"
            ? "Gửi thông báo yêu cầu Client cung cấp thêm bằng chứng giải trình. Hạn phản hồi được gia hạn thêm 48 giờ."
            : evidenceTarget === "expert"
              ? "Gửi thông báo yêu cầu Expert cung cấp thêm bằng chứng giải trình. Hạn phản hồi được gia hạn thêm 48 giờ."
              : "Yêu cầu cả Client và Expert cùng gửi lại bản báo cáo/giải trình và bằng chứng bổ sung. Thời hạn phản hồi sẽ được gia hạn thêm 48 giờ."
        }
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
          placeholder={
            evidenceTarget === "client"
              ? "Nhập nội dung/lý do chi tiết yêu cầu Client bổ sung bằng chứng..."
              : evidenceTarget === "expert"
                ? "Nhập nội dung/lý do chi tiết yêu cầu Expert bổ sung bằng chứng..."
                : "Nhập nội dung/lý do chi tiết yêu cầu cả hai bên bổ sung giải trình..."
          }
          rows={3}
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-brand-primary resize-vertical ${evidenceNoteError ? "border-red-300" : "border-gray-300"
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
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-brand-primary resize-vertical ${forceReasonError ? "border-red-300" : "border-gray-300"
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
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-red-500 resize-vertical ${forceReasonError ? "border-red-300" : "border-gray-300"
            }`}
          disabled={actionLoading}
        />
        {forceReasonError && (
          <p className="text-xs text-red-500 mt-1">{forceReasonError}</p>
        )}
      </ConfirmationModal>

      {/* Request Both Additional Modal */}
      <ConfirmationModal
        open={showRequestBothModal}
        onOpenChange={setShowRequestBothModal}
        title="Yêu cầu giải trình bổ sung từ cả hai bên"
        description="Admin yêu cầu cả Client và Expert cùng gửi lại bản báo cáo/giải trình và bằng chứng bổ sung. Thời hạn phản hồi của cả hai bên sẽ được gia hạn thêm 48 giờ."
        confirmLabel="✓ Gửi yêu cầu giải trình"
        variant="default"
        loading={actionLoading}
        onConfirm={handleRequestAdditionalBoth}
      >
        <textarea
          value={requestBothNote}
          onChange={(e) => {
            setRequestBothNote(e.target.value);
            if (requestBothNoteError) setRequestBothNoteError("");
          }}
          placeholder="Nhập nội dung/lý do chi tiết yêu cầu bổ sung thông tin gửi tới cả hai bên..."
          rows={3}
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-brand-primary resize-vertical ${requestBothNoteError ? "border-red-300" : "border-gray-300"
            }`}
          disabled={actionLoading}
        />
        {requestBothNoteError && (
          <p className="text-xs text-red-500 mt-1">{requestBothNoteError}</p>
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

