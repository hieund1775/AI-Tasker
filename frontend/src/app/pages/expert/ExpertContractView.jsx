import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import {
  CheckCircle,
  XCircle,
  FileText,
  DollarSign,
  Calendar,
  User,
  Briefcase,
  ShieldCheck,
} from "lucide-react";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { BackButton } from "../../components/shared/BackButton.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import api from "../../../services/api.js";
import { toast } from "sonner";

/**
 * ExpertContractView — Expert views a contract in read-only mode.
 * Can Accept or Reject the contract.
 *
 * Route: /expert/contracts/:contractId
 */
export function ExpertContractView() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [contract, setContract] = useState(null);
  const [project, setProject] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!user?.id || !contractId) return;
    setLoading(true);

    async function loadData() {
      try {
        const contractRes = await api.contracts.getById(contractId).catch(() => null);
        if (!contractRes) {
          setContract(null);
          setLoading(false);
          return;
        }

        setContract(contractRes);

        // Load associated project
        if (contractRes.projectId) {
          try {
            const proj = await api.jobPosts.getById(contractRes.projectId);
            setProject(proj);
          } catch {
            console.warn("Failed to load project for contract");
          }
        }

        // Load client info
        if (contractRes.clientId) {
          try {
            const cli = await api.users.getById(contractRes.clientId);
            setClient(cli);
          } catch {
            console.warn("Failed to load client for contract");
          }
        }
      } catch (err) {
        console.error("Failed to load contract:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user?.id, contractId]);

  // ---- Accept ----
  const handleAccept = async () => {
    if (!contract) return;
    setActing(true);
    try {
      // Update contract status to accepted
      await api.contracts.updateStatus(contract.id, "accepted");

      // Update project status to In Progress
      if (contract.projectId) {
        try {
          await api.projects.updateStatus(contract.projectId, "In Progress");
        } catch (err) {
          console.warn("Failed to update project status:", err);
        }
      }

      toast.success("Contract accepted! The project is now in progress.");
      navigate("/expert/dashboard");
    } catch (err) {
      console.error("Failed to accept contract:", err);
      toast.error(err.message || "Failed to accept contract. Please try again.");
    } finally {
      setActing(false);
    }
  };

  // ---- Reject ----
  const handleReject = async () => {
    if (!contract) return;
    setActing(true);
    try {
      // Update contract status to rejected
      await api.contracts.updateStatus(contract.id, "rejected");

      // Send notification back to Client
      await api.notifications
        .send({
          receiverId: contract.clientId,
          type: "contract_rejected",
          title: "Contract rejected",
          message: `Expert has rejected the contract for project "${contract.projectTitle || "your project"}". Please update and resend it.`,
          targetUrl: `/client/contracts/create?projectId=${contract.projectId}&proposalId=${contract.proposalId}&expertId=${contract.expertId}`,
        })
        .catch(() => {
          console.warn("Failed to send rejection notification");
        });

      toast.info("Contract rejected. The Client will be notified.");
      navigate("/expert/dashboard");
    } catch (err) {
      console.error("Failed to reject contract:", err);
      toast.error(err.message || "Failed to reject contract. Please try again.");
    } finally {
      setActing(false);
    }
  };

  // ---- Loading ----
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton fallback="/expert/dashboard" className="mb-6">
          Back
        </BackButton>
        <div className="bg-white rounded-2xl border border-gray-200 p-12 shadow-sm text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  // ---- Not found ----
  if (!contract) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton fallback="/expert/dashboard" className="mb-6">
          Back
        </BackButton>
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-500 mb-2">
            Contract not found
          </h3>
          <p className="text-sm text-gray-400">
            This contract may have been removed or is no longer available.
          </p>
        </div>
      </div>
    );
  }

  const isPending = contract.status === "sent" || contract.status === "pending";
  const isAccepted =
    contract.status === "accepted" || contract.status === "signed";
  const isRejected = contract.status === "rejected";
  const hasAction = isPending;

  const useCases = contract.useCases || [];
  const deadlineText =
    contract.deadline != null
      ? typeof contract.deadline === "number" && contract.deadline < 1000
        ? `${contract.deadline} days`
        : new Date(contract.deadline).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
      : "N/A";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BackButton fallback="/expert/dashboard" className="mb-6">
        Back to Dashboard
      </BackButton>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-gray-100">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Contract Review
              </h1>
              <p className="text-gray-500 text-sm">
                Review the contract details below. This contract is read-only.
              </p>
            </div>
            {/* Status */}
            <div className="flex-shrink-0">
              {isPending && (
                <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm font-medium inline-flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  Pending Review
                </span>
              )}
              {isAccepted && (
                <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium inline-flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  Accepted
                </span>
              )}
              {isRejected && (
                <span className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-medium inline-flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" />
                  Rejected
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Contract Content — Read Only */}
        <div className="p-8 space-y-8">
          {/* Project Information */}
          <section>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
              Project Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Project Name</p>
                <p className="font-semibold text-gray-900">
                  {contract.projectTitle || project?.title || "—"}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Budget / Escrow</p>
                <p className="font-semibold text-gray-900">
                  <MoneyDisplay amount={contract.budget || project?.budget} />
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Deadline</p>
                <p className="font-semibold text-gray-900">{deadlineText}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <p className="font-semibold text-gray-900 capitalize">
                  {contract.status || "Unknown"}
                </p>
              </div>
            </div>
            <div className="mt-4 bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Project Description</p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {contract.projectDescription ||
                  project?.description ||
                  "No description."}
              </p>
            </div>
          </section>

          {/* Use Cases */}
          {useCases.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                Use Cases
              </h2>
              <div className="space-y-3">
                {useCases.map((uc, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                  >
                    <p className="font-semibold text-gray-900 text-sm mb-1">
                      {uc.name || `Use Case ${idx + 1}`}
                    </p>
                    {uc.description && (
                      <p className="text-sm text-gray-600">{uc.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Client Information */}
          <section>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
              Client Information
            </h2>
            <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {client?.fullName || "Client"}
                </p>
                <p className="text-sm text-gray-500">
                  {client?.email || ""}
                </p>
              </div>
            </div>
          </section>

          {/* Terms & Agreement (Read Only) */}
          <section>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
              Terms & Agreement
            </h2>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {contract.terms || "No terms specified."}
              </p>
            </div>
          </section>

          {/* Additional Notes */}
          {contract.notes && (
            <section>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                Additional Notes
              </h2>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {contract.notes}
                </p>
              </div>
            </section>
          )}
        </div>

        {/* Footer — Accept / Reject */}
        {hasAction && (
          <div className="p-8 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <p className="text-xs text-gray-400">
                By accepting this contract, you agree to the terms and the
                project will begin. Rejecting will notify the Client.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={acting}
                  className="px-5 py-2.5 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 font-medium text-sm inline-flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle className="w-4 h-4" />
                  {acting ? "Processing..." : "Reject"}
                </button>
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={acting}
                  className="px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium text-sm inline-flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4" />
                  {acting ? "Processing..." : "Accept"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Already acted — status message */}
        {!hasAction && (
          <div className="p-8 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-gray-400" />
              <p className="text-sm text-gray-500">
                {isAccepted
                  ? "This contract has been accepted. The project is now in progress."
                  : "This contract has been rejected."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExpertContractView;
