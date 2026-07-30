import { getStatusBadgeClass, getStatusLabel, getTaskStatusClass, getTaskStatusLabel } from "../../lib/projectStatusConfig.js";
import { getProposalStatusConfig } from "../../lib/proposalStatusConfig.js";

// =============================================================================
// StatusBadge — unified status badge for all entity types.
// Features a status dot indicator + pill style.
//
// Props:
//   status    — internal status key (e.g. "in_progress", "accepted", "active")
//   entity    — "project" | "proposal" | "task" | "user" | "transaction" | "extension"
//   dot       — show status dot indicator (default true)
//   size      — "sm" | "md" (default "md")
//   className — additional CSS classes
// =============================================================================

const ENTITY_CONFIG = {
  project: {
    getClass: getStatusBadgeClass,
    getLabel: getStatusLabel,
  },
  proposal: {
    getClass: getProposalStatusConfig,
    getLabel: (key) => getProposalStatusConfig(key).label,
  },
  task: {
    getClass: getTaskStatusClass,
    getLabel: getTaskStatusLabel,
  },
};

const SIZE_STYLES = {
  sm: { wrapper: "gap-1 px-2 py-0.5 text-[10px]", dot: "w-1 h-1" },
  md: { wrapper: "gap-1.5 px-2.5 py-0.5 text-xs", dot: "w-1.5 h-1.5" },
};

export function StatusBadge({ status, entity = "project", className = "", dot = true, size = "md" }) {
  const config = ENTITY_CONFIG[entity];
  const s = SIZE_STYLES[size] || SIZE_STYLES.md;

  if (!config) {
    const label = String(status || "Unknown");
    return (
      <span className={`inline-flex items-center ${s.wrapper} rounded-full font-medium bg-secondary text-muted-foreground transition-colors ${className}`}>
        {dot && <span className={`${s.dot} rounded-full bg-current opacity-40 flex-shrink-0`} />}
        {label}
      </span>
    );
  }

  let badgeClass = "bg-secondary text-muted-foreground";
  let label = status || "Unknown";

  if (entity === "proposal") {
    const cfg = config.getClass(status);
    badgeClass = cfg.className;
    label = cfg.label;
  } else {
    badgeClass = config.getClass(status);
    label = config.getLabel(status);
  }

  return (
    <span className={`inline-flex items-center ${s.wrapper} rounded-full font-medium ${badgeClass} transition-colors ${className}`}>
      {dot && <span className={`${s.dot} rounded-full bg-current opacity-50 flex-shrink-0`} />}
      {label}
    </span>
  );
}
