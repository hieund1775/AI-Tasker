import { cn } from "../../lib/utils.js";

// =============================================================================
// EmptyState — reusable empty/not-found placeholder.
//
// Props:
//   icon         — Lucide icon component (optional)
//   title        — heading text (required)
//   description  — supporting text (optional)
//   action       — React node for a CTA button/link (optional)
//   className    — additional classes for the outer wrapper
//   size         — "sm" | "md" (default "md")
// =============================================================================

const SIZES = {
  sm: {
    wrapper: "p-8",
    icon: "w-10 h-10",
    title: "text-base",
    desc: "text-xs",
  },
  md: {
    wrapper: "p-12",
    icon: "w-12 h-12",
    title: "text-lg",
    desc: "text-sm",
  },
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
  size = "md",
}) {
  const s = SIZES[size] || SIZES.md;

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-gray-200 shadow-sm text-center",
        s.wrapper,
        className,
      )}
    >
      {Icon && <Icon className={cn("text-gray-300 mx-auto mb-4", s.icon)} />}
      {title && (
        <h3 className={cn("font-semibold text-gray-500 mb-2", s.title)}>
          {title}
        </h3>
      )}
      {description && (
        <p className={cn("text-gray-400", s.desc, action ? "mb-4" : "")}>
          {description}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
