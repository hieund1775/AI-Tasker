import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";
import {
  listProjects,
  listTasks,
  listUsers,
  addMiniTaskToTask,
  removeMiniTaskFromTask,
  reorderMiniTasksInTask,
  updateMiniTaskInTask,
  toggleMiniTaskCompletion,
  submitTaskForReview,
  approveTaskSubmission,
  requestTaskRevision,
  requestTaskReopen,
  requestUrgentSubmission,
  requestMiniTaskRevision,
} from "../../data/mockDatabase.js";
import {
  getOverallProgress,
  deriveTaskProgress,
  getDeadlineInfo,
} from "../lib/projectTimelineStore.js";

// =============================================================================
// useProjectProgress — shared data/state hook for project progress management.
//
// Used by both ClientProjectManagement and ExpertProjectManagement pages,
// as well as TaskDetailPage.
//
// @param {string} projectId
// @param {"client"|"expert"} role
// =============================================================================

/**
 * Derive the display status for a task based on mini-task state.
 * Mini tasks come from accepted proposals — no confirmation needed.
 *
 * Returns one of: "Not Started", "In Progress", "Waiting For Approval",
 * "Done", "Needs Revision", "Reopen Requested"
 */
export function deriveTaskDisplayStatus(task) {
  if (!task) return "Not Started";

  const rawStatus = task.status?.toLowerCase();
  const miniTasks = task.miniTasks || [];
  const hasMiniTasks = miniTasks.length > 0;

  // Reopen requested
  if (rawStatus === "reopen_requested" || rawStatus === "reopen requested") {
    return "Reopen Requested";
  }

  // Needs revision
  if (rawStatus === "needs_revision" || rawStatus === "needs revision") {
    return "Needs Revision";
  }

  // No mini tasks at all — task hasn't started
  if (!hasMiniTasks) return "Not Started";

  // Completed / Done — task is approved or completed
  if (rawStatus === "completed" || rawStatus === "done" || task.approval === "Approved") {
    const allDone = miniTasks.every(
      (mt) => mt.isCompleted === true || mt.status === "done" || mt.status === "completed"
    );
    if (allDone) return "Done";
  }

  // Pending review — expert submitted, waiting for client approval
  if (rawStatus === "pending_review" || rawStatus === "pending review") {
    return "Waiting For Approval";
  }

  // In Progress — at least one mini task has work started
  const hasAnyProgress = miniTasks.some(
    (mt) =>
      mt.isCompleted === true ||
      mt.status === "done" ||
      mt.status === "completed" ||
      mt.status === "in_progress"
  );
  if (hasAnyProgress) return "In Progress";

  // Has mini tasks but none started yet
  return "Not Started";
}

export function useProjectProgress(projectId, role) {
  const [searchParams] = useSearchParams();

  // ---- State ----
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [expert, setExpert] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ---- Data loader ----
  const loadData = useCallback(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      const projectsList = listProjects();
      const foundProject = projectsList.find((p) => p.id === projectId);
      if (!foundProject) {
        setError("Project not found");
        setLoading(false);
        return;
      }
      setProject(foundProject);

      // Load tasks for this project — first from the global task list,
      // then fall back to embedded project.tasks (from accepted proposals).
      const projectTasks = listTasks((t) => t.projectId === projectId);

      const embeddedTasks = Array.isArray(foundProject.tasks)
        ? foundProject.tasks.map((task) => ({
            ...task,
            projectId: task.projectId || foundProject.id,
            description: task.description || "",
            status: task.status || "not_started",
            progress: task.progress != null ? task.progress : 0,
            assignedTo: task.assignedTo || foundProject.assignedExpertId || "",
            deadline: task.deadline || foundProject.deadline || "",
            miniTasks: Array.isArray(task.miniTasks)
              ? task.miniTasks.map((mt, mtIdx) => ({
                  ...mt,
                  projectId: mt.projectId || foundProject.id,
                  taskId: mt.taskId || task.id,
                  status: mt.status || (mt.isCompleted ? "done" : "pending"),
                  description: mt.description || "",
                  order: mt.order != null ? mt.order : mtIdx,
                }))
              : [],
          }))
        : [];

      const finalTasks =
        projectTasks.length > 0 ? projectTasks : embeddedTasks;

      console.log("[useProjectProgress] projectId:", projectId);
      console.log("[useProjectProgress] projectTasks from listTasks:", projectTasks.length);
      console.log("[useProjectProgress] embedded project.tasks:", embeddedTasks.length);
      console.log("[useProjectProgress] final tasks:", finalTasks.length);
      console.log("[useProjectProgress] final tasks detail:", finalTasks);

      setTasks(finalTasks);

      // Load expert user
      if (foundProject.assignedExpertId) {
        const expertUser = listUsers().find((u) => u.id === foundProject.assignedExpertId);
        setExpert(expertUser || null);
      }

      // Load client user
      if (foundProject.clientId) {
        const clientUser = listUsers().find((u) => u.id === foundProject.clientId);
        setClient(clientUser || null);
      }

      setError(null);
    } catch (err) {
      console.error("Failed to load project progress data:", err);
      setError(err.message || "Failed to load project data");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Fetch on mount and when projectId changes
  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  // Listen for mock DB updates
  useEffect(() => {
    const handleDbUpdate = () => {
      loadData();
    };
    window.addEventListener("aitasker_db_update", handleDbUpdate);
    return () => {
      window.removeEventListener("aitasker_db_update", handleDbUpdate);
    };
  }, [loadData]);

  // ---- Derived values ----
  const tasksWithProgress = tasks.map((task) => {
    const { completed, total, percent } = deriveTaskProgress(task);
    const displayStatus = deriveTaskDisplayStatus(task);
    const deadlineInfo = task.deadline ? getDeadlineInfo(task.deadline) : null;
    return {
      ...task,
      progress: percent,
      completedMiniTasks: completed,
      totalMiniTasks: total,
      displayStatus,
      deadlineInfo,
    };
  });

  const overallProgress = getOverallProgress(tasks);
  const totalTasks = tasks.length;
  const completedTasks = tasksWithProgress.filter((t) => t.displayStatus === "Done").length;

  // Check if all mini tasks are completed for a specific task
  const areAllMiniTasksCompleted = useCallback(
    (taskId) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return false;
      const miniTasks = task.miniTasks || [];
      if (miniTasks.length === 0) return false;
      return miniTasks.every(
        (mt) => mt.isCompleted === true || mt.status === "done" || mt.status === "completed"
      );
    },
    [tasks]
  );

  // ---- Mutation handlers ----

  const handleToggleMiniTask = useCallback(
    (taskId, miniTaskId) => {
      if (role !== "expert") return;
      toggleMiniTaskCompletion(taskId, miniTaskId, expert?.fullName);
    },
    [role, expert]
  );

  const handleAddMiniTask = useCallback(
    (taskId, miniTaskData) => {
      if (role !== "expert") return null;
      return addMiniTaskToTask(taskId, miniTaskData, expert?.fullName);
    },
    [role, expert]
  );

  const handleRemoveMiniTask = useCallback(
    (taskId, miniTaskId) => {
      if (role !== "expert") return null;
      return removeMiniTaskFromTask(taskId, miniTaskId);
    },
    [role]
  );

  const handleReorderMiniTasks = useCallback(
    (taskId, orderedIds) => {
      if (role !== "expert") return null;
      return reorderMiniTasksInTask(taskId, orderedIds);
    },
    [role]
  );

  const handleUpdateMiniTask = useCallback(
    (taskId, miniTaskId, updates) => {
      if (role !== "expert") return null;
      return updateMiniTaskInTask(taskId, miniTaskId, updates);
    },
    [role]
  );

  // ---- Review workflow handlers ----

  const handleSubmitForReview = useCallback(
    (taskId) => {
      if (role !== "expert") return null;
      if (!areAllMiniTasksCompleted(taskId)) return null;
      return submitTaskForReview(taskId, expert?.fullName);
    },
    [role, areAllMiniTasksCompleted, expert]
  );

  const handleApproveTask = useCallback(
    (taskId) => {
      if (role !== "client") return null;
      return approveTaskSubmission(taskId, client?.fullName);
    },
    [role, client]
  );

  const handleRequestRevision = useCallback(
    (taskId, feedback) => {
      if (role !== "client") return null;
      return requestTaskRevision(taskId, client?.fullName, feedback);
    },
    [role, client]
  );

  // Keep old handler for backward compat
  const handleSubmitTaskDone = useCallback(
    (taskId) => {
      if (role !== "expert") return null;
      if (!areAllMiniTasksCompleted(taskId)) return null;
      return submitTaskForReview(taskId, expert?.fullName);
    },
    [role, areAllMiniTasksCompleted, expert]
  );

  const handleRequestReopen = useCallback(
    (taskId) => {
      if (role !== "client") return null;
      return requestTaskReopen(taskId, client?.fullName);
    },
    [role, client]
  );

  const handleRequestUrgentSubmission = useCallback(
    (taskId) => {
      if (role !== "client") return null;
      return requestUrgentSubmission(taskId, client?.fullName, client?.id);
    },
    [role, client]
  );

  const handleRequestMiniTaskRevision = useCallback(
    (taskId, miniTaskIds, feedback) => {
      if (role !== "client") return null;
      if (!miniTaskIds || miniTaskIds.length === 0) return null;
      return requestMiniTaskRevision(taskId, miniTaskIds, client?.fullName, feedback);
    },
    [role, client]
  );

  // ---- Focus task handling ----
  const focusTaskId = searchParams.get("focusTaskId");

  return {
    // State
    project,
    tasks: tasksWithProgress,
    expert,
    client,
    loading,
    error,

    // Derived
    overallProgress,
    totalTasks,
    completedTasks,
    focusTaskId,

    // Task-level helpers
    areAllMiniTasksCompleted,

    // Mutations
    handleToggleMiniTask,
    handleAddMiniTask,
    handleRemoveMiniTask,
    handleReorderMiniTasks,
    handleUpdateMiniTask,
    handleSubmitForReview,
    handleApproveTask,
    handleRequestRevision,
    handleSubmitTaskDone,
    handleRequestReopen,
    handleRequestUrgentSubmission,
    handleRequestMiniTaskRevision,

    // Reload
    retry: loadData,
  };
}
