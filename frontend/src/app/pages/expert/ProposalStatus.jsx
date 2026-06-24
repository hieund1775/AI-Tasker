import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  FileText,
  Eye,
} from "lucide-react";
import { Button } from "../../components/ui/button.jsx";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import api from "../../../services/api.js";

import { getProposalStatusConfig } from "../../lib/proposalStatusConfig.js";

// Status helpers — delegated to shared proposalStatusConfig.js
function getStatusConfig(status) { return getProposalStatusConfig(status); }

/**
 * Find the conversation ID for a given project + expert combo.
 */
function findConversationId(projectId, expertId) {
  const expertConvs = [];
  const conv = expertConvs.find((c) => c.projectId === projectId);
  return conv ? conv.id : null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProposalStatus() {
  const { user } = useAuth();

  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProposals() {
      if (!user?.id) return;
      try {
        setLoading(true);
        const list = await api.proposals.getByExpert(user.id);
        const fetchedProposals = await Promise.all(
          list.map(async (proposal) => {
            let job = null;
            try {
              job = await api.jobPosts.getById(proposal.jobPostId);
            } catch (err) {
              console.error("Failed to load job post details:", err);
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

            return {
              ...proposal,
              proposalTitle: parsed.proposalTitle || job?.title || "Proposal",
              projectTitle: job?.title || "AI Project",
              clientName: job?.client || "Client",
              clientCompany: "",
              durationDays: parsed.durationDays || job?.deadline || 0,
              project: job,
            };
          })
        );
        setProposals(fetchedProposals);
      } catch (err) {
        console.error("Failed to load expert proposals:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProposals();

    const handleUpdate = () => {
      loadProposals();
    };
    window.addEventListener("aitasker_db_update", handleUpdate);
    return () => {
      window.removeEventListener("aitasker_db_update", handleUpdate);
    };
  }, [user?.id]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Proposals</h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            Track your submitted proposals and their status
          </p>
        </div>
      </div>

      {/* Empty state */}
      {proposals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-500 mb-2">
            No proposals submitted
          </h3>
          <p className="text-base text-gray-400">
            No proposals have been submitted yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => {
            const statusCfg = getStatusConfig(proposal.status);
            const StatusIcon = statusCfg.icon;
            const convId = findConversationId(proposal.projectId, user?.id || "current-user");

            return (
              <div
                key={proposal.id}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  {/* Left: Info */}
                  <div className="flex-1 min-w-0">
                    {/* Status badge — above title */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border border-current ${statusCfg.className} mb-2`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusCfg.label}
                    </span>

                    {/* Title */}
                    <h3 className="font-semibold text-gray-900 text-lg leading-snug mb-2">
                      {proposal.proposalTitle}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-gray-500">
                      <span>
                        Client:{" "}
                        <span className="font-medium text-gray-700">
                          {proposal.clientName}
                          {proposal.clientCompany ? ` · ${proposal.clientCompany}` : ""}
                        </span>
                      </span>
                      <span>
                        Bid:{" "}
                        <span className="font-semibold text-gray-900">
                          <MoneyDisplay amount={proposal.bidAmount} />
                        </span>
                      </span>
                      <span>
                        Duration:{" "}
                        <span className="font-medium text-gray-700">
                          {proposal.durationDays} days
                        </span>
                      </span>
                    </div>

                    <p className="text-sm text-gray-400 mt-2">
                      Submitted{" "}
                      {proposal.createdAt
                        ? new Date(proposal.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "—"}
                    </p>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-col gap-2 sm:min-w-[180px] items-stretch">
                    <Button
                      variant="default"
                      size="default"
                      asChild
                      className="w-full"
                    >
                      <Link to={`/expert/proposals/${proposal.id}`}>
                        <Eye className="w-4 h-4" />
                        View Proposal
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="default"
                      asChild
                      className="w-full"
                    >
                      <Link to={`/expert/jobs/${proposal.jobPostId}`}>
                        View Detail
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
