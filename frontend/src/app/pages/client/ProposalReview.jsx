import { useState, useEffect } from "react";
import { useParams } from "react-router";
import {
  Tag,
  Calendar,
  Clock,
  Users,
  FileText,
  FileSearch,
} from "lucide-react";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { BackButton } from "../../components/shared/BackButton.jsx";
import { ProposalCard } from "../../components/proposal/ProposalCard.jsx";
import { getMatchPercentage } from "../../lib/proposalStore.js";
import { safeArray, safeDateFormat } from "../../lib/safety.js";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import { SectionCard } from "../../components/shared/SectionCard.jsx";
import { AnimatedReveal } from "../../components/shared/AnimatedReveal.jsx";
import api from "../../../services/api.js";

/**
 * ProposalReview — Client views all proposals for a specific project.
 *
 * Route: /client/projects/:projectId/proposals
 */
export function ProposalReview() {
  const { projectId, id: legacyId } = useParams();
  const activeProjectId = projectId || legacyId;

  const [project, setProject] = useState(null);
  const [enrichedProposals, setEnrichedProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Track which proposals have been acted on (accepted/declined) locally
  // for immediate UI feedback without re-fetching
  const [actedIds, setActedIds] = useState(new Set());
  const [feedback, setFeedback] = useState(null); // { type, message }

  useEffect(() => {
    if (!activeProjectId) return;
    setLoading(true);
    Promise.all([
      api.jobPosts.getById(activeProjectId).catch(() => null),
      api.proposals.getByJob(activeProjectId).catch(() => []),
    ])
      .then(async ([jobPost, proposalList]) => {
        setProject(jobPost);

        // Fetch expert profiles for each proposal concurrently
        const enriched = await Promise.all(
          proposalList.map(async (proposal) => {
            let expertDetail = null;
            try {
              expertDetail = await api.users.getById(proposal.expertId);
            } catch (err) {
              console.error("Failed to load expert info for proposal:", err);
            }

            let parsed = {};
            try {
              parsed = JSON.parse(proposal.coverLetter);
            } catch (e) {
              parsed = {
                coverLetter: proposal.coverLetter,
                professionalIntro: proposal.coverLetter,
              };
            }

            const name = expertDetail?.fullName || "Unknown Expert";
            const initials = name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return {
              ...proposal,
              proposalTitle: parsed.proposalTitle || "Proposal",
              coverLetter: parsed.professionalIntro || parsed.coverLetter || "",
              durationDays: parsed.durationDays || 0,
              matchPct: getMatchPercentage(proposal.id),
              tasks: parsed.tasks || [],
              proposedTasks: parsed.proposedTasks || [],
              useCaseBreakdown: parsed.useCaseBreakdown || [],
              totalBidAmount: parsed.totalBidAmount || proposal.bidAmount,
              totalEstimatedDays: parsed.totalEstimatedDays || parsed.durationDays,
              expert: {
                name,
                title: expertDetail?.expertProfile?.jobTitle || "AI Expert",
                initials,
                skills: expertDetail?.expertProfile?.major ? [expertDetail.expertProfile.major] : [],
              },
            };
          })
        );
        setEnrichedProposals(enriched);
      })
      .catch((err) => {
        console.error("Failed to load proposal review data:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeProjectId]);

  const category = project?.aiCategoryDomain ? { label: project.aiCategoryDomain.name } : null;

  // Filter out declined proposals (unless already acted on this session)
  const visibleProposals = enrichedProposals.filter(
    (p) => p.status?.toLowerCase() !== "declined" || actedIds.has(p.id),
  );

  const handleAccept = async (proposalId, expertName) => {
    try {
      await api.proposals.updateStatus(proposalId, "Accepted");
      setActedIds((prev) => new Set([...prev, proposalId]));
      setFeedback({
        type: "success",
        message: `You accepted ${expertName}'s proposal. The project is now in progress.`,
      });
      setEnrichedProposals((prev) =>
        prev.map((p) =>
          p.id === proposalId
            ? { ...p, status: "Accepted" }
            : p.status === "Pending"
            ? { ...p, status: "Declined" }
            : p
        )
      );
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Failed to accept proposal." });
    }
    // Clear feedback after 5s
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleDecline = async (proposalId, expertName) => {
    try {
      await api.proposals.updateStatus(proposalId, "Declined");
      setActedIds((prev) => new Set([...prev, proposalId]));
      setFeedback({
        type: "info",
        message: `You declined ${expertName}'s proposal.`,
      });
      setEnrichedProposals((prev) =>
        prev.map((p) => (p.id === proposalId ? { ...p, status: "Declined" } : p))
      );
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Failed to decline proposal." });
    }
    setTimeout(() => setFeedback(null), 5000);
  };

  // ── Task-level accept/reject ──
  const handleAcceptProposedTask = async (proposalId, taskId, task) => {
    await updateTaskApproval(proposalId, taskId, "accepted");
  };

  const handleRejectProposedTask = async (proposalId, taskId, task) => {
    await updateTaskApproval(proposalId, taskId, "rejected");
  };

  const updateTaskApproval = async (proposalId, taskId, newStatus) => {
    try {
      const proposal = enrichedProposals.find(p => p.id === proposalId);
      if (!proposal) return;

      // Parse current cover letter
      let parsed = {};
      try {
        parsed = JSON.parse(proposal.coverLetter || proposal.coverLetterRaw || "{}");
      } catch (e) {
        parsed = { tasks: proposal.tasks || [] };
      }

      // Update task status in both tasks and proposedTasks arrays
      const updateTasks = (arr) => (arr || []).map(t =>
        t.id === taskId ? { ...t, approvalStatus: newStatus } : t
      );

      const updatedParsed = {
        ...parsed,
        tasks: updateTasks(parsed.tasks),
        proposedTasks: updateTasks(parsed.proposedTasks),
      };

      // Persist to MockDB
      await api.proposals.update(proposalId, {
        coverLetter: JSON.stringify(updatedParsed),
      });

      // Update local state
      setEnrichedProposals(prev =>
        prev.map(p => {
          if (p.id !== proposalId) return p;
          return {
            ...p,
            tasks: updateTasks(p.tasks || []),
            proposedTasks: updateTasks(p.proposedTasks || []),
          };
        })
      );

      const label = newStatus === "accepted" ? "accepted" : "rejected";
      setFeedback({ type: "success", message: `Proposed task "${task.title}" ${label}.` });
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Failed to update task." });
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton fallback="/client/my-projects" className="mb-6">Back</BackButton>
        <div className="bg-card rounded-xl border border-border p-12 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-muted-foreground animate-pulse">Loading proposals...</h3>
        </div>
      </div>
    );
  }

  // ---- Project not found ----
  if (!project) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton fallback="/client/my-projects" className="mb-6">Back</BackButton>
        <div className="bg-card rounded-xl border border-border p-12 text-center shadow-sm">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">Project not found</h3>
          <p className="text-base text-muted-foreground mt-1">
            This project may have been removed or the link is invalid.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        title="Review Proposals"
        subtitle="Compare expert proposals, review breakdowns, and accept the best fit for your project."
        badge={
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-light text-accent rounded-full text-xs font-semibold">
            <Users className="w-3.5 h-3.5" />
            {visibleProposals.length} proposal{visibleProposals.length !== 1 ? "s" : ""}
          </span>
        }
      />

      {/* ── Feedback banner ── */}
      {feedback && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm font-medium ${
            feedback.type === "success"
              ? "bg-success-light text-success border border-success"
              : feedback.type === "error"
                ? "bg-destructive-light text-destructive border border-destructive"
                : "bg-brand-primary-light text-brand-primary border border-brand-primary/30"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Project info card */}
      <AnimatedReveal>
        <SectionCard title={project.title} icon={FileText} badge={
          category ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-secondary text-secondary-foreground rounded-full text-[10px] font-medium">
              <Tag className="w-3 h-3" />
              {category.label}
            </span>
          ) : null
        } padding="lg">
          {/* Description */}
          <div className="mb-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</h3>
            <p className="text-foreground leading-relaxed whitespace-pre-wrap text-sm">
              {project.description || "No description provided."}
            </p>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-secondary/60 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Budget</p>
              <p className="font-semibold text-foreground text-sm"><MoneyDisplay amount={project.budget} /></p>
            </div>
            <div className="bg-secondary/60 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Timeline</p>
              <p className="font-semibold text-foreground text-sm">{project.durationValue} {project.durationUnit}</p>
            </div>
            {project.deadline && (
              <div className="bg-secondary/60 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-0.5">Deadline</p>
                <p className="font-semibold text-foreground text-sm">{safeDateFormat(project.deadline, { year: "numeric", month: "short", day: "numeric" })}</p>
              </div>
            )}
            {project.createdAt && (
              <div className="bg-secondary/60 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-0.5">Posted</p>
                <p className="font-semibold text-foreground text-sm">{safeDateFormat(project.createdAt, { year: "numeric", month: "short", day: "numeric" })}</p>
              </div>
            )}
          </div>

          {/* Required skills */}
          {project.requiredSkills?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/60">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Required Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {project.requiredSkills.map((skill) => (
                  <span key={skill} className="px-2.5 py-0.5 bg-brand-primary-light text-brand-primary rounded-full text-xs font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      </AnimatedReveal>

      {/* Proposals section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Proposals Received</h2>
        </div>

        {visibleProposals.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center shadow-sm">
            <FileSearch className="w-12 h-12 text-muted-foreground/25 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">No proposals yet</h3>
            <p className="text-sm text-muted-foreground">Proposals will appear here once experts submit them.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleProposals.map((proposal, i) => {
              const isAccepted = proposal.status === "accepted";
              const isDeclined = proposal.status === "declined";
              const hasBeenActed = isAccepted || isDeclined || actedIds.has(proposal.id);

              return (
                <AnimatedReveal key={proposal.id} delay={i}>
                  <ProposalCard
                    proposal={proposal}
                    isAccepted={isAccepted}
                    isDeclined={isDeclined}
                    hasBeenActed={hasBeenActed}
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                    onAcceptTask={handleAcceptProposedTask}
                    onRejectTask={handleRejectProposedTask}
                  />
                </AnimatedReveal>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
