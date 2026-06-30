// =============================================================================
// CollaborationIllustration — Client ↔ Expert collaboration visual.
// Shows two avatar cards connected by bridge with project icon.
// Props: size — "sm" (200x120) | "md" (320x180)
// =============================================================================

const SIZES = {
  sm: { w: 200, h: 120, cardW: 42, cardH: 50, bubbleW: 36, bubbleH: 22 },
  md: { w: 320, h: 180, cardW: 60, cardH: 72, bubbleW: 50, bubbleH: 30 },
};

export function CollaborationIllustration({ size = "md", className = "" }) {
  const s = SIZES[size] || SIZES.md;
  const cx = s.w / 2;
  const botY = s.h * 0.58;

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
      {/* Bridge connector */}
      <path
        d={`M${s.w * 0.25} ${botY} C${cx} ${s.h * 0.2}, ${cx} ${s.h * 0.2}, ${s.w * 0.75} ${botY}`}
        stroke="color-mix(in srgb, var(--accent) 30%, transparent)"
        strokeWidth="1.5"
        strokeDasharray="5 4"
        fill="none"
      />

      {/* Central project icon on bridge */}
      <g transform={`translate(${cx}, ${s.h * 0.35})`}>
        <rect
          x={-12}
          y={-12}
          width={24}
          height={24}
          rx={6}
          fill="color-mix(in srgb, var(--accent) 12%, transparent)"
          stroke="color-mix(in srgb, var(--accent) 35%, transparent)"
          strokeWidth="1.2"
        />
        <text x="0" y="1" textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="var(--accent)">
          ◈
        </text>
      </g>

      {/* Message bubble */}
      <g transform={`translate(${cx}, ${s.h * 0.18})`}>
        <rect
          x={-s.bubbleW / 2}
          y={-s.bubbleH / 2}
          width={s.bubbleW}
          height={s.bubbleH}
          rx={8}
          fill="var(--card)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <line x1={-s.bubbleW * 0.25} y1={-3} x2={s.bubbleW * 0.2} y2={-3}
          stroke="var(--muted-foreground)" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        <line x1={-s.bubbleW * 0.25} y1={3} x2={s.bubbleW * 0.1} y2={3}
          stroke="var(--muted-foreground)" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        {/* Bubble tail */}
        <path d={`M-4 ${s.bubbleH / 2} L0 ${s.bubbleH / 2 + 6} L4 ${s.bubbleH / 2}`}
          fill="var(--card)" stroke="var(--border)" strokeWidth="0.8" />
      </g>

      {/* Client card (left) */}
      <g transform={`translate(${s.w * 0.25}, ${botY})`}>
        <rect
          x={-s.cardW / 2}
          y={-s.cardH}
          width={s.cardW}
          height={s.cardH}
          rx={8}
          fill="color-mix(in srgb, var(--primary) 6%, transparent)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        {/* Avatar circle */}
        <circle cx={0} cy={-s.cardH * 0.45} r={s.cardW * 0.18}
          fill="color-mix(in srgb, var(--primary) 15%, transparent)" />
        {/* Person icon */}
        <text x="0" y={-s.cardH * 0.43} textAnchor="middle" dominantBaseline="middle"
          fontSize={s.cardW * 0.22} fill="var(--primary)" opacity="0.6">
          👤
        </text>
        <text x="0" y={-s.cardH * 0.12} textAnchor="middle" fontSize={s.cardW * 0.14}
          fill="var(--foreground)" fontWeight="600">Client</text>
      </g>

      {/* Expert card (right) */}
      <g transform={`translate(${s.w * 0.75}, ${botY})`}>
        <rect
          x={-s.cardW / 2}
          y={-s.cardH}
          width={s.cardW}
          height={s.cardH}
          rx={8}
          fill="color-mix(in srgb, var(--accent) 6%, transparent)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        {/* Avatar circle */}
        <circle cx={0} cy={-s.cardH * 0.45} r={s.cardW * 0.18}
          fill="color-mix(in srgb, var(--accent) 15%, transparent)" />
        {/* Star/sparkle icon */}
        <text x="0" y={-s.cardH * 0.43} textAnchor="middle" dominantBaseline="middle"
          fontSize={s.cardW * 0.22} fill="var(--accent)">
          ✦
        </text>
        <text x="0" y={-s.cardH * 0.12} textAnchor="middle" fontSize={s.cardW * 0.14}
          fill="var(--foreground)" fontWeight="600">Expert</text>
      </g>
    </svg>
  );
}
