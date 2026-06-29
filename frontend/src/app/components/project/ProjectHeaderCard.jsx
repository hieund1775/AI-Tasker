import {
  MessageSquare,
  Calendar,
  Tag,
  Clock,
  User,
  Briefcase,
  AlertCircle,
  Target,
  Timer,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { StatusBadge } from "../shared/StatusBadge.jsx";
import { MoneyDisplay } from "../shared/MoneyDisplay.jsx";
import { Button } from "../ui/button.jsx";
import { Skeleton } from "../ui/skeleton.jsx";
import { cn } from "../../lib/utils.js";

import { safeArray, safeDateFormat } from "../../lib/safety.js";
import {
  parseSafeDate,
  addDays,
  getRemainingText,
  resolveStartDate,
  resolveOriginalTimelineDays,
  formatDate,
} from "../../utils/dateTimeUtils.js";

// =============================================================================
// ProjectHeaderCard — project info header with status, names, budget, dates, tags.
// =============================================================================

// Tiny stat tile used in the summary grid
function StatTile({ icon: Icon, label, value, subtext, accent, loading }) {
  if (loading) return <Skeleton className="h-[88px] rounded-xl" />;
  return (
    <div className="bg-secondary/30 border border-border/60 rounded-xl p-4 flex flex-col gap-1.5 hover:border-border transition-colors">
      <div className="flex items-center gap-2">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", accent || "bg-muted")}>
          <Icon className="w-4 h-4 text-foreground/70" />
        </div>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-base font-bold text-foreground pl-10">{value}</p>
      {subtext && <p className="text-[10px] text-muted-foreground/60 pl-10 -mt-0.5">{subtext}</p>}
    </div>
  );
}

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

  // ---- Date calculations ----
  const startDateSrc = resolveStartDate(project);
  const startDateFormatted = formatDate(startDateSrc);

  const originalTimelineDays = resolveOriginalTimelineDays(project);

  const endDateSrc =
    parseSafeDate(project.endDate) ||
    (originalTimelineDays > 0 ? addDays(startDateSrc, originalTimelineDays) : null);

  const endDateFormatted = endDateSrc ? formatDate(endDateSrc) : null;
  const remainingText = getRemainingText(endDateSrc);

  // Implementation timeline — from tasks if available, otherwise project deadline
  const implementationDays = (() => {
    if (project.tasks && project.tasks.length > 0) {
      const total = project.tasks.reduce(
        (sum, t) => sum + (Number(t.completionDays) || Number(t.durationDays) || 0),
        0,
      );
      if (total > 0) return total;
    }
    const dl = Number(project.deadline);
    return Number.isFinite(dl) && dl < 1000 ? dl : null;
  })();

  const implementationEndSrc = implementationDays
    ? addDays(startDateSrc, implementationDays)
    : null;

  const otherPerson = role === "client" ? expert : client;
  const otherRoleLabel = role === "client" ? "Expert" : "Client";

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* ── Top section: title + actions ── */}
      <div className="p-6 pb-4">
        <div className="flex flex-col lg:flex-row justify-between gap-4">
          {/* Left */}
          <div className="flex-1 min-w-0">
            <StatusBadge status={project.status} entity="project" className="mb-2" />

            <h1 className="text-xl sm:text-2xl font-bold text-foreground mt-0.5 truncate">
              {project.title || "Untitled Project"}
            </h1>

            {otherPerson && (
              <p className="text-muted-foreground mt-1.5 text-sm flex items-center gap-1.5">
                <User className="w-4 h-4" />
                {otherRoleLabel}:{" "}
                <span className="text-foreground font-semibold">
                  {otherPerson.fullName || otherPerson.name || "—"}
                </span>
              </p>
            )}

            {/* Category & tags */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[13px] text-muted-foreground">
              {(project.category || project.aiCategoryDomain?.name) && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5" />
                  {project.aiCategoryDomain?.name || project.category}
                </span>
              )}
              {project.specialization && (
                <span className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" />
                  {project.specialization}
                </span>
              )}
            </div>

            {/* Skills */}
            {project.requiredSkills && project.requiredSkills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {project.requiredSkills.slice(0, 5).map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-0.5 bg-muted text-muted-foreground rounded-md text-[12px] font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
            {onMessage && (
              <Button variant="outline" size="default" onClick={onMessage}>
                <MessageSquare className="w-4 h-4" />
                Message
              </Button>
            )}
            {children}
          </div>
        </div>

        {/* ── Progress bar ── */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Progress</span>
            <span className="text-sm font-bold text-foreground font-mono">{overallProgress}%</span>
          </div>
          <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                overallProgress >= 100 ? "bg-success" : overallProgress >= 50 ? "bg-brand-primary" : "bg-amber-500",
              )}
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            {overallProgress >= 100
              ? "All tasks completed"
              : overallProgress >= 50
                ? "More than halfway there"
                : overallProgress > 0
                  ? "In progress"
                  : "Not started yet"}
          </p>
        </div>
      </div>

      {/* ── Summary stat tiles ── */}
      <div className="border-t border-border bg-muted/20 px-6 py-5">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Original Timeline */}
          <StatTile
            icon={Target}
            label="Original Timeline"
            value={originalTimelineDays > 0 ? `${originalTimelineDays} days` : "Not set"}
            subtext="Client baseline"
            accent="bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
          />

          {/* Implementation Timeline */}
          <StatTile
            icon={Timer}
            label="Implementation"
            value={implementationDays ? `${implementationDays} days` : "Not set"}
            subtext={implementationEndSrc ? `Est. ${formatDate(implementationEndSrc)}` : "Expert plan"}
            accent="bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
          />

          {/* Start Date */}
          <StatTile
            icon={Calendar}
            label="Start Date"
            value={startDateFormatted}
            subtext="Contract start"
            accent="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
          />

          {/* End Date */}
          <StatTile
            icon={Clock}
            label="End Date"
            value={endDateFormatted || "To be determined"}
            subtext={endDateFormatted ? "Estimated completion" : "Awaiting schedule"}
            accent="bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400"
          />

          {/* Timeline Remaining */}
          <StatTile
            icon={AlertCircle}
            label="Timeline còn lại"
            value={remainingText}
            subtext={endDateSrc ? "" : "Waiting for end date"}
            accent={
              remainingText.includes("Quá hạn")
                ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                : "bg-brand-primary/10 text-brand-primary dark:bg-brand-primary/20"
            }
          />

          {/* Total Budget */}
          <StatTile
            icon={DollarSign}
            label="Total Budget"
            value={<MoneyDisplay amount={project.budget || project.escrowAmount || 0} />}
            subtext="Escrow secured"
            accent="bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400"
          />

          {/* Progress (larger card) */}
          <div className="bg-secondary/30 border border-border/60 rounded-xl p-4 flex flex-col gap-1.5 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-brand-primary" />
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Progress</span>
            </div>
            <p className="text-2xl font-bold text-foreground font-mono">{overallProgress}%</p>
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700",
                  overallProgress >= 100 ? "bg-success" : overallProgress >= 50 ? "bg-brand-primary" : "bg-amber-500",
                )}
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground/60">
              Overall completion
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
