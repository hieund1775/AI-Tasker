// =============================================================================
// ClientProjectDetail — Project detail page for Client role.
//
// Features:
//   - View project details
//   - "Pay Project" button — pay full amount into escrow
//   - "Complete & Accept" button — accept work, release payment to Expert
//   - Dispute banner when project is Disputed
//   - Read-only mode when project is Disputed
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router";
import { Clock, DollarSign, User, ShieldCheck, CheckCircle, AlertTriangle } from "lucide-react";
import { ProjectTimelineManager } from "../../components/project/ProjectTimelineManager.jsx";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { BackButton } from "../../components/shared/BackButton.jsx";
import { ConfirmationModal } from "../../components/shared/ConfirmationModal.jsx";
import { DisputeBanner } from "../../components/shared/DisputeBanner.jsx";
import { toast } from "sonner";
import { payProjectToEscrow, releaseProjectMoneyToExpert } from "../../../services/escrowService.js";
import { deriveProjectDisplayStatus } from "../../lib/projectTimelineStore.js";
import { api } from "../../../services/api.js";
import { useAuth } from "../../hooks/useAuth.js";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  // Project data — loaded from API
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Escrow & payment state
  const [escrowPaid, setEscrowPaid] = useState(false);
  const [paymentReleased, setPaymentReleased] = useState(false);

  // Modal & loading state
  const [showPayModal, setShowPayModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Load project by id
  const loadProject = useCallback(async (isSilent = false) => {
    if (!user?.id || !id) return;
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const list = await api.projects.getByClient(user.id);
      const data = Array.isArray(list) ? list.find((p) => p.id === id) : null;
      if (data) {
        setProject(data);
        // Derive escrow/payment state from project data
        setEscrowPaid(data.escrowPaid || data.escrowStatus === "paid" || false);
        setPaymentReleased(data.paymentReleased || data.status === "completed" || false);
      } else {
        setError("not_found");
      }
    } catch (err) {
      console.error("Failed to load project details:", err);
      setError("load_failed");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    loadProject(false);
  }, [loadProject]);

  // Listen to DB update events to refresh UI in real-time
  useEffect(() => {
    const handleDbUpdate = () => {
      loadProject(true); // refresh silently in background
    };
    window.addEventListener("aitasker_db_update", handleDbUpdate);
    return () => {
      window.removeEventListener("aitasker_db_update", handleDbUpdate);
    };
  }, [loadProject]);

  // Derived display status
  const displayStatus = project
    ? deriveProjectDisplayStatus(project, { proposalCount: 0 })
    : null;

  const isDisputed = project?.status?.toLowerCase() === "disputed";

  // -----------------------------------------------------------------------
  // 1. Pay project to escrow
  // -----------------------------------------------------------------------
  const handlePayToEscrow = useCallback(async () => {
    setActionLoading(true);
    try {
      await payProjectToEscrow({
        projectId: id,
        amount: project?.budget || 0,
      });
      setEscrowPaid(true);
      setShowPayModal(false);
      toast.success(
        "Your project funds have been transferred to the platform's secure intermediary system.",
      );
      // Dispatch database update event to trigger refresh across Header / Billing / client pages
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    } catch (err) {
      toast.error(err.message || "Payment error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }, [id, project?.budget]);

  // -----------------------------------------------------------------------
  // 2. Accept work & release payment to Expert
  // -----------------------------------------------------------------------
  const handleAcceptAndRelease = useCallback(async () => {
    setActionLoading(true);
    try {
      await releaseProjectMoneyToExpert({
        projectId: id,
        amount: project?.budget || 0,
        expertId: project?.assignedExpertId || project?.expertId,
      });
      setPaymentReleased(true);
      setShowAcceptModal(false);
      toast.success(
        "Payment has been released to the Expert. Project is now complete.",
      );
      // Dispatch database update event to trigger refresh across Header / Billing / client pages
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    } catch (err) {
      toast.error(err.message || "Acceptance error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }, [id, project?.budget, project?.assignedExpertId, project?.expertId]);

  // -----------------------------------------------------------------------
  // Render: loading
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton fallback="/client/dashboard" className="mb-6">
          Back
        </BackButton>
        <div className="bg-white rounded-xl border border-gray-200 p-12 shadow-sm">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-64" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="flex gap-4">
              <div className="h-6 bg-gray-200 rounded w-32" />
              <div className="h-6 bg-gray-200 rounded w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render: error (load failed)
  // -----------------------------------------------------------------------
  if (error === "load_failed") {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton fallback="/client/dashboard" className="mb-6">
          Back
        </BackButton>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-gray-500">
            Unable to Load Project
          </h3>
          <p className="text-base text-gray-400 mt-1">
            An error occurred while loading project details. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render: project not found
  // -----------------------------------------------------------------------
  if (error === "not_found" || !project) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton fallback="/client/dashboard" className="mb-6">
          Back
        </BackButton>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-gray-500">
            Project Not Found
          </h3>
          <p className="text-base text-gray-400 mt-1">
            The project you are looking for may have been removed.
          </p>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Determine button states
  // -----------------------------------------------------------------------
  const canPayToEscrow = !escrowPaid && !isDisputed && !paymentReleased;
  const canAcceptWork =
    escrowPaid && !paymentReleased && !isDisputed && project?.assignedExpertId;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BackButton fallback="/client/dashboard" className="mb-6">
        Back
      </BackButton>

      {/* ---- Dispute banner ---- */}
      {isDisputed && <DisputeBanner className="mb-6" />}

      {/* ---- Project header ---- */}
      <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {project.title}
        </h1>
        <p className="text-gray-600 mb-4">{project.description}</p>
        <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-6">
          <span className="flex items-center gap-1">
            <DollarSign className="w-4 h-4" />
            Budget: <MoneyDisplay amount={project.budget} />
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Timeline gốc: {project.originalUseCaseDays || project.deadline || "—"} ngày
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Deadline: {project.deadline || "—"} ngày
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Status: {displayStatus}
          </span>
          {project.assignedExpertId && (
            <span className="flex items-center gap-1">
              <User className="w-4 h-4" />
              Expert Assigned
            </span>
          )}
        </div>

        {/* ---- Escrow status indicator ---- */}
        {escrowPaid && !paymentReleased && (
          <div className="mb-4 p-3 bg-brand-primary-light border border-blue-200 rounded-xl flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-primary" />
            <div>
              <p className="text-sm font-medium text-brand-primary">
                Funds Held / Project Active
              </p>
              <p className="text-sm text-brand-primary">
                <MoneyDisplay amount={project.budget} /> is securely held in the intermediary system.
              </p>
            </div>
          </div>
        )}

        {paymentReleased && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-700">
                Paid to Expert
              </p>
              <p className="text-sm text-green-600">
                Project is complete and payment has been released.
              </p>
            </div>
          </div>
        )}

        {/* ---- Action buttons ---- */}
        <div className="flex flex-wrap gap-3">
          {/* Pay to escrow button */}
          {canPayToEscrow && (
            <button
              type="button"
              onClick={() => setShowPayModal(true)}
              className="h-11 px-5 bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover font-semibold text-base inline-flex items-center gap-2 transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              Pay Project
            </button>
          )}

          {/* Already paid — disabled state */}
          {escrowPaid && !paymentReleased && !isDisputed && (
            <button
              type="button"
              disabled
              className="h-11 px-5 bg-gray-300 text-gray-500 rounded-[14px] font-semibold text-base inline-flex items-center gap-2 cursor-not-allowed"
            >
              <ShieldCheck className="w-4 h-4" />
              Funds Held / Project Active
            </button>
          )}

          {/* Accept work & release payment button */}
          {canAcceptWork && (
            <button
              type="button"
              onClick={() => setShowAcceptModal(true)}
              className="h-11 px-5 bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover font-semibold text-base inline-flex items-center gap-2 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Complete & Accept
            </button>
          )}

          {/* Already released */}
          {paymentReleased && (
            <button
              type="button"
              disabled
              className="h-11 px-5 bg-gray-300 text-gray-500 rounded-[14px] font-semibold text-base inline-flex items-center gap-2 cursor-not-allowed"
            >
              <CheckCircle className="w-4 h-4" />
              Completed
            </button>
          )}
        </div>
      </div>

      {/* ---- Timeline (hidden when disputed) ---- */}
      {isDisputed ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-gray-500 text-base">
            Project actions are temporarily locked during dispute resolution.
          </p>
        </div>
      ) : (
        <ProjectTimelineManager role="client" projectId={id} />
      )}

      {/* ================================================================== */}
      {/* PAYMENT CONFIRMATION MODAL                                          */}
      {/* ================================================================== */}
      <ConfirmationModal
        open={showPayModal}
        onOpenChange={setShowPayModal}
        title="Pay Project"
        description={
          <span>
            Are you sure you want to pay the full project amount of{" "}
            <strong>
              <MoneyDisplay amount={project?.budget || 0} />
            </strong>{" "}
            into the secure intermediary system?
          </span>
        }
        confirmLabel="Confirm Payment"
        variant="default"
        loading={actionLoading}
        onConfirm={handlePayToEscrow}
      />

      {/* ================================================================== */}
      {/* ACCEPTANCE CONFIRMATION MODAL                                       */}
      {/* ================================================================== */}
      <ConfirmationModal
        open={showAcceptModal}
        onOpenChange={setShowAcceptModal}
        title="Complete & Accept"
        description="Do you confirm that you are satisfied with the product and want to release payment to the Expert?"
        confirmLabel="Confirm & Release Payment"
        variant="default"
        loading={actionLoading}
        onConfirm={handleAcceptAndRelease}
      />
    </div>
  );
}

export default ProjectDetail;
