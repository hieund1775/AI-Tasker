// =============================================================================
// ReportButton — "Report" / "Response to Accusation" button for project detail.
//
// States:
//   1. No report, not disputed  → "Report Dispute" (active)
//   2. User already reported     → "Report Submitted" (disabled)
//   3. Project is disputed, user is responder  → "Response to Accusation"
//   4. Project is disputed, user is reporter   → "Project Disputed" (disabled)
//   5. Project completed/cancelled → hidden
//
// Props:
//   project       — project object { id, status, title, ... }
//   hasReported   — boolean, whether current user already submitted a report
//   report        — report object { reporterId, reporterRole, respondentId, respondentRole, status, ... }
//   currentUserId — current user ID
//   currentUserRole — current user role ("client" | "expert")
//   onClick       — () => void — opens the report/response form
//   className     — additional classes
// =============================================================================

import { AlertTriangle } from "lucide-react";

export function ReportButton({
  project,
  hasReported = false,
  report = null,
  currentUserId,
  currentUserRole,
  onClick,
  className = "",
}) {
  const status = project?.status?.toLowerCase();

  if (!project) return null;

  // Completed or cancelled — hide
  if (status === "completed" || status === "cancelled") return null;

  // User already submitted a report (before admin accepts/rejects it)
  if (hasReported) {
    return (
      <div className={`inline-flex items-center gap-2 h-11 px-5 bg-secondary text-muted-foreground rounded-[14px] text-base font-semibold cursor-not-allowed ${className}`}>
        <AlertTriangle className="w-4 h-4" />
        Report Submitted
      </div>
    );
  }

  // Project is under dispute — determine if user is reporter or respondent
  if (status === "disputed") {
    // Determine via report data if available
    if (report && currentUserId) {
      const isReporter = report.reporterId === currentUserId;
      const isRespondent =
        report.respondentId === currentUserId ||
        // Fallback: if reporterRole is set, the other party is the respondent
        (report.reporterRole && currentUserRole && report.reporterRole !== currentUserRole);

      if (isRespondent) {
        return (
          <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-2 h-11 px-5 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-[14px] text-base font-semibold transition ${className}`}
          >
            <AlertTriangle className="w-4 h-4" />
            Response to Accusation
          </button>
        );
      }

      if (isReporter) {
        return (
          <div className={`inline-flex items-center gap-2 h-11 px-5 bg-secondary text-muted-foreground rounded-[14px] text-base font-semibold cursor-not-allowed ${className}`}>
            <AlertTriangle className="w-4 h-4" />
            Project Disputed
          </div>
        );
      }
    }

    // Fallback: can't determine role — show disputed state (non-interactive)
    return (
      <div className={`inline-flex items-center gap-2 h-11 px-5 bg-secondary text-muted-foreground rounded-[14px] text-base font-semibold cursor-not-allowed ${className}`}>
        <AlertTriangle className="w-4 h-4" />
        Project Disputed
      </div>
    );
  }

  // Default: active reporting
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 h-11 px-5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-[14px] text-base font-semibold transition ${className}`}
    >
      <AlertTriangle className="w-4 h-4" />
      Report Dispute
    </button>
  );
}

export default ReportButton;
