import Link from "next/link";
import { friendlyDate, isoOffset, todayISO } from "@/lib/dates";

export function DateNav({ iso }: { iso: string }) {
  const isToday = iso === todayISO();
  const prev = isoOffset(iso, -1);
  const next = isoOffset(iso, 1);
  const dayOfWeek = new Date(iso + "T00:00:00").getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  return (
    <nav
      aria-label="Date navigation"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginTop: 12,
        flexWrap: "wrap",
      }}
    >
      <Link
        href={`/?d=${prev}`}
        prefetch={false}
        aria-label={`Previous day (${friendlyDate(prev)})`}
        style={pillStyle(false)}
      >
        ‹ Prev
      </Link>
      {!isToday && (
        <Link href="/" prefetch={false} style={pillStyle(false)}>
          Today
        </Link>
      )}
      <Link
        href={isToday ? "/" : `/?d=${next}`}
        prefetch={false}
        aria-label={`Next day (${friendlyDate(next)})`}
        aria-disabled={isToday}
        style={{
          ...pillStyle(false),
          opacity: isToday ? 0.4 : 1,
          pointerEvents: isToday ? "none" : "auto",
        }}
      >
        Next ›
      </Link>
      {!isToday && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "4px 10px",
            borderRadius: 999,
            background: "var(--gold-soft)",
            color: "var(--gold)",
            border: "1px solid var(--gold)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: ".04em",
          }}
        >
          VIEWING {friendlyDate(iso).toUpperCase()}
        </span>
      )}
      {isWeekend && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "4px 10px",
            borderRadius: 999,
            background: "rgba(176,141,87,0.10)",
            color: "var(--gold)",
            border: "1px dashed var(--gold)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: ".04em",
          }}
        >
          SUNDAY SLOW · WEEKEND
        </span>
      )}
    </nav>
  );
}

function pillStyle(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 12px",
    borderRadius: 999,
    border: `1px solid ${active ? "var(--sage)" : "var(--line-strong)"}`,
    background: active ? "var(--sage)" : "transparent",
    color: active ? "white" : "var(--ink-soft)",
    fontSize: 12,
    textDecoration: "none",
    fontWeight: 500,
  };
}
