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
    const endVal = project.endDate || project.EndDate || project.deadline || project.Deadline;
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
      const endVal = project.endDate || project.EndDate || project.deadline || project.Deadline;
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

          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mt-1 truncate">
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
              className="h-11 px-5 border border-border bg-card text-foreground hover:bg-secondary rounded-lg font-semibold text-base inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer"
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
    </div>
  );
}
