import { useState, useEffect } from "react";
import { useParams } from "react-router";
import {
  Tag,
  Calendar,
  DollarSign,
  Clock,
  Users,
  FileText,
} from "lucide-react";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { BackButton } from "../../components/shared/BackButton.jsx";
import { ProposalCard } from "../../components/proposal/ProposalCard.jsx";
import { getMatchPercentage } from "../../lib/proposalStore.js";
import api from "../../../services/api.js";

/**
 * ProposalReview — Client views all proposals for a specific project.
 *
 * Route: /client/projects/:projectId/proposals
 */
export function ProposalReview() {
  const { projectId, id: legacyId } = useParams();
  const activeProjectId = projectId || legacyId;

  const [project, setProject] = useState(null);
  const [enrichedProposals, setEnrichedProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Track which proposals have been acted on (accepted/declined) locally
  // for immediate UI feedback without re-fetching
  const [actedIds, setActedIds] = useState(new Set());
  const [feedback, setFeedback] = useState(null); // { type, message }

  useEffect(() => {
    if (!activeProjectId) return;
    setLoading(true);
    Promise.all([
      api.jobPosts.getById(activeProjectId).catch(() => null),
      api.proposals.getByJob(activeProjectId).catch(() => []),
    ])
      .then(async ([jobPost, proposalList]) => {
        setProject(jobPost);

        // Fetch expert profiles for each proposal concurrently
        const enriched = await Promise.all(
          proposalList.map(async (proposal) => {
            let expertDetail = null;
            try {
              expertDetail = await api.users.getById(proposal.expertId);
            } catch (err) {
              console.error("Failed to load expert info for proposal:", err);
            }

            let parsed = {};
            try {
              parsed = JSON.parse(proposal.coverLetter);
            } catch (e) {
              parsed = {
                coverLetter: proposal.coverLetter,
                professionalIntro: proposal.coverLetter,
              };
            }

            const name = expertDetail?.fullName || "Unknown Expert";
            const initials = name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            const matchResult = getMatchPercentage(proposal);
            return {
              ...proposal,
              proposalTitle: parsed.proposalTitle || "Proposal",
              coverLetter: parsed.professionalIntro || parsed.coverLetter || "",
              durationDays: parsed.durationDays || 0,
              matchPct: matchResult.score,
              matchLabel: matchResult.label,
              expert: {
                name,
                title: expertDetail?.expertProfile?.jobTitle || "AI Expert",
                initials,
                skills: expertDetail?.expertProfile?.major ? [expertDetail.expertProfile.major] : [],
              },
            };
          })
        );
        setEnrichedProposals(enriched);
      })
      .catch((err) => {
        console.error("Failed to load proposal review data:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeProjectId]);

  const category = project?.aiCategoryDomain ? { label: project.aiCategoryDomain.name } : null;

  // Filter out declined proposals (unless already acted on this session)
  const visibleProposals = enrichedProposals.filter(
    (p) => p.status?.toLowerCase() !== "declined" || actedIds.has(p.id),
  );

  const handleAccept = async (proposalId, expertName) => {
    try {
      await api.proposals.updateStatus(proposalId, "Accepted");
      setActedIds((prev) => new Set([...prev, proposalId]));
      setFeedback({
        type: "success",
        message: `You accepted ${expertName}'s proposal. The project is now in progress.`,
      });
      setEnrichedProposals((prev) =>
        prev.map((p) =>
          p.id === proposalId
            ? { ...p, status: "Accepted" }
            : p.status?.toLowerCase() === "pending"
            ? { ...p, status: "Declined" }
            : p
        )
      );
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Failed to accept proposal." });
    }
    // Clear feedback after 5s
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleDecline = async (proposalId, expertName) => {
    try {
      await api.proposals.updateStatus(proposalId, "Declined");
      setActedIds((prev) => new Set([...prev, proposalId]));
      setFeedback({
        type: "info",
        message: `You declined ${expertName}'s proposal.`,
      });
      setEnrichedProposals((prev) =>
        prev.map((p) => (p.id === proposalId ? { ...p, status: "Declined" } : p))
      );
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Failed to decline proposal." });
    }
    setTimeout(() => setFeedback(null), 5000);
  };

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton fallback="/client/my-projects" className="mb-6">Back</BackButton>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-gray-500 animate-pulse">Loading proposals...</h3>
        </div>
      </div>
    );
  }

  // ---- Project not found ----
  if (!project) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton fallback="/client/my-projects" className="mb-6">Back</BackButton>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-500">Project not found</h3>
          <p className="text-sm text-gray-400 mt-1">
            This project may have been removed or the link is invalid.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <BackButton fallback="/client/my-projects" className="mb-6">Back to All Projects</BackButton>

      {/* ── Feedback banner ── */}
      {feedback && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm font-medium ${
            feedback.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : feedback.type === "error"
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-blue-50 text-blue-700 border border-blue-200"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* ================================================================== */}
      {/* PROJECT INFO SECTION                                               */}
      {/* ================================================================== */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        {/* Header */}
        <div className="p-8 border-b border-gray-100">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {project.title}
              </h1>
              {category && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium mb-3">
                  <Tag className="w-3.5 h-3.5" />
                  {category.label}
                </span>
              )}
            </div>

            {/* Proposal count badge */}
            <span className="flex-shrink-0 px-4 py-2 bg-purple-50 text-purple-700 rounded-xl text-sm font-semibold inline-flex items-center gap-2">
              <Users className="w-4 h-4" />
              {visibleProposals.length} proposal{visibleProposals.length !== 1 ? "s" : ""} received
            </span>
          </div>
        </div>

        {/* Project details body */}
        <div className="p-8 space-y-6">
          {/* Description */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Description
            </h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {project.description || "No description provided."}
            </p>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Budget</p>
              <p className="font-semibold text-gray-900">
                <MoneyDisplay amount={project.budget} />
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Timeline</p>
              <p className="font-semibold text-gray-900">
                {project.durationValue} {project.durationUnit}
              </p>
            </div>
            {project.deadline && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Deadline</p>
                <p className="font-semibold text-gray-900">
                  {new Date(project.deadline).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}
            {project.createdAt && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Posted</p>
                <p className="font-semibold text-gray-900">
                  {new Date(project.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Required skills */}
          {project.requiredSkills?.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Required Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {project.requiredSkills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* PROPOSALS SECTION                                                  */}
      {/* ================================================================== */}
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        Proposals Received
      </h2>

      {visibleProposals.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-500 mb-2">
            No proposals yet
          </h3>
          <p className="text-sm text-gray-400">
            Proposals will appear here once experts submit them.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleProposals.map((proposal) => {
            const statusLower = (proposal.status || "").toLowerCase();
            const isAccepted = statusLower === "accepted";
            const isDeclined = statusLower === "declined";
            const hasBeenActed = isAccepted || isDeclined || actedIds.has(proposal.id);

            return (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                isAccepted={isAccepted}
                isDeclined={isDeclined}
                hasBeenActed={hasBeenActed}
                onAccept={handleAccept}
                onDecline={handleDecline}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
