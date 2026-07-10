import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router";
import { ArrowLeft, Send, Star, MapPin, Clock, CheckCircle, Briefcase, Sparkles, Bot, Layers, Target, ReceiptText, Calendar } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import api from "../../../services/api.js";
import { SkillTags } from "../../components/shared/SkillTags.jsx";
import { FileUploadDropzone } from "../../components/shared/FileUploadDropzone.jsx";
import { AIClientsUseCasePlanner } from "../../components/ai/AIClientsUseCasePlanner.jsx";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import { SectionCard } from "../../components/shared/SectionCard.jsx";
import { AnimatedReveal } from "../../components/shared/AnimatedReveal.jsx";
import { getRecommendedExperts } from "../../lib/recommendationHelper.js";
import { notificationService } from "../../../services/notificationHelper.js";

// ── Timeline unit conversion helpers ──
const unitToDays = (value, unit) => {
  const n = Number(value) || 0;
  if (unit === "Months") return n * 30;
  if (unit === "Years") return n * 365;
  if (unit === "weeks") return n * 7;
  return n; // "Days" or legacy "days"
};

const daysToUnit = (days, unit) => {
  const n = Number(days) || 1;
  if (unit === "Months") return Math.ceil(n / 30);
  if (unit === "Years") return Math.ceil(n / 365);
  return n; // "Days" or legacy "days"/"weeks"
};

const unitLabel = (value, unit) => {
  if (unit === "Months") return `${value} month${value !== 1 ? "s" : ""}`;
  if (unit === "Years") return `${value} year${value !== 1 ? "s" : ""}`;
  return `${value} day${value !== 1 ? "s" : ""}`;
};

// API Category Data will be fetched via hooks below

export function PostProject() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const initialInvitedExpert = location.state?.inviteExpert || null;
  const [invitedExpert, setInvitedExpert] = useState(initialInvitedExpert);

  // States for recommendations
  const [recommendedExperts, setRecommendedExperts] = useState([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [selectedRecommendExpert, setSelectedRecommendExpert] = useState(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [visibleCount, setVisibleCount] = useState(3);

  const [formData, setFormData] = useState({
    category: "",
    specialization: "",
    title: "",
    description: "",
    budget: 0,          // number — no $, no commas
    durationValue: 1,   // number
    durationUnit: "Days", // "Days" | "Months" | "Years"
  });

  const [apiCategories, setApiCategories] = useState([]);
  const [apiSkills, setApiSkills] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [cats, skills] = await Promise.all([
          api.categoryTags.getCategories().catch(() => []),
          api.categoryTags.getSkills().catch(() => []),
        ]);
        setApiCategories(cats || []);
        setApiSkills(skills || []);
      } catch (err) {
        console.error("Failed to load categories", err);
      }
    }
    loadData();
  }, []);

  const [selectedSkills, setSelectedSkills] = useState([]);
  const [useCases, setUseCases] = useState([{ id: `uc-${Date.now()}-1`, title: "", description: "", originalDurationDays: 1 }]);
  const [attachments, setAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // AI Planner sidebar state
  const [rightPanelMode, setRightPanelMode] = useState(null); // null | "recommendations" | "ai_planner"

  const handleApplyAIPlan = (result) => {
    if (!result) return;
    
    // Tắt ghi đè Category/Specialization/Skills từ AI vì AI sinh ra dạng Text (VD: "Machine Learning")
    // trong khi hệ thống hiện tại yêu cầu chọn Mã ID (UUID). Việc ghi đè Text sẽ làm lỗi dropdown và xóa dữ liệu đã chọn.
    
    // Map AI use cases to current normalized shape
    if (result.useCases) {
      const mapped = result.useCases.map((uc, i) => ({
        id: `uc-${Date.now()}-${i}`,
        title: uc.title || uc.nameAndDeadline || "",
        description: uc.description || "",
        originalDurationDays: Number(uc.originalDurationDays || uc.durationDays || uc.durationValue || 1),
        requirements: uc.requirements || [],
      }));
      setUseCases(mapped);
    }
  };

  const formRef = useRef(null);
  const [formHeight, setFormHeight] = useState(0);

  useEffect(() => {
    if (formRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          setFormHeight(entry.target.clientHeight);
        }
      });
      resizeObserver.observe(formRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  // ── Auto-sync timeline with total use case duration ──
  const totalUseCaseDays = useMemo(() => {
    return useCases.reduce((sum, uc) => sum + (Number(uc.originalDurationDays) || 0), 0);
  }, [useCases]);

  useEffect(() => {
    const currentDays = unitToDays(formData.durationValue, formData.durationUnit);
    if (currentDays < totalUseCaseDays) {
      updateField("durationValue", daysToUnit(totalUseCaseDays, formData.durationUnit));
    }
    // ponytail: only syncs up, never down. Only runs on useCase/unit changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalUseCaseDays, formData.durationUnit]);

  const toggleSkill = (skillName) => {
    setSelectedSkills((prev) =>
      prev.includes(skillName) ? prev.filter((name) => name !== skillName) : [...prev, skillName],
    );
  };

  const updateField = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "category") {
        updated.specialization = "";
        setSelectedSkills([]);
      } else if (field === "specialization") {
        setSelectedSkills([]);
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    let deadlineDays = unitToDays(formData.durationValue, formData.durationUnit);

    // Compute total use case duration
    const totalUseCaseDuration = useCases.reduce((sum, uc) => sum + (Number(uc.originalDurationDays) || 0), 0);

    // Validate: total deadline >= total use case duration
    if (deadlineDays < totalUseCaseDuration) {
      alert(`Total deadline (${deadlineDays} days) must be at least the sum of use case durations (${totalUseCaseDuration} days). Please increase the deadline or reduce use case durations.`);
      setSubmitting(false);
      return;
    }

    // Generate stable IDs for use cases without IDs
    const normalizedUseCases = useCases.map((uc, idx) => ({
      id: uc.id || `uc-${Date.now()}-${idx}`,
      title: uc.title || uc.nameAndDeadline || "",
      description: uc.description || "",
      originalDurationDays: Number(uc.originalDurationDays) || 1,
      requirements: uc.requirements || [],
      createdBy: "client",
      createdAt: uc.createdAt || new Date().toISOString(),
    }));

    // Map to backend DTO format for Implementation
    const implementationPayload = normalizedUseCases.map(uc => {
      const reqs = uc.requirements || [];
      const miniTasksPayload = reqs.length > 0
        ? reqs.map(req => ({
            Title: typeof req === "string" ? req : req.title || "",
            Duration: Number(req.durationDays) || 0
          }))
        : [{
            Title: `Cấu phần của ${uc.title}`,
            Duration: Number(uc.originalDurationDays) || 1
          }];
      
      return {
        Title: uc.title,
        Duration: Number(uc.originalDurationDays) || 1,
        MiniTasks: miniTasksPayload
      };
    });

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      budget: Number(formData.budget) || 0,
      deadline: deadlineDays,
      domainId: formData.category || null,
      specializationId: formData.specialization || null,
      clientId: user?.id,
      skillIds: selectedSkills,
      requiredSkills: selectedSkills,
      implementation: implementationPayload,
      originalTotalDurationDays: totalUseCaseDuration,
      originalBudget: Number(formData.budget) || 0,
      attachments: attachments.map((f) => ({ name: f.name, size: f.size, type: f.type })),
      createdAt: new Date().toISOString(),
    };

    try {
      console.log("Submitting project to API:", payload);
      const createdJob = await api.jobPosts.create(payload);

      if (invitedExpert && createdJob?.id) {
        const coverLetterObj = {
          proposalTitle: "",
          professionalIntro: "",
          technicalApproach: "",
          timelineMilestones: "",
          dependencies: "",
          durationDays: deadlineDays,
          attachments: [],
        };
        const createdProposal = await api.proposals.create({
          jobPostId: createdJob.id,
          expertId: invitedExpert.id,
          bidAmount: 0,
          estimatedDays: deadlineDays,
          introduction: "Tôi muốn mời bạn tham gia dự án này.",
          coverLetter: JSON.stringify(coverLetterObj),
          isSubmitted: false,
        });

        await notificationService.notifyExpertInvited({
          expertUserId: invitedExpert.id,
          clientName: user?.fullName || "Client",
          jobTitle: createdJob.title || formData.title,
          jobPostId: createdJob.id,
          proposalId: createdProposal?.id || createdProposal?.Id
        });
      }

      if (invitedExpert) {
        alert("Đã gửi lời mời dự án tới chuyên gia thành công!");
      } else {
        alert("Đăng dự án thành công!");
      }
      navigate("/client/my-projects");
    } catch (err) {
      console.error("Failed to post project:", err);
      alert(err.message || "Đăng dự án thất bại. Vui lòng thử lại!");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecommendExperts = async () => {
    setLoadingRecommendations(true);
    setShowRecommendations(true);
    setSelectedRecommendExpert(null);
    setVisibleCount(3);
    try {
      const res = await api.experts.list();
      const rawExperts = (res || []).filter((u) => u.role?.toLowerCase() === "expert" && u.expertProfile);

      const projectData = {
        category: formData.category,
        specialization: formData.specialization,
        requiredSkills: selectedSkills
      };

      const sortedRawExperts = getRecommendedExperts(projectData, rawExperts, apiSkills, apiCategories);

      const sortedExperts = sortedRawExperts.map((u) => ({
        id: u.id,
        name: u.fullName,
        title: u.expertProfile.jobTitle || u.resolvedSpecName || "AI Specialist",
        specialization: u.specialization || "AI Specialist",
        category: u.category || "AI & Computing",
        location: u.expertProfile.location || "N/A",
        bio: u.expertProfile.bio || u.bio || "No biography provided.",
        rating: u.rating || 4.8,
        completedProjects: u.expertProfile.completedProjects || 8,
        hourlyRate: u.expertProfile.hourlyRate || 65,
        skills: u.resolvedSkills || ["Python", "Semantic Kernel"],
        email: u.email || "",
        phone: u.expertProfile.phone || "",
        portfolio: u.portfolio || [],
        clientReviews: (u.clientReviews || []).map((r) => ({
          clientName: r.clientName || r.name || "Client",
          rating: r.rating || 5,
          comment: r.comment || r.review || "Great work!",
          date: r.date,
        })),
      }));
      setRecommendedExperts(sortedExperts);
      
      // Scroll to recommendations container
      setTimeout(() => {
        const el = document.getElementById("ai-recommendations-section");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      console.error("Failed to load recommended experts:", err);
    } finally {
      setLoadingRecommendations(false);
    }
  };


  // Computed timeline validation (totalUseCaseDays defined above with useEffect)
  const configuredDeadlineDays = useMemo(() => {
    return unitToDays(formData.durationValue, formData.durationUnit);
  }, [formData.durationValue, formData.durationUnit]);


  // Danh sách categories và specializations từ API
  const categoriesList = useMemo(() => {
    const list = [];
    apiCategories.forEach(cat => {
      if (cat.name && !list.some(c => c.name === cat.name)) {
        list.push(cat);
      }
    });
    return list;
  }, [apiCategories]);

  const selectedCatObj = categoriesList.find(c => c.id === formData.category || c.name === formData.category);
  
  const specializationsList = useMemo(() => {
    const specs = selectedCatObj?.specializations || [];
    const list = [];
    specs.forEach(spec => {
      if (spec.name && !list.some(s => s.name === spec.name)) {
        list.push(spec);
      }
    });
    return list;
  }, [selectedCatObj]);

  // Skills List
  const skillsList = useMemo(() => {
    const list = [];
    apiSkills.forEach(skill => {
      if (skill.name && !list.some(s => s.name === skill.name) && !skill.name.match(/^[0-9a-fA-F-]{36}$/)) {
        list.push(skill);
      }
    });
    return list;
  }, [apiSkills]);

  const isDeadlineValid = configuredDeadlineDays >= totalUseCaseDays;
  const isFormValid =
    formData.title.trim() !== "" &&
    formData.description.trim() !== "" &&
    formData.category !== "" &&
    formData.specialization !== "" &&
    selectedSkills.length > 0 &&
    Number(formData.budget) > 0 &&
    Number(formData.durationValue) > 0 &&
    useCases.every(uc => (uc.title || uc.nameAndDeadline || "").trim() !== "" && uc.description.trim() !== "" && Number(uc.originalDurationDays) > 0) &&
    isDeadlineValid;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        title="Post a New AI Project"
        subtitle="Define your user stories, timeline, and budget before matching with an expert."
        illustration={
          <svg width="240" height="160" viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="120" cy="80" r="70" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 6" opacity="0.3" />
            <circle cx="120" cy="80" r="40" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.4" />
            <circle cx="120" cy="50" r="6" fill="currentColor" opacity="0.6" />
            <circle cx="140" cy="70" r="4" fill="currentColor" opacity="0.4" />
            <circle cx="100" cy="65" r="5" fill="currentColor" opacity="0.5" />
            <circle cx="125" cy="90" r="3" fill="currentColor" opacity="0.35" />
            <line x1="120" y1="50" x2="140" y2="70" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
            <line x1="120" y1="50" x2="100" y2="65" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
            <line x1="140" y1="70" x2="125" y2="90" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
            <line x1="100" y1="65" x2="125" y2="90" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
          </svg>
        }
      />

      <div className={`grid grid-cols-1 ${rightPanelMode || showRecommendations ? "lg:grid-cols-10 gap-6 items-stretch" : "max-w-3xl mx-auto"}`}>
        <div className={(rightPanelMode || showRecommendations) ? "lg:col-span-7 flex flex-col" : "w-full"}>
          <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col h-full space-y-6">
          <AnimatedReveal>
            <SectionCard title="Basic Information" icon={Layers} padding="lg">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-2">
                    Project Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text" name="title" id="title"
                    value={formData.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    className="w-full px-4 py-2.5 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                    placeholder="e.g., AI Chatbot Development"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="description" id="description"
                    value={formData.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2.5 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary resize-y"
                    placeholder="Describe your project requirements, goals, and expected outcomes..."
                    required
                  />
                </div>
                <FileUploadDropzone
                  files={attachments}
                  onFilesChange={setAttachments}
                  label="Project Attachments"
                  helperText="Upload requirement documents, references, screenshots, or supporting files for experts to review."
                />
              </div>
            </SectionCard>
          </AnimatedReveal>

          <AnimatedReveal delay={1}>
            <SectionCard title="Category & Required Skills" icon={Target} padding="lg">
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-2">Category</label>
                    <select
                      name="category" id="category"
                      value={formData.category}
                      onChange={(e) => updateField("category", e.target.value)}
                      className="w-full px-4 py-2.5 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary bg-card"
                      required
                    >
                      <option value="" disabled>Select a category...</option>
                      {categoriesList.map((catObj) => (
                          <option key={catObj.id || catObj.name} value={catObj.id || catObj.name}>{catObj.name}</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-2">Specialization</label>
                    <select
                      name="specialization" id="specialization"
                      value={formData.specialization}
                      onChange={(e) => updateField("specialization", e.target.value)}
                      className="w-full px-4 py-2.5 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary bg-card"
                      disabled={!formData.category}
                      required
                    >
                      <option value="" disabled>
                        {formData.category ? "Select a specialization..." : "Please select a category first"}
                      </option>
                        {specializationsList.map((specObj) => (
                          <option key={specObj.id || specObj.name} value={specObj.id || specObj.name}>{specObj.name}</option>
                        ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-2">Required Skills</label>
                  {!formData.category || !formData.specialization ? (
                    <p className="text-sm text-muted-foreground italic">Select a category and specialization to view matching skills.</p>
                  ) : skillsList.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No specialized skills listed for this area.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {skillsList.map((skillObj) => (
                          <button
                            key={skillObj.id || skillObj.name}
                            type="button"
                            onClick={() => toggleSkill(skillObj.id)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                              selectedSkills.includes(skillObj.id)
                                ? "bg-brand-primary text-brand-primary-foreground shadow-sm"
                                : "bg-secondary text-foreground/70 hover:bg-muted hover:text-foreground"
                            }`}
                          >
                            {skillObj.name}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </SectionCard>
          </AnimatedReveal>

          <AnimatedReveal delay={2}>
            <SectionCard
              title="Project User Stories"
              icon={Layers}
              padding="lg"
              actions={
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRightPanelMode("ai_planner")}
                    disabled={rightPanelMode === "ai_planner"}
                    className={`h-9 px-3 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                      rightPanelMode === "ai_planner"
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : "bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary/90 shadow-sm"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Parse with AI
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseCases([...useCases, { id: `uc-${Date.now()}-${useCases.length + 1}`, title: "", description: "", originalDurationDays: 1 }])}
                    className="h-9 px-3 bg-secondary hover:bg-muted text-brand-primary rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    + Add User Story
                  </button>
                </div>
              }
            >
              {useCases.length === 0 ? (
                <div className="py-8 text-center">
                  <Layers className="w-10 h-10 text-muted-foreground/25 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground font-medium">No user stories yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Add a user story or use AI to parse them automatically.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {useCases.map((uc, index) => (
                    <div key={index} className="p-5 bg-secondary/40 border border-border rounded-xl space-y-3 relative">
                      {useCases.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setUseCases(useCases.filter((_, i) => i !== index))}
                          className="absolute top-2 right-2.5 text-xs font-medium text-muted-foreground hover:text-red-600 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                          User Story Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={uc.title || uc.nameAndDeadline || ""}
                          onChange={(e) => { const updated = [...useCases]; updated[index].title = e.target.value; setUseCases(updated); }}
                          placeholder="e.g., User Authentication System"
                          className="w-full px-4 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary/50 focus:border-brand-primary bg-card"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                          Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={uc.description}
                          onChange={(e) => { const updated = [...useCases]; updated[index].description = e.target.value; setUseCases(updated); }}
                          placeholder="Detailed description of this user story..."
                          rows={2}
                          className="w-full px-4 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary/50 focus:border-brand-primary bg-card resize-y"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                          Duration (days) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number" min="1"
                          value={uc.originalDurationDays || 1}
                          onChange={(e) => { const updated = [...useCases]; updated[index].originalDurationDays = Math.max(1, parseInt(e.target.value) || 1); setUseCases(updated); }}
                          className="w-32 px-4 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary/50 focus:border-brand-primary bg-card"
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </AnimatedReveal>

          {/* Timeline Summary Box */}
          <div className={`rounded-xl border px-4 py-3 text-sm ${
            isDeadlineValid
              ? "bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300"
              : "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300"
          }`}>
            <div className="flex items-center gap-2 font-semibold">
              <Calendar className="w-4 h-4" />
              Timeline Summary
            </div>
            <p className="mt-1">
              Total User Story Duration: <strong>{totalUseCaseDays} days</strong>
              {" · "}
              Project Timeline: <strong>
                {formData.durationUnit === "Days"
                  ? `${formData.durationValue} days`
                  : `${unitLabel(formData.durationValue, formData.durationUnit)} (~${configuredDeadlineDays} days)`}
              </strong>
            </p>
            <span className="block mt-1 font-medium text-xs opacity-80">
              {isDeadlineValid
                ? "✓ Timeline is valid. You can increase the project timeline but not reduce it below the total user story duration."
                : "✗ Project timeline must be at least the total user story duration. Increase the timeline or reduce user story durations."}
            </span>
          </div>

          <AnimatedReveal delay={3}>
            <SectionCard
              title="Budget & Timeline"
              icon={ReceiptText}
              padding="lg"
              actions={
                <span className="text-xs text-muted-foreground">
                  {invitedExpert ? "Expert invited" : "No expert invited yet"}
                </span>
              }
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-2">Budget</label>
                    <input
                      type="number" name="budget" id="budget"
                      min="0" step="1"
                      value={formData.budget || ""}
                      onChange={(e) => updateField("budget", e.target.value === "" ? 0 : Number(e.target.value))}
                      className="w-full px-4 py-2.5 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                      placeholder="5000"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Total budget for this project</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-2">Timeline</label>
                    <div className="flex gap-2">
                      <input
                        type="number" name="durationValue" id="durationValue"
                        min="1" step="1"
                        value={formData.durationValue || ""}
                        onChange={(e) => updateField("durationValue", e.target.value === "" ? 1 : Number(e.target.value))}
                        onBlur={() => {
                          const currentDays = unitToDays(formData.durationValue, formData.durationUnit);
                          if (currentDays < totalUseCaseDays) {
                            updateField("durationValue", daysToUnit(totalUseCaseDays, formData.durationUnit));
                          }
                        }}
                        className="w-24 px-4 py-2.5 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                        placeholder="1"
                      />
                      <select
                        name="durationUnit" id="durationUnit"
                        value={formData.durationUnit}
                        onChange={(e) => {
                          const newUnit = e.target.value;
                          const currentDays = unitToDays(formData.durationValue, formData.durationUnit);
                          const newValue = daysToUnit(Math.max(currentDays, totalUseCaseDays), newUnit);
                          setFormData(prev => ({ ...prev, durationUnit: newUnit, durationValue: newValue }));
                        }}
                        className="flex-1 px-3 py-2.5 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary bg-card"
                      >
                        <option value="Days">Days</option>
                        <option value="Months">Months</option>
                        <option value="Years">Years</option>
                      </select>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Must be ≥ total user story duration</p>
                  </div>
                </div>

                {invitedExpert ? (
                  <div className="pt-2">
                    <label className="block text-sm font-medium text-foreground/80 mb-2">Invited Expert</label>
                    <input
                      type="text"
                      value={invitedExpert.name || invitedExpert.fullName || ""}
                      disabled
                      className="w-full px-4 py-2.5 border border-border bg-secondary/60 text-muted-foreground rounded-xl cursor-not-allowed font-medium"
                    />
                  </div>
                ) : null}
              </div>
            </SectionCard>
          </AnimatedReveal>

          {/* Submit & AI Recommend Buttons */}
          <div className="flex gap-4 pt-2 pb-2">
            <button
              type="submit"
              disabled={submitting || !isFormValid}
              className={`flex-[7] py-3.5 rounded-xl font-semibold inline-flex items-center justify-center gap-2 transition-all text-base ${
                submitting || !isFormValid
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover shadow-md"
              }`}
            >
              <Send className="w-4 h-4" /> {invitedExpert ? (submitting ? "Sending..." : "Send to Expert") : (submitting ? "Publishing..." : "Publish Project")}
            </button>
            <button
              type="button"
              onClick={handleRecommendExperts}
              disabled={submitting || !isFormValid}
              className={`flex-[3] py-3.5 rounded-xl font-semibold inline-flex items-center justify-center gap-2 transition-all ${
                submitting || !isFormValid
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-accent-light text-accent hover:bg-accent/10 font-semibold shadow-sm"
              }`}
            >
              <Bot className="w-4 h-4" />
              Recommend Expert
            </button>
          </div>
        </form>
      </div>

      {/* AI Planner Sidebar */}
      {rightPanelMode === "ai_planner" && (
        <aside className="lg:col-span-3">
          <div
            id="ai-assistant-sidebar"
            className="lg:sticky lg:top-16 lg:h-[calc(100vh-9rem)] lg:max-h-none bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col min-h-0"
          >
            <AIClientsUseCasePlanner
              onClose={() => setRightPanelMode(null)}
              onApplyPlan={(plan) => {
                handleApplyAIPlan(plan);
                setRightPanelMode(null);
              }}
              existingFiles={attachments}
              initialTitle={formData.title}
              initialDescription={formData.description}
            />
          </div>
        </aside>
      )}

      {/* AI Recommendations Section */}
      {showRecommendations && (
        <div
          id="ai-recommendations-section"
          className="lg:col-span-3 bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col min-h-0 overflow-hidden"
          style={{ height: formHeight ? `${formHeight}px` : "100%" }}
        >
          <div className="flex items-center justify-between mb-5 border-b border-border/60 pb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">AI Recommendations</h2>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">Matching experts</p>
            </div>
            <button
              type="button"
              onClick={() => setShowRecommendations(false)}
              className="text-xs text-muted-foreground hover:text-muted-foreground font-semibold transition-colors"
            >
              Close
            </button>
          </div>

          {loadingRecommendations ? (
            <div className="animate-pulse space-y-3 py-4">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-20 bg-muted rounded-xl" />
            </div>
          ) : !selectedRecommendExpert ? (
            /* Recommended Experts list */
            recommendedExperts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No experts found matching these criteria.</p>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1.5 space-y-4">
                {recommendedExperts.slice(0, visibleCount).map((expert) => (
                  <div
                    key={expert.id}
                    className="bg-card border border-border rounded-xl p-4 hover:border-input transition-all shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      {/* ── Top: name + rating badge ── */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="font-semibold text-foreground text-sm leading-snug truncate">
                          {expert.name}
                        </h3>
                        <span className="flex-shrink-0 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold inline-flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-emerald-500 text-emerald-500" />
                          {expert.rating}
                        </span>
                      </div>

                      {/* ── Title + location ── */}
                      <p className="text-[11px] text-muted-foreground mb-2 truncate">
                        {expert.title}
                        {expert.location ? ` · ${expert.location}` : ""}
                      </p>

                      {/* ── Bio ── */}
                      {expert.bio && (
                        <p className="text-sm text-muted-foreground mb-2.5 line-clamp-2 leading-relaxed">
                          {expert.bio}
                        </p>
                      )}

                      {/* ── Skill tags ── */}
                      {expert.skills?.length > 0 && (
                        <div className="mb-2">
                          <SkillTags
                            skills={expert.skills}
                            maxVisible={3}
                          />
                        </div>
                      )}

                      {/* ── Stats ── */}
                      <div className="flex items-center gap-2 mb-3 text-[11px]">
                        <span className="text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {expert.completedProjects}
                          </span>{" "}
                          projects
                        </span>
                        <span className="text-muted-foreground/60">·</span>
                        <span className="text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {expert.hourlyRate}
                          </span>
                          /hr
                        </span>
                      </div>
                    </div>

                    {/* ── Action ── */}
                    <button
                      type="button"
                      onClick={() => setSelectedRecommendExpert(expert)}
                      className="block w-full h-11 px-4 border border-input text-foreground/80 rounded-xl hover:bg-secondary/60 text-sm font-medium text-center transition-colors mt-auto"
                    >
                      View Detail
                    </button>
                  </div>
                ))}

                {recommendedExperts.length > visibleCount && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 3)}
                    className="w-full h-11 px-4 bg-secondary hover:bg-muted text-foreground/80 rounded-xl text-sm font-bold transition-colors text-center border border-border mt-2"
                  >
                    Thêm chuyên gia
                  </button>
                )}
              </div>
            )
          ) : (
            /* Expert Profile Details (Vertical representation) */
            <div className="flex-1 overflow-y-auto pr-1.5 space-y-4 text-left text-sm">
              <button
                type="button"
                onClick={() => setSelectedRecommendExpert(null)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider mb-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back to List
              </button>

              <div className="bg-card rounded-2xl border border-border shadow-sm p-4 space-y-6">
                {/* Avatar + Name Info */}
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-brand-primary-light rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-brand-primary text-lg">
                    {selectedRecommendExpert.name?.split(" ").map((w) => w[0]).join("").toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-foreground truncate">{selectedRecommendExpert.name}</h2>
                    <p className="text-foreground/80 font-medium text-sm truncate">{selectedRecommendExpert.title}</p>
                    <p className="text-muted-foreground text-xs truncate">{selectedRecommendExpert.email}</p>
                  </div>
                </div>

                {/* Meta Details */}
                <div className="flex flex-col gap-2 pt-4 border-t border-border/60 text-sm text-muted-foreground">
                  {selectedRecommendExpert.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      {selectedRecommendExpert.location}
                    </span>
                  )}
                  {selectedRecommendExpert.category && (
                    <span className="inline-flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      Category: {selectedRecommendExpert.category}
                    </span>
                  )}
                  {selectedRecommendExpert.specialization && (
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      Specialization: {selectedRecommendExpert.specialization}
                    </span>
                  )}
                  {selectedRecommendExpert.rating != null && (
                    <span className="inline-flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                      {selectedRecommendExpert.rating} ({selectedRecommendExpert.clientReviews?.length || 0} reviews)
                    </span>
                  )}
                  {selectedRecommendExpert.hourlyRate != null && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      {selectedRecommendExpert.hourlyRate}/hr
                    </span>
                  )}
                </div>

                {/* Contact Details */}
                {(selectedRecommendExpert.email || selectedRecommendExpert.phone) && (
                  <div className="pt-4 border-t border-border/60 space-y-2 text-sm text-muted-foreground">
                    {selectedRecommendExpert.email && (
                      <p>
                        <span className="font-semibold text-foreground/80">Email Address:</span> {selectedRecommendExpert.email}
                      </p>
                    )}
                    {selectedRecommendExpert.phone && (
                      <p>
                        <span className="font-semibold text-foreground/80">Phone Number:</span> {selectedRecommendExpert.phone}
                      </p>
                    )}
                  </div>
                )}

                {/* Bio */}
                {selectedRecommendExpert.bio && (
                  <div className="pt-4 border-t border-border/60">
                    <h3 className="text-sm font-semibold text-foreground/80 mb-1.5">About</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">{selectedRecommendExpert.bio}</p>
                  </div>
                )}

                {/* Skills */}
                {selectedRecommendExpert.skills?.length > 0 && (
                  <div className="pt-4 border-t border-border/60">
                    <h3 className="text-sm font-semibold text-foreground/80 mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedRecommendExpert.skills.map((skill, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-brand-primary-light text-brand-primary rounded-full text-xs font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Portfolio */}
                {selectedRecommendExpert.portfolio?.length > 0 && (
                  <div className="pt-4 border-t border-border/60">
                    <h3 className="text-sm font-semibold text-foreground/80 mb-2">Portfolio</h3>
                    <div className="space-y-2.5">
                      {selectedRecommendExpert.portfolio.map((item, i) => (
                        <div
                          key={i}
                          className="border border-border rounded-lg p-2.5 hover:border-blue-200 transition-colors bg-card"
                        >
                          <h4 className="font-medium text-foreground text-sm">{item.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1 leading-normal">
                            {item.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Client Reviews */}
                {selectedRecommendExpert.clientReviews?.length > 0 && (
                  <div className="pt-4 border-t border-border/60">
                    <h3 className="text-sm font-semibold text-foreground/80 mb-2">
                      Client Reviews ({selectedRecommendExpert.clientReviews.length})
                    </h3>
                    <div className="space-y-2.5">
                      {selectedRecommendExpert.clientReviews.map((review, i) => (
                        <div
                          key={i}
                          className="border border-border rounded-lg p-2.5 bg-card"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-medium text-foreground text-xs">
                              {review.clientName}
                            </span>
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: review.rating || 0 }, (_, j) => (
                                <Star
                                  key={j}
                                  className="w-3 h-3 fill-yellow-400 text-yellow-400"
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground leading-normal">{review.comment}</p>
                          {review.date && (
                            <p className="text-[9px] text-muted-foreground mt-1">{review.date}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Invite Button */}
                <div className="pt-4 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => {
                      setInvitedExpert(selectedRecommendExpert);
                      setShowRecommendations(false);
                      setSelectedRecommendExpert(null);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="w-full h-11 px-5 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-foreground rounded-xl font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm text-[15px]"
                  >
                    Invite
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
