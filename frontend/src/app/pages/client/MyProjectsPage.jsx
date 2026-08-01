import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  Briefcase,
  PlusCircle,
  Calendar,
  Tag,
  FileText,
  Users,
  ArrowLeft,
  X,
  MessageSquare,
  Clock,
  Paperclip,
  File as FileIcon,
  ChevronDown,
} from "lucide-react";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { LoadingSkeleton } from "../../components/shared/LoadingSkeleton.jsx";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { toast } from "sonner";
import api, { parseProposalWbs, enrichFileUrl, cleanFileName } from "../../../services/api.js";
import { downloadFile } from "../../lib/downloadFileUtils.js";
import { notifyProposalDecision } from "../../../services/notificationHelper.js";

import { getProjectProgress, deriveProjectStatusKey, getStatusLabel, getStatusBadgeClass, getOverallProgress } from "../../lib/projectTimelineStore.js";
import { safeArray, safeDateFormat } from "../../lib/safety.js";
import { cn } from "../../lib/utils.js";

const CLIENT_ACCEPTED_PROPOSAL_STATUSES = new Set([
  "accepted",
  "pending_pay",
  "pending_escrow",
  "in_progress",
  "active",
  "completed",
]);

function canClientViewProposalMiniTasks(status) {
  const normalizedStatus = String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return CLIENT_ACCEPTED_PROPOSAL_STATUSES.has(normalizedStatus);
}

export function getNormalizedStatus(project, activeReports = []) {
  const localReleases = JSON.parse(localStorage.getItem("escrow_releases") || "[]");
  const projId = project.projectId || project.id || project.Id;
  const isReleasedLocally = projId ? localReleases.some(r => String(r.projectId).toLowerCase() === String(projId).toLowerCase()) : false;
  
  const localStatus = projId ? localStorage.getItem(`project_status_${projId}`) : null;
  const dbStatus = (project.status || project.Status || "").toLowerCase();
  let status = (localStatus || dbStatus).toLowerCase();

  // If status is awaiting_cancellation, check if it's still pending Admin approval
  // Only match by projectId - no type filtering needed.
  if (status === "awaiting_cancellation" && projId && Array.isArray(activeReports) && activeReports.length > 0) {
    const report = activeReports.find(r => {
      const rProjId = String(r.projectId || r.ProjectId || "").toLowerCase();
      const rStatus = (r.status || r.Status || "").toLowerCase();
      return rProjId === String(projId).toLowerCase() &&
             (rStatus === "pending admin" || rStatus === "pending");
    });
    if (report) {
      status = "inprogress";
    }
  }

  let label = "In Progress";
  let badgeClass = "bg-brand-primary-light text-brand-primary border-brand-primary/25 font-semibold";

  if (status === "completed" || status === "complete" || status === "resolved" || isReleasedLocally) {
    label = "Completed";
    badgeClass = "bg-success-light text-success border-success/25 font-semibold";
  } else if (status === "cancelled" || status === "cancel" || status === "cancel_done" || status === "contract_cancelled" || status === "awaiting_cancellation") {
    label = "Cancel";
    badgeClass = "bg-destructive-light text-destructive border-destructive/25 font-semibold";
  } else if (status === "disputed") {
    label = "Disputed";
    badgeClass = "bg-destructive-light text-destructive border border-destructive/25 font-semibold";
  } else {
    const hasProjectRecord = !!projId;
    const isPendingEscrow = status === "pending_escrow" || dbStatus === "pending_escrow";

    const localDepositedIds = JSON.parse(localStorage.getItem("deposited_project_ids") || "[]");
    const isDepositedLocal = projId ? localDepositedIds.some(id => String(id).toLowerCase() === String(projId).toLowerCase()) : false;
    const hasEscrowBalance = Number(project.escrowBalance ?? project.EscrowBalance ?? 0) > 0;
    const isActiveDbStatus = ["in progress", "in_progress", "active", "work_submitted", "worksubmitted", "under_review", "underreview", "revision_requested", "revisionrequested", "awaiting_cancellation", "accepted", "assigned", "disputed"].includes(dbStatus);

    const isDeposited = isDepositedLocal || hasEscrowBalance || isActiveDbStatus;

    if (!hasProjectRecord || (isPendingEscrow && !isDeposited)) {
      label = "Open";
      badgeClass = "bg-warning-light text-warning border-warning/25 font-semibold";
    }
  }

  return { label, badgeClass };
}

export function MyProjectsList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Sub-view page states: "list" | "details" | "proposals"
  const [view, setView] = useState("list");
  const [selectedProject, setSelectedProject] = useState(null);

  // Proposal states for proposals sub-view
  const [proposal, setProposal] = useState(null);
  const [proposalsList, setProposalsList] = useState([]);
  const [viewedProposal, setViewedProposal] = useState(null);
  const [propLoading, setPropLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showEscrowConfirm, setShowEscrowConfirm] = useState(false);
  
  // Proposal filter states
  const [propSearch, setPropSearch] = useState("");
  const [propSort, setPropSort] = useState("recent");

  const [showInviteSuccessBanner, setShowInviteSuccessBanner] = useState(false);
  const [invitedExpertName, setInvitedExpertName] = useState("");
  const [activeReports, setActiveReports] = useState([]);
  const [expandedMiniTaskIds, setExpandedMiniTaskIds] = useState(() => new Set());

  const toggleMiniTasks = (key) => {
    setExpandedMiniTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderMiniTasksToggle = (task, status, keyPrefix, idx) => {
    if (!canClientViewProposalMiniTasks(status) || !task.miniTasks || task.miniTasks.length === 0) return null;

    const key = `${keyPrefix}-${task.id || idx}`;
    const isOpen = expandedMiniTaskIds.has(key);

    return (
      <div className="mt-2">
        <button
          type="button"
          onClick={() => toggleMiniTasks(key)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-brand-primary/45 hover:bg-brand-primary-light/45 cursor-pointer"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          {isOpen ? "Hide mini-tasks" : `Show mini-tasks (${task.miniTasks.length})`}
        </button>
        {isOpen && (
          <div className="pl-3 border-l-2 border-brand-primary/20 space-y-1.5 mt-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block">Mini-tasks:</span>
            {task.miniTasks.map((mt, mtIdx) => (
              <p key={mt.id || mtIdx} className="text-xs text-foreground/80">- {mt.title}</p>
            ))}
          </div>
        )}
      </div>
    );
  };

  async function loadProjects() {
    if (!user?.id) return;
    try {
      setLoading(true);
      let rawProjects = [];
      let activeProjectsList = [];
      try {
        const [jobsRes, projectsRes, transactionsList, reportsRes] = await Promise.all([
          api.jobPosts.getByClientId(user.id).catch(() => []),
          api.projects.getByClient(user.id).catch(() => []),
          api.payments.getTransactions(user.id).catch(() => []),
          api.get("/reports").catch(() => ({ data: [] }))
        ]);
        rawProjects = jobsRes;
        activeProjectsList = projectsRes;
        setActiveReports(Array.isArray(reportsRes) ? reportsRes : (reportsRes?.data || []));

        try {
          const depositedProjectIds = (transactionsList || [])
            .filter(tx => tx.type === "EscrowDeposit")
            .map(tx => String(tx.projectId || tx.ProjectId).toLowerCase());
          localStorage.setItem("deposited_project_ids", JSON.stringify(depositedProjectIds));
        } catch (e) {}
      } catch (err) {
        console.warn("Failed to fetch client jobs or active projects", err);
      }
      
      const projectsWithCounts = await Promise.all(
        rawProjects.map(async (project) => {
          const matchingProject = (activeProjectsList || []).find(
            proj => (proj.jobPostId === project.id || proj.JobPostId === project.id)
          );
          
          const localReleases = JSON.parse(localStorage.getItem("escrow_releases") || "[]");
          const clientReleases = localReleases.filter(r => r.clientId === user.id);
          let isReleasedLocally = false;
          if (matchingProject) {
            isReleasedLocally = clientReleases.some(r => r.projectId === (matchingProject.id || matchingProject.Id));
            const localStatus = localStorage.getItem(`project_status_${matchingProject.id || matchingProject.Id}`);
            if (isReleasedLocally || localStatus === "completed") {
              matchingProject.status = "Completed";
              matchingProject.Status = "Completed";
            }
          }

          let overallProgress = 0;
          if (matchingProject) {
            try {
              const fullProj = await api.projects.getById(matchingProject.id || matchingProject.Id);
              if (fullProj && fullProj.tasks) {
                overallProgress = getOverallProgress(fullProj.tasks);
              }
            } catch (err) {
              console.warn("Failed to load full project detail in MyProjectsPage for progress mapping:", err);
            }
          }

          const hasOverriddenCompleted = isReleasedLocally || (matchingProject && localStorage.getItem(`project_status_${matchingProject.id || matchingProject.Id}`) === "completed");
          
          let actualStatus = project.status || "";
          if (matchingProject) {
            actualStatus = matchingProject.status || matchingProject.Status || project.status || "";
            if (hasOverriddenCompleted) {
              actualStatus = "Completed";
            }
          }

          try {
            const proposals = await api.proposals.getByJob(project.id);
            const acceptedProp = proposals.find(p => 
              ["accepted", "pending_escrow", "pending_pay", "in_progress", "active"].includes(p.status?.toLowerCase())
            );
            const hasAcceptedProposal = !!acceptedProp;
            const acceptedExpertName = acceptedProp ? (acceptedProp.expertName || acceptedProp.ExpertName || acceptedProp.expert || "") : "";
            
            return {
              ...project,
              status: actualStatus,
              projectId: matchingProject ? (matchingProject.id || matchingProject.Id) : null,
              escrowBalance: matchingProject ? (matchingProject.escrowBalance ?? matchingProject.EscrowBalance) : 0,
              proposalCount: proposals.length,
              isAcceptedProject: hasAcceptedProposal,
              acceptedExpertName: acceptedExpertName,
              progress: overallProgress,
            };
          } catch {
            return { 
              ...project, 
              status: actualStatus,
              projectId: matchingProject ? (matchingProject.id || matchingProject.Id) : null,
              escrowBalance: matchingProject ? (matchingProject.escrowBalance ?? matchingProject.EscrowBalance) : 0,
              proposalCount: 0, 
              isAcceptedProject: false, 
              acceptedExpertName: "",
              progress: overallProgress,
            };
          }
        })
      );
      
      setProjects(projectsWithCounts);
    } catch (err) {
      console.error("Failed to load client projects:", err);
    } finally {
      setLoading(false);
    }
  }

  const [dbUpdateVersion, setDbUpdateVersion] = useState(0);

  useEffect(() => {
    loadProjects();

    const handleUpdate = () => {
      loadProjects();
      setDbUpdateVersion((prev) => prev + 1);
    };
    window.addEventListener("aitasker_db_update", handleUpdate);
    return () => {
      window.removeEventListener("aitasker_db_update", handleUpdate);
    };
  }, [user?.id]);

  // Keep selectedProject in sync when projects updates
  useEffect(() => {
    if (selectedProject && projects.length > 0) {
      const updated = projects.find((p) => p.id === selectedProject.id);
      if (updated) {
        setSelectedProject(updated);
      }
    }
  }, [projects]);

  // Sync state to URL parameters (for preserving active view on F5)
  useEffect(() => {
    if (selectedProject?.id && view !== "list") {
      const currentParams = new URLSearchParams(location.search);
      currentParams.set("projectId", selectedProject.id);
      currentParams.set("view", view);
      navigate(`?${currentParams.toString()}`, { replace: true });
    }
  }, [selectedProject?.id, view]);

  // Handle deep-linking from notifications or URL reload (F5)
  useEffect(() => {
    if (projects.length === 0) return;
    const params = new URLSearchParams(location.search);
    const pId = params.get("projectId");
    const vType = params.get("view");
    if (pId && vType) {
      const proj = projects.find((p) => String(p.id) === String(pId));
      if (proj) {
        setSelectedProject(proj);
        setView(vType);
      }
    }
  }, [projects]);

  // Check for successful invite parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("inviteSuccess") === "true") {
      setShowInviteSuccessBanner(true);
      setInvitedExpertName(params.get("expertName") || "");
    } else {
      setShowInviteSuccessBanner(false);
      setInvitedExpertName("");
    }
  }, [location.search]);

  // Load a single connected proposal when switching to proposals view
  useEffect(() => {
    if (view !== "proposals" || !selectedProject?.id) {
      setProposal(null);
      setProposalsList([]);
      setViewedProposal(null);
      setPropSearch("");
      setPropSort("recent");
      return;
    }
    let cancelled = false;

    async function fetchProposals() {
      setPropLoading(true);
      try {
        // Load categories to resolve GUIDs to display names
        let allCategories = [];
        let allSpecializations = [];
        try {
          allCategories = await api.categoryTags.getCategories();
        } catch (e) {
          console.warn("Failed to load categories for name resolution:", e);
        }
        try {
          allSpecializations = await api.categoryTags.getSpecializations();
        } catch (e) {
          console.warn("Failed to load specializations for name resolution:", e);
        }

        const list = await api.proposals.getByJob(selectedProject.id);
        const submittedList = list.filter(p => p.isSubmitted !== false);
        if (submittedList.length === 0) {
          if (!cancelled) {
            setProposal(null);
            setProposalsList([]);
          }
          return;
        }

        const enrichedList = await Promise.all(
          submittedList.map(async (targetProp) => {
            let expUser = null;
            try {
              expUser = await api.users.getById(targetProp.expertId);
            } catch (err) {
              console.error("Failed to load expert info:", err);
            }

            // Resolve category and specialization names from GUIDs
            const rawCategory = expUser?.expertProfile?.category || null;
            const rawSpecialization = expUser?.expertProfile?.major || null;
            let resolvedCategory = rawCategory;
            let resolvedSpecialization = rawSpecialization;
            if (rawCategory) {
              const matchedCat = allCategories.find(c => c.id === rawCategory);
              if (matchedCat) {
                resolvedCategory = matchedCat.name;
                // Resolve specialization within the matched category (legacy nested or dedicated endpoint)
                if (rawSpecialization) {
                  const matchedSpec = matchedCat.specializations?.find(s => s.id === rawSpecialization)
                    || allSpecializations.find(s => s.id === rawSpecialization);
                  if (matchedSpec) resolvedSpecialization = matchedSpec.name;
                }
              }
            }

            // Calculate success rate from expert's projects (same as ExpertProfile)
            let expertSuccessRate = null;
            const allExpertProjects = expUser?.projects || expUser?.Projects || [];
            if (allExpertProjects.length > 0) {
              const completedCount = allExpertProjects.filter(p =>
                ["completed", "complete", "resolved"].includes((p.status || p.Status || "").toLowerCase())
              ).length;
              const cancelCount = allExpertProjects.filter(p =>
                ["cancelled", "canceled", "cancel_done", "contract_cancelled", "stopped"].includes((p.status || p.Status || "").toLowerCase())
              ).length;
              const reportCount = allExpertProjects.filter(p =>
                ["disputed"].includes((p.status || p.Status || "").toLowerCase())
              ).length;
              const totalForSuccess = completedCount + cancelCount + reportCount;
              if (totalForSuccess > 0) {
                expertSuccessRate = Math.round((completedCount / totalForSuccess) * 100);
              }
            }

            // Get evaluate from reviews (same as ExpertProfile)
            let expertEvaluate = null;
            try {
              const reviewRes = await api.reviews.getExpertReviews(targetProp.expertId);
              if (reviewRes) {
                const reviewsList = reviewRes.reviews || [];
                if (reviewsList.length > 0) {
                  const totalRating = reviewsList.reduce((sum, r) => sum + (r.rating || 0), 0);
                  expertEvaluate = (totalRating / reviewsList.length).toFixed(1).replace(".0", "");
                }
              }
            } catch (e) {
              console.warn("Failed to load expert reviews:", e);
            }

            const parsed = parseProposalWbs(targetProp.implementation || targetProp.coverLetter, targetProp);

            const rawParsedAttachments = parsed?.attachments || [];
            const attachments = [...rawParsedAttachments];

            const checkAndAddBEFile = (rawPath, fallbackTitle, idPrefix) => {
              if (!rawPath || typeof rawPath !== "string") return;
              const fileUrl = enrichFileUrl(rawPath);
              const exists = attachments.some(a => a.url === fileUrl || a.url === rawPath);
              if (!exists) {
                const cleanName = cleanFileName(rawPath) || fallbackTitle;
                const isImg = /\.(png|jpe?g|gif|webp)$/i.test(rawPath);
                attachments.push({
                  id: `${idPrefix}-${Date.now()}`,
                  name: cleanName,
                  type: isImg ? "image/png" : "document",
                  fileType: isImg ? "image/png" : "document",
                  url: fileUrl
                });
              }
            };

            checkAndAddBEFile(targetProp.portfolio || targetProp.Portfolio || targetProp.portfolioUrl || targetProp.PortfolioUrl, "Portfolio Document", "portfolio");
            checkAndAddBEFile(targetProp.attachmentUrl || targetProp.AttachmentUrl || targetProp.attachment || targetProp.Attachment, "Attached Document", "attachment");

            // Dynamically construct useCaseBreakdown if project has useCases
            const useCases = selectedProject?.useCases || [];
            const useCaseBreakdown = useCases.map(uc => {
              const ucTasks = parsed.tasks.filter(t => t.useCaseId === uc.id);
              return {
                useCaseId: uc.id,
                useCaseTitle: uc.title || uc.nameAndDeadline || "Use Case",
                originalDuration: uc.originalDurationDays || 1,
                tasks: ucTasks
              };
            });

            return {
              ...targetProp,
              ...parsed,
              useCaseBreakdown,
              coverLetter: parsed.professionalIntro || targetProp.introduction || "",
              attachments,
              expertName: expUser?.fullName || "AI Expert",
              expertCategory: resolvedCategory,
              expertSpecialization: resolvedSpecialization,
              expertSkills: expUser?.expertProfile?.skills || [],
              expertSuccessRate,
              expertEvaluate,
            };
          })
        );

        if (!cancelled) {
          const accepted = enrichedList.find(p => canClientViewProposalMiniTasks(p.status));
          if (accepted) {
            setProposal(accepted);
          } else {
            setProposal(null);
          }
          const filteredList = enrichedList.filter(
            (p) => p.status?.toLowerCase() !== "declined" && !(p.status?.toLowerCase() === "pending" && (Number(p.bidAmount) || 0) === 0)
          );
          setProposalsList(filteredList);

          // Sync viewedProposal with newly updated DB data
          setViewedProposal(prev => {
            if (!prev) return null;
            const updated = enrichedList.find(p => p.id === prev.id);
            return updated || prev;
          });
        }
      } catch (err) {
        console.error("Failed to fetch proposals:", err);
      } finally {
        if (!cancelled) setPropLoading(false);
      }
    }

    fetchProposals();
    return () => { cancelled = true; };
  }, [view, selectedProject?.id, dbUpdateVersion]);

  const handleUpdateStatus = async (proposalId, status) => {
    setActionLoading(true);
    try {
      await api.proposals.updateStatus(proposalId, status);
      toast.success(`Proposal has been successfully ${status.toLowerCase()}!`);
      
      setProposal((prev) => prev ? { ...prev, status: status } : null);
      
      // Reload projects to update counts and statuses
      await loadProjects();
    } catch (err) {
      toast.error(err.message || "Failed to update proposal status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineProposal = async (proposalId) => {
    setActionLoading(true);
    try {
      await api.proposals.updateStatus(proposalId, "Declined");
      toast.success("Proposal declined successfully.");
      
      // Update local state immediately
      setProposalsList((prev) => prev.filter((p) => p.id !== proposalId));
      if (viewedProposal?.id === proposalId) {
        setViewedProposal(null);
      }
      setProposal(null);

      await loadProjects();
      setDbUpdateVersion(prev => prev + 1);
    } catch (err) {
      toast.error(err.message || "Failed to decline proposal.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptProposal = async (p) => {
    setActionLoading(true);
    try {
      // 1. Update Proposal status to pending_pay on Backend
      await api.proposals.updateStatus(p.id, "pending_pay");

      // 2. Create project from proposal on Backend to generate actual projectId
      try {
        await api.projects.createFromProposal(p.id);
      } catch (projErr) {
        console.warn("Failed to create project from proposal, continuing anyway:", projErr);
      }

      try {
        const skillsList = selectedProject?.jobPostSkills || selectedProject?.JobPostSkills || [];
        const rawSkillIds = skillsList.map(s => s.skillsId || s.SkillsId || s.skillId || s.skill?.id || s.skill?.Id || s.Skill?.id || s.Skill?.Id).filter(Boolean);
        const validSkillIds = rawSkillIds.filter(id => typeof id === "string" && id.match(/^[0-9a-fA-F-]{36}$/));

        const updatePayload = {};
        if (selectedProject?.title) updatePayload.title = selectedProject.title;
        if (selectedProject?.description) updatePayload.description = selectedProject.description;
        if (selectedProject?.budget && selectedProject.budget > 0) updatePayload.budget = selectedProject.budget;

        const dId = selectedProject?.domainId || selectedProject?.domain?.id || selectedProject?.Domain?.Id;
        if (dId && typeof dId === "string" && dId.match(/^[0-9a-fA-F-]{36}$/)) updatePayload.domainId = dId;

        const sId = selectedProject?.specializationId || selectedProject?.specialization?.id || selectedProject?.Specialization?.Id;
        if (sId && typeof sId === "string" && sId.match(/^[0-9a-fA-F-]{36}$/)) updatePayload.specializationId = sId;

        if (validSkillIds.length > 0) updatePayload.skillIds = validSkillIds;

        if (selectedProject?.id && Object.keys(updatePayload).length > 0) {
          await api.jobPosts.update(selectedProject.id, updatePayload);
        }
      } catch (jobUpdateErr) {
        console.warn("Failed to update job post metadata, continuing anyway:", jobUpdateErr);
      }
      
      toast.success("Proposal accepted successfully. Please set up escrow to start the project.");

      // Notify selected expert + reject others
      const otherProposals = proposalsList.filter(prop => prop.id !== p.id);
      notifyProposalDecision({
        selectedExpertId: p.expertId,
        clientName: user?.fullName || user?.name || "Client",
        jobTitle: selectedProject?.title || "Project",
        proposalId: p.id,
        otherProposals: otherProposals.map(op => ({ id: op.id, expertId: op.expertId })),
      }).catch(() => {});

      // 3. Update local state to pending_pay to display escrow button
      const acceptedProposal = { ...p, status: "pending_pay" };
      setProposal(acceptedProposal);
      setViewedProposal(acceptedProposal);
      setProposalsList(prev => prev.map(item => item.id === p.id ? acceptedProposal : item));

      setShowEscrowConfirm(false);
      await loadProjects();
      setDbUpdateVersion(prev => prev + 1);
    } catch (err) {
      console.error("Failed to accept proposal:", err);
      toast.error(err.message || "Failed to accept proposal.");
    } finally {
      setActionLoading(false);
    }
  };

  const getProposalStatusBadgeClass = (status) => {
    const s = status?.toLowerCase();
    if (s === "accepted") return "bg-success-light text-success border-success/20 border";
    if (s === "declined") return "bg-destructive-light text-destructive border-destructive/20 border";
    if (s === "under_review" || s === "under review") return "bg-brand-primary-light text-brand-primary border-accent/25 border";
    if (s === "pending_escrow" || s === "pending escrow" || s === "pending_pay" || s === "pending pay") return "bg-warning-light text-warning border-warning/20 border";
    return "bg-warning-light text-warning border-warning/20 border";
  };

  const handleBackToList = () => {
    setView("list");
    setSelectedProject(null);
    setProposal(null);
    setProposalsList([]);
    setViewedProposal(null);
    setShowEscrowConfirm(false);
    navigate("/client/my-projects", { replace: true });
  };

  // =========================================================================
  // VIEW: DETAILS
  // =========================================================================
  if (view === "details" && selectedProject) {
    const skills = selectedProject.jobPostSkills?.map((s) => s.skill?.name || s.skillName || s.skill?.Name).filter(Boolean) || selectedProject.requiredSkills || [];
    const deadlineText = (() => {
      if (!selectedProject.deadline) return "N/A";

      // Check for extended project deadline from localStorage
      const projId = selectedProject.projectId || selectedProject.id;
      if (projId) {
        const localDeadline = localStorage.getItem(`project_deadline_${projId}`);
        if (localDeadline) {
          return safeDateFormat(localDeadline, {
            year: "numeric",
            month: "short",
            day: "numeric",
          }, String(localDeadline));
        }
      }

      const num = Number(selectedProject.deadline);
      if (!Number.isNaN(num) && num < 1000) {
        const startDate = new Date(selectedProject.createdAt || selectedProject.CreatedAt || Date.now());
        if (!Number.isNaN(startDate.getTime())) {
          const deadlineDate = new Date(startDate.getTime() + num * 24 * 60 * 60 * 1000);
          return safeDateFormat(deadlineDate.toISOString(), {
            year: "numeric",
            month: "short",
            day: "numeric",
          }, `${num} days`);
        }
        return `${num} days`;
      }
      return safeDateFormat(selectedProject.deadline, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }, String(selectedProject.deadline));
    })();

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Back Button */}
        <button
          onClick={handleBackToList}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Projects
        </button>

        {showInviteSuccessBanner && (
          <div className="p-4 bg-success-light border border-success/20 text-success rounded-xl flex items-center justify-between shadow-sm animate-fade-in">
            <span className="font-semibold text-sm">
              Successfully invited expert {invitedExpertName ? `"${invitedExpertName}" ` : ""}
            </span>
            <button
              onClick={() => setShowInviteSuccessBanner(false)}
              className="text-success hover:text-success transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden p-8 space-y-6">
          <div className="flex items-start justify-between flex-wrap gap-4 border-b border-border/60 pb-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground mb-2">{selectedProject.title}</h1>
              <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-brand-primary-light text-brand-primary">
                Status: {selectedProject.status}
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</h4>
            <p className="text-base text-foreground/80 leading-relaxed whitespace-pre-wrap">{selectedProject.description}</p>
          </div>

          {safeArray(selectedProject.useCases).length > 0 && (
            <div className="border-t border-border/60 pt-6">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Project User Stories</h4>
              <div className="space-y-3">
                {safeArray(selectedProject.useCases).map((uc, i) => (
                  <div key={i} className="p-4 bg-secondary/60 border border-border rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-sm text-left">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">
                        User Story {i + 1}: <span className="font-semibold text-foreground/80">{uc.title || uc.nameAndDeadline || `User Story #${i + 1}`}</span>
                      </p>
                      {uc.description && (
                        <p className="text-muted-foreground leading-relaxed pl-3 border-l-2 border-border mt-1">
                          Description: {uc.description}
                        </p>
                      )}
                    </div>
                    {(uc.originalDurationDays || uc.durationDays) && (
                      <span className="px-2.5 py-1.5 bg-accent/10 text-accent font-semibold rounded-lg whitespace-nowrap self-start sm:self-center text-xs">
                        Duration: {uc.originalDurationDays || uc.durationDays} days
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Category</h4>
              <p className="text-base text-foreground font-medium">{selectedProject.domain?.name || selectedProject.category || "N/A"}</p>
            </div>
            {(selectedProject.specialization || selectedProject.specializationName) && (
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Specialization / Area of expertise</h4>
                <p className="text-base text-foreground font-medium">{selectedProject.specialization?.name || selectedProject.specializationName || selectedProject.specialization}</p>
              </div>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Required Skills</h4>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill) => (
                  <span key={skill} className="px-2.5 py-0.5 bg-secondary text-muted-foreground rounded-md text-xs font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No required skills listed.</p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-border/60 pt-6">
            <div>
              <h4 className="text-sm text-muted-foreground mb-0.5">Budget</h4>
              <p className="font-semibold text-foreground"><MoneyDisplay amount={selectedProject.budget} /></p>
            </div>
            <div>
              <h4 className="text-sm text-muted-foreground mb-0.5">Timeline Root</h4>
              <p className="font-semibold text-foreground">
                {safeArray(selectedProject.useCases).reduce((sum, uc) => sum + (Number(uc.originalDurationDays || uc.durationDays) || 0), 0)} days
              </p>
            </div>
            <div>
              <h4 className="text-sm text-muted-foreground mb-0.5">Deadline</h4>
              <p className="font-semibold text-foreground">{deadlineText}</p>
            </div>
            <div>
              <h4 className="text-sm text-muted-foreground mb-0.5">Posted On</h4>
              <p className="font-semibold text-foreground">
                {safeDateFormat(selectedProject.createdAt, { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>

          <div className="border-t border-border/60 pt-6">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Expert</h4>
            <p className="text-base text-foreground font-semibold">
              {selectedProject.assignedExpert
                ? selectedProject.assignedExpert.fullName
                : (selectedProject.acceptedExpertName || (invitedExpertName ? `${invitedExpertName} (Invited)` : "Not Assigned"))}
            </p>
          </div>

          {/* Project Attachments */}
          <div className="border-t border-border/60 pt-6">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Project Attachments</h4>
            {(() => {
              const cached = selectedProject._attachments;
              const rawBE = selectedProject.attachmentUrl || selectedProject.AttachmentUrl;
              let files = [];
              if (Array.isArray(cached) && cached.length > 0) {
                files = cached;
              } else if (typeof rawBE === "string" && rawBE.trim().length > 0) {
                try {
                  const parsed = JSON.parse(rawBE);
                  files = Array.isArray(parsed) ? parsed : [{ name: rawBE.split("/").pop(), url: rawBE }];
                } catch {
                  files = [{ name: rawBE.split("/").pop(), url: rawBE }];
                }
              }

              // Deduplicate files by url
              const uniqueFiles = [];
              const seenUrls = new Set();
              for (const f of files) {
                const rawU = typeof f === "string" ? f : (f.url || f.Url || f.name);
                if (rawU && !seenUrls.has(rawU)) {
                  seenUrls.add(rawU);
                  uniqueFiles.push(f);
                }
              }

              if (uniqueFiles.length === 0) {
                return <p className="text-sm text-muted-foreground italic">None</p>;
              }
              return (
                <div className="flex flex-wrap gap-2">
                  {uniqueFiles.map((file, idx) => {
                    const rawUrl = typeof file === "string" ? file : (file.url || file.Url || "#");
                    const fileUrl = rawUrl.startsWith("http") ? rawUrl : enrichFileUrl(rawUrl);
                    const rawFileName = (typeof file === "object" ? file.name : null) || rawUrl;
                    const finalName = cleanFileName(rawFileName);

                    const handleDownloadFile = (e) => {
                      e.preventDefault();
                      if (!fileUrl || fileUrl === "#") return;
                      downloadFile(fileUrl, finalName);
                    };

                    return (
                      <a
                        key={idx}
                        href={fileUrl}
                        onClick={handleDownloadFile}
                        download={finalName}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary/80 hover:bg-secondary border border-border rounded-lg text-xs font-medium text-foreground/80 hover:text-foreground transition-colors cursor-pointer max-w-full overflow-hidden"
                        title={`Download ${finalName}`}
                      >
                        <FileIcon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate max-w-[240px] sm:max-w-[320px] block">{finalName}</span>
                      </a>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: PROPOSALS
  // =========================================================================
  if (view === "proposals" && selectedProject) {
    const isAcceptedView = !!proposal;

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Back Button */}
        <button
          onClick={handleBackToList}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Projects
        </button>

        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden p-8">
          <div className="border-b border-border/60 pb-4 mb-6">
            <h1 className="text-2xl font-semibold text-foreground">
              {isAcceptedView 
                ? `Proposal connected to: ${selectedProject.title}`
                : `Proposals list for: ${selectedProject.title}`
              }
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isAcceptedView
                ? "Reviewing the single expert connection for this project"
                : "Select an expert's proposal to review and accept/decline"
              }
            </p>
          </div>

          {propLoading ? (
            <div className="py-12 text-center text-muted-foreground animate-pulse font-medium">
              Loading proposals information...
            </div>
          ) : isAcceptedView ? (
            <div className="space-y-6">
              {/* Proposal Header Card */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-border/60 pb-6 gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{proposal.proposalTitle}</h3>
                  <p className="text-base text-muted-foreground mt-1">
                    Expert: <span className="font-semibold text-foreground/80">{proposal.expertName}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">{proposal.expertTitle}</p>
                </div>
                <div className="flex flex-col items-start md:items-end gap-1.5">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getProposalStatusBadgeClass(proposal.status)}`}>
                    {proposal.status === "pending_escrow" || proposal.status === "pending escrow" || proposal.status === "pending_pay" || proposal.status === "pending pay" ? "Pending Payment" : proposal.status}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Submitted {safeDateFormat(proposal.createdAt, { month: "short", day: "numeric", year: "numeric" }, "-")}
                  </p>
                </div>
              </div>

              {/* Quick stats row */}
              <div className="grid grid-cols-2 gap-4 bg-secondary/60 rounded-xl p-4 border border-border/60">
                <div>
                  <p className="text-sm text-muted-foreground mb-0.5 font-medium">Bid Amount</p>
                  <p className="font-semibold text-foreground"><MoneyDisplay amount={proposal.bidAmount} /></p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-0.5 font-medium">Estimated Duration</p>
                  <p className="font-semibold text-foreground">
                    {(Number(proposal?.durationDays) || 0) +
                      (Number(
                        localStorage.getItem(`project_extra_days_${proposal?.projectId}`) ||
                        localStorage.getItem(`project_extra_days_${proposal?.project?.id}`) ||
                        localStorage.getItem(`project_extra_days_${proposal?.jobPostId}`) ||
                        0
                      ) || 0)}{" "}
                    days
                  </p>
                </div>
              </div>

              {/* Sections */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-1">Professional Introduction</h4>
                  <p className="text-base text-foreground/80 leading-relaxed mt-2 whitespace-pre-wrap">
                    {proposal.coverLetter || "No introduction provided."}
                  </p>
                </div>

                {proposal.technicalApproach && (
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-1">Technical Approach & Methodology</h4>
                    <p className="text-base text-foreground/80 leading-relaxed mt-2 whitespace-pre-wrap">
                      {proposal.technicalApproach}
                    </p>
                  </div>
                )}

                {proposal.tasks && proposal.tasks.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-1 mb-3">Tasks & Milestones Breakdown</h4>
                    {selectedProject?.useCases && selectedProject.useCases.length > 0 ? (
                      <div className="space-y-6 mt-3">
                        {selectedProject.useCases.map((uc, ucIdx) => {
                          const ucTasks = proposal.tasks.filter(t => t.useCaseId === uc.id);
                          return (
                            <div key={uc.id} className="border border-border rounded-xl overflow-hidden bg-card">
                              <div className="p-4 bg-accent-light/30 border-b border-border flex flex-col gap-1.5 text-left w-full">
                                <div className="flex items-start justify-between flex-wrap gap-2 w-full">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-foreground text-sm">
                                      User story: {uc.title || uc.nameAndDeadline}
                                    </span>
                                  </div>
                                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full whitespace-nowrap self-start">
                                    {uc.originalDurationDays || 1} days
                                  </span>
                                </div>
                                {uc.description && (
                                  <p className="text-xs text-muted-foreground italic pl-3 border-l-2 border-border">
                                    Description: {uc.description}
                                  </p>
                                )}
                              </div>

                              <div className="p-4 space-y-4">
                                {ucTasks.length === 0 ? (
                                  <p className="text-xs text-muted-foreground italic text-center py-2 text-left">No tasks proposed for this use case.</p>
                                ) : (
                                  ucTasks.map((task, idx) => (
                                    <div key={task.id || idx} className="p-4 bg-secondary/30 border border-border rounded-xl space-y-3 text-left">
                                      {/* Task Title Row */}
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Task Title:</span>
                                        <span className="text-sm font-semibold text-foreground">{task.title || `Task #${idx + 1}`}</span>
                                      </div>

                                      {renderMiniTasksToggle(task, proposal.status, `accepted-uc-${uc.id || ucIdx}`, idx)}
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Fallback to flat list */
                      <div className="space-y-3 mt-2">
                        {proposal.tasks.map((task, idx) => (
                          <div key={task.id || idx} className="p-4 bg-secondary/50 border border-border rounded-xl space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Task Title:</span>
                              <span className="text-sm font-semibold text-foreground">{task.title || `Task #${idx + 1}`}</span>
                            </div>

                            {renderMiniTasksToggle(task, proposal.status, "accepted-flat", idx)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  proposal.timelineMilestones && (
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-1">Timeline & Milestones</h4>
                      <p className="text-base text-foreground/80 leading-relaxed mt-2 whitespace-pre-wrap">
                        {proposal.timelineMilestones}
                      </p>
                    </div>
                  )
                )}

                {proposal.dependencies && (
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-1">Dependencies & Requirements</h4>
                    <p className="text-base text-foreground/80 leading-relaxed mt-2 whitespace-pre-wrap">
                      {proposal.dependencies}
                    </p>
                  </div>
                )}

                {/* Attached Assets for Client (Single Accepted Proposal Detail) */}
                {proposal.attachments && proposal.attachments.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-1 mb-2">Attached Assets ({proposal.attachments.length})</h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {proposal.attachments.map((att, idx) => {
                        const rawUrl = att.url ? (att.url.startsWith("http") ? att.url : enrichFileUrl(att.url)) : "#";
                        let rawName = typeof att === "object" ? (att.name || att.Name || att.originalName || att.fileName) : null;
                        const finalName = cleanFileName(rawName || rawUrl);

                        const handleDownloadFile = (e) => {
                          e.preventDefault();
                          if (!rawUrl || rawUrl === "#") return;
                          downloadFile(rawUrl, finalName);
                        };

                        return (
                          <a
                            key={att.id || idx}
                            href={rawUrl}
                            onClick={handleDownloadFile}
                            download={finalName}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary/80 hover:bg-secondary border border-border rounded-lg text-xs font-medium text-foreground/80 hover:text-foreground transition-colors cursor-pointer max-w-full overflow-hidden"
                            title={`Download ${finalName}`}
                          >
                            <FileIcon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate max-w-[240px] sm:max-w-[320px] block">{finalName}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Escrow payment direct button for single accepted proposal */}
              {(proposal.status?.toLowerCase() === "pending_escrow" || proposal.status?.toLowerCase() === "pending escrow" || proposal.status?.toLowerCase() === "pending_pay" || proposal.status?.toLowerCase() === "pending pay") && (
                <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm text-left">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Escrow Setup</h3>
                  
                  <div className="flex items-start gap-2.5 pt-2">
                    <input
                      type="checkbox"
                      id="agreeEscrowSingle"
                      defaultChecked={true}
                      className="mt-1 w-4 h-4 rounded border-input text-brand-primary focus:ring-brand-primary/50"
                    />
                    <label htmlFor="agreeEscrowSingle" className="text-sm text-foreground/80 font-medium">
                      Confirm that you want to deposit <span className="font-semibold"><MoneyDisplay amount={proposal.bidAmount} /></span> into escrow to start this project.
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const checked = document.getElementById("agreeEscrowSingle")?.checked;
                      if (!checked) {
                        toast.error("Please check the confirmation box before proceeding!");
                        return;
                      }
                      navigate("/client/billing", {
                        state: {
                          escrowRedirect: true,
                          projectId: selectedProject.projectId || selectedProject.id,
                          projectTitle: selectedProject.title,
                          amount: proposal.bidAmount,
                          proposalId: proposal.id,
                          expertId: proposal.expertId
                        }
                      });
                    }}
                    className="h-10 px-4 bg-brand-primary text-brand-primary-foreground rounded-xl text-[15px] font-semibold hover:bg-brand-primary-hover transition-colors"
                  >
                    Confirm Escrow Deposit
                  </button>
                </div>
              )}
              
              {proposal.status?.toLowerCase() === "accepted" && (
                <div className="pt-6 border-t border-border/60 flex items-center justify-end gap-3">
                  <Link
                    to={`/client/projects/${selectedProject.projectId || selectedProject.id}`}
                    className="h-10 px-4 bg-success text-success-foreground rounded-xl hover:opacity-90 text-[15px] font-semibold transition-all inline-flex items-center gap-2"
                  >
                    <Briefcase className="w-4 h-4" /> Manage Project Progress
                  </Link>
                  <Link
                    to={`/messenger/${proposal.expertId}`}
                    className="h-10 px-4 border border-border text-foreground rounded-xl hover:bg-secondary text-[15px] font-semibold transition-all inline-flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" /> Contact Expert
                  </Link>
                </div>
              )}
            </div>
          ) : proposalsList.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground italic font-medium">
              No proposals have been submitted for this project yet.
            </div>
          ) : viewedProposal === null ? (
            /* Proposals list view */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider text-left">
                  Submitted Proposals ({proposalsList.length})
                </h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Search expert name..."
                    value={propSearch}
                    onChange={(e) => setPropSearch(e.target.value)}
                    className="h-10 px-3 border border-input rounded-xl bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-accent text-sm"
                  />
                  <select
                    value={propSort}
                    onChange={(e) => setPropSort(e.target.value)}
                    className="h-10 px-3 border border-input rounded-xl bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-accent text-sm cursor-pointer"
                  >
                    <option value="recent">Newest</option>
                    <option value="lowest_bid">Lowest Bid</option>
                    <option value="highest_bid">Highest Bid</option>
                    <option value="fastest">Fastest (Days)</option>
                  </select>
                </div>
              </div>
              <div className="space-y-3">
                {proposalsList
                  .filter((p) => {
                    if (!propSearch.trim()) return true;
                    return p.expertName?.toLowerCase().includes(propSearch.toLowerCase());
                  })
                  .sort((a, b) => {
                    if (propSort === "lowest_bid") return Number(a.bidAmount) - Number(b.bidAmount);
                    if (propSort === "highest_bid") return Number(b.bidAmount) - Number(a.bidAmount);
                    if (propSort === "fastest") return Number(a.durationDays) - Number(b.durationDays);
                    // default recent
                    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                  })
                  .map((p) => {
                  return (
                    <div
                      key={p.id}
                      className="p-5 rounded-2xl border bg-card border-border hover:border-input transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="text-left">
                        <h4 className="font-semibold text-foreground text-base">{p.expertName}</h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                          {p.expertCategory && (
                            <span className="font-medium">Category: {p.expertCategory}</span>
                          )}
                          {p.expertSpecialization && (
                            <>
                              <span className="text-muted-foreground/30">|</span>
                              <span className="font-medium">Specialization: {p.expertSpecialization}</span>
                            </>
                          )}
                        </div>
                        {p.expertSkills?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {p.expertSkills.slice(0, 4).map((skill, i) => (
                              <span key={i} className="px-2 py-0.5 bg-secondary text-muted-foreground rounded-md text-[10px] font-medium">
                                {skill}
                              </span>
                            ))}
                            {p.expertSkills.length > 4 && (
                              <span className="text-[10px] text-muted-foreground font-medium">+{p.expertSkills.length - 4}</span>
                            )}
                          </div>
                        )}
                        <p className="text-base font-semibold text-brand-primary mt-2">
                          Bid: <MoneyDisplay amount={p.bidAmount} /> - {p.durationDays} days
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>
                            Success Rate: {p.expertSuccessRate != null ? `${p.expertSuccessRate}%` : "N/A"}
                          </span>
                          <span className="text-muted-foreground/40">|</span>
                          <span>
                            Evaluate: {p.expertEvaluate != null && Number(p.expertEvaluate) > 0 ? p.expertEvaluate : "None"}
                          </span>
                        </div>
                        {p.createdAt && (
                          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5 font-medium">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            Submitted: {safeDateFormat(p.createdAt, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setViewedProposal(p);
                            setShowEscrowConfirm(false);
                          }}
                          className="h-10 px-4 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-foreground text-sm font-medium rounded-lg transition-colors border border-brand-primary"
                        >
                          View Proposal
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Proposal Details page (swapped flow, replaces the list view) */
            <div className="space-y-6 text-left">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-border/60 pb-6 gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Proposal</h3>
                  <p className="text-base text-muted-foreground mt-1">
                    Expert: <span className="font-semibold text-foreground/80">{viewedProposal.expertName}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">{viewedProposal.expertTitle}</p>
                </div>
                <div className="flex flex-col items-start md:items-end gap-1.5">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getProposalStatusBadgeClass(viewedProposal.status)}`}>
                    {viewedProposal.status}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Submitted {safeDateFormat(viewedProposal.createdAt, { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }, "-")}
                  </p>
                </div>
              </div>

              {/* Quick stats row */}
              <div className="grid grid-cols-2 gap-4 bg-secondary/60 rounded-xl p-4 border border-border/60">
                <div>
                  <p className="text-sm text-muted-foreground mb-0.5 font-medium">Bid Amount</p>
                  <p className="font-semibold text-foreground"><MoneyDisplay amount={viewedProposal.bidAmount} /></p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-0.5 font-medium">Estimated Duration</p>
                  <p className="font-semibold text-foreground">
                    {(Number(viewedProposal?.durationDays) || 0) +
                      (Number(
                        localStorage.getItem(`project_extra_days_${viewedProposal?.projectId}`) ||
                        localStorage.getItem(`project_extra_days_${viewedProposal?.project?.id}`) ||
                        localStorage.getItem(`project_extra_days_${viewedProposal?.jobPostId}`) ||
                        0
                      ) || 0)}{" "}
                    days
                  </p>
                </div>
              </div>

              {/* Sections */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-1">Professional Introduction</h4>
                  <p className="text-base text-foreground/80 leading-relaxed mt-2 whitespace-pre-wrap">
                    {viewedProposal.coverLetter || "No introduction provided."}
                  </p>
                </div>

                {viewedProposal.technicalApproach && (
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-1">Technical Approach & Methodology</h4>
                    <p className="text-base text-foreground/80 leading-relaxed mt-2 whitespace-pre-wrap">
                      {viewedProposal.technicalApproach}
                    </p>
                  </div>
                )}

                {viewedProposal.tasks && viewedProposal.tasks.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-1 mb-3">Tasks & Milestones Breakdown</h4>
                    {selectedProject?.useCases && selectedProject.useCases.length > 0 ? (
                      <div className="space-y-6 mt-3">
                        {selectedProject.useCases.map((uc, ucIdx) => {
                          const ucTasks = viewedProposal.tasks.filter(t => t.useCaseId === uc.id);
                          return (
                            <div key={uc.id} className="border border-border rounded-xl overflow-hidden bg-card">
                              <div className="p-4 bg-accent-light/30 border-b border-border flex flex-col gap-1.5 text-left w-full">
                                <div className="flex items-start justify-between flex-wrap gap-2 w-full">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-foreground text-sm">
                                      User story: {uc.title || uc.nameAndDeadline}
                                    </span>
                                  </div>
                                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full whitespace-nowrap self-start">
                                    {uc.originalDurationDays || 1} days
                                  </span>
                                </div>
                                {uc.description && (
                                  <p className="text-xs text-muted-foreground italic pl-3 border-l-2 border-border">
                                    Description: {uc.description}
                                  </p>
                                )}
                              </div>

                              <div className="p-4 space-y-4">
                                {ucTasks.length === 0 ? (
                                  <p className="text-xs text-muted-foreground italic text-center py-2 text-left">No tasks proposed for this use case.</p>
                                ) : (
                                  ucTasks.map((task, idx) => (
                                    <div key={task.id || idx} className="p-4 bg-secondary/30 border border-border rounded-xl space-y-3 text-left">
                                      {/* Task Title Row */}
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Task Title:</span>
                                        <span className="text-sm font-semibold text-foreground">{task.title || `Task #${idx + 1}`}</span>
                                      </div>

                                      {renderMiniTasksToggle(task, viewedProposal.status, `viewed-uc-${uc.id || ucIdx}`, idx)}
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Fallback to flat list */
                      <div className="space-y-3 mt-2">
                        {viewedProposal.tasks.map((task, idx) => (
                          <div key={task.id || idx} className="p-4 bg-secondary/50 border border-border rounded-xl space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Task Title:</span>
                              <span className="text-sm font-semibold text-foreground">{task.title || `Task #${idx + 1}`}</span>
                            </div>

                            {renderMiniTasksToggle(task, viewedProposal.status, "viewed-flat", idx)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  viewedProposal.timelineMilestones && (
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-1">Timeline & Milestones</h4>
                      <p className="text-base text-foreground/80 leading-relaxed mt-2 whitespace-pre-wrap">
                        {viewedProposal.timelineMilestones}
                      </p>
                    </div>
                  )
                )}

                {viewedProposal.dependencies && (
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-1">Dependencies & Requirements</h4>
                    <p className="text-base text-foreground/80 leading-relaxed mt-2 whitespace-pre-wrap">
                      {viewedProposal.dependencies}
                    </p>
                  </div>
                )}

                {/* Attached Assets for Client (ViewedProposal Detail) */}
                {viewedProposal.attachments && viewedProposal.attachments.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-1 mb-2">Attached Assets ({viewedProposal.attachments.length})</h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {viewedProposal.attachments.map((att, idx) => {
                        const rawUrl = att.url ? (att.url.startsWith("http") ? att.url : enrichFileUrl(att.url)) : "#";
                        let rawName = typeof att === "object" ? (att.name || att.Name || att.originalName || att.fileName) : null;
                        const finalName = cleanFileName(rawName || rawUrl);

                        const handleDownloadFile = (e) => {
                          e.preventDefault();
                          if (!rawUrl || rawUrl === "#") return;
                          downloadFile(rawUrl, finalName);
                        };

                        return (
                          <a
                            key={att.id || idx}
                            href={rawUrl}
                            onClick={handleDownloadFile}
                            download={finalName}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary/80 hover:bg-secondary border border-border rounded-lg text-xs font-medium text-foreground/80 hover:text-foreground transition-colors cursor-pointer max-w-full overflow-hidden"
                            title={`Download ${finalName}`}
                          >
                            <FileIcon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate max-w-[240px] sm:max-w-[320px] block">{finalName}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="pt-6 border-t border-border/60 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => handleDeclineProposal(viewedProposal.id)}
                  className="h-10 px-4 bg-destructive hover:bg-destructive text-primary-foreground rounded-xl text-[15px] font-semibold transition-all"
                >
                  Decline Proposal
                </button>
                <button
                  type="button"
                  onClick={() => handleAcceptProposal(viewedProposal)}
                  className="h-10 px-4 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-foreground rounded-xl text-[15px] font-semibold transition-all"
                >
                  Accept Proposal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: LIST
  // =========================================================================
  const STATUS_OPTIONS = [
    { value: "", label: "All" },
    { value: "Open", label: "Open" },
    { value: "In Progress", label: "In Progress" },
    { value: "Completed", label: "Complete" },
    { value: "Disputed", label: "Disputed" },
    { value: "Cancel", label: "Cancel" },
  ];

  const filteredProjects = projects.filter((project) => {
    const norm = getNormalizedStatus(project, activeReports);
    if (statusFilter) {
      return norm.label === statusFilter;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PageHeader
        title="All Projects"
        subtitle="Manage your posted projects"
        actions={(
          <div className="page-filter-controls">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-muted-foreground">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 px-3 border border-input rounded-xl bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-accent text-sm cursor-pointer"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <Link
              to="/client/post-project"
              className="h-10 px-4 bg-brand-primary text-brand-primary-foreground rounded-xl hover:bg-brand-primary-hover text-[15px] font-medium inline-flex items-center gap-2 transition-colors"
            >
              <PlusCircle className="w-4 h-4" /> Post New Project
            </Link>
          </div>
        )}
      />

      {loading ? (
        <div className="py-8">
          <LoadingSkeleton variant="dashboard" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-muted-foreground/30" />
          </div>
          <h3 className="text-lg font-semibold text-foreground/60 mb-2">
            No projects yet
          </h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
            Post your first project to find the right AI expert for your needs.
          </p>
          <Link
            to="/client/post-project"
            className="h-10 px-4 bg-brand-primary text-brand-primary-foreground rounded-xl hover:bg-brand-primary-hover text-[15px] font-medium"
          >
            Post a Project
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-4">
            {filteredProjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((project) => {
            const { label: displayStatus, badgeClass } = getNormalizedStatus(project, activeReports);
            const category = project.category || project.domain?.name;
            
            const skills = project.projectSkills?.map((s) => s.skillName) || project.jobPostSkills?.map((s) => s.skill?.name) || project.requiredSkills || [];
            const deadlineText = (() => {
              if (!project.deadline) return null;

              // Check for extended project deadline from localStorage
              const pId = project.projectId || project.id;
              if (pId) {
                const localDeadline = localStorage.getItem(`project_deadline_${pId}`);
                if (localDeadline) {
                  return safeDateFormat(localDeadline, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  }, String(localDeadline));
                }
              }

              const num = Number(project.deadline);
              if (!Number.isNaN(num) && num < 1000) {
                const startDate = new Date(project.createdAt || project.CreatedAt || Date.now());
                if (!Number.isNaN(startDate.getTime())) {
                  const deadlineDate = new Date(startDate.getTime() + num * 24 * 60 * 60 * 1000);
                  return safeDateFormat(deadlineDate.toISOString(), {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  }, `${num} days`);
                }
                return `${num} days`;
              }
              return safeDateFormat(project.deadline, {
                year: "numeric",
                month: "short",
                day: "numeric",
              }, String(project.deadline));
            })();

            return (
              <div
                key={project.id}
                className="bg-card rounded-xl border border-border hover:border-border/80 p-6 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-lg leading-snug text-foreground">
                        {project.title}
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {project.domain?.name || "Artificial Intelligence"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span
                      className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${badgeClass}`}
                    >
                      {displayStatus}
                    </span>
                  </div>
                </div>


                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 bg-secondary/40 rounded-lg p-3 border border-border/60">
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-muted-foreground tracking-[0.04em]">Posted</span>
                    <span className="font-medium text-foreground text-sm">
                      {safeDateFormat(project.createdAt, { month: "long", day: "numeric", year: "numeric" }, "May 1, 2026")}
                    </span>
                  </div>
                  {deadlineText && (
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-muted-foreground tracking-[0.04em]">Deadline</span>
                      <span className="font-medium text-foreground text-sm">{deadlineText}</span>
                    </div>
                  )}
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-muted-foreground tracking-[0.04em]">Budget</span>
                    <span className="font-semibold text-success text-sm">
                      <MoneyDisplay amount={project.budget} />
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-muted-foreground tracking-[0.04em]">Expert</span>
                    <span className="font-medium text-foreground text-sm">
                      {project.assignedExpert ? project.assignedExpert.fullName : "Not Assigned"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-3 border-t border-border gap-3">
                  <button
                    onClick={() => {
                      setSelectedProject(project);
                      setView("details");
                    }}
                    className="h-10 px-4 border border-border text-foreground rounded-lg hover:bg-secondary text-sm font-medium transition-all inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <FileText className="w-4 h-4" />
                    View Details
                  </button>

                  <button
                    onClick={() => {
                      setSelectedProject(project);
                      setView("proposals");
                    }}
                    className="h-10 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover text-sm font-medium transition-all inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Users className="w-4 h-4" />
                    View Proposal
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination Controls */}
        {Math.ceil(filteredProjects.length / itemsPerPage) > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-border mt-6">
            <span className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredProjects.length)} of {filteredProjects.length} projects
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-9 px-3 border border-border rounded-lg text-sm font-medium hover:bg-secondary disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.ceil(filteredProjects.length / itemsPerPage) }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                      currentPage === i + 1
                        ? "bg-brand-primary text-brand-primary-foreground shadow-sm"
                        : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredProjects.length / itemsPerPage), p + 1))}
                disabled={currentPage === Math.ceil(filteredProjects.length / itemsPerPage)}
                className="h-9 px-3 border border-border rounded-lg text-sm font-medium hover:bg-secondary disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
