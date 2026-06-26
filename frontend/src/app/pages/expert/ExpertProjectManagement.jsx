import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Send, AlertTriangle } from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog.jsx";

// =============================================================================
// ExpertProjectManagement â€” expert-side project progress management page.
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
    retry,
  } = useProjectProgress(currentProjectId, "expert");

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [projectLink, setProjectLink] = useState("");
  const [projectFile, setProjectFile] = useState("");
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
      toast.success("Ná»™p bÃ¡o cÃ¡o giáº£i trÃ¬nh thÃ nh cÃ´ng!");
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    } catch (err) {
      toast.error(err.message || "KhÃ´ng thá»ƒ ná»™p bÃ¡o cÃ¡o giáº£i trÃ¬nh.");
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
      toast.success("BÃ¡o cÃ¡o vi pháº¡m Ä‘Ã£ Ä‘Æ°á»£c gá»­i tá»›i Admin thÃ nh cÃ´ng.");
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    } catch (err) {
      toast.error(err.message || "KhÃ´ng thá»ƒ gá»­i bÃ¡o cÃ¡o vi pháº¡m.");
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
        {/* Dispute banner */}
        {isDisputed && <DisputeBanner report={report} />}

          <>
            {/* Project header */}
            <ProjectHeaderCard
              project={project}
              client={client}
              role="expert"
              overallProgress={overallProgress}
              loading={false}
              onMessage={() => navigate("/messenger")}
            >
              <div className="flex items-center gap-3">
                {isDisputed && report?.status === "Awaiting Expert" && (
                  <button
                    type="button"
                    onClick={() => setShowExplanationModal(true)}
                    className="h-11 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-[14px] font-bold text-sm inline-flex items-center gap-2 cursor-pointer transition-all shadow-md animate-pulse"
                  >
                    âš ï¸ Pháº£n há»“i vi pháº¡m
                  </button>
                )}
                {!isDisputed && !hasPendingReportFromMe && (
                  <button
                    type="button"
                    onClick={() => setShowReportForm(true)}
                    className="h-11 px-4 border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 rounded-[14px] font-semibold text-sm inline-flex items-center gap-2 cursor-pointer transition-all shadow-sm"
                  >
                    <AlertTriangle className="w-4 h-4" /> Báo cáo vi phạm
                  </button>
                )}
                {hasPendingReportFromMe && (
                  <button
                    disabled
                    className="h-11 px-4 border border-gray-200 text-gray-400 bg-gray-50 rounded-[14px] font-semibold text-sm inline-flex items-center gap-2 cursor-not-allowed transition-all shadow-sm"
                  >
                    <AlertTriangle className="w-4 h-4 text-gray-400" /> Đang trong tiến hành
                  </button>
                )}
                {/* Submit work button (expert only) */}
                {overallProgress === 100 && project.status !== "completed" && !isFullFreeze ? (
                  project.finalDeliveryStatus === "Final Product Submitted" ? (
                    <button
                      disabled
                      className="h-11 px-5 bg-gray-100 text-gray-400 border border-gray-200 rounded-[14px] font-semibold text-base inline-flex items-center gap-2 cursor-not-allowed"
                    >
                      Submitted Work
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowSubmitModal(true)}
                      className="h-11 px-5 bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover font-semibold text-base inline-flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Send className="w-4 h-4" /> Submit Work
                    </button>
                  )
                ) : project.status === "completed" ? (
                  <button
                    disabled
                    className="h-11 px-5 bg-gray-300 text-gray-500 rounded-[14px] font-semibold text-base inline-flex items-center gap-2 cursor-not-allowed"
                  >
                    Project Complete
                  </button>
                ) : null}
              </div>
            </ProjectHeaderCard>

            {/* Project Final Handover Section */}
            {overallProgress === 100 && project.status !== "completed" && !isFullFreeze && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 font-sans">
                  <Send className="w-5 h-5 text-brand-primary" /> BÃ n giao dá»± Ã¡n tá»•ng thá»ƒ (Project Final Handover)
                </h2>
                
                {project.finalWorkDeclineReason && (
                  <div className="p-4 bg-red-50 text-red-800 rounded-xl border border-red-100 text-sm font-sans">
                    <strong className="block font-semibold mb-1">YÃªu cáº§u sá»­a Ä‘á»•i sáº£n pháº©m bÃ n giao cuá»‘i cÃ¹ng:</strong>
                    {project.finalWorkDeclineReason}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 p-4 rounded-xl font-sans">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-700">
                      {project.finalDeliveryStatus === "Final Product Submitted" ? (
                        <span className="text-brand-primary font-semibold flex items-center gap-1.5">
                          âœ“ ÄÃ£ ná»™p sáº£n pháº©m tá»•ng. Äang chá» Client tháº©m Ä‘á»‹nh.
                        </span>
                      ) : (
                        <span className="text-gray-500">
                          Táº¥t cáº£ cÃ¡c má»‘c cÃ´ng viá»‡c Ä‘Ã£ hoÃ n thÃ nh. HÃ£y cung cáº¥p Link vÃ  File sáº£n pháº©m cuá»‘i Ä‘á»ƒ bÃ n giao dá»± Ã¡n.
                        </span>
                      )}
                    </p>
                    {project.finalDeliveryStatus === "Final Product Submitted" && (
                      <div className="text-xs text-gray-500 space-y-0.5 mt-1 pt-1 border-t border-gray-200">
                        <p><strong>Project Link:</strong> <a href={project.finalProjectLink} target="_blank" rel="noreferrer" className="text-brand-primary hover:underline">{project.finalProjectLink}</a></p>
                        <p><strong>Project File:</strong> <span className="font-semibold text-gray-700">{project.finalProjectFile}</span></p>
                      </div>
                    )}
                  </div>

                  {project.finalDeliveryStatus !== "Final Product Submitted" && project.finalDeliveryStatus !== "Accepted" ? (
                    <button
                      type="button"
                      onClick={() => setShowSubmitModal(true)}
                      className="h-11 px-6 bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover font-semibold text-base inline-flex items-center gap-2 transition-colors cursor-pointer shrink-0"
                    >
                      <Send className="w-4 h-4" /> Ná»™p sáº£n pháº©m tá»•ng
                    </button>
                  ) : (
                    <button
                      disabled
                      className="h-11 px-6 bg-gray-200 text-gray-400 border border-gray-300 rounded-[14px] font-semibold text-base inline-flex items-center gap-2 cursor-not-allowed shrink-0"
                    >
                      âœ“ ÄÃ£ ná»™p bÃ n giao
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Project progress panel — expert can toggle mini tasks */}
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
          </>

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
      </div>

      {/* Submit Final Work Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-150 shadow-2xl w-full max-w-md overflow-hidden text-left animate-zoom-in">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 border-b border-gray-100">
              <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-lg">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 font-sans">Ná»™p sáº£n pháº©m bÃ n giao cuá»‘i cÃ¹ng</h3>
                <p className="text-xs text-gray-500 mt-0.5 font-sans">Vui lÃ²ng cung cáº¥p link vÃ  tá»‡p tin sáº£n pháº©m Ä‘á»ƒ bÃ n giao</p>
              </div>
            </div>

            {/* Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!projectLink.trim()) {
                  toast.error("Vui lÃ²ng cung cáº¥p Project Link.");
                  return;
                }
                if (!projectFile.trim()) {
                  toast.error("Vui lÃ²ng cung cáº¥p tÃªn Project File (.zip, .rar).");
                  return;
                }
                setIsSubmitting(true);
                try {
                  await handleSubmitProjectFinalWork(projectLink.trim(), projectFile.trim());
                  toast.success("BÃ n giao sáº£n pháº©m tá»•ng thÃ nh cÃ´ng!");
                  setShowSubmitModal(false);
                } catch (err) {
                  toast.error("KhÃ´ng thá»ƒ ná»™p sáº£n pháº©m bÃ n giao.");
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="p-6 space-y-4 font-sans text-sm"
            >
              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Project Link <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VÃ­ dá»¥: https://github.com/username/project"
                  value={projectLink}
                  onChange={(e) => setProjectLink(e.target.value)}
                  className="w-full h-11 px-3 border border-gray-300 rounded-[10px] focus:outline-none focus:border-brand-primary text-gray-800"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Project Files (.zip, .rar) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VÃ­ dá»¥: sourcecode-v1.zip"
                  value={projectFile}
                  onChange={(e) => setProjectFile(e.target.value)}
                  className="w-full h-11 px-3 border border-gray-300 rounded-[10px] focus:outline-none focus:border-brand-primary text-gray-800"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-semibold text-sm transition-all cursor-pointer"
                >
                  Há»§y
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl font-bold text-sm transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Äang gá»­i..." : "Gá»­i bÃ n giao"}
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
            <DialogTitle className="text-xl font-bold text-gray-900">
              BÃ¡o cÃ¡o vi pháº¡m KhÃ¡ch hÃ ng (Expert Report Client)
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expert Dispute Explanation Panel (Luá»“ng 1 Step 3 response form)
// ---------------------------------------------------------------------------

function ExpertDisputeExplanationPanel({ report, onSubmit }) {
  const [explanation, setExplanation] = useState("");
  const [evidenceName, setEvidenceName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!report?.replyDeadline) return;
    function calculateTime() {
      const now = new Date().getTime();
      const deadline = new Date(report.replyDeadline).getTime();
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeLeft("Háº¾T Háº N PHáº¢N Há»’I (Admin cÃ³ thá»ƒ xá»­ thua)");
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours} giá» ${minutes} phÃºt ${seconds} giÃ¢y cÃ²n láº¡i`);
      }
    }
    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [report?.replyDeadline]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!explanation.trim()) {
      toast.error("Vui lÃ²ng nháº­p ná»™i dung giáº£i trÃ¬nh.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        expertExplanation: explanation,
        expertExplanationEvidence: evidenceName ? [{ fileName: evidenceName, note: "Báº±ng chá»©ng chuyÃªn gia ná»™p" }] : []
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-red-200 shadow-lg overflow-hidden font-sans">
      <div className="bg-red-50 px-6 py-4 border-b border-red-150 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-red-950">YÃŠU Cáº¦U GIáº¢I TRÃŒNH TRANH CHáº¤P Dá»° ÃN</h3>
          <p className="text-xs text-red-700 mt-0.5">KhÃ¡ch hÃ ng Ä‘Ã£ bÃ¡o cÃ¡o vi pháº¡m Ä‘á»‘i vá»›i dá»± Ã¡n nÃ y. Vui lÃ²ng pháº£n há»“i.</p>
        </div>
        <div className="px-3 py-1.5 bg-red-100 text-red-800 rounded-lg text-xs font-bold border border-red-200">
          Háº¡n chÃ³t: {timeLeft || "48 giá»"}
        </div>
      </div>
      <div className="p-6 space-y-6 text-left">
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
          <h4 className="font-bold text-gray-900 text-sm">Ná»™i dung bÃ¡o cÃ¡o tá»« KhÃ¡ch hÃ ng:</h4>
          <p className="text-sm text-gray-700"><strong>LÃ½ do:</strong> {report.reason || report.reportName}</p>
          <p className="text-sm text-gray-700"><strong>MÃ´ táº£ chi tiáº¿t:</strong> {report.description}</p>
          {report.evidence && report.evidence.length > 0 && (
            <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
              <strong>Báº±ng chá»©ng Ä‘Ã­nh kÃ¨m:</strong> {report.evidence.map(e => e.fileName || e.name).join(", ")}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-1 text-sm">
              Ná»™i dung giáº£i trÃ¬nh cá»§a báº¡n <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="Giáº£i trÃ¬nh chi tiáº¿t cÃ¡c cÃ¡o buá»™c cá»§a khÃ¡ch hÃ ng..."
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-[10px] focus:outline-none focus:border-red-500 text-gray-800 text-sm"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1 text-sm">
              TÃ i liá»‡u / Báº±ng chá»©ng giáº£i trÃ¬nh (TÃªn file)
            </label>
            <input
              type="text"
              placeholder="VÃ­ dá»¥: deliverable_screenshot.png, expert_log.txt..."
              value={evidenceName}
              onChange={(e) => setEvidenceName(e.target.value)}
              className="w-full h-11 px-3 border border-gray-300 rounded-[10px] focus:outline-none focus:border-red-500 text-gray-800 text-sm"
            />
          </div>

          <div className="flex items-center justify-end pt-2 border-t border-gray-100">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Äang gá»­i giáº£i trÃ¬nh..." : "Gá»­i bÃ¡o cÃ¡o giáº£i trÃ¬nh"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
