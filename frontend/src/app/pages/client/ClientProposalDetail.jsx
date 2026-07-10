import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  FileText,
  DollarSign,
  Calendar,
  User,
  Briefcase,
  Paperclip,
  Image,
  File,
  FolderOpen,
  MessageSquare,
  PenLine,
} from "lucide-react";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { BackButton } from "../../components/shared/BackButton.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import api from "../../../services/api.js";
import { getProposalStatusConfig } from "../../lib/proposalStatusConfig.js";

function getStatusConfig(status) {
  return getProposalStatusConfig(status);
}

function renderStructuredTasks(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return <p className="text-sm text-gray-450 italic mt-2">Không có nhiệm vụ chi tiết được điền.</p>;
  }

  // Group tasks by useCaseIndex
  const groups = {};
  tasks.forEach((task) => {
    const key = task.useCaseIndex ?? 0;
    if (!groups[key]) {
      groups[key] = {
        useCaseIndex: key,
        useCaseTitle: task.useCaseTitle || `Use Case #${Number(key) + 1}`,
        tasks: [],
        totalDuration: 0,
        totalAmount: 0,
      };
    }
    groups[key].tasks.push(task);
    groups[key].totalDuration += Number(task.durationDays || 0);
    groups[key].totalAmount += Number(task.amount || 0);
  });
  const sortedGroups = Object.values(groups).sort((a, b) => Number(a.useCaseIndex) - Number(b.useCaseIndex));

  return (
    <div className="space-y-6 mt-3">
      {sortedGroups.map((group, gIdx) => (
        <div key={group.useCaseIndex ?? gIdx} className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-4 text-left">
          {/* Group Header: Use Case Title & Totals */}
          <div className="flex justify-between items-start border-b border-gray-200 pb-3 gap-4">
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-brand-primary bg-brand-primary-light px-2 py-0.5 rounded-full uppercase tracking-wide">
                Use Case #{Number(group.useCaseIndex) + 1}
              </span>
              <h3 className="font-bold text-gray-900 text-base mt-1.5 break-words">{group.useCaseTitle}</h3>
            </div>
            <div className="text-right text-xs bg-white px-3 py-1.5 border border-gray-200 rounded-lg shadow-sm shrink-0">
              <span className="font-bold text-brand-primary block sm:inline">Tổng: {group.totalDuration} ngày</span>
              <span className="hidden sm:inline mx-1.5 text-gray-300">|</span>
              <span className="font-bold text-brand-primary block sm:inline">${group.totalAmount}</span>
            </div>
          </div>

          {/* Tasks list under this Use Case */}
          <div className="space-y-4">
            {group.tasks.map((task, tIdx) => (
              <div key={task.id || tIdx} className="bg-white border border-gray-100 rounded-xl p-4 space-y-2 shadow-sm">
                <div className="space-y-1">
                  <h4 className="font-bold text-gray-800 text-sm">Task #{tIdx + 1}: {task.title || "Không có tiêu đề"}</h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-[11px] font-medium text-gray-600">{task.durationDays} ngày</span>
                    <span className="text-gray-300">•</span>
                    <span className="font-semibold text-gray-900">${task.amount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailSection({ title, children, className = "" }) {
  return (
    <div
      className={`border-b border-gray-100 last:border-b-0 py-6 first:pt-0 ${className}`}
    >
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}

/**
 * ClientProposalDetail — Client views a single proposal in detail.
 * Includes "Generate Contract" button to initiate the contract flow.
 *
 * Route: /client/proposals/:id
 */
export function ClientProposalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [proposal, setProposal] = useState(null);
  const [project, setProject] = useState(null);
  const [expert, setExpert] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !id) return;
    setLoading(true);

    async function loadData() {
      try {
        // Fetch the proposal directly
        const found = await api.proposals.getById(id).catch(() => null);
        if (!found) {
          setProposal(null);
          setLoading(false);
          return;
        }

        let parsedCoverLetter = {};
        try {
          parsedCoverLetter = JSON.parse(found.coverLetter);
        } catch (e) {
          parsedCoverLetter = {
            coverLetter: found.coverLetter,
            professionalIntro: found.coverLetter,
          };
        }

        const enrichedProposal = {
          ...found,
          proposalTitle: parsedCoverLetter.proposalTitle || "Proposal",
          professionalIntro:
            parsedCoverLetter.professionalIntro ||
            parsedCoverLetter.coverLetter ||
            "",
          technicalApproach: parsedCoverLetter.technicalApproach || "",
          timelineMilestones: parsedCoverLetter.timelineMilestones || "",
          dependencies: parsedCoverLetter.dependencies || "",
          durationDays: parsedCoverLetter.durationDays || 0,
          attachments: parsedCoverLetter.attachments || [],
          tasks: Array.isArray(parsedCoverLetter.tasks) ? parsedCoverLetter.tasks : [],
        };
        setProposal(enrichedProposal);

        // Fetch associated project
        if (found.jobPostId) {
          try {
            const job = await api.jobPosts.getById(found.jobPostId);
            setProject(job);
          } catch (err) {
            console.error("Failed to load project:", err);
          }
        }

        // Fetch expert info
        if (found.expertId) {
          try {
            const exp = await api.users.getById(found.expertId);
            setExpert(exp);
          } catch (err) {
            console.error("Failed to load expert:", err);
          }
        }
      } catch (err) {
        console.error("Failed to load proposal:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id, user?.id]);

  // ---- Loading ----
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-12 shadow-sm text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  // ---- Not found ----
  if (!proposal) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton fallback="/client/my-projects" className="mb-6">
          Back to My Projects
        </BackButton>
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-500 mb-2">
            Proposal not found
          </h3>
          <p className="text-sm text-gray-400">
            This proposal may have been removed or is no longer available.
          </p>
        </div>
      </div>
    );
  }

  const statusCfg = getStatusConfig(proposal.status);
  const StatusIcon = statusCfg.icon;

  const attachments = proposal.attachments || [];

  const handleGenerateContract = () => {
    const projectId = proposal.jobPostId || project?.id;
    const proposalId = proposal.id;
    const expertId = proposal.expertId;
    navigate(
      `/client/contracts/create?projectId=${projectId}&proposalId=${proposalId}&expertId=${expertId}`
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BackButton fallback="/client/my-projects" className="mb-6">
        Back to My Projects
      </BackButton>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-3">
                <FileText className="w-4 h-4" />
                Proposal Details
              </div>

              <h1 className="text-2xl font-bold text-gray-900">
                {proposal.proposalTitle || project?.title || "Proposal"}
              </h1>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3 text-sm text-gray-500">
                {project && (
                  <span className="inline-flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    Project:{" "}
                    <span className="font-medium text-gray-700">
                      {project.title}
                    </span>
                  </span>
                )}
                {expert && (
                  <span className="inline-flex items-center gap-1.5">
                    <User className="w-4 h-4 text-gray-400" />
                    Expert:{" "}
                    <span className="font-medium text-gray-700">
                      {expert.fullName}
                    </span>
                  </span>
                )}
                {project?.budget != null && (
                  <span className="inline-flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    Budget:{" "}
                    <span className="font-medium text-gray-700">
                      <MoneyDisplay amount={project.budget} />
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="text-right flex-shrink-0">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusCfg.className}`}
              >
                <StatusIcon className="w-4 h-4" />
                {statusCfg.label}
              </span>
              <p className="text-xs text-gray-400 mt-2">
                Submitted{" "}
                {proposal.createdAt
                  ? new Date(proposal.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—"}
              </p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-4 mt-5">
            <div className="bg-white rounded-xl px-4 py-3 border border-gray-200">
              <p className="text-xs text-gray-500 mb-0.5">Bid Amount</p>
              <p className="font-semibold text-gray-900">
                <MoneyDisplay amount={proposal.bidAmount} />
              </p>
            </div>
            <div className="bg-white rounded-xl px-4 py-3 border border-gray-200">
              <p className="text-xs text-gray-500 mb-0.5">Duration</p>
              <p className="font-semibold text-gray-900">
                {proposal.durationDays} days
              </p>
            </div>
            <div className="bg-white rounded-xl px-4 py-3 border border-gray-200">
              <p className="text-xs text-gray-500 mb-0.5">Submitted</p>
              <p className="font-semibold text-gray-900">
                {proposal.createdAt
                  ? new Date(proposal.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Detail Sections */}
        <div className="p-8">
          <DetailSection title="Professional Introduction">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {proposal.professionalIntro ||
                proposal.coverLetter ||
                "No introduction provided."}
            </p>
          </DetailSection>

          {proposal.technicalApproach && (
            <DetailSection title="Technical Approach & Methodology">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {proposal.technicalApproach}
              </p>
            </DetailSection>
          )}

          <DetailSection title="Implementation Timeline & Milestones">
            {(proposal.tasks && proposal.tasks.length > 0) ? (
              renderStructuredTasks(proposal.tasks)
            ) : (
              <pre className="text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">
                {proposal.timelineMilestones || "No timeline specified."}
              </pre>
            )}
          </DetailSection>

          {proposal.dependencies && (
            <DetailSection title="Dependencies & Client Requirements">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {proposal.dependencies}
              </p>
            </DetailSection>
          )}

          {/* Attachments */}
          <DetailSection
            title={`Attached Assets ${attachments.length > 0 ? `(${attachments.length})` : ""}`}
            className={attachments.length === 0 ? "last:border-b-0" : ""}
          >
            {attachments.length === 0 ? (
              <p className="text-sm text-gray-400">No attachments included.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attachments.map((att, idx) => (
                  <div
                    key={att.id || idx}
                    className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
                  >
                    {att.type === "image/png" || att.fileType === "image/png" ? (
                      <Image className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    ) : att.type === "folder" ? (
                      <FolderOpen className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    ) : (
                      <File className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">
                        {att.name || att.fileName || "Attachment"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {att.type || att.fileType || "file"}
                        {att.size || att.fileSize
                          ? ` · ${att.size || att.fileSize}`
                          : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DetailSection>
        </div>

        {/* Footer — Actions */}
        <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleGenerateContract}
            className="px-5 py-2.5 bg-blue-900 text-white rounded-xl hover:bg-blue-800 text-sm font-medium inline-flex items-center gap-2 transition-colors"
          >
            <PenLine className="w-4 h-4" />
            Generate Contract
          </button>

          <Link
            to={`/messenger?expertId=${proposal.expertId}`}
            className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium inline-flex items-center gap-2 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Contact Expert
          </Link>

          <Link
            to={`/client/projects/${proposal.jobPostId || project?.id}/proposals`}
            className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium inline-flex items-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Proposals
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ClientProposalDetail;
