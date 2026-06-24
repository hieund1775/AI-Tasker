import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Send } from "lucide-react";
import { useProjectProgress } from "../../hooks/useProjectProgress.js";
import { ProjectHeaderCard } from "../../components/project/ProjectHeaderCard.jsx";
import { ProjectProgressPanel } from "../../components/project/ProjectProgressPanel.jsx";
import { LoadingSkeleton } from "../../components/shared/LoadingSkeleton.jsx";
import { EmptyState } from "../../components/shared/EmptyState.jsx";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

// =============================================================================
// ExpertProjectManagement — expert-side project progress management page.
// Route: /expert/projects/:id
// =============================================================================

export default function ExpertProjectDetail() {
  const { projectId, id } = useParams();
  const currentProjectId = projectId || id;
  const navigate = useNavigate();

  const {
    project,
    tasks,
    client,
    loading,
    error,
    overallProgress,
    handleToggleMiniTask,
    retry,
  } = useProjectProgress(currentProjectId, "expert");

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LoadingSkeleton variant="dashboard" />
      </div>
    );
  }

  // ---- Error state ----
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EmptyState
          icon={AlertCircle}
          title="Error loading project"
          description={error}
          action={
            <button
              onClick={retry}
              className="h-11 px-5 bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover font-semibold text-base inline-flex items-center gap-2 transition-colors"
            >
              Retry
            </button>
          }
        />
      </div>
    );
  }

  // ---- Project not found ----
  if (!project) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EmptyState
          icon={AlertCircle}
          title="Project not found"
          description="The requested project could not be found."
          action={
            <button
              onClick={() => navigate("/expert/dashboard")}
              className="h-11 px-5 bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover font-semibold text-base inline-flex items-center gap-2 transition-colors"
            >
              Go to Dashboard
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans bg-gray-50 min-h-screen">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="space-y-6">
        {/* Project header */}
        <ProjectHeaderCard
          project={project}
          client={client}
          role="expert"
          overallProgress={overallProgress}
          loading={false}
          onMessage={() => navigate("/messenger")}
        >
          {/* Submit work button (expert only) */}
          {overallProgress === 100 && project.status !== "completed" ? (
            <button
              type="button"
              onClick={() => {
                toast.success("Work submitted for client review!");
              }}
              className="h-11 px-5 bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover font-semibold text-base inline-flex items-center gap-2 transition-colors"
            >
              <Send className="w-4 h-4" /> Submit Work
            </button>
          ) : project.status === "completed" ? (
            <button
              disabled
              className="h-11 px-5 bg-gray-300 text-gray-500 rounded-[14px] font-semibold text-base inline-flex items-center gap-2 cursor-not-allowed"
            >
              Project Complete
            </button>
          ) : null}
        </ProjectHeaderCard>

        {/* Project progress panel — expert can toggle mini tasks */}
        <ProjectProgressPanel
          tasks={tasks}
          overallProgress={overallProgress}
          role="expert"
          projectId={currentProjectId}
          onToggleMiniTask={(taskId, miniTaskId) =>
            handleToggleMiniTask(taskId, miniTaskId)
          }
          loading={false}
        />
      </div>
    </div>
  );
}
