import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Send,
  FileText,
  Image,
  File as FileIcon,
  X,
  BarChart3,
  Calendar,
  GitBranch,
  Lightbulb,
  AlertTriangle,
  Sparkles,
  RotateCcw,
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
import {
  notifyNewProposal,
  notifyUpdatedProposal,
} from "../../../services/notificationHelper.js";
import { buildClientProfileFromUser } from "../../lib/clientProfileStorage.js";
import { toast } from "sonner";

/**
 * SendProposal - Expert submits a comprehensive proposal to a client project.
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

  // Auto-restore draft from sessionStorage on mount
  useEffect(() => {
    if (!projectId) return;
    try {
      const savedDraft = sessionStorage.getItem(`send_proposal_draft_${projectId}`);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.form) setForm(parsed.form);
      }
    } catch (e) {
      console.error("Failed to restore proposal draft:", e);
    }
  }, [projectId]);

  // Auto-save draft to sessionStorage on change
  useEffect(() => {
    if (!projectId) return;
    try {
      if (form.professionalIntro || form.bidAmount > 0) {
        sessionStorage.setItem(
          `send_proposal_draft_${projectId}`,
          JSON.stringify({ form })
        );
      }
    } catch (e) {
      console.error("Failed to save proposal draft:", e);
    }
  }, [projectId, form]);

  const handleClearDraft = () => {
    if (projectId) {
      sessionStorage.removeItem(`send_proposal_draft_${projectId}`);
    }
    setForm({
      professionalIntro: "",
      timelineMilestones: "",
      bidAmount: 0,
      durationDays: 14,
      acknowledged: false,
    });
    toast.info("Proposal form cleared.");
  };

  const [autoPrompt, setAutoPrompt] = useState(null);
  const [generatingUseCases, setGeneratingUseCases] = useState({});
  const [minitaskCounts, setMinitaskCounts] = useState({});

  const handleGenerateMiniTaskForUseCase = async (uc) => {
    const ucId = uc.id;
    const requestedCount = minitaskCounts[ucId];
    const countInstruction = requestedCount
      ? `CRITICAL RULE: You MUST return EXACTLY ${requestedCount} minitask(s). Do NOT generate more or less than ${requestedCount}. Your JSON payload array MUST contain exactly ${requestedCount} item(s).`
      : "Generate a detailed list of minitasks.";

    setGeneratingUseCases((prev) => ({ ...prev, [ucId]: "loading" }));
    setAutoPrompt({
      title: uc.title || uc.nameAndDeadline || "User Story",
      description: uc.description || "",
    });
    const promptText = `Please generate detailed tasks and mini-tasks breakdown for this specific User Story:
User Story: ${uc.title || uc.nameAndDeadline || ""}
Description: ${uc.description || ""}

[System Instruction: Do not ask for deadline, duration, or budget. ${countInstruction} Decompose it immediately into tasks and mini-tasks (intent: 'success', is_complete: true). Automatically assume reasonable implementation days (1-15 days per story) and generate the full list of tasks/minitasks immediately. Do not respond with intent 'collecting_info'.]`;

    try {
      const response = await api.ai.analyzeMinitasks({
        messages_history: [{ role: "user", content: promptText }],
        context_summary: "",
        file_path: "",
        current_draft: {
          jobPostId: projectId,
          expertId: user?.id,
          projectTitle: project?.title || "",
        },
      });

      const payload = response?.payload || response?.Payload;
      if (payload && Array.isArray(payload) && payload.length > 0) {
        const mappedTasks = payload.map((task) => ({
          useCaseId: uc.id,
          useCaseTitle: uc.title || uc.nameAndDeadline || "Use Case",
          tasks: [
            {
              taskId: uc.id,
              taskTitle: uc.title || uc.nameAndDeadline || "Task",
              miniTasks: (task.MiniTasks || task.miniTasks || []).map((mt) => ({
                title: mt.Title || mt.title || "",
                description: "",
              })),
            },
          ],
        }));

        if (mappedTasks.length > 0) {
          handleApplyAITasks({ useCases: mappedTasks });
        }
      }
    } catch (err) {
      console.error("AI generate failed:", err);
      setGeneratingUseCases((prev) => ({ ...prev, [ucId]: "error" }));
      setTimeout(
        () => setGeneratingUseCases((prev) => ({ ...prev, [ucId]: undefined })),
        3000,
      );
      return;
    }
    setGeneratingUseCases((prev) => ({ ...prev, [ucId]: "done" }));
    setTimeout(
      () => setGeneratingUseCases((prev) => ({ ...prev, [ucId]: undefined })),
      3000,
    );
  };

  // ---- Use case aware task initialization ----
  // ponytail: flatMap ensures each use case only emits its own tasks - no cross-contamination
  const [generatingIntro, setGeneratingIntro] = useState(false);
  const handleGenerateIntro = async (e) => {
    if (e) e.preventDefault();
    try {
      setGeneratingIntro(true);

      let expertProfileStr = "";
      if (user?.id) {
        try {
          const userDetail = await api.users.getById(user.id);
          let parsedStatus = {};
          try {
            parsedStatus = userDetail.status
              ? JSON.parse(userDetail.status)
              : {};
            if (!parsedStatus || typeof parsedStatus !== "object") {
              parsedStatus = { bio: userDetail.status || "" };
            }
          } catch (e) {
            parsedStatus = { bio: userDetail.status || "" };
          }
          const bio = parsedStatus.bio || "";
          const skills = Array.isArray(parsedStatus.skills)
            ? parsedStatus.skills.join(", ")
            : "";
          const portfolio = parsedStatus.portfolioUrl || "";

          expertProfileStr = `My Expert Profile Context:
- Name: ${userDetail.fullName || userDetail.name || user.name || ""}
- Bio: ${bio}
- Skills: ${skills}
- Portfolio: ${portfolio}
Please use this background information to write a personalized and highly relevant introduction (cover letter).`;
        } catch (e) {
          console.error("Failed to fetch expert profile for intro", e);
        }
      }

      const payload = {
        expert_id: user?.id || "",
        target_job_post_id: projectId || "",
        target_project_title: project?.title || "",
        target_project_description: project?.description || "",
        tone: "Professional and persuasive",
        purpose: "Proposal Introduction",
        custom_highlights:
          expertProfileStr || "Focus on my skills and experience",
        language: "vi",
      };

      const response = await api.ai.generateExpertIntroduction(payload);

      let introText = "";
      if (response?.generated_introduction) {
        let rawIntro = response.generated_introduction;
        try {
          // Backend returns a stringified JSON payload in generated_introduction.
          let parsed = JSON.parse(rawIntro);
          introText = parsed.generated_introduction || rawIntro;
        } catch (e) {
          introText = rawIntro;
        }
      } else {
        introText =
          response?.chat_message ||
          response?.AiResponse ||
          response?.aiResponse ||
          response?.content ||
          response?.intro ||
          response?.text ||
          (typeof response === "string" ? response : "");
      }

      if (introText) {
        updateField("professionalIntro", introText);
      } else {
        console.info("AI generation raw data:", response);
        toast.info(
          "AI generation returned raw data. Check console for details.",
        );
      }
    } catch (err) {
      console.error("Generate Intro failed:", err);
      toast.error(
        "Failed to generate intro. Please check your connection or try again later.",
      );
    } finally {
      setGeneratingIntro(false);
    }
  };
  const buildTasksFromUseCases = (job) => {
    const ucs = job?.useCases || [];
    if (ucs.length === 0) {
      return [
        {
          id: `task-${Date.now()}-0`,
          title: "",
          useCaseId: null,
          source: "expert",
          approvalStatus: "accepted",
          locked: false,
          price: 0,
          completionDays: 1,
          miniTasks: [{ id: `mt-${Date.now()}-0`, title: "" }],
        },
      ];
    }

    const now = Date.now();
    const tasks = ucs.flatMap((uc) => {
      const ucTasks = uc.tasks || [];
      if (ucTasks.length > 0) {
        return ucTasks.map((t, idx) => ({
          id: t.id || `task-${uc.id}-${idx + 1}`,
          useCaseId: t.useCaseId || uc.id,
          useCaseTitle: uc.title || uc.nameAndDeadline,
          title: t.title || uc.title || `Task ${idx + 1}`,
          description: t.description || "",
          source: "client",
          approvalStatus: "accepted",
          locked: true,
          price: Number(t.price) || 0,
          completionDays: Number(t.completionDays || t.durationDays) || 1,
          miniTasks:
            (t.miniTasks || []).length > 0
              ? t.miniTasks.map((m) => ({ ...m, taskId: t.id }))
              : [{ id: `mt-${now}-${uc.id}-${idx}-0`, title: "" }],
        }));
      }
      return [
        {
          id: `task-fb-${uc.id}`,
          useCaseId: uc.id,
          useCaseTitle: uc.title || uc.nameAndDeadline,
          title: uc.title || uc.nameAndDeadline || "Use Case Task",
          description: uc.description || "",
          source: "client_use_case_fallback",
          approvalStatus: "accepted",
          locked: true,
          price: 0,
          completionDays: Number(uc.originalDurationDays) || 1,
          miniTasks: [{ id: `mt-${now}-fb-${uc.id}`, title: "" }],
        },
      ];
    });

    return dedupeTasks(tasks);
  };

  // ponytail: belt and suspenders - strip any identical-ID tasks before they hit state
  const dedupeTasks = (arr) => {
    const seen = new Set();
    return arr.filter((t) => {
      const key = `${t.useCaseId || "root"}:${t.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const [tasks, setTasks] = useState([
    {
      id: "task-1",
      title: "",
      useCaseId: null,
      source: "expert",
      approvalStatus: "accepted",
      locked: false,
      miniTasks: [{ id: "mt-1", title: "" }],
    },
  ]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateTask = (taskId, field, value) => {
    setTasks((prevTasks) =>
      prevTasks.map((t) => (t.id === taskId ? { ...t, [field]: value } : t)),
    );
  };

  const updateMiniTask = (taskId, miniId, field, value) => {
    setTasks((prevTasks) =>
      prevTasks.map((t) => {
        if (t.id !== taskId) return t;
        const updatedMiniTasks = (t.miniTasks || []).map((m) =>
          m.id === miniId ? { ...m, [field]: value } : m,
        );
        return { ...t, miniTasks: updatedMiniTasks };
      }),
    );
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
        // Map backend jobPostTasks to frontend useCases format if needed
        if (
          job &&
          job.jobPostTasks &&
          (!job.useCases || job.useCases.length === 0)
        ) {
          job.useCases = job.jobPostTasks.map((jpt) => ({
            id: jpt.id,
            title: jpt.title,
            description: jpt.description || "",
            originalDurationDays: jpt.duration || 1,
            // We can map jobPostMiniTasks to tasks if we want them to show up as read-only client tasks
            tasks: (jpt.jobPostMiniTasks || []).map((mt) => ({
              id: mt.id,
              title: mt.title,
              description: mt.description || "",
              originalDurationDays: mt.duration || 1,
            })),
          }));
        }

        setProject(job);

        const deadlineDays = Number(job.deadline || job.Deadline) || 14;

        // Initialize tasks from client use cases
        setTasks(buildTasksFromUseCases(job));

        // Find existing proposal for this jobPostId (with robust PascalCase fallbacks)
        const foundProp = proposalsList.find(
          (p) =>
            String(
              p.jobPostId || p.JobPostId || p.jobPost?.id || p.JobPost?.Id,
            ) === String(projectId),
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
              parsedCoverLetter.durationDays ||
              foundProp.estimatedDays ||
              deadlineDays,
          });

          if (
            Array.isArray(parsedCoverLetter.tasks) &&
            parsedCoverLetter.tasks.length > 0
          ) {
            // Merge saved values into fresh use-case-derived tasks to keep useCaseId correct
            const freshTasks = buildTasksFromUseCases(job);
            const freshIds = new Set(freshTasks.map((t) => t.id));
            const merged = freshTasks.map((ft) => {
              const existing = parsedCoverLetter.tasks.find(
                (et) => et.id === ft.id,
              );
              if (!existing) return ft;
              return {
                ...ft,
                price: Number(existing.price) || ft.price || 0,
                completionDays:
                  Number(existing.completionDays) || ft.completionDays || 1,
                miniTasks:
                  existing.miniTasks?.length > 0
                    ? existing.miniTasks
                    : ft.miniTasks,
              };
            });
            // Preserve expert-proposed tasks from the existing proposal not in fresh build
            const expertTasks = parsedCoverLetter.tasks.filter(
              (et) => et.source === "expert" && !freshIds.has(et.id),
            );
            setTasks(dedupeTasks([...merged, ...expertTasks]));
          }

          if (parsedCoverLetter.attachments) {
            setExistingAttachments(parsedCoverLetter.attachments);
          }
        } else {
          setForm((prev) => ({
            ...prev,
            durationDays: deadlineDays,
            bidAmount: Number(job.budget || job.Budget) || 0,
          }));
        }

        if (job.clientId) {
          try {
            const userDetail = await api.users.getById(job.clientId);
            setClient(buildClientProfileFromUser(userDetail));
          } catch (err) {
            console.error("Failed to load client details:", err);
          }
        }
      })
      .catch((err) => {
        // Job not found (404) is handled gracefully by the UI - don't alarm with console.error
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
        grouped: ucs.map((uc) => ({
          ucId: uc.id,
          title: uc.title?.slice(0, 40),
          taskCount: tasks.filter((t) => t.useCaseId === uc.id).length,
        })),
      });
    }

    setTasks((prev) => {
      let changed = false;
      const next = [...prev];

      ucs.forEach((uc) => {
        const hasTask = next.some((t) => t.useCaseId === uc.id);
        if (!hasTask) {
          next.push({
            id: `task-fb-${uc.id}`,
            useCaseId: uc.id,
            useCaseTitle: uc.title || uc.nameAndDeadline,
            title: uc.title || uc.nameAndDeadline || "Client Use Case Task",
            description: uc.description || "",
            source: "client_use_case_fallback",
            approvalStatus: "accepted",
            locked: true,
            price: 0,
            completionDays: Number(uc.originalDurationDays || 1),
            miniTasks: [],
          });
          changed = true;
        }
      });

      return changed ? dedupeTasks(next) : prev;
    });
    // ponytail: intentionally depends on [project?.useCases, tasks.length] -
    // only re-heals when use cases or task count changes, not on every tasks mutation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.useCases, tasks.length]);

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

  const handleApplyAITasks = (aiPlan) => {
    // aiPlan = { useCases: [{ useCaseId, tasks: [{ taskId, taskTitle, miniTasks: [...] }] }] }
    if (!aiPlan?.useCases) return { updatedCount: 0 };

    const normalize = (s) =>
      String(s || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

    // ponytail: pre-compute updatedCount from current tasks snapshot -
    // the setTasks updater runs async in React 18 so closure-updatedCount is always 0 at return
    let updatedCount = 0;
    for (const ucBlock of aiPlan.useCases) {
      for (const taskBlock of ucBlock.tasks || []) {
        if (!taskBlock.miniTasks?.length) continue;
        let idx = tasks.findIndex((t) => t.id === taskBlock.taskId);
        if (idx === -1) {
          idx = tasks.findIndex(
            (t) =>
              t.useCaseId === ucBlock.useCaseId &&
              normalize(t.title) === normalize(taskBlock.taskTitle),
          );
        }
        if (idx !== -1) updatedCount++;
        else {
          const uc = project?.useCases?.find((u) => u.id === ucBlock.useCaseId);
          if (uc) updatedCount++; // fallback task will be created
        }
      }
    }

    setTasks((prev) => {
      let nextTasks = [...prev];

      for (const ucBlock of aiPlan.useCases) {
        for (const taskBlock of ucBlock.tasks || []) {
          if (!taskBlock.miniTasks?.length) continue;

          const generatedMiniTasks = taskBlock.miniTasks.map((mt) => ({
            id: `mt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            taskId: taskBlock.taskId || `task-fb-${ucBlock.useCaseId}`,
            title: mt.title,
            description: mt.description || "",
            status: "pending",
            isCompleted: false,
          }));

          // Try match by taskId first, then by useCaseId + normalized title
          let idx = nextTasks.findIndex((t) => t.id === taskBlock.taskId);
          if (idx === -1) {
            idx = nextTasks.findIndex(
              (t) =>
                t.useCaseId === ucBlock.useCaseId &&
                normalize(t.title) === normalize(taskBlock.taskTitle),
            );
          }

          if (idx !== -1) {
            const hasRealContent = nextTasks[idx].miniTasks.some((mt) =>
              mt.title?.trim(),
            );
            nextTasks[idx] = {
              ...nextTasks[idx],
              miniTasks: hasRealContent
                ? [...nextTasks[idx].miniTasks, ...generatedMiniTasks]
                : generatedMiniTasks,
            };
          } else {
            // ponytail: no matching task exists - create fallback under the use case
            const uc = project?.useCases?.find(
              (u) => u.id === ucBlock.useCaseId,
            );
            if (!uc) continue;

            nextTasks.push({
              id: taskBlock.taskId || `task-fb-${uc.id}`,
              useCaseId: uc.id,
              useCaseTitle: uc.title || uc.nameAndDeadline,
              title: taskBlock.taskTitle || uc.title || "Client Use Case Task",
              description: uc.description || "",
              source: "client_use_case_fallback",
              approvalStatus: "accepted",
              locked: true,
              price: 0,
              completionDays: Number(uc.originalDurationDays || 1),
              miniTasks: generatedMiniTasks,
            });
          }
        }
      }

      return dedupeTasks(nextTasks);
    });

    return { updatedCount };
  };

  // ---- Submit ----
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    setSubmitting(true);

    try {
      // Compute totals from tasks
      const totalBid = tasks.reduce(
        (sum, t) => sum + (Number(t.price) || 0),
        0,
      );
      const totalDays = tasks.reduce(
        (sum, t) => sum + (Number(t.completionDays) || 0),
        0,
      );
      const finalBid = Number(form.bidAmount) || totalBid;
      const clientBudget = project?.originalBudget || project?.budget || 0;
      const clientDuration =
        project?.originalTotalDurationDays || project?.deadline || 0;
      const exceedsTargets =
        clientBudget - finalBid < 0 || clientDuration - totalDays < 0;

      // Check acknowledgement if exceeding targets
      if (exceedsTargets && !form.acknowledged) {
        toast.error(
          "Please check the acknowledgement checkbox before submitting.",
        );
        setSubmitting(false);
        return;
      }

      const coverLetterObj = {
        professionalIntro: form.professionalIntro.trim(),
        timelineMilestones: tasks
          .map(
            (t) =>
              `${t.title}: ${(t.miniTasks || []).map((m) => `- ${m.title}`).join(", ")}`,
          )
          .join("\n\n"),
        tasks: tasks.map((t) => ({
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
          miniTasks: (t.miniTasks || []).map((m) => ({
            id: m.id,
            taskId: t.id,
            title: m.title,
            description: m.description || "",
            status: m.status || "pending",
            isCompleted: m.isCompleted || false,
          })),
        })),
        proposedTasks: tasks
          .filter(
            (t) =>
              t.source === "expert" &&
              t.approvalStatus === "pending_client_approval",
          )
          .map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description || "",
            source: "expert",
            approvalStatus: "pending_client_approval",
            miniTasks: (t.miniTasks || []).map((m) => ({
              id: m.id,
              taskId: t.id,
              title: m.title,
              description: m.description || "",
            })),
          })),
        miniTasks: tasks.flatMap((t) =>
          (t.miniTasks || []).map((m) => ({
            id: m.id,
            taskId: t.id,
            title: m.title,
            description: m.description || "",
            status: m.status || "pending",
            isCompleted: false,
          })),
        ),
        durationDays: totalDays,
        totalBidAmount: finalBid,
        totalEstimatedDays: totalDays,
        useCaseBreakdown: (project?.useCases || []).map((uc) => ({
          useCaseId: uc.id,
          useCaseTitle: uc.title || uc.nameAndDeadline,
          originalDuration: uc.originalDurationDays,
          tasks: tasks
            .filter((t) => t.useCaseId === uc.id)
            .map((t) => ({
              id: t.id,
              title: t.title,
              description: t.description || "",
              source: t.source || "expert",
              approvalStatus: t.approvalStatus || "accepted",
              locked: t.locked !== false,
              price: Number(t.price) || 0,
              completionDays: Number(t.completionDays) || 1,
              miniTasks: (t.miniTasks || []).map((m) => ({
                id: m.id,
                taskId: t.id,
                title: m.title,
                description: m.description || "",
              })),
            })),
        })),
        budgetDeviation: clientBudget - finalBid,
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

      // Retrieve actual attachment file if Expert uploaded to form
      const portfolioFile = attachments[0] || null;
      const attachmentFile = attachments[1] || null;

      // Pre-upload files via /JobPosts/upload-file (saves to correct Railway path)
      let portfolioUrl = existingProposal?.portfolio || existingProposal?.Portfolio || null;
      if (portfolioFile instanceof File) {
        try {
          const fd = new FormData();
          fd.append("file", portfolioFile);
          const uploadRes = await api.post("/JobPosts/upload-file", fd, { isFormData: true }).catch(() => null);
          const cleanUrl = uploadRes?.url || uploadRes?.Url || uploadRes?.fileUrl || uploadRes?.FileUrl || null;
          if (cleanUrl) portfolioUrl = cleanUrl + `?name=${encodeURIComponent(portfolioFile.name)}`;
        } catch (e) { console.warn("[SendProposal] pre-upload failed:", e); }
      }

      let attachmentUrl = existingProposal?.attachmentUrl || existingProposal?.AttachmentUrl || null;
      if (attachmentFile instanceof File) {
        try {
          const fd = new FormData();
          fd.append("file", attachmentFile);
          const uploadRes = await api.post("/JobPosts/upload-file", fd, { isFormData: true }).catch(() => null);
          const cleanUrl = uploadRes?.url || uploadRes?.Url || uploadRes?.fileUrl || uploadRes?.FileUrl || null;
          if (cleanUrl) attachmentUrl = cleanUrl + `?name=${encodeURIComponent(attachmentFile.name)}`;
        } catch (e) { console.warn("[SendProposal] pre-upload attachment failed:", e); }
      }

      // Prepare the WBS tasks array as the backend expects (ProposalTaskJsonDto)
      const implementationTasks = tasks.map((t) => ({
        Title: `${t.title} [UCID:${t.useCaseId || ""}]`,
        MiniTasks: (t.miniTasks || []).map((m) => ({
          Title: m.title,
          Duration:
            Number(m.completionDays) ||
            Number(m.duration) ||
            Number(m.durationDays) ||
            1,
        })),
      }));
      const implementationJson = JSON.stringify(implementationTasks);

      const proposalPayload = {
        bidAmount: finalBid,
        estimatedDays: totalDays,
        introduction: form.professionalIntro || "Proposal from expert",
        coverLetter: implementationJson,
        portfolio: portfolioUrl ? null : portfolioFile,
        portfolioUrl: portfolioUrl,
        attachment: attachmentUrl ? null : attachmentFile,
        attachmentUrl: attachmentUrl,
      };

      let finalPropId = null;
      const propIdToUpdate = existingProposal?.id || existingProposal?.Id;
      if (propIdToUpdate) {
        await api.proposals.update(propIdToUpdate, proposalPayload);
        finalPropId = propIdToUpdate;
        // Notify client that expert updated their proposal
        notifyUpdatedProposal({
          clientUserId: project?.clientId,
          expertName: user?.fullName || user?.name || "Expert",
          jobTitle: project?.title || "Project",
          jobPostId: projectId,
        }).catch(() => { });
      } else {
        try {
          const created = await api.proposals.create({
            jobPostId: projectId,
            expertId: user.id,
            ...proposalPayload,
          });
          finalPropId = created?.id || created?.Id;
          // Notify client that a new proposal arrived
          notifyNewProposal({
            clientUserId: project?.clientId,
            expertName: user?.fullName || user?.name || "Expert",
            jobTitle: project?.title || "Project",
            jobPostId: projectId,
          }).catch(() => { });
        } catch (createErr) {
          // If backend rejects create because an active proposal already exists in DB, fetch and update it!
          if (
            createErr.message?.toLowerCase().includes("active proposal") ||
            createErr.status === 400
          ) {
            const list = await api.proposals
              .getByExpert(user.id)
              .catch(() => []);
            const activeProp = list.find(
              (p) =>
                String(
                  p.jobPostId || p.JobPostId || p.jobPost?.id || p.JobPost?.Id,
                ) === String(projectId),
            );
            const activeId = activeProp?.id || activeProp?.Id;
            if (activeId) {
              await api.proposals.update(activeId, proposalPayload);
              finalPropId = activeId;
            } else {
              throw createErr;
            }
          } else {
            throw createErr;
          }
        }
      }

      setSubmitting(false);
      if (finalPropId) {
        navigate(`/expert/proposals/${finalPropId}`);
      } else {
        navigate("/expert/proposals");
      }
    } catch (err) {
      console.error("Failed to submit proposal:", err);
      toast.error(
        err.message || "Failed to submit proposal. Please try again.",
      );
      setSubmitting(false);
    }
  };

  // ---- Auto-resize textareas when AI fills them ----
  useEffect(() => {
    const textareas = document.querySelectorAll("textarea");
    textareas.forEach((ta) => {
      // Only resize if it has a value and isn't manually collapsed
      if (ta.value) {
        ta.style.height = "inherit";
        ta.style.height = `${ta.scrollHeight}px`;
      }
    });
  }, [form.professionalIntro, tasks]);

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <BackButton fallback="/expert/dashboard" className="mb-0">
          Back to Dashboard
        </BackButton>
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <BackButton fallback="/expert/dashboard" className="mb-0">
          Back to Dashboard
        </BackButton>
        <div className="bg-card rounded-xl border border-border p-12 text-center shadow-sm">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">
            Project not found
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            This project may have been removed or is no longer available.
          </p>
        </div>
      </div>
    );
  }

  const totalDays = tasks.reduce(
    (sum, t) => sum + (Number(t.completionDays) || 0),
    0,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <BackButton fallback="/expert/dashboard" className="mb-0">
        Back to Dashboard
      </BackButton>
      <PageHeader
        title="Build Your Proposal"
        subtitle="Break down the client's user stories into tasks, mini-tasks, timeline, and pricing."
        badge={
          project ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-primary-light text-brand-primary rounded-full text-xs font-medium">
              <FileText className="w-3.5 h-3.5" />
              {project.title}
            </span>
          ) : null
        }
        illustration={
          <svg
            width="200"
            height="140"
            viewBox="0 0 200 140"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="20"
              y="10"
              width="50"
              height="22"
              rx="6"
              stroke="currentColor"
              strokeWidth="0.5"
              opacity="0.4"
            />
            <text
              x="45"
              y="25"
              textAnchor="middle"
              fontSize="8"
              fill="currentColor"
              opacity="0.5"
            >
              User Story
            </text>
            <line
              x1="70"
              y1="21"
              x2="95"
              y2="21"
              stroke="currentColor"
              strokeWidth="0.5"
              opacity="0.3"
            />
            <line
              x1="95"
              y1="21"
              x2="95"
              y2="50"
              stroke="currentColor"
              strokeWidth="0.5"
              opacity="0.3"
            />
            <line
              x1="95"
              y1="50"
              x2="120"
              y2="50"
              stroke="currentColor"
              strokeWidth="0.5"
              opacity="0.3"
            />
            <rect
              x="80"
              y="40"
              width="45"
              height="20"
              rx="5"
              stroke="currentColor"
              strokeWidth="0.5"
              opacity="0.35"
            />
            <text
              x="102"
              y="53"
              textAnchor="middle"
              fontSize="7"
              fill="currentColor"
              opacity="0.45"
            >
              Task A
            </text>
            <rect
              x="135"
              y="35"
              width="45"
              height="16"
              rx="4"
              stroke="currentColor"
              strokeWidth="0.4"
              strokeDasharray="2 2"
              opacity="0.3"
            />
            <text
              x="157"
              y="46"
              textAnchor="middle"
              fontSize="6"
              fill="currentColor"
              opacity="0.35"
            >
              Mini-task
            </text>
            <rect
              x="135"
              y="55"
              width="45"
              height="16"
              rx="4"
              stroke="currentColor"
              strokeWidth="0.4"
              strokeDasharray="2 2"
              opacity="0.3"
            />
            <text
              x="157"
              y="66"
              textAnchor="middle"
              fontSize="6"
              fill="currentColor"
              opacity="0.35"
            >
              Mini-task
            </text>
            <line
              x1="95"
              y1="60"
              x2="95"
              y2="85"
              stroke="currentColor"
              strokeWidth="0.5"
              opacity="0.3"
            />
            <line
              x1="95"
              y1="85"
              x2="120"
              y2="85"
              stroke="currentColor"
              strokeWidth="0.5"
              opacity="0.3"
            />
            <rect
              x="80"
              y="75"
              width="45"
              height="20"
              rx="5"
              stroke="currentColor"
              strokeWidth="0.5"
              opacity="0.35"
            />
            <text
              x="102"
              y="88"
              textAnchor="middle"
              fontSize="7"
              fill="currentColor"
              opacity="0.45"
            >
              Task B
            </text>
            <circle cx="45" cy="70" r="3" fill="currentColor" opacity="0.2" />
            <circle cx="157" cy="90" r="2" fill="currentColor" opacity="0.15" />
          </svg>
        }
      />

      <div
        className={`grid grid-cols-1 ${showAIPlanner ? "items-stretch gap-6 lg:grid-cols-10" : "mx-auto max-w-4xl"}`}
      >
        <div
          className={showAIPlanner ? "lg:col-span-7 flex flex-col" : "w-full"}
        >
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-2xl border border-border/60 bg-card/35 p-3 shadow-sm shadow-foreground/[0.02] sm:p-5"
          >
            <div className="flex items-center justify-between gap-3 px-1 py-1 pb-2 border-b border-border/40">
              <span className="text-xs text-muted-foreground font-medium">Form data auto-saves while typing</span>
              <button
                type="button"
                onClick={handleClearDraft}
                className="px-3 py-1 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                title="Clear all form fields and start over"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear All Data
              </button>
            </div>
            <AnimatedReveal>
              <SectionCard
                title="Professional Introduction"
                icon={Lightbulb}
                padding="lg"
                actions={
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{form.professionalIntro.length}/3000 (Min 10)</span>
                    <button
                      type="button"
                      onClick={handleGenerateIntro}
                      disabled={generatingIntro}
                      className="h-8 px-3 bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {generatingIntro ? (
                        <>
                          <svg
                            className="w-3.5 h-3.5 animate-spin"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                          Generating...
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-3.5 h-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          Generate Intro
                        </>
                      )}
                    </button>
                  </div>
                }
              >
                <textarea
                  value={form.professionalIntro}
                  onChange={(e) => {
                    e.target.style.height = "inherit";
                    e.target.style.height = `${e.target.scrollHeight}px`;
                    updateField("professionalIntro", e.target.value);
                  }}
                  minLength={10}
                  maxLength={3000}
                  rows={5}
                  placeholder="Introduce yourself - your experience, background, relevant skills, and why you are the best fit for this project."
                  className="w-full px-4 py-2.5 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary text-sm resize-none overflow-hidden"
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
                title="User Story & Task Breakdown"
                subtitle="Client user stories and tasks are read-only. Add pricing, duration, and mini-tasks. Proposed tasks require client approval."
                padding="lg"
              >
                {Array.isArray(project?.useCases) &&
                  project.useCases.length > 0 ? (
                  <div className="space-y-6">
                    {project.useCases.map((uc) => {
                      const ucTasks = tasks.filter(
                        (t) => t.useCaseId && t.useCaseId === uc.id,
                      );
                      return (
                        <div
                          key={uc.id}
                          className="overflow-hidden rounded-2xl border border-border/60 bg-background/60"
                        >
                          <div className="flex flex-col gap-1.5 border-b border-border/60 bg-accent-light/25 p-4 text-left">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground text-sm">
                                  User story: {uc.title || uc.nameAndDeadline}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                                {uc.originalDurationDays || 1} days
                              </span>
                            </div>
                            {uc.description && (
                              <p className="text-xs text-muted-foreground pl-3 border-l-2 border-border">
                                Description: {uc.description}
                              </p>
                            )}
                            <div className="flex justify-end mt-2">
                              {(() => {
                                const status = generatingUseCases[uc.id];
                                if (status === "loading") {
                                  return (
                                    <button
                                      type="button"
                                      disabled
                                      className="h-8 px-3 bg-muted text-muted-foreground rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-not-allowed"
                                    >
                                      <svg
                                        className="w-3.5 h-3.5 animate-spin"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                      >
                                        <circle
                                          className="opacity-25"
                                          cx="12"
                                          cy="12"
                                          r="10"
                                          stroke="currentColor"
                                          strokeWidth="4"
                                        />
                                        <path
                                          className="opacity-75"
                                          fill="currentColor"
                                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                        />
                                      </svg>
                                      Generating...
                                    </button>
                                  );
                                }
                                if (status === "done") {
                                  return (
                                    <button
                                      type="button"
                                      disabled
                                      className="h-8 px-3 bg-success/10 text-success border border-success/20 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                                    >
                                      <svg
                                        className="w-3.5 h-3.5"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                      >
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                      Generated
                                    </button>
                                  );
                                }
                                if (status === "error") {
                                  return (
                                    <button
                                      type="button"
                                      disabled
                                      className="h-8 px-3 bg-destructive-light text-destructive border border-destructive/20 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                                    >
                                      Failed
                                    </button>
                                  );
                                }
                                return (
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="flex items-center gap-1.5"
                                      title="Optional: Number of mini-tasks you want the AI to generate"
                                    >
                                      <span className="text-xs font-medium text-muted-foreground">
                                        Mini-task qty:
                                      </span>
                                      <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        placeholder="Auto"
                                        title="Leave empty for AI to decide automatically"
                                        value={minitaskCounts[uc.id] || ""}
                                        onChange={(e) =>
                                          setMinitaskCounts((prev) => ({
                                            ...prev,
                                            [uc.id]: e.target.value,
                                          }))
                                        }
                                        className="w-14 h-8 text-xs px-2 border border-border rounded-md bg-background focus:ring-1 focus:ring-brand-primary"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleGenerateMiniTaskForUseCase(uc)
                                      }
                                      className="h-8 px-3 bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                                    >
                                      <svg
                                        className="w-3.5 h-3.5"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                      >
                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                      </svg>
                                      Generate mini-task
                                    </button>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>

                          <div className="p-4 space-y-4">
                            {ucTasks.length === 0 && (
                              <p className="text-xs text-muted-foreground text-center py-2.5">
                                No tasks yet. Add a proposed task below.
                              </p>
                            )}

                            {ucTasks.map((task) => {
                              const tIdx = tasks.findIndex(
                                (t) => t.id === task.id,
                              );
                              const isProposed =
                                task.source === "expert" &&
                                task.approvalStatus ===
                                "pending_client_approval";

                              return (
                                <div
                                  key={task.id}
                                  className="space-y-3 rounded-2xl border border-border/55 bg-secondary/30 p-4"
                                >
                                  {/* Task Title Row with Remove Button */}
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">
                                      Task title
                                    </span>
                                    <textarea
                                      value={task.title}
                                      onChange={(e) => {
                                        e.target.style.height = "inherit";
                                        e.target.style.height = `${e.target.scrollHeight}px`;
                                        updateTask(
                                          task.id,
                                          "title",
                                          e.target.value,
                                        );
                                      }}
                                      disabled={!isProposed}
                                      rows={1}
                                      className="flex-1 min-w-[200px] px-3 py-1.5 border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-70 resize-none overflow-hidden"
                                      required
                                    />
                                    {ucTasks.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setTasks(
                                            tasks.filter(
                                              (t) => t.id !== task.id,
                                            ),
                                          )
                                        }
                                        className="h-8 px-3 text-sm font-semibold text-destructive hover:text-destructive hover:bg-destructive-light rounded-lg transition-colors inline-flex items-center flex-shrink-0"
                                      >
                                        Remove
                                      </button>
                                    )}
                                  </div>

                                  {/* Days Input */}
                                  <div className="w-24">
                                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                                      Days
                                    </label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={task.completionDays || 1}
                                      onChange={(e) => {
                                        const nt = [...tasks];
                                        nt[tIdx].completionDays = Math.max(
                                          1,
                                          Number(e.target.value) || 1,
                                        );
                                        setTasks(nt);
                                      }}
                                      placeholder="Days"
                                      className="w-full px-3 py-2 border border-input rounded-lg text-xs focus:ring-1 focus:ring-brand-primary/50 focus:outline-none bg-card"
                                    />
                                  </div>

                                  {/* Mini Tasks (Child Tasks) Checklist */}
                                  <div className="space-y-2 pl-4 border-l-2 border-brand-primary/20">
                                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                                      Mini-task
                                    </span>
                                    {task.miniTasks.map((mini, mIdx) => (
                                      <div
                                        key={mini.id || mIdx}
                                        className="flex items-center gap-2"
                                      >
                                        <span className="text-muted-foreground font-mono text-xs">
                                          -
                                        </span>
                                        <textarea
                                          value={mini.title}
                                          onChange={(e) => {
                                            e.target.style.height = "inherit";
                                            e.target.style.height = `${e.target.scrollHeight}px`;
                                            updateMiniTask(
                                              task.id,
                                              mini.id,
                                              "title",
                                              e.target.value,
                                            );
                                          }}
                                          rows={1}
                                          className="flex-1 px-3 py-1.5 border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary resize-none overflow-hidden"
                                          required
                                        />
                                        {task.miniTasks.length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const nt = [...tasks];
                                              nt[tIdx].miniTasks =
                                                task.miniTasks.filter(
                                                  (m) => m.id !== mini.id,
                                                );
                                              setTasks(nt);
                                            }}
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive-light rounded-lg transition-colors inline-flex items-center justify-center flex-shrink-0"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nt = [...tasks];
                                        nt[tIdx].miniTasks.push({
                                          id: `mt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                                          title: "",
                                        });
                                        setTasks(nt);
                                      }}
                                      className="h-8 px-3 text-xs font-semibold text-brand-primary hover:text-brand-primary-hover hover:bg-brand-primary-light rounded-lg transition-colors inline-flex items-center gap-1 mt-1"
                                    >
                                      + Add mini-task
                                    </button>
                                  </div>
                                </div>
                              );
                            })}

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
                                    useCaseTitle:
                                      uc.title || uc.nameAndDeadline,
                                    source: "expert",
                                    approvalStatus: "pending_client_approval",
                                    locked: false,
                                    price: 0,
                                    completionDays: 1,
                                    miniTasks: [
                                      {
                                        id: `mt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                                        title: "",
                                      },
                                    ],
                                  },
                                ])
                              }
                              className="h-10 px-4 bg-warning-light hover:bg-warning-light text-warning border border-warning/20 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1.5 w-full justify-center dark:bg-warning-light dark:hover:bg-warning-light dark:border-warning/30 dark:text-warning"
                            >
                              + Add proposed task
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tasks.map((task, tIdx) => {
                      const isProposed =
                        task.source === "expert" &&
                        task.approvalStatus === "pending_client_approval";
                      return (
                        <div
                          key={task.id || tIdx}
                          className={`space-y-4 rounded-2xl border p-5 ${isProposed ? "border-warning/20 bg-warning-light/65 dark:border-warning/30 dark:bg-warning-light" : "border-border/55 bg-secondary/30"}`}
                        >
                          {/* Task Title Row with Remove Button */}
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">
                              Task title #{tIdx + 1}
                            </span>
                            <textarea
                              value={task.title}
                              onChange={(e) => {
                                e.target.style.height = "inherit";
                                e.target.style.height = `${e.target.scrollHeight}px`;
                                updateTask(task.id, "title", e.target.value);
                              }}
                              rows={1}
                              className="flex-1 min-w-[200px] px-3 py-1.5 border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary resize-none overflow-hidden"
                            />
                            {tasks.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setTasks(
                                    tasks.filter((t) => t.id !== task.id),
                                  )
                                }
                                className="h-10 px-4 text-sm font-semibold text-destructive hover:text-destructive hover:bg-destructive-light rounded-xl transition-colors inline-flex items-center flex-shrink-0"
                              >
                                Remove
                              </button>
                            )}
                          </div>

                          {/* Days Input */}
                          <div className="w-24">
                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                              Days
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={task.completionDays || 1}
                              onChange={(e) => {
                                const nt = [...tasks];
                                nt[tIdx].completionDays = Math.max(
                                  1,
                                  Number(e.target.value) || 1,
                                );
                                setTasks(nt);
                              }}
                              placeholder="Days"
                              className="w-full px-3 py-2 border border-input rounded-xl text-xs focus:ring-1 focus:ring-brand-primary/50 focus:outline-none bg-card"
                            />
                          </div>

                          {/* Mini Tasks (Child Tasks) Checklist */}
                          <div className="space-y-2 pl-4 border-l-2 border-brand-primary/20">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                              Mini-task
                            </span>
                            {task.miniTasks.map((mini, mIdx) => (
                              <div
                                key={mini.id || mIdx}
                                className="flex items-center gap-2"
                              >
                                <span className="text-muted-foreground font-mono text-xs">
                                  -
                                </span>
                                <textarea
                                  value={mini.title}
                                  onChange={(e) => {
                                    e.target.style.height = "inherit";
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                    updateMiniTask(
                                      task.id,
                                      mini.id,
                                      "title",
                                      e.target.value,
                                    );
                                  }}
                                  rows={1}
                                  className="flex-1 px-3 py-1.5 border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary resize-none overflow-hidden"
                                />
                                {task.miniTasks.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nt = [...tasks];
                                      nt[tIdx].miniTasks =
                                        task.miniTasks.filter(
                                          (m) => m.id !== mini.id,
                                        );
                                      setTasks(nt);
                                    }}
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive-light rounded-lg transition-colors inline-flex items-center justify-center flex-shrink-0"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                const nt = [...tasks];
                                nt[tIdx].miniTasks.push({
                                  id: `mt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                                  title: "",
                                });
                                setTasks(nt);
                              }}
                              className="h-8 px-3 text-xs font-semibold text-brand-primary hover:text-brand-primary-hover hover:bg-brand-primary-light rounded-lg transition-colors inline-flex items-center gap-1 mt-1"
                            >
                              + Add mini-task
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Add Proposed Task Button */}
                    <button
                      type="button"
                      onClick={() =>
                        setTasks([
                          ...tasks,
                          {
                            id: `task-proposed-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                            title: "",
                            description: "",
                            useCaseId: null,
                            source: "expert",
                            approvalStatus: "pending_client_approval",
                            locked: false,
                            price: 0,
                            completionDays: 1,
                            miniTasks: [
                              {
                                id: `mt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                                title: "",
                              },
                            ],
                          },
                        ])
                      }
                      className="h-12 px-5 bg-warning-light hover:bg-warning-light text-warning border border-warning/20 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1.5 w-full justify-center dark:bg-warning-light dark:hover:bg-warning-light dark:border-warning/30 dark:text-warning"
                    >
                      + Add Proposed Task
                    </button>
                  </div>
                )}
              </SectionCard>
            </AnimatedReveal>

            <AnimatedReveal delay={4}>
              <FileUploadDropzone
                files={attachments}
                onFilesChange={(newFiles) =>
                  setAttachments(newFiles.slice(0, 1))
                }
                multiple={false}
                maxFiles={1}
                label="Portfolio & Attachment (Max 1 file)"
                helperText="Attach your CV, portfolio, demo file, PDF, or supporting document (Max 1 file)."
              />
            </AnimatedReveal>

            {existingAttachments.length > 0 && (
              <SectionCard
                title={`Previously Attached (${existingAttachments.length})`}
                padding="sm"
              >
                <div className="space-y-2">
                  {existingAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-3 bg-secondary/60 border border-border rounded-lg px-4 py-2.5"
                    >
                      {att.type === "image/png" ? (
                        <Image className="w-5 h-5 text-brand-primary" />
                      ) : (
                        <FileIcon className="w-5 h-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground/80">
                          {att.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {att.size}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Budget & Timeline Summary & Deviation Warnings */}
            {(() => {
              const totalBid = tasks.reduce(
                (sum, t) => sum + (Number(t.price) || 0),
                0,
              );
              const totalDays = tasks.reduce(
                (sum, t) => sum + (Number(t.completionDays) || 0),
                0,
              );
              const finalBid = Number(form.bidAmount) || totalBid;
              const clientBudget =
                project?.originalBudget || project?.budget || 0;
              const clientDuration =
                project?.originalTotalDurationDays || project?.deadline || 0;
              const budgetDeviation = clientBudget - finalBid;
              const timeDeviation = clientDuration - totalDays;
              const exceedsBudget = budgetDeviation < 0;
              const exceedsTime = timeDeviation < 0;

              return (
                <>
                  <AnimatedReveal delay={5}>
                    <SectionCard
                      title="Budget & Timeline Summary"
                      icon={BarChart3}
                      padding="lg"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-2">
                            Total Bid Amount ($){" "}
                            <span className="text-destructive">*</span>
                          </label>
                          <div className="text-xs text-muted-foreground mb-1">
                            Auto-computed from tasks:{" "}
                            {totalBid.toLocaleString()}
                          </div>
                          <input
                            type="number"
                            min="1"
                            value={form.bidAmount}
                            onChange={(e) =>
                              updateField(
                                "bidAmount",
                                Math.max(0, Number(e.target.value) || 0),
                              )
                            }
                            className="w-full px-4 py-2.5 border border-input rounded-xl bg-card text-foreground text-sm font-medium focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary focus:outline-none"
                            placeholder="5000"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-2">
                            Total Estimated Duration (Days){" "}
                            <span className="text-destructive">*</span>
                          </label>
                          <div className="text-xs text-muted-foreground mb-1">
                            Auto-computed from tasks: {totalDays} days
                          </div>
                          <div className="relative">
                            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                              type="number"
                              min="1"
                              value={totalDays}
                              disabled
                              readOnly
                              className="w-full pl-10 pr-4 py-2.5 border border-input rounded-xl bg-secondary/40 text-muted-foreground text-sm font-medium cursor-not-allowed focus:outline-none"
                              placeholder="14"
                              required
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 font-medium">
                            Total estimated duration computed automatically from
                            tasks.
                          </p>
                        </div>
                      </div>
                    </SectionCard>
                  </AnimatedReveal>

                  {/* Deviation Warnings */}
                  {(exceedsBudget || exceedsTime) && (
                    <div className="space-y-3 mt-4">
                      {exceedsTime && (
                        <div className="p-4 bg-warning-light border border-warning/20 text-warning rounded-xl flex items-start gap-3 shadow-sm">
                          <AlertTriangle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-semibold">
                              Proposed duration exceeds requirement
                            </p>
                            <p className="text-xs text-warning mt-0.5">
                              Your duration ({totalDays} days) exceeds the
                              client's baseline ({clientDuration} days) by{" "}
                              {Math.abs(timeDeviation)} days.
                            </p>
                          </div>
                        </div>
                      )}
                      {exceedsBudget && (
                        <div className="p-4 bg-destructive-light border border-destructive/20 text-destructive rounded-xl flex items-start gap-3 shadow-sm">
                          <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-semibold">
                              Proposed budget exceeds baseline
                            </p>
                            <p className="text-xs text-destructive mt-0.5">
                              Your bid amount ({finalBid.toLocaleString()} USD)
                              exceeds the client's budget (
                              {clientBudget.toLocaleString()} USD) by{" "}
                              {Math.abs(budgetDeviation).toLocaleString()} USD.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              );
            })()}

            {/* Submit */}
            <div className="space-y-4 rounded-2xl border border-border/70 bg-card/85 p-4 shadow-sm shadow-foreground/[0.025] sm:p-5">
              {(() => {
                const totalBid = tasks.reduce(
                  (sum, t) => sum + (Number(t.price) || 0),
                  0,
                );
                const totalDays = tasks.reduce(
                  (sum, t) => sum + (Number(t.completionDays) || 0),
                  0,
                );
                const finalBid = Number(form.bidAmount) || totalBid;
                const clientBudget =
                  project?.originalBudget || project?.budget || 0;
                const clientDuration =
                  project?.originalTotalDurationDays || project?.deadline || 0;
                const exceedsTargets =
                  clientBudget - finalBid < 0 || clientDuration - totalDays < 0;

                if (exceedsTargets) {
                  return (
                    <label className="flex items-start gap-3 cursor-pointer p-3 bg-warning/5 border border-warning/20 rounded-xl">
                      <input
                        type="checkbox"
                        checked={!!form.acknowledged}
                        onChange={(e) =>
                          updateField("acknowledged", e.target.checked)
                        }
                        className="mt-0.5"
                      />
                      <span className="text-sm text-destructive/90 font-medium">
                        I understand that my proposal exceeds the Client's
                        original budget/timeline. This may reduce my chances of
                        being selected.
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

        {showAIPlanner && (
          <aside className="lg:sticky lg:top-20 lg:col-span-3 lg:self-start">
            <div className="h-[min(48rem,calc(100vh-7rem))] min-h-[34rem] bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <AIPlannerPanel
                onClose={handleCloseAI}
                projectInfo={{
                  title: project?.title || "",
                  category: project?.domain?.name || "",
                }}
                jobPostId={projectId}
                expertId={user?.id}
                onApplyTasks={handleApplyAITasks}
                existingTasks={tasks}
                clientUseCases={project?.useCases || []}
                autoPrompt={autoPrompt}
                clearAutoPrompt={() => setAutoPrompt(null)}
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
