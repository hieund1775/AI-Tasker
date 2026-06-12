// =============================================================================
// AITasker Escrow Service
// =============================================================================
// Handles all money-related operations:
//   - Client pays the FULL project amount into escrow
//   - Client accepts work and releases money to Expert
//   - Admin refunds money to Client (dispute resolution)
//   - Admin releases money to Expert (dispute resolution)
//
// Priority: use /api/interactions/transaction if the backend supports it.
// Otherwise, fall back to empty placeholders for each distinct action.
// =============================================================================

import api from "./api.js";

// ---------------------------------------------------------------------------
// API endpoint mapping
// ---------------------------------------------------------------------------
// If /api/interactions/transaction handles ALL escrow actions, keep these:
//
//   payProjectToEscrow          → POST /api/interactions/transaction
//   releaseProjectMoneyToExpert → POST /api/interactions/transaction
//   refundProjectMoneyToClient  → POST /api/interactions/transaction
//
// If the backend needs SEPARATE endpoints, change each to "" (empty string)
// and update the corresponding function below.
// ---------------------------------------------------------------------------

const ESCROW_ENDPOINTS = {
  payProjectToEscrow: "/interactions/transaction",
  releaseProjectMoneyToExpert: "/interactions/transaction",
  refundProjectMoneyToClient: "/interactions/transaction",
};

// ---------------------------------------------------------------------------
// payProjectToEscrow(payload)
// ---------------------------------------------------------------------------

/**
 * Client pays the FULL project amount into the platform escrow system.
 * This is NOT a deposit — it is the full project amount.
 *
 * Expected payload:
 *   {
 *     projectId: string,
 *     amount: number,       // full project budget
 *     transactionType: "escrow_payment",
 *   }
 *
 * After success:
 *   - UI deducts Client balance (if API returns new balance)
 *   - "Thanh toán project" button becomes disabled
 *   - Toast: "Your project money has been transferred to the platform's
 *            secure intermediary system."
 *
 * @param {object} payload
 * @returns {Promise<object>} { success, transactionId, newBalance? }
 */
export async function payProjectToEscrow(payload) {
  const endpoint = ESCROW_ENDPOINTS.payProjectToEscrow;
  if (!endpoint) {
    // TODO: add API endpoint here
    console.warn("[EscrowService] payProjectToEscrow — endpoint not configured");
    return { success: true, projectId: payload.projectId };
  }
  return api.post(endpoint, {
    ...payload,
    type: "escrow_payment",
    transactionType: "escrow_payment",
    description: `Client pays full project amount into escrow for project ${payload.projectId}`,
  });
}

// ---------------------------------------------------------------------------
// releaseProjectMoneyToExpert(payload)
// ---------------------------------------------------------------------------

/**
 * Client confirms satisfaction and releases the full escrow amount to Expert.
 * Only Client can perform this action.
 *
 * Expected payload:
 *   {
 *     projectId: string,
 *     amount: number,
 *     expertId: string,
 *     transactionType: "release_payment",
 *   }
 *
 * @param {object} payload
 * @returns {Promise<object>} { success, transactionId, newExpertBalance? }
 */
export async function releaseProjectMoneyToExpert(payload) {
  const endpoint = ESCROW_ENDPOINTS.releaseProjectMoneyToExpert;
  if (!endpoint) {
    // TODO: add API endpoint here
    console.warn("[EscrowService] releaseProjectMoneyToExpert — endpoint not configured");
    return { success: true, projectId: payload.projectId };
  }
  return api.post(endpoint, {
    ...payload,
    type: "release_payment",
    transactionType: "release_payment",
    description: `Release escrow payment to Expert for project ${payload.projectId}`,
  });
}

// ---------------------------------------------------------------------------
// refundProjectMoneyToClient(payload)
// ---------------------------------------------------------------------------

/**
 * Admin refunds the FULL project amount from escrow back to the Client.
 * Used during dispute resolution when Admin decides to refund.
 *
 * Expected payload:
 *   {
 *     projectId: string,
 *     amount: number,
 *     clientId: string,
 *     reportId: string,
 *     reason: string,
 *     transactionType: "dispute_refund",
 *   }
 *
 * @param {object} payload
 * @returns {Promise<object>} { success, transactionId, newClientBalance? }
 */
export async function refundProjectMoneyToClient(payload) {
  const endpoint = ESCROW_ENDPOINTS.refundProjectMoneyToClient;
  if (!endpoint) {
    // TODO: add API endpoint here
    console.warn("[EscrowService] refundProjectMoneyToClient — endpoint not configured");
    return { success: true, projectId: payload.projectId };
  }
  return api.post(endpoint, {
    ...payload,
    type: "dispute_refund",
    transactionType: "dispute_refund",
    description: `Dispute resolution — refund escrow to Client for project ${payload.projectId}. Reason: ${payload.reason}`,
  });
}

// ---------------------------------------------------------------------------
// Named export group
// ---------------------------------------------------------------------------

export const escrowService = {
  payProjectToEscrow,
  releaseProjectMoneyToExpert,
  refundProjectMoneyToClient,
};

export default escrowService;
