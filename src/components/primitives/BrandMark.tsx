// S0-T07 — DayBean brand mark. A placeholder espresso-on-cream "DB" monogram
// rendered as inline SVG. Real AI-generated logo lands in S1-T08; until then,
// this one keeps the brand identity consistent across surfaces.
//
// Imported by Topbar, Hero, splash screens, and anywhere a "DB" badge fits.

import type { CSSProperties } from "react";

export function BrandMark({
  size = 36,
  className,
  style,
  ariaLabel = "DayBeans",
}: {
  size?: number;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}) {
  return (
    <span
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: "linear-gradient(135deg, var(--espresso, #3b2415), var(--crema, #d4a86a))",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fffaf0",
        boxShadow: "0 4px 14px color-mix(in oklab, var(--espresso, #3b2415) 40%, transparent)",
        ...style,
      }}
      role="img"
      aria-label={ariaLabel}
    >
      <svg
        width={Math.round(size * 0.5)}
        height={Math.round(size * 0.5)}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <text
          x="12"
          y="17"
          textAnchor="middle"
          fontFamily="var(--font-fraunces, Georgia, serif)"
          fontSize="13"
          fontWeight="700"
          fill="currentColor"
        >
          DB
        </text>
      </svg>
    </span>
  );
}
