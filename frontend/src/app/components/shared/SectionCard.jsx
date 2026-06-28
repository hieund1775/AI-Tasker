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
  default: "bg-card border border-border shadow-sm",
  glass: "bg-card/70 backdrop-blur-sm border border-border/60 shadow-sm",
  subtle: "bg-secondary/60 border border-border/40 shadow-none",
  warning: "bg-card border border-warning/20 shadow-sm",
  branded: "bg-card border border-accent/15 shadow-sm",
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
        "rounded-2xl",
        noBorder ? "shadow-none" : v,
        p,
        hover && "card-hover",
        className,
      )}
    >
      {/* Section header */}
      {(title || actions || badge || Icon) && (
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                  iconColor,
                )}
              >
                <Icon className="w-4 h-4" />
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
                <p className="text-xs text-muted-foreground mt-0.5">
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
