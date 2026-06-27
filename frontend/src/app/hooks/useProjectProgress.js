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
  updateTask,
  approveTaskSubmission,
  requestTaskRevision,
  requestTaskReopen,
  requestUrgentSubmission,
  requestMiniTaskRevision,
  submitTaskProduct,
  submitProjectFinalWork,
  acceptProjectFinalDelivery,
  declineProjectFinalDelivery,
  listReports,
  getJobPostById,
} from "../../data/mockDatabase.js";
import { api } from "../../services/api.js";
import {
  getOverallProgress,
  deriveTaskProgress,
  getDeadlineInfo,
  getMergedActivityLogs,
  addProjectActivity,
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

  // 1. Done
  if (
    rawStatus === "completed" ||
    rawStatus === "done" ||
    task.approval === "Approved"
  ) {
    const allDone = miniTasks.every(
      (mt) =>
        mt.isCompleted === true ||
        mt.status === "done" ||
        mt.status === "completed",
    );
    if (allDone) return "Done";
  }

  // 2. Waiting for expert product
  if (rawStatus === "waiting_expert_product") {
    if (task.reworkStatus === "rework") {
      return "Rework";
    }
    return "Waiting for Expert Product";
  }

  // 3. Rework / revision must win even if the checklist remains 100%.
  if (
    rawStatus === "needs_revision" ||
    rawStatus === "needs revision" ||
    rawStatus === "decline" ||
    rawStatus === "declined" ||
    task.reworkStatus === "rework"
  ) {
    return "Rework";
  }

  // 4. Waiting For Approval
  if (rawStatus === "pending_review" || rawStatus === "pending review") {
    return "Waiting For Approval";
  }

  // 4. Checklist Completed (Only when all completed AND evidence is provided!)
  const allCompleted =
    hasMiniTasks &&
    miniTasks.every(
      (mt) =>
        mt.isCompleted === true ||
        mt.status === "done" ||
        mt.status === "completed",
    );
  if (allCompleted) {
    if (task.evidence && task.evidence.trim() !== "") {
      return "Checklist Completed";
    }
  }

  // 5. Not Started
  if (!hasMiniTasks) return "Not Started";

  // 6. In Progress (reopen requested or normal checklist progress)
  if (rawStatus === "reopen_requested" || rawStatus === "reopen requested") {
    return "In Progress";
  }

  const hasAnyProgress = miniTasks.some(
    (mt) =>
      mt.isCompleted === true ||
      mt.status === "done" ||
      mt.status === "completed" ||
      mt.status === "in_progress",
  );
  if (hasAnyProgress) return "In Progress";

  return "Not Started";
}

export function useProjectProgress(projectId, role) {
  const [searchParams] = useSearchParams();

  // ---- State ----
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [expert, setExpert] = useState(null);
  const [client, setClient] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);

  // ---- Data loader ----
  const loadData = useCallback(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      const projectsList = listProjects();
      let foundProject = projectsList.find((p) => p.id === projectId);
      if (!foundProject) {
        foundProject = projectsList.find((p) => p.jobPostId === projectId);
      }

      if (!foundProject) {
        setProject(null);
        setLoading(false);
        return;
      }
      
      let projectUseCases = foundProject.useCases || [];
      if (projectUseCases.length === 0 && foundProject.jobPostId) {
        try {
          const job = getJobPostById(foundProject.jobPostId);
          if (job && job.useCases) {
            projectUseCases = job.useCases;
          }
        } catch (e) {
          console.error("Failed to load fallback useCases:", e);
        }
      }
      foundProject.useCases = projectUseCases;
      setProject(foundProject);

      // Load tasks for this project — first from the global task list,
      // then fall back to embedded project.tasks (from accepted proposals).
      const projectTasks = listTasks((t) => t.projectId === foundProject.id);

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

      const finalTasks = embeddedTasks.length > 0
        ? embeddedTasks.map((et) => {
            const pt = projectTasks.find((t) => t.id === et.id);
            return pt ? pt : et;
          })
        : projectTasks;

      console.log("[useProjectProgress] projectId:", projectId);
      console.log(
        "[useProjectProgress] projectTasks from listTasks:",
        projectTasks.length,
      );
      console.log(
        "[useProjectProgress] embedded project.tasks:",
        embeddedTasks.length,
      );
      console.log("[useProjectProgress] final tasks:", finalTasks.length);
      console.log("[useProjectProgress] final tasks detail:", finalTasks);

      const enrichedFinalTasks = finalTasks.map((task, idx) => {
        const derivedUcIndex = task.useCaseIndex != null ? Number(task.useCaseIndex) : (idx % (foundProject.useCases?.length || 1));
        const derivedUcId = task.useCaseId || (foundProject.useCases && foundProject.useCases[derivedUcIndex]?.id) || "";
        return {
          ...task,
          useCaseIndex: derivedUcIndex,
          useCaseId: derivedUcId,
          useCaseTitle: task.useCaseTitle || (foundProject.useCases && foundProject.useCases[derivedUcIndex]?.title) || "",
        };
      });

      setTasks(enrichedFinalTasks);

      // Load expert user
      if (foundProject.assignedExpertId) {
        const expertUser = listUsers().find(
          (u) => u.id === foundProject.assignedExpertId,
        );
        setExpert(expertUser || null);
      }

      // Load client user
      if (foundProject.clientId) {
        const clientUser = listUsers().find(
          (u) => u.id === foundProject.clientId,
        );
        setClient(clientUser || null);
      }

      // Load active report for the project
      const reports = listReports((r) => r.projectId === projectId);
      const activeReport =
        reports.find(
          (r) => r.status !== "Rejected" && r.status !== "Resolved",
        ) ||
        reports[0] ||
        null;
      setReport(activeReport);

      // Load activity logs
      const logs = getMergedActivityLogs(foundProject.id);
      setActivityLogs(logs);

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
  const completedTasks = tasksWithProgress.filter(
    (t) => t.displayStatus === "Done",
  ).length;

  const useCasesWithProgress = (project?.useCases || []).map((uc, index) => {
    const ucTasks = tasksWithProgress.filter((t) => t.useCaseId ? t.useCaseId === uc.id : Number(t.useCaseIndex) === index);
    let progress = 0;
    if (ucTasks.length > 0) {
      const totalTaskProgress = ucTasks.reduce((sum, t) => sum + (t.progress || 0), 0);
      progress = Math.round(totalTaskProgress / ucTasks.length);
    }
    return {
      ...uc,
      index,
      progress,
    };
  });

  // Check if all mini tasks are completed for a specific task
  const areAllMiniTasksCompleted = useCallback(
    (taskId) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return false;
      const miniTasks = task.miniTasks || [];
      if (miniTasks.length === 0) {
        const rawStatus = task.status?.toLowerCase();
        return rawStatus === "completed" || rawStatus === "done" || task.approval === "Approved";
      }
      return miniTasks.every(
        (mt) =>
          mt.isCompleted === true ||
          mt.status === "done" ||
          mt.status === "completed",
      );
    },
    [tasks],
  );

  // ---- Mutation handlers ----

  const handleToggleMiniTask = useCallback(
    (taskId, miniTaskId) => {
      if (role !== "expert") return;
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      if (!miniTaskId) {
        // Toggle the task itself
        const isCurrentlyCompleted = task.status === "completed" || task.status === "done" || task.progress === 100;
        const newStatus = isCurrentlyCompleted ? "not_started" : "completed";
        const newProgress = isCurrentlyCompleted ? 0 : 100;

        updateTask(taskId, {
          status: newStatus,
          progress: newProgress,
          approval: newStatus === "completed" ? "Approved" : null
        });

        if (project) {
          addProjectActivity(project.id, {
            actor: "Expert",
            message: isCurrentlyCompleted
              ? `[Expert] đã thay đổi trạng thái nhiệm vụ: hủy hoàn thành "${task.title}"`
              : `[Expert] hoàn thành nhiệm vụ "${task.title}"`
          });
        }
        window.dispatchEvent(new CustomEvent("aitasker_db_update"));
        return;
      }

      const mt = task.miniTasks?.find(m => m.id === miniTaskId);
      const isCompleted = mt ? !(mt.isCompleted === true || mt.status === "done" || mt.status === "completed") : false;

      toggleMiniTaskCompletion(taskId, miniTaskId, expert?.fullName);

      if (task && mt && project) {
        addProjectActivity(project.id, {
          actor: "Expert",
          message: !isCompleted
            ? `[Expert] đã thay đổi milestone: hủy hoàn thành "${mt.title}" của task "${task.title}"`
            : `[Expert] hoàn thành milestone "${mt.title}" của task "${task.title}"`
        });
      }
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    },
    [role, expert, tasks, project]
  );

  const handleAddMiniTask = useCallback(
    (taskId, miniTaskData) => {
      if (role !== "expert") return null;
      return addMiniTaskToTask(taskId, miniTaskData, expert?.fullName);
    },
    [role, expert],
  );

  const handleRemoveMiniTask = useCallback(
    (taskId, miniTaskId) => {
      if (role !== "expert") return null;
      return removeMiniTaskFromTask(taskId, miniTaskId);
    },
    [role],
  );

  const handleReorderMiniTasks = useCallback(
    (taskId, orderedIds) => {
      if (role !== "expert") return null;
      return reorderMiniTasksInTask(taskId, orderedIds);
    },
    [role],
  );

  const handleUpdateMiniTask = useCallback(
    (taskId, miniTaskId, updates) => {
      if (role !== "expert") return null;
      const task = tasks.find((t) => t.id === taskId);
      const oldMt = task?.miniTasks?.find((m) => m.id === miniTaskId);
      const res = updateMiniTaskInTask(taskId, miniTaskId, updates);
      if (task && oldMt && updates.title && oldMt.title !== updates.title && project) {
        addProjectActivity(project.id, {
          actor: "Expert",
          message: `[Expert] đã thay đổi tiêu đề milestone của task "${task.title}" từ "${oldMt.title}" thành "${updates.title}"`
        });
      }
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
      return res;
    },
    [role, tasks, project],
  );

  const handleUpdateTask = useCallback(
    (taskId, updates) => {
      if (role !== "expert") return null;
      const oldTask = tasks.find((t) => t.id === taskId);
      const res = updateTask(taskId, updates);
      if (oldTask && updates.title && oldTask.title !== updates.title && project) {
        addProjectActivity(project.id, {
          actor: "Expert",
          message: `[Expert] đã thay đổi tiêu đề nhiệm vụ từ "${oldTask.title}" thành "${updates.title}"`
        });
      }
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
      return res;
    },
    [role, tasks, project],
  );

  // ---- Review workflow handlers ----

  const handleSubmitForReview = useCallback(
    (taskId) => {
      if (role !== "expert") return null;
      if (!areAllMiniTasksCompleted(taskId)) return null;
      return submitTaskForReview(taskId, expert?.fullName);
    },
    [role, areAllMiniTasksCompleted, expert],
  );

  const handleSubmitProduct = useCallback(
    (taskId, productLink, productFile) => {
      if (role !== "expert") return null;
      return submitTaskProduct(
        taskId,
        expert?.fullName,
        productLink,
        productFile,
      );
    },
    [role, expert],
  );

  const handleApproveTask = useCallback(
    (taskId) => {
      if (role !== "client") return null;
      return approveTaskSubmission(taskId, client?.fullName);
    },
    [role, client],
  );

  const handleRequestRevision = useCallback(
    (taskId, feedback) => {
      if (role !== "client") return null;
      return requestTaskRevision(taskId, client?.fullName, feedback);
    },
    [role, client],
  );

  // Keep old handler for backward compat
  const handleSubmitTaskDone = useCallback(
    (taskId) => {
      if (role !== "expert") return null;
      if (!areAllMiniTasksCompleted(taskId)) return null;
      return submitTaskForReview(taskId, expert?.fullName);
    },
    [role, areAllMiniTasksCompleted, expert],
  );

  const handleRequestReopen = useCallback(
    (taskId) => {
      if (role !== "client") return null;
      return requestTaskReopen(taskId, client?.fullName);
    },
    [role, client],
  );

  const handleRequestUrgentSubmission = useCallback(
    (taskId) => {
      if (role !== "client") return null;
      return requestUrgentSubmission(taskId, client?.fullName, client?.id);
    },
    [role, client],
  );

  const handleRequestMiniTaskRevision = useCallback(
    (taskId, miniTaskIds, feedback) => {
      if (role !== "client") return null;
      if (!miniTaskIds || miniTaskIds.length === 0) return null;
      return requestMiniTaskRevision(
        taskId,
        miniTaskIds,
        client?.fullName,
        feedback,
      );
    },
    [role, client],
  );

  const handleSubmitProjectFinalWork = useCallback(
    (projectLink, projectFile) => {
      const result = submitProjectFinalWork(
        projectId,
        expert?.fullName || "Expert",
        projectLink,
        projectFile,
      );
      addProjectActivity(projectId, {
        actor: "Expert",
        message: `[Expert] đã nộp bàn giao sản phẩm tổng thể.`
      });
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
      return result;
    },
    [projectId, expert],
  );

  const handleAcceptProjectFinalDelivery = useCallback(() => {
    if (role !== "client") return null;
    const result = acceptProjectFinalDelivery(
      projectId,
      client?.fullName || "Client",
    );
    addProjectActivity(projectId, {
      actor: "Client",
      message: `[Client] đã chấp nhận sản phẩm tổng thể. Tiến hành giải ngân và hoàn thành dự án.`
    });
    window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    return result;
  }, [projectId, role, client]);

  const handleDeclineProjectFinalDelivery = useCallback(
    (feedback) => {
      if (role !== "client") return null;
      const result = declineProjectFinalDelivery(
        projectId,
        client?.fullName || "Client",
        feedback,
      );
      addProjectActivity(projectId, {
        actor: "Client",
        message: `[Client] từ chối sản phẩm tổng thể. Lý do: "${feedback}"`
      });
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
      return result;
    },
    [projectId, role, client],
  );

  const handleUseCaseSubmitForReview = useCallback(
    async (useCaseIndex) => {
      if (role !== "expert" || !project) return;
      const updatedUseCases = [...(project.useCases || [])];
      if (!updatedUseCases[useCaseIndex]) return;
      updatedUseCases[useCaseIndex] = {
        ...updatedUseCases[useCaseIndex],
        status: "waiting_client_review"
      };

      addProjectActivity(project.id, {
        actor: "Expert",
        message: `[Expert] yêu cầu duyệt Use Case #${useCaseIndex + 1}: "${updatedUseCases[useCaseIndex].nameAndDeadline || updatedUseCases[useCaseIndex].name}"`
      });

      await api.projects.update(project.id, { useCases: updatedUseCases });
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    },
    [project, role]
  );

  const handleUseCaseApprove = useCallback(
    async (useCaseIndex) => {
      if (role !== "client" || !project) return;
      const updatedUseCases = [...(project.useCases || [])];
      if (!updatedUseCases[useCaseIndex]) return;
      updatedUseCases[useCaseIndex] = {
        ...updatedUseCases[useCaseIndex],
        status: "done",
        progress: 100
      };

      addProjectActivity(project.id, {
        actor: "Client",
        message: `[Client] phê duyệt Use Case #${useCaseIndex + 1}: "${updatedUseCases[useCaseIndex].nameAndDeadline || updatedUseCases[useCaseIndex].name}" (Trạng thái: Hoàn thành)`
      });

      // Mark all tasks belonging to this Use Case as completed
      const ucId = updatedUseCases[useCaseIndex]?.id;
      const ucTasks = tasksWithProgress.filter((t) => t.useCaseId && ucId ? t.useCaseId === ucId : Number(t.useCaseIndex) === useCaseIndex);
      ucTasks.forEach(task => {
        approveTaskSubmission(task.id, client?.fullName || "Client");
      });

      await api.projects.update(project.id, { useCases: updatedUseCases });
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    },
    [project, role, tasksWithProgress, client]
  );

  const handleUseCaseRequestProduct = useCallback(
    async (useCaseIndex) => {
      if (role !== "client" || !project) return;
      const updatedUseCases = [...(project.useCases || [])];
      if (!updatedUseCases[useCaseIndex]) return;
      updatedUseCases[useCaseIndex] = {
        ...updatedUseCases[useCaseIndex],
        status: "submit_product" // Expert will see "submit_product", Client sees "Chờ expert gửi sản phẩm"
      };

      addProjectActivity(project.id, {
        actor: "Client",
        message: `[Client] yêu cầu sản phẩm cho Use Case #${useCaseIndex + 1}: "${updatedUseCases[useCaseIndex].nameAndDeadline || updatedUseCases[useCaseIndex].name}"`
      });

      await api.projects.update(project.id, { useCases: updatedUseCases });
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    },
    [project, role]
  );

  const handleUseCaseSubmitProduct = useCallback(
    async (useCaseIndex, deliverableData) => {
      if (role !== "expert" || !project) return;
      const updatedUseCases = [...(project.useCases || [])];
      if (!updatedUseCases[useCaseIndex]) return;
      updatedUseCases[useCaseIndex] = {
        ...updatedUseCases[useCaseIndex],
        status: "waiting_client_review",
        productLink: deliverableData.productLink || "",
        productFile: deliverableData.productFile || "",
        productImage: deliverableData.productImage || "",
        declineReason: null // Clear decline reason on resubmit
      };

      addProjectActivity(project.id, {
        actor: "Expert",
        message: `[Expert] nộp sản phẩm cho Use Case #${useCaseIndex + 1}. Link: ${deliverableData.productLink || "N/A"}, File: ${deliverableData.productFile || "N/A"}`
      });

      await api.projects.update(project.id, { useCases: updatedUseCases });
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    },
    [project, role]
  );

  const handleUseCaseDeclineProduct = useCallback(
    async (useCaseIndex, reason) => {
      if (role !== "client" || !project) return;
      const updatedUseCases = [...(project.useCases || [])];
      if (!updatedUseCases[useCaseIndex]) return;
      updatedUseCases[useCaseIndex] = {
        ...updatedUseCases[useCaseIndex],
        status: "rework",
        declineReason: reason
      };

      addProjectActivity(project.id, {
        actor: "Client",
        message: `[Client] từ chối sản phẩm Use Case #${useCaseIndex + 1}. Lý do: "${reason}"`
      });

      await api.projects.update(project.id, { useCases: updatedUseCases });
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    },
    [project, role]
  );

  const isDisputed = project?.status?.toLowerCase() === "disputed";
  const isFullFreeze = isDisputed && report?.reporterRole === "client";
  const isSelectiveFreeze = isDisputed && report?.reporterRole === "expert";

  // ---- Focus task handling ----
  const focusTaskId = searchParams.get("focusTaskId");

  return {
    // State
    project,
    tasks: tasksWithProgress,
    useCases: useCasesWithProgress,
    expert,
    client,
    report,
    isFullFreeze,
    isSelectiveFreeze,
    loading,
    error,
    activityLogs,

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
    handleUpdateTask,
    handleSubmitForReview,
    handleSubmitProduct,
    handleApproveTask,
    handleRequestRevision,
    handleSubmitTaskDone,
    handleRequestReopen,
    handleRequestUrgentSubmission,
    handleRequestMiniTaskRevision,
    handleSubmitProjectFinalWork,
    handleAcceptProjectFinalDelivery,
    handleDeclineProjectFinalDelivery,

    // Use Case Mutations
    handleUseCaseSubmitForReview,
    handleUseCaseApprove,
    handleUseCaseRequestProduct,
    handleUseCaseSubmitProduct,
    handleUseCaseDeclineProduct,

    // Reload
    retry: loadData,
  };
}
