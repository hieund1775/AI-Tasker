// =============================================================================
// Proposal Store — in-memory session store for proposals submitted during
// the current session.
//
// TODO: Replace with real API calls when backend is connected.
// acceptProposal / declineProposal should call api.proposals.accept(id) etc.
// =============================================================================

// In-memory session proposals (temporary until API is connected)
const _sessionProposals = [];

/** Add a proposal submitted during this session. */
export function addSessionProposal(proposal) {
  const record = {
    id: `session-prop-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ...proposal,
    createdAt: new Date().toISOString(),
    status: "pending",
  };
  _sessionProposals.push(record);
  return record;
}

/** Return all proposals submitted during this session for the given expert. */
export function getSessionProposalsByExpert(expertId) {
  return _sessionProposals.filter((p) => p.expertId === expertId);
}

/** Return a single session proposal by ID, or null. */
export function getSessionProposalById(proposalId) {
  return _sessionProposals.find((p) => p.id === proposalId) || null;
}

// =============================================================================
// Accept / Decline mutations (session-only until API is connected)
// TODO: Replace with api.proposals.accept(id) / api.proposals.decline(id)
// =============================================================================

/**
 * Accept a proposal (session-only, no backend persistence).
 */
export function acceptProposal(proposalId) {
  const proposal = _sessionProposals.find((p) => p.id === proposalId);
  if (!proposal) return { success: false, error: "Proposal not found." };

  proposal.status = "accepted";

  _sessionProposals.forEach((p) => {
    if (p.projectId === proposal.projectId && p.id !== proposalId && p.status === "pending") {
      p.status = "declined";
    }
  });

  return { success: true };
}

/**
 * Decline a proposal (session-only, no backend persistence).
 */
export function declineProposal(proposalId) {
  const proposal = _sessionProposals.find((p) => p.id === proposalId);
  if (!proposal) return { success: false, error: "Proposal not found." };

  proposal.status = "declined";
  return { success: true };
}

/**
 * Get a deterministic match percentage for display purposes.
 * Uses a hash of the proposal ID so it stays stable across renders.
 */
export function getMatchPercentage(proposalId) {
  let hash = 0;
  for (let i = 0; i < proposalId.length; i++) {
    hash = (hash * 31 + proposalId.charCodeAt(i)) & 0x7fffffff;
  }
  // Return a value between 82 and 99
  return 82 + (hash % 18);
}
