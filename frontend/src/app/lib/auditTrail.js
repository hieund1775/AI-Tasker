// =============================================================================
// Audit Trail — centralized audit log management for task and project activity.
//
// All functions delegate to mockDatabase.js which stores audit entries in
// the runtime overlay (survives soft page refreshes during a session).
// =============================================================================

import { addAuditEntry, getAuditLogs } from "../../data/mockDatabase.js";

/**
 * Add an audit log entry for a task action.
 *
 * @param {object} params
 * @param {string} params.projectId
 * @param {string} params.taskId
 * @param {string} [params.miniTaskId]
 * @param {string} params.action — one of: mini_task_created, mini_task_completed,
 *        mini_tasks_confirmed, mini_tasks_unlocked, task_submitted_for_review,
 *        task_approved, task_revision_requested, task_reopened,
 *        mini_task_revision_requested, urgent_submission_requested
 * @param {string} params.actor — "Expert" | "Client"
 * @param {string} [params.actorName]
 * @param {string} [params.details]
 * @returns the created audit entry
 */
export function addTaskAuditEntry({ projectId, taskId, miniTaskId, action, actor, actorName, details }) {
  return addAuditEntry({
    projectId,
    taskId,
    miniTaskId: miniTaskId || null,
    action,
    actor,
    actorName: actorName || actor,
    details: details || "",
  });
}

/**
 * Get all audit logs for a specific task, newest first.
 *
 * @param {string} taskId
 * @returns {Array<{id:string, projectId:string, taskId:string, miniTaskId:string|null,
 *           action:string, actor:string, actorName:string, timestamp:string, details:string}>}
 */
export function getTaskAuditLogs(taskId) {
  return getAuditLogs({ taskId });
}

/**
 * Get all audit logs for a project, newest first.
 *
 * @param {string} projectId
 * @returns {Array} audit log entries
 */
export function getProjectAuditLogs(projectId) {
  return getAuditLogs({ projectId });
}

/**
 * Format an audit log action into a human-readable message.
 *
 * @param {object} entry — audit log entry
 * @returns {string} human-readable description
 */
export function formatAuditMessage(entry) {
  const actionMessages = {
    mini_task_created: `Created mini task`,
    mini_task_completed: `Completed mini task`,
    mini_tasks_confirmed: `Confirmed all mini tasks`,
    mini_tasks_unlocked: `Unlocked mini tasks for editing`,
    task_submitted_for_review: `Submitted task for client review`,
    task_approved: `Approved task`,
    task_revision_requested: `Requested revision on task`,
    task_reopened: `Requested reopen on task`,
    mini_task_revision_requested: `Requested revision on mini tasks`,
    urgent_submission_requested: `Requested urgent submission for this task`,
  };
  const base = actionMessages[entry.action] || entry.action;
  if (entry.details) return `${base} — ${entry.details}`;
  return base;
}
