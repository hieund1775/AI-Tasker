// =============================================================================
// Project Status Configuration — single source of truth for all status display
// =============================================================================
//
// Every page that renders a project card, badge, or button should import from
// this file instead of defining its own status labels, colours, or logic.
//
// Standardized status keys (the "source of truth" identifier):
//   reviewing_proposals  — Project is open, client is reviewing incoming proposals
//   in_progress           — Project has an assigned expert and is being worked on
//   waiting_review        — Expert has submitted work, waiting for client review
//   needs_revision        — Client requested changes on a submission
//   completed             — Project is finished
//   cancelled             — Project was cancelled
// =============================================================================

// ---------------------------------------------------------------------------
// 1. Status display labels — mapping from standardized key → human label
// ---------------------------------------------------------------------------

export const STATUS_LABELS = {
  reviewing_proposals: "Reviewing Proposals",
  in_progress: "In Progress",
  waiting_review: "Waiting Review",
  needs_revision: "Needs Revision",
  completed: "Completed",
  cancelled: "Cancelled",
  pending_escrow: "Pending Payment",
  disputed: "Disputed",
  contract_cancelled: "Contract Cancelled",
  accepted: "Accepted",
};

// ---------------------------------------------------------------------------
// 2. Status badge colour classes — standardized key → Tailwind classes
// ---------------------------------------------------------------------------

export const STATUS_BADGE_CLASSES = {
  reviewing_proposals: "bg-purple-100 text-purple-700",
  in_progress: "bg-brand-primary-light text-brand-primary",
  waiting_review: "bg-yellow-100 text-yellow-700",
  needs_revision: "bg-orange-100 text-orange-700",
  completed: "bg-brand-green/10 text-brand-green",
  cancelled: "bg-red-100 text-red-700",
  contract_cancelled: "bg-rose-100 text-rose-700 border border-rose-200",
  pending_escrow: "bg-amber-100 text-amber-700 border border-amber-200",
  disputed: "bg-red-100 text-red-700 border border-red-200 font-semibold",
  "disputed-card": "border-crimson-700 bg-gradient-to-r from-red-950 to-red-900 text-red-100 shadow-lg shadow-red-900/30",
  accepted: "bg-blue-100 text-blue-700 border border-blue-200 font-semibold",
};

/** Convenience: get the badge class for a key, with fallback. */
export function getStatusBadgeClass(key) {
  return STATUS_BADGE_CLASSES[key] || "bg-secondary text-foreground/80";
}

/** Convenience: get the display label for a key, with fallback. */
export function getStatusLabel(key) {
  return STATUS_LABELS[key] || key || "Unknown";
}

// ---------------------------------------------------------------------------
// 3. Expert label (shown below project title on cards)
// ---------------------------------------------------------------------------

/**
 * Returns an object describing what to show about the assigned expert.
 * @param {{ assignedExpertId: string | null }} project
 * @param {function} getUserById — e.g. getMockUserById
 * @returns {{ text: string, isAssigned: boolean }}
 */
export function getExpertDisplayInfo(project, getUserById) {
  if (project?.assignedExpertId) {
    const expert = getUserById(project.assignedExpertId);
    return {
      text: expert ? `with ${expert.fullName}` : "with assigned expert",
      isAssigned: true,
    };
  }
  return { text: "No expert assigned yet", isAssigned: false };
}

// ---------------------------------------------------------------------------
// 4. Client-side button config — based on project status
//    Returns { label: string, className: string, behavior: string }
// ---------------------------------------------------------------------------

const CLIENT_BUTTON_MAP = {
  reviewing_proposals: {
    label: "View Project Details",
    className: "bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover",
    linkTo: (p) => `/client/projects/${p.id}`,
  },
  pending_escrow: {
    label: "Deposit Escrow",
    className: "bg-amber-600 text-white hover:bg-amber-700",
    linkTo: (p) => `/client/my-projects?projectId=${p.id}&view=proposals`,
  },
  in_progress: {
    label: "Manage Project",
    className: "bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover",
    linkTo: (p) => `/client/projects/${p.id}`,
  },
  waiting_review: {
    label: "Review Submission",
    className: "bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover",
    linkTo: (p) => `/client/projects/${p.id}`,
  },
  needs_revision: {
    label: "Review Changes",
    className: "bg-orange-600 text-white hover:bg-orange-700",
    linkTo: (p) => `/client/projects/${p.id}`,
  },
  completed: {
    label: "View Summary",
    className: "bg-brand-green text-brand-green-foreground hover:bg-brand-green/90",
    linkTo: (p) => `/client/projects/${p.id}`,
  },
  cancelled: {
    label: "View Details",
    className: "bg-secondary text-secondary-foreground hover:bg-muted-foreground/30",
    linkTo: (p) => `/client/projects/${p.id}`,
  },
  contract_cancelled: {
    label: "View Details",
    className: "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100",
    linkTo: (p) => `/client/projects/${p.id}`,
  },
  accepted: {
    label: "View Project Details",
    className: "bg-brand-primary text-white hover:bg-brand-primary-hover",
    linkTo: (p) => `/client/projects/${p.id}`,
  },
};

/** Get the button config for a client-side project card. */
export function getClientButtonConfig(statusKey) {
  return CLIENT_BUTTON_MAP[statusKey] || CLIENT_BUTTON_MAP.reviewing_proposals;
}

// ---------------------------------------------------------------------------
// 5. Expert-side button config — based on project status
// ---------------------------------------------------------------------------

const EXPERT_BUTTON_MAP = {
  in_progress: {
    label: "Update Progress",
    className: "bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover",
    linkTo: (p) => `/expert/projects/${p.id}`,
  },
  waiting_review: {
    label: "Waiting for Client Review",
    className: "bg-yellow-100 text-yellow-700 border border-yellow-300 cursor-default",
    disabled: true,
  },
  needs_revision: {
    label: "Update Submission",
    className: "bg-orange-600 text-white hover:bg-orange-700",
    linkTo: (p) => `/expert/projects/${p.id}`,
  },
  completed: {
    label: "View Completed Project",
    className: "bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover",
    linkTo: (p) => `/expert/projects/${p.id}`,
  },
  accepted: {
    label: "View Project Details",
    className: "bg-brand-primary text-white hover:bg-brand-primary-hover",
    linkTo: (p) => `/expert/projects/${p.id}`,
  },
};

/** Get the button config for an expert-side project card. */
export function getExpertButtonConfig(statusKey) {
  return EXPERT_BUTTON_MAP[statusKey] || EXPERT_BUTTON_MAP.in_progress;
}

// ---------------------------------------------------------------------------
// 6. Derive the standardized project status key from raw DB relationships
// ---------------------------------------------------------------------------

/**
 * Derive a STANDARDIZED status key from raw project data + relationship counts.
 *
 * This is the single function all pages should use. It returns one of the
 * standardized keys (e.g., "in_progress") rather than a display label.
 *
 * Rules (first match wins):
 *   1. Raw status is "completed" | "cancelled" → pass through as-is
 *   2. Raw status is "in_progress":
 *      - If ALL tasks are completed → "completed"
 *      - If ANY task is pending_review → "waiting_review"
 *      - If ANY task is needs_revision → "needs_revision"
 *      - Otherwise → "in_progress"
 *   3. Raw status is "open":
 *      - If has assigned expert → "in_progress" (project was just assigned)
 *      - If has proposals → "reviewing_proposals"
 *      - Otherwise → "reviewing_proposals" (shown as "Seeking Expert" in UI) — see
 *        `getStatusLabel` and the `proposalCount` param for finer display control.
 *
 * @param {object} project — raw project from mock DB
 * @param {{ proposalCount?: number }} options
 * @returns {string} standardized status key
 */
export function deriveProjectStatusKey(project, { proposalCount = 0 } = {}) {
  if (!project) return "reviewing_proposals";

  const raw = project.status;

  // Completed / cancelled pass through directly
  if (raw === "completed") return "completed";
  if (raw === "cancelled") return "cancelled";
  if (raw === "contract_cancelled") return "contract_cancelled";
  if (raw === "pending_escrow" || raw === "pending escrow") return "pending_escrow";
  if (raw === "disputed" || raw === "Disputed" || raw === "under_review" || raw === "under review" || raw === "Under Review") return "disputed";
  if (raw === "accepted" || raw === "Accepted") return "accepted";

  // in_progress or active → check task states for waiting_review / needs_revision
  if (raw === "in_progress" || raw === "active") return "in_progress";

  // open → determine based on assigned expert and proposals
  if (raw === "open") {
    // If an expert is assigned, treat as in_progress (assignment was likely
    // done in this session and the raw status hasn't been updated yet)
    if (project.assignedExpertId) return "in_progress";
    // Otherwise it's reviewing proposals (the default for open projects)
    return "reviewing_proposals";
  }

  // Fallback: map any unknown raw status
  return "reviewing_proposals";
}

// ---------------------------------------------------------------------------
// 7. Backward-compatible wrapper for existing deriveProjectDisplayStatus calls
// ---------------------------------------------------------------------------

/**
 * @deprecated Use deriveProjectStatusKey + getStatusLabel instead.
 * Kept for backward compatibility — returns the human-readable label.
 */
export function deriveProjectDisplayStatus(project, options) {
  const key = deriveProjectStatusKey(project, options);
  return getStatusLabel(key);
}

// ---------------------------------------------------------------------------
// 8. Task-level status config — used by ProjectTimelineManager
//    These are the statuses derived by deriveTaskStatus(), not project-level.
// ---------------------------------------------------------------------------

export const TASK_STATUS_CONFIG = {
  "Not Started":         { className: "bg-secondary text-muted-foreground",   label: "Not Started" },
  "In Progress":         { className: "bg-brand-primary-light text-brand-primary",   label: "In Progress" },
  "Pending Review":      { className: "bg-purple-100 text-purple-700", label: "Waiting for Client Review" },
  "Waiting For Approval":{ className: "bg-purple-100 text-purple-700", label: "Waiting For Approval" },
  "Checklist Completed": { className: "bg-amber-50 text-amber-700 border border-amber-200", label: "Checklist Completed" },
  "Waiting for Expert Product": { className: "bg-yellow-50 text-yellow-700 border border-yellow-200", label: "Waiting for Expert Product" },
  "Completed":           { className: "bg-brand-green/10 text-brand-green",  label: "Completed" },
  "Done":                { className: "bg-brand-green/10 text-brand-green",  label: "Done" },
  "Rework":              { className: "bg-orange-100 text-orange-700 border border-orange-200", label: "Rework" },
  "Needs Revision":      { className: "bg-red-100 text-red-700 border border-red-200", label: "Decline" },
  "Decline":             { className: "bg-red-100 text-red-700 border border-red-200", label: "Decline" },
  "Reopen Requested":    { className: "bg-red-100 text-red-700",     label: "Reopen Requested" },
  "Cancelled":           { className: "bg-red-100 text-red-700",     label: "Cancelled" },
};

/** Get the badge class for a task-level display status. */
export function getTaskStatusClass(status) {
  return TASK_STATUS_CONFIG[status]?.className || "bg-secondary text-foreground/80";
}

/** Get the display label for a task-level display status. */
export function getTaskStatusLabel(status) {
  return TASK_STATUS_CONFIG[status]?.label || status;
}

// ---------------------------------------------------------------------------
// 9. Deadline status config — used by TaskProgressCard and TaskDetailPage
// ---------------------------------------------------------------------------

export const DEADLINE_STATUS_CONFIG = {
  normal: {
    className: "bg-brand-primary-light text-brand-primary",
    label: "Due in X days",
  },
  warning: {
    className: "bg-orange-50 text-orange-700",
    label: "Due soon",
  },
  overdue: {
    className: "bg-red-50 text-red-700",
    label: "Overdue",
  },
};

/** Get the badge class for a deadline urgency level. */
export function getDeadlineStatusClass(urgency) {
  return DEADLINE_STATUS_CONFIG[urgency]?.className || DEADLINE_STATUS_CONFIG.normal.className;
}

/** Get the display label for a deadline urgency level. */
export function getDeadlineStatusLabel(urgency) {
  return DEADLINE_STATUS_CONFIG[urgency]?.label || DEADLINE_STATUS_CONFIG.normal.label;
}
