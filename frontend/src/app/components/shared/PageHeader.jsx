// =============================================================================
// PageHeader — consistent page header for all dashboard/detail pages.
//
// Props:
//   title        — page title (string or ReactNode)
//   subtitle     — short description below title
//   badge        — optional badge element (StatusBadge, etc.)
//   actions      — optional action area (buttons, links)
//   illustration — optional decorative element (SVG, icon group, etc.)
//   className    — additional classes
//   compact      — reduce padding
//   divider      — show gradient divider (default true)
//   glass        — use glass effect (default false)
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
  glass = false,
}) {
  return (
    <div className={cn("relative", glass && "glass-panel -mx-4 px-4 py-4 rounded-2xl -mt-2 mb-4", className)}>
      {illustration && (
        <div className="absolute -top-6 right-0 pointer-events-none select-none opacity-[0.07] dark:opacity-[0.04]">
          {illustration}
        </div>
      )}

      <div
        className={cn(
          "flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4",
          compact ? "mb-4" : glass ? "mb-0" : "mb-6",
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="page-title">{title}</h1>
            {badge && <span className="flex-shrink-0">{badge}</span>}
          </div>

          {subtitle && (
            <p className="page-subtitle mt-1 max-w-2xl">{subtitle}</p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-3 flex-shrink-0 sm:self-center">
            {actions}
          </div>
        )}
      </div>

      {divider && !glass && <div className="gradient-divider mb-6" />}
    </div>
  );
}

export default PageHeader;
