// =============================================================================
// Task Deadline Utilities
// Calculates sequential task deadlines from escrow deposit time + completionDays
// Supports extending deadlines via localStorage
// =============================================================================

const STORAGE_PREFIX = "task_deadlines_";
const EXTEND_PREFIX = "task_extend_";
const EXTEND_REQUEST_PREFIX = "extend_request_";
const DEPOSIT_TIME_PREFIX = "deposit_time_";

/**
 * Calculate and store task deadlines after escrow deposit.
 * Tasks are sequential: task N deadline = deposit time + sum(completionDays 1..N)
 */
export function calculateTaskDeadlines(projectId, tasks) {
  if (!projectId || !tasks?.length) return;

  const depositTime = localStorage.getItem(`${DEPOSIT_TIME_PREFIX}${projectId}`);
  const startTime = depositTime ? new Date(depositTime).getTime() : Date.now();

  const deadlines = {};
  let cumulativeDays = 0;

  tasks.forEach((task, idx) => {
    const days = Number(task.completionDays || task.durationDays || 1);
    cumulativeDays += days;
    const deadlineMs = startTime + cumulativeDays * 24 * 60 * 60 * 1000;
    deadlines[task.id || `task_${idx}`] = {
      deadline: new Date(deadlineMs).toISOString(),
      completionDays: days,
      cumulativeDays,
    };
  });

  storeDeadlines(projectId, deadlines);
  return deadlines;
}

/**
 * Extend all deadlines by a given number of days.
 * Used when client approves extension request.
 * Returns the updated deadlines.
 */
export function extendAllDeadlines(projectId, extraDays) {
  const deadlines = getDeadlines(projectId);
  if (!deadlines) return null;

  for (const taskId of Object.keys(deadlines)) {
    const oldDeadline = new Date(deadlines[taskId].deadline).getTime();
    const newDeadline = oldDeadline + extraDays * 24 * 60 * 60 * 1000;
    deadlines[taskId].deadline = new Date(newDeadline).toISOString();
    deadlines[taskId].extraDays = (deadlines[taskId].extraDays || 0) + extraDays;
  }

  storeDeadlines(projectId, deadlines);
  return deadlines;
}

/**
 * Get stored deadlines for a project.
 */
export function getDeadlines(projectId) {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${projectId}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function storeDeadlines(projectId, deadlines) {
  try { localStorage.setItem(`${STORAGE_PREFIX}${projectId}`, JSON.stringify(deadlines)); } catch { /* noop */ }
}

/**
 * Set the escrow deposit time to start deadline calculations.
 */
export function setDepositTime(projectId) {
  try {
    localStorage.setItem(`${DEPOSIT_TIME_PREFIX}${projectId}`, new Date().toISOString());
  } catch { /* noop */ }
}

/**
 * Check if a task is overdue based on its stored deadline.
 */
export function isTaskOverdue(projectId, taskId, taskIndex) {
  const deadlines = getDeadlines(projectId);
  if (!deadlines) return false;

  const key = taskId || `task_${taskIndex}`;
  const entry = deadlines[key];
  if (!entry?.deadline) return false;

  return new Date(entry.deadline).getTime() < Date.now();
}

/**
 * Get deadline info for a specific task.
 */
export function getTaskDeadlineInfo(projectId, taskId, taskIndex) {
  const deadlines = getDeadlines(projectId);
  if (!deadlines) return null;

  const key = taskId || `task_${taskIndex}`;
  return deadlines[key] || null;
}

/**
 * Expert requests extension for a task.
 * Stores request as "waiting" in localStorage.
 */
export function requestExtension(projectId, taskId) {
  try {
    localStorage.setItem(`${EXTEND_REQUEST_PREFIX}${projectId}_${taskId}`, "waiting");
    localStorage.setItem("aitasker_db_update", Date.now().toString());
  } catch { /* noop */ }
}

/**
 * Get extension request status for a task.
 * Returns "waiting" | null
 */
export function getExtensionRequest(projectId, taskId) {
  return localStorage.getItem(`${EXTEND_REQUEST_PREFIX}${projectId}_${taskId}`);
}

/**
 * Cancel/complete extension request.
 */
export function clearExtensionRequest(projectId, taskId) {
  try {
    localStorage.removeItem(`${EXTEND_REQUEST_PREFIX}${projectId}_${taskId}`);
  } catch { /* noop */ }
}

/**
 * Store extension approval data (client approved N days).
 */
export function storeExtensionApproval(projectId, taskId, extraDays) {
  try {
    const key = `${EXTEND_PREFIX}${projectId}_${taskId}`;
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    existing.push({ extraDays, approvedAt: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(existing));
    clearExtensionRequest(projectId, taskId);
  } catch { /* noop */ }
}
