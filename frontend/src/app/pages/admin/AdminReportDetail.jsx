// =============================================================================
// AdminReportDetail - Full dispute report detail & handling page.
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
import api, { enrichFileUrl, cleanFileName } from "../../../services/api.js";
import { downloadFile } from "../../lib/downloadFileUtils.js";
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
  "Pending Admin": { color: "bg-warning-light text-warning border border-warning/20", label: "Pending Admin" },
  Pending: { color: "bg-warning-light text-warning border border-warning/20", label: "Pending Admin" },
  "Awaiting Expert": { color: "bg-warning-light text-warning border border-warning/20", label: "Awaiting Expert" },
  "Awaiting Client": { color: "bg-accent-light text-accent border border-accent/25", label: "Awaiting Client" },
  "Awaiting Evidence": { color: "bg-warning-light text-warning border border-warning/30", label: "Awaiting Evidence" },
  "Awaiting Both": { color: "bg-warning-light text-warning border border-warning/30", label: "Awaiting Both Sides" },
  "Awaiting Partner": { color: "bg-warning-light text-warning border border-warning/20", label: "Awaiting Partner" },
  Returned: { color: "bg-destructive-light text-destructive border border-destructive/20", label: "Returned" },
  Accepted: { color: "bg-brand-primary-light text-brand-primary border border-brand-primary/20", label: "Accepted" },
  Resolved: { color: "bg-success-light text-success border border-success/20", label: "Resolved" },
  Rejected: { color: "bg-destructive-light text-destructive border border-destructive/20", label: "Rejected" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

// Helper to normalize file evidence from potential strings (filename or JSON array), objects, or arrays into a stable array of objects.
function normalizeEvidence(...sources) {
  const list = [];
  const seen = new Set();

  const add = (raw) => {
    if (!raw) return;
    if (Array.isArray(raw)) {
      raw.forEach(add);
      return;
    }
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (!trimmed) return;
      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        try {
          const parsed = JSON.parse(trimmed);
          add(parsed);
          return;
        } catch (e) { }
      }
      const fileUrl = trimmed.startsWith("http") ? trimmed : enrichFileUrl(trimmed);
      const cleanName = cleanFileName(trimmed) || "Evidence File";
      if (!seen.has(fileUrl)) {
        seen.add(fileUrl);
        list.push({ fileUrl, fileName: cleanName, note: "" });
      }
      return;
    }
    if (typeof raw === "object") {
      const u = raw.fileUrl || raw.url || raw.Url || (typeof raw.file === "string" ? raw.file : "");
      if (!u) return;
      const fileUrl = u.startsWith("http") ? u : enrichFileUrl(u);

      const urlFileName = typeof u === "string" ? u.split("?")[0].split("/").pop() : "";
      const rawName = raw.fileName || raw.originalName || (urlFileName && urlFileName.includes(".") ? urlFileName : null) || raw.name || raw.Name || "Evidence File";
      const cleanName = cleanFileName(rawName);
      const note = raw.note || raw.Note || (raw.name && raw.name !== cleanName && !raw.name.includes(".") ? raw.name : "");

      if (!seen.has(fileUrl)) {
        seen.add(fileUrl);
        list.push({ fileUrl, fileName: cleanName, note });
      }
    }
  };

  sources.forEach(add);
  return list;
}

// Backend stores explanation as "reason\n\ndescription" without a separate reason field
// for partner-submit-response, so derive Reason from the first part when missing.
function splitReason(details, reasonField) {
  if (reasonField) return { reason: reasonField, details };
  if (details && typeof details === "string" && details.includes("\n\n")) {
    const parts = details.split("\n\n");
    return { reason: parts[0], details: parts.slice(1).join("\n\n") };
  }
  return { reason: null, details };
}

export function AdminReportDetail() {  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleDownloadFile = useCallback((e, fileUrl, fileName) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (!fileUrl) return;
    downloadFile(fileUrl, fileName);
  }, []);

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
              const pAmount = projectData.Budget || projectData.budget || projectData.EscrowBalance || projectData.escrowBalance || projectData.escrowAmount || projectData.EscrowAmount || 0;
              data.payoutBreakdown.contractAmount = pAmount;
              data.amount = data.amount || pAmount;
              data.escrowAmount = data.escrowAmount || pAmount;
              data.projectTitle = projectData.Title || projectData.title || projectData.ProjectTitle || projectData.projectTitle || data.projectTitle;
              data.projectDeadline = data.projectDeadline || projectData.EndDate || projectData.endDate || projectData.Deadline || projectData.deadline;
              data.projectStartDate = data.projectStartDate || projectData.StartDate || projectData.startDate || projectData.CreatedAt || projectData.createdAt;

              // Enrich clientId/expertId from project
              const pClientId = projectData.ClientId || projectData.clientId;
              const pExpertId = projectData.AssignedExpertId || projectData.assignedExpertId || projectData.ExpertId || projectData.expertId;
              data.clientId = data.clientId || data.ClientId || pClientId;
              data.expertId = data.expertId || data.ExpertId || pExpertId;

              // Robust reporterRole normalization: cross-reference reporterId with project's clientId/expertId
              const rawRole = (data.reporterRole || data.ReporterRole || "").toLowerCase();
              if (rawRole === "client" || rawRole === "expert") {
                data.reporterRole = rawRole;
              } else {
                // reporterRole is empty/missing - determine by comparing reporterId
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
        setTimeLeft("RESPONSE EXPIRED (Deadline Expired)");
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
    const staffId = user?.id || user?.Id || JSON.parse(sessionStorage.getItem("aitasker_user_info") || sessionStorage.getItem("user") || "{}")?.id;
    try {
      if (report.status === "Awaiting Expert") {
        await stopProject(report?.projectId, {
          reason: "Expert failed to respond in time. System automatically refunded Client.",
          moneyAction: "refund",
          reportId: report.id,
          staffId,
        });
        showToast("Default verdict: Client wins, full refund released.");
      } else if (report.status === "Awaiting Client") {
        await stopProject(report?.projectId, {
          reason: "Client failed to respond in time. System automatically paid Expert.",
          moneyAction: "release",
          reportId: report.id,
          staffId,
        });
        showToast("Default verdict: Expert wins, full payout released.");
      }
      fetchReport();
    } catch (err) {
      showToast(err.message || "Error processing default verdict.");
    } finally {
      setActionLoading(false);
    }
  }, [report, fetchReport, showToast]);

  const handleRequestMoreEvidence = useCallback(async () => {
    if (!evidenceNote.trim()) {
      setEvidenceNoteError("Please enter reasons for evidence request.");
      return;
    }
    setActionLoading(true);
    try {
      let actionName = "requestEvidenceBoth";
      let successMsg = "Requested additional explanation from both parties and extended response deadline by 48 hours.";

      if (evidenceTarget === "client") {
        actionName = "requestEvidenceClient";
        successMsg = "Requested additional evidence from Client and extended response deadline by 48 hours.";
      } else if (evidenceTarget === "expert") {
        actionName = "requestEvidenceExpert";
        successMsg = "Requested additional evidence from Expert and extended response deadline by 48 hours.";
      } else {
        actionName = "requestEvidenceBoth";
        successMsg = "Requested additional explanation from both parties and extended response deadline by 48 hours.";
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
      const projectTitle = report?.projectTitle || report?.projectName || "Project";
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
      showToast(err.message || "Error requesting evidence.");
    } finally {
      setActionLoading(false);
    }
  }, [report, evidenceNote, evidenceTarget, fetchReport, showToast]);

  const handleRequestAdditionalBoth = useCallback(async () => {
    if (!requestBothNote.trim()) {
      setRequestBothNoteError("Please enter explanation request details.");
      return;
    }
    setActionLoading(true);
    try {
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
      showToast("Additional explanation requested from both parties; deadline extended by 48 hours.");
      setRequestBothNote("");
      setRequestBothNoteError("");
      setShowRequestBothModal(false);
      fetchReport();
    } catch (err) {
      showToast(err.message || "Error sending request.");
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
    const staffId = user?.id || user?.Id || JSON.parse(sessionStorage.getItem("aitasker_user_info") || sessionStorage.getItem("user") || "{}")?.id;
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

      // Override status and save locally
      const forcePayoutProjId = String(report?.projectId).toLowerCase();
      localStorage.setItem(`project_status_${report?.projectId}`, "cancelled");
      localStorage.setItem(`project_status_${forcePayoutProjId}`, "cancelled");
      localStorage.setItem(`report_status_${id}`, "Resolved");
      // Store dispute verdict data dynamically (JSON - no hardcoded logic on display side)
      const fpEscrow = Number(report?.amount || report?.escrowAmount || 0);
      const fpFee = Math.round(fpEscrow * 0.05);
      localStorage.setItem(`dispute_verdict_${forcePayoutProjId}`, JSON.stringify({
        clientReceives: 0,
        clientFee: 0,
        expertReceives: fpEscrow,
        expertFee: fpFee,
      }));

      showToast("Force escrow release to Expert successful.");

      // Notify both parties dispute resolved
      const projectTitle = report?.projectTitle || report?.projectName || "Project";
      notifyDisputeResolved({ userId: report?.expertId, userRole: "expert", projectTitle, resolution: "Expert paid", projectId: report?.projectId }).catch(() => { });
      notifyDisputeResolved({ userId: report?.clientId, userRole: "client", projectTitle, resolution: "Expert paid", projectId: report?.projectId }).catch(() => { });

      setForceReason("");
      setForceReasonError("");
      setShowForcePayoutModal(false);
      fetchReport();
    } catch (err) {
      showToast(err.message || "Error during force payout.");
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
    const staffId = user?.id || user?.Id || JSON.parse(sessionStorage.getItem("aitasker_user_info") || sessionStorage.getItem("user") || "{}")?.id;
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

      // Override status and save locally
      const forceRefundProjId = String(report?.projectId).toLowerCase();
      localStorage.setItem(`project_status_${report?.projectId}`, "cancelled");
      localStorage.setItem(`project_status_${forceRefundProjId}`, "cancelled");
      localStorage.setItem(`report_status_${id}`, "Resolved");
      // Store dispute verdict data dynamically
      const frEscrow = Number(report?.amount || report?.escrowAmount || 0);
      const frFee = Math.round(frEscrow * 0.05);
      localStorage.setItem(`dispute_verdict_${forceRefundProjId}`, JSON.stringify({
        clientReceives: frEscrow,
        clientFee: frFee,
        expertReceives: 0,
        expertFee: 0,
      }));

      showToast("Force refund to Client successful.");

      // Notify both parties dispute resolved
      const projectTitle = report?.projectTitle || report?.projectName || "Project";
      notifyDisputeResolved({ userId: report?.clientId, userRole: "client", projectTitle, resolution: "Client refunded", projectId: report?.projectId }).catch(() => { });
      notifyDisputeResolved({ userId: report?.expertId, userRole: "expert", projectTitle, resolution: "Client refunded", projectId: report?.projectId }).catch(() => { });

      setForceReason("");
      setForceReasonError("");
      setShowForceRefundModal(false);
      fetchReport();
    } catch (err) {
      showToast(err.message || "Error during force refund.");
    } finally {
      setActionLoading(false);
    }
  }, [report, forceReason, fetchReport, showToast, id, user]);

  // -----------------------------------------------------------------------
  // Accept Report
  // -----------------------------------------------------------------------
  const handleAcceptReport = useCallback(async () => {
    setActionLoading(true);
    const staffId = user?.id || user?.Id || JSON.parse(sessionStorage.getItem("aitasker_user_info") || sessionStorage.getItem("user") || "{}")?.id;
    try {
      await acceptReport(id, report);
      // Pause project as disputed
      if (report?.projectId) {
        try {
          const res = await pauseProjectAsDisputed(report.projectId, { reportId: id, staffId });
          const disputeId = res?.disputeId || res?.DisputeId || res?.data?.disputeId || res?.data?.DisputeId;
          if (disputeId) {
            localStorage.setItem(`dispute_id_for_report_${id}`, disputeId);
          }
        } catch (disputeErr) {
          console.warn("pauseProjectAsDisputed API call fallback:", disputeErr);
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
        reporterName: report?.reporterName || report?.clientName || report?.expertName || "Plaintiff",
        projectTitle: report?.projectTitle || report?.projectName || "Project",
        deadline: "48 hours",
        projectId: report?.projectId,
        reportId: id,
      }).catch(() => { });

      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
      fetchReport();
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
      showToast("Cancellation request approved and forwarded to partner.");

      // Notify the partner that a cancel request was approved
      const partnerUserId = report?.reporterRole?.toLowerCase() === "client" ? report?.expertId : report?.clientId;
      notifyCancelRequestSubmitted({
        partnerUserId: partnerUserId,
        projectTitle: report?.projectTitle || report?.projectName || "Project",
        requesterName: report?.reporterName || "Partner",
        projectId: report?.projectId,
      }).catch(() => { });

      fetchReport();
    } catch (err) {
      showToast(err.message || "Error approving request.");
    } finally {
      setActionLoading(false);
    }
  }, [id, fetchReport, showToast]);

  const handleAdminRejectCancel = useCallback(async () => {
    if (!rejectReason.trim()) {
      setRejectReasonError("Please enter rejection reason.");
      return;
    }
    setActionLoading(true);
    try {
      await api.put(`/reports/${id}/admin-reject-cancel`, {
        adminNote: rejectReason,
      });
      showToast("Cancellation request rejected. Project resumed normally.");
      setRejectReason("");
      setRejectReasonError("");
      setShowRejectModal(false);
      fetchReport();
    } catch (err) {
      showToast(err.message || "Error rejecting request.");
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
          // For cancellation: Call cancel rejection in Backend C#
          await api.put(`/reports/${id}/admin-reject-cancel`, {
            adminNote: "Admin resumes project",
            AdminNote: "Admin resumes project"
          });
        } else {
          // For standard Dispute: Call reject report API to restore project to In Progress!
          await api.put(`/reports/${id}/admin-reject-report`, {
            reason: "Admin resumes project",
            Reason: "Admin resumes project"
          });
        }
      } catch (err) {
        console.warn("Backend continue execution failed, using frontend fallback...", err);
      }

      // Override project status in Frontend
      localStorage.setItem(`project_status_${report?.projectId}`, "inprogress");
      // Save Report status as Resolved
      localStorage.setItem(`report_status_${id}`, "Resolved");

      setReport((prev) => ({ ...prev, status: "Resolved", resolution: "continued" }));
      showToast("Project has been resumed. Client and Expert can continue working.");

      // Notify both parties dispute resolved
      const projectTitle = report?.projectTitle || report?.projectName || "Project";
      notifyDisputeResolved({ userId: report?.clientId, userRole: "client", projectTitle, resolution: "Project resumed", projectId: report?.projectId }).catch(() => { });
      notifyDisputeResolved({ userId: report?.expertId, userRole: "expert", projectTitle, resolution: "Project resumed", projectId: report?.projectId }).catch(() => { });

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
    const staffId = user?.id || user?.Id || JSON.parse(sessionStorage.getItem("aitasker_user_info") || sessionStorage.getItem("user") || "{}")?.id;
    try {
      const isCancellation = report?.reportType === "cancellation" || report?.disputeType === "cancellation";
      if (isCancellation) {
        // For cancellation: Call approve cancellation to forward to partner
        await api.put(`/reports/${id}/admin-approve-cancel`);
        showToast("Cancellation request approved and forwarded to partner.");
      } else {
        // For standard financial Dispute: force split verdict
        const disputeId = localStorage.getItem(`dispute_id_for_report_${id}`) || id;
        let verdictSucceeded = true;
        try {
          // 1. Stop the project
          await stopProject(report?.projectId, {
            reason: stopReason,
            moneyAction,
            reportId: disputeId,
            staffId,
          });
        } catch (e) {
          verdictSucceeded = false;
          console.warn("Backend dispute verdict failed, using fallback payout/refund...", e);
        }

        // 2. Handle escrow money
        const projectTitle = report?.projectTitle || report?.projectName || "Project";
        let targetClientId = report?.clientId || report?.ClientId;
        let targetExpertId = report?.expertId || report?.ExpertId;
        let escrowTotal = Number(report?.amount || report?.escrowAmount || report?.payoutBreakdown?.contractAmount || 0);

        if (!escrowTotal || escrowTotal === 0 || !targetClientId || !targetExpertId) {
          try {
            const freshProj = await api.projects.getById(report?.projectId);
            if (freshProj) {
              escrowTotal = escrowTotal || Number(freshProj.Budget || freshProj.budget || freshProj.EscrowBalance || freshProj.escrowBalance || freshProj.escrowAmount || freshProj.EscrowAmount || 0);
              targetClientId = targetClientId || freshProj.ClientId || freshProj.clientId;
              targetExpertId = targetExpertId || freshProj.AssignedExpertId || freshProj.assignedExpertId || freshProj.ExpertId || freshProj.expertId;
            }
          } catch (projErr) {
            console.warn("Failed to fetch fresh project budget/IDs in handleStopProject:", projErr);
          }
        }

        const payoutAmount = Math.round(escrowTotal * 0.95);
        const platformFee = Math.round(escrowTotal * 0.05);

        if (moneyAction === "refund") {
          try {
            if (!verdictSucceeded && targetClientId) {
              await api.post("/interactions/transaction", {
                projectId: report?.projectId,
                destinationWalletId: targetClientId,
                amount: payoutAmount,
                type: "Deposit",
                description: "Dispute verdict - Reported SuccessFull",
              });
            }
          } catch (depositErr) {
            console.warn("Verdict client payout failed:", depositErr);
          }
          try {
            await api.post("/interactions/transaction", {
              projectId: report?.projectId,
              amount: platformFee,
              sourceWalletId: targetClientId,
              reportId: id,
              status: "completed",
              type: "PlatformFee",
              transactionType: "PlatformFee",
              description: `platform fee -5%`,
            });
          } catch (feeErr) { }
          showToast(`Full project amount (minus 5% system fee) has been refunded to Client.`);
          if (targetClientId) notifyDisputeResolved({ userId: targetClientId, userRole: "client", projectTitle, resolution: "Client refunded (-5% fee)", projectId: report?.projectId }).catch(() => { });
          if (targetExpertId) notifyDisputeResolved({ userId: targetExpertId, userRole: "expert", projectTitle, resolution: "Client refunded (-5% fee)", projectId: report?.projectId }).catch(() => { });
          const cancellationMetadata = JSON.stringify({
            expertPayout: 0,
            expertFee: 0,
            clientRefund: escrowTotal,
            clientFee: platformFee,
            isEscalatedVerdict: false,
            verdictType: "client_refund",
            winnerRole: "Client",
            finalDecisionReason: stopReason
          });
          try {
            await api.projects.updateStatus(report?.projectId, "Cancelled");
            await api.projects.updateMetadata(report?.projectId, cancellationMetadata);
          } catch (e) { console.warn("Backend update status/metadata failed", e); }
        } else {
          try {
            if (!verdictSucceeded && targetExpertId) {
              await api.post("/interactions/transaction", {
                projectId: report?.projectId,
                destinationWalletId: targetExpertId,
                amount: payoutAmount,
                type: "Deposit",
                description: "Dispute verdict - Reported SuccessFull",
              });
            }
          } catch (depositErr) {
            console.warn("Verdict expert payout failed:", depositErr);
          }
          try {
            await api.post("/interactions/transaction", {
              projectId: report?.projectId,
              amount: platformFee,
              sourceWalletId: targetExpertId,
              reportId: id,
              status: "completed",
              type: "PlatformFee",
              transactionType: "PlatformFee",
              description: `platform fee -5%`,
            });
          } catch (feeErr) { }
          showToast(`Full project amount (minus 5% system fee) has been released to Expert.`);
          if (targetExpertId) notifyDisputeResolved({ userId: targetExpertId, userRole: "expert", projectTitle, resolution: "Expert paid (-5% fee)", projectId: report?.projectId }).catch(() => { });
          if (targetClientId) notifyDisputeResolved({ userId: targetClientId, userRole: "client", projectTitle, resolution: "Expert paid (-5% fee)", projectId: report?.projectId }).catch(() => { });
          const cancellationMetadata = JSON.stringify({
            expertPayout: escrowTotal,
            expertFee: platformFee,
            clientRefund: 0,
            clientFee: 0,
            isEscalatedVerdict: false,
            verdictType: "expert_paid",
            winnerRole: "Expert",
            finalDecisionReason: stopReason
          });
          try {
            await api.projects.updateStatus(report?.projectId, "Cancelled");
            await api.projects.updateMetadata(report?.projectId, cancellationMetadata);
          } catch (e) { console.warn("Backend update status/metadata failed", e); }
        }
        localStorage.setItem(`report_status_${id}`, "Resolved");
        if (report?.projectId) {
          localStorage.setItem(`report_status_${String(report.projectId).toLowerCase()}`, "Resolved");
        }
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
  // Render: loading
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-border rounded w-48" />
          <div className="h-64 bg-border rounded-2xl" />
          <div className="h-48 bg-border rounded-2xl" />
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
        <BackButton fallback={window.location.pathname.startsWith("/owner") ? "/owner/reports" : "/admin/disputes"} className="mb-6">
          Back to Dispute List
        </BackButton>
        <div className="bg-card rounded-xl border border-border p-12 text-center shadow-sm">
          <AlertTriangle className="w-12 h-12 text-destructive/55 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">
            {error || "Report Not Found"}
          </h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
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

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <BackButton fallback={window.location.pathname.startsWith("/owner") ? "/owner/reports" : "/admin/disputes"} className="mb-0">
        Back to Dispute List
      </BackButton>

      {/* Feedback toast */}
      {feedback && (
        <div className="p-4 bg-success-light border border-success/20 rounded-xl text-sm text-success font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {feedback}
        </div>
      )}

      {/* ---- Header ---- */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {report.reportName || report.projectTitle || `Report #${id}`}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={report.status} config={REPORT_STATUS_CONFIG} />
            {report.disputeType && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {report.disputeType}
              </span>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Submitted: {formatDateTime(report.submittedAt || report.createdAt)}
        </p>
      </div>

      {/* Deadline warning banner */}
      {(report.status === "Awaiting Expert" || report.status === "Awaiting Client" || report.status === "Awaiting Both") && (
        <div className="p-4 bg-destructive-light border border-destructive/20 text-destructive rounded-xl flex items-center justify-between shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive-light rounded-lg text-destructive">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold font-sans">DISPUTE EXPLANATION PERIOD</p>
              <p className="text-xs text-destructive font-sans mt-0.5">
                Defendant has up to 48 hours to submit an explanation. Status: <strong>{report.status}</strong>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-destructive text-primary-foreground rounded-lg text-sm font-mono font-semibold">
              {timeLeft}
            </div>
            {isDeadlineExpired && (
              <button
                type="button"
                onClick={handleDefaultSettle}
                disabled={actionLoading}
                className="h-10 px-4 bg-destructive hover:bg-destructive/85 text-primary-foreground text-xs font-semibold rounded-lg shadow transition-all cursor-pointer flex items-center gap-1"
              >
                Default Settle
              </button>
            )}
          </div>
        </div>
      )}

      {/* Awaiting Evidence countdown banner */}
      {report.status === "Awaiting Evidence" && (
        <div className="p-4 bg-warning-light border border-warning/30 text-warning rounded-xl flex items-center justify-between shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning-light rounded-lg text-warning">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold font-sans">EVIDENCE SUBMISSION PERIOD (48 HOURS)</p>
              <p className="text-xs text-warning font-sans mt-0.5">
                Both parties must submit additional evidence. Status: <strong>{report.status}</strong>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-warning text-primary-foreground rounded-lg text-sm font-mono font-semibold">
              {timeLeft}
            </div>
          </div>
        </div>
      )}

      {/* ---- Rejection notification preview ---- */}
      {isRejected && report.rejectionReason && (
        <div className="p-4 bg-destructive-light border border-destructive/20 rounded-xl">
          <h3 className="text-sm font-semibold text-destructive mb-1">
            Rejection notification sent to Expert:
          </h3>
          <p className="text-sm text-destructive">
            Your report for project{" "}
            <strong>{report.projectTitle || report.projectId}</strong> has been
            rejected by Admin. Reason: {report.rejectionReason}
          </p>
          <p className="text-xs text-destructive mt-1">
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
                  : "-"
              }
            />
            <DetailItem
              label="Deadline"
              value={(() => {
                if (!report.projectDeadline) return "-";
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
          <SectionCard title="Contract Cancellation Request Details" icon={FileText}>
            <div className="p-6 bg-card border border-border rounded-xl space-y-4 text-left text-sm font-sans">
              <div>
                <strong className="text-muted-foreground block text-xs uppercase tracking-wider">Requested By:</strong>
                <span className="text-base font-semibold text-foreground">
                  {(report.reporterRole || report.ReporterRole || "").toLowerCase() === "client" ? `Client: ${report.clientName}` : `Expert: ${report.expertName}`}
                </span>
              </div>
              <div>
                <strong className="text-muted-foreground block text-xs uppercase tracking-wider">Cancellation Reason:</strong>
                <p className="mt-1 text-sm text-foreground bg-muted/40 p-4 border border-border rounded-xl font-medium">
                  &quot;{report.reason}&quot;
                </p>
              </div>
              {(() => {
                const evList = normalizeEvidence(
                  report.evidence,
                  report.evidenceUrl,
                  report.EvidenceUrl,
                  report.evidenceList,
                  report.EvidenceList,
                  report.attachmentUrl,
                  report.attachment,
                  report.clientEvidence
                );
                return (
                  <div>
                    <strong className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Attached Documents:</strong>
                    {evList.length > 0 ? (
                      <div className="space-y-1.5 max-w-full overflow-hidden">
                        {evList.map((e, idx) => (
                          <a
                            key={idx}
                            href={e.fileUrl}
                            onClick={(ev) => handleDownloadFile(ev, e.fileUrl, e.fileName)}
                            className="text-sm text-accent hover:underline inline-flex items-center gap-1.5 cursor-pointer font-medium max-w-full overflow-hidden"
                            title={e.fileName}
                          >
                            <FileText className="w-4 h-4 shrink-0 text-accent" />
                            <span className="truncate max-w-[260px] sm:max-w-[360px] block">{e.fileName || `Document ${idx + 1}`}</span>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground/70 italic block">None</span>
                    )}
                  </div>
                );
              })()}

              <div className="border-t border-border pt-4">
                <strong className="text-muted-foreground block text-xs uppercase tracking-wider mb-2">Escrow Split Proposal:</strong>
                {(() => {
                  const escrowTotal = report.payoutBreakdown?.contractAmount ?? (report.amount || report.escrowAmount || 0);
                  const progress = report.payoutBreakdown?.progressPercent ?? 30;
                  const progressRate = progress / 100;

                  const platformFee = Math.round(escrowTotal * 0.05);
                  const penaltyFee = Math.round(escrowTotal * 0.10);
                  const progressAmount = Math.round(escrowTotal * progressRate);

                  const isClientReporter = (report.reporterRole || report.ReporterRole || "").toLowerCase() === "client";

                  if (true) {
                    let expertPayout = 0;
                    let clientRefund = 0;

                    if (isClientReporter) {
                      // Client cancels -> Client is at fault -> Client is penalized
                      // Expert receives: progress + penalty fee
                      // Client receives: total - platform fee - expert payout
                      expertPayout = report.payoutBreakdown?.expertPayout ?? (progressAmount + penaltyFee);
                      clientRefund = report.payoutBreakdown?.clientRefund ?? (escrowTotal - platformFee - expertPayout);
                    } else {
                      // Expert cancels -> Expert is at fault -> Expert is penalized
                      // Expert receives: progress - penalty fee - platform fee
                      // Client receives: total - expert payout - platform fee
                      expertPayout = report.payoutBreakdown?.expertPayout ?? Math.max(0, progressAmount - penaltyFee - platformFee);
                      clientRefund = report.payoutBreakdown?.clientRefund ?? (escrowTotal - expertPayout - platformFee);
                    }

                    return (
                      <div className="space-y-1.5 p-4 bg-muted/30 border border-border rounded-xl text-xs max-w-md">
                        <div className="flex justify-between"><span className="text-muted-foreground">Contract Value:</span><span className="font-semibold text-foreground"><MoneyDisplay amount={escrowTotal} /></span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Current Progress:</span><span className="font-semibold text-foreground">{progress}%</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Requested By:</span><span className="font-semibold text-accent">{isClientReporter ? "Client" : "Expert"}</span></div>
                        <div className="border-t border-border my-1.5" />
                        <div className="flex justify-between"><span className="text-muted-foreground">Platform fee (collected by system):</span><span className="font-semibold text-warning">5% to <MoneyDisplay amount={platformFee} /></span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Cancellation penalty fee:</span><span className="font-semibold text-destructive">10% to <MoneyDisplay amount={penaltyFee} /></span></div>
                        <div className="border-t border-border my-1.5" />
                        {isClientReporter ? (
                          <>
                            <div className="flex justify-between font-semibold"><span className="text-foreground">Payout to Expert (progress + penalty):</span><span className="text-warning"><MoneyDisplay amount={expertPayout} /></span></div>
                            <div className="flex justify-between font-semibold"><span className="text-foreground">Refund to Client:</span><span className="text-success"><MoneyDisplay amount={clientRefund} /></span></div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between font-semibold"><span className="text-foreground">Payout to Expert (progress - penalty - fee):</span><span className="text-warning"><MoneyDisplay amount={expertPayout} /></span></div>
                            <div className="flex justify-between font-semibold"><span className="text-foreground">Refund to Client:</span><span className="text-success"><MoneyDisplay amount={clientRefund} /></span></div>
                          </>
                        )}
                      </div>
                    );
                  }
                })()}
              </div>

              {report.partnerRejectionReason && (
                <div className="border-t border-border pt-4">
                  <strong className="text-destructive block text-xs uppercase tracking-wider">Partner declined cancellation with reason:</strong>
                  <div className="p-4 bg-destructive-light border border-destructive/20 rounded-xl mt-2 font-medium text-destructive">
                    &quot;{report.partnerRejectionReason}&quot;
                  </div>
                  <p className="text-xs text-muted-foreground italic mt-1">The system has returned the cancellation request to the requester to decide (Accept or Respond).</p>
                </div>
              )}
            </div>
          </SectionCard>
        ) : (
          <>
            {/* Report Details (original report info) */}
            <SectionCard title="Report Details" icon={FileText}>
              <div className="p-6 bg-card border border-border rounded-xl space-y-4 text-left text-sm font-sans">
                <div>
                  <strong className="text-muted-foreground block text-xs uppercase tracking-wider">Reported By:</strong>
                  <span className="text-base font-semibold text-foreground">
                    {(report.reporterRole || report.ReporterRole || "").toLowerCase() === "client" ? `Client: ${report.clientName}` : `Expert: ${report.expertName}`}
                  </span>
                </div>
                <div>
                  <strong className="text-muted-foreground block text-xs uppercase tracking-wider">Report Reason:</strong>
                  <p className="mt-1 text-sm text-foreground bg-muted/40 p-4 border border-border rounded-xl font-medium">
                    &quot;{report.reason}&quot;
                  </p>
                </div>
                <div>
                  <strong className="text-muted-foreground block text-xs uppercase tracking-wider">Dispute Type:</strong>
                  <p className="mt-1 text-sm text-foreground">{report.disputeType}</p>
                </div>
                <div>
                  <strong className="text-muted-foreground block text-xs uppercase tracking-wider">Detailed Description:</strong>
                  <p className="mt-1 text-sm text-foreground bg-muted/40 p-4 border border-border rounded-xl font-medium">{report.description}</p>
                </div>
                <div>
                  <strong className="text-muted-foreground block text-xs uppercase tracking-wider">Desired Resolution:</strong>
                  <p className="mt-1 text-sm text-foreground">{report.desiredResolution}</p>
                </div>
                {(() => {
                  const evList = normalizeEvidence(report.evidence, report.evidenceUrl, report.EvidenceUrl, report.clientEvidence);
                  if (evList.length === 0) return null;
                  return (
                    <div>
                      <strong className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Evidence:</strong>
                      <div className="space-y-1.5 max-w-full overflow-hidden">
                        {evList.map((e, idx) => (
                          <a
                            key={idx}
                            href={e.fileUrl}
                            onClick={(ev) => handleDownloadFile(ev, e.fileUrl, e.fileName)}
                            className="text-sm text-accent hover:underline inline-flex items-center gap-1.5 cursor-pointer font-medium max-w-full overflow-hidden"
                            title={e.fileName}
                          >
                            <FileText className="w-4 h-4 shrink-0 text-accent" />
                            <span className="truncate max-w-[260px] sm:max-w-[360px] block">{e.fileName || `Document ${idx + 1}`}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </SectionCard>
          </>
        )}

        {/* Explanations from Both Parties (current round) */}
        {report.disputeType !== "cancellation" && report.status !== "Pending" && report.status !== "Pending Admin" && (
          <SectionCard title="Additional Explanations from Both Parties" icon={FileText}>
            <div className="space-y-6">
              {(Array.isArray(report.additionalRounds) && report.additionalRounds.length > 0 ? report.additionalRounds : [{ roundNumber: 1, clientExplanation: null, expertExplanation: null }]).map((round, idx, rounds) => {
                const isLatest = idx === rounds.length - 1;
                // Latest round reflects current submission state; older rounds are frozen history
                const clientSubmitted = isLatest
                  ? (report.currentRoundClientSubmitted && report.clientExplanation)
                  : round.clientExplanation;
                const clientReason = isLatest ? report.clientExplanationReason : round.clientExplanationReason;
                const clientDetails = isLatest ? report.clientExplanation : round.clientExplanation;
                const clientDesired = isLatest ? report.clientExplanationDesiredResolution : round.clientExplanationDesiredResolution;
                const clientEvidence = isLatest ? report.clientExplanationEvidence : round.clientExplanationEvidence;
                const expertSubmitted = isLatest
                  ? (report.currentRoundExpertSubmitted && report.expertExplanation)
                  : round.expertExplanation;
                const expertReason = isLatest ? report.expertExplanationReason : round.expertExplanationReason;
                const expertDetails = isLatest ? report.expertExplanation : round.expertExplanation;
                const expertDesired = isLatest ? report.expertExplanationDesiredResolution : round.expertExplanationDesiredResolution;
                const expertEvidence = isLatest ? report.expertExplanationEvidence : round.expertExplanationEvidence;

                const clientParsed = splitReason(clientDetails, clientReason);
                const expertParsed = splitReason(expertDetails, expertReason);

                return (
                <div key={idx} className="border border-border rounded-xl p-4 bg-secondary/50">
                  <h4 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">
                    Additional Explanation Round #{round.roundNumber}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Client additional submission */}
                    <div className="bg-accent-light/45 border border-accent/20 rounded-xl p-4 text-left">
                      <h5 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-accent"></span> Client
                      </h5>
                      {clientSubmitted ? (
                        <div className="space-y-2 text-xs">
                          <p className="text-foreground"><strong>Reason:</strong> {clientParsed.reason || "-"}</p>
                          <p className="text-foreground"><strong>Details:</strong> {clientParsed.details || "-"}</p>
                          <p className="text-foreground"><strong>Desired Resolution:</strong> {clientDesired || "-"}</p>
                          {normalizeEvidence(clientEvidence).length > 0 && (
                            <div className="pt-2 border-t border-accent/20 mt-2">
                              <strong className="text-muted-foreground block mb-1">Attached Documents:</strong>
                              <div className="space-y-1">
                                {normalizeEvidence(clientEvidence).map((e, eIdx) => (
                                  <a
                                    key={eIdx}
                                    href={e.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-accent hover:underline flex items-center gap-1 cursor-pointer font-medium"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    {e.fileName || e.name || `Document ${eIdx + 1}`}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground/70 italic">No additional explanation submitted yet...</p>
                      )}
                    </div>

                    {/* Expert additional submission */}
                    <div className="bg-warning-light/45 border border-warning/20 rounded-xl p-4 text-left">
                      <h5 className="text-xs font-semibold text-warning uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-warning"></span> Expert
                      </h5>
                      {expertSubmitted ? (
                        <div className="space-y-2 text-xs">
                          <p className="text-foreground"><strong>Reason:</strong> {expertParsed.reason || "-"}</p>
                          <p className="text-foreground"><strong>Details:</strong> {expertParsed.details || "-"}</p>
                          <p className="text-foreground"><strong>Desired Resolution:</strong> {expertDesired || "-"}</p>
                          {normalizeEvidence(expertEvidence).length > 0 && (
                            <div className="pt-2 border-t border-warning/20 mt-2">
                              <strong className="text-muted-foreground block mb-1">Attached Documents:</strong>
                              <div className="space-y-1">
                                {normalizeEvidence(expertEvidence).map((e, eIdx) => (
                                  <a
                                    key={eIdx}
                                    href={e.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-warning hover:underline flex items-center gap-1 cursor-pointer font-medium"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    {e.fileName || e.name || `Document ${eIdx + 1}`}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground/70 italic">No additional explanation submitted yet...</p>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
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
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={handleAdminApproveCancel}
                        disabled={actionLoading}
                        className="flex-1 h-10 px-4 bg-brand-primary text-primary-foreground rounded-lg hover:bg-brand-primary-hover disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Approve & forward to partner
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRejectModal(true)}
                        disabled={actionLoading}
                        className="flex-1 h-10 px-4 bg-destructive-light text-destructive hover:bg-destructive-light border border-destructive/20 rounded-lg disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject cancellation and lock cancellation feature
                      </button>
                    </div>
                  </div>
                )}
                {report.status === "Awaiting Partner" && (
                  <div className="p-4 bg-warning-light border border-warning/20 rounded-xl text-center text-warning font-medium">
                    Awaiting partner response to cancellation request...
                  </div>
                )}
                {report.status === "Returned" && (
                  <div className="p-4 bg-destructive-light border border-destructive/20 rounded-xl text-center text-destructive font-medium">
                    Partner rejected the cancellation. Request returned to the initiator.
                  </div>
                )}
                {(report.status === "Resolved" || report.status === "Accepted") && (
                  <div className="p-4 bg-success-light border border-success/20 rounded-xl text-center text-success font-medium">
                    Contract cancellation resolved successfully (Project is closed).
                  </div>
                )}
                {report.status === "Rejected" && (
                  <div className="p-4 bg-destructive-light border border-destructive/20 rounded-xl text-center text-destructive font-medium">
                    Contract cancellation was rejected/withdrawn (Project resumes).
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
                      className="flex-1 h-10 px-4 bg-brand-primary text-primary-foreground rounded-lg hover:bg-brand-primary-hover disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer"
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
                      className="flex-1 h-10 px-4 bg-destructive-light text-destructive hover:bg-destructive-light border border-destructive/20 rounded-lg disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer"
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

                {/* ---- Awaiting Both: Settle Options (only displayed when both responses are submitted) ---- */}
                {(report.status === "Awaiting Both" || (report.status === "Awaiting Evidence" && isDeadlineExpired)) && (() => {
                  const isEvidenceAwaiting = false; // Awaiting Both = both submitted -> no lock
                  return (
                    <div className="space-y-4">
                      <div className="text-left">
                        <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                          Settle Decision:
                        </p>
                        <div className="flex flex-wrap gap-3">
                          <>
                            <button
                              type="button"
                              onClick={() => setShowContinueModal(true)}
                              disabled={actionLoading || isEvidenceAwaiting}
                              className="h-10 px-4 bg-success text-primary-foreground rounded-lg hover:bg-success/85 disabled:opacity-55 disabled:cursor-not-allowed text-sm font-medium inline-flex items-center justify-center gap-2 transition cursor-pointer"
                            >
                              <Play className="w-4 h-4" />
                              Continue Project
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowStopModal(true)}
                              disabled={actionLoading || isEvidenceAwaiting}
                              className="h-10 px-4 bg-destructive text-primary-foreground rounded-lg hover:bg-destructive disabled:opacity-55 disabled:cursor-not-allowed text-sm font-medium inline-flex items-center justify-center gap-2 transition cursor-pointer"
                            >
                              <StopCircle className="w-4 h-4" />
                              Stop and Release Payment
                            </button>
                          </>
                          <button
                            type="button"
                            onClick={() => setShowRequestBothModal(true)}
                            disabled={actionLoading || isEvidenceAwaiting}
                            className="h-10 px-4 bg-warning text-primary-foreground rounded-lg hover:bg-warning/90 disabled:opacity-55 disabled:cursor-not-allowed text-sm font-medium inline-flex items-center justify-center gap-2 transition cursor-pointer"
                          >
                            <MessageCircle className="w-4 h-4" />
                            Submit both (Request additional)
                          </button>
                        </div>
                        {isEvidenceAwaiting ? (
                          <p className="text-[11px] text-destructive font-semibold bg-destructive-light border border-destructive/20 p-2.5 rounded-xl mt-3 text-left leading-normal">
                            Warning: Verdict buttons are locked until both parties submit additional evidence or the 48-hour deadline expires.
                          </p>
                        ) : report.status === "Awaiting Evidence" && isDeadlineExpired && (
                          <p className="text-[11px] text-success font-semibold bg-success-light border border-success/20 p-2.5 rounded-xl mt-3 text-left leading-normal">
                            Done Evidence submission deadline expired. Arbitrator can now make a verdict based on available evidence.
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
              <div className="p-4 bg-secondary rounded-lg text-center border border-border-light">
                <p className="text-sm font-semibold text-foreground">
                  {isResolved
                    ? `Resolved - ${report.resolution === "force_payout"
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
                  <p className="text-xs text-muted-foreground mt-2 border-t border-border-light pt-2 italic">
                    Notes: {report.adminNote}
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
        title={report?.disputeType === "cancellation" ? "Reject cancellation and lock cancellation feature" : "Reject Report"}
        description={report?.disputeType === "cancellation" ? "Please enter the reason for rejecting this contract cancellation request." : "Please enter the rejection reason. A notification will be sent to the Expert."}
        confirmLabel={report?.disputeType === "cancellation" ? "Reject" : "Reject"}
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
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-destructive resize-vertical ${rejectReasonError ? "border-destructive/35" : "border-input"
            }`}
          disabled={actionLoading}
        />
        {rejectReasonError && (
          <p className="text-xs text-destructive mt-1">{rejectReasonError}</p>
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
            <label className="block text-sm font-medium text-foreground mb-1">
              Final Decision Reason <span className="text-destructive">*</span>
            </label>
            <textarea
              value={stopReason}
              onChange={(e) => {
                setStopReason(e.target.value);
                if (stopReasonError) setStopReasonError("");
              }}
              placeholder="Enter reason for stopping the project..."
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-destructive resize-vertical ${stopReasonError ? "border-destructive/35" : "border-input"
                }`}
              disabled={actionLoading}
            />
            {stopReasonError && (
              <p className="text-xs text-destructive mt-1">{stopReasonError}</p>
            )}
          </div>

          {/* Money handling */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Handle Escrow Funds:
            </label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-secondary transition">
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
              <label className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-secondary transition">
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
        title={
          evidenceTarget === "client"
            ? "Request Client to submit additional evidence"
            : evidenceTarget === "expert"
              ? "Request Expert to submit additional evidence"
              : "Request both parties to submit additional explanation"
        }
        description={
          evidenceTarget === "client"
            ? "Send notification requesting Client to provide additional evidence/explanation. Response deadline extended by 48 hours."
            : evidenceTarget === "expert"
              ? "Send notification requesting Expert to provide additional evidence/explanation. Response deadline extended by 48 hours."
              : "Request both Client and Expert to submit updated explanations and additional evidence. Response deadline extended by 48 hours."
        }
        confirmLabel="Send Request"
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
              ? "Enter detailed reason/request for Client to provide additional evidence..."
              : evidenceTarget === "expert"
                ? "Enter detailed reason/request for Expert to provide additional evidence..."
                : "Enter detailed reason/request for both parties to provide additional explanations..."
          }
          rows={3}
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-brand-primary resize-vertical ${evidenceNoteError ? "border-destructive/35" : "border-input"
            }`}
          disabled={actionLoading}
        />
        {evidenceNoteError && (
          <p className="text-xs text-destructive mt-1">{evidenceNoteError}</p>
        )}
      </ConfirmationModal>

      {/* Force Payout Modal */}
      <ConfirmationModal
        open={showForcePayoutModal}
        onOpenChange={setShowForcePayoutModal}
        title="Force Payout"
        description="Decision to force release the entire escrow funds to the Expert. Project status will change to Completed."
        confirmLabel="Done Confirm Force Payout"
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
          placeholder="Enter reason for force payout..."
          rows={3}
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-brand-primary resize-vertical ${forceReasonError ? "border-destructive/35" : "border-input"
            }`}
          disabled={actionLoading}
        />
        {forceReasonError && (
          <p className="text-xs text-destructive mt-1">{forceReasonError}</p>
        )}
      </ConfirmationModal>

      {/* Force Refund Modal */}
      <ConfirmationModal
        open={showForceRefundModal}
        onOpenChange={setShowForceRefundModal}
        title="Force Refund"
        description="Decision to force refund the entire escrow funds to the Client. Project status will change to Cancelled."
        confirmLabel="Confirm Force Refund"
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
          placeholder="Enter reason for force refund..."
          rows={3}
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-destructive resize-vertical ${forceReasonError ? "border-destructive/35" : "border-input"
            }`}
          disabled={actionLoading}
        />
        {forceReasonError && (
          <p className="text-xs text-destructive mt-1">{forceReasonError}</p>
        )}
      </ConfirmationModal>

      {/* Request Both Additional Modal */}
      <ConfirmationModal
        open={showRequestBothModal}
        onOpenChange={setShowRequestBothModal}
        title="Request Additional Explanation from Both Parties"
        description="Admin requests both Client and Expert to submit updated explanations and additional evidence. The response deadline for both will be extended by 48 hours."
        confirmLabel="Done Send Explanation Request"
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
          placeholder="Enter detailed request/reason for additional explanations to be sent to both parties..."
          rows={3}
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-brand-primary resize-vertical ${requestBothNoteError ? "border-destructive/35" : "border-input"
            }`}
          disabled={actionLoading}
        />
        {requestBothNoteError && (
          <p className="text-xs text-destructive mt-1">{requestBothNoteError}</p>
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
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground/70" />}
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
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

export default AdminReportDetail;
