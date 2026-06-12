// =============================================================================
// ReportButton — "Report" button for Expert's project detail page.
//
// Visibility rules:
//   - Only visible to the Expert assigned to the project
//   - Hidden/disabled when project status is "Disputed"
//   - Hidden when a report has already been submitted for this project
//
// Props:
//   project      — project object { id, status, title, ... }
//   hasReported  — boolean, whether Expert already submitted a report
//   onClick      — () => void — opens the report form
//   className    — additional classes
// =============================================================================

import { AlertTriangle } from "lucide-react";

export function ReportButton({
  project,
  hasReported = false,
  onClick,
  className = "",
}) {
  const isDisputed = project?.status?.toLowerCase() === "disputed";

  if (!project) return null;

  // Hide if already reported
  if (hasReported) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed ${className}`}>
        <AlertTriangle className="w-4 h-4" />
        Report Submitted
      </div>
    );
  }

  // Disable if disputed
  if (isDisputed) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed ${className}`}>
        <AlertTriangle className="w-4 h-4" />
        Project Disputed
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-sm font-medium transition ${className}`}
    >
      <AlertTriangle className="w-4 h-4" />
      Report Dispute
    </button>
  );
}

export default ReportButton;
