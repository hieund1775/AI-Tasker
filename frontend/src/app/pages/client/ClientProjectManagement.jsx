import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, MessageSquare, CreditCard, Send, AlertTriangle, Clock } from "lucide-react";
import { useProjectProgress } from "../../hooks/useProjectProgress.js";
import { ProjectHeaderCard } from "../../components/project/ProjectHeaderCard.jsx";
import { ProjectProgressPanel } from "../../components/project/ProjectProgressPanel.jsx";
import { LoadingSkeleton } from "../../components/shared/LoadingSkeleton.jsx";
import { EmptyState } from "../../components/shared/EmptyState.jsx";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { releaseProjectMoneyToExpert } from "../../../services/escrowService.js";
import api from "../../../services/api.js";
import { createReport } from "../../../services/reportService.js";
import { DisputeBanner } from "../../components/shared/DisputeBanner.jsx";
import { ReportForm } from "../../components/report/ReportForm.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog.jsx";

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
    useCases,
    expert,
    loading,
    error,
    overallProgress,
    handleToggleMiniTask,
    handleAcceptProjectFinalDelivery,
    handleDeclineProjectFinalDelivery,
    handleApproveTask,
    handleRequestUrgentSubmission,
    handleRequestRevision,
    retry,
  } = useProjectProgress(currentProjectId, "client");

  const [showReleaseConfirmModal, setShowReleaseConfirmModal] = useState(false);
  const [releaseLoading, setReleaseLoading] = useState(false);

  const [showFinalWorkModal, setShowFinalWorkModal] = useState(false);
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineFeedback, setDeclineFeedback] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Dispute / Report states
  const [report, setReport] = useState(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [showExplanationModal, setShowExplanationModal] = useState(false);

  const isDisputed = project?.status?.toLowerCase() === "disputed";
  const isFullFreeze = isDisputed && report?.reporterRole === "client";
  const hasPendingReportFromMe = report && report.reporterRole === "client" && report.status === "Pending";

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

  const handleClientSubmitExplanation = async (explanationData) => {
    try {
      await api.put(`/reports/${report.id}`, explanationData);
      toast.success("Nộp báo cáo giải trình thành công!");
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    } catch (err) {
      toast.error(err.message || "Không thể nộp báo cáo giải trình.");
    }
  };

  const handleClientSubmitReport = async (reportData) => {
    setReportSubmitting(true);
    try {
      await createReport({
        ...reportData,
        reporterRole: "client",
        reportType: "type1"
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

  const handleReleasePayment = async () => {
    setReleaseLoading(true);
    try {
      await releaseProjectMoneyToExpert({
        projectId: currentProjectId,
        amount: project?.budget || 0,
        expertId: project?.assignedExpertId || project?.expertId,
      });
      setShowReleaseConfirmModal(false);
      toast.success("Giải ngân thành công! Dự án đã hoàn thành.");
      
      // Dispatch database update event to trigger refresh
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
      
      // Force reload the hook data
      retry();
    } catch (err) {
      toast.error(err.message || "Không thể thực hiện giải ngân.");
    } finally {
      setReleaseLoading(false);
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
        {/* Dispute banner */}
        {isDisputed && <DisputeBanner report={report} />}

          <>
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
              <div className="flex items-center gap-3">
                {isDisputed && report?.status === "Awaiting Client" && (
                  <button
                    type="button"
                    onClick={() => setShowExplanationModal(true)}
                    className="h-11 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-[14px] font-bold text-sm inline-flex items-center gap-2 cursor-pointer transition-all shadow-md animate-pulse"
                  >
                    ⚠️ Phản hồi vi phạm
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
                {overallProgress === 100 && project.status !== "completed" && (
                  <>
                    {/* View Final Work Button */}
                    {isDisputed ? (
                      <button
                        disabled
                        className="h-11 px-5 bg-gray-100 text-gray-400 border border-gray-200 rounded-[14px] font-semibold text-base inline-flex items-center gap-2 cursor-not-allowed"
                        title="Bị khóa do dự án đang có tranh chấp"
                      >
                        View Final Work
                      </button>
                    ) : (project.finalDeliveryStatus === "Final Product Submitted" || project.finalDeliveryStatus === "Accepted") ? (
                      <button
                        type="button"
                        onClick={() => setShowFinalWorkModal(true)}
                        className="h-11 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[14px] font-semibold text-base inline-flex items-center gap-2 shadow-sm cursor-pointer transition-all"
                      >
                        View Final Work
                      </button>
                    ) : (
                      <button
                        disabled
                        className="h-11 px-5 bg-gray-100 text-gray-400 border border-gray-200 rounded-[14px] font-semibold text-base inline-flex items-center gap-2 cursor-not-allowed"
                        title="Expert chưa nộp sản phẩm bàn giao cuối cùng"
                      >
                        View Final Work
                      </button>
                    )}

                    {/* Release Payment Button */}
                    {isDisputed ? (
                      <button
                        disabled
                        className="h-11 px-5 bg-gray-100 text-gray-400 border border-gray-200 rounded-[14px] font-semibold text-base inline-flex items-center gap-2 cursor-not-allowed"
                        title="Bị khóa do dự án đang có tranh chấp"
                      >
                        <CreditCard className="w-4 h-4" /> Release Payment
                      </button>
                    ) : project.finalDeliveryStatus === "Accepted" ? (
                      <button
                        type="button"
                        onClick={() => setShowReleaseConfirmModal(true)}
                        className="h-11 px-5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-[14px] font-semibold text-base inline-flex items-center gap-2 shadow-sm cursor-pointer transition-all"
                      >
                        <CreditCard className="w-4 h-4" /> Release Payment
                      </button>
                    ) : (
                      <button
                        disabled
                        className="h-11 px-5 bg-gray-100 text-gray-400 border border-gray-200 rounded-[14px] font-semibold text-base inline-flex items-center gap-2 cursor-not-allowed"
                        title="Bạn phải Xem và Chấp nhận sản phẩm tổng trước khi giải ngân"
                      >
                        <CreditCard className="w-4 h-4" /> Release Payment
                      </button>
                    )}
                  </>
                )}
                {project.status === "completed" && (
                  <button
                    disabled
                    className="h-11 px-5 bg-gray-100 text-gray-400 border border-gray-200 rounded-[14px] font-semibold text-base cursor-not-allowed"
                  >
                    Payment Released
                  </button>
                )}
              </div>
            </ProjectHeaderCard>

            {/* Project progress panel */}
            <ProjectProgressPanel
              tasks={tasks}
              useCases={useCases}
              overallProgress={overallProgress}
              role="client"
              projectId={currentProjectId}
              onToggleMiniTask={() => {}} // Client cannot toggle
              loading={false}
              readOnly={isFullFreeze}
              onApproveTask={handleApproveTask}
              onRequestUrgentSubmission={handleRequestUrgentSubmission}
              onRequestRevision={handleRequestRevision}
            />
          </>
      </div>

      {/* Explanation Form Modal */}
      <Dialog open={showExplanationModal} onOpenChange={setShowExplanationModal}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-2xl border-none">
          <ClientDisputeExplanationPanel
            report={report}
            onSubmit={async (data) => {
              await handleClientSubmitExplanation(data);
              setShowExplanationModal(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Release Payment Confirmation Modal */}
      {showReleaseConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-150 shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 animate-zoom-in text-left">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 border-b border-gray-100">
              <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-lg">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 font-sans">Giải ngân dự án (Release Payment)</h3>
                <p className="text-xs text-gray-500 mt-0.5 font-sans">Dự án đã đạt 100% hoàn thành</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-sm text-gray-600 font-sans">
              <p>Bạn có chắc chắn muốn giải ngân cho dự án <strong>{project?.title}</strong>?</p>
              <p className="p-3 bg-blue-50/50 text-blue-800 rounded-xl border border-blue-100 leading-relaxed">
                Số tiền ký quỹ (<strong><MoneyDisplay amount={project?.budget} /></strong>) đang trong hệ thống Escrow sẽ được chuyển trực tiếp vào tài khoản khả dụng của Chuyên gia (Available Balance và Total Earned). Hành động này không thể hoàn tác.
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100 font-sans">
              <button
                type="button"
                disabled={releaseLoading}
                onClick={() => setShowReleaseConfirmModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-semibold text-sm transition-all cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={releaseLoading}
                onClick={handleReleasePayment}
                className="px-5 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {releaseLoading ? "Đang xử lý..." : "Đồng ý giải ngân"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Final Work Modal */}
      {showFinalWorkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-150 shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100 animate-zoom-in text-left">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 border-b border-gray-100">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 font-sans">Thẩm định sản phẩm tổng thể (View Final Work)</h3>
                <p className="text-xs text-gray-500 mt-0.5 font-sans">Kiểm tra kỹ lưỡng các sản phẩm Expert đã bàn giao trước khi giải ngân</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-sm text-gray-600 font-sans">
              <div className="space-y-3 p-4 bg-blue-50/40 border border-blue-100 rounded-xl">
                <p className="font-semibold text-gray-800">Sản phẩm bàn giao tổng thể của Expert:</p>
                <div>
                  <strong className="block text-gray-500 text-xs uppercase tracking-wider">Project Link</strong>
                  <a
                    href={project?.finalProjectLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline font-medium break-all"
                  >
                    {project?.finalProjectLink || "Chưa cung cấp link"}
                  </a>
                </div>
                <div>
                  <strong className="block text-gray-500 text-xs uppercase tracking-wider">Project Files</strong>
                  <span className="font-semibold text-gray-800 break-all">
                    {project?.finalProjectFile || "Chưa cung cấp file"}
                  </span>
                </div>
              </div>

              {/* Decline Feedback Textarea */}
              {showDeclineForm && (
                <div className="space-y-2 border-t border-gray-100 pt-4 animate-slide-up">
                  <label className="block text-gray-700 font-semibold">
                    Lý do từ chối sản phẩm bàn giao cuối cùng <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Vui lòng cung cấp lý do chi tiết để Expert sửa đổi..."
                    value={declineFeedback}
                    onChange={(e) => setDeclineFeedback(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-[10px] focus:outline-none focus:border-brand-primary text-gray-800"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-wrap items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100 font-sans">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setShowFinalWorkModal(false);
                  setShowDeclineForm(false);
                  setDeclineFeedback("");
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-semibold text-sm transition-all cursor-pointer"
              >
                Đóng
              </button>

              {project.finalDeliveryStatus === "Final Product Submitted" && (
                <>
                  {!showDeclineForm ? (
                    <>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => setShowDeclineForm(true)}
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-semibold text-sm transition-all cursor-pointer"
                      >
                        Từ chối (Decline)
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={async () => {
                          setActionLoading(true);
                          try {
                            await handleAcceptProjectFinalDelivery();
                            toast.success("Đã chấp nhận sản phẩm bàn giao tổng thể. Nút giải ngân đã được mở khóa.");
                            setShowFinalWorkModal(false);
                          } catch (err) {
                            toast.error("Không thể chấp nhận sản phẩm bàn giao.");
                          } finally {
                            setActionLoading(false);
                          }
                        }}
                        className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        ✓ Chấp nhận sản phẩm tổng
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={async () => {
                        if (!declineFeedback.trim()) {
                          toast.error("Vui lòng nhập lý do từ chối.");
                          return;
                        }
                        setActionLoading(true);
                        try {
                          await handleDeclineProjectFinalDelivery(declineFeedback.trim());
                          toast.success("Đã gửi yêu cầu chỉnh sửa sản phẩm tổng thể.");
                          setShowFinalWorkModal(false);
                          setShowDeclineForm(false);
                          setDeclineFeedback("");
                        } catch (err) {
                          toast.error("Không thể gửi yêu cầu chỉnh sửa.");
                        } finally {
                          setActionLoading(false);
                        }
                      }}
                      className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all shadow-sm cursor-pointer"
                    >
                      Gửi yêu cầu chỉnh sửa (Submit Decline)
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Dialog for Report Form */}
      <Dialog open={showReportForm} onOpenChange={setShowReportForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Báo cáo vi phạm Chuyên gia (Client Report Expert)
            </DialogTitle>
          </DialogHeader>
          <ReportForm
            project={project}
            onSubmit={handleClientSubmitReport}
            onCancel={() => setShowReportForm(false)}
            loading={reportSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client Dispute Explanation Panel (Luồng 2 Step 3 response form)
// ---------------------------------------------------------------------------

function ClientDisputeExplanationPanel({ report, onSubmit }) {
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
        clientExplanation: explanation,
        clientExplanationEvidence: evidenceName ? [{ fileName: evidenceName, note: "Bằng chứng khách hàng nộp" }] : []
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-red-200 shadow-lg overflow-hidden font-sans">
      <div className="bg-red-50 px-6 py-4 border-b border-red-150 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-red-950">YÊU CẦU GIẢI TRÌNH TRANH CHẤP THANH TOÁN</h3>
          <p className="text-xs text-red-700 mt-0.5">Chuyên gia báo cáo bạn trì hoãn giải ngân. Vui lòng phản hồi.</p>
        </div>
        <div className="px-3 py-1.5 bg-red-100 text-red-800 rounded-lg text-xs font-bold border border-red-200">
          Hạn chót: {timeLeft || "48 giờ"}
        </div>
      </div>
      <div className="p-6 space-y-6 text-left">
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
          <h4 className="font-bold text-gray-900 text-sm">Nội dung báo cáo từ Chuyên gia:</h4>
          <p className="text-sm text-gray-700"><strong>Lý do:</strong> {report.reason || report.reportName}</p>
          <p className="text-sm text-gray-700"><strong>Mô tả chi tiết:</strong> {report.description}</p>
          {report.evidence && report.evidence.length > 0 && (
            <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
              <strong>Bằng chứng đính kèm:</strong> {report.evidence.map(e => e.fileName || e.name).join(", ")}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-1 text-sm">
              Nội dung giải trình của bạn <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="Giải trình lý do bạn chưa giải ngân (ví dụ: sản phẩm chưa đạt chất lượng, Expert chưa sửa lỗi...)"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-[10px] focus:outline-none focus:border-red-500 text-gray-800 text-sm"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1 text-sm">
              Tài liệu / Bằng chứng giải trình (Tên file)
            </label>
            <input
              type="text"
              placeholder="Ví dụ: chat_proof.pdf, qa_report.pdf..."
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
              {submitting ? "Đang gửi giải trình..." : "Gửi báo cáo giải trình"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

