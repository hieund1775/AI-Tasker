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
// API endpoint placeholders (TODO: update when backend is ready)
// ---------------------------------------------------------------------------

const REPORT_ENDPOINTS = {
  create: "/reports",        // POST   — Expert/client submits a dispute report
  list: "/reports",          // GET    — Admin/Owner fetches report list
  detail: "/reports/{id}",    // GET    — Admin/Owner fetches single report detail
  accept: "/reports/{id}/accept",   // PUT    — Admin accepts a report
  reject: "/reports/{id}/reject",   // PUT    — Admin rejects a report (reason required)
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
  if (!REPORT_ENDPOINTS.create) {
    // TODO: add API endpoint here
    console.warn("[ReportService] createReport — endpoint not configured");
    return null;
  }
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
  if (!REPORT_ENDPOINTS.list) {
    // TODO: add API endpoint here
    console.warn("[ReportService] getReports — endpoint not configured");
    return { data: [], total: 0, page: 1 };
  }
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
  if (!REPORT_ENDPOINTS.detail) {
    // TODO: add API endpoint here — e.g. `/api/reports/${reportId}`
    console.warn("[ReportService] getReportDetail — endpoint not configured");
    return null;
  }
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
  if (!REPORT_ENDPOINTS.accept) {
    // TODO: add API endpoint here
    console.warn("[ReportService] acceptReport — endpoint not configured");
    return { success: true, reportId, status: "Accepted" };
  }
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
  if (!REPORT_ENDPOINTS.reject) {
    // TODO: add API endpoint here
    console.warn("[ReportService] rejectReport — endpoint not configured");
    return { success: true, reportId, status: "Rejected" };
  }
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
