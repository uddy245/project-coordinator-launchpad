/** Pure SVG progress ring — the Campus resume-hero signature mechanic. */
export function ProgressRing({
  pct,
  size = 64,
  strokeWidth = 7,
  variant = "light",
  label,
}: {
  pct: number;
  size?: number;
  strokeWidth?: number;
  variant?: "light" | "dark";
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamped / 100);
  const track = variant === "dark" ? "rgba(255,255,255,0.25)" : "hsl(var(--rule))";
  const arc = variant === "dark" ? "#ffffff" : "hsl(var(--primary))";
  const text = variant === "dark" ? "#ffffff" : "hsl(var(--ink))";

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label ?? `${clamped}% complete`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={track}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={arc}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="53%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={size * 0.24}
        fontWeight={700}
        fill={text}
        className="font-display"
      >
        {clamped}%
      </text>
    </svg>
  );
}
