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

              {/* Technical Approach & Methodology */}
              {hasFullFields && (
                <DetailSection title="Technical Approach & Methodology">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {proposal.technicalApproach || "No technical approach specified."}
                  </p>
                </DetailSection>
              )}

              {/* Implementation Timeline & Milestones */}
              {hasFullFields && (
                <DetailSection title="Implementation Timeline & Milestones">
                  <pre className="text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">
                    {proposal.timelineMilestones || "No timeline specified."}
                  </pre>
                </DetailSection>
              )}

              {/* Dependencies & Client Requirements */}
              {hasFullFields && (
                <DetailSection title="Dependencies & Client Requirements">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {proposal.dependencies || "No dependencies specified."}
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
                          <Image className="w-5 h-5 text-brand-primary flex-shrink-0" />
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
<<<<<<< HEAD
              className="px-5 py-2.5 bg-blue-900 text-white rounded-xl hover:bg-blue-800 text-sm font-medium inline-flex items-center gap-2 transition-colors"
=======
              className="h-11 px-5 bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover text-base font-semibold inline-flex items-center gap-2 transition-colors"
>>>>>>> 41161e6efb778e83ce97fdf456f16d9d94b56309
            >
              <MessageSquare className="w-4 h-4" />
              Contact Client
            </Link>
          ) : (
            <Link
              to="/messenger"
<<<<<<< HEAD
              className="px-5 py-2.5 bg-blue-900 text-white rounded-xl hover:bg-blue-800 text-sm font-medium inline-flex items-center gap-2 transition-colors"
=======
              className="h-11 px-5 bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover text-base font-semibold inline-flex items-center gap-2 transition-colors"
>>>>>>> 41161e6efb778e83ce97fdf456f16d9d94b56309
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
