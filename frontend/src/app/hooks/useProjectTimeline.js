import { useState, useEffect } from "react";
import { useNavigate } from "react-router";

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
        if (!cancelled) setProject(data);
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

    // Actions
    retry,
    handleResetDemo,
    goToTaskAction,
    handleRequestExtension,
    handleApproveExtension,
    handleRejectExtension,
  };
}
