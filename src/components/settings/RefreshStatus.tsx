import "server-only";
import { getRefreshStatus } from "@/server/queries/refresh-status";
import { formatRelative } from "@/lib/relative-time";

/**
 * S2-T06 — Surface dual-run scheduler health in Settings → LLM. Three states:
 *   primary  → morning brew fired today.
 *   backup   → backup slot served (last night's pre-brew rescued us).
 *   fixture  → both runs missed; the read path fell back to a fixture.
 *
 * Server component (no "use client") — pulls state at render time and renders
 * a small callout matching the LlmTab visual conventions (var(--*) tokens,
 * surface-2 background, line border, radius-sm). Returns null only on db
 * error; absence of a Pref / DailyContent row still renders the "skipped"
 * copy so the user gets a signal.
 */
export async function RefreshStatus({
  userId,
  todayIso,
}: {
  userId: string;
  todayIso: string;
}) {
  const snap = await getRefreshStatus(userId, todayIso);

  let title: string;
  if (snap.todaysSource === "primary" && snap.todaysServedAt) {
    title = `Morning brewed at ${formatClock(snap.todaysServedAt)}.`;
  } else if (snap.todaysSource === "backup" && snap.todaysServedAt) {
    title = `Backup poured at ${formatClock(snap.todaysServedAt)} — last night's pre-brew did the work.`;
  } else {
    title = "Brew skipped this morning. Yesterday's still warm.";
  }

  return (
    <section
      style={{
        padding: "10px 14px",
        background: "var(--surface-2)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-sm)",
        color: "var(--ink)",
        fontSize: 13,
        lineHeight: 1.5,
        display: "grid",
        gap: 4,
      }}
    >
      <div style={{ color: "var(--espresso, var(--ink))", fontWeight: 600 }}>{title}</div>
      {snap.lastMorningAt && (
        <div style={{ color: "var(--ink-soft)", fontSize: 12 }}>
          Last morning brew: {formatRelative(snap.lastMorningAt)}
        </div>
      )}
      {snap.lastPrebrewAt && (
        <div style={{ color: "var(--ink-soft)", fontSize: 12 }}>
          Last pre-brew: {formatRelative(snap.lastPrebrewAt)}
        </div>
      )}
    </section>
  );
}

function formatClock(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
