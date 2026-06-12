// =============================================================================
// Project Timeline Store — API-first, no fake data fallback.
// =============================================================================
//
// All functions delegate to the API service layer. When the backend is
// unavailable, null is returned — no mock data, no hardcoded fallback.
//
// Status derivation delegates to the centralized projectStatusConfig
// so both Client and Expert sides use the same logic and labels.
// =============================================================================

import { api } from "../../services/api.js";

// Re-export centralized status functions — all pages should import these from
// this file (or directly from projectStatusConfig.js) rather than defining
// their own status mappings.
export {
  deriveProjectStatusKey,
  deriveProjectDisplayStatus,
  getStatusLabel,
  getStatusBadgeClass,
  getExpertDisplayInfo,
  getClientButtonConfig,
  getExpertButtonConfig,
  getTaskStatusClass,
  getTaskStatusLabel,
  STATUS_LABELS,
  STATUS_BADGE_CLASSES,
  TASK_STATUS_CONFIG,
} from "./projectStatusConfig.js";

// ---------------------------------------------------------------------------
// Status mapping constants
// ---------------------------------------------------------------------------

const TASK_STATUS_MAP = {
  completed: "Completed",
  pending_review: "Pending Review",
  in_progress: "In Progress",
  pending: "Pending",
  needs_revision: "Needs Revision",
};

const MINI_TASK_STATUS_MAP = {
  done: "done",
  in_progress: "pending",
  pending: "pending",
};

const ACTOR_MAP = {
  proposal_submitted: "Expert",
  proposal_accepted: "Client",
  project_created: "Client",
  escrow_deposited: "Client",
  task_submitted: "Expert",
  task_approved: "Client",
  revision_requested: "Client",
  payment_released: "Admin",
  dispute_opened: "Client",
  dispute_resolved: "Admin",
};

// ---------------------------------------------------------------------------
// Runtime Activity Log — accumulates events at runtime.
// TODO: Persist activity logs via API when backend is connected.
// ---------------------------------------------------------------------------

/** @type {Map<string, Array<{id:string, actor:string, time:string, message:string}>>} */
const _runtimeActivityLogs = new Map();

/** @type {Map<string, {id:string, reason:string, requestedDays:number, status:string, requestedAt:string, responseNote?:string}>} */
const _runtimeExtensionRequests = new Map();

/**
 * Add a runtime activity entry for a project.
 * Automatically stamps id and createdAt.
 *
 * @param {string} projectId
 * @param {{ actor: string, message: string }} partial
 * @returns the full log entry
 */
export function addProjectActivity(projectId, { actor, message }) {
  const entry = {
    id: `runtime-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    actor,
    time: new Date().toISOString(),
    message,
  };
  if (!_runtimeActivityLogs.has(projectId)) {
    _runtimeActivityLogs.set(projectId, []);
  }
  _runtimeActivityLogs.get(projectId).push(entry);

  // Bump a sessionStorage version so ProjectTimelineManager can detect
  // that it needs to re-fetch after a navigation-back.
  try {
    const prev = parseInt(sessionStorage.getItem("timelineActivityVersion") || "0", 10);
    sessionStorage.setItem("timelineActivityVersion", String(prev + 1));
  } catch { /* noop */ }

  return entry;
}

/** Get merged static + runtime activity logs for a project, newest first. */
function getMergedActivityLogs(projectId) {
  // TODO: Replace with API call — api.timeline.getActivityLogs(projectId)
  const staticLogs = [].map((log) => ({
    id: log.id,
    actor: ACTOR_MAP[log.action] || "System",
    time: log.createdAt,
    message: log.description,
  }));
  const runtimeLogs = _runtimeActivityLogs.get(projectId) || [];
  return [...staticLogs, ...runtimeLogs];
}

// Clear runtime logs (used by Reset Demo)
function clearRuntimeActivityLogs() {
  _runtimeActivityLogs.clear();
  _runtimeExtensionRequests.clear();
}

// ---------------------------------------------------------------------------
// buildTimelineFromMockDb — legacy helper kept for reference.
// TODO: Remove once all callers are migrated to real API.
// Currently always returns null (no fake data).
// ---------------------------------------------------------------------------

function buildTimelineFromMockDb(projectId) {
  // TODO: Replace with API call — api.timeline.get(projectId)
  // No fake data fallback — returns null when API is unavailable.
  return null;
}

// ---------------------------------------------------------------------------
// Public API — all functions return Promises.
// When the backend is unavailable, null is returned.
// TODO: Connect all functions to real API endpoints.
// ---------------------------------------------------------------------------

/**
 * Fetch the full project timeline.
 *
 * @param {string|number} projectId
 * @returns {Promise<object|null>} Timeline object, or null if unavailable
 */
export async function getProjectTimeline(projectId) {
  try {
    const data = await api.timeline.get(projectId);
    return data;
  } catch {
    // Backend unavailable — return null (no fake data fallback)
    // TODO: Connect to real API — api.timeline.get(projectId)
    return null;
  }
}

/**
 * Submit a completed task for client review.
 *
 * TODO: Connect to real API — api.tasks.submit(taskId, data)
 */
export async function submitTask(taskId, data) {
  try {
    await api.tasks.submit(taskId, data);
    // TODO: Return updated timeline when API is connected — getProjectTimeline(projectId)
    return null;
  } catch {
    // Backend unavailable — return null
    // TODO: Connect to real API — api.tasks.submit(taskId, data)
    return null;
  }
}

/**
 * Approve a task submission.
 *
 * TODO: Connect to real API — api.tasks.reviewSubmission(submissionId, { status: "approved", feedback })
 */
export async function approveSubmission(submissionId, data) {
  try {
    await api.tasks.reviewSubmission(submissionId, {
      status: "approved",
      feedback: data?.feedback || "",
    });
    // TODO: Return updated timeline when API is connected — getProjectTimeline(projectId)
    return null;
  } catch {
    // Backend unavailable — return null
    // TODO: Connect to real API — api.tasks.reviewSubmission(submissionId, ...)
    return null;
  }
}

/**
 * Request a revision on a task submission.
 *
 * TODO: Connect to real API — api.tasks.reviewSubmission(submissionId, { status: "needs_revision", feedback })
 */
export async function requestRevision(submissionId, data) {
  try {
    await api.tasks.reviewSubmission(submissionId, {
      status: "needs_revision",
      feedback: data?.feedback || "",
    });
    // TODO: Return updated timeline when API is connected — getProjectTimeline(projectId)
    return null;
  } catch {
    // Backend unavailable — return null
    // TODO: Connect to real API — api.tasks.reviewSubmission(submissionId, ...)
    return null;
  }
}

/**
 * Request a project deadline extension.
 *
 * TODO: Connect to real API — api.extensions.request(projectId, data)
 */
export async function requestExtension(projectId, data) {
  try {
    return await api.extensions.request(projectId, data);
  } catch {
    // Backend unavailable — store extension in runtime memory so the UI
    // can show it during the current session, but return null for the timeline.
    const ext = {
      id: `ext-${Date.now()}`,
      reason: data.reason,
      requestedDays: data.additionalDays,
      status: "pending",
      requestedAt: new Date().toISOString(),
    };
    _runtimeExtensionRequests.set(projectId, ext);
    addProjectActivity(projectId, {
      actor: "Expert",
      message: `[Expert] requested a ${data.additionalDays}-day extension: "${data.reason}"`,
    });
    // TODO: Connect to real API — api.extensions.request(projectId, data)
    return null;
  }
}

/**
 * Approve or reject an extension request.
 *
 * TODO: Connect to real API — api.extensions.resolve(projectId, extensionId, data)
 */
export async function resolveExtension(projectId, extensionId, data) {
  try {
    return await api.extensions.resolve(projectId, extensionId, data);
  } catch {
    // Backend unavailable — update runtime extension state
    const ext = _runtimeExtensionRequests.get(projectId);
    if (ext) {
      ext.status = data.status;
      ext.responseNote =
        data.responseNote ||
        (data.status === "approved"
          ? "Extension approved by client."
          : "Extension rejected by client.");
      _runtimeExtensionRequests.set(projectId, ext);
    }
    const verb = data.status === "approved" ? "approved" : "rejected";
    addProjectActivity(projectId, {
      actor: "Client",
      message: `[Client] ${verb} the ${ext?.requestedDays || ""}-day extension request.`,
    });
    // TODO: Connect to real API — api.extensions.resolve(projectId, extensionId, data)
    return null;
  }
}

/**
 * Update a task's state (for internal use by the timeline manager).
 *
 * TODO: Connect to real API — api.tasks.update(taskId, updates)
 */
export async function updateTask(taskId, updates) {
  try {
    return await api.tasks.update(taskId, updates);
  } catch {
    // Backend unavailable — return null
    // TODO: Connect to real API — api.tasks.update(taskId, updates)
    return null;
  }
}

/**
 * Update a mini-task state.
 *
 * TODO: Connect to real API — api.tasks.updateMiniTask(taskId, miniTaskId, updates)
 */
export async function updateMiniTask(taskId, miniTaskId, updates) {
  try {
    return await api.tasks.updateMiniTask(taskId, miniTaskId, updates);
  } catch {
    // Backend unavailable — return null
    // TODO: Connect to real API — api.tasks.updateMiniTask(taskId, miniTaskId, updates)
    return null;
  }
}

/**
 * Add a log entry to a task.
 *
 * TODO: Connect to real API — api.tasks.addLog(taskId, log)
 */
export async function addTaskLog(taskId, log) {
  try {
    return await api.tasks.addLog(taskId, log);
  } catch {
    // Backend unavailable — return null
    // TODO: Connect to real API — api.tasks.addLog(taskId, log)
    return null;
  }
}

/**
 * Add feedback to a task.
 *
 * TODO: Connect to real API — api.tasks.addFeedback(taskId, feedback)
 */
export async function addTaskFeedback(taskId, feedback) {
  try {
    return await api.tasks.addFeedback(taskId, feedback);
  } catch {
    // Backend unavailable — return null
    // TODO: Connect to real API — api.tasks.addFeedback(taskId, feedback)
    return null;
  }
}

// ---------------------------------------------------------------------------
// Reset helpers (kept for the Reset Demo button)
// ---------------------------------------------------------------------------

export function resetProjectTimeline() {
  clearRuntimeActivityLogs();
  try { sessionStorage.removeItem("timelineActivityVersion"); } catch { /* noop */ }
}

// ---------------------------------------------------------------------------
// Project-level progress from timeline
// ---------------------------------------------------------------------------

/**
 * Compute the overall progress for a project from its timeline's mini tasks.
 * Returns 0 if the project has no timeline or no tasks.
 *
 * @param {string} projectId
 * @returns {number} 0–100
 */
export function getProjectProgress(_projectId) {
  // TODO: Replace with API call — api.timeline.getProgress(projectId)
  return 0;
}

// ---------------------------------------------------------------------------
// Pure computation helpers (no API needed)
// ---------------------------------------------------------------------------

/**
 * Derive the display status for a single task from mini-task completion
 * and submission/review state — the single source of truth for all UI.
 *
 * Rules (first match wins):
 *   1. All mini tasks done AND a submission was approved  → "Completed"
 *   2. All mini tasks done AND submitted for review      → "Pending Review"
 *   3. Client requested changes on a submission          → "Needs Revision"
 *   4. Not all mini tasks done                           → "In Progress"
 *   5. Fallback (no mini tasks, no submission info)      → keep existing status
 *
 * @param {{ miniTasks?: Array<{status: string}>, status?: string, approval?: string|null }} task
 * @returns {string} display status
 */
export function deriveTaskStatus(task) {
  if (!task) return "In Progress";

  const miniTasks = task.miniTasks || [];
  const total = miniTasks.length;
  const completed = miniTasks.filter(
    (mt) => mt.status === "done" || mt.status === "completed",
  ).length;

  // Check submission-related state
  const isSubmitted = task.status === "Pending Review" || task.status === "pending_review";
  const isApproved = task.approval === "Approved" || task.status === "completed";
  const needsRevision = task.status === "Needs Revision" || task.status === "needs_revision";

  // If there are no mini tasks, trust the raw status as-is
  if (total === 0) {
    return task.status || "In Progress";
  }

  const allDone = completed >= total;

  // Rule 1: All mini tasks done + client approved → Completed
  if (allDone && isApproved) return "Completed";

  // Rule 2: All mini tasks done + submitted for review → Waiting for Client Review
  if (allDone && isSubmitted) return "Pending Review";

  // Rule 3: Client requested changes
  if (allDone && needsRevision) return "Needs Revision";

  // Rule 4: Not all mini tasks done → always In Progress
  if (!allDone) return "In Progress";

  // Rule 5: All mini tasks done but not yet submitted → In Progress (expert still working)
  return "In Progress";
}

/**
 * Compute mini-task progress for a single task.
 *
 * @param {{ miniTasks?: Array<{status: string}> }} task
 * @returns {{ completed: number, total: number, percent: number }}
 */
export function deriveTaskProgress(task) {
  const miniTasks = task?.miniTasks || [];
  const total = miniTasks.length;
  if (total === 0) return { completed: 0, total: 0, percent: 0 };
  const completed = miniTasks.filter(
    (mt) => mt.status === "done" || mt.status === "completed",
  ).length;
  return { completed, total, percent: Math.round((completed / total) * 100) };
}

/**
 * Get mini-task progress for a given task ID.
 * Returns 0 when the timeline is unavailable (no fake data fallback).
 *
 * TODO: Connect to real API — api.tasks.getProgress(taskId)
 */
export function getTaskMiniTaskProgress(taskId) {
  // TODO: Replace with API call — api.tasks.getProgress(taskId)
  // No fake data fallback — returns 0 when API is unavailable.
  return 0;
}

export function getOverallProgress(tasks) {
  if (!tasks || tasks.length === 0) return 0;
  let totalProgress = 0;
  tasks.forEach((task) => {
    totalProgress += deriveTaskProgress(task).percent;
  });
  return Math.round(totalProgress / tasks.length);
}

export function getDeadlineInfo(deadlineDate) {
  if (!deadlineDate) {
    return { formattedDate: "N/A", remainingText: "N/A", isOverdue: false };
  }
  const deadline = new Date(deadlineDate);
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const isOverdue = diffMs < 0;

  return {
    formattedDate: deadline.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    remainingText: isOverdue
      ? `${Math.abs(diffDays)} days overdue`
      : `${diffDays} days remaining`,
    isOverdue,
  };
}
