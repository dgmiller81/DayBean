import type { SectionOrGeneral } from "@/types";

const COLOR: Record<SectionOrGeneral, string> = {
  mindfulness: "var(--sage)",
  business: "var(--accent)",
  personal: "var(--gold)",
  general: "var(--ink-muted)",
};

export function SectionDot({
  section,
  size = 8,
}: {
  section: SectionOrGeneral;
  size?: number;
}) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: 999,
        marginRight: 8,
        verticalAlign: 1,
        flexShrink: 0,
        background: COLOR[section],
      }}
    />
  );
}
