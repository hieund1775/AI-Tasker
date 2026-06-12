// =============================================================================
// AITasker Dispute Service
// =============================================================================
// Handles Admin-side dispute resolution actions for projects.
//
// Backend endpoints are NOT yet implemented — each function uses an empty
// placeholder URL so the real API can be wired in later without changing
// the component code.
// =============================================================================

import api from "./api.js";

// ---------------------------------------------------------------------------
// API endpoint placeholders (TODO: update when backend is ready)
// ---------------------------------------------------------------------------

const DISPUTE_ENDPOINTS = {
  pauseProjectAsDisputed: "", // PUT — change project status to "Disputed"
  continueProject: "",        // PUT — resume project after dispute resolved
  stopProject: "",            // PUT — stop project permanently
  createDisputeChat: "",      // POST — create 3-party confrontation group chat
};

// ---------------------------------------------------------------------------
// pauseProjectAsDisputed(projectId, payload)
// ---------------------------------------------------------------------------

/**
 * Mark a project as "Disputed" (lock all actions for Client & Expert).
 *
 * @param {string} projectId
 * @param {object} payload — { reportId: string, reason?: string }
 * @returns {Promise<object>}
 */
export async function pauseProjectAsDisputed(projectId, payload = {}) {
  if (!DISPUTE_ENDPOINTS.pauseProjectAsDisputed) {
    // TODO: add API endpoint here
    console.warn("[DisputeService] pauseProjectAsDisputed — endpoint not configured");
    return { success: true, projectId, status: "Disputed" };
  }
  return api.put(
    DISPUTE_ENDPOINTS.pauseProjectAsDisputed.replace("{id}", projectId),
    payload,
  );
}

// ---------------------------------------------------------------------------
// continueProject(projectId, payload)
// ---------------------------------------------------------------------------

/**
 * Resume a project after dispute has been resolved in favour of continuing.
 * Unlocks all actions for Client & Expert.
 *
 * @param {string} projectId
 * @param {object} payload — { adminNote?: string }
 * @returns {Promise<object>}
 */
export async function continueProject(projectId, payload = {}) {
  if (!DISPUTE_ENDPOINTS.continueProject) {
    // TODO: add API endpoint here
    console.warn("[DisputeService] continueProject — endpoint not configured");
    return { success: true, projectId, status: "Active" };
  }
  return api.put(
    DISPUTE_ENDPOINTS.continueProject.replace("{id}", projectId),
    payload,
  );
}

// ---------------------------------------------------------------------------
// stopProject(projectId, payload)
// ---------------------------------------------------------------------------

/**
 * Permanently stop a project due to dispute.
 * Admin must provide the final decision reason.
 *
 * @param {string} projectId
 * @param {object} payload — {
 *   reason: string (required),
 *   moneyAction: "refund" | "release",
 *   adminNote?: string,
 *   attachments?: File[],
 * }
 * @returns {Promise<object>}
 */
export async function stopProject(projectId, payload) {
  if (!DISPUTE_ENDPOINTS.stopProject) {
    // TODO: add API endpoint here
    console.warn("[DisputeService] stopProject — endpoint not configured");
    return {
      success: true,
      projectId,
      status: "Stopped",
      moneyAction: payload.moneyAction,
    };
  }
  return api.put(
    DISPUTE_ENDPOINTS.stopProject.replace("{id}", projectId),
    payload,
  );
}

// ---------------------------------------------------------------------------
// createDisputeChat(payload)
// ---------------------------------------------------------------------------

/**
 * Create or open a 3-party confrontation group chat:
 *   Admin + Client + Expert
 *
 * @param {object} payload — {
 *   reportId: string,
 *   projectId: string,
 *   clientId: string,
 *   expertId: string,
 *   adminId: string,
 * }
 * @returns {Promise<object>} chat session info
 */
export async function createDisputeChat(payload) {
  if (!DISPUTE_ENDPOINTS.createDisputeChat) {
    // TODO: add API endpoint here
    console.warn("[DisputeService] createDisputeChat — endpoint not configured");
    return { success: true, chatId: null, ...payload };
  }
  return api.post(DISPUTE_ENDPOINTS.createDisputeChat, payload);
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
