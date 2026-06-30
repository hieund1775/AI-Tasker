import { useState, useEffect } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  FileText,
  ReceiptText,
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
import { safeArray, safeDateFormat } from "../../lib/safety.js";
import { toast } from "sonner";

// Status helpers — delegated to shared proposalStatusConfig.js
function getStatusConfig(status) { return getProposalStatusConfig(status); }

// ---------------------------------------------------------------------------
// Section wrapper — keeps visual consistency
// ---------------------------------------------------------------------------

function DetailSection({ title, children, className = "" }) {
  return (
    <div className={`border-b border-border last:border-b-0 py-6 first:pt-0 ${className}`}>
      <h3 className="section-header mb-4">
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
            tasks: parsedCoverLetter.tasks || [],
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
        <div className="bg-card rounded-2xl border border-border p-12 shadow-sm text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3 mx-auto" />
            <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
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
        <div className="bg-card rounded-2xl border border-border p-12 text-center shadow-sm">
          <FileText className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">Proposal not found</h3>
          <p className="text-sm text-muted-foreground">
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

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* ================================================================ */}
        {/* Header — Project + Status                                         */}
        {/* ================================================================ */}
        <div className="p-8 border-b border-border/60 bg-secondary/50">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-primary-light text-brand-primary rounded-full text-sm font-medium mb-3">
                <FileText className="w-4 h-4" />
                Proposal Details
              </div>

              <h1 className="text-2xl font-bold text-foreground">
                {proposal.proposalTitle || project?.title || "Proposal"}
              </h1>

              {/* Project + Client info */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3 text-sm text-muted-foreground">
                {project && (
                  <span className="inline-flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    Project: <span className="font-medium text-foreground/80">{project.title}</span>
                  </span>
                )}
                {client && (
                  <span className="inline-flex items-center gap-1.5">
                    <User className="w-4 h-4 text-muted-foreground" />
                    Client:{" "}
                    <span className="font-medium text-foreground/80">
                      {client.fullName}
                      {client.profile?.company ? ` · ${client.profile.company}` : ""}
                    </span>
                  </span>
                )}
                {project?.budget != null && (
                  <span className="inline-flex items-center gap-1.5">
                    <ReceiptText className="w-4 h-4 text-muted-foreground" />
                    Budget:{" "}
                    <span className="font-medium text-foreground/80">
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
              <p className="text-xs text-muted-foreground mt-2">
                Submitted{" "}
                {safeDateFormat(proposal.createdAt, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }, "—")}
              </p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-4 mt-5">
            <div className="bg-card rounded-xl px-4 py-3 border border-border">
              <p className="text-xs text-muted-foreground mb-0.5">Bid Amount</p>
              <p className="font-semibold text-foreground">
                <MoneyDisplay amount={proposal.bidAmount} />
              </p>
            </div>
            <div className="bg-card rounded-xl px-4 py-3 border border-border">
              <p className="text-xs text-muted-foreground mb-0.5">Duration</p>
              <p className="font-semibold text-foreground">{proposal.durationDays} days</p>
            </div>
            <div className="bg-card rounded-xl px-4 py-3 border border-border">
              <p className="text-xs text-muted-foreground mb-0.5">Submitted</p>
              <p className="font-semibold text-foreground">
                {safeDateFormat(proposal.createdAt, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }, "—")}
              </p>
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* Detail Sections / Forms                                           */}
        {/* ================================================================ */}
        <div className="p-8">
          {proposal.isSubmitted === false ? (
            <div className="py-12 text-center text-muted-foreground italic bg-secondary/60 rounded-xl border border-border p-6">
              Thông tin proposal hiện đang được để trống. Hãy hoàn thành proposal của bạn để gửi cho client.
            </div>
          ) : (
            <>
              {/* Professional Introduction */}
              <DetailSection title="Professional Introduction">
                <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap text-sm">
                  {proposal.professionalIntro ||
                    proposal.coverLetter ||
                    "No introduction provided."}
                </p>
              </DetailSection>

              {/* Tasks & Milestones */}
              {proposal.tasks && proposal.tasks.length > 0 ? (
                <DetailSection title="Tasks & Milestones Breakdown">
                  {project?.useCases && project.useCases.length > 0 ? (
                    <div className="space-y-6">
                      {project.useCases.map((uc) => {
                        const ucTasks = proposal.tasks.filter(t => t.useCaseId === uc.id);
                        return (
                          <div key={uc.id} className="border border-border rounded-xl overflow-hidden bg-card">
                            {/* ── Use Case Header ── */}
                            <div className="p-4 bg-accent-light/30 border-b border-border flex items-center justify-between flex-wrap gap-2">
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
                                <p className="text-xs text-muted-foreground italic text-center py-2">No tasks proposed for this use case.</p>
                              ) : (
                                ucTasks.map((task, idx) => (
                                  <div key={task.id || idx} className="p-4 bg-secondary/30 border border-border rounded-xl space-y-3">
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

                                    {/* Minitasks */}
                                    {task.miniTasks && task.miniTasks.length > 0 && (
                                      <div className="pl-3 border-l-2 border-brand-primary/20 space-y-1.5 mt-2">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">Minitasks:</span>
                                        {task.miniTasks.map((mt, mtIdx) => (
                                          <p key={mt.id || mtIdx} className="text-xs text-foreground/80">• {mt.title}</p>
                                        ))}
                                      </div>
                                    )}
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
                    <div className="space-y-4">
                      {proposal.tasks.map((task, idx) => (
                        <div key={task.id || idx} className="p-4 bg-muted/40 border border-border rounded-xl space-y-3">
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

                          {/* Minitasks */}
                          {task.miniTasks && task.miniTasks.length > 0 && (
                            <div className="pl-3 border-l-2 border-brand-primary/20 space-y-1.5 mt-2">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">Minitasks:</span>
                              {task.miniTasks.map((mt, mtIdx) => (
                                <p key={mt.id || mtIdx} className="text-xs text-foreground/80">• {mt.title}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </DetailSection>
              ) : (
                /* Implementation Timeline & Milestones fallback */
                proposal.timelineMilestones && (
                  <DetailSection title="Timeline & Milestones (Legacy)">
                    <pre className="text-foreground/80 leading-relaxed whitespace-pre-wrap font-sans text-sm">
                      {proposal.timelineMilestones}
                    </pre>
                  </DetailSection>
                )
              )}

              {/* Proposal Financials Summary */}
              <DetailSection title="Proposal Financials Summary">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-secondary/30 rounded-xl border border-border/80">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase block">Total Bid Amount</span>
                    <span className="text-xl font-bold text-foreground"><MoneyDisplay amount={proposal.bidAmount} /></span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase block">Total Estimated Duration</span>
                    <span className="text-xl font-bold text-foreground">{proposal.durationDays} days</span>
                  </div>
                </div>
              </DetailSection>

              {/* Attachments */}
              <DetailSection
                title={`Attached Assets ${attachments.length > 0 ? `(${attachments.length})` : ""}`}
                className={attachments.length === 0 ? "last:border-b-0" : ""}
              >
                {attachments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No attachments included.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {attachments.map((att, idx) => (
                      <div
                        key={att.id || idx}
                        className="flex items-center gap-3 bg-secondary/60 border border-border rounded-xl px-4 py-3"
                      >
                        {att.type === "image/png" || att.fileType === "image/png" ? (
                          <Image className="w-5 h-5 text-brand-primary flex-shrink-0" />
                        ) : att.type === "folder" ? (
                          <FolderOpen className="w-5 h-5 text-amber-500 flex-shrink-0" />
                        ) : (
                          <File className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground/80 truncate">
                            {att.name || att.fileName || "Attachment"}
                          </p>
                          <p className="text-xs text-muted-foreground">
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
        <div className="p-8 border-t border-border/60 bg-secondary/50 flex flex-wrap items-center gap-3">
          {convId ? (
            <Link
              to={`/messenger/${convId}`}
              className="h-11 px-5 bg-brand-primary text-brand-primary-foreground rounded-[14px] hover:bg-brand-primary-hover text-base font-semibold inline-flex items-center gap-2 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Contact Client
            </Link>
          ) : (
            <Link
              to="/messenger"
              className="h-11 px-5 bg-brand-primary text-brand-primary-foreground rounded-[14px] hover:bg-brand-primary-hover text-base font-semibold inline-flex items-center gap-2 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Contact Client
            </Link>
          )}

          {canEdit ? (
            <Link
              to={`/expert/jobs/${proposal.jobPostId}/proposal`}
              className="h-11 px-5 bg-brand-primary text-brand-primary-foreground rounded-[14px] hover:bg-brand-primary-hover text-base font-semibold inline-flex items-center gap-2 transition-colors"
            >
              Edit
            </Link>
          ) : (
            <button
              disabled
              className="h-11 px-5 bg-brand-primary text-brand-primary-foreground rounded-xl text-[15px] font-medium inline-flex items-center gap-2 transition-colors opacity-40 cursor-not-allowed"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
