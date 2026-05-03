const SIZE = 96;
const STROKE = 8;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

export function Ring({
  pct,
  variant = "sage",
  big,
  small,
}: {
  /** 0–1, clamped. */
  pct: number;
  variant?: "sage" | "gold";
  big: string;
  small: string;
}) {
  const fraction = Math.max(0, Math.min(1, pct));
  const dashOffset = C * (1 - fraction);
  const stroke = variant === "gold" ? "var(--gold)" : "var(--sage)";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg
        width={SIZE}
        height={SIZE}
        role="img"
        aria-label={`${small}: ${big}`}
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="var(--line-strong)" strokeWidth={STROKE} />
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none"
          stroke={stroke} strokeWidth={STROKE} strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset .6s ease" }}
        />
        <text
          x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
          transform={`rotate(90 ${SIZE / 2} ${SIZE / 2})`}
          fontFamily="var(--font-fraunces)"
          fontSize={big.length > 4 ? 16 : 20}
          fontWeight={500} fill="var(--ink)"
        >
          {big}
        </text>
      </svg>
      <div style={{ fontSize: 12, color: "var(--ink-soft)", letterSpacing: ".04em" }}>{small}</div>
    </div>
  );
}
