// =============================================================================
// Audit Trail - centralized audit log management for task and project activity.
//
// All functions now mock or delegate to C# backend
// the runtime overlay (survives soft page refreshes during a session).
// =============================================================================

const getAuditLogs = (filter = {}) => {
  try {
    const logs = JSON.parse(localStorage.getItem("aitasker_audit_logs") || "[]");
    return logs.filter(log => {
      if (filter.taskId && log.taskId !== filter.taskId) return false;
      if (filter.projectId && log.projectId !== filter.projectId) return false;
      return true;
    });
  } catch (e) {
    return [];
  }
};

const addAuditEntry = (entry) => {
  try {
    const logs = JSON.parse(localStorage.getItem("aitasker_audit_logs") || "[]");
    const newEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    logs.unshift(newEntry); // Newest first
    localStorage.setItem("aitasker_audit_logs", JSON.stringify(logs));
    return newEntry;
  } catch (e) {
    console.error("Failed to add audit entry", e);
    return null;
  }
};

/**
 * Add an audit log entry for a task action.
 *
 * @param {object} params
 * @param {string} params.projectId
 * @param {string} params.taskId
 * @param {string} [params.miniTaskId]
 * @param {string} params.action - one of: mini_task_created, mini_task_completed,
 *        mini_tasks_confirmed, mini_tasks_unlocked, task_submitted_for_review,
 *        task_approved, task_revision_requested, task_reopened,
 *        mini_task_revision_requested, urgent_submission_requested
 * @param {string} params.actor - "Expert" | "Client"
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
 * @param {object} entry - audit log entry
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
  if (entry.details) return `${base} - ${entry.details}`;
  return base;
}
