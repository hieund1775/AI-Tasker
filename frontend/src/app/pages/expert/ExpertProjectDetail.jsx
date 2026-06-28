// =============================================================================
// ExpertProjectDetail — Project detail page for Expert role.
//
// ⚠️  DEPRECATED — NOT in active routing.
//     routes.jsx imports ExpertProjectDetail from ExpertProjectManagement.jsx,
//     not this file. This file is dead code, kept for reference only.
//     Active page: src/app/pages/expert/ExpertProjectManagement.jsx
//
// Features:
//   - Report button (only visible to assigned Expert, hidden when Disputed)
//   - Dispute banner when project is Disputed
//   - Read-only mode when project is Disputed
//   - Report form in a dialog
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router";
import { Clock, ReceiptText, User, AlertTriangle, MessageSquare } from "lucide-react";
import { ProjectTimelineManager } from "../../components/project/ProjectTimelineManager.jsx";
import { BackButton } from "../../components/shared/BackButton.jsx";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { ReportForm } from "../../components/report/ReportForm.jsx";
import { DisputeBanner } from "../../components/shared/DisputeBanner.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog.jsx";
import { toast } from "sonner";
import { createReport } from "../../../services/reportService.js";
import {
  deriveProjectStatusKey,
  getStatusLabel,
  getStatusBadgeClass,
} from "../../lib/projectTimelineStore.js";
import { api } from "../../../services/api.js";
import { useAuth } from "../../hooks/useAuth.js";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExpertProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  // Project data — loaded from API
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Client info (loaded from project's clientId)
  const [client, setClient] = useState(null);

  // Load project by id
  useEffect(() => {
    if (!user?.id || !id) return;
    let cancelled = false;

    async function loadProject() {
      setLoading(true);
      setError(null);
      try {
        const list = await api.projects.getByExpert(user.id);
        const data = Array.isArray(list) ? list.find((p) => p.id === id) : null;
        if (!cancelled) {
          if (data) {
            setProject(data);

            // Load client info if project has a clientId
            if (data.clientId) {
              try {
                const clientData = await api.users.getById(data.clientId);
                if (!cancelled && clientData) {
                  setClient({
                    id: clientData.id,
                    fullName: clientData.fullName || clientData.name || "Client",
                    email: clientData.email,
                    profile: clientData.profile || {},
                  });
                }
              } catch {
                // Client info unavailable — client stays null
              }
            }
          } else {
            setError("not_found");
          }
        }
      } catch (err) {
        console.error("Failed to load project details for expert:", err);
        if (!cancelled) {
          setError("load_failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProject();
    return () => { cancelled = true; };
  }, [id, user?.id]);

  // ---- Dispute / Report state ----
  const isDisputed = project?.status?.toLowerCase() === "disputed";

  // Derived display status
  const statusKey = project
    ? deriveProjectStatusKey(project, {
        proposalCount: 0,
      })
    : null;
  const displayStatus = statusKey ? getStatusLabel(statusKey) : null;
  const badgeClass = statusKey
    ? getStatusBadgeClass(statusKey)
    : "bg-secondary text-foreground/80";

  const [hasReported, setHasReported] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [report, setReport] = useState(null);

  // Load report for this project to determine reporter/respondent
  useEffect(() => {
    if (!project?.id) return;
    async function loadReport() {
      try {
        const res = await api.get("/reports", { params: { projectId: project.id } });
        const list = res?.data || res || [];
        const activeReport = list.find(r => r.status !== "Rejected" && r.status !== "Resolved");
        const found = activeReport || list[0] || null;
        setReport(found);
        // Determine if current user already submitted a report
        if (found && user?.id) {
          setHasReported(found.reporterId === user.id);
        }
      } catch {
        // Report unavailable — that's fine
      }
    }
    loadReport();

    const handleDbUpdate = () => loadReport();
    window.addEventListener("aitasker_db_update", handleDbUpdate);
    return () => window.removeEventListener("aitasker_db_update", handleDbUpdate);
  }, [project?.id, user?.id]);

  // -----------------------------------------------------------------------
  // Submit report handler
  // -----------------------------------------------------------------------
  const handleSubmitReport = useCallback(
    async (reportData) => {
      setReportSubmitting(true);
      try {
        await createReport(reportData);
        setHasReported(true);
        setShowReportForm(false);
        toast.success("Dispute report has been submitted to Admin.");
      } catch (err) {
        toast.error(err.message || "Error submitting report. Please try again.");
        throw err; // re-throw so ReportForm can reset loading
      } finally {
        setReportSubmitting(false);
      }
    },
    [],
  );

  // -----------------------------------------------------------------------
  // Render: loading
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton fallback="/expert/dashboard" className="mb-6">
          Back
        </BackButton>
        <div className="bg-card rounded-xl border border-border p-12 shadow-sm">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-64" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="flex gap-4">
              <div className="h-6 bg-muted rounded w-32" />
              <div className="h-6 bg-muted rounded w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render: error (load failed)
  // -----------------------------------------------------------------------
  if (error === "load_failed") {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton fallback="/expert/dashboard" className="mb-6">
          Back
        </BackButton>
        <div className="bg-card rounded-xl border border-border p-12 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-muted-foreground">
            Unable to Load Project
          </h3>
          <p className="text-base text-muted-foreground mt-1">
            An error occurred while loading project details. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render: project not found
  // -----------------------------------------------------------------------
  if (error === "not_found" || !project) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton fallback="/expert/dashboard" className="mb-6">
          Back
        </BackButton>
        <div className="bg-card rounded-xl border border-border p-12 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-muted-foreground">
            Project Not Found
          </h3>
          <p className="text-base text-muted-foreground mt-1">
            The project you are looking for may have been removed.
          </p>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BackButton fallback="/expert/dashboard" className="mb-6">
        Back
      </BackButton>

      {/* ---- Dispute banner ---- */}
      {isDisputed && <DisputeBanner className="mb-6" />}

      {/* ---- Project header ---- */}
      <div className="bg-card rounded-xl border border-border p-8 shadow-sm mb-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground mb-4">
              {project.title}
            </h1>
            <p className="text-muted-foreground mb-4">{project.description}</p>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <ReceiptText className="w-4 h-4" />
                Budget: <MoneyDisplay amount={project.budget} />
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Timeline gốc: {project.originalUseCaseDays || project.deadline || "—"} ngày
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Deadline: {project.deadline || "—"} ngày
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium inline-flex items-center ${badgeClass}`}
              >
                {displayStatus}
              </span>
            </div>

            {/* Client info */}
            {client && (
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border/60">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{client.fullName}</p>
                  {client.profile?.company && (
                    <p className="text-sm text-muted-foreground">
                      {client.profile.company}
                      {client.profile?.location
                        ? ` · ${client.profile.location}`
                        : ""}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ---- Action buttons ---- */}
          <div className="flex flex-col gap-2 items-end">
            {/* Message Client */}
            {client && !isDisputed && (
              <Link
                to={`/messenger?expertId=${project.clientId}`}
                className="h-11 px-5 bg-brand-primary text-brand-primary-foreground rounded-[14px] hover:bg-brand-primary-hover font-semibold text-base inline-flex items-center gap-2 transition-colors"
              >
                <MessageSquare className="w-5 h-5" /> Message Client
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ---- Timeline (read-only when disputed) ---- */}
      {isDisputed ? (
        <div className="bg-card rounded-xl border border-border p-8 shadow-sm text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-muted-foreground text-base">
            Project actions are temporarily locked during dispute resolution.
          </p>
        </div>
      ) : (
        <ProjectTimelineManager role="expert" projectId={id} />
      )}

      {/* ================================================================== */}
      {/* REPORT FORM DIALOG                                                  */}
      {/* ================================================================== */}
      <Dialog open={showReportForm} onOpenChange={setShowReportForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Submit Dispute Report
            </DialogTitle>
          </DialogHeader>
          <ReportForm
            project={project}
            onSubmit={handleSubmitReport}
            onCancel={() => setShowReportForm(false)}
            loading={reportSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ExpertProjectDetail;
