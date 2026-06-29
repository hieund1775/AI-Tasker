import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Send,
  FileText,
  Image,
  File,
  X,
  BarChart3,
  Calendar,
  GitBranch,
  Lightbulb,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { BackButton } from "../../components/shared/BackButton.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { AIPlannerCard } from "../../components/ai/AIPlannerCard.jsx";
import { AIPlannerPanel } from "../../components/ai/AIPlannerDrawer.jsx";
import { FileUploadDropzone } from "../../components/shared/FileUploadDropzone.jsx";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import { SectionCard } from "../../components/shared/SectionCard.jsx";
import { AnimatedReveal } from "../../components/shared/AnimatedReveal.jsx";
import api from "../../../services/api.js";

function getUseCaseTitle(useCase, index) {
  return (
    useCase?.title ||
    useCase?.name ||
    useCase?.nameAndDeadline ||
    `Use Case ${index + 1}`
  );
}

function getUseCaseDays(useCase) {
  const explicit = Number(
    useCase?.durationDays ??
      useCase?.timelineDays ??
      useCase?.days ??
      useCase?.deadlineDays,
  );
  if (Number.isFinite(explicit) && explicit > 0) return explicit;

  const source = `${useCase?.nameAndDeadline || ""} ${useCase?.description || ""}`;
  const match = source.match(/(\d+)\s*(ngày|day|days)/i);
  return match ? Number(match[1]) : 0;
}

function createTaskForUseCase(useCase, useCaseIndex, taskIndex = 1) {
  const duration = getUseCaseDays(useCase) || 1;
  const title = "";
  return {
    id: `task-${useCaseIndex + 1}-${taskIndex}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    useCaseIndex,
    useCaseId: useCase?.id || "",
    useCaseTitle: getUseCaseTitle(useCase, useCaseIndex),
    title: title,
    durationDays: duration,
    amount: 0,
    miniTasks: [
      {
        id: `mt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        title: "",
      },
    ],
  };
}

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
    acknowledged: false,
  });

  // ---- Use case aware task initialization ----
  // ponytail: flatMap ensures each use case only emits its own tasks — no cross-contamination
  const buildTasksFromUseCases = (job) => {
    const ucs = job?.useCases || [];
    if (ucs.length === 0) {
      return [{
        id: `task-${Date.now()}-0`,
        title: "",
        useCaseId: null,
        source: "expert",
        approvalStatus: "accepted",
        locked: false,
        price: 0,
        completionDays: 1,
        miniTasks: [{ id: `mt-${Date.now()}-0`, title: "" }],
      }];
    }

    const now = Date.now();
    const tasks = ucs.flatMap((uc) => {
      const ucTasks = uc.tasks || [];
      if (ucTasks.length > 0) {
        return ucTasks.map((t, idx) => ({
          id: t.id || `task-${uc.id}-${idx + 1}`,
          useCaseId: t.useCaseId || uc.id,
          useCaseTitle: uc.title || uc.nameAndDeadline,
          title: t.title || "",
          description: t.description || "",
          source: "client",
          approvalStatus: "accepted",
          locked: true,
          price: Number(t.price) || 0,
          completionDays: Number(t.completionDays || t.durationDays) || 1,
          miniTasks: (t.miniTasks || []).length > 0
            ? t.miniTasks.map(m => ({ ...m, taskId: t.id }))
            : [{ id: `mt-${now}-${uc.id}-${idx}-0`, title: "" }],
        }));
      }
      return [{
        id: `task-fb-${uc.id}`,
        useCaseId: uc.id,
        useCaseTitle: uc.title || uc.nameAndDeadline,
        title: "",
        description: uc.description || "",
        source: "client_use_case_fallback",
        approvalStatus: "accepted",
        locked: false,
        price: 0,
        completionDays: Number(uc.originalDurationDays) || 1,
        miniTasks: [{ id: `mt-${now}-fb-${uc.id}`, title: "" }],
      }];
    });

    return dedupeTasks(tasks);
  };

  // ponytail: belt and suspenders — strip any identical-ID tasks before they hit state
  const dedupeTasks = (arr) => {
    const seen = new Set();
    return arr.filter(t => {
      const key = `${t.useCaseId || "root"}:${t.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const [tasks, setTasks] = useState([
    {
      id: "task-1",
      useCaseIndex: 0,
      useCaseTitle: "Use Case 1",
      title: "",
      useCaseId: null,
      source: "expert",
      approvalStatus: "accepted",
      locked: false,
      price: 0,
      completionDays: 1,
      miniTasks: [{ id: "mt-1", title: "" }],
    },
  ]);
  const [extensionConfirmed, setExtensionConfirmed] = useState(false);
  const [submitError, setSubmitError] = useState("");

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
      api.proposals.getByExpert(user.id).catch(() => []),
    ])
      .then(async ([job, proposalsList]) => {
        setProject(job);

        // Initialize tasks from client use cases
        setTasks(buildTasksFromUseCases(job));

        // Find existing proposal for this jobPostId
        const foundProp = proposalsList.find(
          (p) => String(p.jobPostId) === String(projectId),
        );
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
            professionalIntro:
              parsedCoverLetter.professionalIntro ||
              parsedCoverLetter.coverLetter ||
              "",
            timelineMilestones: parsedCoverLetter.timelineMilestones || "",
            bidAmount: foundProp.bidAmount || 0,
            durationDays:
              parsedCoverLetter.durationDays || foundProp.estimatedDays || 14,
          });

          if (Array.isArray(parsedCoverLetter.tasks) && parsedCoverLetter.tasks.length > 0) {
            // Merge saved values into fresh use-case-derived tasks to keep useCaseId correct
            const freshTasks = buildTasksFromUseCases(job);
            const freshIds = new Set(freshTasks.map(t => t.id));
            const merged = freshTasks.map(ft => {
              const existing = parsedCoverLetter.tasks.find(et => et.id === ft.id);
              if (!existing) return ft;
              return {
                ...ft,
                price: Number(existing.price) || ft.price || 0,
                completionDays: Number(existing.completionDays) || ft.completionDays || 1,
                miniTasks: existing.miniTasks?.length > 0 ? existing.miniTasks : ft.miniTasks,
              };
            });
            // Preserve expert-proposed tasks from the existing proposal not in fresh build
            const expertTasks = parsedCoverLetter.tasks.filter(
              et => et.source === "expert" && !freshIds.has(et.id)
            );
            setTasks(dedupeTasks([...merged, ...expertTasks]));
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

        if (
          !foundProp &&
          Array.isArray(job?.useCases) &&
          job.useCases.length > 0
        ) {
          setTasks(
            job.useCases.map((uc, index) => createTaskForUseCase(uc, index)),
          );
        }
      })
      .catch((err) => {
        // Job not found (404) is handled gracefully by the UI — don't alarm with console.error
        if (err?.status === 404) {
          console.warn("[SendProposal] Job post not found:", projectId);
        } else {
          console.error("Failed to load details:", err);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [projectId, user?.id]);

  // ---- Self-healing: ensure every use case has at least one visible task ----
  useEffect(() => {
    const ucs = project?.useCases;
    if (!Array.isArray(ucs) || ucs.length === 0) return;

    if (import.meta.env.DEV) {
      console.debug("[SendProposal] self-heal check:", {
        jobId: project?.id,
        useCasesCount: ucs.length,
        tasksCount: tasks.length,
        grouped: ucs.map(uc => ({
          ucId: uc.id,
          title: uc.title?.slice(0, 40),
          taskCount: tasks.filter(t => t.useCaseId === uc.id).length,
        })),
      });
    }

    setTasks(prev => {
      let changed = false;
      const next = [...prev];

      ucs.forEach(uc => {
        const hasTask = next.some(t => t.useCaseId === uc.id);
        if (!hasTask) {
          next.push({
            id: `task-fb-${uc.id}`,
            useCaseId: uc.id,
            useCaseTitle: uc.title || uc.nameAndDeadline,
            title: "",
            description: uc.description || "",
            source: "client_use_case_fallback",
            approvalStatus: "accepted",
            locked: false,
            completionDays: Number(uc.originalDurationDays || 1),
            miniTasks: [],
          });
          changed = true;
        }
      });

      return changed ? dedupeTasks(next) : prev;
    });
    // ponytail: intentionally depends on [project?.useCases, tasks.length] —
    // only re-heals when use cases or task count changes, not on every tasks mutation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.useCases, tasks.length]);

  // ---- Attachments ----
  const [attachments, setAttachments] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]); // readonly display for loaded props

  // ---- AI Planner state ----
  const [showAIPlanner, setShowAIPlanner] = useState(false);

  const useCases = useMemo(() => {
    const source =
      Array.isArray(project?.useCases) && project.useCases.length > 0
        ? project.useCases
        : [
            {
              nameAndDeadline: "Use Case 1",
              description: project?.description || "",
            },
          ];
    return source.map((uc, index) => ({
      ...uc,
      index,
      title: getUseCaseTitle(uc, index),
      originalDays: getUseCaseDays(uc),
    }));
  }, [project]);

  const useCaseTotals = useMemo(() => {
    return useCases.map((uc) => {
      const scopedTasks = tasks.filter(
        (task) => Number(task.useCaseIndex || 0) === uc.index,
      );
      const proposedDays = scopedTasks.reduce(
        (sum, task) => sum + (Number(task.completionDays) || 0),
        0,
      );
      const amount = scopedTasks.reduce(
        (sum, task) => sum + (Number(task.price) || 0),
        0,
      );
      return {
        ...uc,
        taskCount: scopedTasks.length,
        proposedDays,
        amount,
        variance: (uc.originalDays || 0) - proposedDays,
        isOverrun: uc.originalDays > 0 && proposedDays > uc.originalDays,
      };
    });
  }, [tasks, useCases]);

  const totalBidAmount = useMemo(
    () => Number(form.bidAmount) || 0,
    [form.bidAmount],
  );

  const totalDurationDays = useMemo(
    () => useCaseTotals.reduce((sum, uc) => sum + uc.proposedDays, 0),
    [useCaseTotals],
  );

  const hasTimeOverrun = useMemo(
    () => useCaseTotals.some((uc) => uc.isOverrun),
    [useCaseTotals],
  );

  // ---- AI Planner handlers ----
  const handleActivateAI = () => {
    setShowAIPlanner(true);
  };

  const handleCloseAI = () => {
    setShowAIPlanner(false);
  };

  const handleApplyAITasks = (aiPlan) => {
    // aiPlan = { useCases: [{ useCaseId, tasks: [{ taskId, taskTitle, miniTasks: [...] }] }] }
    if (!aiPlan?.useCases) return { updatedCount: 0 };

    // ponytail: pre-compute count — setTasks runs async
    let updatedCount = 0;
    for (const ucBlock of aiPlan.useCases) {
      updatedCount += (ucBlock.tasks || []).filter(t => t.miniTasks?.length).length;
    }

    setTasks(prev => {
      // Build AI-generated proposed task cards (yellow, editable)
      const aiTasks = [];
      for (const ucBlock of aiPlan.useCases) {
        for (const taskBlock of ucBlock.tasks || []) {
          if (!taskBlock.miniTasks?.length) continue;

          const generatedMiniTasks = taskBlock.miniTasks.map(mt => ({
            id: `mt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            taskId: taskBlock.taskId || `task-ai-${ucBlock.useCaseId}`,
            title: mt.title,
            description: mt.description || "",
            status: "pending",
            isCompleted: false,
          }));

          aiTasks.push({
            id: taskBlock.taskId || `task-ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            useCaseId: ucBlock.useCaseId,
            useCaseTitle: project?.useCases?.find(u => String(u.id) === String(ucBlock.useCaseId))?.title || "",
            title: taskBlock.taskTitle || "",
            description: taskBlock.taskDescription || "",
            source: "expert",
            approvalStatus: "pending_client_approval",
            locked: false,
            price: 0,
            completionDays: taskBlock.days || 1,
            miniTasks: generatedMiniTasks,
          });
        }
      }

      // Remove empty placeholder forms — keep only tasks with real content
      const isEmpty = (task) =>
        !(task.title || "").trim() &&
        !(task.description || "").trim() &&
        (!task.miniTasks || task.miniTasks.every(mt => !(mt.title || "").trim()));

      const kept = prev.filter(t => !isEmpty(t));

      return dedupeTasks([...kept, ...aiTasks]);
    });

    return { updatedCount };
  };

  // ---- Submit ----
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    setSubmitError("");

    const hasBudgetOverrun = project?.budget !== undefined && totalBidAmount > project.budget;
    if ((hasTimeOverrun || hasBudgetOverrun) && !extensionConfirmed) {
      setSubmitError(
        "Sự lệch ngân sách/timeline vượt quá chỉ tiêu của khách hàng. Vui lòng tích chọn xác nhận ở dưới cùng trước khi nộp.",
      );
      return;
    }

    setSubmitting(true);

    try {
      // Compute totals from form + tasks
      const totalBid = Number(form.bidAmount) || 0;
      const totalDays = tasks.reduce((sum, t) => sum + (Number(t.completionDays) || 0), 0);
      const clientBudget = project?.originalBudget || project?.budget || 0;
      const clientDuration = project?.originalTotalDurationDays || project?.deadline || 0;
      const exceedsTargets = (clientBudget - totalBid < 0) || (clientDuration - totalDays < 0);

      // Check acknowledgement if exceeding targets
      if (exceedsTargets && !form.acknowledged) {
        alert("Please check the acknowledgement checkbox to confirm you understand your proposal exceeds the Client's targets.");
        setSubmitting(false);
        return;
      }

      const coverLetterObj = {
        professionalIntro: form.professionalIntro.trim(),
        timelineMilestones: tasks.map(t => `${t.title}: ${(t.miniTasks || []).map(m => `- ${m.title}`).join(', ')}`).join('\n\n'),
        tasks: tasks.map(t => ({
          id: t.id,
          useCaseId: t.useCaseId || null,
          useCaseTitle: t.useCaseTitle || null,
          title: t.title,
          description: t.description || "",
          source: t.source || "expert",
          approvalStatus: t.approvalStatus || "accepted",
          locked: t.locked !== false,
          price: Number(t.price) || 0,
          completionDays: Number(t.completionDays) || 1,
          miniTasks: (t.miniTasks || []).map(m => ({
            id: m.id,
            taskId: t.id,
            title: m.title,
            description: m.description || "",
            status: m.status || "pending",
            isCompleted: m.isCompleted || false,
          })),
        })),
        proposedTasks: tasks
          .filter(t => t.source === "expert" && t.approvalStatus === "pending_client_approval")
          .map(t => ({
            id: t.id,
            title: t.title,
            description: t.description || "",
            source: "expert",
            approvalStatus: "pending_client_approval",
            miniTasks: (t.miniTasks || []).map(m => ({
              id: m.id,
              taskId: t.id,
              title: m.title,
              description: m.description || "",
            })),
          })),
        miniTasks: tasks.flatMap(t => (t.miniTasks || []).map(m => ({
          id: m.id,
          taskId: t.id,
          title: m.title,
          description: m.description || "",
          status: m.status || "pending",
          isCompleted: false,
        }))),
        durationDays: totalDays,
        totalBidAmount: totalBid,
        totalEstimatedDays: totalDays,
        useCaseBreakdown: (project?.useCases || []).map(uc => ({
          useCaseId: uc.id,
          useCaseTitle: uc.title || uc.nameAndDeadline,
          originalDuration: uc.originalDurationDays,
          tasks: tasks
            .filter(t => t.useCaseId === uc.id)
            .map(t => ({
              id: t.id,
              title: t.title,
              description: t.description || "",
              source: t.source || "expert",
              approvalStatus: t.approvalStatus || "accepted",
              locked: t.locked !== false,
              price: Number(t.price) || 0,
              completionDays: Number(t.completionDays) || 1,
              miniTasks: (t.miniTasks || []).map(m => ({
                id: m.id,
                taskId: t.id,
                title: m.title,
                description: m.description || "",
              })),
            })),
        })),
        budgetDeviation: clientBudget - totalBid,
        timeDeviation: clientDuration - totalDays,
        acknowledged: form.acknowledged,
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
          bidAmount: totalBid,
          estimatedDays: totalDays,
          coverLetter: JSON.stringify(coverLetterObj),
          isSubmitted: true,
          status: "pending",
        });
        finalPropId = existingProposal.id;
      } else {
        const created = await api.proposals.create({
          jobPostId: projectId,
          expertId: user.id,
          bidAmount: totalBid,
          estimatedDays: totalDays,
          coverLetter: JSON.stringify(coverLetterObj),
          isSubmitted: true,
          status: "pending",
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
        <div className="bg-card rounded-xl border border-border p-12 text-center shadow-sm">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3 mx-auto" />
            <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  // ---- Project not found ----
  if (!project && projectId) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton fallback="/expert/jobs" className="mb-6">Back</BackButton>
        <div className="bg-card rounded-xl border border-border p-12 text-center shadow-sm">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">Project not found</h3>
          <p className="text-sm text-muted-foreground mt-1">This project may have been removed or is no longer available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        title="Build Your Proposal"
        subtitle="Break down the client's use cases into tasks, mini tasks, timeline, and pricing."
        badge={project ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-primary-light text-brand-primary rounded-full text-xs font-medium">
            <FileText className="w-3.5 h-3.5" />
            {project.title}
          </span>
        ) : null}
        illustration={
          <svg width="200" height="140" viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="20" y="10" width="50" height="22" rx="6" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
            <text x="45" y="25" textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.5">Use Case</text>
            <line x1="70" y1="21" x2="95" y2="21" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
            <line x1="95" y1="21" x2="95" y2="50" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
            <line x1="95" y1="50" x2="120" y2="50" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
            <rect x="80" y="40" width="45" height="20" rx="5" stroke="currentColor" strokeWidth="0.5" opacity="0.35" />
            <text x="102" y="53" textAnchor="middle" fontSize="7" fill="currentColor" opacity="0.45">Task A</text>
            <rect x="135" y="35" width="45" height="16" rx="4" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2 2" opacity="0.3" />
            <text x="157" y="46" textAnchor="middle" fontSize="6" fill="currentColor" opacity="0.35">Mini Task</text>
            <rect x="135" y="55" width="45" height="16" rx="4" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2 2" opacity="0.3" />
            <text x="157" y="66" textAnchor="middle" fontSize="6" fill="currentColor" opacity="0.35">Mini Task</text>
            <line x1="95" y1="60" x2="95" y2="85" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
            <line x1="95" y1="85" x2="120" y2="85" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
            <rect x="80" y="75" width="45" height="20" rx="5" stroke="currentColor" strokeWidth="0.5" opacity="0.35" />
            <text x="102" y="88" textAnchor="middle" fontSize="7" fill="currentColor" opacity="0.45">Task B</text>
            <circle cx="45" cy="70" r="3" fill="currentColor" opacity="0.2" />
            <circle cx="157" cy="90" r="2" fill="currentColor" opacity="0.15" />
          </svg>
        }
      />

      <div className={`grid grid-cols-1 ${showAIPlanner ? "lg:grid-cols-10 gap-6 items-stretch" : "max-w-4xl mx-auto"}`}>
        <div className={showAIPlanner ? "lg:col-span-7 flex flex-col" : "w-full"}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatedReveal>
              <SectionCard title="Professional Introduction" icon={Lightbulb} padding="lg">
                <textarea
                  value={form.professionalIntro}
                  onChange={(e) => updateField("professionalIntro", e.target.value)}
                  rows={5}
                  placeholder="Introduce yourself — your experience, background, relevant skills, and why you are the best fit for this project."
                  className="w-full px-4 py-2.5 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary text-sm resize-y"
                  required
                />
              </SectionCard>
            </AnimatedReveal>

            <AnimatedReveal delay={1}>
              <AIPlannerCard
                onGenerateAI={handleActivateAI}
                onCloseAI={handleCloseAI}
                aiMode={showAIPlanner}
                disabled={submitting}
              />
            </AnimatedReveal>

            <AnimatedReveal delay={2}>
              <SectionCard
                title="Use Case & Task Breakdown"
                icon={GitBranch}
                subtitle="Client Use Cases and Tasks are read-only. Add pricing, duration, and MiniTasks. Proposed Tasks require Client approval."
                padding="lg"
              >
                {Array.isArray(project?.useCases) && project.useCases.length > 0 ? (
                  <div className="space-y-6">
                    {project.useCases.map((uc) => {
                      const ucTasks = tasks.filter(t => t.useCaseId && t.useCaseId === uc.id);
                      return (
                        <div key={uc.id} className="border border-border rounded-xl overflow-hidden">
                          {/* ── Use Case Header (read-only) ── */}
                          <div className="p-4 bg-accent-light/30 border-b border-border">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <Lock className="w-3.5 h-3.5 text-blue-500" />
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold dark:bg-blue-900/40 dark:text-blue-300">
                                  Client Use Case
                                </span>
                                <h4 className="font-semibold text-foreground text-sm">
                                  {uc.title || uc.nameAndDeadline}
                                </h4>
                              </div>
                              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                                {uc.originalDurationDays || 1} days
                              </span>
                            </div>
                            {uc.description && (
                              <p className="text-xs text-muted-foreground mt-2">{uc.description}</p>
                            )}
                          </div>

                          {/* ── Tasks ── */}
                          <div className="p-4 space-y-4">
                            {ucTasks.length === 0 && (
                              <p className="text-xs text-muted-foreground text-center py-3">
                                No tasks yet. Add a proposed task below.
                              </p>
                            )}

                            {ucTasks.map((task) => {
                              const tIdx = tasks.findIndex(t => t.id === task.id);
                              const isClientTask = task.source === "client";
                              const isProposed = task.source === "expert" && task.approvalStatus === "pending_client_approval";

                              return (
                                <div
                                  key={task.id}
                                  className={`p-4 border rounded-xl space-y-3 ${
                                    isProposed
                                      ? "bg-amber-50/40 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
                                      : isClientTask
                                        ? "bg-blue-50/20 border-blue-100 dark:bg-blue-950/10 dark:border-blue-900 pointer-events-none opacity-90"
                                        : "bg-secondary/40 border-border"
                                  }`}
                                >
                                  {/* ── Badges ── */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {isClientTask && (
                                      <>
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold dark:bg-blue-900/40 dark:text-blue-300">
                                          Client-defined Task
                                        </span>
                                        <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-[10px] font-medium">
                                          Read-only
                                        </span>
                                      </>
                                    )}
                                    {isProposed && (
                                      <>
                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold dark:bg-amber-900/40 dark:text-amber-300">
                                          Proposed by Expert
                                        </span>
                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold dark:bg-amber-900/40 dark:text-amber-300">
                                          Pending Client Approval
                                        </span>
                                      </>
                                    )}
                                  </div>

                                  {/* ── Task Title ── */}
                                  <div>
                                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                                      Task Title
                                    </label>
                                    {isClientTask ? (
                                      <div className="px-3 py-2 border border-blue-100 rounded-lg text-sm font-semibold text-foreground bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-900">
                                        {task.title}
                                      </div>
                                    ) : (
                                      <input
                                        type="text"
                                        value={task.title}
                                        onChange={(e) => { const nt = [...tasks]; nt[tIdx].title = e.target.value; setTasks(nt); }}
                                        placeholder="Task name (e.g., Database Design)"
                                        className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:ring-1 focus:ring-brand-primary/50 focus:outline-none bg-card font-semibold text-foreground"
                                        required
                                      />
                                    )}
                                  </div>

                                  {/* ── Task Description ── */}
                                  {isClientTask && task.description ? (
                                    <div>
                                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                                        Description
                                      </label>
                                      <p className="px-3 py-2 border border-blue-100 rounded-lg text-xs text-muted-foreground bg-blue-50/30 dark:bg-blue-950/20 dark:border-blue-900">
                                        {task.description}
                                      </p>
                                    </div>
                                  ) : isProposed ? (
                                    <div>
                                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                                        Description
                                      </label>
                                      <textarea
                                        value={task.description || ""}
                                        onChange={(e) => { const nt = [...tasks]; nt[tIdx].description = e.target.value; setTasks(nt); }}
                                        rows={2}
                                        placeholder="Describe this proposed task..."
                                        className="w-full px-3 py-2 border border-input rounded-lg text-xs focus:ring-1 focus:ring-brand-primary/50 focus:outline-none bg-card resize-y"
                                      />
                                    </div>
                                  ) : null}

                                  {/* ── Days & Price ── */}
                                  <div className="flex items-end gap-3 flex-wrap">
                                    <div className="w-24">
                                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                                        Days
                                      </label>
                                      <input
                                        type="number" min="1"
                                        value={task.completionDays || 1}
                                        onChange={(e) => { const nt = [...tasks]; nt[tIdx].completionDays = Math.max(1, Number(e.target.value) || 1); setTasks(nt); }}
                                        placeholder="1"
                                        className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:ring-1 focus:ring-brand-primary/50 focus:outline-none bg-card"
                                      />
                                    </div>
                                    {isProposed && (
                                      <button
                                        type="button"
                                        onClick={() => setTasks(tasks.filter(t => t.id !== task.id))}
                                        className="h-9 px-3 text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center"
                                      >
                                        Remove
                                      </button>
                                    )}
                                  </div>

                                  {/* ── MiniTasks ── */}
                                  <div className="space-y-2 pl-4 border-l-2 border-brand-primary/20">
                                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                                      Mini Tasks
                                    </span>
                                    {task.miniTasks.map((mini, mIdx) => (
                                      <div key={mini.id} className="flex items-center gap-2">
                                        <span className="text-muted-foreground font-mono text-xs">•</span>
                                        <input
                                          type="text"
                                          value={mini.title}
                                          onChange={(e) => { const nt = [...tasks]; nt[tIdx].miniTasks[mIdx].title = e.target.value; setTasks(nt); }}
                                          placeholder={`Mini task #${mIdx + 1}`}
                                          className="flex-1 px-3 py-1.5 border border-input rounded-lg text-xs focus:ring-1 focus:ring-brand-primary/50 focus:outline-none bg-card text-foreground/80"
                                          required
                                        />
                                        {task.miniTasks.length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() => { const nt = [...tasks]; nt[tIdx].miniTasks = task.miniTasks.filter(m => m.id !== mini.id); setTasks(nt); }}
                                            className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center justify-center flex-shrink-0"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => { const nt = [...tasks]; nt[tIdx].miniTasks.push({ id: `mt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, title: "" }); setTasks(nt); }}
                                      className="h-8 px-3 text-xs font-semibold text-brand-primary hover:text-brand-primary-hover hover:bg-brand-primary-light rounded-lg transition-colors inline-flex items-center gap-1 mt-1"
                                    >
                                      + Add Mini Task
                                    </button>
                                  </div>
                                </div>
                              );
                            })}

                            {/* ── Add Proposed Task (per use case) ── */}
                            <button
                              type="button"
                              onClick={() =>
                                setTasks([
                                  ...tasks,
                                  {
                                    id: `task-proposed-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                                    title: "",
                                    description: "",
                                    useCaseId: uc.id,
                                    useCaseTitle: uc.title || uc.nameAndDeadline,
                                    source: "expert",
                                    approvalStatus: "pending_client_approval",
                                    locked: false,
                                    price: 0,
                                    completionDays: 1,
                                    miniTasks: [{ id: `mt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, title: "" }],
                                  },
                                ])
                              }
                              className="h-10 px-5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-sm font-semibold transition-colors inline-flex items-center gap-1.5 w-full justify-center dark:bg-amber-950/30 dark:hover:bg-amber-950/50 dark:border-amber-800 dark:text-amber-300"
                            >
                              + Add Proposed Task
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* ── No use cases fallback ── */
                  <div className="space-y-4">
                    <div className="py-6 text-center">
                      <FileText className="w-8 h-8 text-muted-foreground/25 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No use cases defined by the client yet.</p>
                    </div>
                    {tasks.map((task, tIdx) => {
                      const isProposed = task.source === "expert" && task.approvalStatus === "pending_client_approval";
                      return (
                        <div key={task.id} className={`p-4 border rounded-xl space-y-3 ${isProposed ? "bg-amber-50/40 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800" : "bg-secondary/40 border-border"}`}>
                          {/* ── Badges ── */}
                          {isProposed && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold dark:bg-amber-900/40 dark:text-amber-300">Proposed by Expert</span>
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold dark:bg-amber-900/40 dark:text-amber-300">Pending Client Approval</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-muted-foreground uppercase">Task #{tIdx + 1}</span>
                            <input
                              type="text"
                              value={task.title}
                              onChange={(e) => { const nt = [...tasks]; nt[tIdx].title = e.target.value; setTasks(nt); }}
                              placeholder="Task name (e.g., Database Design)"
                              className="flex-1 min-w-[140px] px-3 py-2 border border-input rounded-lg text-sm focus:ring-1 focus:ring-brand-primary/50 focus:outline-none bg-card font-semibold text-foreground"
                              required
                            />
                            <input type="number" min="1" value={task.completionDays || 1} onChange={(e) => { const nt = [...tasks]; nt[tIdx].completionDays = Math.max(1, Number(e.target.value) || 1); setTasks(nt); }} placeholder="Days" className="w-20 px-2 py-2 border border-input rounded-lg text-xs focus:ring-1 focus:ring-brand-primary/50 focus:outline-none bg-card" />
                            {tasks.length > 1 && (
                              <button type="button" onClick={() => setTasks(tasks.filter(t => t.id !== task.id))} className="h-8 px-3 text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center">
                                Remove
                              </button>
                            )}
                          </div>

                          <div className="space-y-2 pl-4 border-l-2 border-brand-primary/20">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Mini Tasks</span>
                            {task.miniTasks.map((mini, mIdx) => (
                              <div key={mini.id} className="flex items-center gap-2">
                                <span className="text-muted-foreground font-mono text-xs">•</span>
                                <input type="text" value={mini.title} onChange={(e) => { const nt = [...tasks]; nt[tIdx].miniTasks[mIdx].title = e.target.value; setTasks(nt); }} placeholder={`Mini task #${mIdx + 1}`} className="flex-1 px-3 py-1.5 border border-input rounded-lg text-xs focus:ring-1 focus:ring-brand-primary/50 focus:outline-none bg-card text-foreground/80" required />
                                {task.miniTasks.length > 1 && (
                                  <button type="button" onClick={() => { const nt = [...tasks]; nt[tIdx].miniTasks = task.miniTasks.filter(m => m.id !== mini.id); setTasks(nt); }} className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center justify-center flex-shrink-0">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                            <button type="button" onClick={() => { const nt = [...tasks]; nt[tIdx].miniTasks.push({ id: `mt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, title: "" }); setTasks(nt); }} className="h-8 px-3 text-xs font-semibold text-brand-primary hover:text-brand-primary-hover hover:bg-brand-primary-light rounded-lg transition-colors inline-flex items-center gap-1 mt-1">
                              + Add Mini Task
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setTasks([...tasks, {
                        id: `task-proposed-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                        title: "",
                        description: "",
                        useCaseId: null,
                        source: "expert",
                        approvalStatus: "pending_client_approval",
                        locked: false,
                        price: 0,
                        completionDays: 1,
                        miniTasks: [{ id: `mt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, title: "" }],
                      }])}
                      className="h-10 px-5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-sm font-semibold transition-colors inline-flex items-center gap-1.5"
                    >
                      + Add Proposed Task
                    </button>
                  </div>
                )}
              </SectionCard>
            </AnimatedReveal>

            <AnimatedReveal delay={3}>
              <FileUploadDropzone
                files={attachments}
                onFilesChange={setAttachments}
                label="Portfolio & Attachments"
                helperText="Attach your CV, portfolio, demo files, PDFs, or supporting documents."
              />
            </AnimatedReveal>

            {existingAttachments.length > 0 && (
              <SectionCard title={`Previously Attached (${existingAttachments.length})`} padding="sm">
                <div className="space-y-2">
                  {existingAttachments.map((att) => (
                    <div key={att.id} className="flex items-center gap-3 bg-secondary/60 border border-border rounded-lg px-4 py-2.5">
                      {att.type === "image/png" ? <Image className="w-5 h-5 text-brand-primary" /> : <File className="w-5 h-5 text-muted-foreground" />}
                      <div>
                        <p className="text-sm font-medium text-foreground/80">{att.name}</p>
                        <p className="text-xs text-muted-foreground">{att.size}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            <AnimatedReveal delay={3}>
              <SectionCard title="Total Estimated Bid" icon={BarChart3} padding="lg">
                <div className="relative max-w-xs">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={form.bidAmount || ""}
                    onChange={(e) => updateField("bidAmount", e.target.value === "" ? 0 : Number(e.target.value))}
                    placeholder="Enter total bid amount"
                    className="w-full pl-8 pr-4 py-2.5 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary text-sm font-semibold bg-card text-foreground"
                  />
                </div>
                {project?.budget !== undefined && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Client budget: <span className="font-semibold text-foreground">${Number(project.budget).toLocaleString()}</span>
                  </p>
                )}
              </SectionCard>
            </AnimatedReveal>

            <AnimatedReveal delay={4}>
              <SectionCard title="Timeline Summary" icon={Calendar} padding="lg">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Total Estimated Duration</label>
                  <div className="text-xs text-muted-foreground mb-1">
                    Auto-computed from tasks: {totalDurationDays} days
                  </div>
                  <div className="relative max-w-xs">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <div className="w-full pl-10 pr-4 py-2.5 border border-input rounded-xl bg-secondary/50 text-sm font-semibold text-foreground">
                      {totalDurationDays} days
                    </div>
                  </div>
                </div>

                {/* Timeline and Budget Comparison Warnings */}
                <div className="space-y-3 mt-6">
                  {/* Timeline banner */}
                  {project?.deadline !== undefined && (
                    totalDurationDays > project.deadline ? (
                      <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl text-sm flex items-center justify-between">
                        <div>
                          <span className="text-warning font-semibold">Cảnh báo: Timeline vượt quá yêu cầu của Client.</span>
                          <span className="block text-xs text-muted-foreground mt-0.5">
                            Yêu cầu của Client: {project.deadline} ngày | Đề xuất của bạn: {totalDurationDays} ngày (+{totalDurationDays - project.deadline} ngày)
                          </span>
                        </div>
                        <span className="px-2 py-1 bg-warning/20 text-warning text-xs font-semibold rounded-md">Vượt hạn chót</span>
                      </div>
                    ) : (
                      <div className="p-4 bg-success/10 border border-success/20 rounded-xl text-sm flex items-center justify-between">
                        <div>
                          <span className="text-success font-semibold">Đúng hạn.</span>
                          <span className="block text-xs text-muted-foreground mt-0.5">
                            Yêu cầu của Client: {project.deadline} ngày | Đề xuất của bạn: {totalDurationDays} ngày
                          </span>
                        </div>
                        <span className="px-2 py-1 bg-success/20 text-success text-xs font-semibold rounded-md">Đúng hạn</span>
                      </div>
                    )
                  )}

                  {/* Budget banner */}
                  {project?.budget !== undefined && (
                    totalBidAmount > project.budget ? (
                      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-sm flex items-center justify-between">
                        <div>
                          <span className="font-bold flex items-center gap-1.5 text-destructive">
                            <AlertTriangle className="w-4 h-4" />
                            Cảnh báo: Đề xuất vượt quá ngân sách gốc của Client!
                          </span>
                          <span className="block text-xs text-muted-foreground mt-1 font-semibold">
                            Ngân sách của Client: ${project.budget} | Đề xuất của bạn: ${totalBidAmount}
                          </span>
                          <span className="block text-xs text-destructive/70 mt-0.5">
                            Sự lệch ngân sách (Budget Deviation): -${(totalBidAmount - project.budget).toFixed(2)}
                          </span>
                        </div>
                        <span className="px-2 py-1 bg-destructive/20 text-destructive text-xs font-semibold rounded-md flex-shrink-0">Vượt ngân sách</span>
                      </div>
                    ) : (
                      <div className="p-4 bg-success/10 border border-success/20 rounded-xl text-sm flex items-center justify-between">
                        <div>
                          <span className="text-success font-semibold">Trong ngân sách.</span>
                          <span className="block text-xs text-muted-foreground mt-0.5">
                            Ngân sách của Client: ${project.budget} | Đề xuất của bạn: ${totalBidAmount}
                          </span>
                        </div>
                        <span className="px-2 py-1 bg-success/20 text-success text-xs font-semibold rounded-md">Trong ngân sách</span>
                      </div>
                    )
                  )}
                </div>

                {(hasTimeOverrun || (project?.budget !== undefined && totalBidAmount > project.budget)) && (
                  <div className="flex items-start gap-2.5 p-4 bg-warning/5 border border-warning/20 rounded-xl mt-4">
                    <input
                      type="checkbox"
                      id="extensionConfirmed"
                      checked={extensionConfirmed}
                      onChange={(e) => setExtensionConfirmed(e.target.checked)}
                      className="mt-1 rounded border-border text-brand-primary focus:ring-brand-primary h-4 w-4 cursor-pointer"
                    />
                    <label htmlFor="extensionConfirmed" className="text-xs text-foreground/80 font-semibold cursor-pointer">
                      Tôi xác nhận và đồng ý gửi đề xuất với mức chi phí/timeline vượt quá chỉ tiêu của khách hàng.
                    </label>
                  </div>
                )}

                {submitError && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-sm font-semibold text-destructive mt-4">
                    {submitError}
                  </div>
                )}
              </SectionCard>
            </AnimatedReveal>

            {/* Deviation Warnings */}
            {(() => {
              const totalBid = Number(form.bidAmount) || 0;
              const totalDays = tasks.reduce((sum, t) => sum + (Number(t.completionDays) || 0), 0);
              const clientBudget = project?.originalBudget || project?.budget || 0;
              const clientDuration = project?.originalTotalDurationDays || project?.deadline || 0;
              const budgetDeviation = clientBudget - totalBid;
              const timeDeviation = clientDuration - totalDays;
              const exceedsBudget = budgetDeviation < 0;
              const exceedsTime = timeDeviation < 0;

              if (exceedsBudget || exceedsTime) {
                return (
                  <div className="p-5 bg-destructive/5 border-2 border-destructive/20 rounded-xl space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                      <p className="text-sm font-bold text-destructive">
                        Proposal exceeds Client's original targets
                      </p>
                    </div>
                    {exceedsBudget && (
                      <p className="text-sm text-destructive/80 pl-7">
                        Budget exceeded by <span className="font-bold">{Math.abs(budgetDeviation).toLocaleString()}</span>
                        (Client budget: {clientBudget.toLocaleString()}, Your bid: {totalBid.toLocaleString()})
                      </p>
                    )}
                    {exceedsTime && (
                      <p className="text-sm text-destructive/80 pl-7">
                        Timeline exceeded by <span className="font-bold">{Math.abs(timeDeviation)} days</span>
                        (Client timeline: {clientDuration} days, Your estimate: {totalDays} days)
                      </p>
                    )}
                  </div>
                );
              }
              return null;
            })()}

            {/* Submit */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-4">
              {(() => {
                const totalBid = Number(form.bidAmount) || 0;
                const totalDays = tasks.reduce((sum, t) => sum + (Number(t.completionDays) || 0), 0);
                const clientBudget = project?.originalBudget || project?.budget || 0;
                const clientDuration = project?.originalTotalDurationDays || project?.deadline || 0;
                const exceedsTargets = (clientBudget - totalBid < 0) || (clientDuration - totalDays < 0);

                if (exceedsTargets) {
                  return (
                    <label className="flex items-start gap-3 cursor-pointer p-3 bg-warning/5 border border-warning/20 rounded-xl">
                      <input
                        type="checkbox"
                        checked={!!form.acknowledged}
                        onChange={(e) => updateField("acknowledged", e.target.checked)}
                        className="mt-0.5"
                      />
                      <span className="text-sm text-destructive/90 font-medium">
                        I understand that my proposal exceeds the Client's original budget/timeline. This may reduce my chances of being selected.
                      </span>
                    </label>
                  );
                }
                return null;
              })()}
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 bg-brand-primary text-brand-primary-foreground rounded-xl hover:bg-brand-primary-hover font-semibold text-base inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
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
          </form>
        </div>

        {/* ── AI Project Planner Panel (right side) ── */}
        {showAIPlanner && (
          <aside className="lg:col-span-3">
            <div className="lg:sticky lg:top-16 lg:h-[calc(100vh-9rem)] lg:max-h-none bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <AIPlannerPanel
                onClose={handleCloseAI}
                projectInfo={{
                  title: project?.title || "",
                  category: project?.category || "",
                }}
                onApplyTasks={handleApplyAITasks}
                existingTasks={tasks}
                clientUseCases={project?.useCases || []}
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
