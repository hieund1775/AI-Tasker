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
  File as FileIcon,
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

function DetailSection({ title, children, className = "" }) {
  return (
    <div
      className={`border-b border-border-light last:border-b-0 py-6 first:pt-0 ${className}`}
    >
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
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
        <div className="bg-card rounded-2xl border border-border p-12 shadow-sm text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-border rounded w-1/3 mx-auto" />
            <div className="h-4 bg-border rounded w-1/2 mx-auto" />
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
        <div className="bg-card rounded-2xl border border-border p-12 text-center shadow-sm">
          <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
            Proposal not found
          </h3>
          <p className="text-sm text-muted-foreground/70">
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

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-border-light bg-secondary/50">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent-light text-accent rounded-full text-sm font-medium mb-3">
                <FileText className="w-4 h-4" />
                Proposal Details
              </div>

              <h1 className="text-2xl font-semibold text-foreground">
                {proposal.proposalTitle || project?.title || "Proposal"}
              </h1>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3 text-sm text-muted-foreground">
                {project && (
                  <span className="inline-flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-muted-foreground/70" />
                    Project:{" "}
                    <span className="font-medium text-foreground">
                      {project.title}
                    </span>
                  </span>
                )}
                {expert && (
                  <span className="inline-flex items-center gap-1.5">
                    <User className="w-4 h-4 text-muted-foreground/70" />
                    Expert:{" "}
                    <span className="font-medium text-foreground">
                      {expert.fullName}
                    </span>
                  </span>
                )}
                {project?.budget != null && (
                  <span className="inline-flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-muted-foreground/70" />
                    Budget:{" "}
                    <span className="font-medium text-foreground">
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
              <p className="text-xs text-muted-foreground/70 mt-2">
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
            <div className="bg-card rounded-xl px-4 py-2.5 border border-border">
              <p className="text-xs text-muted-foreground mb-0.5">Bid Amount</p>
              <p className="font-semibold text-foreground">
                <MoneyDisplay amount={proposal.bidAmount} />
              </p>
            </div>
            <div className="bg-card rounded-xl px-4 py-2.5 border border-border">
              <p className="text-xs text-muted-foreground mb-0.5">Duration</p>
              <p className="font-semibold text-foreground">
                {proposal.durationDays} days
              </p>
            </div>
            <div className="bg-card rounded-xl px-4 py-2.5 border border-border">
              <p className="text-xs text-muted-foreground mb-0.5">Submitted</p>
              <p className="font-semibold text-foreground">
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
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">
              {proposal.professionalIntro ||
                proposal.coverLetter ||
                "No introduction provided."}
            </p>
          </DetailSection>

          {proposal.technicalApproach && (
            <DetailSection title="Technical Approach & Methodology">
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                {proposal.technicalApproach}
              </p>
            </DetailSection>
          )}

          {proposal.timelineMilestones && (
            <DetailSection title="Implementation Timeline & Milestones">
              <pre className="text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                {proposal.timelineMilestones}
              </pre>
            </DetailSection>
          )}

          {proposal.dependencies && (
            <DetailSection title="Dependencies & Client Requirements">
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">
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
              <p className="text-sm text-muted-foreground/70">No attachments included.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attachments.map((att, idx) => {
                  const rawUrl = typeof att === "string" ? att : (att.url || att.Url || att.path || att.Path || "#");
                  const fileUrl = rawUrl.startsWith("http") ? rawUrl : enrichFileUrl(rawUrl);
                  let rawName = typeof att === "object" ? (att.name || att.Name || att.originalName || att.fileName) : null;
                  if (!rawName && typeof rawUrl === "string") {
                    rawName = rawUrl.split("/").pop() || "Attachment";
                  }
                  const cleanName = (rawName || "Attachment").replace(/^[a-f0-9-]{36}_/i, "").replace(/^\d+[-_]/, "");
                  const finalName = cleanName || rawName;

                  const handleDownloadFile = async (e) => {
                    e.preventDefault();
                    if (!fileUrl || fileUrl === "#") return;
                    try {
                      const res = await fetch(fileUrl);
                      const blob = await res.blob();
                      const blobUrl = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = blobUrl;
                      a.download = finalName;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(blobUrl);
                    } catch (err) {
                      window.open(fileUrl, "_blank");
                    }
                  };

                  return (
                    <a
                      key={att.id || idx}
                      href={fileUrl}
                      onClick={handleDownloadFile}
                      download={finalName}
                      className="flex items-center gap-3 bg-secondary hover:bg-muted border border-border rounded-xl px-4 py-2.5 cursor-pointer transition-colors"
                      title={`Download ${finalName}`}
                    >
                      {att.type === "image/png" || att.fileType === "image/png" ? (
                        <Image className="w-5 h-5 text-accent flex-shrink-0" />
                      ) : att.type === "folder" ? (
                        <FolderOpen className="w-5 h-5 text-warning flex-shrink-0" />
                      ) : (
                        <FileIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate max-w-[240px] sm:max-w-[340px] block" title={finalName}>
                          {finalName}
                        </p>
                        <p className="text-xs text-muted-foreground/70">
                          {att.type || att.fileType || "file"}
                          {att.size || att.fileSize ? ` · ${att.size || att.fileSize}` : ""}
                        </p>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </DetailSection>
        </div>

        {/* Footer — Actions */}
        <div className="p-8 border-t border-border-light bg-secondary/50 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleGenerateContract}
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover text-sm font-medium inline-flex items-center gap-2 transition-colors"
          >
            <PenLine className="w-4 h-4" />
            Generate Contract
          </button>

          <Link
            to={`/messenger?expertId=${proposal.expertId}`}
            className="px-5 py-2.5 border border-input text-foreground rounded-xl hover:bg-secondary text-sm font-medium inline-flex items-center gap-2 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Contact Expert
          </Link>

          <Link
            to={`/client/projects/${proposal.jobPostId || project?.id}/proposals`}
            className="px-5 py-2.5 border border-input text-foreground rounded-xl hover:bg-secondary text-sm font-medium inline-flex items-center gap-2 transition-colors"
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
