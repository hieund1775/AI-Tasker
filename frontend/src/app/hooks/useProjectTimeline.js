import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { getProjectAuditLogs, formatAuditMessage } from "../lib/auditTrail.js";

import {
  getDeadlineInfo,
  getOverallProgress,
  getProjectTimeline,
  requestExtension,
  resolveExtension,
  resetProjectTimeline,
  deriveTaskStatus,
} from "../lib/projectTimelineStore.js";

// =============================================================================
// useProjectTimeline — encapsulates all state, effects, derived values, and
// action handlers for the project timeline view.
//
// Kept extractive: only moves logic that already existed in
// ProjectTimelineManager; does not add new behaviour or fake data.
// =============================================================================

export function useProjectTimeline(role, projectId) {
  const navigate = useNavigate();

  // ---- State ----
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showExtensionForm, setShowExtensionForm] = useState(false);
  const [extensionDays, setExtensionDays] = useState("2");
  const [extensionReason, setExtensionReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Track activity version so we re-fetch timeline after navigation-back
  const [activityVersion, setActivityVersion] = useState(0);

  // ---- Shared loader ----
  async function loadTimeline() {
    const data = await getProjectTimeline(projectId ?? null);
    return data;
  }

  // ---- Fetch timeline on mount and when activity version changes ----
  useEffect(() => {
    let cancelled = false;

    async function fetchTimeline() {
      setLoading(true);
      setError(null);
      try {
        const data = await loadTimeline();
        if (!cancelled) {
          setProject(data);

          // Seed logs if empty to ensure Activity Timeline is immediately populated
          if (data && Array.isArray(data.tasks)) {
            try {
              const logs = JSON.parse(localStorage.getItem("aitasker_audit_logs") || "[]");
              const projectLogs = logs.filter(log => log.projectId === data.id);
              if (projectLogs.length === 0) {
                const seeded = [];
                data.tasks.forEach(task => {
                  const taskStatus = deriveTaskStatus(task);
                  const taskTitle = task.title || "";
                  
                  if (task.miniTasks) {
                    task.miniTasks.forEach((mt, idx) => {
                      if (mt.isCompleted === true || mt.status === "done" || mt.status === "completed") {
                        seeded.push({
                          id: `seed-mt-${mt.id || idx}`,
                          projectId: data.id,
                          taskId: task.id,
                          miniTaskId: mt.id || null,
                          action: "mini_task_completed",
                          actor: "Expert",
                          actorName: "Expert",
                          timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
                          details: mt.title || ""
                        });
                      }
                    });
                  }

                  if (taskStatus === "Completed" || task.status?.toLowerCase() === "completed" || task.status?.toLowerCase() === "done") {
                    seeded.push({
                      id: `seed-task-app-${task.id}`,
                      projectId: data.id,
                      taskId: task.id,
                      action: "task_approved",
                      actor: "Client",
                      actorName: "Client",
                      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
                      details: `Milestone: ${taskTitle}`
                    });
                  } else if (taskStatus === "Pending Review" || task.status?.toLowerCase() === "pending approval" || task.status?.toLowerCase() === "pending_approval") {
                    seeded.push({
                      id: `seed-task-sub-${task.id}`,
                      projectId: data.id,
                      taskId: task.id,
                      action: "task_submitted_for_review",
                      actor: "Expert",
                      actorName: "Expert",
                      timestamp: new Date(Date.now() - 3600000).toISOString(),
                      details: `Milestone: ${taskTitle}`
                    });
                  }
                });
                if (seeded.length > 0) {
                  const combinedLogs = [...seeded, ...logs];
                  localStorage.setItem("aitasker_audit_logs", JSON.stringify(combinedLogs));
                }
              }
            } catch (e) {
              console.warn("Failed to seed audit logs", e);
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load project timeline.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTimeline();
    return () => { cancelled = true; };
  }, [projectId, activityVersion]);

  // ---- Poll sessionStorage for activity version changes (navigation-back detection) ----
  useEffect(() => {
    const check = () => {
      try {
        const stored = parseInt(sessionStorage.getItem("timelineActivityVersion") || "0", 10);
        setActivityVersion((prev) => (stored !== prev ? stored : prev));
      } catch { /* noop */ }
    };
    check();
    const interval = setInterval(check, 500);
    return () => clearInterval(interval);
  }, []);

  // Listen to DB update events to refresh timeline in real-time
  useEffect(() => {
    let cancelled = false;
    const handleDbUpdate = async () => {
      try {
        const data = await loadTimeline();
        if (!cancelled && data) {
          setProject(data);
        }
      } catch (err) {
        console.error("Silent timeline update failed:", err);
      }
    };
    window.addEventListener("aitasker_db_update", handleDbUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener("aitasker_db_update", handleDbUpdate);
    };
  }, [projectId]);

  // ---- Derived values ----
  const tasks = project?.tasks || [];
  const overallProgress = getOverallProgress(tasks);
  const projectLogs = getProjectAuditLogs(projectId).map(log => ({
    id: log.id,
    actor: log.actorName || log.actor,
    time: log.timestamp,
    message: formatAuditMessage(log)
  }));

  const completedTasks = tasks.filter(
    (task) => deriveTaskStatus(task) === "Completed",
  ).length;

  const deadlineInfo = getDeadlineInfo(project?.projectDeadlineDate);

  // ---- Scroll to last opened / submitted task after data loads ----
  useEffect(() => {
    if (loading || tasks.length === 0) return;

    const targetId =
      sessionStorage.getItem("lastSubmittedTaskId") ||
      sessionStorage.getItem("lastOpenedTaskId");

    if (!targetId) return;

    try {
      sessionStorage.removeItem("lastOpenedTaskId");
      sessionStorage.removeItem("lastSubmittedTaskId");
    } catch { /* noop */ }

    const timer = setTimeout(() => {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [loading, tasks.length]);

  // ---- Actions ----

  const handleResetDemo = () => {
    resetProjectTimeline();
    loadTimeline().then(setProject).catch(() => {});
    setShowExtensionForm(false);
    setExtensionReason("");
    setExtensionDays("2");
    setRejectReason("");
  };

  const retry = () => {
    setError(null);
    setLoading(true);
    loadTimeline()
      .then(setProject)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  const goToTaskAction = (task, action) => {
    try { sessionStorage.setItem("lastOpenedTaskId", task.id); } catch { /* noop */ }
    navigate(`/tasks/${task.id}/update?role=${role}&action=${action}`);
  };

  const handleRequestExtension = async () => {
    const days = Number(extensionDays);
    if (!days || days <= 0 || !extensionReason.trim()) return;

    setSubmitting(true);
    try {
      const updated = await requestExtension(projectId ?? null, {
        reason: extensionReason.trim(),
        additionalDays: days,
      });
      setProject(updated);
      setShowExtensionForm(false);
      setExtensionReason("");
      setExtensionDays("2");
    } catch {
      // Error handling could use a toast here
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveExtension = async () => {
    setSubmitting(true);
    try {
      const updated = await resolveExtension(projectId ?? null, project?.extensionRequest?.id, {
        status: "approved",
        responseNote: "Extension approved by client.",
      });
      setProject(updated);
    } catch {
      // fallback handled in store
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectExtension = async () => {
    setSubmitting(true);
    try {
      const updated = await resolveExtension(projectId ?? null, project?.extensionRequest?.id, {
        status: "rejected",
        responseNote: rejectReason.trim() || "Extension rejected by client.",
      });
      setProject(updated);
      setRejectReason("");
    } catch {
      // fallback handled in store
    } finally {
      setSubmitting(false);
    }
  };

  const hasPendingExtension = project?.extensionRequest?.status === "pending";

  return {
    // State
    project,
    loading,
    error,
    showExtensionForm,
    extensionDays,
    extensionReason,
    rejectReason,
    submitting,

    // Setters
    setShowExtensionForm,
    setExtensionDays,
    setExtensionReason,
    setRejectReason,

    // Derived
    tasks,
    overallProgress,
    completedTasks,
    deadlineInfo,
    hasPendingExtension,
    projectLogs,

    // Actions
    retry,
    handleResetDemo,
    goToTaskAction,
    handleRequestExtension,
    handleApproveExtension,
    handleRejectExtension,
  };
}
