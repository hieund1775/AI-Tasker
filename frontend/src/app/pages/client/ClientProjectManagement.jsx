import { useParams, useNavigate } from "react-router";
import { ArrowLeft, MessageSquare, CreditCard } from "lucide-react";
import { useProjectProgress } from "../../hooks/useProjectProgress.js";
import { ProjectHeaderCard } from "../../components/project/ProjectHeaderCard.jsx";
import { ProjectProgressPanel } from "../../components/project/ProjectProgressPanel.jsx";
import { LoadingSkeleton } from "../../components/shared/LoadingSkeleton.jsx";
import { EmptyState } from "../../components/shared/EmptyState.jsx";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

// =============================================================================
// ClientProjectManagement — client-side project progress management page.
// Route: /client/projects/:id
// =============================================================================

export default function ClientProjectDetail() {
  const { projectId, id } = useParams();
  const currentProjectId = projectId || id;
  const navigate = useNavigate();

  const {
    project,
    tasks,
    expert,
    loading,
    error,
    overallProgress,
    handleToggleMiniTask,
    retry,
  } = useProjectProgress(currentProjectId, "client");

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
              className="h-11 px-5 bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover text-base font-semibold"
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
              onClick={() => navigate("/client/my-projects")}
              className="h-11 px-5 bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover text-base font-semibold"
            >
              Go to My Projects
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
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="space-y-6">
        {/* Project header */}
        <ProjectHeaderCard
          project={project}
          expert={expert}
          role="client"
          overallProgress={overallProgress}
          loading={false}
          onMessage={() => navigate("/messenger")}
        >
          {/* Escrow payout button (client only) */}
          {overallProgress === 100 && project.status !== "completed" ? (
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("aitasker_db_update"));
                }
                toast.success("Project marked as complete!");
              }}
              className="h-11 px-5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-[14px] font-semibold text-base inline-flex items-center gap-2 shadow-sm"
            >
              <CreditCard className="w-4 h-4" /> Release Payment
            </button>
          ) : project.status === "completed" ? (
            <button
              disabled
              className="h-11 px-5 bg-gray-100 text-gray-400 border border-gray-200 rounded-[14px] font-semibold text-base cursor-not-allowed"
            >
              Payment Released
            </button>
          ) : null}
        </ProjectHeaderCard>

        {/* Project progress panel */}
        <ProjectProgressPanel
          tasks={tasks}
          overallProgress={overallProgress}
          role="client"
          projectId={currentProjectId}
          onToggleMiniTask={() => {}} // Client cannot toggle
          loading={false}
        />
      </div>
    </div>
  );
}
