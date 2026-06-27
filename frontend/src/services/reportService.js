// =============================================================================
// AITasker Report Service
// =============================================================================
// Handles all dispute report operations between Expert and Admin/Owner.
//
// Backend endpoints are NOT yet implemented — each function uses an empty
// placeholder URL so the real API can be wired in later without changing
// the component code.
// =============================================================================

import api from "./api.js";

// ---------------------------------------------------------------------------
// API endpoint paths — wired to mock API handler for frontend development.
// Replace with real backend endpoints when available.
// ---------------------------------------------------------------------------

const REPORT_ENDPOINTS = {
  create: "/reports",          // POST   — Expert submits a dispute report
  list: "/reports",            // GET    — Admin/Owner fetches report list
  detail: "/reports/{id}",     // GET    — Admin/Owner fetches single report detail
  accept: "/reports/{id}",     // PUT    — Admin accepts a report
  reject: "/reports/{id}",     // PUT    — Admin rejects a report (reason required)
};

// ---------------------------------------------------------------------------
// createReport(payload)
// ---------------------------------------------------------------------------

/**
 * Expert creates a dispute report linked to a specific project.
 *
 * Expected payload:
 *   {
 *     projectId: string,
 *     reportName: string,        // defaults to project name
 *     reason: string,            // report reason
 *     description: string,       // detailed description
 *     disputeType: string,       // e.g. "financial"
 *     desiredResolution: string, // what the Expert wants
 *     evidence: Array<{ file: File | string, note: string }>,
 *   }
 *
 * @param {object} payload
 * @returns {Promise<object>} created report
 */
export async function createReport(payload) {
  return api.post(REPORT_ENDPOINTS.create, payload);
}

// ---------------------------------------------------------------------------
// getReports(params)
// ---------------------------------------------------------------------------

/**
 * Fetch report list for Admin/Owner with optional filters.
 *
 * @param {object} params — { status?, projectId?, search?, page?, limit? }
 * @returns {Promise<object>} { data: Report[], total: number, page: number }
 */
export async function getReports(params = {}) {
  return api.get(REPORT_ENDPOINTS.list, { params });
}

// ---------------------------------------------------------------------------
// getReportDetail(reportId)
// ---------------------------------------------------------------------------

/**
 * Fetch full details of a single report.
 *
 * @param {string} reportId
 * @returns {Promise<object>} report detail
 */
export async function getReportDetail(reportId) {
  return api.get(REPORT_ENDPOINTS.detail.replace("{id}", reportId));
}

// ---------------------------------------------------------------------------
// acceptReport(reportId, payload)
// ---------------------------------------------------------------------------

/**
 * Admin accepts the report as valid.
 * After acceptance the project status changes to "Disputed".
 *
 * @param {string} reportId
 * @param {object} payload — { adminNote?: string }
 * @returns {Promise<object>}
 */
export async function acceptReport(reportId, payload = {}) {
  return api.put(REPORT_ENDPOINTS.accept.replace("{id}", reportId), payload);
}

// ---------------------------------------------------------------------------
// rejectReport(reportId, payload)
// ---------------------------------------------------------------------------

/**
 * Admin rejects the report.
 * Rejection reason is REQUIRED. A notification is sent to the Expert.
 *
 * @param {string} reportId
 * @param {object} payload — { reason: string (required) }
 * @returns {Promise<object>}
 */
export async function rejectReport(reportId, payload) {
  return api.put(REPORT_ENDPOINTS.reject.replace("{id}", reportId), payload);
}

// ---------------------------------------------------------------------------
// Named export group
// ---------------------------------------------------------------------------

export const reportService = {
  createReport,
  getReports,
  getReportDetail,
  acceptReport,
  rejectReport,
};

export default reportService;
