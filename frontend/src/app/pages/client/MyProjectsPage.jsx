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
  File,
} from "lucide-react";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { LoadingSkeleton } from "../../components/shared/LoadingSkeleton.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { toast } from "sonner";
import api, { parseProposalWbs, enrichFileUrl } from "../../../services/api.js";
import { notifyProposalDecision } from "../../../services/notificationHelper.js";

import { getProjectProgress, deriveProjectStatusKey, getStatusLabel, getStatusBadgeClass, getOverallProgress } from "../../lib/projectTimelineStore.js";
import { safeArray, safeDateFormat } from "../../lib/safety.js";
import { cn } from "../../lib/utils.js";

export function getNormalizedStatus(project) {
  const localReleases = JSON.parse(localStorage.getItem("escrow_releases") || "[]");
  const projId = project.projectId || project.id || project.Id;
  const isReleasedLocally = projId ? localReleases.some(r => String(r.projectId).toLowerCase() === String(projId).toLowerCase()) : false;
  
  const localStatus = projId ? localStorage.getItem(`project_status_${projId}`) : null;
  const dbStatus = (project.status || project.Status || "").toLowerCase();
  const status = (localStatus || dbStatus).toLowerCase();

  let label = "In Progress";
  let badgeClass = "bg-blue-500/10 text-blue-500 border-blue-500/20";

  if (status === "completed" || status === "complete" || status === "resolved" || isReleasedLocally) {
    label = "Completed";
    badgeClass = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
  } else if (status === "cancelled" || status === "cancel" || status === "cancel_done" || status === "contract_cancelled" || status === "awaiting_cancellation") {
    label = "Cancel";
    badgeClass = "bg-red-500/10 text-red-500 border-red-500/20";
  } else if (status === "disputed") {
    label = "Disputed";
    badgeClass = "bg-red-100 text-red-700 border border-red-200 font-semibold";
  } else {
    const hasProjectRecord = !!project.projectId;
    const isPendingEscrow = status === "pending_escrow" || status === "pending" || dbStatus === "pending_escrow";

    const localDepositedIds = JSON.parse(localStorage.getItem("deposited_project_ids") || "[]");
    const isDeposited = projId ? localDepositedIds.some(id => String(id).toLowerCase() === String(projId).toLowerCase()) : false;

    if (!hasProjectRecord || isPendingEscrow || !isDeposited) {
      label = "Open";
      badgeClass = "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
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

  const [showInviteSuccessBanner, setShowInviteSuccessBanner] = useState(false);
  const [invitedExpertName, setInvitedExpertName] = useState("");

  async function loadProjects() {
    if (!user?.id) return;
    try {
      setLoading(true);
      let rawProjects = [];
      let activeProjectsList = [];
      try {
        const [jobsRes, projectsRes, transactionsList] = await Promise.all([
          api.jobPosts.getByClientId(user.id).catch(() => []),
          api.projects.getByClient(user.id).catch(() => []),
          api.payments.getTransactions(user.id).catch(() => [])
        ]);
        rawProjects = jobsRes;
        activeProjectsList = projectsRes;

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
      return;
    }
    let cancelled = false;

    async function fetchProposals() {
      setPropLoading(true);
      try {
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

            const parsed = parseProposalWbs(targetProp.implementation || targetProp.coverLetter, targetProp);

            const attachments = [];
            if (targetProp.portfolio) {
              const isImg = targetProp.portfolio.match(/\.(png|jpe?g|gif|webp)$/i);
              attachments.push({
                id: "portfolio-file",
                name: targetProp.portfolio.split("/").pop() || "Portfolio Document",
                type: isImg ? "image/png" : "document",
                fileType: isImg ? "image/png" : "document",
                url: enrichFileUrl(targetProp.portfolio)
              });
            }
            if (targetProp.attachmentUrl) {
              const isImg = targetProp.attachmentUrl.match(/\.(png|jpe?g|gif|webp)$/i);
              attachments.push({
                id: "attachment-file",
                name: targetProp.attachmentUrl.split("/").pop() || "Attached Document",
                type: isImg ? "image/png" : "document",
                fileType: isImg ? "image/png" : "document",
                url: enrichFileUrl(targetProp.attachmentUrl)
              });
            }

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
              expertTitle: expUser?.expertProfile?.jobTitle || "AI Expert",
            };
          })
        );

        if (!cancelled) {
          const accepted = enrichedList.find(p => ["accepted", "pending_escrow", "pending_pay", "in_progress", "completed", "active"].includes(p.status?.toLowerCase()));
          if (accepted) {
            setProposal(accepted);
          } else {
            setProposal(null);
          }
          const filteredList = enrichedList.filter(
            (p) => p.status?.toLowerCase() !== "declined" && !(p.status?.toLowerCase() === "pending" && (Number(p.bidAmount) || 0) === 0)
          );
          setProposalsList(filteredList);

          // Đồng bộ hóa viewedProposal với dữ liệu mới cập nhật từ DB
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
      toast.success("Proposal has been declined successfully!");
      
      // Cập nhật state local ngay lập tức
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
      // 1. Cập nhật Proposal status sang pending_pay trên Backend
      await api.proposals.updateStatus(p.id, "pending_pay");

      // 2. Tạo dự án từ proposal trên Backend để sinh ra projectId thực tế
      try {
        await api.projects.createFromProposal(p.id);
      } catch (projErr) {
        console.warn("Failed to create project from proposal, continuing anyway:", projErr);
      }

      try {
        const skillsList = selectedProject.jobPostSkills || selectedProject.JobPostSkills || [];
        const skillIds = skillsList.map(s => s.skillsId || s.SkillsId || s.skillId || s.skill?.id || s.skill?.Id || s.Skill?.id || s.Skill?.Id).filter(Boolean);

        await api.jobPosts.update(selectedProject.id, {
          title: selectedProject.title,
          description: selectedProject.description || "Project description",
          budget: selectedProject.budget || 100,
          deadline: selectedProject.deadline || 14,
          domainId: selectedProject.domainId || selectedProject.domain?.id || selectedProject.Domain?.Id || null,
          specializationId: selectedProject.specializationId || selectedProject.specialization?.id || selectedProject.Specialization?.Id || null,
          durationValue: selectedProject.durationValue || 0,
          durationUnit: selectedProject.durationUnit || "Days",
          skillIds: skillIds.length > 0 ? skillIds : (selectedProject.skillIds || selectedProject.SkillIds || [])
        });
      } catch (jobUpdateErr) {
        console.warn("Failed to update job post metadata, continuing anyway:", jobUpdateErr);
      }
      
      toast.success("Proposal has been accepted successfully! Please set up escrow to start the project.");

      // Notify selected expert + reject others
      const otherProposals = proposalsList.filter(prop => prop.id !== p.id);
      notifyProposalDecision({
        selectedExpertId: p.expertId,
        clientName: user?.fullName || user?.name || "Khách hàng",
        jobTitle: selectedProject?.title || "Dự án",
        proposalId: p.id,
        otherProposals: otherProposals.map(op => ({ id: op.id, expertId: op.expertId })),
      }).catch(() => {});

      // 3. Cập nhật local state sang pending_pay để hiển thị nút ký quỹ
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
    if (s === "accepted") return "bg-green-50 text-green-700 border-green-200 border";
    if (s === "declined") return "bg-red-50 text-red-700 border-red-200 border";
    if (s === "under_review" || s === "under review") return "bg-brand-primary-light text-brand-primary border-blue-200 border";
    if (s === "pending_escrow" || s === "pending escrow" || s === "pending_pay" || s === "pending pay") return "bg-amber-50 text-amber-700 border-amber-200 border";
    return "bg-yellow-50 text-yellow-700 border-yellow-200 border";
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
      const num = Number(selectedProject.deadline);
      if (!Number.isNaN(num) && num < 1000) return `${num} days`;
      return safeDateFormat(selectedProject.deadline, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }, String(selectedProject.deadline));
    })();

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={handleBackToList}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Projects
        </button>

        {showInviteSuccessBanner && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl flex items-center justify-between shadow-sm animate-fade-in">
            <span className="font-semibold text-sm">
              Bạn đã mời chuyên gia {invitedExpertName ? `"${invitedExpertName}" ` : ""}thành công
            </span>
            <button
              onClick={() => setShowInviteSuccessBanner(false)}
              className="text-green-650 hover:text-green-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden p-8 space-y-6">
          <div className="flex items-start justify-between flex-wrap gap-4 border-b border-border/60 pb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">{selectedProject.title}</h1>
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
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Project Timeline Root (Use Cases)</h4>
              <div className="space-y-3">
                {safeArray(selectedProject.useCases).map((uc, i) => (
                  <div key={i} className="p-4 bg-secondary/60 border border-border rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-sm text-left">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground">
                        Use Case #{i + 1}: <span className="font-semibold text-foreground/80">{uc.title || uc.nameAndDeadline || `Use Case #${i + 1}`}</span>
                      </p>
                      {uc.description && (
                        <p className="text-muted-foreground leading-relaxed pl-3 border-l-2 border-border mt-1">
                          {uc.description}
                        </p>
                      )}
                    </div>
                    {(uc.originalDurationDays || uc.durationDays) && (
                      <span className="px-2.5 py-1.5 bg-accent/10 text-accent font-bold rounded-lg whitespace-nowrap self-start sm:self-center text-xs">
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={handleBackToList}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Projects
        </button>

        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden p-8">
          <div className="border-b border-border/60 pb-4 mb-6">
            <h1 className="text-2xl font-bold text-foreground">
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
                  <h3 className="text-lg font-bold text-foreground">{proposal.proposalTitle}</h3>
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
                    Submitted {safeDateFormat(proposal.createdAt, { month: "short", day: "numeric", year: "numeric" }, "—")}
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
                  <p className="font-semibold text-foreground">{proposal.durationDays} days</p>
                </div>
              </div>

              {/* Sections */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-1">Professional Introduction</h4>
                  <p className="text-base text-foreground/80 leading-relaxed mt-2 whitespace-pre-wrap">
                    {proposal.coverLetter || "No introduction provided."}
                  </p>
                </div>

                {proposal.technicalApproach && (
                  <div>
                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-1">Technical Approach & Methodology</h4>
                    <p className="text-base text-foreground/80 leading-relaxed mt-2 whitespace-pre-wrap">
                      {proposal.technicalApproach}
                    </p>
                  </div>
                )}

                {proposal.tasks && proposal.tasks.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-1 mb-3">Tasks & Milestones Breakdown</h4>
                    {selectedProject?.useCases && selectedProject.useCases.length > 0 ? (
                      <div className="space-y-6 mt-3">
                        {selectedProject.useCases.map((uc) => {
                          const ucTasks = proposal.tasks.filter(t => t.useCaseId === uc.id);
                          return (
                            <div key={uc.id} className="border border-border rounded-xl overflow-hidden bg-card">
                              {/* ── Use Case Header ── */}
                              <div className="p-4 bg-accent-light/30 border-b border-border flex items-center justify-between flex-wrap gap-2 text-left">
                                <div className="flex items-center gap-2">
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

                              {/* ── Tasks ── */}
                              <div className="p-4 space-y-4">
                                {ucTasks.length === 0 ? (
                                  <p className="text-xs text-muted-foreground italic text-center py-2 text-left">No tasks proposed for this use case.</p>
                                ) : (
                                  ucTasks.map((task, idx) => (
                                    <div key={task.id || idx} className="p-4 bg-secondary/30 border border-border rounded-xl space-y-3 text-left">
                                      {/* Task Title Row */}
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Task Title:</span>
                                          <span className="text-sm font-bold text-foreground">{task.title || `Task #${idx + 1}`}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {task.completionDays && (
                                            <span className="text-xs px-2 py-0.5 bg-accent/10 text-accent rounded-full font-medium">
                                              {task.completionDays} days
                                            </span>
                                          )}
                                          {task.price != null && (
                                            <span className="text-xs px-2 py-0.5 bg-success/10 text-success rounded-full font-medium">
                                              <MoneyDisplay amount={task.price} />
                                            </span>
                                          )}
                                        </div>
                                      </div>
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
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Task Title:</span>
                                <span className="text-sm font-bold text-foreground">{task.title || `Task #${idx + 1}`}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {task.completionDays && (
                                  <span className="text-xs px-2 py-0.5 bg-accent/10 text-accent rounded-full font-medium">
                                    {task.completionDays} days
                                  </span>
                                )}
                                {task.price != null && (
                                  <span className="text-xs px-2 py-0.5 bg-success/10 text-success rounded-full font-medium">
                                    <MoneyDisplay amount={task.price} />
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  proposal.timelineMilestones && (
                    <div>
                      <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-1">Timeline & Milestones</h4>
                      <p className="text-base text-foreground/80 leading-relaxed mt-2 whitespace-pre-wrap">
                        {proposal.timelineMilestones}
                      </p>
                    </div>
                  )
                )}

                {proposal.dependencies && (
                  <div>
                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-1">Dependencies & Requirements</h4>
                    <p className="text-base text-foreground/80 leading-relaxed mt-2 whitespace-pre-wrap">
                      {proposal.dependencies}
                    </p>
                  </div>
                )}

                {/* Attached Assets for Client (Single Accepted Proposal Detail) */}
                {proposal.attachments && proposal.attachments.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-1 mb-2">Attached Assets ({proposal.attachments.length})</h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {proposal.attachments.map((att, idx) => {
                        const fileUrl = att.url ? (att.url.startsWith("http") ? att.url : `https://aitaskerbe-production.up.railway.app${att.url}`) : "#";
                        return (
                          <a
                            key={att.id || idx}
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary/80 hover:bg-secondary border border-border rounded-lg text-xs font-medium text-foreground/80 hover:text-foreground transition-colors"
                          >
                            <File className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{att.name || "Attached File"}</span>
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
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Hình thức ký quỹ (Escrow Setup)</h3>
                  
                  <div className="flex items-start gap-2.5 pt-2">
                    <input
                      type="checkbox"
                      id="agreeEscrowSingle"
                      defaultChecked={true}
                      className="mt-1 w-4 h-4 rounded border-input text-brand-primary focus:ring-brand-primary/50"
                    />
                    <label htmlFor="agreeEscrowSingle" className="text-sm text-foreground/80 font-medium">
                      Ký xác nhận rằng bạn có muốn ký quỹ số tiền <span className="font-bold"><MoneyDisplay amount={proposal.bidAmount} /></span> để thực hiện dự án này.
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const checked = document.getElementById("agreeEscrowSingle")?.checked;
                      if (!checked) {
                        toast.error("Vui lòng tích chọn ký xác nhận trước khi tiếp tục!");
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
                    className="h-11 px-5 bg-brand-primary text-brand-primary-foreground rounded-xl text-[15px] font-semibold hover:bg-brand-primary-hover transition-colors"
                  >
                    Xác nhận ký quỹ
                  </button>
                </div>
              )}
              
              {proposal.status?.toLowerCase() === "accepted" && (
                <div className="pt-6 border-t border-border/60 flex items-center justify-end gap-3">
                  <Link
                    to={`/client/projects/${selectedProject.projectId || selectedProject.id}`}
                    className="h-11 px-5 bg-success text-success-foreground rounded-xl hover:opacity-90 text-[15px] font-semibold transition-all inline-flex items-center gap-2"
                  >
                    <Briefcase className="w-4 h-4" /> Quản lý tiến độ dự án
                  </Link>
                  <Link
                    to={`/messenger/${proposal.expertId}`}
                    className="h-11 px-5 border border-border text-foreground rounded-xl hover:bg-secondary text-[15px] font-semibold transition-all inline-flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" /> Contact Expert
                  </Link>
                </div>
              )}
            </div>
          ) : proposalsList.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground italic font-medium">
              Chưa có proposal nào được gửi cho dự án này.
            </div>
          ) : viewedProposal === null ? (
            /* Proposals list view */
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 text-left">
                Submitted Proposals ({proposalsList.length})
              </h3>
              <div className="space-y-3">
                {proposalsList.map((p) => {
                  return (
                    <div
                      key={p.id}
                      className="p-5 rounded-2xl border bg-card border-border hover:border-input transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="text-left">
                        <h4 className="font-bold text-foreground text-base">{p.expertName}</h4>
                        <p className="text-sm text-muted-foreground font-medium mt-0.5">{p.expertTitle}</p>
                        <p className="text-base font-bold text-brand-primary mt-2">
                          Bid: <MoneyDisplay amount={p.bidAmount} /> · {p.durationDays} days
                        </p>
                        {p.createdAt && (
                          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5 font-medium">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            Gửi lúc: {safeDateFormat(p.createdAt, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
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
                          className="h-11 px-4 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-foreground text-sm font-semibold rounded-xl transition-colors border border-brand-primary"
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
              <button
                onClick={() => {
                  setViewedProposal(null);
                  setShowEscrowConfirm(false);
                }}
                className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground mb-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to proposals list
              </button>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-border/60 pb-6 gap-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{viewedProposal.proposalTitle}</h3>
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
                    Submitted {viewedProposal.createdAt ? new Date(viewedProposal.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
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
                  <p className="font-semibold text-foreground">{viewedProposal.durationDays} days</p>
                </div>
              </div>

              {/* Sections */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-1">Professional Introduction</h4>
                  <p className="text-base text-foreground/80 leading-relaxed mt-2 whitespace-pre-wrap">
                    {viewedProposal.coverLetter || "No introduction provided."}
                  </p>
                </div>

                {viewedProposal.technicalApproach && (
                  <div>
                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-1">Technical Approach & Methodology</h4>
                    <p className="text-base text-foreground/80 leading-relaxed mt-2 whitespace-pre-wrap">
                      {viewedProposal.technicalApproach}
                    </p>
                  </div>
                )}

                {viewedProposal.tasks && viewedProposal.tasks.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-1 mb-3">Tasks & Milestones Breakdown</h4>
                    {selectedProject?.useCases && selectedProject.useCases.length > 0 ? (
                      <div className="space-y-6 mt-3">
                        {selectedProject.useCases.map((uc) => {
                          const ucTasks = viewedProposal.tasks.filter(t => t.useCaseId === uc.id);
                          return (
                            <div key={uc.id} className="border border-border rounded-xl overflow-hidden bg-card">
                              {/* ── Use Case Header ── */}
                              <div className="p-4 bg-accent-light/30 border-b border-border flex items-center justify-between flex-wrap gap-2 text-left">
                                <div className="flex items-center gap-2">
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

                              {/* ── Tasks ── */}
                              <div className="p-4 space-y-4">
                                {ucTasks.length === 0 ? (
                                  <p className="text-xs text-muted-foreground italic text-center py-2 text-left">No tasks proposed for this use case.</p>
                                ) : (
                                  ucTasks.map((task, idx) => (
                                    <div key={task.id || idx} className="p-4 bg-secondary/30 border border-border rounded-xl space-y-3 text-left">
                                      {/* Task Title Row */}
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Task Title:</span>
                                          <span className="text-sm font-bold text-foreground">{task.title || `Task #${idx + 1}`}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {task.completionDays && (
                                            <span className="text-xs px-2 py-0.5 bg-accent/10 text-accent rounded-full font-medium">
                                              {task.completionDays} days
                                            </span>
                                          )}
                                          {task.price != null && (
                                            <span className="text-xs px-2 py-0.5 bg-success/10 text-success rounded-full font-medium">
                                              <MoneyDisplay amount={task.price} />
                                            </span>
                                          )}
                                        </div>
                                      </div>
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
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Task Title:</span>
                                <span className="text-sm font-bold text-foreground">{task.title || `Task #${idx + 1}`}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {task.completionDays && (
                                  <span className="text-xs px-2 py-0.5 bg-accent/10 text-accent rounded-full font-medium">
                                    {task.completionDays} days
                                  </span>
                                )}
                                {task.price != null && (
                                  <span className="text-xs px-2 py-0.5 bg-success/10 text-success rounded-full font-medium">
                                    <MoneyDisplay amount={task.price} />
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  viewedProposal.timelineMilestones && (
                    <div>
                      <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-1">Timeline & Milestones</h4>
                      <p className="text-base text-foreground/80 leading-relaxed mt-2 whitespace-pre-wrap">
                        {viewedProposal.timelineMilestones}
                      </p>
                    </div>
                  )
                )}

                {viewedProposal.dependencies && (
                  <div>
                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-1">Dependencies & Requirements</h4>
                    <p className="text-base text-foreground/80 leading-relaxed mt-2 whitespace-pre-wrap">
                      {viewedProposal.dependencies}
                    </p>
                  </div>
                )}

                {/* Attached Assets for Client (ViewedProposal Detail) */}
                {viewedProposal.attachments && viewedProposal.attachments.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-1 mb-2">Attached Assets ({viewedProposal.attachments.length})</h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {viewedProposal.attachments.map((att, idx) => {
                        const fileUrl = att.url ? (att.url.startsWith("http") ? att.url : `https://aitaskerbe-production.up.railway.app${att.url}`) : "#";
                        return (
                          <a
                            key={att.id || idx}
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary/80 hover:bg-secondary border border-border rounded-lg text-xs font-medium text-foreground/80 hover:text-foreground transition-colors"
                          >
                            <File className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{att.name || "Attached File"}</span>
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
                  className="h-11 px-5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[15px] font-semibold transition-all"
                >
                  Decline Proposal
                </button>
                <button
                  type="button"
                  onClick={() => handleAcceptProposal(viewedProposal)}
                  className="h-11 px-5 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-foreground rounded-xl text-[15px] font-semibold transition-all"
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
    { value: "", label: "Tất cả trạng thái" },
    { value: "Open", label: "Open" },
    { value: "In Progress", label: "In Progress" },
    { value: "Completed", label: "Complete" },
    { value: "Disputed", label: "Disputed" },
    { value: "Cancel", label: "Cancel" },
  ];

  const filteredProjects = projects.filter((project) => {
    const norm = getNormalizedStatus(project);
    if (statusFilter) {
      return norm.label === statusFilter;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">All Projects</h1>
          <p className="text-muted-foreground mt-1">Manage your posted projects</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground">Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-11 px-3 border border-input rounded-xl bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-accent text-sm cursor-pointer"
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
            className="h-11 px-5 bg-brand-primary text-brand-primary-foreground rounded-xl hover:bg-brand-primary-hover text-[15px] font-medium inline-flex items-center gap-2 transition-colors"
          >
          <PlusCircle className="w-4 h-4" /> Post New Project
        </Link>
      </div>
    </div>

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
            className="h-11 px-5 bg-brand-primary text-brand-primary-foreground rounded-xl hover:bg-brand-primary-hover text-[15px] font-medium"
          >
            Post a Project
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-4">
            {filteredProjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((project) => {
            const { label: displayStatus, badgeClass } = getNormalizedStatus(project);
            const category = project.category || project.domain?.name;
            
            const skills = project.projectSkills?.map((s) => s.skillName) || project.jobPostSkills?.map((s) => s.skill?.name) || project.requiredSkills || [];
            const deadlineText = (() => {
              if (!project.deadline) return null;
              const num = Number(project.deadline);
              if (!Number.isNaN(num) && num < 1000) return `${num} days`;
              return safeDateFormat(project.deadline, {
                year: "numeric",
                month: "short",
                day: "numeric",
              }, String(project.deadline));
            })();

            return (
              <div
                key={project.id}
                className={cn(
                  "bg-card rounded-xl border p-6 hover:shadow-md transition-all duration-200",
                  displayStatus === "Disputed"
                    ? "border-red-800 bg-gradient-to-r from-red-950 to-red-900 shadow-lg shadow-red-900/30"
                    : "border-border hover:border-border/80"
                )}
              >
                {/* ── Top row: title + status badge ── */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className={cn(
                        "font-semibold text-lg leading-snug",
                        displayStatus === "Disputed" ? "text-red-100" : "text-foreground"
                      )}>
                        {project.title}
                      </h3>
                    </div>
                    <p className={cn(
                      "text-sm",
                      displayStatus === "Disputed" ? "text-red-200/70" : "text-muted-foreground"
                    )}>
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


                {/* ── Metadata grid ── */}
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
                    <span className="font-bold text-success text-sm">
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

                {/* ── Bottom row: actions ── */}
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
