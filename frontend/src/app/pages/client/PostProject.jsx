import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router";
import { ArrowLeft, Send, Star, MapPin, Clock, CheckCircle, Briefcase, Sparkles, Bot, Layers, Target, ReceiptText, Calendar, Paperclip } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import api, { saveJobUseCases, saveJobAttachments } from "../../../services/api.js";
import { SkillTags } from "../../components/shared/SkillTags.jsx";
import { FileUploadDropzone } from "../../components/shared/FileUploadDropzone.jsx";
import { AIClientsUseCasePlanner } from "../../components/ai/AIClientsUseCasePlanner.jsx";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import { SectionCard } from "../../components/shared/SectionCard.jsx";
import { AnimatedReveal } from "../../components/shared/AnimatedReveal.jsx";
import { getRecommendedExperts } from "../../lib/recommendationHelper.js";
import { notificationService } from "../../../services/notificationHelper.js";
import { toast } from "sonner";

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
    
    // Disable Category/Specialization/Skills override from AI because AI generates text format (e.g. "Machine Learning")
    // while the current system requires UUID. Overriding text will break the dropdown and clear selected data.
    
    // Map AI use cases to current normalized shape
    if (result.useCases) {
      const mapped = result.useCases.map((uc, i) => ({
        id: `uc-${Date.now()}-${i}`,
        title: uc.title || uc.nameAndDeadline || "",
        description: uc.description || "",
        originalDurationDays: "",
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
    const targetDays = Math.max(totalUseCaseDays, 1);
    const currentDays = unitToDays(formData.durationValue, formData.durationUnit);
    if (currentDays !== targetDays) {
      updateField("durationValue", daysToUnit(targetDays, formData.durationUnit));
    }
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
      toast.error(`Total deadline (${deadlineDays} days) must be at least the sum of use case durations (${totalUseCaseDuration} days). Please increase the deadline or reduce use case durations.`);
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

    const isGuid = (val) => typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    // Map to backend DTO format for Implementation (JobPostTaskInputDto: Title, MiniTasks)
    const implementationPayload = normalizedUseCases.map(uc => {
      const reqs = uc.requirements || [];
      const miniTasksPayload = reqs.length > 0
        ? reqs.map(req => ({
            Title: (typeof req === "string" ? req : req.title || "").trim() || "Requirement Task",
            Duration: Number(req.durationDays) || 1
          }))
        : [{
            Title: `Component of ${(uc.title || "Use Case").trim()}`,
            Duration: Number(uc.originalDurationDays) || 1
          }];
      
      return {
        Title: (uc.title || "Use Case").trim(),
        MiniTasks: miniTasksPayload
      };
    });

    // Upload attachment files before submitting
    const uploadedAttachments = [];
    for (const file of attachments) {
      try {
        const formDataUpload = new FormData();
        formDataUpload.append("file", file);
        const result = await api.post("/JobPosts/upload-file", formDataUpload, { isFormData: true });
        const rawUrl = result?.url || result?.Url || result?.fileUrl || result?.FileUrl;
        if (rawUrl) {
          uploadedAttachments.push({
            name: file.name,
            url: rawUrl,
            size: file.size,
            type: file.type,
          });
        }
      } catch (err) {
        console.warn("Failed to upload attachment:", file.name, err);
      }
    }

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      budget: Number(formData.budget) || 0,
      deadline: deadlineDays,
      domainId: isGuid(formData.category) ? formData.category : null,
      specializationId: isGuid(formData.specialization) ? formData.specialization : null,
      clientId: user?.id || user?.Id,
      skillIds: selectedSkills,
      implementation: implementationPayload,
    };

    try {
      console.log("Submitting project to API:", payload);
      const createdJob = await api.jobPosts.create(payload);
      const createdJobId = createdJob?.id || createdJob?.Id;

      if (createdJobId) {
        saveJobUseCases(createdJobId, normalizedUseCases);
        if (uploadedAttachments.length > 0) {
          saveJobAttachments(createdJobId, uploadedAttachments);
        }
      }

      if (invitedExpert && createdJobId) {
        const initialTasks = implementationPayload.map(t => ({
          Title: t.Title,
          MiniTasks: (t.MiniTasks || []).map(m => ({
            Title: m.Title,
            Duration: m.Duration || 1
          }))
        }));

        const createdProposal = await api.proposals.create({
          jobPostId: createdJobId,
          expertId: invitedExpert.id || invitedExpert.Id,
          bidAmount: Number(formData.budget) || 0,
          estimatedDays: deadlineDays,
          introduction: "I would like to invite you to join this project.",
          coverLetter: JSON.stringify(initialTasks),
          isSubmitted: false,
        });

        await notificationService.notifyExpertInvited({
          expertUserId: invitedExpert.id || invitedExpert.Id,
          clientName: user?.fullName || "Client",
          jobTitle: createdJob?.title || formData.title,
          jobPostId: createdJobId,
          proposalId: createdProposal?.id || createdProposal?.Id
        });
      }

      if (invitedExpert) {
        toast.success("Project invitation successfully sent to the expert.");
      } else {
        toast.success("Project posted successfully.");
      }
      navigate("/client/my-projects");
    } catch (err) {
      console.error("Failed to post project:", err);
      toast.error(err.message || "Failed to post project. Please try again.");
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


  // List of categories and specializations from API
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
                    Project Title <span className="text-destructive">*</span>
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
                    Description <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    name="description" id="description"
                    value={formData.description}
                    onChange={(e) => {
                      e.target.style.height = "inherit";
                      e.target.style.height = `${e.target.scrollHeight}px`;
                      updateField("description", e.target.value);
                    }}
                    rows={4}
                    className="w-full px-4 py-2.5 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary resize-none overflow-hidden"
                    placeholder="Describe your project requirements, goals, and expected outcomes..."
                    required
                  />
                </div>
                <FileUploadDropzone
                  files={attachments}
                  onFilesChange={(newFiles) => setAttachments(newFiles.slice(0, 1))}
                  multiple={false}
                  maxFiles={1}
                  label="Project Attachments (Max 1 file)"
                  helperText="Upload SRS, BRD, design mockups, or specification document for experts to review."
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
                          className="absolute top-2 right-2.5 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
                        >
                          Remove
                        </button>
                      )}
                      <div>
                        <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                          User Story Title <span className="text-destructive">*</span>
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
                        <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                          Description <span className="text-destructive">*</span>
                        </label>
                        <textarea
                          value={uc.description}
                          onChange={(e) => { 
                            e.target.style.height = "inherit";
                            e.target.style.height = `${e.target.scrollHeight}px`;
                            const updated = [...useCases]; 
                            updated[index].description = e.target.value; 
                            setUseCases(updated); 
                          }}
                          placeholder="Detailed description of this user story..."
                          rows={2}
                          className="w-full px-4 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary/50 focus:border-brand-primary bg-card resize-none overflow-hidden"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                          Duration (days) <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="number" min="1"
                          value={uc.originalDurationDays || ""}
                          onChange={(e) => { const updated = [...useCases]; updated[index].originalDurationDays = e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value) || 1); setUseCases(updated); }}
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
          <div className="rounded-xl border px-4 py-2.5 text-sm bg-accent-light border-accent/20 text-accent dark:bg-accent-light dark:border-accent/30 dark:text-accent">
            <div className="flex items-center gap-2 font-semibold">
              <Calendar className="w-4 h-4" />
              Timeline Summary
            </div>
            <p className="mt-1">
              Total User Story Duration: <strong>{totalUseCaseDays} days</strong>
            </p>
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
                    <label className="block text-sm font-medium text-foreground/80 mb-2">Timeline (auto from user stories)</label>
                    <div className="flex gap-2">
                      <input
                        type="number" name="durationValue" id="durationValue"
                        min="1" step="1"
                        value={totalUseCaseDays || 1}
                        readOnly
                        className="w-24 px-4 py-2.5 border border-input rounded-xl bg-secondary/60 text-muted-foreground cursor-not-allowed"
                      />
                      <select
                        name="durationUnit" id="durationUnit"
                        value={formData.durationUnit}
                        disabled
                        className="flex-1 px-3 py-2.5 border border-input rounded-xl bg-secondary/60 text-muted-foreground cursor-not-allowed"
                      >
                        <option value="Days">Days</option>
                        <option value="Months">Months</option>
                        <option value="Years">Years</option>
                      </select>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Auto-calculated from total user story duration</p>
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
              className={`flex-[7] py-2.5 rounded-lg font-medium inline-flex items-center justify-center gap-2 transition-all text-base ${
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
              className={`flex-[3] py-2.5 rounded-lg font-medium inline-flex items-center justify-center gap-2 transition-all ${
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
              <h2 className="text-sm font-semibold text-foreground">AI Recommendations</h2>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">Matching experts</p>
            </div>
            <button
              type="button"
              onClick={() => setShowRecommendations(false)}
              className="text-xs text-muted-foreground hover:text-muted-foreground font-medium transition-colors"
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
                        <span className="flex-shrink-0 px-2 py-0.5 bg-success-light text-success rounded-full text-xs font-semibold inline-flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-success text-success" />
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
                      className="block w-full h-10 px-4 border border-input text-foreground/80 rounded-xl hover:bg-secondary/60 text-sm font-medium text-center transition-colors mt-auto"
                    >
                      View Detail
                    </button>
                  </div>
                ))}

                {recommendedExperts.length > visibleCount && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 3)}
                    className="w-full h-10 px-4 bg-secondary hover:bg-muted text-foreground/80 rounded-lg text-sm font-medium transition-colors text-center border border-border mt-2"
                  >
                    Add Expert
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
                  <div className="w-14 h-14 bg-brand-primary-light rounded-xl flex items-center justify-center flex-shrink-0 font-semibold text-brand-primary text-lg">
                    {selectedRecommendExpert.name?.split(" ").map((w) => w[0]).join("").toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-foreground truncate">{selectedRecommendExpert.name}</h2>
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
                      <Star className="w-3.5 h-3.5 fill-warning text-warning flex-shrink-0" />
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
                          className="border border-border rounded-lg p-2.5 hover:border-accent/25 transition-colors bg-card"
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
                                  className="w-3 h-3 fill-warning text-warning"
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
                    className="w-full h-10 px-4 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-foreground rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 shadow-sm text-[15px]"
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
