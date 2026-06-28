// =============================================================================
// AIProjectIllustration — AI project planning visual.
// Shows central AI-node with task cards connected by lines.
// Props: size — "sm" (200x120) | "md" (320x180)
// =============================================================================

const SIZES = {
  sm: { w: 200, h: 120, nodeR: 14, cardW: 36, cardH: 22, fontSize: 6 },
  md: { w: 320, h: 180, nodeR: 20, cardW: 52, cardH: 32, fontSize: 8 },
};

export function AIProjectIllustration({ size = "md", className = "" }) {
  const s = SIZES[size] || SIZES.md;
  const cx = s.w / 2;
  const cy = s.h / 2;

  const cards = [
    { x: cx - s.w * 0.28, y: cy - s.h * 0.22, rot: -6 },
    { x: cx + s.w * 0.16, y: cy - s.h * 0.25, rot: 4 },
    { x: cx - s.w * 0.2, y: cy + s.h * 0.2, rot: -3 },
    { x: cx + s.w * 0.2, y: cy + s.h * 0.18, rot: 5 },
  ];

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
      {/* Connection lines from center to cards */}
      {cards.map((c, i) => (
        <line
          key={`line-${i}`}
          x1={cx}
          y1={cy}
          x2={c.x}
          y2={c.y}
          stroke="var(--border)"
          strokeWidth="1.2"
          strokeDasharray="4 3"
        />
      ))}

      {/* Task cards */}
      {cards.map((c, i) => (
        <g key={`card-${i}`} transform={`translate(${c.x - s.cardW / 2}, ${c.y - s.cardH / 2}) rotate(${c.rot}, ${s.cardW / 2}, ${s.cardH / 2})`}>
          <rect
            width={s.cardW}
            height={s.cardH}
            rx={5}
            fill="var(--card)"
            stroke="var(--border)"
            strokeWidth="1"
          />
          {/* Mini checklist marks */}
          <rect x={4} y={5} width={s.cardW - 8} height={2.5} rx={1} fill="var(--muted)" />
          <rect x={4} y={9.5} width={s.cardW * 0.55} height={2} rx={1} fill="var(--muted)" />
          {/* Check mark on card */}
          <circle cx={s.cardW - 7} cy={s.cardH - 7} r={4} fill="color-mix(in srgb, var(--success) 30%, transparent)" />
          <path d={`M${s.cardW - 9} ${s.cardH - 7} L${s.cardW - 7.5} ${s.cardH - 5} L${s.cardW - 5} ${s.cardH - 8}`}
            stroke="var(--success)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      ))}

      {/* Central AI node — hexagon */}
      <g transform={`translate(${cx}, ${cy})`}>
        <polygon
          points={hexPoints(s.nodeR)}
          fill="color-mix(in srgb, var(--accent) 15%, transparent)"
          stroke="color-mix(in srgb, var(--accent) 50%, transparent)"
          strokeWidth="1.5"
        />
        {/* Sparkle/star inside */}
        <text
          x="0"
          y={s.nodeR * 0.25}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={s.nodeR * 0.8}
          fill="var(--accent)"
        >
          ✦
        </text>
      </g>
    </svg>
  );
}

/** Generate hexagon vertex points for given radius */
function hexPoints(r) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    pts.push(`${(Math.cos(angle) * r).toFixed(1)},${(Math.sin(angle) * r).toFixed(1)}`);
  }
  return pts.join(" ");
}
