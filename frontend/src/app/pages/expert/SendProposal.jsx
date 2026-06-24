import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Send,
  FileText,
  Image,
  File,
  X,
  DollarSign,
  Calendar,
} from "lucide-react";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { BackButton } from "../../components/shared/BackButton.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { AIPlannerCard } from "../../components/ai/AIPlannerCard.jsx";
import { AIPlannerPanel } from "../../components/ai/AIPlannerDrawer.jsx";
import { FileUploadDropzone } from "../../components/shared/FileUploadDropzone.jsx";
import api from "../../../services/api.js";

/**
 * SendProposal — Expert submits a comprehensive proposal to a client project.
 */
export function SendProposal() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // ---- Form state ----
  const [form, setForm] = useState({
    professionalIntro: "",
    timelineMilestones: "",
    bidAmount: 0,
    durationDays: 14,
  });

  const [tasks, setTasks] = useState([
    {
      id: "task-1",
      title: "",
      miniTasks: [{ id: "mt-1", title: "" }]
    }
  ]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ---- Fetch project + client info ----
  const [project, setProject] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [existingProposal, setExistingProposal] = useState(null);

  useEffect(() => {
    if (!projectId || !user?.id) return;
    setLoading(true);

    Promise.all([
      api.jobPosts.getById(projectId),
      api.proposals.getByExpert(user.id).catch(() => [])
    ])
      .then(async ([job, proposalsList]) => {
        setProject(job);

        // Find existing proposal for this jobPostId
        const foundProp = proposalsList.find(p => String(p.jobPostId) === String(projectId));
        if (foundProp) {
          setExistingProposal(foundProp);
          let parsedCoverLetter = {};
          try {
            parsedCoverLetter = JSON.parse(foundProp.coverLetter);
          } catch (e) {
            parsedCoverLetter = {
              coverLetter: foundProp.coverLetter,
              professionalIntro: foundProp.coverLetter,
            };
          }

          setForm({
            professionalIntro: parsedCoverLetter.professionalIntro || parsedCoverLetter.coverLetter || "",
            timelineMilestones: parsedCoverLetter.timelineMilestones || "",
            bidAmount: foundProp.bidAmount || 0,
            durationDays: parsedCoverLetter.durationDays || foundProp.estimatedDays || 14,
          });

          if (Array.isArray(parsedCoverLetter.tasks)) {
            setTasks(parsedCoverLetter.tasks);
          } else {
            setTasks([
              {
                id: "task-1",
                title: "",
                miniTasks: [{ id: "mt-1", title: "" }]
              }
            ]);
          }

          if (parsedCoverLetter.attachments) {
            setExistingAttachments(parsedCoverLetter.attachments);
          }
        }

        if (job.clientId) {
          try {
            const userDetail = await api.users.getById(job.clientId);
            setClient(userDetail);
          } catch (err) {
            console.error("Failed to load client details:", err);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load details:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [projectId, user?.id]);

  // ---- Attachments ----
  const [attachments, setAttachments] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]); // readonly display for loaded props

  // ---- AI Planner state ----
  const [showAIPlanner, setShowAIPlanner] = useState(false);

  // ---- AI Planner handlers ----
  const handleActivateAI = () => {
    setShowAIPlanner(true);
  };

  const handleCloseAI = () => {
    setShowAIPlanner(false);
  };

  const handleApplyAITasks = (aiTasks) => {
    setTasks(aiTasks);
  };

  // ---- Submit ----
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    setSubmitting(true);

    try {
      const coverLetterObj = {
        professionalIntro: form.professionalIntro.trim(),
        timelineMilestones: tasks.map(t => `${t.title}:\n${t.miniTasks.map(m => `- ${m.title}`).join('\n')}`).join('\n\n'),
        tasks: tasks,
        durationDays: Number(form.durationDays) || 1,
        attachments: [
          ...existingAttachments,
          ...attachments.map((f, i) => ({
            id: `att-${Date.now()}-${i}`,
            name: f.name,
            size: f.size,
            type: f.type,
          })),
        ],
      };

      let finalPropId = null;

      if (existingProposal) {
        await api.proposals.update(existingProposal.id, {
          bidAmount: Number(form.bidAmount) || 0,
          estimatedDays: Number(form.durationDays) || 1,
          coverLetter: JSON.stringify(coverLetterObj),
          isSubmitted: true,
        });
        finalPropId = existingProposal.id;
      } else {
        const created = await api.proposals.create({
          jobPostId: projectId,
          expertId: user.id,
          bidAmount: Number(form.bidAmount) || 0,
          coverLetter: JSON.stringify(coverLetterObj),
          isSubmitted: true,
        });
        finalPropId = created?.id;
      }

      setSubmitting(false);
      if (finalPropId) {
        navigate(`/expert/proposals/${finalPropId}`);
      } else {
        navigate("/expert/proposals");
      }
    } catch (err) {
      console.error("Failed to submit proposal:", err);
      alert(err.message || "Failed to submit proposal. Please try again.");
      setSubmitting(false);
    }
  };

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton fallback="/expert/jobs" className="mb-6">Back</BackButton>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-gray-500 animate-pulse">Loading job post details...</h3>
        </div>
      </div>
    );
  }

  // ---- Project not found ----
  if (!project && projectId) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton fallback="/expert/jobs" className="mb-6">Back</BackButton>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-gray-500">Project not found</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <BackButton fallback="/expert/jobs" className="mb-6">Back</BackButton>

      <div className={`grid grid-cols-1 ${showAIPlanner ? "lg:grid-cols-10 gap-6 items-stretch" : "max-w-4xl mx-auto"}`}>
        <div className={showAIPlanner ? "lg:col-span-7 flex flex-col" : "w-full"}>
          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* ================================================================ */}
              {/* Header — Project Summary                                         */}
              {/* ================================================================ */}
              <div className="p-8 border-b border-gray-100 bg-gray-50/50">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-primary-light text-brand-primary rounded-full text-sm font-medium mb-4">
                  <FileText className="w-4 h-4" />
                  Send Proposal
                </div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {project?.title || "Project"}
                </h1>
                {project && (
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                    {client && (
                      <span>
                        Client: <span className="font-medium text-gray-700">{client.fullName}</span>
                        {client.profile?.company ? ` · ${client.profile.company}` : ""}
                      </span>
                    )}
                    {project.budget != null && (
                      <span className="inline-flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        Budget: <span className="font-medium text-gray-700"><MoneyDisplay amount={project.budget} /></span>
                      </span>
                    )}
                    {project.category && (
                      <span className="inline-flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        Category: <span className="font-medium text-gray-700 capitalize">{project.category}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* ================================================================ */}
              {/* Form Body                                                         */}
              {/* ================================================================ */}
              <div className="p-8 space-y-8">
                {/* 1. Professional Introduction */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Professional Introduction <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={form.professionalIntro}
                    onChange={(e) => updateField("professionalIntro", e.target.value)}
                    rows={5}
                    placeholder="Introduce yourself — your experience, background, relevant skills, and why you are the best fit for this project."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary text-sm resize-y"
                    required
                  />
                </div>

                {/* ── AI Project Planner ── */}
                <AIPlannerCard
                  onGenerateAI={handleActivateAI}
                  onCloseAI={handleCloseAI}
                  aiMode={showAIPlanner}
                  disabled={submitting}
                />

                {/* 2. Implementation Timeline & Milestones */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Implementation Timeline & Milestones <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-400 mb-4 font-normal">
                    Xây dựng kế hoạch thực hiện dự án chia theo các Task lớn và các Milestone/Nhiệm vụ con tương ứng.
                  </p>

                  <div className="space-y-4">
                    {tasks.map((task, tIdx) => (
                      <div key={task.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-500 uppercase">Task #{tIdx + 1}</span>
                          <input
                            type="text"
                            value={task.title}
                            onChange={(e) => {
                              const newTasks = [...tasks];
                              newTasks[tIdx].title = e.target.value;
                              setTasks(newTasks);
                            }}
                            placeholder="Tên Task lớn (ví dụ: Thiết kế cơ sở dữ liệu)"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-brand-primary/50 focus:outline-none bg-white font-semibold text-gray-800"
                            required
                          />
                          {tasks.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setTasks(tasks.filter(t => t.id !== task.id));
                              }}
                              className="h-8 px-3 text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-[10px] transition-colors inline-flex items-center"
                            >
                              Xóa Task
                            </button>
                          )}
                        </div>

                        {/* Milestones / MiniTasks */}
                        <div className="space-y-2 pl-4 border-l-2 border-gray-300">
                          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Milestones & Nhiệm vụ</span>
                          {task.miniTasks.map((mini, mIdx) => (
                            <div key={mini.id} className="flex items-center gap-2">
                              <span className="text-gray-400 font-mono text-xs">•</span>
                              <input
                                type="text"
                                value={mini.title}
                                onChange={(e) => {
                                  const newTasks = [...tasks];
                                  newTasks[tIdx].miniTasks[mIdx].title = e.target.value;
                                  setTasks(newTasks);
                                }}
                                placeholder={`Nhiệm vụ #${mIdx + 1} (ví dụ: Viết Schema cho các bảng)`}
                                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-brand-primary/50 focus:outline-none bg-white text-gray-750 font-normal"
                                required
                              />
                              {task.miniTasks.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newTasks = [...tasks];
                                    newTasks[tIdx].miniTasks = task.miniTasks.filter(m => m.id !== mini.id);
                                    setTasks(newTasks);
                                  }}
                                  className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-[8px] transition-colors inline-flex items-center justify-center flex-shrink-0"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() => {
                              const newTasks = [...tasks];
                              newTasks[tIdx].miniTasks.push({ id: `mt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, title: "" });
                              setTasks(newTasks);
                            }}
                            className="h-8 px-3 text-sm font-semibold text-brand-primary hover:text-brand-primary-hover hover:bg-brand-primary-light rounded-[10px] transition-colors inline-flex items-center gap-1 mt-1"
                          >
                            + Thêm Milestone
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        setTasks([
                          ...tasks,
                          {
                            id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                            title: "",
                            miniTasks: [{ id: `mt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, title: "" }]
                          }
                        ]);
                      }}
                      className="h-10 px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-[14px] text-sm font-semibold transition-colors inline-flex items-center gap-1.5"
                    >
                      + Thêm Task lớn
                    </button>
                  </div>
                </div>

                {/* 3. Portfolio / Attachments */}
                <FileUploadDropzone
                  files={attachments}
                  onFilesChange={setAttachments}
                  label="Portfolio & Attachments"
                  helperText="Attach your CV, portfolio, demo files, PDFs, or supporting documents."
                />

                {/* Existing attachments from saved proposal (read-only) */}
                {existingAttachments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Previously Attached ({existingAttachments.length})
                    </p>
                    {existingAttachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5"
                      >
                        {att.type === "image/png" ? (
                          <Image className="w-5 h-5 text-brand-primary" />
                        ) : (
                          <File className="w-5 h-5 text-gray-500" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-700">{att.name}</p>
                          <p className="text-xs text-gray-400">{att.size}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 4. Bid Amount + Estimated Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Bid Amount <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={form.bidAmount || ""}
                      onChange={(e) =>
                        updateField("bidAmount", e.target.value === "" ? 0 : Number(e.target.value))
                      }
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary text-sm"
                      placeholder="5000"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Estimated Duration (Days) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={form.durationDays || ""}
                        onChange={(e) =>
                          updateField("durationDays", e.target.value === "" ? 1 : Number(e.target.value))
                        }
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary text-sm"
                        placeholder="14"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Estimated days to complete the project</p>
                  </div>
                </div>
              </div>

              {/* ================================================================ */}
              {/* Footer — Submit                                                   */}
              {/* ================================================================ */}
              <div className="p-8 border-t border-gray-100 bg-gray-50/50">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover font-semibold text-base inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                >
                  {submitting ? (
                    <span className="animate-pulse">Submitting...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Submit Proposal
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* ── AI Project Planner Panel (right side) ── */}
        {showAIPlanner && (
          <aside className="lg:col-span-3">
            <div className="lg:sticky lg:top-16 lg:h-[calc(100vh-9rem)] lg:max-h-none bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <AIPlannerPanel
                onClose={handleCloseAI}
                projectInfo={{
                  title: project?.title || "",
                  category: project?.category || "",
                }}
                onApplyTasks={handleApplyAITasks}
                existingTasks={tasks}
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
