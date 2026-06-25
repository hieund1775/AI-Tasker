import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  Briefcase,
  PlusCircle,
  Calendar,
  DollarSign,
  Tag,
  FileText,
  Users,
  ArrowLeft,
  X,
  MessageSquare,
} from "lucide-react";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { toast } from "sonner";
import api from "../../../services/api.js";

import { getProjectProgress, deriveProjectStatusKey, getStatusLabel, getStatusBadgeClass } from "../../lib/projectTimelineStore.js";

export function MyProjectsList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [projects, setProjects] = useState([]);
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(true);

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

  async function loadProjects() {
    if (!user?.id) return;
    try {
      setLoading(true);
      const userRes = await api.users.getById(user.id);
      
      const rawProjects = userRes?.jobPosts || [];
      const projectsWithCounts = await Promise.all(
        rawProjects.map(async (project) => {
          try {
            const proposals = await api.proposals.getByJob(project.id);
            return {
              ...project,
              proposalCount: proposals.length,
            };
          } catch {
            return { ...project, proposalCount: 0 };
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

  // Handle deep-linking from notifications
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
  }, [projects, location.search]);

  // Check for successful invite parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("inviteSuccess") === "true") {
      setShowInviteSuccessBanner(true);
    } else {
      setShowInviteSuccessBanner(false);
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

            let parsed = {};
            try {
              parsed = JSON.parse(targetProp.coverLetter);
            } catch (e) {
              parsed = {
                coverLetter: targetProp.coverLetter,
                professionalIntro: targetProp.coverLetter,
              };
            }

            return {
              ...targetProp,
              proposalTitle: parsed.proposalTitle || "Proposal",
              coverLetter: parsed.professionalIntro || parsed.coverLetter || "",
              technicalApproach: parsed.technicalApproach || "",
              timelineMilestones: parsed.timelineMilestones || "",
              dependencies: parsed.dependencies || "",
              durationDays: parsed.durationDays || targetProp.estimatedDays || 0,
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
          setProposalsList(enrichedList);
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
      await api.proposals.delete(proposalId);
      toast.success("Proposal has been declined and deleted successfully!");
      if (viewedProposal?.id === proposalId) {
        setViewedProposal(null);
      }
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
      // Update project status to "pending_pay"
      await api.jobPosts.update(selectedProject.id, { status: "pending_pay" });
      // Update proposal status to "pending_pay"
      await api.proposals.updateStatus(p.id, "pending_pay");
      
      toast.success("Proposal has been accepted successfully!");
      setViewedProposal(null);
      setShowEscrowConfirm(false);
      await loadProjects();
      setDbUpdateVersion(prev => prev + 1);
    } catch (err) {
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
    const skills = selectedProject.jobPostSkills?.map((s) => s.skill?.name) || selectedProject.requiredSkills || [];
    const deadlineText = (() => {
      if (!selectedProject.deadline) return "N/A";
      const num = Number(selectedProject.deadline);
      if (!isNaN(num) && num < 1000) return `${num} days`;
      try {
        return new Date(selectedProject.deadline).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      } catch {
        return String(selectedProject.deadline);
      }
    })();

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={handleBackToList}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Projects
        </button>

        {showInviteSuccessBanner && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl flex items-center justify-between shadow-sm animate-fade-in">
            <span className="font-semibold text-sm">bạn đã thêm chuyên gia mới thành công</span>
            <button
              onClick={() => setShowInviteSuccessBanner(false)}
              className="text-green-650 hover:text-green-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-8 space-y-6">
          <div className="flex items-start justify-between flex-wrap gap-4 border-b border-gray-100 pb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{selectedProject.title}</h1>
              <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-brand-primary-light text-brand-primary">
                Status: {selectedProject.status}
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</h4>
            <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedProject.description}</p>
          </div>

          {selectedProject.useCases && selectedProject.useCases.length > 0 && (
            <div className="border-t border-gray-100 pt-6">
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Project Use Cases</h4>
              <div className="space-y-3">
                {selectedProject.useCases.map((uc, i) => (
                  <div key={i} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-sm text-left">
                    <p className="font-bold text-gray-900">
                      Use Case #{i + 1}: <span className="font-semibold text-gray-750">{uc.nameAndDeadline}</span>
                    </p>
                    <p className="text-gray-600 leading-relaxed pl-3 border-l-2 border-slate-350">
                      {uc.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Category</h4>
              <p className="text-base text-gray-900 font-medium">{selectedProject.aiCategoryDomain?.name || selectedProject.category || "N/A"}</p>
            </div>
            {selectedProject.specialization && (
              <div>
                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Specialization / Area of expertise</h4>
                <p className="text-base text-gray-900 font-medium">{selectedProject.specialization}</p>
              </div>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Required Skills</h4>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill) => (
                  <span key={skill} className="px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-md text-xs font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No required skills listed.</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-6">
            <div>
              <h4 className="text-sm text-gray-400 mb-0.5">Budget</h4>
              <p className="font-semibold text-gray-900"><MoneyDisplay amount={selectedProject.budget} /></p>
            </div>
            <div>
              <h4 className="text-sm text-gray-400 mb-0.5">Deadline</h4>
              <p className="font-semibold text-gray-900">{deadlineText}</p>
            </div>
            <div>
              <h4 className="text-sm text-gray-400 mb-0.5">Posted On</h4>
              <p className="font-semibold text-gray-900">
                {selectedProject.createdAt ? new Date(selectedProject.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A"}
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Expert</h4>
            <p className="text-base text-gray-900 font-semibold">{selectedProject.assignedExpert ? selectedProject.assignedExpert.fullName : ""}</p>
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
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Projects
        </button>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-8">
          <div className="border-b border-gray-100 pb-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {isAcceptedView 
                ? `Proposal connected to: ${selectedProject.title}`
                : `Proposals list for: ${selectedProject.title}`
              }
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isAcceptedView
                ? "Reviewing the single expert connection for this project"
                : "Select an expert's proposal to review and accept/decline"
              }
            </p>
          </div>

          {propLoading ? (
            <div className="py-12 text-center text-gray-500 animate-pulse font-medium">
              Loading proposals information...
            </div>
          ) : isAcceptedView ? (
            <div className="space-y-6">
              {/* Proposal Header Card */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-100 pb-6 gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{proposal.proposalTitle}</h3>
                  <p className="text-base text-gray-600 mt-1">
                    Expert: <span className="font-semibold text-gray-700">{proposal.expertName}</span>
                  </p>
                  <p className="text-sm text-gray-400">{proposal.expertTitle}</p>
                </div>
                <div className="flex flex-col items-start md:items-end gap-1.5">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getProposalStatusBadgeClass(proposal.status)}`}>
                    {proposal.status === "pending_escrow" || proposal.status === "pending escrow" || proposal.status === "pending_pay" || proposal.status === "pending pay" ? "Pending Payment" : proposal.status}
                  </span>
                  <p className="text-xs text-gray-400">
                    Submitted {proposal.createdAt ? new Date(proposal.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                  </p>
                </div>
              </div>

              {/* Quick stats row */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div>
                  <p className="text-sm text-gray-500 mb-0.5 font-medium">Bid Amount</p>
                  <p className="font-semibold text-gray-900"><MoneyDisplay amount={proposal.bidAmount} /></p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-0.5 font-medium">Estimated Duration</p>
                  <p className="font-semibold text-gray-900">{proposal.durationDays} days</p>
                </div>
              </div>

              {/* Sections */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1">Professional Introduction</h4>
                  <p className="text-base text-gray-700 leading-relaxed mt-2 whitespace-pre-wrap">
                    {proposal.coverLetter || "No introduction provided."}
                  </p>
                </div>

                {proposal.technicalApproach && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1">Technical Approach & Methodology</h4>
                    <p className="text-base text-gray-700 leading-relaxed mt-2 whitespace-pre-wrap">
                      {proposal.technicalApproach}
                    </p>
                  </div>
                )}

                {proposal.timelineMilestones && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1">Timeline & Milestones</h4>
                    <p className="text-base text-gray-700 leading-relaxed mt-2 whitespace-pre-wrap">
                      {proposal.timelineMilestones}
                    </p>
                  </div>
                )}

                {proposal.dependencies && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1">Dependencies & Requirements</h4>
                    <p className="text-base text-gray-700 leading-relaxed mt-2 whitespace-pre-wrap">
                      {proposal.dependencies}
                    </p>
                  </div>
                )}
              </div>

              {/* Escrow payment direct button for single accepted proposal */}
              {(proposal.status?.toLowerCase() === "pending_escrow" || proposal.status?.toLowerCase() === "pending escrow" || proposal.status?.toLowerCase() === "pending_pay" || proposal.status?.toLowerCase() === "pending pay") && (
                <div className="bg-white border border-gray-250 rounded-xl p-6 space-y-4 shadow-sm text-left">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Hình thức ký quỹ (Escrow Setup)</h3>
                  
                  <div className="flex items-start gap-2.5 pt-2">
                    <input
                      type="checkbox"
                      id="agreeEscrowSingle"
                      defaultChecked={true}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary/50"
                    />
                    <label htmlFor="agreeEscrowSingle" className="text-sm text-gray-700 font-medium">
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
                          projectId: selectedProject.id,
                          projectTitle: selectedProject.title,
                          amount: proposal.bidAmount,
                          proposalId: proposal.id
                        }
                      });
                    }}
                    className="h-11 px-5 bg-brand-primary text-white rounded-xl text-[15px] font-semibold hover:bg-brand-primary-hover transition-colors"
                  >
                    Xác nhận ký quỹ
                  </button>
                </div>
              )}
              
              {proposal.status?.toLowerCase() === "accepted" && (
                <div className="pt-6 border-t border-gray-100 flex items-center justify-end">
                  <Link
                    to="/messenger"
                    className="h-11 px-5 bg-brand-primary text-white rounded-xl hover:bg-brand-primary-hover text-[15px] font-semibold transition-all inline-flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" /> Contact Expert
                  </Link>
                </div>
              )}
            </div>
          ) : proposalsList.length === 0 ? (
            <div className="py-12 text-center text-gray-400 italic font-medium">
              Chưa có proposal nào được gửi cho dự án này.
            </div>
          ) : viewedProposal === null ? (
            /* Proposals list view */
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-450 uppercase tracking-wider mb-2 text-left">
                Submitted Proposals ({proposalsList.length})
              </h3>
              <div className="space-y-3">
                {proposalsList.map((p) => {
                  return (
                    <div
                      key={p.id}
                      className="p-5 rounded-2xl border bg-white border-gray-200 hover:border-gray-300 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="text-left">
                        <h4 className="font-bold text-gray-900 text-base">{p.expertName}</h4>
                        <p className="text-sm text-gray-400 font-medium mt-0.5">{p.expertTitle}</p>
                        <p className="text-base font-bold text-brand-primary mt-2">
                          Bid: <MoneyDisplay amount={p.bidAmount} /> · {p.durationDays} days
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setViewedProposal(p);
                            setShowEscrowConfirm(false);
                          }}
                          className="h-11 px-4 bg-brand-primary hover:bg-brand-primary-hover text-white text-sm font-semibold rounded-xl transition-colors border border-brand-primary"
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
                className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 mb-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to proposals list
              </button>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-100 pb-6 gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{viewedProposal.proposalTitle}</h3>
                  <p className="text-base text-gray-600 mt-1">
                    Expert: <span className="font-semibold text-gray-700">{viewedProposal.expertName}</span>
                  </p>
                  <p className="text-sm text-gray-400">{viewedProposal.expertTitle}</p>
                </div>
                <div className="flex flex-col items-start md:items-end gap-1.5">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getProposalStatusBadgeClass(viewedProposal.status)}`}>
                    {viewedProposal.status}
                  </span>
                  <p className="text-xs text-gray-400">
                    Submitted {viewedProposal.createdAt ? new Date(viewedProposal.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                  </p>
                </div>
              </div>

              {/* Quick stats row */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div>
                  <p className="text-sm text-gray-500 mb-0.5 font-medium">Bid Amount</p>
                  <p className="font-semibold text-gray-900"><MoneyDisplay amount={viewedProposal.bidAmount} /></p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-0.5 font-medium">Estimated Duration</p>
                  <p className="font-semibold text-gray-900">{viewedProposal.durationDays} days</p>
                </div>
              </div>

              {/* Sections */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1">Professional Introduction</h4>
                  <p className="text-base text-gray-700 leading-relaxed mt-2 whitespace-pre-wrap">
                    {viewedProposal.coverLetter || "No introduction provided."}
                  </p>
                </div>

                {viewedProposal.technicalApproach && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1">Technical Approach & Methodology</h4>
                    <p className="text-base text-gray-700 leading-relaxed mt-2 whitespace-pre-wrap">
                      {viewedProposal.technicalApproach}
                    </p>
                  </div>
                )}

                {viewedProposal.timelineMilestones && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1">Timeline & Milestones</h4>
                    <p className="text-base text-gray-700 leading-relaxed mt-2 whitespace-pre-wrap">
                      {viewedProposal.timelineMilestones}
                    </p>
                  </div>
                )}

                {viewedProposal.dependencies && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1">Dependencies & Requirements</h4>
                    <p className="text-base text-gray-700 leading-relaxed mt-2 whitespace-pre-wrap">
                      {viewedProposal.dependencies}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="pt-6 border-t border-gray-100 flex items-center justify-end gap-3">
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
                  className="h-11 px-5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-[15px] font-semibold transition-all"
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
  const filteredProjects = projects.filter((project) => {
    const proposalCount = project.proposalCount || 0;
    const statusKey = deriveProjectStatusKey(project, { proposalCount });
    const s = project.status?.toLowerCase() || "";
    const isActive = (statusKey === "in_progress" || s === "in_progress" || s === "in progress" || s === "active" || s === "hired" || s === "closed") && s !== "open";
    return !isActive;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Projects</h1>
          <p className="text-gray-600 mt-1">Manage your posted projects</p>
        </div>
        <Link
          to="/client/post-project"
          className="h-11 px-5 bg-brand-primary text-white rounded-xl hover:bg-brand-primary-hover text-[15px] font-medium inline-flex items-center gap-2 transition-colors"
        >
          <PlusCircle className="w-4 h-4" /> Post New Project
        </Link>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500 animate-pulse">
          Loading projects...
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-500 mb-2">
            No projects yet
          </h3>
          <p className="text-base text-gray-400 mb-4">
            Post your first project to find the right AI expert.
          </p>
          <Link
            to="/client/post-project"
            className="h-11 px-5 bg-brand-primary text-white rounded-xl hover:bg-brand-primary-hover text-[15px] font-medium"
          >
            Post a Project
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map((project) => {
            const proposalCount = project.proposalCount || 0;
            const statusKey = deriveProjectStatusKey(project, { proposalCount });
            const displayStatus = assignedExpert ? "Pending For Expert" : getStatusLabel(statusKey);
            const badgeClass = assignedExpert ? "bg-amber-100 text-amber-700" : getStatusBadgeClass(statusKey);

            const progress = getProjectProgress(project.id);
            const category = project.aiCategoryDomain;
            
>>>>>>> 41161e6efb778e83ce97fdf456f16d9d94b56309
            const skills = project.jobPostSkills?.map((s) => s.skill?.name) || project.requiredSkills || [];
            const deadlineText = (() => {
              if (!project.deadline) return null;
              const num = Number(project.deadline);
              if (!isNaN(num) && num < 1000) return `${num} days`;
              try {
                return new Date(project.deadline).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });
              } catch {
                return String(project.deadline);
              }
            })();

            return (
              <div
                key={project.id}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 transition-colors"
              >
                {/* ── Top row: title + status badge ── */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="font-semibold text-gray-900 text-lg leading-snug">
                    {project.title}
                  </h3>
                  <span
                    className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}
                  >
                    {displayStatus}
                  </span>
                </div>

                {/* ── Simplified info ── */}
                <div className="space-y-1 text-base text-gray-600 mb-6">
                  <p className="font-medium text-brand-primary">
                    {project.aiCategoryDomain?.name || project.category || "Artificial Intelligence"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Posted {project.createdAt ? new Date(project.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "May 1, 2026"}
                  </p>
                  <p className="font-bold text-gray-900 mt-1">
                    <MoneyDisplay amount={project.budget} />
                  </p>
                  {deadlineText && (
                    <p className="text-sm text-gray-500">
                      Deadline: {deadlineText}
                    </p>
                  )}
                  <p className="text-sm text-gray-655 font-medium pt-1">
                    Expert: <span className="text-gray-900 font-semibold">{project.assignedExpert ? project.assignedExpert.fullName : ""}</span>
                  </p>
                </div>

                {/* ── Bottom row: actions ── */}
                <div className="flex items-center justify-end pt-3 border-t border-gray-100 gap-3">
                  {/* View Details white button — opening details inline view */}
                  <button
                    onClick={() => {
                      setSelectedProject(project);
                      setView("details");
                    }}
                    className="h-11 px-5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 text-[15px] font-medium transition-all inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <FileText className="w-4 h-4" />
                    View Details
                  </button>

                  {/* View Proposal green button — opening proposals list inline view */}
                  <button
                    onClick={() => {
                      setSelectedProject(project);
                      setView("proposals");
                    }}
                    className="h-11 px-5 bg-brand-primary text-white rounded-xl hover:bg-brand-primary-hover text-[15px] font-medium transition-all inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Users className="w-4 h-4" />
                    View Proposal
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
