import { getStatusBadgeClass, getStatusLabel, getTaskStatusClass, getTaskStatusLabel } from "../../lib/projectStatusConfig.js";
import { getProposalStatusConfig } from "../../lib/proposalStatusConfig.js";

// =============================================================================
// StatusBadge - unified status badge for all entity types (modern pill style).
//
// Props:
//   status    - internal status key (e.g. "in_progress", "accepted", "active")
//   entity    - "project" | "proposal" | "task" | "user" | "transaction" | "extension"
//   className - additional CSS classes
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

export function StatusBadge({ status, entity = "project", className = "", config: customConfig }) {
  if (customConfig) {
    const key = String(status || "Unknown");
    const cfg = customConfig[key] || customConfig[key.toLowerCase()] || {
      color: "bg-secondary text-foreground/80 border border-border",
      label: key,
    };
    const badgeClass = cfg.className || cfg.color || "bg-secondary text-foreground/80 border border-border";
    const label = cfg.label || key;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeClass} ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />
        {label}
      </span>
    );
  }

  const config = ENTITY_CONFIG[entity];

  if (!config) {
    const label = String(status || "Unknown");
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-primary-light text-brand-primary border border-brand-primary/20 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />
        {label}
      </span>
    );
  }

  let badgeClass = "bg-brand-primary-light text-brand-primary border border-brand-primary/20 font-semibold";
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
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeClass} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />
      {label}
    </span>
  );
}
