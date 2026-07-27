import { useState, useEffect } from "react";
import { MessageSquare, Calendar, Tag, Clock, User, Briefcase, ClipboardList } from "lucide-react";
import { StatusBadge } from "../shared/StatusBadge.jsx";
import { MoneyDisplay } from "../shared/MoneyDisplay.jsx";
import { Button } from "../ui/button.jsx";
import { Skeleton } from "../ui/skeleton.jsx";
import { cn } from "../../lib/utils.js";
import { safeArray, safeDateFormat } from "../../lib/safety.js";

// =============================================================================
// ProjectHeaderCard — project info header with status, names, budget, dates, tags.
//
// Props:
//   project        — project object
//   client         — client user object (optional)
//   expert         — expert user object (optional)
//   role           — "client" | "expert" (determines what info to show)
//   overallProgress — 0-100 number
//   loading        — boolean, shows skeleton
//   onMessage      — () => void — navigate to messenger
//   children       — slot for role-specific action buttons (escrow, submit, etc.)
// =============================================================================

export function ProjectHeaderCard({
  project,
  client,
  expert,
  role = "client",
  overallProgress = 0,
  loading = false,
  onMessage,
  children,
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!project) return;
    const status = project.status?.toLowerCase();
    if (["active", "in_progress", "in progress", "disputed"].includes(status)) {
      const interval = setInterval(() => {
        setTick((t) => t + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [project?.status]);

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="space-y-3 flex-1">
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-28 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!project) return null;

  const startDate = safeDateFormat(project.startDate || project.StartDate || project.createdAt || project.CreatedAt, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const endDate = (() => {
    // Check localStorage for extended project deadline
    const projId = project.id || project.Id;
    const localDeadline = projId ? localStorage.getItem(`project_deadline_${projId}`) : null;
    const endVal = localDeadline || project.projectDeadlineDate || project.endDate || project.EndDate || project.deadline || project.Deadline;
    if (!endVal) return "N/A";
    const num = Number(endVal);
    if (!Number.isNaN(num) && num < 1000) {
      const d = new Date(project.startDate || project.StartDate || project.createdAt || project.CreatedAt || new Date());
      d.setDate(d.getDate() + num);
      return safeDateFormat(d, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
    return safeDateFormat(endVal, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }, String(endVal));
  })();

  const remainingTime = (() => {
    if (!project) return "N/A";
    const status = project.status?.toLowerCase();

    // If finished
    if (["completed", "payment_released", "closed"].includes(status)) {
      return "0 days (Completed)";
    }

    // If active / in progress / disputed
    if (["active", "in_progress", "in progress", "disputed"].includes(status)) {
      let end = null;

      // Check localStorage first (extended deadline from approval)
      const projId = project.id || project.Id;
      const localDeadline = projId ? localStorage.getItem(`project_deadline_${projId}`) : null;
      const endVal = localDeadline || project.projectDeadlineDate || project.endDate || project.EndDate || project.deadline || project.Deadline;

      if (endVal) {
        const num = Number(endVal);
        if (!Number.isNaN(num) && num < 1000) {
          const d = new Date(project.startDate || project.StartDate || project.createdAt || project.CreatedAt || new Date());
          d.setDate(d.getDate() + num);
          end = d;
        } else {
          end = new Date(endVal);
        }
      }
      if (!end || Number.isNaN(end.getTime())) {
        return "N/A";
      }

      const now = new Date();
      const diffMs = end.getTime() - now.getTime();
      if (diffMs <= 0) {
        return "Overdue";
      }

      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHrs = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHrs / 24);

      if (diffDays > 0) {
        return `${diffDays} days remaining`;
      } else if (diffHrs > 0) {
        return `${diffHrs} hours remaining`;
      } else if (diffMins > 0) {
        return `${diffMins} minutes remaining`;
      } else {
        return `${diffSecs} seconds remaining`;
      }
    }

    // Default/Not started: show use case total duration
    const useCaseDays = project.useCases?.reduce((sum, uc) => sum + (Number(uc.originalDurationDays || uc.durationDays) || 0), 0) || 0;
    return `${useCaseDays} days`;
  })();

  const otherPerson = role === "client" ? expert : client;
  const otherRoleLabel = role === "client" ? "Expert" : "Client";

  const category = project.category || project.aiCategoryDomain?.name || project.aiCategoryDomain?.Name || project.jobPost?.category || project.jobPost?.domain?.name || project.jobPost?.Domain?.Name;
  const specialization = project.specialization || project.jobPost?.specialization?.name || project.jobPost?.Specialization?.Name || project.jobPost?.specializationName || project.jobPost?.specialization;
  const requiredSkills = project.requiredSkills || project.jobPost?.requiredSkills || project.jobPost?.jobPostSkills?.map(s => s.skill?.name || s.skill?.Name || s.Skill?.name || s.Skill?.Name || s.skillName || s.SkillName || "").filter(Boolean) || [];

  return (
    <div className="bg-card rounded-xl border border-border p-6 relative overflow-hidden">
      {/* Gradient top accent */}
      <div className="absolute top-0 left-4 right-4 h-[2px] rounded-full bg-gradient-to-r from-accent/60 via-accent/30 to-transparent" />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Left: project info */}
        <div className="flex-1 min-w-0">
          <StatusBadge status={project.status} entity="project" className="mb-2" />

          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mt-1 truncate">
            {project.title || "Untitled Project"}
          </h1>

          {/* Other person info */}
          {otherPerson && (
            <p className="text-muted-foreground mt-1 text-sm flex items-center gap-1.5">
              <User className="w-4 h-4" />
              {otherRoleLabel}:{" "}
              <span className="text-foreground font-semibold">
                {otherPerson.fullName || otherPerson.name || "—"}
              </span>
            </p>
          )}

          {/* Category & Specialization */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-[13px] text-muted-foreground">
            {category && (
              <span className="flex items-center gap-1">
                <Briefcase className="w-4 h-4" />
                {category}
              </span>
            )}
            {specialization && (
              <span className="flex items-center gap-1">
                <Tag className="w-4 h-4" />
                {specialization}
              </span>
            )}
          </div>

          {/* Tags / Skills */}
          {requiredSkills && requiredSkills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {requiredSkills.slice(0, 5).map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-0.5 bg-secondary text-muted-foreground rounded-md text-[13px] font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right: action buttons */}
        <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
          {/* Message button */}
          {onMessage && (
            <button
              type="button"
              onClick={onMessage}
              className="h-10 px-4 border border-border bg-card text-foreground hover:bg-secondary rounded-lg font-semibold text-base inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              Message
            </button>
          )}

          {/* Slot for role-specific buttons (escrow, submit, etc.) */}
          {children}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-5 pt-4 border-t border-border">
        {/* Start Date */}
        <div>
          <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1 uppercase tracking-wide font-medium">
            <Calendar className="w-3.5 h-3.5" /> Start Date
          </p>
          <p className="text-sm font-medium text-foreground">{startDate}</p>
        </div>

        {/* Remaining Time */}
        <div>
          <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1 uppercase tracking-wide font-medium">
            <Clock className="w-3.5 h-3.5 text-accent" /> Remaining Time
          </p>
          <p className="text-sm font-semibold text-foreground">{remainingTime}</p>
        </div>

        {/* End Date / Deadline */}
        <div>
          <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1 uppercase tracking-wide font-medium">
            <Clock className="w-3.5 h-3.5" /> End Date
          </p>
          <p className="text-sm font-medium text-foreground">{endDate}</p>
        </div>

        {/* Total Budget */}
        <div>
          <p className="text-xs text-muted-foreground mb-0.5 uppercase tracking-wide font-medium">Total Budget</p>
          <p className="text-sm font-semibold text-foreground">
            <MoneyDisplay amount={project.escrowBalance || project.EscrowBalance || project.budget || project.escrowAmount || 0} />
          </p>
        </div>

        {/* Progress */}
        <div>
          <p className="text-xs text-muted-foreground mb-0.5 uppercase tracking-wide font-medium">Progress</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-primary font-mono">
              {overallProgress}%
            </span>
            <div className="flex-1 bg-secondary h-1.5 rounded-full overflow-hidden max-w-[80px]">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Project Extension Request & Approval Flow (underneath stats grid) */}
      {["active", "in_progress", "in progress"].includes((project.status || "").toLowerCase()) && (
        <ProjectExtensionControl
          project={project}
          role={role}
        />
      )}
    </div>
  );
}

// Sub-component for Project Extension Flow directly under stats grid
function ProjectExtensionControl({ project, role }) {
  const projId = project.id || project.Id;
  const [showForm, setShowForm] = useState(false);
  const [extendDays, setExtendDays] = useState("2");
  const [extendReason, setExtendReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [extensionData, setExtensionData] = useState(null);

  const loadExtension = () => {
    if (!projId) return;
    try {
      const raw = localStorage.getItem(`project_extension_request_${projId}`);
      if (raw) {
        setExtensionData(JSON.parse(raw));
      } else if (project?.extensionRequest) {
        setExtensionData(project.extensionRequest);
      } else {
        setExtensionData(null);
      }
    } catch (e) {
      setExtensionData(null);
    }
  };

  useEffect(() => {
    loadExtension();
    const handleUpdate = () => loadExtension();
    window.addEventListener("aitasker_db_update", handleUpdate);
    return () => window.removeEventListener("aitasker_db_update", handleUpdate);
  }, [projId, project]);

  const handleSubmitRequest = async () => {
    const days = Number(extendDays);
    if (!days || days <= 0 || !extendReason.trim()) return;
    setSubmitting(true);
    try {
      const newReq = {
        status: "pending",
        requestedDays: days,
        reason: extendReason.trim(),
        requestedAt: new Date().toISOString(),
      };
      localStorage.setItem(`project_extension_request_${projId}`, JSON.stringify(newReq));
      setExtensionData(newReq);
      setShowForm(false);
      setExtendReason("");

      // Dispatch event to sync UI across tabs
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
      toast.success(`Extension request for +${days} days submitted to Client!`);
    } catch (e) {
      toast.error("Failed to submit extension request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = () => {
    if (!extensionData || !projId) return;
    setSubmitting(true);
    try {
      const extraDays = Number(extensionData.requestedDays) || 1;

      // Calculate current end date
      const localDeadline = localStorage.getItem(`project_deadline_${projId}`);
      const baseEnd = localDeadline || project.projectDeadlineDate || project.endDate || project.EndDate || project.deadline || project.Deadline;
      let baseDate = new Date();

      if (baseEnd) {
        const num = Number(baseEnd);
        if (!Number.isNaN(num) && num < 1000) {
          baseDate = new Date(project.startDate || project.StartDate || project.createdAt || project.CreatedAt || new Date());
          baseDate.setDate(baseDate.getDate() + num);
        } else {
          baseDate = new Date(baseEnd);
        }
      }

      const newDate = new Date(baseDate.getTime() + extraDays * 24 * 60 * 60 * 1000);
      localStorage.setItem(`project_deadline_${projId}`, newDate.toISOString());

      const approvedReq = {
        ...extensionData,
        status: "approved",
        approvedAt: new Date().toISOString(),
      };
      localStorage.setItem(`project_extension_request_${projId}`, JSON.stringify(approvedReq));
      setExtensionData(approvedReq);

      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
      toast.success(`Project deadline extended by +${extraDays} days successfully!`);
    } catch (e) {
      toast.error("Failed to approve extension.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = () => {
    if (!extensionData || !projId) return;
    setSubmitting(true);
    try {
      const rejectedReq = {
        ...extensionData,
        status: "rejected",
        rejectReason: rejectReason.trim(),
        rejectedAt: new Date().toISOString(),
      };
      localStorage.setItem(`project_extension_request_${projId}`, JSON.stringify(rejectedReq));
      setExtensionData(rejectedReq);

      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
      toast.info("Project extension request rejected.");
    } catch (e) {
      toast.error("Failed to reject extension.");
    } finally {
      setSubmitting(false);
    }
  };

  const isPending = extensionData && extensionData.status === "pending";
  const isApproved = extensionData && extensionData.status === "approved";

  return (
    <div className="mt-4 pt-4 border-t border-border">
      {/* Expert action button if no active form or pending request */}
      {role === "expert" && !showForm && !isPending && (
        <div className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground">
            Need more time for this project? You can request an overall deadline extension.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="px-3.5 py-1.5 bg-accent-light text-accent border border-accent/20 hover:bg-accent/20 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Clock className="w-3.5 h-3.5" /> Request Project Extension
          </button>
        </div>
      )}

      {/* Expert extension request form */}
      {role === "expert" && showForm && (
        <div className="p-4 bg-accent-light/40 border border-accent/20 rounded-xl space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-accent flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> Extend Project Time
            </h4>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xs text-muted-foreground hover:text-foreground font-semibold"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Extra Days
              </label>
              <input
                type="number"
                min="1"
                value={extendDays}
                onChange={(e) => setExtendDays(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-input rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 font-medium"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Reason
              </label>
              <input
                type="text"
                value={extendReason}
                onChange={(e) => setExtendReason(e.target.value)}
                placeholder="Why do you need more time for this project?"
                className="w-full px-3 py-1.5 text-sm border border-input rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 font-medium"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={submitting || !extendReason.trim() || Number(extendDays) <= 0}
              onClick={handleSubmitRequest}
              className="px-4 py-1.5 bg-accent text-accent-foreground hover:opacity-90 disabled:opacity-50 text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
            >
              {submitting ? "Submitting..." : "Submit Extension Request"}
            </button>
          </div>
        </div>
      )}

      {/* Extension status banner */}
      {isPending && (
        <div className="p-4 bg-warning-light/10 border border-warning/30 rounded-xl space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-warning dark:text-warning" />
              <span className="text-sm font-semibold text-warning dark:text-warning">
                Project Extension Request (+{extensionData.requestedDays} days)
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-warning-light/20 text-warning dark:text-warning">
              Pending Review
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Reason:</span> {extensionData.reason}
          </p>

          {/* Client action buttons */}
          {role === "client" && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <button
                type="button"
                disabled={submitting}
                onClick={handleApprove}
                className="px-4 py-1.5 bg-success text-success-foreground hover:opacity-90 disabled:opacity-50 text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
              >
                {submitting ? "Processing..." : `Approve (+${extensionData.requestedDays} Days)`}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleReject}
                className="px-4 py-1.5 bg-destructive text-destructive-foreground hover:opacity-90 disabled:opacity-50 text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
              >
                Reject Request
              </button>
            </div>
          )}

          {role === "expert" && (
            <p className="text-xs text-warning dark:text-warning italic">
              Your extension request has been sent to the Client for review.
            </p>
          )}
        </div>
      )}

      {isApproved && (
        <div className="p-3 bg-success/10 border border-success/20 rounded-xl flex items-center justify-between text-xs text-success font-medium">
          <span>✅ Project deadline extended by +{extensionData.requestedDays} days.</span>
          <button
            type="button"
            onClick={() => {
              try { localStorage.removeItem(`project_extension_request_${projId}`); } catch(e){}
              setExtensionData(null);
            }}
            className="text-[11px] underline font-normal text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
