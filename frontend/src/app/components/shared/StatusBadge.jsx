import { getStatusBadgeClass, getStatusLabel, getTaskStatusClass, getTaskStatusLabel } from "../../lib/projectStatusConfig.js";
import { getProposalStatusConfig } from "../../lib/proposalStatusConfig.js";

// =============================================================================
// StatusBadge — unified status badge for all entity types (modern pill style).
//
// Props:
//   status    — internal status key (e.g. "in_progress", "accepted", "active")
//   entity    — "project" | "proposal" | "task" | "user" | "transaction" | "extension"
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

export function StatusBadge({ status, entity = "project", className = "" }) {
  const config = ENTITY_CONFIG[entity];

  if (!config) {
    const label = String(status || "Unknown");
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />
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
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />
      {label}
    </span>
  );
}
