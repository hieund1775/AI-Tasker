// =============================================================================
// ProjectTimelineIllustration — milestone path with progress indicators.
// Shows 4-5 milestones on a curving path: completed (check), current (pulse), upcoming (empty).
// Props: size — "sm" (240x80) | "md" (400x120) | completed — 0-5 (default: 2)
// =============================================================================

const SIZES = {
  sm: { w: 240, h: 80, r: 8, fontSize: 7 },
  md: { w: 400, h: 120, r: 11, fontSize: 9 },
};

const MILESTONES = ["Plan", "Build", "Review", "Test", "Launch"];

export function ProjectTimelineIllustration({ size = "md", completed = 2, className = "" }) {
  const s = SIZES[size] || SIZES.md;
  const total = MILESTONES.length;
  const startX = s.w * 0.1;
  const endX = s.w * 0.9;
  const spacing = (endX - startX) / (total - 1);
  const pathY = s.h * 0.5;
  const amplitude = s.h * 0.2;

  // Build an SVG path that gently waves
  let pathD = `M${startX} ${pathY}`;
  for (let i = 1; i < total; i++) {
    const x = startX + spacing * i;
    const cpX = startX + spacing * (i - 0.5);
    const cpY = i % 2 === 0 ? pathY - amplitude : pathY + amplitude;
    const nextCpX = x;
    const nextCpY = i % 2 === 0 ? pathY + amplitude : pathY - amplitude;
    if (i === 1) {
      pathD += ` C${cpX} ${cpY}, ${nextCpX} ${nextCpY}, ${x} ${pathY}`;
    } else {
      pathD += ` S${nextCpX} ${nextCpY}, ${x} ${pathY}`;
    }
  }

  return (
    <svg
      width={s.w}
      height={s.h}
      viewBox={`0 0 ${s.w} ${s.h}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Curving path */}
      <path
        d={pathD}
        stroke="var(--border)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Gradient overlay on completed portion — simplified as separate stroke */}
      <path
        d={pathD}
        stroke="color-mix(in srgb, var(--accent) 60%, transparent)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${((completed - 1) / (total - 1)) * parseInt(pathD.match(/\d+/)?.[0] || 100)} 1000`}
        opacity="0.6"
      />

      {/* Milestone nodes */}
      {MILESTONES.map((label, i) => {
        const x = startX + spacing * i;
        const y = pathY;
        const isCompleted = i < completed;
        const isCurrent = i === completed;

        return (
          <g key={label} transform={`translate(${x}, ${y})`}>
            {/* Outer circle */}
            <circle
              cx={0}
              cy={0}
              r={s.r}
              fill={isCompleted ? "color-mix(in srgb, var(--success) 15%, transparent)" : isCurrent ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--card)"}
              stroke={isCompleted ? "var(--success)" : isCurrent ? "var(--accent)" : "var(--border)"}
              strokeWidth={isCurrent ? 2 : 1.5}
              className={isCurrent ? "animate-milestone-glow" : ""}
            />

            {/* Inner content */}
            {isCompleted ? (
              <path d="M-3.5 0 L-1 2.5 L3.5 -2"
                stroke="var(--success)" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" fill="none" />
            ) : isCurrent ? (
              <circle cx={0} cy={0} r={3.5} fill="var(--accent)" className="animate-sparkle-pulse" />
            ) : (
              <circle cx={0} cy={0} r={2} fill="var(--muted-foreground)" opacity="0.3" />
            )}

            {/* Label */}
            <text
              x={0}
              y={s.r + s.fontSize + 4}
              textAnchor="middle"
              fontSize={s.fontSize}
              fill={isCurrent ? "var(--accent)" : "var(--muted-foreground)"}
              fontWeight={isCurrent ? 600 : 400}
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
