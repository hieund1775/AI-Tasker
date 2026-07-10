import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, Send, FileText } from "lucide-react";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { BackButton } from "../../components/shared/BackButton.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import api from "../../../services/api.js";
import { toast } from "sonner";

/**
 * CreateContract — Client creates and sends a contract to an Expert.
 *
 * Route: /client/contracts/create?projectId=X&proposalId=Y&expertId=Z
 */
export function CreateContract() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const projectId = searchParams.get("projectId");
  const proposalId = searchParams.get("proposalId");
  const expertId = searchParams.get("expertId");

  const [project, setProject] = useState(null);
  const [proposal, setProposal] = useState(null);
  const [expert, setExpert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Editable contract fields
  const [contractData, setContractData] = useState({
    terms:
      "The Expert agrees to complete the project according to the specifications outlined above. The Client agrees to pay the agreed amount upon satisfactory completion of all milestones and deliverables. Both parties agree to communicate regularly and resolve disputes through the platform's mediation process.",
    notes: "",
  });

  // Load all required data
  useEffect(() => {
    if (!user?.id || !projectId || !proposalId || !expertId) return;
    setLoading(true);

    async function loadData() {
      try {
        const [projectRes, proposalRes, expertRes] = await Promise.all([
          api.jobPosts.getById(projectId).catch(() => null),
          api.proposals.getById(proposalId).catch(() => null),
          api.users.getById(expertId).catch(() => null),
        ]);
        setProject(projectRes);
        setProposal(proposalRes);
        setExpert(expertRes);
      } catch (err) {
        console.error("Failed to load contract data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user?.id, projectId, proposalId, expertId]);

  const handleSendToExpert = async () => {
    if (!project || !proposal || !expert || !user) return;
    setSubmitting(true);

    // Build contract payload
    const payload = {
      projectId: project.id,
      proposalId: proposal.id,
      clientId: user.id,
      expertId: expert.id,
      projectTitle: project.title || "",
      projectDescription: project.description || "",
      useCases: project.useCases || [],
      budget: project.budget || proposal.bidAmount || 0,
      deadline: project.deadline || proposal.durationDays || 0,
      terms: contractData.terms,
      notes: contractData.notes,
      status: "sent",
    };

    try {
      // Create contract
      const contract = await api.contracts.create(payload);

      // Send notification to expert
      await api.notifications
        .send({
          receiverId: expert.id,
          type: "contract_sent",
          title: "New contract received",
          message: `Client has sent you a contract for project "${project.title}".`,
          targetUrl: `/expert/contracts/${contract?.id || "new"}`,
        })
        .catch(() => {
          // Notification is best-effort — don't block the flow
          console.warn("Failed to send contract notification (endpoint may not exist)");
        });

      toast.success("Contract has been sent to the Expert.");
      navigate("/client/dashboard");
    } catch (err) {
      console.error("Failed to send contract:", err);
      toast.error(err.message || "Failed to send contract. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Loading ----
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton fallback="/client/my-projects" className="mb-6">
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

  // ---- Missing data ----
  if (!project || !proposal || !expert) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton fallback="/client/my-projects" className="mb-6">
          Back
        </BackButton>
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-500 mb-2">
            Missing Information
          </h3>
          <p className="text-sm text-gray-400">
            Unable to load project, proposal, or expert details. Please go back
            and try again.
          </p>
        </div>
      </div>
    );
  }

  const useCases = project.useCases || [];
  const deadlineText =
    project.deadline != null
      ? typeof project.deadline === "number" && project.deadline < 1000
        ? `${project.deadline} days`
        : new Date(project.deadline).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
      : "N/A";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BackButton fallback="/client/my-projects" className="mb-6">
        Back
      </BackButton>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Create Contract
          </h1>
          <p className="text-gray-500 text-sm">
            Review and edit the contract before sending it to the Expert.
          </p>
        </div>

        {/* Contract Content */}
        <div className="p-8 space-y-8">
          {/* ---- Project Information ---- */}
          <section>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
              Project Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Project Name</p>
                <p className="font-semibold text-gray-900">{project.title}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Budget / Escrow</p>
                <p className="font-semibold text-gray-900">
                  <MoneyDisplay amount={project.budget || proposal.bidAmount} />
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Deadline</p>
                <p className="font-semibold text-gray-900">{deadlineText}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Proposal Bid</p>
                <p className="font-semibold text-gray-900">
                  <MoneyDisplay amount={proposal.bidAmount} />
                  {" · "}
                  {proposal.durationDays} days
                </p>
              </div>
            </div>
            <div className="mt-4 bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Project Description</p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {project.description || "No description provided."}
              </p>
            </div>
          </section>

          {/* ---- Use Cases ---- */}
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

          {/* ---- Proposal Information ---- */}
          <section>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
              Proposal Information
            </h2>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Proposal Summary</p>
              {(() => {
                let intro = "";
                try {
                  const parsed = JSON.parse(proposal.coverLetter || "{}");
                  intro =
                    parsed.professionalIntro || parsed.coverLetter || proposal.coverLetter || "";
                } catch {
                  intro = proposal.coverLetter || "";
                }
                return (
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap line-clamp-3">
                    {intro || "No proposal details available."}
                  </p>
                );
              })()}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Bid Amount</p>
                <p className="font-semibold text-gray-900">
                  <MoneyDisplay amount={proposal.bidAmount} />
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Estimated Duration</p>
                <p className="font-semibold text-gray-900">
                  {proposal.durationDays} days
                </p>
              </div>
            </div>
          </section>

          {/* ---- Expert Information ---- */}
          <section>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
              Expert Information
            </h2>
            <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-blue-700">
                  {(expert.fullName || "E")
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {expert.fullName || "Expert"}
                </p>
                <p className="text-sm text-gray-500">
                  {expert.expertProfile?.jobTitle || "AI Expert"}
                </p>
              </div>
            </div>
          </section>

          {/* ---- Client Information ---- */}
          <section>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
              Client Information
            </h2>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="font-semibold text-gray-900">
                {user?.name || "Client"}
              </p>
              <p className="text-sm text-gray-500">{user?.email || ""}</p>
            </div>
          </section>

          {/* ---- Terms / Agreement (Editable) ---- */}
          <section>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
              Terms & Agreement
            </h2>
            <textarea
              value={contractData.terms}
              onChange={(e) =>
                setContractData((prev) => ({ ...prev, terms: e.target.value }))
              }
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-900 text-sm leading-relaxed"
              placeholder="Enter contract terms and conditions..."
            />
          </section>

          {/* ---- Additional Notes (Editable) ---- */}
          <section>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
              Additional Notes
            </h2>
            <textarea
              value={contractData.notes}
              onChange={(e) =>
                setContractData((prev) => ({ ...prev, notes: e.target.value }))
              }
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-900 text-sm leading-relaxed"
              placeholder="Any additional notes or special requirements..."
            />
          </section>
        </div>

        {/* Footer — Send to Expert */}
        <div className="p-8 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <p className="text-xs text-gray-400">
              You can edit all editable fields before sending. The Expert will
              review and either accept or reject this contract.
            </p>
            <button
              type="button"
              onClick={handleSendToExpert}
              disabled={submitting}
              className="px-6 py-3 bg-blue-900 text-white rounded-xl hover:bg-blue-800 font-medium text-sm inline-flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {submitting ? "Sending..." : "Send to Expert"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateContract;
