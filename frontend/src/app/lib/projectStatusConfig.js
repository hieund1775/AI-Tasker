// =============================================================================
// Project Status Configuration - single source of truth for all status display
// =============================================================================
//
// Every page that renders a project card, badge, or button should import from
// this file instead of defining its own status labels, colours, or logic.
//
// Standardized status keys (the "source of truth" identifier):
//   reviewing_proposals  - Project is open, client is reviewing incoming proposals
//   in_progress           - Project has an assigned expert and is being worked on
//   waiting_review        - Expert has submitted work, waiting for client review
//   needs_revision        - Client requested changes on a submission
//   completed             - Project is finished
//   cancelled             - Project was cancelled
// =============================================================================

// ---------------------------------------------------------------------------
// 1. Status display labels - mapping from standardized key -> human label
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
  awaiting_cancellation: "Awaiting Cancellation",
  cancel_done: "Cancelled Successfully",
  settled_dispute: "Settled Dispute",
  accepted: "Delivery Accepted",
  payment_released: "Payment Released",
};

// ---------------------------------------------------------------------------
// 2. Status badge colour classes - standardized key -> Tailwind classes
// ---------------------------------------------------------------------------

export const STATUS_BADGE_CLASSES = {
  reviewing_proposals: "bg-brand-primary-light text-brand-primary border border-brand-primary/20 font-semibold",
  in_progress: "bg-brand-primary-light text-brand-primary border border-brand-primary/20 font-semibold",
  waiting_review: "bg-warning-light text-warning border border-warning/25 font-semibold",
  needs_revision: "bg-warning-light text-warning border border-warning/25 font-semibold",
  completed: "bg-success-light text-success border border-success/25 font-semibold",
  cancelled: "bg-destructive-light text-destructive border border-destructive/25 font-semibold",
  contract_cancelled: "bg-destructive-light text-destructive border border-destructive/25 font-semibold",
  pending_escrow: "bg-warning-light text-warning border border-warning/25 font-semibold",
  disputed: "bg-destructive-light text-destructive border border-destructive/25 font-semibold",
  "disputed-card": "bg-card border border-border hover:border-border/80",
  awaiting_cancellation: "bg-warning-light text-warning border border-warning/25 font-semibold",
  cancel_done: "bg-destructive-light text-destructive border border-destructive/25 font-semibold",
  settled_dispute: "bg-success-light text-success border border-success/25 font-semibold",
  accepted: "bg-success-light text-success border border-success/25 font-semibold",
  payment_released: "bg-success-light text-success border border-success/25 font-semibold",
};

/** Convenience: get the badge class for a key, with fallback. */
export function getStatusBadgeClass(key) {
  return STATUS_BADGE_CLASSES[key] || "bg-secondary text-foreground/80 border border-border";
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
 * @param {function} getUserById - e.g. getMockUserById
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
// 4. Client-side button config - based on project status
//    Returns { label: string, className: string, behavior: string }
// ---------------------------------------------------------------------------

const CLIENT_BUTTON_MAP = {
  reviewing_proposals: {
    label: "View Project Details",
    className: "bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover",
    linkTo: (p) => `/client/projects/${p.id}`,
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
    className: "bg-warning text-primary-foreground hover:bg-warning/85",
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
    className: "bg-destructive-light text-destructive border border-destructive/20 hover:bg-destructive-light",
    linkTo: (p) => `/client/projects/${p.id}`,
  },
  awaiting_cancellation: {
    label: "View cancellation",
    className: "bg-warning text-primary-foreground hover:bg-warning/85",
    linkTo: (p) => `/client/projects/${p.id}`,
  },
  cancel_done: {
    label: "Cancellation details",
    className: "bg-destructive-light text-destructive border border-destructive/20 hover:bg-destructive-light",
    linkTo: (p) => `/client/projects/${p.id}`,
  },
  settled_dispute: {
    label: "View Summary",
    className: "bg-secondary text-secondary-foreground hover:bg-muted-foreground/30",
    linkTo: (p) => `/client/projects/${p.id}`,
  },
};

/** Get the button config for a client-side project card. */
export function getClientButtonConfig(statusKey) {
  return CLIENT_BUTTON_MAP[statusKey] || CLIENT_BUTTON_MAP.reviewing_proposals;
}

// ---------------------------------------------------------------------------
// 5. Expert-side button config - based on project status
// ---------------------------------------------------------------------------

const EXPERT_BUTTON_MAP = {
  in_progress: {
    label: "Update Progress",
    className: "bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover",
    linkTo: (p) => `/expert/projects/${p.id}`,
  },
  waiting_review: {
    label: "Waiting for Client Review",
    className: "bg-warning-light text-warning border border-warning/35 cursor-default",
    disabled: true,
  },
  needs_revision: {
    label: "Update Submission",
    className: "bg-warning text-primary-foreground hover:bg-warning/85",
    linkTo: (p) => `/expert/projects/${p.id}`,
  },
  completed: {
    label: "View Completed Project",
    className: "bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover",
    linkTo: (p) => `/expert/projects/${p.id}`,
  },
  awaiting_cancellation: {
    label: "View cancellation",
    className: "bg-warning text-primary-foreground hover:bg-warning/85",
    linkTo: (p) => `/expert/projects/${p.id}`,
  },
  cancel_done: {
    label: "Cancellation details",
    className: "bg-destructive-light text-destructive border border-destructive/20 hover:bg-destructive-light",
    linkTo: (p) => `/expert/projects/${p.id}`,
  },
  settled_dispute: {
    label: "View Completed Project",
    className: "bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover",
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
 *   1. Raw status is "completed" | "cancelled" -> pass through as-is
 *   2. Raw status is "in_progress":
 *      - If ALL tasks are completed -> "completed"
 *      - If ANY task is pending_review -> "waiting_review"
 *      - If ANY task is needs_revision -> "needs_revision"
 *      - Otherwise -> "in_progress"
 *   3. Raw status is "open":
 *      - If has assigned expert -> "in_progress" (project was just assigned)
 *      - If has proposals -> "reviewing_proposals"
 *      - Otherwise -> "reviewing_proposals" (shown as "Seeking Expert" in UI) - see
 *        `getStatusLabel` and the `proposalCount` param for finer display control.
 *
 * @param {object} project - raw project from mock DB
 * @param {{ proposalCount?: number }} options
 * @returns {string} standardized status key
 */
export function deriveProjectStatusKey(project, { proposalCount = 0 } = {}) {
  if (!project) return "reviewing_proposals";

  const raw = String(project.status || "").trim().toLowerCase();

  // Completed / cancelled pass through directly
  if (raw === "settled_dispute" || raw === "settled dispute") return "settled_dispute";
  if (raw === "completed" || raw === "complete") return "completed";
  if (raw === "accepted") return "accepted";
  if (raw === "payment_released" || raw === "payment released") return "payment_released";
  if (raw === "cancelled" || raw === "canceled" || raw === "stopped") return "cancelled";
  if (raw === "contract_cancelled") return "contract_cancelled";
  if (raw === "pending_escrow" || raw === "pending escrow") return "pending_escrow";
  if (raw === "disputed" || raw === "under_review" || raw === "under review") return "disputed";
  if (raw === "awaiting_cancellation" || raw === "awaiting cancellation") return "awaiting_cancellation";
  if (raw === "cancel_done") return "cancel_done";

  // in_progress or active -> check task states for waiting_review / needs_revision
  if (raw === "in_progress" || raw === "in progress" || raw === "inprogress" || raw === "active") return "in_progress";

  // open -> determine based on assigned expert and proposals
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
 * Kept for backward compatibility - returns the human-readable label.
 */
export function deriveProjectDisplayStatus(project, options) {
  const key = deriveProjectStatusKey(project, options);
  return getStatusLabel(key);
}

// ---------------------------------------------------------------------------
// 8. Task-level status config - used by ProjectTimelineManager
//    These are the statuses derived by deriveTaskStatus(), not project-level.
// ---------------------------------------------------------------------------

export const TASK_STATUS_CONFIG = {
  "Not Started":         { className: "bg-secondary text-muted-foreground border border-border font-semibold",   label: "Not Started" },
  "In Progress":         { className: "bg-brand-primary-light text-brand-primary border border-brand-primary/20 font-semibold",   label: "In Progress" },
  "Pending Review":      { className: "bg-warning-light text-warning border border-warning/25 font-semibold", label: "Waiting for Client Review" },
  "Waiting For Approval":{ className: "bg-warning-light text-warning border border-warning/25 font-semibold", label: "Waiting For Approval" },
  "Checklist Completed": { className: "bg-warning-light text-warning border border-warning/25 font-semibold", label: "Checklist Completed" },
  "Waiting for Expert Product": { className: "bg-warning-light text-warning border border-warning/25 font-semibold", label: "Waiting for Expert Product" },
  "Completed":           { className: "bg-success-light text-success border border-success/25 font-semibold",  label: "Completed" },
  "Done":                { className: "bg-success-light text-success border border-success/25 font-semibold",  label: "Done" },
  "Needs Revision":      { className: "bg-destructive-light text-destructive border border-destructive/25 font-semibold", label: "Decline" },
  "Decline":             { className: "bg-destructive-light text-destructive border border-destructive/25 font-semibold", label: "Decline" },
  "Rework":              { className: "bg-warning-light text-warning border border-warning/35 font-semibold", label: "Rework" },
  "Reopen Requested":    { className: "bg-destructive-light text-destructive border border-destructive/25 font-semibold",     label: "Reopen Requested" },
  "Cancelled":           { className: "bg-destructive-light text-destructive border border-destructive/25 font-semibold",     label: "Cancelled" },
};

/** Get the badge class for a task-level display status. */
export function getTaskStatusClass(status) {
  return TASK_STATUS_CONFIG[status]?.className || "bg-secondary text-foreground/80 border border-border";
}

/** Get the display label for a task-level display status. */
export function getTaskStatusLabel(status) {
  return TASK_STATUS_CONFIG[status]?.label || status;
}

// ---------------------------------------------------------------------------
// 9. Deadline status config - used by TaskProgressCard and TaskDetailPage
// ---------------------------------------------------------------------------

export const DEADLINE_STATUS_CONFIG = {
  normal: {
    className: "bg-brand-primary-light text-brand-primary border border-brand-primary/20 font-semibold",
    label: "Due in X days",
  },
  warning: {
    className: "bg-warning-light text-warning border border-warning/25 font-semibold",
    label: "Due soon",
  },
  overdue: {
    className: "bg-destructive-light text-destructive border border-destructive/25 font-semibold",
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
