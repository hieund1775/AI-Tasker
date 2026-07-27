// =============================================================================
// SectionCard — consistent card section wrapper with optional header.
//
// Props:
//   title       — optional section title
//   subtitle    — optional section subtitle
//   badge       — optional badge next to title
//   actions     — optional action area (right-aligned in header)
//   icon        — optional Lucide icon before title
//   iconColor   — Tailwind color for icon container (default: "text-accent bg-accent-light")
//   children    — card body content
//   className   — additional classes
//   variant     — "default" | "glass" | "subtle" | "warning" | "branded"
//   padding     — override default padding ("sm" | "md" | "lg")
//   hover       — enable hover lift (default false)
//   noBorder    — remove border for seamless layouts
// =============================================================================

import { cn } from "../../lib/utils.js";

const PADDING = {
  sm: "p-4 sm:p-5",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

const VARIANTS = {
  default: "bg-card/82 border border-border/70 shadow-sm shadow-foreground/[0.02]",
  glass: "bg-card/70 border border-border/60 shadow-sm shadow-foreground/[0.02] backdrop-blur",
  subtle: "bg-secondary/40 border border-border/50 shadow-none",
  warning: "bg-warning-light/45 border border-warning/25 shadow-sm shadow-warning/[0.03]",
  branded: "bg-card/82 border border-accent/20 shadow-sm shadow-accent/[0.03]",
};

export function SectionCard({
  title,
  subtitle,
  badge,
  actions,
  icon: Icon,
  iconColor = "text-accent bg-accent-light",
  children,
  className = "",
  variant = "default",
  padding = "md",
  hover = false,
  noBorder = false,
}) {
  const p = PADDING[padding] || PADDING.md;
  const v = VARIANTS[variant] || VARIANTS.default;

  return (
    <div
      className={cn(
        "rounded-2xl transition-colors",
        noBorder ? "shadow-none" : v,
        p,
        hover && "card-hover hover:border-input",
        className,
      )}
    >
      {/* Section header */}
      {(title || actions || badge || Icon) && (
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {Icon && (
              <div
                className={cn(
                  "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ring-current/10",
                  iconColor,
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h3 className="text-sm font-semibold text-foreground">
                  {title}
                  {badge && (
                    <span className="ml-2 inline-flex">{badge}</span>
                  )}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs leading-relaxed text-muted-foreground mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}

      {/* Body */}
      {children}
    </div>
  );
}

export default SectionCard;
