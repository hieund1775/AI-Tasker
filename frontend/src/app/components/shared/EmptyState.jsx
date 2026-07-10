import { cn } from "../../lib/utils.js";
import { SearchX, FolderOpen, BellOff, MessageSquareOff, FileText, AlertTriangle, PackageOpen } from "lucide-react";
import { motion } from "motion/react";

// =============================================================================
// EmptyState — reusable empty/not-found placeholder (premium design).
//
// Props:
//   icon         — Lucide icon component (optional, auto-detects based on type)
//   title        — heading text (required)
//   description  — supporting text (optional)
//   action       — React node for a CTA button/link (optional)
//   illustration — React node (optional) — rendered above the icon for branded visuals
//   className    — additional classes for the outer wrapper
//   size         — "sm" | "md" | "lg" (default "md")
//   variant      — "default" | "minimal" (no border/bg, just centered content)
//   type         — "empty" | "not-found" | "error" | "no-projects" | "no-notifications" | "no-messages" | "no-proposals"
// =============================================================================

const SIZES = {
  sm: {
    wrapper: "p-6",
    iconWrapper: "w-12 h-12",
    icon: "w-6 h-6",
    title: "text-sm",
    desc: "text-xs",
    decorationSize: "w-24 h-24",
  },
  md: {
    wrapper: "p-10 sm:p-12",
    iconWrapper: "w-16 h-16",
    icon: "w-8 h-8",
    title: "text-base sm:text-lg",
    desc: "text-sm",
    decorationSize: "w-36 h-36",
  },
  lg: {
    wrapper: "p-12 sm:p-16",
    iconWrapper: "w-20 h-20",
    icon: "w-10 h-10",
    title: "text-lg sm:text-xl",
    desc: "text-sm sm:text-base",
    decorationSize: "w-48 h-48",
  },
};

const TYPE_DEFAULTS = {
  empty: {
    icon: null,
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground/30",
    titlePrefix: "",
  },
  "not-found": {
    icon: SearchX,
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground/30",
    titlePrefix: "",
  },
  error: {
    icon: AlertTriangle,
    iconBg: "bg-destructive-light",
    iconColor: "text-destructive/40",
    titlePrefix: "",
  },
  "no-projects": {
    icon: FolderOpen,
    iconBg: "bg-accent-light",
    iconColor: "text-accent/40",
    titlePrefix: "",
  },
  "no-notifications": {
    icon: BellOff,
    iconBg: "bg-warning-light",
    iconColor: "text-warning/40",
    titlePrefix: "",
  },
  "no-messages": {
    icon: MessageSquareOff,
    iconBg: "bg-success-light",
    iconColor: "text-success/40",
    titlePrefix: "",
  },
  "no-proposals": {
    icon: FileText,
    iconBg: "bg-primary-light",
    iconColor: "text-primary/30",
    titlePrefix: "",
  },
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  illustration,
  className = "",
  size = "md",
  variant = "default",
  type = "empty",
}) {
  const s = SIZES[size] || SIZES.md;
  const t = TYPE_DEFAULTS[type] || TYPE_DEFAULTS.empty;
  const ResolvedIcon = Icon || t.icon;

  const content = (
    <>
      {/* Illustration (optional) */}
      {illustration && (
        <div className="mx-auto mb-5 flex items-center justify-center">
          {illustration}
        </div>
      )}

      {/* Icon with decorative ring */}
      <div className="relative mx-auto mb-4 inline-flex items-center justify-center">
        {/* Decorative dotted ring */}
        <div
          aria-hidden="true"
          className={cn(
            "absolute rounded-full border border-dashed opacity-[0.10]",
            s.decorationSize,
          )}
          style={{ borderColor: 'var(--border)' }}
        />
        {ResolvedIcon && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className={cn(
              "rounded-full flex items-center justify-center relative z-[1]",
              s.iconWrapper,
              t.iconBg,
            )}
          >
            <ResolvedIcon className={cn(s.icon, t.iconColor)} />
          </motion.div>
        )}
      </div>

      {title && (
        <h3 className={cn("font-semibold text-foreground/60 mb-1.5", s.title)}>
          {t.titlePrefix}{title}
        </h3>
      )}
      {description && (
        <p className={cn("text-muted-foreground max-w-sm mx-auto", s.desc, action ? "mb-5" : "")}>
          {description}
        </p>
      )}
      {action && <div className="inline-flex">{action}</div>}
    </>
  );

  if (variant === "minimal") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={cn("text-center py-8 relative", className)}
      >
        {content}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "bg-card rounded-xl border border-border text-center relative",
        s.wrapper,
        className,
      )}
    >
      {content}
    </motion.div>
  );
}
