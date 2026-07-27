import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Check, Clock, Send, AlertTriangle, FileText, CheckSquare, Square, Info, Edit2, X } from "lucide-react";
import { useProjectProgress } from "../../hooks/useProjectProgress.js";
import { LoadingSkeleton } from "../../components/shared/LoadingSkeleton.jsx";
import { EmptyState } from "../../components/shared/EmptyState.jsx";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils.js";

export function ExpertUseCaseUpdatePage() {
  const { id, useCaseId } = useParams();
  const projectId = id;
  const navigate = useNavigate();

  const {
    project,
    tasks,
    useCases,
    activityLogs,
    loading,
    error,
    isFullFreeze,
    handleToggleMiniTask,
    handleUseCaseSubmitForReview,
    handleUseCaseSubmitProduct,
    handleUpdateMiniTask,
    handleUpdateTask,
  } = useProjectProgress(projectId, "expert");

  // Inline editing states
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState("");
  const [editingMiniTaskId, setEditingMiniTaskId] = useState(null);
  const [editingMiniTaskTitle, setEditingMiniTaskTitle] = useState("");

  const handleSaveTaskTitle = async (taskId) => {
    if (!editingTaskTitle.trim()) {
      toast.error("Task name cannot be empty!");
      return;
    }
    try {
      await handleUpdateTask(taskId, { title: editingTaskTitle.trim() });
      toast.success("Task name updated successfully!");
      setEditingTaskId(null);
    } catch (err) {
      toast.error("Failed to update task name.");
    }
  };

  const handleSaveMiniTaskTitle = async (taskId, miniTaskId) => {
    if (!editingMiniTaskTitle.trim()) {
      toast.error("Milestone name cannot be empty!");
      return;
    }
    try {
      await handleUpdateMiniTask(taskId, miniTaskId, { title: editingMiniTaskTitle.trim() });
      toast.success("Milestone name updated successfully!");
      setEditingMiniTaskId(null);
    } catch (err) {
      toast.error("Failed to update milestone name.");
    }
  };

  const [evidenceTextMap, setEvidenceTextMap] = useState({});
  const [isEditingEvidence, setIsEditingEvidence] = useState({});

  const handleSaveEvidence = async (taskId, explicitText = null) => {
    const textVal = explicitText !== null ? explicitText : (evidenceTextMap[taskId] || "").trim();
    if (explicitText === null && !textVal) {
      toast.error("Please provide handover evidence!");
      return;
    }
    try {
      await handleUpdateTask(taskId, { evidence: textVal });
      toast.success(explicitText === "" ? "Handover evidence reset." : "Handover evidence updated successfully!");
      setIsEditingEvidence(prev => ({ ...prev, [taskId]: false }));
      if (explicitText !== null) {
        setEvidenceTextMap(prev => ({ ...prev, [taskId]: "" }));
      }
    } catch (err) {
      toast.error("Failed to update handover evidence.");
    }
  };

  // Local state for product submission forms
  const [productLink, setProductLink] = useState("");
  const [productFile, setProductFile] = useState("");
  const [productImage, setProductImage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const getTaskDuration = (t) => {
    if (t.durationDays) return Number(t.durationDays);
    if (t.deadline) {
      const start = t.createdAt ? new Date(t.createdAt) : new Date();
      const end = new Date(t.deadline);
      const diffMs = end - start;
      if (diffMs > 0) {
        return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      }
    }
    return 5; // default fallback
  };

  // Match Use Case
  const uc = useCases && (useCases.find(u => u.id === useCaseId) || useCases[parseInt(useCaseId, 10)]);
  const useCaseIndex = useCases && uc ? useCases.indexOf(uc) : -1;
  // Filter tasks belonging to this Use Case ID
  const ucTasks = tasks ? tasks.filter((t) => t.useCaseId && uc?.id ? t.useCaseId === uc.id : Number(t.useCaseIndex) === useCaseIndex) : [];
  const totalDuration = ucTasks.reduce((sum, t) => sum + getTaskDuration(t), 0);

  // Synchronize initial values when Use Case loads
  useEffect(() => {
    if (uc) {
      setProductLink(uc.productLink || "");
      setProductFile(uc.productFile || "");
      setProductImage(uc.productImage || "");
    }
  }, [uc]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <LoadingSkeleton rows={5} />
      </div>
    );
  }

  if (error || !project || useCaseIndex === -1 || !uc) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <EmptyState
          icon={AlertCircle}
          title="Use Case Not Found"
          description="The requested project or Use Case does not exist."
          action={
            <button
              onClick={() => navigate(`/expert/projects/${projectId}`)}
              className="h-11 px-5 bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover font-semibold text-sm transition-all"
            >
              Back to Project
            </button>
          }
        />
      </div>
    );
  }

  const isReadyToSubmit = uc.progress === 100;

  // Handles submitting the product
  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    if (!productLink.trim()) {
      toast.error("Please provide deliverables product link.");
      return;
    }
    setSubmitting(true);
    try {
      await handleUseCaseSubmitProduct(useCaseIndex, productLink.trim(), productFile.trim(), productImage.trim());
      toast.success("Use Case deliverables submitted successfully!");
    } catch (err) {
      toast.error("Failed to submit deliverables.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handles submitting for review (initial flow before product request)
  const handleSubmitReview = async () => {
    setSubmitting(true);
    try {
      await handleUseCaseSubmitForReview(useCaseIndex);
      toast.success("Requested Use Case review!");
    } catch (err) {
      toast.error("Failed to request review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 font-sans bg-gray-50 min-h-screen">
      {/* Back to Project Management page */}
      <button
        onClick={() => navigate(`/expert/projects/${projectId}`)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors font-medium cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Project
      </button>

      <div className="space-y-6">
        {/* Use Case Card Title & Progress */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm text-left space-y-4">
          <div className="flex justify-between items-start gap-4 flex-wrap">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-brand-primary bg-brand-primary-light px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                Use Case #{useCaseIndex + 1}
              </span>
              <h1 className="text-xl font-bold text-gray-900 mt-1">
                {uc.nameAndDeadline || uc.name}
              </h1>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-600 bg-gray-100 border border-gray-200 px-3 py-1 rounded-lg">
                Total duration: {totalDuration} days
              </span>
              {uc.status === "done" && (
                <span className="text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-lg border border-green-200 uppercase tracking-wide">
                  Approved
                </span>
              )}
              {uc.status === "waiting_client_review" && (
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 uppercase tracking-wide animate-pulse">
                  Awaiting Approval
                </span>
              )}
              {uc.status === "rework" && (
                <span className="text-xs font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200 uppercase tracking-wide">
                  Needs Revision (Rework)
                </span>
              )}
              {uc.status === "submit_product" && (
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 uppercase tracking-wide animate-bounce">
                  Needs Delivery
                </span>
              )}
            </div>
          </div>

          <p className="text-sm text-gray-600 leading-relaxed pl-3 border-l-2 border-slate-300">
            {uc.description}
          </p>

          {/* Overall progress bar */}
          <div className="space-y-1 pt-2">
            <div className="flex justify-between text-xs text-gray-500 font-medium">
              <span>Use Case Progress Status</span>
              <span className="font-bold text-brand-primary">{uc.progress}%</span>
            </div>
            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-primary transition-all duration-500"
                style={{ width: `${uc.progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Client Rework Alert Feedback reason */}
        {uc.status === "rework" && uc.declineReason && (
          <div className="p-4 bg-red-50 text-red-800 rounded-xl border border-red-150 text-sm text-left flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold mb-0.5">Revision Request from Client:</strong>
              <p className="italic text-red-750 font-medium font-sans">"{uc.declineReason}"</p>
            </div>
          </div>
        )}

        {/* Tasks and Milestones Checklist */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm text-left space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-brand-primary" /> Tasks & Milestones List
          </h2>

          {ucTasks.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-4">No tasks found for this Use Case.</p>
          ) : (
            <div className="space-y-4">
              {ucTasks.map((task, tIdx) => {
                const miniTasks = task.miniTasks || [];
                const isTaskCompleted = task.progress === 100;

                return (
                  <div key={task.id || tIdx} className={cn(
                    "p-4 border rounded-xl space-y-3 transition-all duration-300",
                    isTaskCompleted ? "bg-green-50/40 border-green-200 shadow-sm" : "bg-gray-50 border-gray-150"
                  )}>
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        {editingTaskId === task.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingTaskTitle}
                              onChange={(e) => setEditingTaskTitle(e.target.value)}
                              onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveTaskTitle(task.id);
                                  if (e.key === "Escape") setEditingTaskId(null);
                              }}
                              className="flex-grow max-w-md px-2 py-1 text-sm border border-brand-primary rounded focus:outline-none text-gray-950 font-bold bg-white"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveTaskTitle(task.id)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded cursor-pointer border-none bg-transparent"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTaskId(null)}
                              className="p-1 text-gray-500 hover:bg-gray-150 rounded cursor-pointer border-none bg-transparent"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            {miniTasks.length === 0 ? (
                              <button
                                type="button"
                                disabled={isFullFreeze || uc.status === "done"}
                                onClick={() => handleToggleMiniTask(task.id, null)}
                                className="flex items-center gap-2.5 text-left cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-none bg-transparent p-0"
                              >
                                {isTaskCompleted ? (
                                  <CheckSquare className="w-5 h-5 text-green-600 shrink-0" />
                                ) : (
                                  <Square className="w-5 h-5 text-gray-300 shrink-0" />
                                )}
                                <h4 className={cn(
                                   "font-bold text-gray-800 text-sm",
                                   isTaskCompleted && "text-gray-450"
                                 )}>
                                  Task {tIdx + 1}: {task.title || "No Title"}
                                </h4>
                              </button>
                            ) : (
                              <h4 className="font-bold text-gray-800 text-sm">
                                Task {tIdx + 1}: {task.title || "No Title"}
                              </h4>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTaskId(task.id);
                                setEditingTaskTitle(task.title || "");
                              }}
                              className="p-1 text-gray-400 hover:text-brand-primary hover:bg-gray-150 rounded transition-all cursor-pointer border-none bg-transparent inline-flex items-center justify-center shrink-0"
                              title="Edit task name"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        <p className={cn(
                          "text-xs text-gray-400 mt-1",
                          miniTasks.length === 0 ? "pl-7.5" : ""
                        )}>
                          Duration: {getTaskDuration(task)} days
                        </p>
                      </div>

                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded border uppercase",
                        isTaskCompleted
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-gray-100 text-gray-600 border-gray-200"
                      )}>
                        {isTaskCompleted ? "Done" : "In Progress"}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-xs text-gray-500 bg-white/50 p-2 rounded-lg border border-gray-100">
                        {task.description}
                      </p>
                    )}

                    {/* Milestones list checkboxes */}
                    {miniTasks.length > 0 && (
                      <div className="pt-2 border-t border-gray-100 space-y-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Milestones</span>
                        <div className="flex flex-col gap-2">
                          {miniTasks.map((mt) => {
                            const isCompleted = mt.isCompleted === true || mt.status === "done" || mt.status === "completed";
                            return (
                              <div key={mt.id} className="w-full flex items-center gap-2">
                                {editingMiniTaskId === mt.id ? (
                                  <div className="flex items-center gap-2 flex-grow bg-white p-1.5 rounded-lg border border-brand-primary">
                                    <input
                                      type="text"
                                      value={editingMiniTaskTitle}
                                      onChange={(e) => setEditingMiniTaskTitle(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveMiniTaskTitle(task.id, mt.id);
                                        if (e.key === "Escape") setEditingMiniTaskId(null);
                                      }}
                                      className="flex-grow px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none text-gray-950 font-bold bg-white"
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSaveMiniTaskTitle(task.id, mt.id)}
                                      className="p-1 text-green-600 hover:bg-green-50 rounded cursor-pointer border-none bg-transparent"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingMiniTaskId(null)}
                                      className="p-1 text-gray-500 hover:bg-gray-150 rounded cursor-pointer border-none bg-transparent"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className={cn(
                                    "flex items-center justify-between flex-grow p-2 rounded-lg border hover:border-brand-primary hover:bg-slate-50/50 transition-all gap-2",
                                    isCompleted ? "bg-green-50/40 border-green-200" : "bg-white border-gray-200"
                                  )}>
                                    <button
                                      type="button"
                                      disabled={isFullFreeze || uc.status === "done"}
                                      onClick={() => handleToggleMiniTask(task.id, mt.id)}
                                      className="flex items-center gap-2.5 text-left border-none bg-transparent p-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex-grow"
                                    >
                                      {isCompleted ? (
                                        <CheckSquare className="w-4 h-4 text-green-600 shrink-0" />
                                      ) : (
                                        <Square className="w-4 h-4 text-gray-300 shrink-0" />
                                      )}
                                      <span className={cn("text-xs font-medium text-gray-700", isCompleted && "text-gray-400")}>
                                        {mt.title}
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingMiniTaskId(mt.id);
                                        setEditingMiniTaskTitle(mt.title || "");
                                      }}
                                      className="p-1 text-gray-400 hover:text-brand-primary hover:bg-gray-150 rounded transition-all cursor-pointer border-none bg-transparent shrink-0 inline-flex items-center justify-center"
                                      title="Edit milestone name"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Handover Evidence Block */}
                    {isTaskCompleted && (
                      <div className="pt-2 border-t border-gray-100 mt-2 space-y-2">
                        {!task.evidence ? (
                          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-2.5">
                            <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5 font-sans">
                              <Info className="w-4 h-4 text-blue-600 shrink-0" />
                              Handover Evidence (Evidence Constraint)
                            </h4>
                            <p className="text-[11px] text-blue-700 leading-normal font-sans">
                              All milestones are checked. The system requires you to provide handover info (such as Git commit SHA, report link, or short explanation) to set it ready for client review:
                            </p>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={evidenceTextMap[task.id] || ""}
                                onChange={(e) => setEvidenceTextMap(prev => ({ ...prev, [task.id]: e.target.value }))}
                                placeholder="e.g. commit sha: 7e31a4f or https://report-link.com"
                                className="flex-grow h-9 px-3 text-xs border border-gray-300 rounded-[10px] focus:outline-none focus:border-brand-primary text-gray-950 font-semibold bg-white"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEvidence(task.id)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-[10px] font-bold text-xs transition-all cursor-pointer border-none"
                              >
                                Confirm
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-800 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <span className="font-bold block">✓ Submitted handover evidence:</span>
                              <span className="font-mono text-[11px] block mt-0.5 break-all bg-white/50 px-2 py-1 rounded border border-green-150">{task.evidence}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSaveEvidence(task.id, "")}
                              className="text-green-600 hover:text-green-800 font-bold text-xs shrink-0 cursor-pointer border-none bg-transparent"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Product submission Form (Scenario: submit_product or rework + progress = 100%) */}
        {(uc.status === "submit_product" || uc.status === "rework") && isReadyToSubmit && (
          <div className="bg-white rounded-2xl border border-amber-200 p-6 shadow-sm text-left space-y-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Send className="w-5 h-5 text-amber-500 animate-pulse" /> Submit Use Case Product
            </h2>
            <form onSubmit={handleSubmitProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Product Link <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. https://demo-link.com/project"
                  value={productLink}
                  onChange={(e) => setProductLink(e.target.value)}
                  className="w-full h-11 px-3 border border-gray-300 rounded-[10px] focus:outline-none focus:border-brand-primary text-gray-800 text-sm font-sans"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Attached product file name (.zip, .rar)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. code-v1.zip"
                    value={productFile}
                    onChange={(e) => setProductFile(e.target.value)}
                    className="w-full h-11 px-3 border border-gray-300 rounded-[10px] focus:outline-none focus:border-brand-primary text-gray-800 text-sm font-sans"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Demo Image / Screenshot URL
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. https://imgur.com/demopic.png"
                    value={productImage}
                    onChange={(e) => setProductImage(e.target.value)}
                    className="w-full h-11 px-3 border border-gray-300 rounded-[10px] focus:outline-none focus:border-brand-primary text-gray-800 text-sm font-sans"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" /> {submitting ? "Submitting..." : "Submit Use Case Deliverables"}
              </button>
            </form>
          </div>
        )}

        {/* Submit for Review (Scenario: in_progress/no status + progress = 100%) */}
        {(!uc.status || uc.status === "in_progress") && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm text-left flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                <Info className="w-4 h-4 text-brand-primary" /> Request Use Case Review
              </h3>
              <p className="text-xs text-gray-500">
                {!isReadyToSubmit
                  ? "All tasks/milestones in this Use Case must be 100% completed to trigger review request."
                  : "Tasks are ready. Send request for client review."}
              </p>
            </div>

            <button
              type="button"
              disabled={!isReadyToSubmit || submitting || isFullFreeze}
              onClick={handleSubmitReview}
              className="h-11 px-6 bg-brand-primary hover:bg-brand-primary-hover text-white disabled:bg-gray-100 disabled:text-gray-400 rounded-xl font-bold text-sm transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              {submitting ? "Submitting..." : "Submit for Review"}
            </button>
          </div>
        )}

        {/* Activity log specific to this page */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm text-left space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-primary animate-pulse" /> Activity Log
          </h2>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
            {!activityLogs || activityLogs.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No activity recorded yet.</p>
            ) : (
              <div className="relative border-l-2 border-slate-100 ml-3 pl-6 space-y-4 pt-1">
                {activityLogs.map((log, idx) => (
                  <div key={log.id || idx} className="relative">
                    <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-brand-primary border-2 border-white shadow-sm" />
                    <div className="space-y-1">
                      <div className="flex justify-between items-start text-xs">
                        <span className="font-bold text-gray-800">{log.userName || log.userRole || "System"}</span>
                        <span className="text-gray-400 font-mono">{new Date(log.timestamp).toLocaleString("vi-VN")}</span>
                      </div>
                      <p className="text-sm text-gray-655 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100/60 font-medium">
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
    </div>
  );
}
