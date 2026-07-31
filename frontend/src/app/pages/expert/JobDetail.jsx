import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import {
  Clock,
  Send,
  Calendar,
  User,
  Tag,
  Layers,
  CheckCircle2,
  FileText,
  Paperclip,
} from "lucide-react";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { safeArray, safeDateFormat } from "../../lib/safety.js";
import { BackButton } from "../../components/shared/BackButton.jsx";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import { SectionCard } from "../../components/shared/SectionCard.jsx";
import api, { enrichFileUrl, cleanFileName } from "../../../services/api.js";
import { downloadFile } from "../../lib/downloadFileUtils.js";
import { notificationService } from "../../../services/notificationHelper.js";
import { toast } from "sonner";
import { buildClientProfileFromUser } from "../../lib/clientProfileStorage.js";

const isResubmittableProposalStatus = (status) =>
  ["declined", "rejected", "withdrawn", "expired"].includes(
    String(status || "").toLowerCase(),
  );

export function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invitation, setInvitation] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchJob() {
      setLoading(true);
      setError(null);
      try {
        const project = await api.jobPosts.getById(id);
        if (!project) {
          if (!cancelled) setError("Project not found.");
          return;
        }

        let clientInfo = null;
        if (project.clientId) {
          try {
            const clientUser = await api.users.getById(project.clientId);
            if (clientUser) {
              const clientProfile = buildClientProfileFromUser(clientUser);
              clientInfo = {
                name: clientProfile?.fullName || "Client",
                company: clientProfile?.profile?.company || "",
                location: clientProfile?.profile?.location || "",
              };
            }
          } catch (e) {
            console.error("Failed to load client details:", e);
          }
        }

        let invitationProposal = null;
        let hasSubmittedProp = false;
        let extendedDeadlineStr = null;
        if (user && user.role === "expert") {
          try {
            const myProposals = await api.proposals.getByExpert(user.id).catch(() => []);
            invitationProposal = myProposals.find(
              (p) => {
                const proposalJobId = p.jobPostId || p.JobPostId;
                const proposalStatus = p.status || p.Status;
                return (
                  String(proposalJobId) === String(project.id) &&
                  (Number(p.bidAmount || p.BidAmount) || 0) === 0 &&
                  String(proposalStatus || "").toLowerCase() === "pending"
                );
              }
            );
            hasSubmittedProp = myProposals.some(
              (p) => {
                const proposalJobId = p.jobPostId || p.JobPostId;
                const proposalStatus = p.status || p.Status;
                return (
                  String(proposalJobId) === String(project.id) &&
                  (Number(p.bidAmount || p.BidAmount) || 0) > 0 &&
                  !isResubmittableProposalStatus(proposalStatus)
                );
              }
            );
            // Check for accepted proposal with extended deadline or active project deadline
            const acceptedProposal = myProposals.find(p =>
              (p.jobPostId === project.id || p.jobPostId === id) &&
              ["accepted", "pending_escrow", "pending_pay", "in_progress", "in progress", "active"].includes(p.status?.toLowerCase())
            );
            const projIdKey = acceptedProposal?.projectId || acceptedProposal?.id || project.id || id;
            if (projIdKey) {
              try {
                const storedDeadline =
                  localStorage.getItem(`project_deadline_${projIdKey}`) ||
                  localStorage.getItem(`project_deadline_${project.id}`) ||
                  localStorage.getItem(`project_deadline_${id}`);
                if (storedDeadline) extendedDeadlineStr = storedDeadline;
              } catch (e) { /* ignore */ }
            }
          } catch (e) {
            console.error("Failed to load proposals for job:", e);
          }
        }

        if (!cancelled) {
          // api.jobPosts.getById already executed mapJobPost(), so useCases, requiredSkills, category
          // are already mapped correctly. Just assign client info.
          setJob({
            ...project,
            client: clientInfo,
            _extendedDeadline: extendedDeadlineStr, // store extended deadline for display
          });
          setInvitation(invitationProposal);
          setHasSubmitted(hasSubmittedProp);
        }
      } catch (apiError) {
        console.error("API error loading job details:", apiError);
        if (!cancelled) setError("Failed to load job details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchJob();
    return () => {
      cancelled = true;
    };
  }, [id, user?.id]);

  const handleAcceptInvite = () => {
    navigate(`/expert/jobs/${id}/proposal`);
  };

  const handleDeclineInvite = async () => {
    if (!invitation) return;
    try {
      // 1. Decline proposal invitation in database
      await api.proposals.updateStatus(invitation.id, "declined");

      // 2. Notify the client
      if (job?.clientId) {
        await notificationService.notifyInviteDeclined({
          clientUserId: job.clientId,
          expertName: user?.fullName || user?.name || "An expert",
          jobTitle: job.title,
          jobPostId: job.id
        });
      }

      toast.success("Invitation declined successfully.");
      setInvitation(null);
    } catch (e) {
      console.error("Failed to decline invite:", e);
      toast.error("Failed to decline invitation. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-64 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <BackButton fallback="/expert/find-jobs" className="mb-0">
          Back to Jobs
        </BackButton>
        <PageHeader title="Job Details" subtitle="-" divider={false} />
        <div className="bg-card rounded-2xl border border-destructive/20 p-12 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-destructive mb-2">{error || "Job not found"}</h3>
          <p className="text-sm text-muted-foreground">This job may have been removed or is no longer available.</p>
        </div>
      </div>
    );
  }

  // Use requiredSkills already mapped by mapJobPost() in api.js
  const skills = (job.requiredSkills && job.requiredSkills.length > 0)
    ? job.requiredSkills
    : (job.jobPostSkills?.map((s) => s.skill?.name || s.skillName || "").filter(Boolean) || []);

  const deadlineText = (() => {
    // 1. Use extended deadline from localStorage / active project extension if available
    if (job._extendedDeadline) {
      return safeDateFormat(job._extendedDeadline, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }, String(job._extendedDeadline));
    }

    // 2. Check for explicit project deadline properties
    const effectiveVal = job.projectDeadlineDate || job.endDate || job.EndDate || job.deadline || job.Deadline;
    if (!effectiveVal) return null;

    const num = Number(effectiveVal);
    if (!Number.isNaN(num) && num < 1000) {
      const startDate = new Date(job.startDate || job.StartDate || job.createdAt || job.CreatedAt || Date.now());
      if (!Number.isNaN(startDate.getTime())) {
        const deadlineDate = new Date(startDate.getTime() + num * 24 * 60 * 60 * 1000);
        return safeDateFormat(deadlineDate.toISOString(), {
          year: "numeric",
          month: "short",
          day: "numeric",
        }, `${num} days`);
      }
    }
    return safeDateFormat(effectiveVal, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }, String(effectiveVal));
  })();

  const statusKey = String(job.status || "open").toLowerCase();
  const statusBadgeClass =
    statusKey === "completed"
      ? "bg-success-light text-success border border-success/25"
      : statusKey === "cancelled" || statusKey === "canceled"
        ? "bg-destructive-light text-destructive border border-destructive/25"
        : statusKey === "pending" || statusKey === "pending_escrow"
          ? "bg-warning-light text-warning border border-warning/25"
          : "bg-brand-primary-light text-brand-primary border border-brand-primary/25";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <BackButton fallback="/expert/find-jobs" className="mb-0">
        Back to Jobs
      </BackButton>
      <PageHeader
        title={job.title}
        subtitle={`Posted by ${job.client?.name || "Client"}${job.client?.company ? ` - ${job.client.company}` : ""}`}
        badge={
          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusBadgeClass}`}>
            {job.status || "Open"}
          </span>
        }
        actions={
          user?.role === "expert" && !invitation ? (
            hasSubmitted ? (
              <button disabled className="h-10 px-4 bg-secondary text-muted-foreground border border-border rounded-xl font-medium text-sm inline-flex items-center gap-2 cursor-not-allowed">
                <Send className="w-4 h-4" /> Proposal Submitted
              </button>
            ) : user.hasProfile ? (
              <button type="button" onClick={() => navigate(`/expert/jobs/${id}/proposal`)} className="h-10 px-4 bg-brand-primary text-brand-primary-foreground rounded-xl hover:bg-brand-primary-hover font-medium text-sm inline-flex items-center gap-2 transition-colors">
                <Send className="w-4 h-4" /> Apply Now
              </button>
            ) : (
              <div className="flex flex-col items-end gap-1.5">
                <button disabled className="h-10 px-4 bg-muted text-muted-foreground rounded-xl font-medium text-sm inline-flex items-center gap-2 cursor-not-allowed opacity-60">
                  <Send className="w-4 h-4" /> Apply Now
                </button>
                <span className="text-xs text-destructive font-medium">
                  Please <Link to="/expert/profile/edit" className="underline hover:text-destructive">complete your Profile</Link> to apply.
                </span>
              </div>
            )
          ) : undefined
        }
      />

      {/* Invitation banner */}
      {invitation && (
        <div className="bg-success-light dark:bg-success-light border border-success/20 dark:border-success/30 rounded-2xl p-5 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h4 className="text-sm font-semibold text-success dark:text-success">You've been invited to this project!</h4>
            <p className="text-xs text-success dark:text-success mt-1">Please Accept or Decline this invitation.</p>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={handleAcceptInvite} className="h-10 px-4 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-foreground rounded-xl text-sm font-medium transition-colors inline-flex items-center gap-2">
              Accept
            </button>
            <button type="button" onClick={handleDeclineInvite} className="h-10 px-4 bg-destructive hover:bg-destructive text-primary-foreground rounded-xl text-sm font-medium transition-colors inline-flex items-center gap-2">
              Decline
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Description */}
        <SectionCard title="Description" icon={FileText} padding="lg">
          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
            {job.description || "No description provided."}
          </p>
        </SectionCard>

        {/* User Stories */}
        {safeArray(job.useCases).length > 0 && (
          <SectionCard title="Project User Stories" icon={Layers} padding="lg">
            <div className="space-y-3">
              {safeArray(job.useCases).map((uc, i) => (
                <div key={i} className="space-y-2 rounded-2xl border border-border/50 bg-secondary/30 p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2 text-left">
                    <p className="font-semibold text-foreground text-sm">
                      User Story {i + 1}: <span className="font-semibold text-foreground/80">{uc.title || uc.nameAndDeadline}</span>
                    </p>
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full shrink-0">Duration: {uc.originalDurationDays || uc.durationDays || 1} days</span>
                  </div>
                  {uc.description ? (
                    <p className="border-l border-brand-primary/25 pl-3 text-sm text-muted-foreground">Description: {uc.description}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Category + Specialization */}
        <SectionCard title="Category & Skills" icon={Tag} padding="lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Category</p>
              <p className="text-sm text-foreground font-medium">{job.domain?.name || job.category || "-"}</p>
            </div>
            {(job.specialization || job.specializationName) && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Specialization</p>
                <p className="text-sm text-foreground font-medium">{job.specialization?.name || job.specializationName || job.specialization || "-"}</p>
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Required Skills</p>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill) => (
                  <span key={skill} className="px-2.5 py-0.5 bg-brand-primary-light text-brand-primary rounded-md text-xs font-medium">{skill}</span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No required skills listed.</p>
            )}
          </div>
        </SectionCard>

        {/* Project Attachments */}
        <SectionCard title="Project Attachments" icon={Paperclip} padding="lg">
          {(() => {
            const cached = job._attachments;
            const rawBE = job.attachmentUrl || job.AttachmentUrl;
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
                  const rawUrl = typeof file === "string" ? file : (file.url || file.Url || file.path || file.Path || "#");
                  const fileUrl = rawUrl.startsWith("http") ? rawUrl : enrichFileUrl(rawUrl);

                  let fileName = typeof file === "object" ? (file.name || file.Name || file.originalName || file.fileName) : null;
                  if (!fileName && typeof rawUrl === "string") {
                    fileName = cleanFileName(rawUrl);
                  } else if (fileName) {
                    fileName = cleanFileName(fileName);
                  }

                  const handleDownloadFile = (e) => {
                    e.preventDefault();
                    if (!fileUrl || fileUrl === "#") return;
                    downloadFile(fileUrl, fileName);
                  };

                  return (
                    <a
                      key={idx}
                      href={fileUrl}
                      onClick={handleDownloadFile}
                      download={fileName || true}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary/80 hover:bg-secondary border border-border rounded-lg text-xs font-medium text-foreground/80 hover:text-foreground transition-colors cursor-pointer"
                      title={`Download ${fileName}`}
                    >
                      <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{fileName || "Attachment"}</span>
                    </a>
                  );
                })}
              </div>
            );
          })()}
        </SectionCard>

        {/* Stats */}
        <SectionCard padding="lg">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-secondary/35 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-0.5">Budget</p>
              <p className="font-semibold text-foreground text-sm"><MoneyDisplay amount={job.budget} /></p>
            </div>
            <div className="rounded-xl bg-secondary/35 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-0.5">Deadline</p>
              <p className="font-semibold text-foreground text-sm">{deadlineText || "-"}</p>
            </div>
            <div className="rounded-xl bg-secondary/35 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-0.5">Posted</p>
              <p className="font-semibold text-foreground text-sm">{safeDateFormat(job.createdAt, { month: "short", day: "numeric", year: "numeric" })}</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
