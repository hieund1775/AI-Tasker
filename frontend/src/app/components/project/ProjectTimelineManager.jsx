import { Link } from "react-router";
import { Bot, MessageSquare } from "lucide-react";

import {
  deriveTaskProgress,
  deriveTaskStatus,
  getTaskStatusClass,
  getTaskStatusLabel,
} from "../../lib/projectTimelineStore.js";

import { useProjectTimeline } from "../../hooks/useProjectTimeline.js";

import { Button } from "../ui/button.jsx";

import { ExtensionRequestPanel } from "./timeline/ExtensionRequestPanel.jsx";
import { ActivityLogPanel } from "./timeline/ActivityLogPanel.jsx";
import { TaskCard } from "./timeline/TaskCard.jsx";

// =============================================================================
// ProjectTimelineManager — main container for project timeline view.
//
// State, effects, derived values, and action handlers live in the
// useProjectTimeline hook.  Rendering delegates to extracted sub-components:
//   - ExtensionRequestPanel  (extension form + status banner)
//   - TaskCard               (individual task card with progress)
//   - ActivityLogPanel       (activity log feed)
// =============================================================================

export function ProjectTimelineManager({ role, projectId }) {
  const {
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
  } = useProjectTimeline(role, projectId);

  // ---- Compute chat link for messaging the project client ----
  // TODO: Replace with API call to get project client info and conversation
  const chatUrl = "/messenger";

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 shadow-sm text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
          <div className="h-3 bg-gray-200 rounded w-full max-w-md mx-auto" />
        </div>
      </div>
    );
  }

  // ---- Error state ----
  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-red-200 p-12 shadow-sm text-center">
        <Bot className="w-12 h-12 text-red-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-600 mb-2">
          Failed to load timeline
        </h3>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <Button variant="default" size="sm" onClick={retry}>
          Retry
        </Button>
      </div>
    );
  }

  // ---- Empty state ----
  if (!project || tasks.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 shadow-sm text-center">
        <Bot className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-500 mb-2">
          No project timeline available
        </h3>
        <p className="text-sm text-gray-400">
          Project timeline data has not been loaded yet.
        </p>
      </div>
    );
  }

  // ---- Main render ----
  return (
    <div className="space-y-6">
      {/* Project header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6 mb-8">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-primary-light text-brand-primary rounded-full text-[13px] font-medium mb-4">
              <Bot className="w-4 h-4" />
              AI Project Timeline Manager
            </div>

            <h1 className="text-3xl font-bold text-gray-900">
              {project.projectTitle || "Project"}
            </h1>

            <p className="text-gray-600 mt-3 max-w-3xl leading-relaxed">
              AI divides the project into main tasks and mini tasks. Overall
              progress is calculated from average mini task completion.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap gap-4 mt-6">
              {deadlineInfo && (
                <>
                  <div className="bg-gray-100 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-500 mb-1">Project Deadline</p>
                    <p className="font-semibold text-gray-900">
                      {deadlineInfo.formattedDate || "N/A"}
                    </p>
                  </div>

                  <div
                    className={`rounded-xl px-4 py-3 ${
                      deadlineInfo.isOverdue ? "bg-red-50" : "bg-brand-primary-light"
                    }`}
                  >
                    <p
                      className={`text-xs mb-1 ${
                        deadlineInfo.isOverdue ? "text-red-500" : "text-brand-primary"
                      }`}
                    >
                      Countdown
                    </p>
                    <p
                      className={`font-semibold ${
                        deadlineInfo.isOverdue ? "text-red-700" : "text-brand-primary"
                      }`}
                    >
                      {deadlineInfo.remainingText || "N/A"}
                    </p>
                  </div>
                </>
              )}

              <div className="bg-brand-green/10 rounded-xl px-4 py-3">
                <p className="text-xs text-brand-green mb-1">Completed Tasks</p>
                <p className="font-semibold text-brand-green">
                  {completedTasks}/{tasks.length}
                </p>
              </div>
            </div>
          </div>

          {/* Expert action buttons — right side */}
          {role === "expert" && (
            <div className="flex flex-row xl:flex-col gap-3 xl:flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                fullWidth
                disabled={hasPendingExtension || submitting}
                onClick={() => setShowExtensionForm((current) => !current)}
              >
                {hasPendingExtension
                  ? "Extension Request Pending"
                  : "Request Project Extension"}
              </Button>

              <Button asChild variant="default" fullWidth>
                <Link to={chatUrl}>
                  <MessageSquare className="w-4 h-4" />
                  Message Client
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* Extension request panel — extracted component */}
        <ExtensionRequestPanel
          role={role}
          extensionRequest={project?.extensionRequest}
          showExtensionForm={showExtensionForm}
          extensionDays={extensionDays}
          extensionReason={extensionReason}
          rejectReason={rejectReason}
          submitting={submitting}
          hasPendingExtension={hasPendingExtension}
          onToggleForm={() => setShowExtensionForm(false)}
          onExtensionDaysChange={setExtensionDays}
          onExtensionReasonChange={setExtensionReason}
          onRejectReasonChange={setRejectReason}
          onSubmitRequest={handleRequestExtension}
          onApproveExtension={handleApproveExtension}
          onRejectExtension={handleRejectExtension}
        />

        {/* Overall progress bar */}
        <div>
          <div className="flex justify-between mb-3">
            <span className="text-[15px] font-medium text-gray-700">Overall Progress</span>
            <span className="font-semibold text-gray-900">
              {overallProgress}%
            </span>
          </div>
          <div className="w-full max-w-[1280px] bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-brand-primary h-3 rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-3">
            Overall progress = average mini task completion.
          </p>
        </div>
      </div>

      {/* Task list — uses extracted TaskCard component */}
      <div className="space-y-4">
        {tasks.map((task) => {
          const taskProgress = deriveTaskProgress(task);
          const derivedStatus = deriveTaskStatus(task);
          const latestLog = project.taskLogs?.[task.id]?.[0];

          const canOpenSubmit =
            role === "expert" &&
            derivedStatus !== "Pending Review" &&
            derivedStatus !== "Completed";

          const isSubmitDisabled = !canOpenSubmit;

          const submitButtonLabel =
            derivedStatus === "Pending Review"
              ? "Waiting"
              : derivedStatus === "Completed"
                ? "Done"
                : "Submit Task";

          return (
            <TaskCard
              key={task.id}
              task={task}
              derivedStatus={derivedStatus}
              role={role}
              completedMiniTasks={taskProgress.completed}
              totalMiniTasks={taskProgress.total}
              progress={taskProgress.percent}
              latestLog={latestLog}
              canOpenSubmit={canOpenSubmit}
              isSubmitDisabled={isSubmitDisabled}
              submitButtonLabel={submitButtonLabel}
              goToTaskAction={goToTaskAction}
              getTaskStatusClass={getTaskStatusClass}
              getTaskStatusLabel={getTaskStatusLabel}
            />
          );
        })}
      </div>

      {/* Activity log — extracted component */}
      <ActivityLogPanel projectLogs={project?.projectLogs} />
    </div>
  );
}
