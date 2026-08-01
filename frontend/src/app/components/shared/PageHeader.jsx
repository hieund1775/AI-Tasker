// =============================================================================
// PageHeader - consistent page header for all dashboard/detail pages.
//
// Props:
//   title        - page title (string or ReactNode)
//   subtitle     - short description below title
//   badge        - optional badge element (StatusBadge, etc.)
//   actions      - optional action area (buttons, links) - right-aligned on desktop
//   illustration - optional decorative element (SVG, icon group, etc.)
//   className    - additional classes for the outer wrapper
//   compact      - reduce padding for dense layouts
//   divider      - show a gradient divider below header (default true)
// =============================================================================

import { cn } from "../../lib/utils.js";

export function PageHeader({
  title,
  subtitle,
  badge,
  actions,
  illustration,
  className = "",
  compact = false,
  divider = true,
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-border/70 bg-card/85 p-5 shadow-sm shadow-foreground/[0.025] sm:p-6", className)}>
      {/* Optional background illustration layer */}
      {illustration && (
        <div className="absolute -top-6 right-0 pointer-events-none select-none opacity-[0.07] dark:opacity-[0.04]">
          {illustration}
        </div>
      )}

      <div
        className={cn(
          "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
          divider ? (compact ? "mb-3" : "mb-4") : "mb-0",
        )}
      >
        <div className="flex-1 min-w-0">
          {/* Title row with optional badge */}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="page-title text-foreground">{title}</h1>
            {badge && <span className="flex-shrink-0">{badge}</span>}
          </div>

          {/* Subtitle */}
          {subtitle && (
            <p className="page-subtitle mt-2 max-w-2xl">{subtitle}</p>
          )}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-3 flex-shrink-0 sm:self-center">
            {actions}
          </div>
        )}
      </div>

      {/* Gradient divider */}
      {divider && <div className="gradient-divider" />}
    </div>
  );
}

export default PageHeader;
