// =============================================================================
// AdminReportDetail — Full dispute report detail & handling page.
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

const REPORT_STATUS_CONFIG = {
  "Pending Admin": { color: "bg-yellow-100 text-yellow-700 border border-yellow-200", label: "Pending Admin" },
  "Awaiting Expert": { color: "bg-amber-100 text-amber-700 border border-amber-200", label: "Awaiting Expert" },
  "Awaiting Client": { color: "bg-secondary text-secondary-foreground border border-border", label: "Awaiting Client" },
  "Awaiting Evidence": { color: "bg-purple-100 text-purple-700 border border-purple-200", label: "Awaiting Evidence" },
  Resolved: { color: "bg-green-100 text-green-700 border border-green-200", label: "Resolved" },
  Rejected: { color: "bg-red-100 text-red-700 border border-red-200", label: "Rejected" },
};

export function AdminReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Tab state
  const [activePartyTab, setActivePartyTab] = useState("reporter");

  // Modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showContinueModal, setShowContinueModal] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [showForcePayoutModal, setShowForcePayoutModal] = useState(false);
  const [showForceRefundModal, setShowForceRefundModal] = useState(false);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [stopReason, setStopReason] = useState("");
  const [moneyAction, setMoneyAction] = useState("refund");
  const [rejectReasonError, setRejectReasonError] = useState("");
  const [stopReasonError, setStopReasonError] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [evidenceNoteError, setEvidenceNoteError] = useState("");
  const [forceReason, setForceReason] = useState("");
  const [forceReasonError, setForceReasonError] = useState("");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getReportDetail(id);
      setReport(data);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleAcceptReport = async () => {
    setActionLoading(true);
    try {
      await acceptReport(id);
      setFeedback("Report accepted. Project is now Disputed.");
      setShowAcceptModal(false);
      fetchReport();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectReport = async () => {
    if (!rejectReason.trim()) { setRejectReasonError("Required"); return; }
    setActionLoading(true);
    try {
      await rejectReport(id, rejectReason.trim());
      setFeedback("Report rejected.");
      setShowRejectModal(false);
      fetchReport();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateChat = async () => {
    setActionLoading(true);
    try {
      await createDisputeChat(id);
      setFeedback("Dispute chat created.");
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleContinueProject = async () => {
    setActionLoading(true);
    try {
      await continueProject(id);
      setFeedback("Project continued.");
      setShowContinueModal(false);
      fetchReport();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopProject = async () => {
    if (!stopReason.trim()) { setStopReasonError("Required"); return; }
    setActionLoading(true);
    try {
      await stopProject(id, stopReason.trim(), moneyAction);
      if (moneyAction === "refund") await refundProjectMoneyToClient(id);
      else await releaseProjectMoneyToExpert(id);
      setFeedback("Project stopped and funds handled.");
      setShowStopModal(false);
      fetchReport();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleForcePayout = async () => {
    if (!forceReason.trim()) { setForceReasonError("Required"); return; }
    setActionLoading(true);
    try {
      await releaseProjectMoneyToExpert(id);
      setFeedback("Funds released to expert.");
      setShowForcePayoutModal(false);
      fetchReport();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleForceRefund = async () => {
    if (!forceReason.trim()) { setForceReasonError("Required"); return; }
    setActionLoading(true);
    try {
      await refundProjectMoneyToClient(id);
      setFeedback("Funds refunded to client.");
      setShowForceRefundModal(false);
      fetchReport();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestMoreEvidence = async () => {
    if (!evidenceNote.trim()) { setEvidenceNoteError("Required"); return; }
    setActionLoading(true);
    try {
      setFeedback("Evidence request sent.");
      setShowEvidenceModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-muted-foreground">Loading report...</p>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <BackButton fallback="/admin/disputes" className="mb-4">Back to Dispute List</BackButton>
        <p className="text-destructive">{error || "Report Not Found"}</p>
      </div>
    );
  }

  if (!report) return null;

  const isPending = report.status === "Pending Admin";
  const isResolved = report.status === "Resolved";
  const isRejected = report.status === "Rejected";
  const isType2 = report.reportType === "type2";
  const reporterLabel = report.reporterRole === "client" ? "Client" : "Expert";
  const responderLabel = report.reporterRole === "client" ? "Expert" : "Client";
  const reporterEmail = report.reporterRole === "client" ? report.clientEmail : report.expertEmail;
  const responderEmail = report.reporterRole === "client" ? report.expertEmail : report.clientEmail;
  const hasResponderResponded = report.responderResponse;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BackButton fallback="/admin/disputes" className="mb-4">Back to Dispute List</BackButton>

      {feedback && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {feedback}
        </div>
      )}

      <PageHeader
        title={report.reportName || report.projectTitle || `Report #${id}`}
        subtitle="Dispute Report Detail — review evidence, collect responses, and make a decision."
        status={<StatusBadge status={report.status} entity="report" />}
        className="mb-6"
      />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report Info */}
          <SectionCard title="Report Information">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Reason:</span><span className="text-foreground font-medium">{report.reason || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Description:</span><span className="text-foreground">{report.description || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Desired Resolution:</span><span className="text-foreground">{report.desiredResolution || "—"}</span></div>
              {report.amount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Escrow Amount:</span><span className="text-foreground font-semibold"><MoneyDisplay amount={report.amount || report.escrowAmount || 0} /></span></div>}
            </div>
          </SectionCard>

          {/* Evidence */}
          <SectionCard title="Evidence">
            {safeArray(report.evidence).length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No evidence submitted.</p>
            ) : (
              <div className="space-y-2">
                {safeArray(report.evidence).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-secondary rounded-lg">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{item.name || `Evidence ${idx + 1}`}</span>
                    {item.note && <span className="text-xs text-muted-foreground">— {item.note}</span>}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Parties tabs */}
          <SectionCard title="Parties">
            <div className="flex gap-2 mb-4">
              <button onClick={() => setActivePartyTab("reporter")} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activePartyTab === "reporter" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                {reporterLabel} (Reporter)
              </button>
              <button onClick={() => setActivePartyTab("responder")} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activePartyTab === "responder" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                {responderLabel}
              </button>
            </div>
            {activePartyTab === "reporter" ? (
              <div className="text-sm space-y-2">
                <p className="text-muted-foreground">{reporterEmail}</p>
                <p className="text-foreground whitespace-pre-wrap">{report.reporterExplanation || "No explanation provided."}</p>
              </div>
            ) : (
              <div className="text-sm space-y-2">
                <p className="text-muted-foreground">{responderEmail}</p>
                {hasResponderResponded ? (
                  <p className="text-foreground whitespace-pre-wrap">{report.responderExplanation || "No response provided."}</p>
                ) : (
                  <p className="text-muted-foreground italic">Waiting for response...</p>
                )}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Sidebar: Admin Actions */}
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sticky top-4">
            <h3 className="text-sm font-semibold text-foreground/80 mb-4">Admin Actions</h3>

            {isPending && (
              <div className="space-y-3">
                <button type="button" onClick={() => setShowAcceptModal(true)} disabled={actionLoading}
                  className="w-full h-11 px-5 bg-green-600 text-white rounded-[14px] hover:bg-green-700 disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer">
                  <CheckCircle className="w-4 h-4" /> Accept Report
                </button>
                <button type="button" onClick={() => setShowRejectModal(true)} disabled={actionLoading}
                  className="w-full h-11 px-5 bg-red-100 text-red-700 border border-red-200 rounded-[14px] disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer">
                  <XCircle className="w-4 h-4" /> Reject Report
                </button>
              </div>
            )}

            {report.status === "Pending Admin" && (
              <div className="space-y-3 mt-4 pt-4 border-t border-border/60">
                <button type="button" onClick={handleCreateChat} disabled={actionLoading}
                  className="w-full h-11 px-5 bg-muted text-foreground hover:bg-muted/80 border border-border rounded-[14px] disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer">
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                  Create Dispute Chat
                </button>
                <button type="button" onClick={() => setShowEvidenceModal(true)} disabled={actionLoading}
                  className="w-full h-11 px-5 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-[14px] disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer">
                  <AlertTriangle className="w-4 h-4" /> Request Evidence
                </button>
                <div className="border-t border-border/60 pt-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Settle Decision:</p>
                  {isType2 ? (
                    <div className="space-y-2">
                      <button type="button" onClick={() => setShowForcePayoutModal(true)} disabled={actionLoading}
                        className="w-full h-11 px-5 bg-green-600 text-white rounded-[14px] hover:bg-green-700 disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer">
                        Force Payout
                      </button>
                      <button type="button" onClick={() => setShowForceRefundModal(true)} disabled={actionLoading}
                        className="w-full h-11 px-5 bg-red-600 text-white rounded-[14px] hover:bg-red-700 disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer">
                        Force Refund
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button type="button" onClick={() => setShowContinueModal(true)} disabled={actionLoading}
                        className="w-full h-11 px-5 bg-brand-primary text-brand-primary-foreground rounded-[14px] hover:bg-brand-primary-hover disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer">
                        <Play className="w-4 h-4" /> Continue Project
                      </button>
                      <button type="button" onClick={() => setShowStopModal(true)} disabled={actionLoading}
                        className="w-full h-11 px-5 bg-red-100 text-red-700 border border-red-200 rounded-[14px] disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer">
                        <StopCircle className="w-4 h-4" /> Stop Project
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(isResolved || isRejected) && (
              <div className="p-4 bg-secondary/60 rounded-lg text-center mt-4 border border-border">
                <p className="text-sm font-semibold text-foreground/80">{isResolved ? "Resolved" : "Rejected"}</p>
                {report.adminNote && <p className="text-xs text-muted-foreground mt-2 border-t border-border/60 pt-2 italic">Note: {report.adminNote}</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ConfirmationModal open={showAcceptModal} onOpenChange={setShowAcceptModal}
        title="Accept Report" description="When you accept this report, the project will change to Disputed status."
        confirmLabel="Accept" variant="default" loading={actionLoading} onConfirm={handleAcceptReport} />

      <ConfirmationModal open={showRejectModal} onOpenChange={setShowRejectModal}
        title="Reject Report" description="Please enter the rejection reason."
        confirmLabel="Reject" variant="danger" loading={actionLoading} onConfirm={handleRejectReport}>
        <textarea value={rejectReason} onChange={(e) => { setRejectReason(e.target.value); if (rejectReasonError) setRejectReasonError(""); }}
          placeholder="Enter rejection reason..." rows={3} disabled={actionLoading}
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none resize-vertical ${rejectReasonError ? "border-red-300" : "border-input"}`} />
        {rejectReasonError && <p className="text-xs text-red-500 mt-1">{rejectReasonError}</p>}
      </ConfirmationModal>

      <ConfirmationModal open={showContinueModal} onOpenChange={setShowContinueModal}
        title="Continue Project" description="The project will be unlocked."
        confirmLabel="Continue Project" variant="default" loading={actionLoading} onConfirm={handleContinueProject} />

      <ConfirmationModal open={showStopModal} onOpenChange={setShowStopModal}
        title="Stop Project & Handle Funds" description="Enter decision reason and choose fund handling."
        confirmLabel={moneyAction === "refund" ? "Refund to Client" : "Release to Expert"}
        variant="danger" loading={actionLoading} onConfirm={handleStopProject}>
        <div className="space-y-4">
          <textarea value={stopReason} onChange={(e) => { setStopReason(e.target.value); if (stopReasonError) setStopReasonError(""); }}
            placeholder="Enter stop reason..." rows={3} disabled={actionLoading}
            className={`w-full px-3 py-2 border rounded-lg text-sm ${stopReasonError ? "border-red-300" : "border-input"}`} />
          {stopReasonError && <p className="text-xs text-red-500 mt-1">{stopReasonError}</p>}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="moneyAction" value="refund" checked={moneyAction === "refund"} onChange={() => setMoneyAction("refund")} />Refund to Client</label>
            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="moneyAction" value="release" checked={moneyAction === "release"} onChange={() => setMoneyAction("release")} />Release to Expert</label>
          </div>
        </div>
      </ConfirmationModal>

      <ConfirmationModal open={showEvidenceModal} onOpenChange={setShowEvidenceModal}
        title="Request More Evidence" description="Send a request for additional evidence."
        confirmLabel="Send Request" variant="default" loading={actionLoading} onConfirm={handleRequestMoreEvidence}>
        <textarea value={evidenceNote} onChange={(e) => { setEvidenceNote(e.target.value); if (evidenceNoteError) setEvidenceNoteError(""); }}
          placeholder="Enter request details..." rows={3} disabled={actionLoading}
          className={`w-full px-3 py-2 border rounded-lg text-sm ${evidenceNoteError ? "border-red-300" : "border-input"}`} />
        {evidenceNoteError && <p className="text-xs text-red-500 mt-1">{evidenceNoteError}</p>}
      </ConfirmationModal>

      <ConfirmationModal open={showForcePayoutModal} onOpenChange={setShowForcePayoutModal}
        title="Force Payout" description="Release escrow to expert."
        confirmLabel="Force Payout" variant="danger" loading={actionLoading} onConfirm={handleForcePayout}>
        <textarea value={forceReason} onChange={(e) => { setForceReason(e.target.value); if (forceReasonError) setForceReasonError(""); }}
          placeholder="Enter reason..." rows={3} disabled={actionLoading}
          className={`w-full px-3 py-2 border rounded-lg text-sm ${forceReasonError ? "border-red-300" : "border-input"}`} />
        {forceReasonError && <p className="text-xs text-red-500 mt-1">{forceReasonError}</p>}
      </ConfirmationModal>

      <ConfirmationModal open={showForceRefundModal} onOpenChange={setShowForceRefundModal}
        title="Force Refund" description="Refund escrow to client."
        confirmLabel="Force Refund" variant="danger" loading={actionLoading} onConfirm={handleForceRefund}>
        <textarea value={forceReason} onChange={(e) => { setForceReason(e.target.value); if (forceReasonError) setForceReasonError(""); }}
          placeholder="Enter reason..." rows={3} disabled={actionLoading}
          className={`w-full px-3 py-2 border rounded-lg text-sm ${forceReasonError ? "border-red-300" : "border-input"}`} />
        {forceReasonError && <p className="text-xs text-red-500 mt-1">{forceReasonError}</p>}
      </ConfirmationModal>
    </div>
  );
}

export default AdminReportDetail;
