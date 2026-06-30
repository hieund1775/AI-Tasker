import { useState, useCallback, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router";
import { Clock, CheckCircle2, MessageSquare, User, ArrowLeft, Check, Loader2 } from "lucide-react";

import {
  deriveTaskStatus,
  deriveTaskProgress,
  getTaskStatusClass,
} from "../../lib/projectTimelineStore.js";
import { safeArray, safeDateFormat } from "../../lib/safety.js";

// Import real mock DB functions for data persistence
import {
  getTaskById,
  toggleMiniTaskCompletion,
  updateMiniTaskInTask,
  submitTaskForReview,
  approveTaskSubmission,
  requestTaskRevision,
  listProjects,
  listUsers,
  updateTask,
} from "../../../data/mockDatabase.js";

/**
 * Find a task by ID and enrich with project and assigned user data.
 * Returns { task, project, assignedUser } or null.
 */
function findTaskById(taskId) {
  const task = getTaskById(taskId);
  if (!task) return null;

  const project = task.projectId
    ? listProjects().find((p) => p.id === task.projectId) || null
    : null;

  const assignedUser = task.assignedTo
    ? listUsers().find((u) => u.id === task.assignedTo) || null
    : null;

  return { task, project, assignedUser };
}

/**
 * Toggle a mini task's completion state. Persists to mock DB immediately.
 */
function toggleMockMiniTask(taskId, miniTaskId, actorName) {
  return toggleMiniTaskCompletion(taskId, miniTaskId, actorName);
}

/**
 * Update a mini task's note. Persists to mock DB immediately.
 */
function updateMockMiniTaskNote(taskId, miniTaskId, value) {
  return updateMiniTaskInTask(taskId, miniTaskId, { note: value });
}

/**
 * Mark a task as submitted for client review. Persists to mock DB.
 */
function markTaskSubmitted(taskId, actorName) {
  return submitTaskForReview(taskId, actorName);
}

/**
 * Client approves a task submission. Persists to mock DB.
 */
function approveTaskInMockDb(taskId, actorName) {
  return approveTaskSubmission(taskId, actorName);
}

/**
 * Client requests revision on a task. Persists to mock DB.
 */
function requestTaskRevisionInMockDb(taskId, feedback, actorName) {
  return requestTaskRevision(taskId, actorName, feedback);
}

export function TaskUpdatePage() {
  const { taskId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const role = searchParams.get("role") || "expert";
  const action = searchParams.get("action") || "view";

  const result = findTaskById(taskId);
  const task = result?.task ?? null;
  const project = result?.project ?? null;
  const assignedUser = result?.assignedUser ?? null;
  const actorName = assignedUser?.fullName || task?.assignedTo || role;

  // ---- Derived values (recomputed on every render from mock DB) ----
  const { completed: completedMiniTasks, total: totalMiniTasks, percent: progress } =
    deriveTaskProgress(task);
  const derivedStatus = deriveTaskStatus(task);
  const allMiniTasksDone = totalMiniTasks > 0 && completedMiniTasks >= totalMiniTasks;

  // ---- Local state ----
  const [feedbackText, setFeedbackText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [productLink, setProductLink] = useState(task?.productLink || "");
  const [productFile, setProductFile] = useState(task?.productFile || "");

  // Controlled title inputs
  const [miniTaskTitles, setMiniTaskTitles] = useState(() => {
    const titles = {};
    task?.miniTasks?.forEach((mt) => {
      titles[mt.id] = mt.title || "";
    });
    return titles;
  });

  // Debounce timers for note auto-save
  const noteTimers = useRef({});

  // ---- Mini task checkbox toggle (immediate auto-save) ----
  const handleToggleMiniTask = useCallback((miniTaskId) => {
    const updated = toggleMockMiniTask(taskId, miniTaskId, actorName);
    if (updated) {
      // Force re-render
      setMiniTaskTitles((prev) => ({ ...prev }));
    }
  }, [taskId, actorName]);

  // ---- Mini task title change (debounced auto-save) ----
  const handleTitleChange = useCallback((miniTaskId, value) => {
    setMiniTaskTitles((prev) => ({ ...prev, [miniTaskId]: value }));

    if (noteTimers.current[`title-${miniTaskId}`]) {
      clearTimeout(noteTimers.current[`title-${miniTaskId}`]);
    }
    noteTimers.current[`title-${miniTaskId}`] = setTimeout(() => {
      updateMiniTaskInTask(taskId, miniTaskId, { title: value });
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    }, 300);
  }, [taskId]);

  // ---- Done button — mark task as submitted ----
  const handleDone = useCallback(() => {
    if (!allMiniTasksDone || submitting) return;
    setSubmitting(true);
    // Persist deliverables first
    updateTask(taskId, {
      productLink: productLink.trim(),
      productFile: productFile.trim(),
    });
    const updated = markTaskSubmitted(taskId, actorName);
    if (updated) {
      setSubmitted(true);
      try { sessionStorage.setItem("lastSubmittedTaskId", taskId); } catch { /* noop */ }
      navigate(-1);
    }
    setSubmitting(false);
  }, [taskId, allMiniTasksDone, submitting, navigate, actorName, productLink, productFile]);

  // ---- Client approve ----
  const handleClientApprove = useCallback(() => {
    setSubmitting(true);
    approveTaskInMockDb(taskId, actorName);
    setSubmitted(true);
    try { sessionStorage.setItem("lastSubmittedTaskId", taskId); } catch { /* noop */ }
    navigate(-1);
    setSubmitting(false);
  }, [taskId, navigate, actorName]);

  // ---- Client request changes ----
  const handleClientRequestChanges = useCallback(() => {
    if (!feedbackText.trim()) return;
    setSubmitting(true);
    requestTaskRevisionInMockDb(taskId, feedbackText.trim(), actorName);
    setSubmitted(true);
    try { sessionStorage.setItem("lastSubmittedTaskId", taskId); } catch { /* noop */ }
    navigate(-1);
    setSubmitting(false);
  }, [taskId, feedbackText, navigate, actorName]);

  // ---- Back button ----
  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  if (!task) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-card rounded-xl border border-border p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-muted-foreground/30" />
          </div>
          <h3 className="text-lg font-semibold text-foreground/60 mb-2">Task not found</h3>
          <p className="text-sm text-muted-foreground">The task you are looking for may have been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-card rounded-xl border border-border p-8">
        {/* Header */}
        <div className="mb-6">
          {project && (
            <p className="text-sm text-primary font-medium mb-1">{project.title}</p>
          )}
          <h1 className="text-2xl font-bold text-foreground mb-2">{task.title}</h1>
          <p className="text-muted-foreground">{task.description}</p>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTaskStatusClass(derivedStatus)}`}>
            {derivedStatus}
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> Progress: {progress}%
          </span>
          {assignedUser && (
            <span className="flex items-center gap-1">
              <User className="w-4 h-4" /> {assignedUser.fullName}
            </span>
          )}
          {task.dueDate && (
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" /> Due: {safeDateFormat(task.dueDate)}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full bg-secondary rounded-full h-2 mb-6">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Expert notes */}
        {task.expertNotes && (
          <div className="border-t pt-6 mb-6">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Expert Notes
            </h3>
            <p className="text-sm text-muted-foreground bg-muted rounded-lg p-4">{task.expertNotes}</p>
          </div>
        )}

        {/* Client feedback */}
        {task.clientFeedback && (
          <div className="border-t pt-6 mb-6">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Client Feedback
            </h3>
          </div>
        )}
        {/* Task Breakdown: task lớn và các task con */}
        {task.miniTasks?.length > 0 && (
          <div className="border-t pt-6 mb-6">
            <h3 className="font-semibold text-foreground mb-4">
              Task: {task.title} ({completedMiniTasks}/{totalMiniTasks} hoàn thành)
            </h3>
            <div className="space-y-3">
              {safeArray(task.miniTasks).map((mt) => {
                const isDone = mt.status === "done";
                return (
                  <div
                    key={mt.id}
                    className={`border rounded-xl p-4 transition-colors ${
                      isDone
                        ? "bg-success/10 border-success/20"
                        : "bg-card border-border"
                    }`}
                  >
                    {/* Top row: checkbox + title input (expert edits) + status badge */}
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleMiniTask(mt.id)}
                        className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isDone
                            ? "bg-success border-success text-success-foreground"
                            : "border-border hover:border-ring/50 text-transparent"
                        }`}
                        title={isDone ? "Mark as incomplete" : "Mark as done"}
                      >
                        {isDone && <Check className="w-3.5 h-3.5" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {role === "expert" ? (
                            <input
                              type="text"
                              value={miniTaskTitles[mt.id] || ""}
                              onChange={(e) => handleTitleChange(mt.id, e.target.value)}
                              placeholder="Task name"
                              className={`text-sm font-semibold bg-transparent border-b border-transparent hover:border-border/60 focus:border-primary focus:outline-none text-foreground py-0.5 px-1 w-full max-w-md ${
                                isDone ? "line-through text-muted-foreground" : "text-foreground"
                              }`}
                            />
                          ) : (
                            <span
                              className={`text-sm font-semibold ${
                                isDone ? "line-through text-muted-foreground" : "text-foreground"
                              }`}
                            >
                              {mt.title}
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              isDone
                                ? "bg-success/20 text-success"
                                : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {isDone ? "Done" : "Todo"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Deliverables: Link sản phẩm + Tên file đính kèm */}
        {role === "expert" && (
          <div className="border-t pt-6 mb-6">
            <h3 className="font-semibold text-foreground mb-4">Sản phẩm bàn giao</h3>
            <div className="space-y-4 max-w-md bg-muted/40 p-4 border border-border rounded-xl">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Link sản phẩm
                </label>
                <input
                  type="text"
                  value={productLink}
                  onChange={(e) => setProductLink(e.target.value)}
                  placeholder="https://example.com/demo-product"
                  className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:ring-1 focus:ring-brand-primary/50 focus:outline-none bg-card text-foreground"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Tên file đính kèm
                </label>
                <input
                  type="text"
                  value={productFile}
                  onChange={(e) => setProductFile(e.target.value)}
                  placeholder="project_output_v1.zip"
                  className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:ring-1 focus:ring-brand-primary/50 focus:outline-none bg-card text-foreground"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Action buttons: Back + Done ── */}
        {role === "expert" && (derivedStatus === "In Progress" || derivedStatus === "Needs Revision") && (
          <div className="border-t pt-6 mt-6">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="h-11 px-5 border border-border text-foreground rounded-xl hover:bg-secondary text-sm font-semibold inline-flex items-center gap-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <button
                type="button"
                onClick={handleDone}
                disabled={!allMiniTasksDone || submitting}
                className={`h-11 px-5 rounded-xl text-sm font-semibold inline-flex items-center gap-2 transition-colors ${
                  allMiniTasksDone && !submitting
                    ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Done
                  </>
                )}
              </button>
            </div>
            {!allMiniTasksDone && (
              <p className="text-xs text-muted-foreground mt-2">
                Complete all mini tasks ({completedMiniTasks}/{totalMiniTasks}) to enable Done.
              </p>
            )}
          </div>
        )}

        {/* ── Submitted toast ── */}
        {submitted && (
          <div className="fixed bottom-6 right-6 bg-success text-success-foreground px-5 py-3 rounded-xl shadow-sm text-sm font-medium z-50 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 inline mr-2" />
            Task submitted for client review!
          </div>
        )}

        {/* Feedback form (client reviewing) */}
        {role === "client" && action === "review" && derivedStatus === "Pending Review" && (
          <div className="border-t pt-6 mt-6">
            <h3 className="font-semibold text-foreground mb-3">Review Task</h3>
            <textarea
              rows={3}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring bg-input-background"
              placeholder="Add feedback (required for requesting changes)..."
            />
            <div className="flex gap-3 mt-3">
              <button
                onClick={handleClientApprove}
                disabled={submitting}
                className="h-11 px-5 bg-success text-success-foreground rounded-xl hover:bg-success/85 text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {submitting ? "..." : "Approve"}
              </button>
              <button
                onClick={handleClientRequestChanges}
                disabled={!feedbackText.trim() || submitting}
                className="h-11 px-5 bg-warning text-warning-foreground rounded-xl hover:bg-warning/85 text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {submitting ? "..." : "Request Changes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
