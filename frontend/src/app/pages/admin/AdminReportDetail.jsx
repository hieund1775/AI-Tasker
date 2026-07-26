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
import api, { enrichFileUrl } from "../../../services/api.js";
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
  "Pending Admin": { color: "bg-yellow-100 text-yellow-700 border border-yellow-200", label: "Pending Admin" },
  Pending: { color: "bg-yellow-100 text-yellow-700 border border-yellow-200", label: "Pending Admin" },
  "Awaiting Expert": { color: "bg-amber-100 text-amber-700 border border-amber-200", label: "Awaiting Expert" },
  "Awaiting Client": { color: "bg-blue-100 text-blue-700 border border-blue-200", label: "Awaiting Client" },
  "Awaiting Evidence": { color: "bg-purple-100 text-purple-700 border border-purple-200", label: "Awaiting Evidence" },
  "Awaiting Both": { color: "bg-purple-100 text-purple-700 border border-purple-200", label: "Awaiting Both Sides" },
  "Awaiting Partner": { color: "bg-amber-100 text-amber-700 border border-amber-200", label: "Awaiting Partner" },
  Returned: { color: "bg-rose-100 text-rose-700 border border-rose-200", label: "Returned" },
  Resolved: { color: "bg-green-100 text-green-700 border border-green-200", label: "Resolved" },
  Accepted: { color: "bg-green-100 text-green-700 border border-green-200", label: "Resolved" },
  Rejected: { color: "bg-red-100 text-red-700 border border-red-200", label: "Rejected" },
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
      const cleanName = trimmed.split("/").pop().replace(/^[a-f0-9-]{36}_/i, "").replace(/^\d+[-_]/, "") || "Evidence File";
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
      const cleanName = rawName.replace(/^[a-f0-9-]{36}_/i, "").replace(/^[a-f0-9]{24,32}_/i, "").replace(/^\d+[-_]/, "");
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

export function AdminReportDetail() {
  const { id } = useParams();
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

    const enriched = fileUrl.startsWith("http") ? fileUrl : enrichFileUrl(fileUrl);
    const rawName = fileName || fileUrl.split("?")[0].split("/").pop() || "evidence_document";
    const cleanName = rawName.replace(/^[a-f0-9-]{36}_/i, "").replace(/^[a-f0-9]{24,32}_/i, "").replace(/^\d+[-_]/, "");

    fetch(enriched)
      .then((res) => res.blob())
      .then((blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = cleanName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(blobUrl);
      })
      .catch(() => {
        window.open(enriched, "_blank");
      });
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
    const staffId = user?.id || user?.Id || JSON.parse(sessionStorage.getItem("aitasker_user_info") || localStorage.getItem("aitasker_user_info") || "{}")?.id;
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
      // BACKUP explanation to localStorage BEFORE being overwritten in Backend
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
        // Initial round exists (Round 1), so this next submission freezes the previous round (Rounds 2, 3...)
        const existingRounds = JSON.parse(localStorage.getItem(`dispute_rounds_history_${id}`) || "[]");
        const nextRoundNumber = existingRounds.length + 1;

        const newHistoryRound = {
          round: nextRoundNumber,
          adminNote: report?.adminNote || "Additional explanation requested",
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

      // Override status and save locally
      const forcePayoutProjId = String(report?.projectId).toLowerCase();
      localStorage.setItem(`project_status_${report?.projectId}`, "cancelled");
      localStorage.setItem(`project_status_${forcePayoutProjId}`, "cancelled");
      localStorage.setItem(`report_status_${id}`, "Resolved");
      // Store dispute verdict data dynamically (JSON — no hardcoded logic on display side)
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
        reporterName: report?.reporterName || report?.clientName || report?.expertName || "Plaintiff",
        projectTitle: report?.projectTitle || report?.projectName || "Project",
        deadline: "48 hours",
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
    const staffId = user?.id || user?.Id || JSON.parse(sessionStorage.getItem("aitasker_user_info") || localStorage.getItem("aitasker_user_info") || "{}")?.id;
    try {
      const isCancellation = report?.reportType === "cancellation" || report?.disputeType === "cancellation";
      if (isCancellation) {
        // For cancellation: Call approve cancellation to forward to partner
        await api.put(`/reports/${id}/admin-approve-cancel`);
        showToast("Cancellation request approved and forwarded to partner.");
      } else {
        // For standard financial Dispute: force split verdict
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
        const projectTitle = report?.projectTitle || report?.projectName || "Project";
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
              amount: platformFee,
              sourceWalletId: report?.clientId,
              reportId: id,
              status: "completed",
              type: "PlatformFee",
              transactionType: "PlatformFee",
              description: `platform fee -5%`,
            });
          } catch (feeErr) { }
          showToast(`Full project amount (minus 5% system fee) has been refunded to Client.`);
          notifyDisputeResolved({ userId: report?.clientId, userRole: "client", projectTitle, resolution: "Client refunded (-5% fee)", projectId: report?.projectId }).catch(() => { });
          notifyDisputeResolved({ userId: report?.expertId, userRole: "expert", projectTitle, resolution: "Client refunded (-5% fee)", projectId: report?.projectId }).catch(() => { });
          const cancellationMetadata = JSON.stringify({
            expertPayout: 0,
            expertFee: 0,
            clientRefund: escrowTotal,
            clientFee: platformFee,
            isEscalatedVerdict: false,
            verdictType: "client_refund"
          });
          try {
            await api.projects.updateStatus(report?.projectId, "Cancelled");
            await api.projects.updateMetadata(report?.projectId, cancellationMetadata);
          } catch(e) { console.warn("Backend update status/metadata failed", e); }
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
              amount: platformFee,
              sourceWalletId: report?.expertId,
              reportId: id,
              status: "completed",
              type: "PlatformFee",
              transactionType: "PlatformFee",
              description: `platform fee -5%`,
            });
          } catch (feeErr) { }
          showToast(`Full project amount (minus 5% system fee) has been released to Expert.`);
          notifyDisputeResolved({ userId: report?.expertId, userRole: "expert", projectTitle, resolution: "Expert paid (-5% fee)", projectId: report?.projectId }).catch(() => { });
          notifyDisputeResolved({ userId: report?.clientId, userRole: "client", projectTitle, resolution: "Expert paid (-5% fee)", projectId: report?.projectId }).catch(() => { });
          const cancellationMetadata = JSON.stringify({
            expertPayout: escrowTotal,
            expertFee: platformFee,
            clientRefund: 0,
            clientFee: 0,
            isEscalatedVerdict: false,
            verdictType: "expert_paid"
          });
          try {
            await api.projects.updateStatus(report?.projectId, "Cancelled");
            await api.projects.updateMetadata(report?.projectId, cancellationMetadata);
          } catch(e) { console.warn("Backend update status/metadata failed", e); }
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
  // Escalated Cancellation Binding Verdict Handler (Round 2+)
  // -----------------------------------------------------------------------
  const handleExecuteEscalatedVerdict = useCallback(async (verdictType) => {
    setActionLoading(true);
    try {
      const escrowTotal = report?.amount || report?.escrowAmount || 0;
      const progressPercent = report?.payoutBreakdown?.progressPercent ?? 30;
      const progressRate = progressPercent / 100;
      const projectTitle = report?.projectTitle || report?.projectName || "Project";

      if (verdictType === "reject_lock") {
        // Reject cancellation request and lock
        try {
          await api.put(`/reports/${id}/admin-reject-cancel`, {
            adminNote: "Admin rejected cancellation request and locked future requests.",
          });
        } catch (e) {
          console.warn("Backend admin-reject-cancel failed, using frontend fallback...", e);
        }
        localStorage.setItem(`project_status_${report?.projectId}`, "inprogress");
        localStorage.setItem(`cancel_locked_${report?.projectId}`, "true");
        localStorage.setItem(`report_status_${id}`, "Rejected");

        showToast("Cancellation request rejected and cancellation locked for this project.");
        notifyDisputeResolved({ userId: report?.clientId, userRole: "client", projectTitle, resolution: "Cancellation request rejected. Contract resumes.", projectId: report?.projectId }).catch(() => { });
        notifyDisputeResolved({ userId: report?.expertId, userRole: "expert", projectTitle, resolution: "Cancellation request rejected. Contract resumes.", projectId: report?.projectId }).catch(() => { });
      } else {
        // Cancel project and split funds
        const platformFee = Math.round(escrowTotal * 0.05);
        const penaltyFee = Math.round(escrowTotal * 0.10);
        const progressAmount = Math.round(escrowTotal * progressRate);

        let expertPayout = 0;
        let clientRefund = 0;

        if (verdictType === "client_fault") {
          // Client Fault: Client penalized 10% -> paid to Expert
          expertPayout = progressAmount + penaltyFee;
          clientRefund = escrowTotal - expertPayout - platformFee;
        } else if (verdictType === "expert_fault") {
          // Expert Fault: Expert penalized 10% -> paid to Client
          expertPayout = Math.max(0, progressAmount - penaltyFee - platformFee);
          clientRefund = escrowTotal - expertPayout - platformFee;
        } else if (verdictType === "split_fault") {
          // Split Fault: No compensation
          expertPayout = progressAmount;
          clientRefund = escrowTotal - expertPayout - platformFee;
        }

        // Execute wallet fund transfer
        try {
          let releaseSucceeded = false;
          try {
            await api.payments.releaseEscrow({ projectId: report?.projectId });
            releaseSucceeded = true;
          } catch (e) {
            console.warn("Escrow release endpoint failed inside escalated verdict, falling back to direct transfers...", e);
          }

          if (releaseSucceeded) {
            // releaseEscrow already credited escrowTotal to Expert Wallet. 5% system platformFee also deducted.
            // Therefore, we compute the precise offset difference:
            const diffExpert = expertPayout - escrowTotal + platformFee;
            if (diffExpert !== 0) {
              try {
                if (diffExpert > 0) {
                  await api.payments.depositWallet(report?.expertId, diffExpert);
                } else {
                  await api.payments.withdraw(report?.expertId, Math.abs(diffExpert));
                }
              } catch (expertErr) {
                console.warn("Expert wallet compensation failed:", expertErr);
              }
            }

            // Client receives 0 from releaseEscrow, so we deposit clientRefund
            if (clientRefund > 0) {
              try {
                await api.payments.depositWallet(report?.clientId, clientRefund);
              } catch (clientErr) {
                console.warn("Client wallet compensation failed:", clientErr);
              }
            }
          } else {
            // Fallback: if releaseEscrow fails, deposit directly
            if (expertPayout > 0) {
              try {
                await api.payments.depositWallet(report?.expertId, expertPayout);
              } catch (expertErr) {
                console.warn("Direct expert payout failed:", expertErr);
              }
            }
            if (clientRefund > 0) {
              try {
                await api.payments.depositWallet(report?.clientId, clientRefund);
              } catch (clientErr) {
                console.warn("Direct client refund failed:", clientErr);
              }
            }
          }

          if (platformFee > 0) {
            try {
              await api.post("/interactions/transaction", {
                projectId: report?.projectId,
                amount: platformFee,
                sourceWalletId: report?.clientId,
                reportId: id,
                status: "completed",
                type: "PlatformFee",
                transactionType: "PlatformFee",
                description: `platform fee -5%`,
              });
            } catch (feeErr) { console.warn("Admin escalated platform fee transaction failed:", feeErr); }
          }
        } catch (moneyErr) {
          console.warn("Escalated money distribution api failed, using fallback...", moneyErr);
        }

        // Save status with lowercase ID to avoid casing mismatch
        const projIdLower = String(report?.projectId).toLowerCase();
        // Save metadata to backend
        const cancellationMetadata = JSON.stringify({
          expertPayout: expertPayout,
          clientRefund: clientRefund,
          isEscalatedVerdict: true,
          verdictType: verdictType
        });
        
        try {
          await api.projects.updateStatus(report?.projectId, "Cancelled");
          await api.projects.updateMetadata(report?.projectId, cancellationMetadata);
        } catch (e) {
          console.warn("Backend update status/metadata failed", e);
        }
        localStorage.setItem(`report_status_${id}`, "Resolved");

        showToast(`Dispute resolved (${verdictType}). Funds have been split.`);
        notifyDisputeResolved({ userId: report?.clientId, userRole: "client", projectTitle, resolution: `Contract cancelled. Refunded: ${clientRefund.toLocaleString()} VND.`, projectId: report?.projectId }).catch(() => { });
        notifyDisputeResolved({ userId: report?.expertId, userRole: "expert", projectTitle, resolution: `Contract cancelled. Payout: ${expertPayout.toLocaleString()} VND.`, projectId: report?.projectId }).catch(() => { });
      }

      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
      fetchReport();
    } catch (err) {
      showToast(err.message || "Error resolving contract cancellation dispute.");
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
        <BackButton fallback={window.location.pathname.startsWith("/owner") ? "/owner/reports" : "/admin/disputes"} className="mb-6">
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
      <BackButton fallback={window.location.pathname.startsWith("/owner") ? "/owner/reports" : "/admin/disputes"} className="mb-4">
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
              <p className="text-sm font-bold font-sans">DISPUTE EXPLANATION PERIOD</p>
              <p className="text-xs text-red-755 font-sans mt-0.5">
                Defendant has up to 48 hours to submit an explanation. Status: <strong>{report.status}</strong>.
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
                Default Settle
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
              <p className="text-sm font-bold font-sans">EVIDENCE SUBMISSION PERIOD (48 HOURS)</p>
              <p className="text-xs text-purple-700 font-sans mt-0.5">
                Both parties must submit additional evidence. Status: <strong>{report.status}</strong>.
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
              {report.evidence && report.evidence.length > 0 && (
                <div>
                  <strong className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Attached Documents:</strong>
                  <span className="text-brand-primary underline flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    {report.evidence[0].fileName}
                  </span>
                </div>
              )}

              <div className="border-t border-border pt-4">
                <strong className="text-muted-foreground block text-xs uppercase tracking-wider mb-2">Escrow Split Proposal:</strong>
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
                        <div className="flex justify-between"><span className="text-muted-foreground">Requested By:</span><span className="font-semibold text-blue-600">{isClientReporter ? "Client" : "Expert"}</span></div>
                        <div className="border-t border-border my-1.5" />
                        <div className="flex justify-between"><span className="text-muted-foreground">Platform fee (collected by system):</span><span className="font-semibold text-orange-500">5% → <MoneyDisplay amount={platformFee} /></span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Cancellation penalty fee:</span><span className="font-semibold text-red-500">10% → <MoneyDisplay amount={penaltyFee} /></span></div>
                        <div className="border-t border-border my-1.5" />
                        {isClientReporter ? (
                          <>
                            <div className="flex justify-between font-semibold"><span className="text-foreground">Payout to Expert (progress + penalty):</span><span className="text-amber-600"><MoneyDisplay amount={expertPayout} /></span></div>
                            <div className="flex justify-between font-semibold"><span className="text-foreground">Refund to Client:</span><span className="text-green-600"><MoneyDisplay amount={clientRefund} /></span></div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between font-semibold"><span className="text-foreground">Payout to Expert (progress - penalty - fee):</span><span className="text-amber-600"><MoneyDisplay amount={expertPayout} /></span></div>
                            <div className="flex justify-between font-semibold"><span className="text-foreground">Refund to Client:</span><span className="text-green-600"><MoneyDisplay amount={clientRefund} /></span></div>
                          </>
                        )}
                      </div>
                    );
                  }

                  // === ESCALATED SCENARIOS ===
                  // Scenario 1: Client Fault
                  // Expert receives: progress + penalty
                  // Client receives: total - platform fee - expert payout
                  const expertPayoutClientFault = progressAmount + penaltyFee;
                  const clientRefundClientFault = escrowTotal - platformFee - expertPayoutClientFault;

                  // Scenario 2: Expert Fault
                  // Expert receives: progress - penalty - platform fee
                  // Client receives: total - expert payout - platform fee
                  const expertPayoutExpertFault = Math.max(0, progressAmount - penaltyFee - platformFee);
                  const clientRefundExpertFault = escrowTotal - expertPayoutExpertFault - platformFee;

                  // Scenario 3: Split Fault (no penalties)
                  // Expert receives progress payout, Client receives the rest (minus platform fee)
                  const expertPayoutSplitFault = progressAmount;
                  const clientRefundSplitFault = escrowTotal - platformFee - progressAmount;

                  return (
                    <div className="space-y-4 p-4 bg-muted/30 border border-border rounded-xl text-xs max-w-lg">
                      <div className="space-y-1.5">
                        <div className="flex justify-between"><span className="text-muted-foreground">Contract Value:</span><span className="font-semibold text-foreground"><MoneyDisplay amount={escrowTotal} /></span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Current progress:</span><span className="font-semibold text-foreground">{progress}%</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Platform fee (First deduction 5%):</span><span className="font-semibold text-orange-600"><MoneyDisplay amount={platformFee} /></span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Violation penalty (10%):</span><span className="font-semibold text-red-500"><MoneyDisplay amount={penaltyFee} /></span></div>
                      </div>

                      <div className="border-t border-border pt-3 space-y-3">
                        <div>
                          <p className="font-bold text-red-650 mb-1">CASE 1: CLIENT FAULT</p>
                          <div className="pl-2 border-l-2 border-red-200 space-y-1">
                            <div className="flex justify-between"><span className="text-muted-foreground">Payout to Expert (progress + penalty):</span><span className="font-semibold text-amber-600"><MoneyDisplay amount={expertPayoutClientFault} /></span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Refund to Client:</span><span className="font-semibold text-green-600"><MoneyDisplay amount={clientRefundClientFault} /></span></div>
                          </div>
                        </div>

                        <div>
                          <p className="font-bold text-red-650 mb-1">CASE 2: EXPERT FAULT</p>
                          <div className="pl-2 border-l-2 border-amber-200 space-y-1">
                            <div className="flex justify-between"><span className="text-muted-foreground">Payout to Expert (progress - penalty - fee):</span><span className="font-semibold text-amber-600"><MoneyDisplay amount={expertPayoutExpertFault} /></span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Refund to Client:</span><span className="font-semibold text-green-600"><MoneyDisplay amount={clientRefundExpertFault} /></span></div>
                          </div>
                        </div>

                        <div>
                          <p className="font-bold text-slate-700 mb-1">CASE 3: SPLIT FAULT</p>
                          <div className="pl-2 border-l-2 border-slate-300 space-y-1">
                            <div className="flex justify-between"><span className="text-muted-foreground">Payout to Expert (progress):</span><span className="font-semibold text-amber-600"><MoneyDisplay amount={expertPayoutSplitFault} /></span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Refund to Client:</span><span className="font-semibold text-green-600"><MoneyDisplay amount={clientRefundSplitFault} /></span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {report.partnerRejectionReason && (
                <div className="border-t border-border pt-4">
                  <strong className="text-red-650 block text-xs uppercase tracking-wider">Partner declined cancellation with reason:</strong>
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl mt-2 font-medium text-red-800">
                    &quot;{report.partnerRejectionReason}&quot;
                  </div>
                  <p className="text-xs text-muted-foreground italic mt-1">The system has returned the cancellation request to the requester to decide (Accept or Respond).</p>
                </div>
              )}
            </div>
          </SectionCard>
        ) : (
          <>
            {/* 1. Archive of previous explanation rounds (Round 1, Round 2...) */}
            {(() => {
              const historyRounds = JSON.parse(localStorage.getItem(`dispute_rounds_history_${id}`) || "[]");
              if (historyRounds.length === 0) return null;

              return historyRounds.map((roundData) => (
                <SectionCard
                  key={roundData.round}
                  title={`Evidence & Explanation (Round ${roundData.round})`}
                  icon={FileText}
                  className="border-amber-200 bg-amber-50/10 mb-6"
                >
                  <div className="p-6 bg-card border border-border rounded-xl space-y-6 text-left text-sm font-sans">
                    {roundData.adminNote && (
                      <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs leading-relaxed font-sans">
                        <strong>Admin request details:</strong> &quot;{roundData.adminNote}&quot;
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Client side */}
                      <div className="p-4 bg-blue-50/30 border border-blue-100 rounded-xl space-y-3">
                        <h4 className="text-sm font-bold text-blue-800">Client - Explanation (Round {roundData.round})</h4>
                        <div className="space-y-2 break-words max-w-full">
                          <p className="text-sm text-gray-800 break-words"><strong className="text-gray-700">Reason:</strong> {roundData.client.reason || roundData.client.explanation || "—"}</p>
                          <p className="text-sm text-gray-800 break-words"><strong className="text-gray-700">Details:</strong> {roundData.client.explanation || "—"}</p>
                          <p className="text-sm text-gray-800 break-words"><strong className="text-gray-700">Desired Resolution:</strong> {roundData.client.desiredResolution || "—"}</p>

                          {normalizeEvidence(roundData.client.evidence).length > 0 && (
                            <div className="mt-3 pt-2 border-t border-blue-100/50">
                              <strong className="text-xs text-gray-500 block mb-1">Attached Evidence & Screenshots:</strong>
                              <div className="space-y-1.5 max-w-full overflow-hidden">
                                {normalizeEvidence(roundData.client.evidence).map((e, idx) => (
                                  <a
                                    key={idx}
                                    href={e.fileUrl}
                                    onClick={(ev) => handleDownloadFile(ev, e.fileUrl, e.fileName)}
                                    className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1.5 cursor-pointer font-medium max-w-full overflow-hidden"
                                    title={e.fileName}
                                  >
                                    <FileText className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate max-w-[260px] sm:max-w-[360px] block">{e.fileName || `Document ${idx + 1}`}</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Expert side */}
                      <div className="p-4 bg-purple-50/30 border border-purple-100 rounded-xl space-y-3">
                        <h4 className="text-sm font-bold text-purple-800">Expert - Explanation (Round {roundData.round})</h4>
                        <div className="space-y-2 break-words max-w-full">
                          <p className="text-sm text-gray-800 break-words"><strong className="text-gray-700">Reason:</strong> {roundData.expert.reason || roundData.expert.explanation || "—"}</p>
                          <p className="text-sm text-gray-800 break-words"><strong className="text-gray-700">Details:</strong> {roundData.expert.explanation || "—"}</p>
                          <p className="text-sm text-gray-800 break-words"><strong className="text-gray-700">Desired Resolution:</strong> {roundData.expert.desiredResolution || "—"}</p>

                          {normalizeEvidence(roundData.expert.evidence).length > 0 && (
                            <div className="mt-3 pt-2 border-t border-purple-100/50">
                              <strong className="text-xs text-gray-500 block mb-1">Attached Evidence & Screenshots:</strong>
                              <div className="space-y-1.5 max-w-full overflow-hidden">
                                {normalizeEvidence(roundData.expert.evidence).map((e, idx) => (
                                  <a
                                    key={idx}
                                    href={e.fileUrl}
                                    onClick={(ev) => handleDownloadFile(ev, e.fileUrl, e.fileName)}
                                    className="text-xs text-purple-600 hover:underline inline-flex items-center gap-1.5 cursor-pointer font-medium max-w-full overflow-hidden"
                                    title={e.fileName}
                                  >
                                    <FileText className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate max-w-[260px] sm:max-w-[360px] block">{e.fileName || `Document ${idx + 1}`}</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              ));
            })()}

            {/* 2. Latest Evidence & Explanation (from Backend) */}
            {initialRound && (() => {
              const historyRounds = JSON.parse(localStorage.getItem(`dispute_rounds_history_${id}`) || "[]");
              const currentRoundNumber = historyRounds.length + 1;
              return (
                <SectionCard
                  title={`Evidence & Explanation (Round ${currentRoundNumber})`}
                  icon={FileText}
                  className="border-amber-250 bg-amber-50/20 mb-6"
                >
                  <div className="p-6 bg-card border border-border rounded-xl space-y-6 text-left text-sm font-sans">
                    <div className="p-3 bg-amber-55 border border-amber-250 text-amber-900 rounded-lg text-xs leading-relaxed font-sans">
                      <strong>Admin request details:</strong> &quot;{report.adminNote || "Additional explanation requested"}&quot;
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Client side latest statement */}
                      <div className="p-4 bg-blue-50/30 border border-blue-100 rounded-xl space-y-3">
                        <h4 className="text-sm font-bold text-blue-800">Client - Explanation (Round {currentRoundNumber})</h4>
                        <div className="space-y-2 break-words max-w-full">
                          <p className="text-sm text-gray-800 break-words"><strong className="text-gray-700">Reason:</strong> {report.clientExplanationReason || report.clientExplanation || "—"}</p>
                          <p className="text-sm text-gray-800 break-words"><strong className="text-gray-700">Details:</strong> {report.clientExplanation || "Client has not submitted explanation yet..."}</p>
                          <p className="text-sm text-gray-800 break-words"><strong className="text-gray-700">Desired Resolution:</strong> {report.clientExplanationDesiredResolution || "—"}</p>

                          {normalizeEvidence(report.clientExplanationEvidence).length > 0 && (
                            <div className="mt-3 pt-2 border-t border-blue-100/50">
                              <strong className="text-xs text-gray-500 block mb-1">Attached Evidence & Screenshots:</strong>
                              <div className="space-y-1.5 max-w-full overflow-hidden">
                                {normalizeEvidence(report.clientExplanationEvidence).map((e, idx) => (
                                  <a
                                    key={idx}
                                    href={e.fileUrl}
                                    onClick={(ev) => handleDownloadFile(ev, e.fileUrl, e.fileName)}
                                    className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1.5 cursor-pointer font-medium max-w-full overflow-hidden"
                                    title={e.fileName}
                                  >
                                    <FileText className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate max-w-[260px] sm:max-w-[360px] block">{e.fileName || `Document ${idx + 1}`}</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Expert side latest statement */}
                      <div className="p-4 bg-purple-50/30 border border-purple-100 rounded-xl space-y-3">
                        <h4 className="text-sm font-bold text-purple-800">Expert - Explanation (Round {currentRoundNumber})</h4>
                        <div className="space-y-2 break-words max-w-full">
                          <p className="text-sm text-gray-800 break-words"><strong className="text-gray-700">Reason:</strong> {report.expertExplanationReason || report.expertExplanation || "—"}</p>
                          <p className="text-sm text-gray-800 break-words"><strong className="text-gray-700">Details:</strong> {report.expertExplanation || "Expert has not submitted explanation yet..."}</p>
                          <p className="text-sm text-gray-800 break-words"><strong className="text-gray-700">Desired Resolution:</strong> {report.expertExplanationDesiredResolution || "—"}</p>

                          {normalizeEvidence(report.expertExplanationEvidence).length > 0 && (
                            <div className="mt-3 pt-2 border-t border-purple-100/50">
                              <strong className="text-xs text-gray-500 block mb-1">Attached Evidence & Screenshots:</strong>
                              <div className="space-y-1.5 max-w-full overflow-hidden">
                                {normalizeEvidence(report.expertExplanationEvidence).map((e, idx) => (
                                  <a
                                    key={idx}
                                    href={e.fileUrl}
                                    onClick={(ev) => handleDownloadFile(ev, e.fileUrl, e.fileName)}
                                    className="text-xs text-purple-600 hover:underline inline-flex items-center gap-1.5 cursor-pointer font-medium max-w-full overflow-hidden"
                                    title={e.fileName}
                                  >
                                    <FileText className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate max-w-[260px] sm:max-w-[360px] block">{e.fileName || `Document ${idx + 1}`}</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              );
            })()}

            {(() => {
              const report = reportForPartiesInvolved; // Comprehensive shadowing for Parties Involved!
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
                                Reporter (Plaintiff)
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
                                  Awaiting explanation...
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
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Violation / Dispute Details</p>
                                    <div className="space-y-2 break-words max-w-full">
                                      <p className="text-sm text-gray-800 break-words"><strong className="text-gray-700">Reason:</strong> {report.reason}</p>
                                      <p className="text-sm text-gray-800 break-words"><strong className="text-gray-700">Details:</strong> {report.description}</p>
                                      <p className="text-sm text-gray-800 break-words"><strong className="text-gray-700">Desired Resolution:</strong> {report.desiredResolution}</p>

                                      {normalizeEvidence(report.evidence, report.evidenceUrl, report.EvidenceUrl, report.evidenceList, report.EvidenceList, report.attachmentUrl, report.attachment, report.clientEvidence).length > 0 && (
                                        <div className="mt-3 pt-2 border-t border-blue-100/50">
                                          <strong className="text-xs text-gray-500 block mb-1">Attached Evidence & Screenshots:</strong>
                                          <div className="space-y-1.5 max-w-full overflow-hidden">
                                            {normalizeEvidence(report.evidence, report.evidenceUrl, report.EvidenceUrl, report.evidenceList, report.EvidenceList, report.attachmentUrl, report.attachment, report.clientEvidence).map((e, idx) => (
                                              <a
                                                key={idx}
                                                href={e.fileUrl}
                                                onClick={(ev) => handleDownloadFile(ev, e.fileUrl, e.fileName)}
                                                className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1.5 cursor-pointer font-medium max-w-full overflow-hidden"
                                                title={e.fileName}
                                              >
                                                <FileText className="w-3.5 h-3.5 shrink-0" />
                                                <span className="truncate max-w-[260px] sm:max-w-[360px] block">{e.fileName || `Dispute Document ${idx + 1}`}</span>
                                                {e.note && <span className="text-gray-400 font-normal truncate max-w-[120px]">({e.note})</span>}
                                              </a>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Response Explanation Report</p>
                                    {report.clientExplanation ? (
                                      <div className="space-y-2 break-words max-w-full">
                                        <p className="text-sm text-gray-800 break-words"><strong className="text-gray-700">Reason:</strong> {report.clientExplanationReason || report.clientExplanation}</p>
                                        <p className="text-sm text-gray-800 break-words"><strong className="text-gray-700">Details:</strong> {report.clientExplanation}</p>
                                        <p className="text-sm text-gray-800 break-words"><strong className="text-gray-700">Desired Resolution:</strong> {report.clientExplanationDesiredResolution || "—"}</p>
                                        {normalizeEvidence(report.clientExplanationEvidence, report.clientEvidenceList, report.clientEvidence).length > 0 && (
                                          <div className="mt-2 text-xs text-gray-500 max-w-full overflow-hidden">
                                            <strong>Attached Documents:</strong>
                                            <div className="mt-1 space-y-1">
                                              {normalizeEvidence(report.clientExplanationEvidence, report.clientEvidenceList, report.clientEvidence).map((e, eIdx) => (
                                                <a
                                                  key={eIdx}
                                                  href={e.fileUrl}
                                                  onClick={(ev) => handleDownloadFile(ev, e.fileUrl, e.fileName)}
                                                  className="text-blue-600 hover:underline inline-flex items-center gap-1.5 cursor-pointer font-medium max-w-full overflow-hidden"
                                                  title={e.fileName}
                                                >
                                                  <FileText className="w-3.5 h-3.5 shrink-0" />
                                                  <span className="truncate max-w-[260px] sm:max-w-[360px] block">{e.fileName || `Document ${eIdx + 1}`}</span>
                                                  {e.note && <span className="text-gray-400 font-normal truncate max-w-[120px]">({e.note})</span>}
                                                </a>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="py-6 text-center text-gray-400">
                                        <p className="text-sm italic">Responder has not responded yet</p>
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
                                  Awaiting explanation...
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
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Dispute / Violation Details</p>
                                    <div className="space-y-2 break-words max-w-full">
                                      <p className="text-sm text-gray-800 break-words"><strong className="text-gray-700">Reason:</strong> {report.reason}</p>
                                      <p className="text-sm text-gray-800 break-words"><strong className="text-gray-700">Details:</strong> {report.description}</p>
                                      <p className="text-sm text-gray-800 break-words"><strong className="text-gray-700">Desired Resolution:</strong> {report.desiredResolution}</p>

                                      {normalizeEvidence(report.evidence, report.evidenceUrl, report.EvidenceUrl, report.evidenceList, report.EvidenceList, report.attachmentUrl, report.attachment, report.expertEvidence).length > 0 && (
                                        <div className="mt-3 pt-2 border-t border-purple-100/50">
                                          <strong className="text-xs text-gray-500 block mb-1">Attached Evidence & Screenshots:</strong>
                                          <div className="space-y-1.5 max-w-full overflow-hidden">
                                            {normalizeEvidence(report.evidence, report.evidenceUrl, report.EvidenceUrl, report.evidenceList, report.EvidenceList, report.attachmentUrl, report.attachment, report.expertEvidence).map((e, idx) => (
                                              <a
                                                key={idx}
                                                href={e.fileUrl}
                                                onClick={(ev) => handleDownloadFile(ev, e.fileUrl, e.fileName)}
                                                className="text-xs text-purple-600 hover:underline inline-flex items-center gap-1.5 cursor-pointer font-medium max-w-full overflow-hidden"
                                                title={e.fileName}
                                              >
                                                <FileText className="w-3.5 h-3.5 shrink-0" />
                                                <span className="truncate max-w-[260px] sm:max-w-[360px] block">{e.fileName || `Dispute Document ${idx + 1}`}</span>
                                                {e.note && <span className="text-gray-400 font-normal truncate max-w-[120px]">({e.note})</span>}
                                              </a>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Response Explanation Report</p>
                                    {report.expertExplanation ? (
                                      <div className="space-y-2 break-words max-w-full">
                                        <p className="text-sm text-gray-800 break-words"><strong className="text-gray-700">Reason:</strong> {report.expertExplanationReason || report.expertExplanation}</p>
                                        <p className="text-sm text-gray-800 break-words"><strong className="text-gray-700">Details:</strong> {report.expertExplanation}</p>
                                        <p className="text-sm text-gray-800 break-words"><strong className="text-gray-700">Desired Resolution:</strong> {report.expertExplanationDesiredResolution || "—"}</p>
                                        {normalizeEvidence(report.expertExplanationEvidence, report.expertEvidenceList, report.expertEvidence).length > 0 && (
                                          <div className="mt-2 text-xs text-gray-500 max-w-full overflow-hidden">
                                            <strong>Attached Documents:</strong>
                                            <div className="mt-1 space-y-1">
                                              {normalizeEvidence(report.expertExplanationEvidence, report.expertEvidenceList, report.expertEvidence).map((e, eIdx) => (
                                                <a
                                                  key={eIdx}
                                                  href={e.fileUrl}
                                                  onClick={(ev) => handleDownloadFile(ev, e.fileUrl, e.fileName)}
                                                  className="text-purple-600 hover:underline inline-flex items-center gap-1.5 cursor-pointer font-medium max-w-full overflow-hidden"
                                                  title={e.fileName}
                                                >
                                                  <FileText className="w-3.5 h-3.5 shrink-0" />
                                                  <span className="truncate max-w-[260px] sm:max-w-[360px] block">{e.fileName || `Document ${eIdx + 1}`}</span>
                                                  {e.note && <span className="text-gray-400 font-normal truncate max-w-[120px]">({e.note})</span>}
                                                </a>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="py-6 text-center text-gray-400">
                                        <p className="text-sm italic">Responder has not responded yet</p>
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

        {/* Form items for Additional Statements History */}
        {report.disputeType !== "cancellation" && report.additionalRounds && report.additionalRounds.length > 0 && (
          <SectionCard title="Additional Explanations from Both Parties" icon={FileText}>
            <div className="space-y-6">
              {report.additionalRounds.map((round, idx) => (
                <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                  <h4 className="text-sm font-bold text-gray-850 mb-3 border-b pb-2">
                    Additional Explanation Round #{round.roundNumber}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Client additional submission */}
                    <div className="bg-blue-50/20 border border-blue-100 rounded-xl p-4 text-left">
                      <h5 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span> Client
                      </h5>
                      {round.clientExplanation ? (
                        <div className="space-y-2 text-xs">
                          <p className="text-gray-700"><strong>Reason:</strong> {round.clientExplanationReason || "—"}</p>
                          <p className="text-gray-750"><strong>Details:</strong> {round.clientExplanation || "—"}</p>
                          <p className="text-gray-755"><strong>Desired Resolution:</strong> {round.clientExplanationDesiredResolution || "—"}</p>
                          {normalizeEvidence(round.clientExplanationEvidence).length > 0 && (
                            <div className="pt-2 border-t border-blue-100/50 mt-2">
                              <strong className="text-gray-500 block mb-1">Attached Documents:</strong>
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
                                    {e.fileName || e.name || `Document ${eIdx + 1}`}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No additional explanation submitted yet...</p>
                      )}
                    </div>

                    {/* Expert additional submission */}
                    <div className="bg-purple-50/20 border border-purple-100 rounded-xl p-4 text-left">
                      <h5 className="text-xs font-bold text-purple-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span> Expert
                      </h5>
                      {round.expertExplanation ? (
                        <div className="space-y-2 text-xs">
                          <p className="text-gray-700"><strong>Reason:</strong> {round.expertExplanationReason || "—"}</p>
                          <p className="text-gray-755"><strong>Details:</strong> {round.expertExplanation || "—"}</p>
                          <p className="text-gray-755"><strong>Desired Resolution:</strong> {round.expertExplanationDesiredResolution || "—"}</p>
                          {normalizeEvidence(round.expertExplanationEvidence).length > 0 && (
                            <div className="pt-2 border-t border-purple-100/50 mt-2">
                              <strong className="text-gray-500 block mb-1">Attached Documents:</strong>
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
                                    {e.fileName || e.name || `Document ${eIdx + 1}`}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No additional explanation submitted yet...</p>
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
                          <p className="font-bold">🚨 Binding Dispute (Contract Cancellation Round {report.attemptRound || 2} — Binding Verdict)</p>
                          <p className="mt-1">Cancellation escalated after partner's rejection. Select the verdict to split Escrow automatically:</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => handleExecuteEscalatedVerdict("client_fault")}
                            disabled={actionLoading}
                            className="h-11 px-4 bg-red-650 text-white rounded-[12px] hover:bg-red-700 font-semibold text-sm transition cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            ⚖️ Client Fault (Client penalized 10% → Paid to Expert)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExecuteEscalatedVerdict("expert_fault")}
                            disabled={actionLoading}
                            className="h-11 px-4 bg-orange-600 text-white rounded-[12px] hover:bg-orange-700 font-semibold text-sm transition cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            ⚖️ Expert Fault (Expert penalized 10% → Paid to Client)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExecuteEscalatedVerdict("split_fault")}
                            disabled={actionLoading}
                            className="h-11 px-4 bg-amber-600 text-white rounded-[12px] hover:bg-amber-700 font-semibold text-sm transition cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            ⚖️ Split Fault (Each party penalized 5%)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExecuteEscalatedVerdict("reject_lock")}
                            disabled={actionLoading}
                            className="h-11 px-4 bg-gray-600 text-white rounded-[12px] hover:bg-gray-700 font-semibold text-sm transition cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            🔒 Reject cancellation & Lock cancellation feature
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
                          Approve & forward to partner
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowRejectModal(true)}
                          disabled={actionLoading}
                          className="flex-1 h-11 px-5 bg-red-55 text-red-705 hover:bg-red-100 border border-red-200 rounded-[14px] disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject cancellation request
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {report.status === "Awaiting Partner" && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center text-amber-800 font-medium">
                    Awaiting partner response to cancellation request...
                  </div>
                )}
                {report.status === "Returned" && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center text-rose-750 font-medium">
                    Partner rejected the cancellation. Request returned to the initiator.
                  </div>
                )}
                {(report.status === "Resolved" || report.status === "Accepted") && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center text-green-700 font-medium">
                    Contract cancellation resolved successfully (Project is closed).
                  </div>
                )}
                {report.status === "Rejected" && (
                  <div className="p-4 bg-red-55/10 border border-red-200 rounded-xl text-center text-red-700 font-medium">
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

                {/* ---- Awaiting Both: Settle Options (only displayed when both responses are submitted) ---- */}
                {(report.status === "Awaiting Both" || (report.status === "Awaiting Evidence" && isDeadlineExpired)) && (() => {
                  const isEvidenceAwaiting = false; // Awaiting Both = both submitted -> no lock
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
                            Submit both (Request additional)
                          </button>
                        </div>
                        {isEvidenceAwaiting ? (
                          <p className="text-[11px] text-red-600 font-bold bg-red-50 border border-red-150 p-2.5 rounded-xl mt-3 text-left leading-normal">
                            ⚠ Verdict buttons are locked until both parties submit additional evidence or the 48-hour deadline expires.
                          </p>
                        ) : report.status === "Awaiting Evidence" && isDeadlineExpired && (
                          <p className="text-[11px] text-green-700 font-bold bg-green-50 border border-green-150 p-2.5 rounded-xl mt-3 text-left leading-normal">
                            ✓ Evidence submission deadline expired. Arbitrator can now make a verdict based on available evidence.
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
        title={report?.disputeType === "cancellation" ? "Reject cancellation request" : "Reject Report"}
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
        title="Force Payout"
        description="Decision to force release the entire escrow funds to the Expert. Project status will change to Completed."
        confirmLabel="✓ Confirm Force Payout"
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
        title="Force Refund"
        description="Decision to force refund the entire escrow funds to the Client. Project status will change to Cancelled."
        confirmLabel="✗ Confirm Force Refund"
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
        title="Request Additional Explanation from Both Parties"
        description="Admin requests both Client and Expert to submit updated explanations and additional evidence. The response deadline for both will be extended by 48 hours."
        confirmLabel="✓ Send Explanation Request"
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

