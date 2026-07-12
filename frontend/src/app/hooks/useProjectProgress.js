import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";
import { api } from "../../services/api.js";
import { toast } from "sonner";
import { useAuth } from "./useAuth.js";
import {
  getOverallProgress,
  deriveTaskProgress,
  getDeadlineInfo,
} from "../lib/projectTimelineStore.js";
import { addTaskAuditEntry } from "../lib/auditTrail.js";

export function deriveTaskDisplayStatus(task) {
  if (!task) return "Not Started";
  const rawStatus = task.status?.toLowerCase();
  const miniTasks = task.miniTasks || [];
  const hasMiniTasks = miniTasks.length > 0;
  if (rawStatus === "completed" || rawStatus === "done" || task.approval === "Approved" || task.approval === "Quick Accepted") {
    const allDone = miniTasks.every(mt => mt.isCompleted === true || mt.status === "done" || mt.status === "completed");
    if (allDone || rawStatus === "completed" || rawStatus === "done") return "Done";
  }
  if (rawStatus === "rework" || ((rawStatus === "in progress" || rawStatus === "inprogress") && task.declineReason)) return "Rework";
  if (rawStatus === "waiting_for_approval" || rawStatus === "pending_review" || rawStatus === "pending review" || rawStatus === "pending approval" || rawStatus === "pending_approval") return "Waiting For Approval";
  if (rawStatus === "waiting_expert_product") return "Waiting for Expert Product";
  if (rawStatus === "checklist_completed") return "Checklist Completed";

  const allCompleted = hasMiniTasks && miniTasks.every(mt => mt.isCompleted === true || mt.status === "done" || mt.status === "completed");
  if (allCompleted) {
    if (!task.handoverEvidence) return "In Progress";
    return "Checklist Completed";
  }

  if (rawStatus === "needs_revision" || rawStatus === "needs revision" || rawStatus === "decline" || rawStatus === "declined") return "Decline";
  if (!hasMiniTasks) return "Not Started";
  if (rawStatus === "reopen_requested" || rawStatus === "reopen requested") return "In Progress";

  const hasAnyProgress = miniTasks.some(mt => mt.isCompleted === true || mt.status === "done" || mt.status === "completed" || mt.status === "in_progress");
  if (hasAnyProgress) return "In Progress";
  return "Not Started";
}

export function useProjectProgress(projectId, role) {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [expert, setExpert] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async (isSilent = false) => {
    if (!projectId) {
      if (!isSilent) setLoading(false);
      return;
    }
    try {
      if (!isSilent) setLoading(true);
      const proj = await api.projects.getById(projectId);
      if (!proj) throw new Error("Project not found");

      // Fetch associated JobPost if JobPostId exists to get Category, Specialization, and Required Skills!
      const jId = proj.jobPostId || proj.JobPostId;
      if (jId) {
        try {
          const jp = await api.jobPosts.getById(jId);
          if (jp) {
            proj.category = jp.domain?.name || jp.Domain?.Name || jp.category || "Artificial Intelligence";
            proj.specialization = jp.specialization?.name || jp.Specialization?.Name || jp.specialization || jp.specializationName;
            proj.requiredSkills = jp.requiredSkills || jp.jobPostSkills?.map(s =>
              s.skill?.name || s.skill?.Name ||
              s.Skill?.name || s.Skill?.Name ||
              s.skillName || s.SkillName || ""
            ).filter(Boolean) || [];
          }
        } catch (err) {
          console.warn("Failed to load associated job post:", err);
        }
      }

      // Direct fallbacks if still not resolved
      if (!proj.requiredSkills || proj.requiredSkills.length === 0) {
        const skillsFromProj = proj.projectSkills || proj.ProjectSkills || [];
        proj.requiredSkills = skillsFromProj.map(s =>
          s.skillName || s.SkillName ||
          s.skill?.name || s.skill?.Name ||
          s.Skill?.name || s.Skill?.Name || ""
        ).filter(Boolean);
      }

      // Derive final delivery fields
      let parsedLink = { projectLink: proj.projectLink || proj.ProjectLink || "", projectFile: "", declineReason: "" };
      const rawProjectLink = proj.projectLink || proj.ProjectLink || "";
      if (rawProjectLink && rawProjectLink.trim().startsWith("{")) {
        try {
          parsedLink = JSON.parse(rawProjectLink);
        } catch (e) {
          console.warn("Failed to parse projectLink JSON", e);
        }
      }
      
      proj.finalProjectLink = parsedLink.projectLink || rawProjectLink || "";
      proj.finalProjectFile = parsedLink.projectFile || proj.projectFile || proj.ProjectFile || "";
      proj.finalWorkDeclineReason = parsedLink.declineReason || proj.declineReason || proj.DeclineReason || "";

      // Normalize standard keys to prevent casing mismatch issues
      proj.budget = proj.budget || proj.Budget || proj.EscrowBalance || proj.escrowBalance || proj.escrowAmount || proj.EscrowAmount || 0;
      proj.escrowBalance = proj.escrowBalance || proj.EscrowBalance || proj.budget || 0;
      proj.clientId = proj.clientId ?? proj.ClientId ?? "";
      proj.expertId = proj.expertId ?? proj.ExpertId ?? proj.assignedExpertId ?? proj.AssignedExpertId ?? "";
      proj.status = proj.status || proj.Status || "";

      // Overriding status using localStorage to bypass backend Automatic Completion issue
      const embeddedTasks = proj.tasks || proj.Tasks || [];
      const allTasksApproved = embeddedTasks.length > 0 && embeddedTasks.every(t => {
        const rawStatus = (t.status || t.Status || "").toLowerCase();
        return rawStatus === "completed" || rawStatus === "done";
      });

      // Check localStorage override FIRST — this takes highest priority
      const localStatusRaw = localStorage.getItem(`project_status_${projectId}`);
      const localStatusLower = localStatusRaw ? localStatusRaw.toLowerCase() : null;

      // Terminal cancelled states that should NEVER be overridden by backend "Completed"
      const cancelledTerminals = new Set(["cancelled", "canceled", "cancel_done", "contract_cancelled", "stopped"]);

      // If localStorage says cancelled — trust it unconditionally regardless of backend status
      if (localStatusLower && cancelledTerminals.has(localStatusLower)) {
        proj.status = localStatusLower;
      } else {
        const dbStatusLower = String(proj.Status || proj.status || "").toLowerCase();
        const terminalStatuses = new Set([
          "completed",
          "cancelled",
          "canceled",
          "contract_cancelled",
          "cancel_done",
          "stopped",
          "closed",
          "payment_released"
        ]);
        if (terminalStatuses.has(dbStatusLower)) {
          // Only clear local override if DB status is terminal AND it's NOT a cancellation override
          if (!cancelledTerminals.has(dbStatusLower)) {
            localStorage.removeItem(`project_status_${projectId}`);
          }
          proj.status = dbStatusLower;
        } else {
          if (localStatusRaw) {
            proj.status = localStatusRaw;
          } else if (allTasksApproved) {
            if (proj.finalWorkDeclineReason) {
              proj.status = "inprogress";
              localStorage.setItem(`project_status_${projectId}`, "inprogress");
            } else {
              // Initialize default status when all tasks are approved
              const hasLink = !!(parsedLink.projectLink || proj.projectLink || proj.ProjectLink);
              const defaultStatus = hasLink ? "under_review" : "inprogress";
              localStorage.setItem(`project_status_${projectId}`, defaultStatus);
              proj.status = defaultStatus;
            }
          }
        }
      }
      
      const statusLower = (proj.status || proj.Status || "").toLowerCase();
      if (proj.finalWorkDeclineReason) {
        proj.finalDeliveryStatus = "Declined";
      } else if (statusLower === "under_review" || statusLower === "under review" || statusLower === "pending_review") {
        proj.finalDeliveryStatus = "Final Product Submitted";
        proj.finalWorkSubmittedAt = proj.updatedAt || proj.UpdatedAt || new Date().toISOString();
      } else if (statusLower === "completed" || statusLower === "accepted") {
        proj.finalDeliveryStatus = "Accepted";
      } else {
        proj.finalDeliveryStatus = "";
      }

      setProject(proj);

      let projTasks = [];
      try {
        projTasks = await api.projects.getTasks(projectId);
        // Merge notes from proj.tasks since getTasks returns DTOs without Notes property
        if (proj.tasks && Array.isArray(proj.tasks)) {
          projTasks = projTasks.map(t => {
            const match = proj.tasks.find(pt => (pt.id || pt.Id) === t.id);
            if (match) {
              return {
                ...t,
                notes: match.notes || match.Notes || t.notes || t.Notes || ""
              };
            }
            return t;
          });
        }
      } catch (err) {
        console.warn("Failed to load tasks, using embedded tasks if any", err);
        projTasks = proj.tasks || [];
      }

      const cleanedTasks = (projTasks || []).map(task => {
        const rawNotes = task.notes || task.Notes || "";
        const rawStatus = task.status || task.Status || "";
        const rawFeedback = task.feedbackContent || task.FeedbackContent || "";
        const rawFeedbackSenderId = task.feedbackSenderId || task.FeedbackSenderId || null;
        const rawMiniTasks = task.miniTasks || task.MiniTasks || [];

        let parsedNotes = {};
        if (rawNotes) {
          try {
            parsedNotes = JSON.parse(rawNotes);
          } catch (e) {
            parsedNotes = { notes: rawNotes };
          }
        }
        return {
          ...task,
          status: rawStatus,
          feedbackContent: rawFeedback,
          feedbackSenderId: rawFeedbackSenderId,
          miniTasks: (rawMiniTasks || []).map(mt => ({
            ...mt,
            id: mt.id || mt.Id,
            taskId: mt.taskId || mt.TaskId,
            title: typeof (mt.title || mt.Title) === "string" ? (mt.title || mt.Title).replace(/\[UCID:[^\]]+\]/gi, "").trim() : (mt.title || mt.Title),
            isCompleted: mt.isCompleted !== undefined ? mt.isCompleted : (mt.IsCompleted !== undefined ? mt.IsCompleted : false),
            productLink: mt.productLink || mt.ProductLink || null,
            productFile: mt.productFile || mt.ProductFile || null,
          })),
          notesObject: parsedNotes,
          productLink: parsedNotes.productLink || task.productLink || task.ProductLink || null,
          productFile: parsedNotes.productFile || task.productFile || task.ProductFile || null,
          handoverEvidence: parsedNotes.gitSha || parsedNotes.explanation || task.handoverEvidence || task.HandoverEvidence || null,
          declineReason: rawFeedback || parsedNotes.declineReason || null,
          title: typeof task.title === "string" ? task.title.replace(/\[UCID:[^\]]+\]/gi, "").trim() : task.title,
        };
      });
      setTasks(cleanedTasks);

      if (proj.expertId) {
        try { const exp = await api.users.getById(proj.expertId); setExpert(exp); } catch (e) { }
      }
      if (proj.clientId) {
        try { const cli = await api.users.getById(proj.clientId); setClient(cli); } catch (e) { }
      }
      setError(null);
    } catch (err) {
      console.error(err);
      if (!isSilent) setError("Project not found or API error");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData(false);
    const handleDbUpdate = () => loadData(true);
    window.addEventListener("aitasker_db_update", handleDbUpdate);
    
    // Poll silently every 3 seconds for smooth, non-disruptive synchronization!
    const interval = setInterval(() => {
      loadData(true);
    }, 3000);
    
    return () => {
      window.removeEventListener("aitasker_db_update", handleDbUpdate);
      clearInterval(interval);
    };
  }, [loadData]);

  const tasksWithProgress = tasks.map((task) => {
    const { completed, total, percent } = deriveTaskProgress(task);
    const displayStatus = deriveTaskDisplayStatus(task);
    const deadlineInfo = task.deadline ? getDeadlineInfo(task.deadline) : null;
    return { ...task, progress: percent, completedMiniTasks: completed, totalMiniTasks: total, displayStatus, deadlineInfo };
  });

  const overallProgress = getOverallProgress(tasks);
  const totalTasks = tasks.length;
  const completedTasks = tasksWithProgress.filter((t) => t.displayStatus === "Done").length;

  const areAllMiniTasksCompleted = useCallback((taskId) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return false;
    const miniTasks = task.miniTasks || [];
    if (miniTasks.length === 0) return false;
    return miniTasks.every((mt) => mt.isCompleted === true || mt.status === "done" || mt.status === "completed");
  }, [tasks]);

  const triggerUpdate = () => window.dispatchEvent(new CustomEvent("aitasker_db_update"));

  const handleToggleMiniTask = useCallback(async (taskId, miniTaskId) => {
    if (role !== "expert") return;

    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const task = tasks[taskIndex];
    const miniTaskIndex = (task.miniTasks || []).findIndex(mt => mt.id === miniTaskId);
    if (miniTaskIndex === -1) return;

    const miniTask = task.miniTasks[miniTaskIndex];
    const nextCompleted = !miniTask.isCompleted;

    // 1. Optimistic Update
    const updatedTasks = [...tasks];
    const updatedMiniTasks = [...(task.miniTasks || [])];
    updatedMiniTasks[miniTaskIndex] = {
      ...miniTask,
      isCompleted: nextCompleted
    };
    updatedTasks[taskIndex] = {
      ...task,
      miniTasks: updatedMiniTasks
    };
    setTasks(updatedTasks);

    try {
      // 2. Background API Call
      await api.projects.updateMiniTask(miniTaskId, {
        isCompleted: nextCompleted,
        feedbackSenderId: user?.id || null
      });
      toast.success(nextCompleted ? "Đã đánh dấu hoàn thành" : "Đã hủy đánh dấu hoàn thành");
      triggerUpdate();
    } catch (e) {
      console.error(e);
      toast.error("Lỗi khi cập nhật minitask");

      // Rollback
      const rollbackTasks = [...tasks];
      const rollbackMiniTasks = [...(task.miniTasks || [])];
      rollbackMiniTasks[miniTaskIndex] = {
        ...miniTask,
        isCompleted: !nextCompleted
      };
      rollbackTasks[taskIndex] = {
        ...task,
        miniTasks: rollbackMiniTasks
      };
      setTasks(rollbackTasks);
    }
  }, [role, tasks, user?.id]);

  const handleAddMiniTask = useCallback(async (taskId, miniTaskData) => {
    if (role !== "expert") return null;
    try {
      await api.projects.addMiniTask(taskId, miniTaskData);
      triggerUpdate();
      return true;
    } catch (e) { return false; }
  }, [role]);

  const handleRemoveMiniTask = useCallback(async (taskId, miniTaskId) => { return null; }, []);
  const handleReorderMiniTasks = useCallback(async (taskId, orderedIds) => { return null; }, []);
  const handleUpdateMiniTask = useCallback(async (taskId, miniTaskId, updates) => {
    if (role !== "expert") return null;
    try {
      const task = tasks.find(t => t.id === taskId);
      const miniTask = task?.miniTasks?.find(mt => mt.id === miniTaskId);
      const newCompleted = updates.isCompleted !== undefined ? updates.isCompleted : (miniTask?.isCompleted || false);
      const payload = {
        isCompleted: miniTask ? (miniTask.isCompleted || false) : false,
        ...updates
      };
      await api.projects.updateMiniTask(miniTaskId, payload);
      addTaskAuditEntry({
        projectId,
        taskId,
        miniTaskId,
        action: newCompleted ? "mini_task_completed" : "mini_task_created",
        actor: "Expert",
        actorName: user?.fullName || "Chuyên gia",
        details: miniTask?.title || updates.title || ""
      });
      triggerUpdate();
      return true;
    } catch (e) { return false; }
  }, [role, tasks, projectId, user]);

  const handleSubmitHandoverEvidence = useCallback(async (taskId, evidence) => {
    if (role !== "expert" || !areAllMiniTasksCompleted(taskId)) return null;
    try {
      const notesValue = typeof evidence === "string" ? evidence : JSON.stringify(evidence);
      await api.projects.submitTask(taskId, notesValue);
      addTaskAuditEntry({
        projectId,
        taskId,
        action: "task_submitted_for_review",
        actor: "Expert",
        actorName: user?.fullName || "Chuyên gia",
        details: "Submitted handover evidence."
      });
      triggerUpdate();
      return true;
    } catch (e) { return false; }
  }, [role, areAllMiniTasksCompleted, projectId, user]);

  const handleQuickAccept = useCallback(async (taskId) => {
    if (role !== "client") return null;
    try {
      await api.projects.reviewTask(taskId, {
        approve: true,
        feedbackContent: "Quick Accept",
        feedbackSenderId: user?.id
      });
      addTaskAuditEntry({
        projectId,
        taskId,
        action: "task_approved",
        actor: "Client",
        actorName: user?.fullName || "Khách hàng",
        details: "Quick Accepted task."
      });
      triggerUpdate();
      return true;
    } catch (e) { return false; }
  }, [role, user?.id, projectId, user]);

  const handleRequestProduct = useCallback(async (taskId) => {
    if (role !== "client") return null;
    try {
      await api.projects.updateTaskStatus(taskId, "waiting_expert_product");
      addTaskAuditEntry({
        projectId,
        taskId,
        action: "urgent_submission_requested",
        actor: "Client",
        actorName: user?.fullName || "Khách hàng",
        details: "Requested Expert to submit product."
      });
      triggerUpdate();
      return true;
    } catch (e) { return false; }
  }, [role, projectId, user]);

  const handleExpertSubmitProduct = useCallback(async (taskId, productLink, productFile) => {
    if (role !== "expert") return null;
    try {
      await api.projects.updateTaskStatus(taskId, "Pending Approval");
      triggerUpdate();
      return true;
    } catch (e) { return false; }
  }, [role]);

  const handleClientAcceptProduct = useCallback(async (taskId) => {
    if (role !== "client") return null;
    try {
      await api.projects.reviewTask(taskId, {
        approve: true,
        feedbackContent: "Product Accepted",
        feedbackSenderId: user?.id
      });
      addTaskAuditEntry({
        projectId,
        taskId,
        action: "task_approved",
        actor: "Client",
        actorName: user?.fullName || "Khách hàng",
        details: "Accepted deliverables."
      });
      triggerUpdate();
      return true;
    } catch (e) { return false; }
  }, [role, user?.id, projectId, user]);

  const handleClientDeclineProduct = useCallback(async (taskId, feedback) => {
    if (role !== "client") return null;
    try {
      await api.projects.reviewTask(taskId, {
        approve: false,
        feedbackContent: feedback || "Product Declined",
        feedbackSenderId: user?.id
      });
      addTaskAuditEntry({
        projectId,
        taskId,
        action: "task_revision_requested",
        actor: "Client",
        actorName: user?.fullName || "Khách hàng",
        details: feedback || "Product declined, revision requested."
      });
      triggerUpdate();
      return true;
    } catch (e) { return false; }
  }, [role, user?.id, projectId, user]);

  const handleSubmitForReview = useCallback(async (taskId) => {
    if (role !== "expert" || !areAllMiniTasksCompleted(taskId)) return null;
    try {
      await api.projects.submitTask(taskId, "Submit for review");
      addTaskAuditEntry({
        projectId,
        taskId,
        action: "task_submitted_for_review",
        actor: "Expert",
        actorName: user?.fullName || "Chuyên gia",
        details: "Submitted checklist for review."
      });
      triggerUpdate();
      return true;
    } catch (e) { return false; }
  }, [role, areAllMiniTasksCompleted, projectId, user]);

  const handleSubmitProduct = useCallback(async (taskId, productLink, productFile) => {
    if (role !== "expert") return null;
    try {
      const notesValue = JSON.stringify({
        productLink,
        productFile,
        explanation: "Product submitted by Expert."
      });
      await api.projects.submitTask(taskId, notesValue);
      addTaskAuditEntry({
        projectId,
        taskId,
        action: "task_submitted_for_review",
        actor: "Expert",
        actorName: user?.fullName || "Chuyên gia",
        details: `Submitted product link/file. Link: ${productLink || "N/A"}, File: ${productFile || "N/A"}`
      });
      triggerUpdate();
      return true;
    } catch (e) { return false; }
  }, [role, projectId, user]);
  const handleApproveTask = useCallback(async (taskId) => {
    if (role !== "client") return null;
    try {
      await api.projects.reviewTask(taskId, {
        approve: true,
        feedbackContent: "Approved",
        feedbackSenderId: user?.id
      });
      addTaskAuditEntry({
        projectId,
        taskId,
        action: "task_approved",
        actor: "Client",
        actorName: user?.fullName || "Khách hàng",
        details: "Approved milestone."
      });
      triggerUpdate();
      return true;
    } catch (e) { return false; }
  }, [role, user?.id, projectId, user]);

  const handleRequestRevision = useCallback(async (taskId, feedback) => {
    if (role !== "client") return null;
    try {
      await api.projects.reviewTask(taskId, {
        approve: false,
        feedbackContent: feedback,
        feedbackSenderId: user?.id
      });
      addTaskAuditEntry({
        projectId,
        taskId,
        action: "task_revision_requested",
        actor: "Client",
        actorName: user?.fullName || "Khách hàng",
        details: feedback || "Requested revision."
      });
      triggerUpdate();
      return true;
    } catch (e) { return false; }
  }, [role, user?.id, projectId, user]);

  const handleSubmitTaskDone = handleSubmitForReview;
  const handleRequestReopen = useCallback(async (taskId) => {
    try {
      await api.projects.updateTaskStatus(taskId, "InProgress");
      triggerUpdate();
      return true;
    } catch (e) { return false; }
  }, []);

  const handleRequestUrgentSubmission = useCallback(async (taskId) => {
    if (role !== "client") return null;
    try {
      await api.projects.updateTaskStatus(taskId, "waiting_expert_product");
      triggerUpdate();
      return true;
    } catch (e) { return false; }
  }, [role]);

  const handleRequestMiniTaskRevision = useCallback(async (taskId, miniTaskIds, feedback) => { return null; }, []);

  const handleSubmitProjectFinalWork = useCallback(async (projectLink, projectFile) => {
    try {
      const serialized = JSON.stringify({ projectLink, projectFile, declineReason: "" });
      await api.projects.submitWork(projectId, { projectLink: serialized, projectFile });
      
      // Update override status
      localStorage.setItem(`project_status_${projectId}`, "under_review");

      // Log the audit event
      addTaskAuditEntry({
        projectId,
        action: "task_submitted_for_review",
        actor: "Expert",
        actorName: user?.fullName || "Chuyên gia",
        details: "Submitted project final work for review."
      });

      triggerUpdate();
      return true;
    } catch (e) { return false; }
  }, [projectId, user]);

  const handleAcceptProjectFinalDelivery = useCallback(async () => {
    if (role !== "client") return null;
    try {
      try {
        await api.projects.updateStatus(projectId, "accepted");
      } catch (apiErr) {
        console.warn("Backend updateStatus failed (stub), using frontend override:", apiErr);
      }
      
      // Update override status
      localStorage.setItem(`project_status_${projectId}`, "accepted");

      // Log the audit event
      addTaskAuditEntry({
        projectId,
        action: "task_approved",
        actor: "Client",
        actorName: user?.fullName || "Khách hàng",
        details: "Accepted project final delivery."
      });

      triggerUpdate();
      return true;
    } catch (e) { return false; }
  }, [projectId, role, user]);

  const handleDeclineProjectFinalDelivery = useCallback(async (feedback) => {
    if (role !== "client") return null;
    try {
      const payload = {
        projectLink: JSON.stringify({ projectLink: "", projectFile: "", declineReason: feedback }),
        projectFile: ""
      };
      await api.projects.submitWork(projectId, payload);
      
      try {
        await api.projects.updateStatus(projectId, "inprogress");
      } catch (apiErr) {
        console.warn("Backend updateStatus failed (stub), using frontend override:", apiErr);
      }
      
      // Update override status
      localStorage.setItem(`project_status_${projectId}`, "inprogress");

      // Log the audit event
      addTaskAuditEntry({
        projectId,
        action: "task_revision_requested",
        actor: "Client",
        actorName: user?.fullName || "Khách hàng",
        details: feedback || "Declined project final delivery."
      });

      triggerUpdate();
      return true;
    } catch (e) { return false; }
  }, [projectId, role, user]);

  const focusTaskId = searchParams.get("focusTaskId");

  return {
    project, tasks: tasksWithProgress, expert, client, loading, error, overallProgress, totalTasks, completedTasks, focusTaskId,
    areAllMiniTasksCompleted, handleToggleMiniTask, handleAddMiniTask, handleRemoveMiniTask, handleReorderMiniTasks, handleUpdateMiniTask,
    handleSubmitHandoverEvidence, handleQuickAccept, handleRequestProduct, handleExpertSubmitProduct, handleClientAcceptProduct,
    handleClientDeclineProduct, handleSubmitForReview, handleSubmitProduct, handleApproveTask, handleRequestRevision, handleSubmitTaskDone,
    handleRequestReopen, handleRequestUrgentSubmission, handleRequestMiniTaskRevision, handleSubmitProjectFinalWork,
    handleAcceptProjectFinalDelivery, handleDeclineProjectFinalDelivery, retry: loadData,
  };
}
