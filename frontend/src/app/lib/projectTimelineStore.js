// =============================================================================
// Project Timeline Store — API-first with mock DB fallbacks.
// =============================================================================
//
// All functions attempt the API first; when the backend is unavailable,
// they fall back to the mock DB (in-memory + localStorage persistence).
//
// Status derivation delegates to the centralized projectStatusConfig
// so both Client and Expert sides use the same logic and labels.
// =============================================================================

import { api } from "../../services/api.js";
import {
  listTasks,
  listProjects,
  submitTaskForReview,
  approveTaskSubmission,
  requestTaskRevision,
  requestTaskReopen,
  updateMiniTaskInTask,
  addAuditEntry,
  updateTask as updateTaskInMockDb,
} from "../../data/mockDatabase.js";

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
 * Attempts API first; falls back to mock DB (which persists in memory + localStorage).
 */
export async function submitTask(taskId, data) {
  try {
    return await api.tasks.submit(taskId, data);
  } catch {
    // Backend unavailable — fall back to mock DB
    try {
      const actorName = data?.actorName || data?.submittedBy || "Expert";
      const result = submitTaskForReview(taskId, actorName);
      if (result) {
        addProjectActivity(result.projectId || "", {
          actor: "Expert",
          message: `[Expert] submitted task "${result.title || taskId}" for review`,
        });
      }
      return result;
    } catch (mockErr) {
      console.error("[projectTimelineStore] submitTask mock fallback failed:", mockErr);
      return null;
    }
  }
}

/**
 * Approve a task submission.
 */
export async function approveSubmission(submissionId, data) {
  try {
    return await api.tasks.reviewSubmission(submissionId, {
      status: "approved",
      feedback: data?.feedback || "",
    });
  } catch {
    // Backend unavailable — fall back to mock DB
    try {
      const actorName = data?.actorName || data?.reviewedBy || "Client";
      const result = approveTaskSubmission(submissionId, actorName);
      if (result) {
        addProjectActivity(result.projectId || "", {
          actor: "Client",
          message: `[Client] approved task "${result.title || submissionId}"`,
        });
      }
      return result;
    } catch (mockErr) {
      console.error("[projectTimelineStore] approveSubmission mock fallback failed:", mockErr);
      return null;
    }
  }
}

/**
 * Request a revision on a task submission.
 */
export async function requestRevision(submissionId, data) {
  try {
    return await api.tasks.reviewSubmission(submissionId, {
      status: "needs_revision",
      feedback: data?.feedback || "",
    });
  } catch {
    // Backend unavailable — fall back to mock DB
    try {
      const actorName = data?.actorName || data?.reviewedBy || "Client";
      const result = requestTaskRevision(submissionId, actorName, data?.feedback || "");
      if (result) {
        addProjectActivity(result.projectId || "", {
          actor: "Client",
          message: `[Client] requested revision on task "${result.title || submissionId}": "${data?.feedback || ""}"`,
        });
      }
      return result;
    } catch (mockErr) {
      console.error("[projectTimelineStore] requestRevision mock fallback failed:", mockErr);
      return null;
    }
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
 */
export async function updateTask(taskId, updates) {
  try {
    return await api.tasks.update(taskId, updates);
  } catch {
    // Backend unavailable — fall back to mock DB
    try {
      const result = updateTaskInMockDb(taskId, updates);
      if (result && updates.status) {
        addProjectActivity(result.projectId || "", {
          actor: updates.actor || "System",
          message: `Task "${result.title || taskId}" status changed to "${updates.status}"`,
        });
      }
      return result;
    } catch (mockErr) {
      console.error("[projectTimelineStore] updateTask mock fallback failed:", mockErr);
      return null;
    }
  }
}

/**
 * Update a mini-task state.
 */
export async function updateMiniTask(taskId, miniTaskId, updates) {
  try {
    return await api.tasks.updateMiniTask(taskId, miniTaskId, updates);
  } catch {
    // Backend unavailable — fall back to mock DB (updateMiniTaskInTask already imported)
    try {
      return updateMiniTaskInTask(taskId, miniTaskId, updates);
    } catch (mockErr) {
      console.error("[projectTimelineStore] updateMiniTask mock fallback failed:", mockErr);
      return null;
    }
  }
}

/**
 * Add a log entry to a task.
 */
export async function addTaskLog(taskId, log) {
  try {
    return await api.tasks.addLog(taskId, log);
  } catch {
    // Backend unavailable — fall back to audit entry
    try {
      return addAuditEntry({
        taskId,
        action: log.action || "task_log",
        actor: log.actor || "System",
        actorName: log.actorName || log.actor || "System",
        details: log.message || log.details || "",
      });
    } catch (mockErr) {
      console.error("[projectTimelineStore] addTaskLog mock fallback failed:", mockErr);
      return null;
    }
  }
}

/**
 * Add feedback to a task.
 */
export async function addTaskFeedback(taskId, feedback) {
  try {
    return await api.tasks.addFeedback(taskId, feedback);
  } catch {
    // Backend unavailable — fall back to audit entry
    try {
      return addAuditEntry({
        taskId,
        action: "task_feedback",
        actor: feedback.actor || "Client",
        actorName: feedback.actorName || feedback.actor || "Client",
        details: feedback.message || feedback.feedback || "",
      });
    } catch (mockErr) {
      console.error("[projectTimelineStore] addTaskFeedback mock fallback failed:", mockErr);
      return null;
    }
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
export function getProjectProgress(projectId) {
  if (typeof window !== "undefined" && import.meta.env.VITE_USE_MOCK_DB === "true") {
    try {
      const tasks = listTasks((t) => t.projectId === projectId);
      return getOverallProgress(tasks);
    } catch (err) {
      console.error("Failed to compute progress:", err);
    }
  }
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
  if (total === 0) {
    const rawStatus = task?.status?.toLowerCase();
    const isCompleted = rawStatus === "completed" || rawStatus === "done" || task?.approval === "Approved";
    return { completed: isCompleted ? 1 : 0, total: 1, percent: isCompleted ? 100 : 0 };
  }
  const completed = miniTasks.filter(
    (mt) => mt.isCompleted === true || mt.status === "done" || mt.status === "completed",
  ).length;
  return { completed, total, percent: Math.round((completed / total) * 100) };
}

/**
 * Get mini-task progress for a given task ID.
 * Falls back to mock DB when API is unavailable.
 */
export function getTaskMiniTaskProgress(taskId) {
  try {
    // Try to read from mock DB if available
    const task = listTasks().find((t) => t.id === taskId);
    if (task) {
      return deriveTaskProgress(task).percent;
    }
  } catch {
    // ignore
  }
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

/**
 * Get deadline info with urgency classification.
 *
 * Urgency levels:
 *   - "overdue": deadline has passed
 *   - "warning": due today or tomorrow (0-1 days remaining)
 *   - "normal": due in 2+ days
 *
 * @param {string|Date} deadlineDate
 * @returns {{ formattedDate: string, remainingText: string, isOverdue: boolean, urgency: string, daysRemaining: number }}
 */
export function getDeadlineInfo(deadlineDate) {
  if (!deadlineDate) {
    return { formattedDate: "N/A", remainingText: "N/A", isOverdue: false, urgency: "normal", daysRemaining: null };
  }
  const deadline = new Date(deadlineDate);
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const isOverdue = diffMs < 0;

  let urgency = "normal";
  if (isOverdue) {
    urgency = "overdue";
  } else if (diffDays <= 1) {
    urgency = "warning";
  }

  let remainingText;
  if (isOverdue) {
    const absDays = Math.abs(diffDays);
    remainingText = absDays === 1 ? "Overdue by 1 day" : `Overdue by ${absDays} days`;
  } else if (diffDays === 0) {
    remainingText = "Due today";
  } else if (diffDays === 1) {
    remainingText = "Due tomorrow";
  } else {
    remainingText = `Due in ${diffDays} days`;
  }

  return {
    formattedDate: deadline.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    remainingText,
    isOverdue,
    urgency,
  };
}

export function getRemainingTimelineText(deadlineDate) {
  if (!deadlineDate) return "N/A";

  let deadline = new Date(deadlineDate);

  // Handle relative days offset (e.g. 14 or 30)
  const num = Number(deadlineDate);
  if (!isNaN(num) && num < 1000) {
    deadline = new Date();
    deadline.setDate(deadline.getDate() + num);
  }

  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();

  if (diffMs <= 0) {
    return "Đã quá hạn";
  }

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays >= 30) {
    const months = Math.floor(diffDays / 30);
    const remDays = diffDays % 30;
    return `${months} tháng ${remDays} ngày`;
  } else if (diffDays >= 1) {
    const hours = diffHours % 24;
    return `${diffDays} ngày ${hours} giờ`;
  } else if (diffHours >= 1) {
    const minutes = diffMin % 60;
    return `${diffHours} giờ ${minutes} phút`;
  } else if (diffMin >= 1) {
    const seconds = diffSec % 60;
    return `${diffMin} phút ${seconds} giây`;
  } else {
    return `${diffSec} giây`;
  }
}

