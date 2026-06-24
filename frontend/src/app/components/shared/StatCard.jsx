import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { cn } from "../../lib/utils.js";

// =============================================================================
// StatCard — reusable single statistic card.
//
// Props:
//   icon        — Lucide icon component
//   label       — stat label text (e.g. "Active Projects")
//   value       — stat value (number, string, or ReactNode)
//   description — optional supporting text below the value
//   link        — optional route path (renders a "View →" link)
//   linkLabel   — custom link text (default "View")
//   color       — Tailwind classes for the icon container
//                  (e.g. "text-brand-primary bg-brand-primary-light")
//   size        — "sm" | "md" (default "md")
//                  sm: compact style matching ClientDashboard
//                  md: standard style matching AdminDashboard
//   className   — additional classes for the card wrapper
//   onClick     — optional click handler (ignored if `link` is set)
// =============================================================================

const SIZE_STYLES = {
  sm: {
    card: "p-4",
    iconWrapper: "w-10 h-10 mb-2.5",
    icon: "w-[18px] h-[18px]",
    label: "text-sm text-gray-500 font-medium uppercase tracking-wide",
  },
  md: {
    card: "p-5",
    iconWrapper: "w-10 h-10 mb-3",
    icon: "w-5 h-5",
    label: "text-[15px] text-gray-500",
  },
};

export function StatCard({
  icon: Icon,
  label,
  value,
  description,
  link,
  linkLabel = "View",
  color = "text-brand-primary bg-brand-primary-light",
  size = "md",
  className = "",
  onClick,
}) {
  const s = SIZE_STYLES[size] || SIZE_STYLES.md;

  const body = (
    <>
      {Icon && (
        <div
          className={cn(
            s.iconWrapper,
            "rounded-lg flex items-center justify-center",
            color,
          )}
        >
          <Icon className={s.icon} />
        </div>
      )}
      {label && <p className={s.label}>{label}</p>}
      <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
      {description && (
        <p className="text-sm text-gray-400 mt-1">{description}</p>
      )}
      {link && (
        <span className="text-sm text-brand-primary hover:text-brand-primary-hover mt-2 inline-flex items-center gap-1">
          {linkLabel} <ArrowRight className="w-3 h-3" />
        </span>
      )}
    </>
  );

  const cardClasses = cn(
    "bg-white rounded-xl border border-gray-200 shadow-sm",
    s.card,
    (onClick || link) && "hover:shadow-md transition-shadow",
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
