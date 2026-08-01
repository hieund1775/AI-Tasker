// =============================================================================
// AITasker Dispute Service
// =============================================================================
// Handles Admin-side dispute resolution actions for projects.
//
// Backend endpoints are NOT yet implemented - each function uses an empty
// placeholder URL so the real API can be wired in later without changing
// the component code.
// =============================================================================

import api from "./api.js";

// ---------------------------------------------------------------------------
// pauseProjectAsDisputed(projectId, payload)
// ---------------------------------------------------------------------------

/**
 * Mark a project as "Disputed" (lock all actions for Client & Expert).
 *
 * @param {string} projectId
 * @param {object} payload - { reportId: string, reason?: string, staffId?: string }
 * @returns {Promise<object>}
 */
export async function pauseProjectAsDisputed(projectId, payload = {}) {
  const staffId = payload.staffId;
  return api.disputes.triggerLock(projectId, payload.reason || "Project Locked due to Dispute", staffId);
}

// ---------------------------------------------------------------------------
// continueProject(projectId, payload)
// ---------------------------------------------------------------------------

/**
 * Resume a project after dispute has been resolved in favour of continuing.
 * Unlocks all actions for Client & Expert.
 *
 * @param {string} projectId
 * @param {object} payload - { adminNote?: string }
 * @returns {Promise<object>}
 */
export async function continueProject(projectId, payload = {}) {
  // C# ProjectsController updateStatus takes status as query param: PUT /api/Projects/{id}/status?status=in_progress
  return api.put(`/Projects/${projectId}/status?status=in_progress`);
}

// ---------------------------------------------------------------------------
// stopProject(projectId, payload)
// ---------------------------------------------------------------------------

/**
 * Permanently stop a project due to dispute.
 * Admin must provide the final decision reason.
 *
 * @param {string} projectId
 * @param {object} payload - {
 *   reason: string (required),
 *   moneyAction: "refund" | "release",
 *   reportId: string (required),
 *   staffId?: string,
 * }
 * @returns {Promise<object>}
 */
export async function stopProject(projectId, payload) {
  const staffId = payload.staffId;
  const winnerRole = payload.moneyAction === "refund" ? "Client" : "Expert";
  return api.disputes.executeVerdict(payload.reportId, winnerRole, payload.reason, staffId);
}

// ---------------------------------------------------------------------------
// createDisputeChat(payload)
// ---------------------------------------------------------------------------

/**
 * Create or open a group chat for dispute:
 *
 * @param {object} payload - {
 *   reportId: string,
 *   projectId: string,
 *   clientId: string,
 *   expertId: string,
 *   adminId: string,
 * }
 * @returns {Promise<object>} chat session info
 */
export async function createDisputeChat(payload) {
  return api.chat.createConversation({
    clientId: payload.clientId,
    expertId: payload.expertId,
  });
}

// ---------------------------------------------------------------------------
// Named export group
// ---------------------------------------------------------------------------

export const disputeService = {
  pauseProjectAsDisputed,
  continueProject,
  stopProject,
  createDisputeChat,
};

export default disputeService;
