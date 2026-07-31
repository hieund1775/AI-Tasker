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
      toast.success("Task name updated successfully.");
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
      toast.success("Milestone name updated successfully.");
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
      toast.success(explicitText === "" ? "Handover evidence reset." : "Handover evidence updated successfully.");
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
          title="Use case not found"
          description="The requested project or use case does not exist."
          action={
            <button
              onClick={() => navigate(`/expert/projects/${projectId}`)}
              className="h-10 px-4 bg-brand-primary text-primary-foreground rounded-lg hover:bg-brand-primary-hover font-semibold text-sm transition-all"
            >
              Back to project
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
      toast.error("Please provide a deliverables link.");
      return;
    }
    setSubmitting(true);
    try {
      await handleUseCaseSubmitProduct(useCaseIndex, productLink.trim(), productFile.trim(), productImage.trim());
      toast.success("Use case deliverables submitted successfully.");
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
      toast.success("Use case review requested.");
    } catch (err) {
      toast.error("Failed to request review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 font-sans bg-secondary min-h-screen">
      {/* Back to Project Management page */}
      <button
        onClick={() => navigate(`/expert/projects/${projectId}`)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors font-medium cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Back to project
      </button>

      <div className="space-y-6">
        {/* Use Case Card Title & Progress */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm text-left space-y-4">
          <div className="flex justify-between items-start gap-4 flex-wrap">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-brand-primary bg-brand-primary-light px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                Use case #{useCaseIndex + 1}
              </span>
              <h1 className="text-xl font-semibold text-foreground mt-1">
                {uc.nameAndDeadline || uc.name}
              </h1>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-muted-foreground bg-muted border border-border px-3 py-1 rounded-lg">
                Total duration: {totalDuration} days
              </span>
              {uc.status === "done" && (
                <span className="text-xs font-semibold text-success bg-success-light px-2.5 py-1 rounded-lg border border-success/20 uppercase tracking-wide">
                  Approved
                </span>
              )}
              {uc.status === "waiting_client_review" && (
                <span className="text-xs font-semibold text-accent bg-accent-light px-2.5 py-1 rounded-lg border border-accent/25 uppercase tracking-wide animate-pulse">
                  Awaiting approval
                </span>
              )}
              {uc.status === "rework" && (
                <span className="text-xs font-semibold text-warning bg-warning-light px-2.5 py-1 rounded-lg border border-warning/20 uppercase tracking-wide">
                  Needs Revision (Rework)
                </span>
              )}
              {uc.status === "submit_product" && (
                <span className="text-xs font-semibold text-warning bg-warning-light px-2.5 py-1 rounded-lg border border-warning/20 uppercase tracking-wide animate-bounce">
                  Needs Delivery
                </span>
              )}
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed pl-3 border-l-2 border-border">
            {uc.description}
          </p>

          {/* Overall progress bar */}
          <div className="space-y-1 pt-2">
            <div className="flex justify-between text-xs text-muted-foreground font-medium">
              <span>Use case progress</span>
              <span className="font-semibold text-brand-primary">{uc.progress}%</span>
            </div>
            <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-primary transition-all duration-500"
                style={{ width: `${uc.progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Client Rework Alert Feedback reason */}
        {uc.status === "rework" && uc.declineReason && (
          <div className="p-4 bg-destructive-light text-destructive rounded-xl border border-destructive/20 text-sm text-left flex gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold mb-0.5">Revision request from client:</strong>
              <p className="italic text-destructive font-medium font-sans">"{uc.declineReason}"</p>
            </div>
          </div>
        )}

        {/* Tasks and Milestones Checklist */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm text-left space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-brand-primary" /> Tasks and milestones
          </h2>

          {ucTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground/70 italic py-4">No tasks found for this use case.</p>
          ) : (
            <div className="space-y-4">
              {ucTasks.map((task, tIdx) => {
                const miniTasks = task.miniTasks || [];
                const isTaskCompleted = task.progress === 100;

                return (
                  <div key={task.id || tIdx} className={cn(
                    "p-4 border rounded-xl space-y-3 transition-all duration-300",
                    isTaskCompleted ? "bg-success-light/40 border-success/20 shadow-sm" : "bg-secondary border-border-light"
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
                              className="flex-grow max-w-md px-2 py-1 text-sm border border-brand-primary rounded focus:outline-none text-foreground font-semibold bg-card"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveTaskTitle(task.id)}
                              className="p-1 text-success hover:bg-success-light rounded cursor-pointer border-none bg-transparent"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTaskId(null)}
                              className="p-1 text-muted-foreground hover:bg-border-light rounded cursor-pointer border-none bg-transparent"
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
                                  <CheckSquare className="w-5 h-5 text-success shrink-0" />
                                ) : (
                                  <Square className="w-5 h-5 text-muted-foreground/40 shrink-0" />
                                )}
                                <h4 className={cn(
                                   "font-semibold text-foreground text-sm",
                                   isTaskCompleted && "text-muted-foreground/60"
                                 )}>
                                  Task {tIdx + 1}: {task.title || "No title"}
                                </h4>
                              </button>
                            ) : (
                              <h4 className="font-semibold text-foreground text-sm">
                                Task {tIdx + 1}: {task.title || "No title"}
                              </h4>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTaskId(task.id);
                                setEditingTaskTitle(task.title || "");
                              }}
                              className="p-1 text-muted-foreground/70 hover:text-brand-primary hover:bg-border-light rounded transition-all cursor-pointer border-none bg-transparent inline-flex items-center justify-center shrink-0"
                              title="Edit task name"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        <p className={cn(
                          "text-xs text-muted-foreground/70 mt-1",
                          miniTasks.length === 0 ? "pl-7.5" : ""
                        )}>
                          Duration: {getTaskDuration(task)} days
                        </p>
                      </div>

                      <span className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded border uppercase",
                        isTaskCompleted
                          ? "bg-success-light text-success border-success/20"
                          : "bg-muted text-muted-foreground border-border"
                      )}>
                        {isTaskCompleted ? "Done" : "In Progress"}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-xs text-muted-foreground bg-card/50 p-2 rounded-lg border border-border-light">
                        {task.description}
                      </p>
                    )}

                    {/* Milestones list checkboxes */}
                    {miniTasks.length > 0 && (
                      <div className="pt-2 border-t border-border-light space-y-2">
                        <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider block">Milestones</span>
                        <div className="flex flex-col gap-2">
                          {miniTasks.map((mt) => {
                            const isCompleted = mt.isCompleted === true || mt.status === "done" || mt.status === "completed";
                            return (
                              <div key={mt.id} className="w-full flex items-center gap-2">
                                {editingMiniTaskId === mt.id ? (
                                  <div className="flex items-center gap-2 flex-grow bg-card p-1.5 rounded-lg border border-brand-primary">
                                    <input
                                      type="text"
                                      value={editingMiniTaskTitle}
                                      onChange={(e) => setEditingMiniTaskTitle(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveMiniTaskTitle(task.id, mt.id);
                                        if (e.key === "Escape") setEditingMiniTaskId(null);
                                      }}
                                      className="flex-grow px-2 py-1 text-xs border border-input rounded focus:outline-none text-foreground font-semibold bg-card"
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSaveMiniTaskTitle(task.id, mt.id)}
                                      className="p-1 text-success hover:bg-success-light rounded cursor-pointer border-none bg-transparent"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingMiniTaskId(null)}
                                      className="p-1 text-muted-foreground hover:bg-border-light rounded cursor-pointer border-none bg-transparent"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className={cn(
                                    "flex items-center justify-between flex-grow p-2 rounded-lg border hover:border-brand-primary hover:bg-secondary/50 transition-all gap-2",
                                    isCompleted ? "bg-success-light/40 border-success/20" : "bg-card border-border"
                                  )}>
                                    <button
                                      type="button"
                                      disabled={isFullFreeze || uc.status === "done"}
                                      onClick={() => handleToggleMiniTask(task.id, mt.id)}
                                      className="flex items-center gap-2.5 text-left border-none bg-transparent p-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex-grow"
                                    >
                                      {isCompleted ? (
                                        <CheckSquare className="w-4 h-4 text-success shrink-0" />
                                      ) : (
                                        <Square className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                                      )}
                                      <span className={cn("text-xs font-medium text-foreground", isCompleted && "text-muted-foreground/70")}>
                                        {mt.title}
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingMiniTaskId(mt.id);
                                        setEditingMiniTaskTitle(mt.title || "");
                                      }}
                                      className="p-1 text-muted-foreground/70 hover:text-brand-primary hover:bg-border-light rounded transition-all cursor-pointer border-none bg-transparent shrink-0 inline-flex items-center justify-center"
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
                      <div className="pt-2 border-t border-border-light mt-2 space-y-2">
                        {!task.evidence ? (
                          <div className="p-3.5 bg-accent-light border border-accent/25 rounded-xl space-y-2.5">
                            <h4 className="text-xs font-semibold text-primary flex items-center gap-1.5 font-sans">
                              <Info className="w-4 h-4 text-accent shrink-0" />
                              Handover evidence
                            </h4>
                            <p className="text-[11px] text-accent leading-normal font-sans">
                              All milestones are checked. Provide handover information, such as a Git commit SHA, report link, or short explanation, so it is ready for client review:
                            </p>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={evidenceTextMap[task.id] || ""}
                                onChange={(e) => setEvidenceTextMap(prev => ({ ...prev, [task.id]: e.target.value }))}
                                placeholder="e.g. commit sha: 7e31a4f or https://report-link.com"
                                className="flex-grow h-9 px-3 text-xs border border-input rounded-[10px] focus:outline-none focus:border-brand-primary text-foreground font-semibold bg-card"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEvidence(task.id)}
                                className="px-4 py-2 bg-accent hover:bg-accent-hover text-primary-foreground rounded-[10px] font-semibold text-xs transition-all cursor-pointer border-none"
                              >
                                Confirm
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-success-light border border-success/20 rounded-xl text-xs text-success flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <span className="font-semibold block">Submitted handover evidence:</span>
                              <span className="font-mono text-[11px] block mt-0.5 break-all bg-card/50 px-2 py-1 rounded border border-success/20">{task.evidence}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSaveEvidence(task.id, "")}
                              className="text-success hover:text-success font-semibold text-xs shrink-0 cursor-pointer border-none bg-transparent"
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
          <div className="bg-card rounded-2xl border border-warning/20 p-6 shadow-sm text-left space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Send className="w-5 h-5 text-warning animate-pulse" /> Submit use case deliverables
            </h2>
            <form onSubmit={handleSubmitProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase mb-1">
                  Product link <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. https://demo-link.com/project"
                  value={productLink}
                  onChange={(e) => setProductLink(e.target.value)}
                  className="w-full h-10 px-3 border border-input rounded-[10px] focus:outline-none focus:border-brand-primary text-foreground text-sm font-sans"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase mb-1">
                    Attached product file name (.zip, .rar)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. code-v1.zip"
                    value={productFile}
                    onChange={(e) => setProductFile(e.target.value)}
                    className="w-full h-10 px-3 border border-input rounded-[10px] focus:outline-none focus:border-brand-primary text-foreground text-sm font-sans"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase mb-1">
                    Demo image / screenshot URL
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. https://imgur.com/demopic.png"
                    value={productImage}
                    onChange={(e) => setProductImage(e.target.value)}
                    className="w-full h-10 px-3 border border-input rounded-[10px] focus:outline-none focus:border-brand-primary text-foreground text-sm font-sans"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-10 bg-brand-primary hover:bg-brand-primary-hover text-primary-foreground rounded-lg font-medium text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" /> {submitting ? "Submitting..." : "Submit use case deliverables"}
              </button>
            </form>
          </div>
        )}

        {/* Submit for Review (Scenario: in_progress/no status + progress = 100%) */}
        {(!uc.status || uc.status === "in_progress") && (
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm text-left flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                <Info className="w-4 h-4 text-brand-primary" /> Request use case review
              </h3>
              <p className="text-xs text-muted-foreground">
                {!isReadyToSubmit
                  ? "All tasks and milestones in this use case must be 100% complete before you can request a review."
                  : "Tasks are ready. Send a request for client review."}
              </p>
            </div>

            <button
              type="button"
              disabled={!isReadyToSubmit || submitting || isFullFreeze}
              onClick={handleSubmitReview}
              className="h-10 px-6 bg-brand-primary hover:bg-brand-primary-hover text-primary-foreground disabled:bg-muted disabled:text-muted-foreground/70 rounded-lg font-medium text-sm transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              {submitting ? "Submitting..." : "Submit for Review"}
            </button>
          </div>
        )}

        {/* Activity log specific to this page */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm text-left space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-primary animate-pulse" /> Activity Log
          </h2>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
            {!activityLogs || activityLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground/70 italic">No activity recorded yet.</p>
            ) : (
              <div className="relative border-l-2 border-border-light ml-3 pl-6 space-y-4 pt-1">
                {activityLogs.map((log, idx) => (
                  <div key={log.id || idx} className="relative">
                    <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-brand-primary border-2 border-background shadow-sm" />
                    <div className="space-y-1">
                      <div className="flex justify-between items-start text-xs">
                        <span className="font-semibold text-foreground">{log.userName || log.userRole || "System"}</span>
                        <span className="text-muted-foreground/70 font-mono">{new Date(log.timestamp).toLocaleString("vi-VN")}</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed bg-secondary p-2.5 rounded-lg border border-border-light/60 font-medium">
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
