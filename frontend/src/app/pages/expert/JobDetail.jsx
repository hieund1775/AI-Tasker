import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import {
  Clock,
  MapPin,
  Send,
  Calendar,
  User,
  Tag,
  Layers,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { safeArray, safeDateFormat } from "../../lib/safety.js";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import { SectionCard } from "../../components/shared/SectionCard.jsx";
import api from "../../../services/api.js";

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
    async function fetchJobData() {
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
              let parsedStatus = {};
              try {
                parsedStatus = JSON.parse(clientUser.status);
              } catch {
                parsedStatus = { companyName: "", location: "" };
              }
              clientInfo = {
                name: clientUser.fullName || clientUser.name || "Client",
                company: parsedStatus.companyName || "",
                location: parsedStatus.location || "",
              };
            }
          } catch (e) {
            console.error("Failed to load client details:", e);
          }
        }

        let invitationProposal = null;
        let hasSubmittedProp = false;
        if (user && user.role === "expert") {
          try {
            const proposals = await api.proposals.getByJob(project.id);
            invitationProposal = proposals.find(
              (p) => p.expertId === user.id && p.isSubmitted === false && p.status?.toLowerCase() !== "declined"
            );
            hasSubmittedProp = proposals.some(
              (p) => p.expertId === user.id && p.isSubmitted !== false && p.status?.toLowerCase() !== "declined" && p.status?.toLowerCase() !== "withdrawn"
            );
          } catch (e) {
            console.error("Failed to load proposals for job:", e);
          }
        }

        if (!cancelled) {
          setJob({
            ...project,
            client: clientInfo,
          });
          setInvitation(invitationProposal);
          setHasSubmitted(hasSubmittedProp);
        }
      } catch (apiError) {
        if (!cancelled) setError("Failed to load job details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchJobData();
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

      // 2. Remove assignedExpertId from the job post
      await api.jobPosts.update(id, { assignedExpertId: null });

      alert("Bạn đã từ chối lời mời thành công!");
      setInvitation(null);
      setJob(prev => prev ? { ...prev, assignedExpertId: null, assignedExpert: null } : null);
    } catch (e) {
      console.error("Failed to decline invite:", e);
      alert("Lỗi khi từ chối lời mời. Vui lòng thử lại!");
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-64 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader title="Job Details" subtitle="—" divider={false} />
        <div className="bg-card rounded-2xl border border-destructive/20 p-12 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-destructive mb-2">{error || "Job not found"}</h3>
          <p className="text-sm text-muted-foreground">This job may have been removed or is no longer available.</p>
        </div>
      </div>
    );
  }

  const skills = job.jobPostSkills?.map((s) => s.skill?.name) || job.requiredSkills || [];

  const deadlineText = (() => {
    if (!job.deadline) return null;
    const num = Number(job.deadline);
    if (!Number.isNaN(num) && num < 1000) return `${num} days`;
    return safeDateFormat(job.deadline, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }, String(job.deadline));
  })();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        title={job.title}
        subtitle={`Posted by ${job.client?.name || "Client"}${job.client?.company ? ` · ${job.client.company}` : ""}`}
        badge={
          <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-brand-primary-light text-brand-primary capitalize">
            {job.status || "Open"}
          </span>
        }
        actions={
          user?.role === "expert" && !invitation ? (
            hasSubmitted ? (
              <button disabled className="h-11 px-5 bg-secondary text-muted-foreground border border-border rounded-xl font-medium text-sm inline-flex items-center gap-2 cursor-not-allowed">
                <Send className="w-4 h-4" /> Proposal Submitted
              </button>
            ) : user.hasProfile ? (
              <button type="button" onClick={() => navigate(`/expert/jobs/${id}/proposal`)} className="h-11 px-5 bg-brand-primary text-brand-primary-foreground rounded-xl hover:bg-brand-primary-hover font-medium text-sm inline-flex items-center gap-2 transition-colors">
                <Send className="w-4 h-4" /> Apply Now
              </button>
            ) : (
              <div className="flex flex-col items-end gap-1.5">
                <button disabled className="h-11 px-5 bg-muted text-muted-foreground rounded-xl font-medium text-sm inline-flex items-center gap-2 cursor-not-allowed opacity-60">
                  <Send className="w-4 h-4" /> Apply Now
                </button>
                <span className="text-xs text-red-500 font-medium">
                  Please <Link to="/expert/profile/edit" className="underline hover:text-red-700">complete your Profile</Link> to apply.
                </span>
              </div>
            )
          ) : undefined
        }
      />

      {/* Invitation banner */}
      {invitation && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">You've been invited to this project!</h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">Please Accept or Decline this invitation.</p>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={handleAcceptInvite} className="h-10 px-5 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-foreground rounded-xl text-sm font-medium transition-colors inline-flex items-center gap-2">
              Accept
            </button>
            <button type="button" onClick={handleDeclineInvite} className="h-10 px-5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors inline-flex items-center gap-2">
              Decline
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Description */}
        <SectionCard title="Description" icon={FileText} padding="lg">
          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
            {job.description || "No description provided."}
          </p>
        </SectionCard>

        {/* Use Cases */}
        {safeArray(job.useCases).length > 0 && (
          <SectionCard title="Project Use Cases" icon={Layers} padding="lg">
            <div className="space-y-3">
              {safeArray(job.useCases).map((uc, i) => (
                <div key={i} className="p-4 bg-secondary/40 border border-border rounded-xl space-y-1.5">
                  <p className="font-bold text-foreground text-sm">
                    Use Case #{i + 1}: <span className="font-semibold">{uc.title || uc.nameAndDeadline}</span>
                  </p>
                  {uc.durationValue && (
                    <p className="text-xs text-brand-primary font-semibold pl-3">
                      Timeline gốc: {uc.durationValue} {uc.durationUnit === "days" ? "ngày" : uc.durationUnit === "weeks" ? "tuần" : uc.durationUnit === "months" ? "tháng" : uc.durationUnit === "years" ? "năm" : uc.durationUnit}
                    </p>
                  )}
                  <p className="text-muted-foreground text-sm pl-3 border-l-2 border-brand-primary/20">{uc.description}</p>
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{uc.originalDurationDays || 1} days</span>
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
              <p className="text-sm text-foreground font-medium">{job.aiCategoryDomain?.name || job.category || "—"}</p>
            </div>
            {job.specialization && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Specialization</p>
                <p className="text-sm text-foreground font-medium">{job.specialization}</p>
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

        {/* Stats */}
        <SectionCard padding="lg">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-secondary/40 rounded-xl">
              <p className="text-xs text-muted-foreground mb-0.5">Budget</p>
              <p className="font-semibold text-foreground text-sm"><MoneyDisplay amount={job.budget} /></p>
            </div>
            <div className="text-center p-3 bg-secondary/40 rounded-xl">
              <p className="text-xs text-muted-foreground mb-0.5">Deadline</p>
              <p className="font-semibold text-foreground text-sm">{deadlineText || "—"}</p>
            </div>
            <div className="text-center p-3 bg-secondary/40 rounded-xl">
              <p className="text-xs text-muted-foreground mb-0.5">Posted</p>
              <p className="font-semibold text-foreground text-sm">{safeDateFormat(job.createdAt, { month: "short", day: "numeric", year: "numeric" })}</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

