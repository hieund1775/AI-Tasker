// =============================================================================
// AITasker Report Service
// =============================================================================
// Handles all dispute report operations between Expert and Admin/Owner.
//
// Backend endpoints are NOT yet implemented - each function uses an empty
// placeholder URL so the real API can be wired in later without changing
// the component code.
// =============================================================================

import api from "./api.js";

// ---------------------------------------------------------------------------
// API endpoint paths - wired to mock API handler for frontend development.
// Replace with real backend endpoints when available.
// ---------------------------------------------------------------------------

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
export async function uploadEvidenceFiles(evidenceList = []) {
  if (!Array.isArray(evidenceList) || evidenceList.length === 0) return null;
  const processed = [];
  for (const item of evidenceList) {
    const actualFile = item instanceof File ? item : (item?.file instanceof File ? item.file : null);
    if (actualFile) {
      try {
        const formData = new FormData();
        formData.append("file", actualFile);
        const uploadRes = await api.post("/JobPosts/upload-file", formData, { isFormData: true }).catch(() => null);
        const cleanUrl = uploadRes?.url || uploadRes?.Url || uploadRes?.fileUrl || uploadRes?.FileUrl || uploadRes?.data || "";
        const finalUrl = cleanUrl ? (cleanUrl.includes("?") ? cleanUrl : `${cleanUrl}?name=${encodeURIComponent(actualFile.name)}`) : "";
        processed.push({
          fileName: actualFile.name,
          fileUrl: finalUrl || actualFile.name,
          note: item?.note || ""
        });
      } catch {
        processed.push({
          fileName: actualFile.name,
          fileUrl: actualFile.name,
          note: item?.note || ""
        });
      }
    } else if (item) {
      const rawUrl = typeof item === "string" ? item : (item.fileUrl || item.url || item.Url || (typeof item.file === "string" ? item.file : ""));
      const fileName = (typeof item === "object" && item.fileName) ? item.fileName : (item.name || "Evidence File");
      const finalUrl = (rawUrl && !rawUrl.includes("?")) ? `${rawUrl}?name=${encodeURIComponent(fileName)}` : rawUrl;
      if (finalUrl) {
        processed.push({
          fileName: fileName,
          fileUrl: finalUrl,
          note: item?.note || ""
        });
      }
    }
  }
  return processed.length > 0 ? JSON.stringify(processed) : null;
}

export async function createReport(payload) {
  let reporterId = payload.reporterId;
  if (!reporterId) {
    try {
      const authData = JSON.parse(
        sessionStorage.getItem("aitasker_user_info") ||
          localStorage.getItem("aitasker_user_info") ||
          "{}",
      );
      reporterId = authData?.id;
    } catch (e) {}
  }

  let finalEvidenceUrl = payload.evidenceUrl || null;
  if (Array.isArray(payload.evidence)) {
    finalEvidenceUrl = await uploadEvidenceFiles(payload.evidence);
  } else if (typeof payload.evidence === "string") {
    finalEvidenceUrl = payload.evidence;
  }

  const fullPayload = {
    projectId: payload.projectId,
    reporterId: reporterId,
    reporterRole: payload.reporterRole || "client",
    reportType: payload.reportType || "cancellation",
    reason: payload.reason || "No reason provided",
    description: payload.description,
    disputeType: payload.disputeType,
    desiredResolution: payload.desiredResolution,
    evidenceUrl: finalEvidenceUrl,
  };

  if (fullPayload.reportType === "cancellation") {
    return api.reports.create(fullPayload);
  }

  return api.disputes.submitReport(fullPayload).catch(err => {
    console.warn("Failed to create report:", err);
    throw err;
  });
}

// ---------------------------------------------------------------------------
// getReports(params)
// ---------------------------------------------------------------------------

/**
 * Fetch report list for Admin/Owner with optional filters.
 *
 * @param {object} params - { status?, projectId?, search?, page?, limit? }
 * @returns {Promise<object>} { data: Report[], total: number, page: number }
 */
export async function getReports(params = {}) {
  try {
    const res = await api.reports.getAll();
    const list = Array.isArray(res) ? res : (res?.data || []);
    
    // Parallel enrichment of project details and user details
    const enrichedList = await Promise.all(
      list.map(async (r) => {
        const enriched = {
          ...r,
          projectTitle: r.projectTitle || r.ProjectTitle || r.reason || r.Reason || "",
          clientName: r.clientName || r.ClientName || "",
          expertName: r.expertName || r.ExpertName || "",
          escrowAmount: r.escrowAmount || r.EscrowAmount || r.amount || r.Amount || 0,
        };
        try {
          const projId = r.projectId || r.ProjectId;
          if (projId) {
            const project = await api.projects.getById(projId);
            if (project) {
              enriched.projectTitle = project.Title || project.title || project.ProjectTitle || project.projectTitle || enriched.projectTitle;
              enriched.projectStartDate = project.StartDate || project.startDate || project.createdAt || project.CreatedAt;
              enriched.projectEndDate = project.EndDate || project.endDate || project.deadline || project.Deadline;
              const pAmount = project.EscrowBalance || project.escrowBalance || project.Budget || project.budget || project.escrowAmount || project.EscrowAmount || 0;
              enriched.amount = pAmount;
              enriched.escrowAmount = pAmount;
              
              const clientId = project.ClientId || project.clientId;
              if (clientId) {
                const client = await api.users.getById(clientId);
                if (client) {
                  enriched.clientName = client.fullName || client.name || client.FullName || client.Name || enriched.clientName;
                  enriched.clientEmail = client.email || client.Email;
                }
              }
              const expId = project.AssignedExpertId || project.assignedExpertId || project.ExpertId || project.expertId;
              if (expId) {
                const expert = await api.users.getById(expId);
                if (expert) {
                  enriched.expertName = expert.fullName || expert.name || expert.FullName || expert.Name || enriched.expertName;
                  enriched.expertEmail = expert.email || expert.Email;
                }
              }
            }
          }
          const repId = r.reporterId || r.ReporterId;
          if (repId) {
            const reporter = await api.users.getById(repId);
            if (reporter) {
              enriched.reporterName = reporter.fullName || reporter.name || reporter.FullName || reporter.Name;
            }
          }
        } catch (e) {
          console.warn("Failed to enrich individual report:", r.id || r.Id, e);
        }
        return enriched;
      })
    );

    return { data: enrichedList, total: enrichedList.length, page: 1 };
  } catch (err) {
    console.warn("Failed to load reports queue from /Reports:", err);
    return { data: [], total: 0, page: 1 };
  }
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
  try {
    const r = await api.reports.getById(reportId);
    if (r) {
      const enriched = {
        ...r,
        projectTitle: r.projectTitle || r.ProjectTitle || r.reason || r.Reason || "",
        clientName: r.clientName || r.ClientName || "",
        expertName: r.expertName || r.ExpertName || "",
        escrowAmount: r.escrowAmount || r.EscrowAmount || r.amount || r.Amount || 0,
      };
      
      const projId = r.projectId || r.ProjectId;
      if (projId) {
        try {
          const project = await api.projects.getById(projId);
          if (project) {
            enriched.projectTitle = project.Title || project.title || project.ProjectTitle || project.projectTitle || enriched.projectTitle;
            enriched.projectStartDate = project.StartDate || project.startDate || project.createdAt || project.CreatedAt;
            enriched.projectEndDate = project.EndDate || project.endDate || project.deadline || project.Deadline;
            
            const pAmount = project.EscrowBalance || project.escrowBalance || project.Budget || project.budget || project.escrowAmount || project.EscrowAmount || 0;
            enriched.amount = pAmount;
            enriched.escrowAmount = pAmount;
            
            const clientId = project.ClientId || project.clientId;
            if (clientId) {
              const client = await api.users.getById(clientId);
              if (client) {
                enriched.clientName = client.fullName || client.name || client.FullName || client.Name || enriched.clientName;
                enriched.clientEmail = client.email || client.Email;
              }
            }
            const expId = project.AssignedExpertId || project.assignedExpertId || project.ExpertId || project.expertId;
            if (expId) {
              const expert = await api.users.getById(expId);
              if (expert) {
                enriched.expertName = expert.fullName || expert.name || expert.FullName || expert.Name || enriched.expertName;
                enriched.expertEmail = expert.email || expert.Email;
              }
            }
          }
        } catch (pe) {
          console.warn("Failed to enrich project details for report detail view:", pe);
        }
      }
      
      const repId = r.reporterId || r.ReporterId;
      if (repId) {
        try {
          const reporter = await api.users.getById(repId);
          if (reporter) {
            enriched.reporterName = reporter.fullName || reporter.name || reporter.FullName || reporter.Name;
          }
        } catch (re) {}
      }
      
      return enriched;
    }
    return r;
  } catch (e) {
    console.error("Failed to query report detail:", e);
    throw e;
  }
}

// ---------------------------------------------------------------------------
// acceptReport(reportId, payload)
// ---------------------------------------------------------------------------

/**
 * Admin accepts the report as valid.
 * After acceptance the project status changes to "Disputed".
 *
 * @param {string} reportId
 * @param {object} payload - { adminNote?: string, reportType?: string }
 * @returns {Promise<object>}
 */
export async function acceptReport(reportId, payload = {}) {
  const type = payload.reportType || payload.reportName || "";
  if (type.toLowerCase() === "cancellation" || payload.disputeType === "cancellation") {
    return api.reports.adminApproveCancel(reportId);
  }
  return api.reports.adminAcceptReport(reportId, {
    adminNote: payload.adminNote || ""
  });
}

// ---------------------------------------------------------------------------
// rejectReport(reportId, payload)
// ---------------------------------------------------------------------------

/**
 * Admin rejects the report.
 * Rejection reason is REQUIRED. A notification is sent to the Expert.
 *
 * @param {string} reportId
 * @param {object} payload - { reason: string (required), reportType?: string }
 * @returns {Promise<object>}
 */
export async function rejectReport(reportId, payload) {
  const type = payload.reportType || payload.reportName || "";
  if (type.toLowerCase() === "cancellation" || payload.disputeType === "cancellation") {
    return api.reports.adminRejectCancel(reportId, {
      adminNote: payload.reason
    });
  }
  return api.reports.adminRejectReport(reportId, {
    reason: payload.reason
  });
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
