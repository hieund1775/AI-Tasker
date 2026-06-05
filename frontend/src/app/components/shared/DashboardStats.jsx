import { StatCard } from "./StatCard.jsx";
import { cn } from "../../lib/utils.js";

// =============================================================================
// DashboardStats — responsive stat card grid for dashboards.
//
// Props:
//   stats        — array of stat objects:
//                    { label, value, icon, description?, link?, linkLabel?, color? }
//   columns      — grid columns override (default responsive: 2 on mobile, 4 on lg)
//   size         — forwarded to each StatCard ("sm" | "md", default "md")
//   className    — additional classes for the grid wrapper
//   cardClassName — additional classes passed to each StatCard
// =============================================================================

export function DashboardStats({
  stats = [],
  columns,
  size = "md",
  className = "",
  cardClassName = "",
}) {
  if (!stats || stats.length === 0) return null;

  return (
    <div
      className={cn(
        columns || "grid grid-cols-2 md:grid-cols-4 gap-4",
        className,
      )}
    >
      {stats.map((stat, i) => (
        <StatCard
          key={stat.label || i}
          icon={stat.icon}
          label={stat.label}
          value={stat.value}
          description={stat.description}
          link={stat.link}
          linkLabel={stat.linkLabel}
          color={stat.color}
          size={size}
          className={cardClassName}
        />
      ))}
    </div>
  );
}
