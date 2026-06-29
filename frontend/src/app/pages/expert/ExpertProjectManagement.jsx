import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Send, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useProjectProgress } from "../../hooks/useProjectProgress.js";
import { ProjectHeaderCard } from "../../components/project/ProjectHeaderCard.jsx";
import { ProjectProgressPanel } from "../../components/project/ProjectProgressPanel.jsx";
import { LoadingSkeleton } from "../../components/shared/LoadingSkeleton.jsx";
import { EmptyState } from "../../components/shared/EmptyState.jsx";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import api from "../../../services/api.js";
import { createReport } from "../../../services/reportService.js";
import { DisputeBanner } from "../../components/shared/DisputeBanner.jsx";
import { ReportForm } from "../../components/report/ReportForm.jsx";
import { safeArray } from "../../lib/safety.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog.jsx";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import { AnimatedReveal } from "../../components/shared/AnimatedReveal.jsx";

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
    useCases,
    client,
    loading,
    error,
    overallProgress,
    handleToggleMiniTask,
    handleSubmitProjectFinalWork,
    handleUseCaseSubmitForReview,
    handleUseCaseSubmitProduct,
    activityLogs,
    retry,
  } = useProjectProgress(currentProjectId, "expert");

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [projectLink, setProjectLink] = useState("");
  const [projectFile, setProjectFile] = useState("");
  const [projectImage, setProjectImage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dispute / Report states
  const [report, setReport] = useState(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [showExplanationModal, setShowExplanationModal] = useState(false);

  const isDisputed = project?.status?.toLowerCase() === "disputed";
  const isFullFreeze = isDisputed && report?.reporterRole === "client";
  const hasPendingReportFromMe = report && report.reporterRole === "expert" && report.status === "Pending";

  useEffect(() => {
    if (!currentProjectId) return;
    async function loadReport() {
      try {
        const res = await api.get(`/reports`, { params: { projectId: currentProjectId } });
        const list = res?.data || res || [];
        const activeReport = list.find(r => r.status !== "Rejected" && r.status !== "Resolved");
        setReport(activeReport || list[0] || null);
      } catch (err) {
        console.error("Error loading report:", err);
      }
    }
    loadReport();

    const handleDbUpdate = () => {
      loadReport();
      retry();
    };
    window.addEventListener("aitasker_db_update", handleDbUpdate);
    return () => {
      window.removeEventListener("aitasker_db_update", handleDbUpdate);
    };
  }, [currentProjectId, retry]);

  const handleExpertSubmitExplanation = async (explanationData) => {
    try {
      await api.put(`/reports/${report.id}`, explanationData);
      toast.success("Nộp báo cáo giải trình thành công!");
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    } catch (err) {
      toast.error(err.message || "Không thể nộp báo cáo giải trình.");
    }
  };

  const handleExpertSubmitReport = async (reportData) => {
    setReportSubmitting(true);
    try {
      await createReport({
        ...reportData,
        reporterRole: "expert",
        reportType: "type2"
      });
      setShowReportForm(false);
      toast.success("Báo cáo vi phạm đã được gửi tới Admin thành công.");
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    } catch (err) {
      toast.error(err.message || "Không thể gửi báo cáo vi phạm.");
    } finally {
      setReportSubmitting(false);
    }
  };

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
              className="h-11 px-5 bg-brand-primary text-brand-primary-foreground rounded-lg hover:bg-brand-primary-hover font-semibold text-base inline-flex items-center gap-2 transition-colors"
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
              className="h-11 px-5 bg-brand-primary text-brand-primary-foreground rounded-lg hover:bg-brand-primary-hover font-semibold text-base inline-flex items-center gap-2 transition-colors"
            >
              Go to Dashboard
            </button>
          }
        />
      </div>
    );
  }

  const allUseCasesDone = useCases.length > 0 && useCases.every(uc => uc.status === "done");
  const isReadyForFinalSubmit = overallProgress === 100 && allUseCasesDone;
  const isSubmitted = project.finalDeliveryStatus === "Final Product Submitted";
  const isAccepted = project.finalDeliveryStatus === "Accepted";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      <PageHeader
        title="Project Workspace"
        subtitle="Complete tasks, submit deliverables, and track project progress."
        badge={
          project?.status && !isDisputed ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-light text-accent rounded-full text-xs font-semibold capitalize">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {project.status}
            </span>
          ) : null
        }
        illustration={
          <svg width="220" height="120" viewBox="0 0 220 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="30" width="40" height="8" rx="4" fill="currentColor" opacity="0.25" />
            <rect x="60" y="30" width="40" height="8" rx="4" fill="currentColor" opacity="0.35" />
            <rect x="110" y="30" width="40" height="8" rx="4" fill="currentColor" opacity="0.2" />
            <rect x="160" y="30" width="40" height="8" rx="4" fill="currentColor" opacity="0.15" />
            <line x1="30" y1="38" x2="30" y2="60" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
            <line x1="80" y1="38" x2="80" y2="60" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
            <line x1="130" y1="38" x2="130" y2="60" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
            <line x1="180" y1="38" x2="180" y2="60" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
            <circle cx="30" cy="68" r="5" fill="currentColor" opacity="0.4" />
            <circle cx="80" cy="68" r="5" fill="currentColor" opacity="0.3" />
            <circle cx="130" cy="68" r="5" fill="currentColor" opacity="0.2" />
            <circle cx="180" cy="68" r="5" fill="currentColor" opacity="0.1" />
            <line x1="35" y1="68" x2="75" y2="68" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
            <line x1="85" y1="68" x2="125" y2="68" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
            <line x1="135" y1="68" x2="175" y2="68" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
          </svg>
        }
      />

      <div className="space-y-6">
        {/* Dispute banner */}
        {isDisputed && <DisputeBanner report={report} />}

        {/* Delivery & Payment Stepper */}
        <AnimatedReveal>
          <ExpertDeliveryStepper project={project} overallProgress={overallProgress} />
        </AnimatedReveal>

        {/* Project header */}
        <AnimatedReveal delay={1}>
          <ProjectHeaderCard
            project={project}
            client={client}
            role="expert"
            overallProgress={overallProgress}
            loading={false}
            onMessage={() => navigate("/messenger")}
          >
            <div className="flex items-center gap-3">
              {/* Report / Dispute buttons from origin */}
              {isDisputed && report?.status === "Awaiting Expert" && (
                <button
                  type="button"
                  onClick={() => setShowExplanationModal(true)}
                  className="h-11 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-[14px] font-bold text-sm inline-flex items-center gap-2 cursor-pointer transition-all shadow-md animate-pulse"
                >
                  ⚠️ Phản hồi vi phạm
                </button>
              )}
              {hasPendingReportFromMe && (
                <button
                  disabled
                  className="h-11 px-4 border border-border text-muted-foreground bg-secondary rounded-[14px] font-semibold text-sm inline-flex items-center gap-2 cursor-not-allowed transition-all shadow-sm"
                >
                  <AlertTriangle className="w-4 h-4 text-muted-foreground" /> Đang trong tiến hành
                </button>
              )}

              {/* Submit work button (expert only) */}
              {overallProgress === 100 && project.status !== "completed" && !isDisputed ? (
                project.finalDeliveryStatus === "Final Product Submitted" ? (
                  <button
                    disabled
                    className="h-11 px-5 bg-secondary text-muted-foreground border border-border rounded-lg font-semibold text-base inline-flex items-center gap-2 cursor-not-allowed"
                  >
                    Submitted Work
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(true)}
                    className="h-11 px-5 bg-brand-primary text-brand-primary-foreground rounded-lg hover:bg-brand-primary-hover font-semibold text-base inline-flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Send className="w-4 h-4" /> Submit Work
                  </button>
                )
              ) : project.status === "completed" ? (
                <button
                  disabled
                  className="h-11 px-5 bg-success/10 text-success border border-success/20 rounded-lg font-semibold text-base inline-flex items-center gap-2 cursor-not-allowed"
                >
                  <CheckCircle2 className="w-4 h-4" /> Project Complete
                </button>
              ) : null}
            </div>
          </ProjectHeaderCard>
        </AnimatedReveal>

        {/* Project Final Handover Section */}
        {project.status !== "completed" && !isFullFreeze && (
          <AnimatedReveal delay={2}>
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="p-5 pb-3">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center">
                    <Send className="w-4 h-4 text-brand-primary" />
                  </div>
                  Final Project Handover
                </h2>
              </div>

              {project.finalWorkDeclineReason && (
                <div className="mx-5 p-4 bg-destructive/10 text-destructive rounded-xl border border-destructive/20 text-sm mb-2">
                  <strong className="block font-semibold mb-1">Revision Requested:</strong>
                  {project.finalWorkDeclineReason}
                </div>
              )}

              {/* Readiness checklist */}
              <div className="px-5 pb-2">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Conditions</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${overallProgress === 100 ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <span className={overallProgress === 100 ? "text-foreground font-medium" : "text-muted-foreground"}>Progress reaches 100%</span>
                    <span className="text-xs text-muted-foreground/60 ml-auto">{overallProgress}%</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${allUseCasesDone ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <span className={allUseCasesDone ? "text-foreground font-medium" : "text-muted-foreground"}>All Use Cases approved</span>
                    <span className="text-xs text-muted-foreground/60 ml-auto">{useCases.filter(uc => uc.status === "done").length}/{useCases.length}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${isSubmitted || isAccepted ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <span className={(isSubmitted || isAccepted) ? "text-foreground font-medium" : "text-muted-foreground"}>Final submission</span>
                    <span className="text-xs text-muted-foreground/60 ml-auto">{isAccepted ? "Accepted" : isSubmitted ? "Submitted" : "Pending"}</span>
                  </div>
                </div>
              </div>

              <div className="mx-5 mb-5 p-4 bg-secondary/40 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1 min-w-0">
                  <p className="text-sm text-foreground/80">
                    {!isReadyForFinalSubmit ? (
                      <span className="text-muted-foreground">
                        Complete all milestones and use cases before submitting the final deliverables.
                      </span>
                    ) : isSubmitted ? (
                      <span className="text-brand-primary font-semibold flex items-center gap-1.5">
                        Submitted — waiting for client review.
                      </span>
                    ) : isAccepted ? (
                      <span className="text-success font-semibold flex items-center gap-1.5">
                        Accepted! Awaiting payment release.
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        All milestones complete. Provide the project link and files to hand over.
                      </span>
                    )}
                  </p>
                  {isSubmitted && (
                    <div className="text-xs text-muted-foreground space-y-0.5 mt-1 pt-1 border-t border-border">
                      {project.finalProjectLink && <p><strong>Project Link:</strong> <a href={project.finalProjectLink} target="_blank" rel="noreferrer" className="text-brand-primary hover:underline">{project.finalProjectLink}</a></p>}
                      {project.finalProjectFile && <p><strong>Project File:</strong> <span className="font-medium text-foreground/80">{project.finalProjectFile}</span></p>}
                      {project.finalProjectImage && <p><strong>Project Image:</strong> <span className="font-medium text-foreground/80">{project.finalProjectImage}</span></p>}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {!isReadyForFinalSubmit ? (
                    <button disabled className="h-10 px-4 bg-muted text-muted-foreground border border-border rounded-xl font-semibold text-sm inline-flex items-center gap-2 cursor-not-allowed">
                      Nộp sản phẩm tổng
                    </button>
                  ) : isSubmitted || isAccepted ? (
                    isAccepted ? (
                      <span className="px-3 py-2 bg-success/10 text-success border border-success/20 rounded-xl text-xs font-bold uppercase tracking-wider">
                        Đã nghiệm thu
                      </span>
                    ) : (
                      <button disabled className="h-10 px-4 bg-muted text-muted-foreground border border-border rounded-xl font-semibold text-sm inline-flex items-center gap-2 cursor-not-allowed">
                        Đã nộp bàn giao
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setProjectLink(project.finalProjectLink || "");
                        setProjectFile(project.finalProjectFile || "");
                        setProjectImage(project.finalProjectImage || "");
                        setShowSubmitModal(true);
                      }}
                      className="h-10 px-4 bg-brand-primary text-brand-primary-foreground rounded-xl hover:bg-brand-primary-hover font-semibold text-sm inline-flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Send className="w-4 h-4" /> Nộp sản phẩm tổng
                    </button>
                  )}
                </div>
              </div>
            </div>
          </AnimatedReveal>
        )}

        {/* Project progress panel — expert can toggle mini tasks */}
        <AnimatedReveal delay={3}>
          <ProjectProgressPanel
            tasks={tasks}
            useCases={useCases}
            overallProgress={overallProgress}
            role="expert"
            projectId={currentProjectId}
            onToggleMiniTask={(taskId, miniTaskId) =>
              handleToggleMiniTask(taskId, miniTaskId)
            }
            loading={false}
            readOnly={isFullFreeze}
          />
        </AnimatedReveal>
      </div>

      {/* Explanation Form Modal */}
      <Dialog open={showExplanationModal} onOpenChange={setShowExplanationModal}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-2xl border-none">
          <ExpertDisputeExplanationPanel
            report={report}
            onSubmit={async (data) => {
              await handleExpertSubmitExplanation(data);
              setShowExplanationModal(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Submit Final Work Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all animate-fade-in">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md overflow-hidden text-left animate-zoom-in">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 bg-secondary/60 border-b border-border">
              <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-lg">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground font-sans">Nộp sản phẩm bàn giao cuối cùng</h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-sans">Vui lòng cung cấp link và tệp tin sản phẩm để bàn giao</p>
              </div>
            </div>

            {/* Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!projectLink.trim()) {
                  toast.error("Vui lòng cung cấp Project Link.");
                  return;
                }
                if (!projectFile.trim() && !projectImage.trim()) {
                  toast.error("Vui lòng cung cấp ít nhất một file đính kèm hoặc hình ảnh bàn giao.");
                  return;
                }
                setIsSubmitting(true);
                try {
                  await handleSubmitProjectFinalWork(projectLink.trim(), projectFile.trim(), projectImage.trim());
                  toast.success("Bàn giao sản phẩm tổng thành công!");
                  setShowSubmitModal(false);
                } catch (err) {
                  toast.error("Không thể nộp sản phẩm bàn giao.");
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="p-6 space-y-4 font-sans text-sm"
            >
              <div>
                <label className="block text-foreground/80 font-semibold mb-1">
                  Project Link <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: https://github.com/username/project"
                  value={projectLink}
                  onChange={(e) => setProjectLink(e.target.value)}
                  className="w-full h-11 px-3 border border-input rounded-[10px] focus:outline-none focus:border-brand-primary text-foreground"
                />
              </div>

              <div>
                <label className="block text-foreground/80 font-semibold mb-1">
                  Project Files (.zip, .rar)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: sourcecode-v1.zip"
                  value={projectFile}
                  onChange={(e) => setProjectFile(e.target.value)}
                  className="w-full h-11 px-3 border border-input rounded-[10px] focus:outline-none focus:border-brand-primary text-foreground"
                />
              </div>

              <div>
                <label className="block text-foreground/80 font-semibold mb-1">
                  Project Images / Screenshots URL
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: https://imgur.com/screenshot.png"
                  value={projectImage}
                  onChange={(e) => setProjectImage(e.target.value)}
                  className="w-full h-11 px-3 border border-input rounded-[10px] focus:outline-none focus:border-brand-primary text-foreground"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 border border-input text-foreground/80 rounded-xl hover:bg-secondary font-semibold text-sm transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-foreground rounded-xl font-bold text-sm transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Đang gửi..." : "Gửi bàn giao"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog for Report Form */}
      <Dialog open={showReportForm} onOpenChange={setShowReportForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              Báo cáo vi phạm Khách hàng (Expert Report Client)
            </DialogTitle>
          </DialogHeader>
          <ReportForm
            project={project}
            onSubmit={handleExpertSubmitReport}
            onCancel={() => setShowReportForm(false)}
            loading={reportSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Project Activity Log Container */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-4 font-sans text-left mt-6">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Clock className="w-5 h-5 text-brand-primary animate-pulse" /> Nhật ký hoạt động (Activity Log)
        </h2>
        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
          {!activityLogs || activityLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Chưa có hoạt động nào được ghi nhận.</p>
          ) : (
            <div className="relative border-l-2 border-border ml-3 pl-6 space-y-4 pt-1">
              {activityLogs.map((log, idx) => (
                <div key={log.id || idx} className="relative">
                  {/* Dot marker */}
                  <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-brand-primary border-2 border-background shadow-sm" />
                  <div className="space-y-1">
                    <div className="flex justify-between items-start text-xs">
                      <span className="font-bold text-foreground">{log.userName || log.userRole || "Hệ thống"}</span>
                      <span className="text-muted-foreground font-mono">{new Date(log.timestamp).toLocaleString("vi-VN")}</span>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed bg-secondary/60 p-2.5 rounded-lg border border-border font-medium">
                      {log.actionDescription || log.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expert Delivery Stepper
// ---------------------------------------------------------------------------

function ExpertDeliveryStepper({ project, overallProgress }) {
  const finalStatus = project?.finalDeliveryStatus || "";
  const isCompleted = project?.status === "completed";

  const steps = [
    { label: "Tasks Done", done: overallProgress === 100, active: overallProgress < 100 },
    { label: "Submit Final Work", done: ["Final Product Submitted", "Accepted", "Declined"].includes(finalStatus) || isCompleted, active: overallProgress === 100 && !["Final Product Submitted", "Accepted", "Declined"].includes(finalStatus) },
    { label: "Client Accepts", done: finalStatus === "Accepted" || isCompleted, active: finalStatus === "Final Product Submitted" },
    { label: "Payment Released", done: isCompleted, active: finalStatus === "Accepted" && !isCompleted },
  ];

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
      <h3 className="text-sm font-semibold text-foreground/80 mb-4">Delivery & Payment Progress</h3>
      <div className="flex flex-wrap items-center gap-0">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step.done ? "bg-success text-white" : step.active ? "bg-brand-primary text-brand-primary-foreground ring-2 ring-brand-primary/30" : "bg-muted text-muted-foreground"
                }`}
              >
                {step.done ? "✓" : i + 1}
              </div>
              <span className={`text-[10px] mt-1.5 font-medium max-w-[64px] text-center leading-tight ${step.done ? "text-success" : step.active ? "text-brand-primary font-semibold" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && <div className={`w-8 sm:w-12 h-0.5 mx-1 mt-[-12px] transition-colors ${step.done ? "bg-success" : "bg-muted"}`} />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expert Dispute Explanation Panel (Luồng 1 Step 3 response form)
// ---------------------------------------------------------------------------

function ExpertDisputeExplanationPanel({ report, onSubmit }) {
  const [explanation, setExplanation] = useState("");
  const [evidenceName, setEvidenceName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!report?.replyDeadline) return;
    function calculateTime() {
      const now = Date.now();
      const deadline = new Date(report.replyDeadline).getTime();
      if (Number.isNaN(deadline)) {
        setTimeLeft("Không xác định");
        return;
      }
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeLeft("HẾT HẠN PHẢN HỒI (Admin có thể xử thua)");
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours} giờ ${minutes} phút ${seconds} giây còn lại`);
      }
    }
    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [report?.replyDeadline]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!explanation.trim()) {
      toast.error("Vui lòng nhập nội dung giải trình.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        expertExplanation: explanation,
        expertExplanationEvidence: evidenceName ? [{ fileName: evidenceName, note: "Bằng chứng chuyên gia nộp" }] : []
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-destructive/20 shadow-lg overflow-hidden font-sans">
      <div className="bg-destructive/5 px-6 py-4 border-b border-destructive/10 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-destructive">YÊU CẦU GIẢI TRÌNH TRANH CHẤP DỰ ÁN</h3>
          <p className="text-xs text-destructive/70 mt-0.5">Khách hàng đã báo cáo vi phạm đối với dự án này. Vui lòng phản hồi.</p>
        </div>
        <div className="px-3 py-1.5 bg-destructive/10 text-destructive rounded-lg text-xs font-bold border border-destructive/20">
          Hạn chót: {timeLeft || "48 giờ"}
        </div>
      </div>
      <div className="p-6 space-y-6 text-left">
        <div className="p-4 bg-secondary/60 border border-border rounded-xl space-y-3">
          <h4 className="font-bold text-foreground text-sm">Nội dung báo cáo từ Khách hàng:</h4>
          <p className="text-sm text-foreground/80"><strong>Lý do:</strong> {report.reason || report.reportName}</p>
          <p className="text-sm text-foreground/80"><strong>Mô tả chi tiết:</strong> {report.description}</p>
          {safeArray(report.evidence).length > 0 && (
            <div className="text-xs text-muted-foreground pt-2 border-t border-border">
              <strong>Bằng chứng đính kèm:</strong> {safeArray(report.evidence).map(e => e.fileName || e.name).join(", ")}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-foreground/80 font-semibold mb-1 text-sm">
              Nội dung giải trình của bạn <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="Giải trình chi tiết các cáo buộc của khách hàng..."
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-[10px] focus:outline-none focus:border-destructive text-foreground text-sm"
            />
          </div>

          <div>
            <label className="block text-foreground/80 font-semibold mb-1 text-sm">
              Tài liệu / Bằng chứng giải trình (Tên file)
            </label>
            <input
              type="text"
              placeholder="Ví dụ: deliverable_screenshot.png, expert_log.txt..."
              value={evidenceName}
              onChange={(e) => setEvidenceName(e.target.value)}
              className="w-full h-11 px-3 border border-input rounded-[10px] focus:outline-none focus:border-destructive text-foreground text-sm"
            />
          </div>

          <div className="flex items-center justify-end pt-2 border-t border-border">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-destructive hover:bg-destructive/80 text-destructive-foreground rounded-xl font-bold text-sm transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Đang gửi giải trình..." : "Gửi báo cáo giải trình"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
