import { MessageSquare, Calendar, Tag, Clock, User, Briefcase } from "lucide-react";
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

  const startDate = safeDateFormat(project.createdAt, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const endDate = (() => {
    if (!project.deadline) return "N/A";
    const num = Number(project.deadline);
    if (!Number.isNaN(num) && num < 1000) {
      const d = new Date();
      d.setDate(d.getDate() + num);
      return safeDateFormat(d, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
    return safeDateFormat(project.deadline, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }, String(project.deadline));
  })();

  const otherPerson = role === "client" ? expert : client;
  const otherRoleLabel = role === "client" ? "Expert" : "Client";

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
            {(project.category || project.aiCategoryDomain?.name) && (
              <span className="flex items-center gap-1">
                <Briefcase className="w-4 h-4" />
                {project.aiCategoryDomain?.name || project.category}
              </span>
            )}
            {project.specialization && (
              <span className="flex items-center gap-1">
                <Tag className="w-4 h-4" />
                {project.specialization}
              </span>
            )}
          </div>

          {/* Tags / Skills */}
          {project.requiredSkills && project.requiredSkills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {project.requiredSkills.slice(0, 5).map((skill) => (
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
            <Button
              variant="outline"
              size="default"
              onClick={onMessage}
            >
              <MessageSquare className="w-4 h-4" />
              Message
            </Button>
          )}

          {/* Slot for role-specific buttons (escrow, submit, etc.) */}
          {children}
        </div>
      </div>

      {/* Bottom row: stats and progress */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-4 border-t border-border">
        {/* Start Date */}
        <div>
          <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1 uppercase tracking-wide font-medium">
            <Calendar className="w-3.5 h-3.5" /> Start Date
          </p>
          <p className="text-sm font-medium text-foreground">{startDate}</p>
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
            <MoneyDisplay amount={project.budget || project.escrowAmount || 0} />
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
