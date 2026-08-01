import api from "../../services/api.js";

// =============================================================================
// Project Timeline Store
// =============================================================================
// This store now strictly wraps API calls to the real backend endpoints.
// Mock DB fallbacks have been entirely removed.
// =============================================================================

// Runtime activity logs (session-only caching) - keeping this just for instant UI feedback before reload
const _runtimeActivityLogs = new Map();

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

  return entry;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getProjectTimeline(projectId) {
  try {
    const project = await api.projects.getById(projectId);
    const tasks = await api.projects.getTasks(projectId);
    // Let the project object hold the real tasks (backend provides extension data inside the project obj)
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
  return await api.tasks.addLog(taskId, log);
}

export async function addFeedback(taskId, feedback) {
  return await api.tasks.addFeedback(taskId, feedback);
}

// Removed localStorage extension merger because BE handles it.

export async function requestExtension(projectId, data) {
  try {
    await api.extensions.request(projectId, data);
    return await getProjectTimeline(projectId);
  } catch (err) {
    console.error("Failed to request extension:", err);
    throw err;
  }
}

export async function resolveExtension(projectId, extensionId, data) {
  try {
    await api.extensions.resolve(projectId, extensionId, data);
    return await getProjectTimeline(projectId);
  } catch (err) {
    console.error("Failed to resolve extension:", err);
    throw err;
  }
}

/**
 * Get the effective project deadline considering extensions.
 * Returns a Date object or null.
 */
export function getEffectiveDeadlineDate(project) {
  if (!project) return null;
  const projectId = project.id || project.Id;
  if (!projectId) return null;

  // 2. Use extendedDeadline or projectDeadlineDate from backend
  if (project.projectDeadlineDate) {
    const d = new Date(project.projectDeadlineDate);
    if (!Number.isNaN(d.getTime())) return d;
  }

  // 3. Fall back to endDate
  if (project.endDate) {
    const d = new Date(project.endDate);
    if (!Number.isNaN(d.getTime())) return d;
  }

  // 4. Fall back to deadline number + start date
  const deadlineVal = project.deadline || project.Deadline;
  if (deadlineVal) {
    const num = Number(deadlineVal);
    if (!Number.isNaN(num) && num < 1000) {
      const startDate = new Date(project.startDate || project.StartDate || project.createdAt || project.CreatedAt || Date.now());
      if (!Number.isNaN(startDate.getTime())) {
        return new Date(startDate.getTime() + num * 24 * 60 * 60 * 1000);
      }
    } else {
      const d = new Date(deadlineVal);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }

  return null;
}

export function resetProjectTimeline(projectId) {
  // No longer needed, handled by BE
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
    "open": "bg-warning-light text-warning border-warning/25 font-semibold",
    "in_progress": "bg-brand-primary-light text-brand-primary border-brand-primary/25 font-semibold",
    "completed": "bg-success-light text-success border-success/25 font-semibold",
    "cancelled": "bg-destructive-light text-destructive border-destructive/25 font-semibold"
  };
  return map[statusKey] || "bg-secondary/60 text-muted-foreground border-border font-semibold";
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
  const now = new Date();
  const diff = d - now;
  const pad = (n) => String(n).padStart(2, "0");

  if (diff <= 0) {
    const overdueMs = Math.abs(diff);
    const overdueSecs = Math.floor((overdueMs / 1000) % 60);
    const overdueMins = Math.floor((overdueMs / (1000 * 60)) % 60);
    const overdueHrs = Math.floor((overdueMs / (1000 * 60 * 60)) % 24);
    const overdueDays = Math.floor(overdueMs / (1000 * 60 * 60 * 24));

    const text = overdueDays > 0
      ? `Overdue: ${overdueDays}d ${pad(overdueHrs)}:${pad(overdueMins)}:${pad(overdueSecs)}`
      : `Overdue: ${pad(overdueHrs)}:${pad(overdueMins)}:${pad(overdueSecs)}`;

    return { isOverdue: true, daysRemaining: -overdueDays, text };
  }

  const totalSecs = Math.floor(diff / 1000);
  const secs = totalSecs % 60;
  const mins = Math.floor(totalSecs / 60) % 60;
  const hrs = Math.floor(totalSecs / 3600) % 24;
  const days = Math.floor(totalSecs / 86400);

  const text = days > 0
    ? `${days}d ${pad(hrs)}:${pad(mins)}:${pad(secs)}`
    : `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;

  return { isOverdue: false, daysRemaining: days, text };
}
