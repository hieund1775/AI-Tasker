import { Link } from "react-router";
import {
  MessageSquare,
  CheckCircle,
  XCircle,
  Eye,
} from "lucide-react";
import { MoneyDisplay } from "../shared/MoneyDisplay.jsx";

// =============================================================================
// ProposalCard — renders a single proposal for the client's proposal review.
//
// Props:
//   proposal     — enriched proposal object (includes expert, matchPct, etc.)
//   isAccepted   — whether this proposal has been accepted
//   isDeclined   — whether this proposal has been declined
//   hasBeenActed — whether any action (accept/decline) has been taken
//   onAccept     — callback(proposalId, expertName)
//   onDecline    — callback(proposalId, expertName)
// =============================================================================

export function ProposalCard({
  proposal,
  isAccepted,
  isDeclined,
  hasBeenActed,
  onAccept,
  onDecline,
}) {
  return (
    <div
      className={`bg-white rounded-xl border p-6 transition ${
        isAccepted
          ? "border-green-300 bg-green-50/30"
          : isDeclined
            ? "border-red-200 bg-red-50/20 opacity-75"
            : "border-gray-200 hover:shadow-md"
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        {/* ── Expert info ── */}
        <div className="flex items-start gap-4 flex-1">
          {/* Avatar initials */}
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-bold text-purple-700">
              {proposal.expert?.initials}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            {/* Name + match % */}
            <div className="flex items-center flex-wrap gap-3 mb-1">
              <h3 className="font-semibold text-gray-900">
                {proposal.expert?.name}
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                (proposal.matchPct || 0) >= 90 ? "bg-emerald-100 text-emerald-700" :
                (proposal.matchPct || 0) >= 75 ? "bg-green-50 text-green-700" :
                (proposal.matchPct || 0) >= 60 ? "bg-blue-50 text-blue-700" :
                "bg-gray-100 text-gray-600"
              }`}>
                {proposal.matchPct}% {proposal.matchLabel ? `· ${proposal.matchLabel}` : "match"}
              </span>
              {isAccepted && (
                <span className="px-2.5 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium inline-flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Accepted
                </span>
              )}
              {isDeclined && (
                <span className="px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium inline-flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> Declined
                </span>
              )}
            </div>

            {/* Title */}
            {proposal.expert?.title && (
              <p className="text-sm text-gray-500 mb-2">
                {proposal.expert.title}
              </p>
            )}

            {/* Cover letter / message */}
            {(proposal.coverLetter || proposal.message) && (
              <p className="text-gray-700 text-sm leading-relaxed mb-3">
                {proposal.coverLetter || proposal.message}
              </p>
            )}

            {/* Expert skills */}
            {proposal.expert?.skills?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {proposal.expert.skills.slice(0, 5).map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-xs font-medium"
                  >
                    {skill}
                  </span>
                ))}
                {proposal.expert.skills.length > 5 && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-400 rounded-md text-xs">
                    +{proposal.expert.skills.length - 5} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: bid amount + actions ── */}
        <div className="flex flex-col items-start md:items-end gap-3 md:min-w-[180px] flex-shrink-0">
          {/* Bid amount */}
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">
              <MoneyDisplay amount={proposal.bidAmount} />
            </p>
            <p className="text-xs text-gray-400">
              {proposal.durationDays
                ? `${proposal.durationDays} days`
                : ""}
            </p>
          </div>

          {/* Actions */}
          {!hasBeenActed && (
            <div className="flex flex-col gap-2 w-full md:w-auto">
              {/* View Proposal button */}
              <Link
                to={`/client/proposals/${proposal.id}`}
                className="px-3.5 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors w-full"
              >
                <Eye className="w-3.5 h-3.5" />
                View Proposal
              </Link>
              {/* Contact + Accept/Decline row */}
              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/messenger?expertId=${proposal.expertId}`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors"
                  title="Contact expert"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Contact
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    onDecline(
                      proposal.id,
                      proposal.expert?.name,
                    )
                  }
                  className="flex-1 px-3 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Decline
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onAccept(
                      proposal.id,
                      proposal.expert?.name,
                    )
                  }
                  className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Accept
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
