import api from "../../services/api.js";

// =============================================================================
// Project Timeline Store
// =============================================================================
// This store now strictly wraps API calls to the real backend endpoints.
// Mock DB fallbacks have been entirely removed.
// =============================================================================

// Runtime activity logs (session-only caching)
const _runtimeActivityLogs = new Map();

/**
 * Add a runtime activity log (session-only).
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

  try {
    const prev = parseInt(sessionStorage.getItem("timelineActivityVersion") || "0", 10);
    sessionStorage.setItem("timelineActivityVersion", String(prev + 1));
  } catch { /* noop */ }

  return entry;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getProjectTimeline(projectId) {
  try {
    const project = await api.projects.getById(projectId);
    const tasks = await api.projects.getTasks(projectId);
    return { ...project, tasks };
  } catch (err) {
    console.error("Failed to get project timeline", err);
    return null;
  }
}

export async function submitTask(taskId, data) {
  try {
    return await api.projects.submitTask(taskId, data?.notes || "");
  } catch (err) {
    console.error("Failed to submit task", err);
    return null;
  }
}

export async function approveSubmission(submissionId, data) {
  try {
    return await api.projects.reviewTask(submissionId, {
      status: "approved",
      feedback: data?.feedback || "",
    });
  } catch (err) {
    console.error("Failed to approve task", err);
    return null;
  }
}

export async function rejectSubmission(submissionId, data) {
  try {
    return await api.projects.reviewTask(submissionId, {
      status: "rejected",
      feedback: data?.feedback || "",
    });
  } catch (err) {
    console.error("Failed to reject task", err);
    return null;
  }
}

export async function updateTaskStatus(taskId, updates) {
  try {
    return await api.projects.updateTaskStatus(taskId, updates.status || "in_progress");
  } catch (err) {
    console.error("Failed to update task", err);
    return null;
  }
}

export async function updateMiniTask(taskId, miniTaskId, updates) {
  try {
    return await api.projects.updateMiniTask(miniTaskId, updates);
  } catch (err) {
    console.error("Failed to update minitask", err);
    return null;
  }
}

// Stubs for currently unavailable APIs
export async function addLog(taskId, log) {
  return null;
}

export async function addFeedback(taskId, feedback) {
  return null;
}

export async function requestTimelineExtension(projectId, data) {
  return null;
}

export async function resolveTimelineExtension(projectId, extensionId, data) {
  return null;
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

export function getProjectProgress(projectOrTasks) {
  if (!projectOrTasks) return 0;
  if (typeof projectOrTasks === "string") {
    // If passed a projectId string, we cannot synchronously fetch tasks in render.
    // In a real app, this should be fetched upstream and passed down as project.progress
    return 0;
  }
  if (Array.isArray(projectOrTasks)) {
    const tasks = projectOrTasks;
    if (!tasks.length) return 0;
    const completed = tasks.filter(t => t.approvalStatus === "approved" || t.status === "approved" || t.status === "completed").length;
    return Math.round((completed / tasks.length) * 100);
  }
  if (typeof projectOrTasks === "object") {
    return projectOrTasks.progress || 0;
  }
  return 0;
}

export function deriveProjectStatusKey(project) {
  if (!project) return "unknown";
  return project.status ? project.status.toLowerCase() : "unknown";
}

export function getStatusLabel(statusKey) {
  const map = {
    "open": "Open",
    "in_progress": "In Progress",
    "completed": "Completed",
    "cancelled": "Cancelled"
  };
  return map[statusKey] || statusKey;
}

export function getStatusBadgeClass(statusKey) {
  const map = {
    "open": "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    "in_progress": "bg-blue-500/10 text-blue-500 border-blue-500/20",
    "completed": "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    "cancelled": "bg-red-500/10 text-red-500 border-red-500/20"
  };
  return map[statusKey] || "bg-gray-500/10 text-gray-500 border-gray-500/20";
}

export function getClientButtonConfig(statusKey) {
  const map = {
    "open": { label: "View Details", variant: "outline", icon: null },
    "in_progress": { label: "Track Progress", variant: "primary", icon: "activity" },
    "completed": { label: "View Final Results", variant: "outline", icon: "check" },
    "cancelled": { label: "View Details", variant: "outline", icon: null }
  };
  return map[statusKey] || { label: "View", variant: "outline", icon: null };
}

export function getExpertButtonConfig(statusKey) {
  const map = {
    "open": { label: "Submit Work", variant: "primary", icon: "upload" },
    "in_progress": { label: "Update Status", variant: "primary", icon: "activity" },
    "completed": { label: "View Completion", variant: "outline", icon: "check" },
    "cancelled": { label: "View Details", variant: "outline", icon: null }
  };
  return map[statusKey] || { label: "View", variant: "outline", icon: null };
}

export function getOverallProgress(tasks = []) {
  if (!tasks || !tasks.length) return 0;

  let totalMiniTasks = 0;
  let completedMiniTasks = 0;
  let totalTasksPercent = 0;

  for (const task of tasks) {
    const { completed, total, percent } = deriveTaskProgress(task);
    if (total > 0 && ((task.miniTasks && task.miniTasks.length > 0) || (task.MiniTasks && task.MiniTasks.length > 0))) {
      totalMiniTasks += total;
      completedMiniTasks += completed;
    }
    totalTasksPercent += percent;
  }

  if (totalMiniTasks > 0) {
    return Math.round((completedMiniTasks / totalMiniTasks) * 100);
  }

  return Math.round(totalTasksPercent / tasks.length);
}

export function deriveTaskProgress(task) {
  if (!task) return { completed: 0, total: 0, percent: 0 };

  const status = (task.status || task.Status || "").toLowerCase();
  const isDone = status === "completed" || status === "approved" || status === "done" || task.approvalStatus?.toLowerCase() === "approved" || task.approval?.toLowerCase() === "approved" || task.approval?.toLowerCase() === "quick accepted";

  const miniTasks = task.miniTasks || task.MiniTasks || [];
  const total = miniTasks.length;

  if (isDone) {
    return { completed: total > 0 ? total : 1, total: total > 0 ? total : 1, percent: 100 };
  }

  if (total > 0) {
    const completed = miniTasks.filter(
      mt => mt.isCompleted === true || mt.IsCompleted === true || mt.status === "done" || mt.status === "completed" || mt.Status === "done" || mt.Status === "completed"
    ).length;
    const percent = Math.round((completed / total) * 100);
    return { completed, total, percent };
  }

  return {
    completed: 0,
    total: 1,
    percent: 0
  };
}

export function getDeadlineInfo(deadline) {
  if (!deadline) return { isOverdue: false, daysRemaining: 0, text: "No deadline" };
  const d = new Date(deadline);
  const diff = d - new Date();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return { isOverdue: true, daysRemaining: days, text: `Overdue by ${Math.abs(days)} days` };
  if (days === 0) return { isOverdue: false, daysRemaining: days, text: "Due today" };
  return { isOverdue: false, daysRemaining: days, text: `${days} days remaining` };
}
