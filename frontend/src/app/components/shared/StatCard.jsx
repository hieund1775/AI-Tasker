import { Link } from "react-router";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "../../lib/utils.js";

// =============================================================================
// StatCard — reusable single statistic card (premium modern SaaS style).
//
// Props:
//   icon        — Lucide icon component
//   label       — stat label text (e.g. "Active Projects")
//   value       — stat value (number, string, or ReactNode)
//   description — optional supporting text below the value
//   link        — optional route path (renders a "View →" link)
//   linkLabel   — custom link text (default "View")
//   color       — Tailwind classes for the icon container
//                  (e.g. "text-accent bg-accent-light")
//   trend       — { direction: "up" | "down", value: string } (e.g. "+12%")
//   size        — "sm" | "md" (default "md")
//   className   — additional classes for the card wrapper
//   onClick     — optional click handler (ignored if `link` is set)
// =============================================================================

const SIZE_STYLES = {
  sm: {
    card: "p-4",
    iconWrapper: "w-8 h-8 rounded-lg mb-2.5",
    icon: "w-4 h-4",
    label: "text-xs text-muted-foreground font-medium uppercase tracking-[0.04em]",
    value: "text-lg",
    trend: "text-xs",
  },
  md: {
    card: "p-5",
    iconWrapper: "w-9 h-9 rounded-lg mb-3",
    icon: "w-[18px] h-[18px]",
    label: "text-xs text-muted-foreground font-medium uppercase tracking-[0.04em]",
    value: "text-xl",
    trend: "text-xs",
  },
};

// Gradient color presets for icon containers
const COLOR_PRESETS = {
  "text-accent bg-accent-light": "bg-gradient-to-br from-accent/15 to-accent/5",
  "text-success bg-success-light": "bg-gradient-to-br from-success/15 to-success/5",
  "text-warning bg-warning-light": "bg-gradient-to-br from-warning/15 to-warning/5",
  "text-destructive bg-destructive-light": "bg-gradient-to-br from-destructive/15 to-destructive/5",
  "text-primary bg-primary-light": "bg-gradient-to-br from-primary/10 to-primary/3",
};

export function StatCard({
  icon: Icon,
  label,
  value,
  description,
  link,
  linkLabel = "View",
  color = "text-accent bg-accent-light",
  trend,
  size = "md",
  className = "",
  onClick,
}) {
  const s = SIZE_STYLES[size] || SIZE_STYLES.md;
  // Use gradient preset if available, fall back to original color
  const iconBg = COLOR_PRESETS[color] || color;

  const body = (
    <>
      {Icon && (
        <div
          className={cn(
            s.iconWrapper,
            "flex items-center justify-center relative overflow-hidden",
            iconBg,
          )}
        >
          {/* Subtle inner glow effect */}
          <div
            className="absolute inset-0 opacity-30 rounded-lg"
            style={{
              background: 'radial-gradient(circle at 30% 30%, white 0%, transparent 60%)',
            }}
          />
          <Icon className={cn(s.icon, "relative z-[1]", color.split(" ")[0])} />
        </div>
      )}
      {label && <p className={s.label}>{label}</p>}
      <div className="flex items-baseline gap-2 mt-0.5">
        <p className={cn("font-bold text-foreground animate-count-in", s.value)}>{value}</p>
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              s.trend,
              trend.direction === "up" ? "text-success" : "text-destructive",
            )}
          >
            {trend.direction === "up" ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {trend.value}
          </span>
        )}
      </div>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
      {link && (
        <span className="text-xs text-accent hover:text-accent-hover mt-2 inline-flex items-center gap-1 font-medium">
          {linkLabel} <ArrowRight className="w-3 h-3" />
        </span>
      )}
    </>
  );

  const cardClasses = cn(
    "bg-card rounded-xl border border-border card-hover relative overflow-hidden group",
    s.card,
    className,
  );

  // Subtle gradient border glow on hover
  const gradientBorder = cn(
    "absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none",
    "bg-gradient-to-br from-accent/[0.06] via-transparent to-primary/[0.04]",
  );

  if (link) {
    return (
      <Link to={link} className={cn(cardClasses, "block")}>
        {body}
        <div className={gradientBorder} />
      </Link>
    );
  }

  return (
    <div
      className={cardClasses}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {body}
      <div className={gradientBorder} />
    </div>
  );
}
