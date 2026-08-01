import { Link } from "react-router";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "../../lib/utils.js";

// =============================================================================
// StatCard - reusable single statistic card (premium modern SaaS style).
//
// Props:
//   icon        - Lucide icon component
//   label       - stat label text (e.g. "Active Projects")
//   value       - stat value (number, string, or ReactNode)
//   description - optional supporting text below the value
//   link        - optional route path (renders a "View ->" link)
//   linkLabel   - custom link text (default "View")
//   color       - Tailwind classes for the icon container
//                  (e.g. "text-accent bg-accent-light")
//   trend       - { direction: "up" | "down", value: string } (e.g. "+12%")
//   size        - "sm" | "md" (default "md")
//   className   - additional classes for the card wrapper
//   onClick     - optional click handler (ignored if `link` is set)
// =============================================================================

const SIZE_STYLES = {
  sm: {
    card: "p-4",
    iconWrapper: "w-8 h-8 rounded-lg mb-2.5",
    icon: "w-4 h-4",
    label: "text-xs text-muted-foreground font-medium",
    value: "text-base tabular-nums",
    trend: "text-xs",
  },
  md: {
    card: "p-5",
    iconWrapper: "w-9 h-9 rounded-lg mb-3",
    icon: "w-[18px] h-[18px]",
    label: "text-xs text-muted-foreground font-medium",
    value: "text-lg tabular-nums",
    trend: "text-xs",
  },
};

// Flat color presets for icon containers
const COLOR_PRESETS = {
  "text-accent bg-accent-light": "bg-accent-light",
  "text-success bg-success-light": "bg-success-light",
  "text-warning bg-warning-light": "bg-warning-light",
  "text-destructive bg-destructive-light": "bg-destructive-light",
  "text-primary bg-primary-light": "bg-primary-light",
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
          <Icon className={cn(s.icon, "relative z-[1]", color.split(" ")[0])} />
        </div>
      )}
      {label && <p className={s.label}>{label}</p>}
      <div className="flex items-baseline gap-2 mt-0.5">
        <p className={cn("font-semibold text-foreground", s.value)}>{value}</p>
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
    "bg-card rounded-2xl border border-border card-hover relative overflow-hidden group shadow-sm",
    s.card,
    className,
  );

  if (link) {
    return (
      <Link to={link} className={cn(cardClasses, "block")}>
        {body}
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
    </div>
  );
}
