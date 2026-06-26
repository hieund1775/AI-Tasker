import { useState, useEffect } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  FileText,
  DollarSign,
  Calendar,
  Clock,
  User,
  Briefcase,
  Paperclip,
  Image,
  File,
  FolderOpen,
  MessageSquare,
} from "lucide-react";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { BackButton } from "../../components/shared/BackButton.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import api from "../../../services/api.js";
import { getProposalStatusConfig } from "../../lib/proposalStatusConfig.js";
import { toast } from "sonner";

// Status helpers — delegated to shared proposalStatusConfig.js
function getStatusConfig(status) { return getProposalStatusConfig(status); }

function renderStructuredTasks(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return <p className="text-sm text-gray-450 italic mt-2">Không có nhiệm vụ chi tiết được điền.</p>;
  }
  return (
    <div className="space-y-4 mt-3">
      {tasks.map((task, idx) => (
        <div key={task.id || idx} className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2.5 text-sm text-left">
          <div className="flex justify-between items-start flex-wrap gap-2">
            <div>
              <span className="text-[10px] font-bold text-brand-primary bg-brand-primary-light px-2 py-0.5 rounded-full uppercase tracking-wide">
                {task.useCaseTitle || `Use Case #${task.useCaseIndex + 1}`}
              </span>
              <h4 className="font-bold text-gray-900 text-sm mt-1.5">{task.title || "Không có tiêu đề"}</h4>
            </div>
            <div className="text-right text-xs bg-white px-3 py-1.5 border border-gray-100 rounded-lg shadow-sm">
              <span className="font-semibold text-brand-primary">{task.durationDays} ngày</span>
              <span className="mx-1.5 text-gray-300">|</span>
              <span className="font-bold text-gray-900">${task.amount}</span>
            </div>
          </div>
          {task.miniTasks && task.miniTasks.length > 0 && (
            <div className="pt-2 border-t border-gray-100 space-y-1.5">
              <span className="text-[10px] font-bold text-gray-405 uppercase tracking-wide">Nhiệm vụ con / Milestones</span>
              <ul className="list-disc list-inside text-xs text-gray-600 space-y-1 pl-1">
                {task.miniTasks.map((mt, mtIdx) => (
                  <li key={mt.id || mtIdx}>{mt.title || "Không có tiêu đề"}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section wrapper — keeps visual consistency
// ---------------------------------------------------------------------------

function DetailSection({ title, children, className = "" }) {
  return (
    <div className={`border-b border-gray-100 last:border-b-0 py-6 first:pt-0 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProposalDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [proposal, setProposal] = useState(null);
  const [project, setProject] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Tab and Edit states
  const [activeTab, setActiveTab] = useState("proposal"); // "proposal" | "detail"

  useEffect(() => {
    if (!user?.id || !id) return;
    setLoading(true);
    api.proposals.getByExpert(user.id)
      .then(async (list) => {
        const found = list.find((p) => p.id === id);
        if (found) {
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
            professionalIntro: parsedCoverLetter.professionalIntro || parsedCoverLetter.coverLetter || "",
            technicalApproach: parsedCoverLetter.technicalApproach || "",
            timelineMilestones: parsedCoverLetter.timelineMilestones || "",
            dependencies: parsedCoverLetter.dependencies || "",
            durationDays: parsedCoverLetter.durationDays || found.estimatedDays || 0,
            attachments: parsedCoverLetter.attachments || [],
            tasks: Array.isArray(parsedCoverLetter.tasks) ? parsedCoverLetter.tasks : [],
          };
          setProposal(enrichedProposal);
          if (found.isSubmitted === false) {
            setActiveTab("detail");
          }

          if (found.jobPostId) {
            try {
              const job = await api.jobPosts.getById(found.jobPostId);
              setProject(job);
              if (job.clientId) {
                const cli = await api.users.getById(job.clientId);
                setClient(cli);
              }
            } catch (err) {
              console.error("Failed to load project/client details:", err);
            }
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load proposals:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, user?.id]);

  // ---- Find conversation for Contact button ----
  function getConversationId() {
    if (!proposal) return null;
    const expertConvs = [];
    const conv = expertConvs.find((c) => c.projectId === proposal.projectId);
    return conv ? conv.id : null;
  }


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
        <BackButton fallback="/expert/proposals" className="mb-6">Back to My Proposals</BackButton>
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-500 mb-2">Proposal not found</h3>
          <p className="text-sm text-gray-400">
            This proposal may have been removed or is no longer available.
          </p>
        </div>
      </div>
    );
  }

  // ---- Helpers ----
  const statusCfg = getStatusConfig(proposal.status);
  const StatusIcon = statusCfg.icon;
  const convId = getConversationId();
  const isSessionProposal = proposal.id?.startsWith("session-prop-");
  const hasFullFields = isSessionProposal || !!proposal.proposalTitle;
  const attachments = proposal.attachments || [];

  const canEdit = proposal.status?.toLowerCase() !== "accepted" &&
                  proposal.status?.toLowerCase() !== "pending_pay" &&
                  proposal.status?.toLowerCase() !== "pending_escrow";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <BackButton fallback="/expert/proposals" className="mb-6">Back to My Proposals</BackButton>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* ================================================================ */}
        {/* Header — Project + Status                                         */}
        {/* ================================================================ */}
        <div className="p-8 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-primary-light text-brand-primary rounded-full text-sm font-medium mb-3">
                <FileText className="w-4 h-4" />
                Proposal Details
              </div>

              <h1 className="text-2xl font-bold text-gray-900">
                {proposal.proposalTitle || project?.title || "Proposal"}
              </h1>

              {/* Project + Client info */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3 text-sm text-gray-500">
                {project && (
                  <span className="inline-flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    Project: <span className="font-medium text-gray-700">{project.title}</span>
                  </span>
                )}
                {client && (
                  <span className="inline-flex items-center gap-1.5">
                    <User className="w-4 h-4 text-gray-400" />
                    Client:{" "}
                    <span className="font-medium text-gray-700">
                      {client.fullName}
                      {client.profile?.company ? ` · ${client.profile.company}` : ""}
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

            {/* Status + Submitted date */}
            <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusCfg.className}`}
                >
                  <StatusIcon className="w-4 h-4" />
                  {statusCfg.label}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Submitted{" "}
                {proposal.createdAt
                  ? new Date(proposal.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
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
              <p className="font-semibold text-gray-900">{proposal.durationDays} days</p>
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

        {/* ================================================================ */}
        {/* Detail Sections / Forms                                           */}
        {/* ================================================================ */}
        <div className="p-8">
          {proposal.isSubmitted === false ? (
            <div className="py-12 text-center text-gray-400 italic bg-gray-50 rounded-xl border border-gray-150 p-6">
              Thông tin proposal hiện đang được để trống. Hãy hoàn thành proposal của bạn để gửi cho client.
            </div>
          ) : (
            <>
              {/* Professional Introduction */}
              <DetailSection title="Professional Introduction">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {proposal.professionalIntro ||
                    proposal.coverLetter ||
                    "No introduction provided."}
                </p>
              </DetailSection>

              {/* Implementation Timeline & Milestones */}
              {hasFullFields && (
                <DetailSection title="Implementation Timeline & Milestones">
                  {(proposal.tasks && proposal.tasks.length > 0) ? (
                    renderStructuredTasks(proposal.tasks)
                  ) : (
                    <pre className="text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">
                      {proposal.timelineMilestones || "No timeline specified."}
                    </pre>
                  )}
                </DetailSection>
              )}

              {/* Portfolio & Attachments */}
              <DetailSection
                title="Portfolio & Attachments"
                className="last:border-b-0"
              >
                {attachments.length === 0 ? (
                  <p className="text-sm text-gray-400">None</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {attachments.map((att, idx) => (
                      <div
                        key={att.id || idx}
                        className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
                      >
                        {att.type === "image/png" || att.fileType === "image/png" ? (
                          <Image className="w-5 h-5 text-brand-primary flex-shrink-0" />
                        ) : att.type === "folder" ? (
                          <FolderOpen className="w-5 h-5 text-amber-500 flex-shrink-0" />
                        ) : (
                          <File className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        )}
                        <div className="min-w-0 text-left">
                          <p className="text-sm font-medium text-gray-700 truncate font-sans">
                            {att.name || att.fileName || "Attachment"}
                          </p>
                          <p className="text-xs text-gray-400 font-sans">
                            {att.type || att.fileType || "file"}
                            {att.size || att.fileSize ? ` · ${att.size || att.fileSize}` : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </DetailSection>
            </>
          )}
        </div>

        {/* ================================================================ */}
        {/* Footer — Actions                                                  */}
        {/* ================================================================ */}
        <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex flex-wrap items-center gap-3">
          {convId ? (
            <Link
              to={`/messenger/${convId}`}
<<<<<<< Updated upstream
              className="px-5 py-2.5 bg-blue-900 text-white rounded-xl hover:bg-blue-800 text-sm font-medium inline-flex items-center gap-2 transition-colors"
=======
              className="h-11 px-5 bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover text-base font-semibold inline-flex items-center gap-2 transition-colors"
>>>>>>> Stashed changes
            >
              <MessageSquare className="w-4 h-4" />
              Contact Client
            </Link>
          ) : (
            <Link
              to="/messenger"
<<<<<<< Updated upstream
              className="px-5 py-2.5 bg-blue-900 text-white rounded-xl hover:bg-blue-800 text-sm font-medium inline-flex items-center gap-2 transition-colors"
=======
              className="h-11 px-5 bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover text-base font-semibold inline-flex items-center gap-2 transition-colors"
>>>>>>> Stashed changes
            >
              <MessageSquare className="w-4 h-4" />
              Contact Client
            </Link>
          )}

          {canEdit ? (
            <Link
              to={`/expert/jobs/${proposal.jobPostId}/proposal`}
              className="h-11 px-5 bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover text-base font-semibold inline-flex items-center gap-2 transition-colors"
            >
              Edit
            </Link>
          ) : (
            <button
              disabled
              className="h-11 px-5 bg-brand-primary text-white rounded-xl text-[15px] font-medium inline-flex items-center gap-2 transition-colors opacity-40 cursor-not-allowed"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
