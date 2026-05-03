import { listGoals } from "@/server/queries/goals";
import { getDaysRange } from "@/server/queries/days";
import { journalCountsByDay } from "@/server/queries/journal";
import { progressFor } from "@/lib/progress";
import { heatmapLevels, type HeatmapInput } from "@/lib/progress-overview";
import { isoOffset } from "@/lib/dates";

const WINDOW_DAYS = 60;

function fmtTooltip(iso: string, completed: number, total: number, entries: number): string {
  const d = new Date(iso + "T00:00:00");
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
  const mo = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()];
  const entryStr = entries > 0 ? ` · ${entries} ${entries === 1 ? "entry" : "entries"}` : "";
  return `${wd}, ${mo} ${d.getDate()} · ${completed}/${total} goals${entryStr}`;
}

export async function Heatmap({ userId, iso }: { userId: string; iso: string }) {
  const start = isoOffset(iso, -(WINDOW_DAYS - 1));
  const [goals, days, journalCounts] = await Promise.all([
    listGoals(userId),
    getDaysRange(userId, start, iso),
    journalCountsByDay(userId, start, iso),
  ]);

  const byIso = new Map(days.map((d) => [d.iso, d]));
  const inputs: HeatmapInput[] = [];
  for (let i = 0; i < WINDOW_DAYS; i++) {
    const cellIso = isoOffset(iso, -(WINDOW_DAYS - 1 - i));
    const day = byIso.get(cellIso);
    const completed = day
      ? goals.filter((g) => progressFor(g, day).pct >= 100).length
      : 0;
    inputs.push({
      iso: cellIso,
      completedToday: completed,
      totalGoals: goals.length,
      hasJournalNotes: !!day && (day.notes ?? "").trim().length > 0,
    });
  }

  const cells = heatmapLevels(inputs, iso);

  return (
    <div className="heatmap" role="img" aria-label="60-day completion heatmap with journal entry counts">
      {cells.map((c) => {
        const completed = inputs.find((x) => x.iso === c.iso)?.completedToday ?? 0;
        const entryCount = journalCounts.get(c.iso) ?? 0;
        return (
          <div
            key={c.iso}
            className={[
              "heatmap-cell",
              c.level > 0 ? `l${c.level}` : "",
              c.isToday ? "is-today" : "",
            ].filter(Boolean).join(" ")}
            data-tooltip={fmtTooltip(c.iso, completed, goals.length, entryCount)}
            aria-label={fmtTooltip(c.iso, completed, goals.length, entryCount)}
          >
            {entryCount > 0 && (
              <span className="heatmap-entry-count" aria-hidden>
                {entryCount > 9 ? "9+" : entryCount}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
