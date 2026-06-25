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
  Pending: { color: "bg-yellow-100 text-yellow-700", label: "Pending" },
  Accepted: { color: "bg-brand-primary-light text-brand-primary", label: "Accepted" },
  Rejected: { color: "bg-red-100 text-red-700", label: "Rejected" },
  "Under Review": { color: "bg-purple-100 text-purple-700", label: "Under Review" },
  Resolved: { color: "bg-green-100 text-green-700", label: "Resolved" },
  Closed: { color: "bg-gray-100 text-gray-700", label: "Closed" },
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

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const showToast = useCallback((message) => {
    setFeedback(message);
    setTimeout(() => setFeedback(null), 5000);
  }, []);

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
  const isUnderReview = report.status === "Under Review";
  const isResolved = report.status === "Resolved";
  const isClosed = report.status === "Closed";
  const isRejected = report.status === "Rejected";
  const canAct = isPending || isAccepted || isUnderReview;
  const canHandleMoney = isAccepted || isUnderReview;

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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-brand-primary-light rounded-lg border border-brand-primary/20">
                <p className="text-xs font-semibold text-brand-primary uppercase mb-1">
                  Client
                </p>
                <p className="text-sm font-medium">
                  {report.clientName || report.clientId || "—"}
                </p>
                {report.clientEmail && (
                  <p className="text-xs text-gray-500">{report.clientEmail}</p>
                )}
              </div>
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                <p className="text-xs font-semibold text-purple-700 uppercase mb-1">
                  Expert (Report Sender)
                </p>
                <p className="text-sm font-medium">
                  {report.expertName || report.expertId || "—"}
                </p>
                {report.expertEmail && (
                  <p className="text-xs text-gray-500">{report.expertEmail}</p>
                )}
              </div>
            </div>
          </SectionCard>

          {/* Report content */}
          <SectionCard title="Report Content" icon={AlertTriangle}>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Report Reason
                </p>
                <p className="text-sm text-gray-800">
                  {report.reason || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Detailed Description
                </p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {report.description || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Desired Resolution
                </p>
                <p className="text-sm text-gray-800">
                  {report.desiredResolution || "—"}
                </p>
              </div>
            </div>
          </SectionCard>

          {/* Evidence */}
          <SectionCard title="Evidence" icon={Eye}>
            {!report.evidence || report.evidence.length === 0 ? (
              <p className="text-sm text-gray-400">No evidence provided.</p>
            ) : (
              <div className="space-y-3">
                {report.evidence.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg"
                  >
                    <FileText className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">
                        {item.name || `Evidence ${idx + 1}`}
                      </p>
                      {item.note && (
                        <p className="text-xs text-gray-500 mt-0.5">
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
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sticky top-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Admin Actions
            </h3>

            {/* ---- Pending: Accept / Reject ---- */}
            {isPending && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShowAcceptModal(true)}
                  disabled={actionLoading}
                  className="w-full h-11 px-5 bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition"
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
                  className="w-full h-11 px-5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-[14px] disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition"
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

            {/* ---- Accepted / Under Review: Continue / Stop ---- */}
            {canHandleMoney && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleCreateChat}
                  disabled={actionLoading}
                  className="w-full h-11 px-5 bg-purple-600 text-white rounded-[14px] hover:bg-purple-700 disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MessageCircle className="w-4 h-4" />
                  )}
                  Create Dispute Chat
                </button>

                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs font-semibold text-gray-500 mb-3">
                    Final Decision:
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowContinueModal(true)}
                    disabled={actionLoading}
                    className="w-full h-11 px-5 bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition mb-2"
                  >
                    <Play className="w-4 h-4" />
                    Continue Project
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowStopModal(true)}
                    disabled={actionLoading}
                    className="w-full h-11 px-5 bg-red-600 text-white rounded-[14px] hover:bg-red-700 disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition"
                  >
                    <StopCircle className="w-4 h-4" />
                    Stop Project
                  </button>
                </div>
              </div>
            )}

            {/* ---- Resolved / Closed / Rejected: no actions ---- */}
            {(isResolved || isClosed || isRejected) && (
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-sm text-gray-500">
                  {isResolved
                    ? `Resolved — ${
                        report.moneyAction === "refund"
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* CONFIRMATION MODALS                                                */}
      {/* ================================================================== */}

      {/* Accept Report Modal */}
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
