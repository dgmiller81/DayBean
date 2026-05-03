import { listGoals } from "@/server/queries/goals";
import { getDaysRange } from "@/server/queries/days";
import { progressFor } from "@/lib/progress";
import { heatmapLevels, type HeatmapInput } from "@/lib/progress-overview";
import { isoOffset } from "@/lib/dates";

const WINDOW_DAYS = 60;

function fmtTooltip(iso: string, completed: number, total: number): string {
  const d = new Date(iso + "T00:00:00");
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
  const mo = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()];
  return `${wd}, ${mo} ${d.getDate()} · ${completed}/${total} goals`;
}

export async function Heatmap({ userId, iso }: { userId: string; iso: string }) {
  const start = isoOffset(iso, -(WINDOW_DAYS - 1));
  const [goals, days] = await Promise.all([
    listGoals(userId),
    getDaysRange(userId, start, iso),
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
    <div className="heatmap" role="img" aria-label="60-day completion heatmap">
      {cells.map((c) => {
        const completed = inputs.find((x) => x.iso === c.iso)?.completedToday ?? 0;
        return (
          <div
            key={c.iso}
            className={[
              "heatmap-cell",
              c.level > 0 ? `l${c.level}` : "",
              c.isToday ? "is-today" : "",
            ].filter(Boolean).join(" ")}
            data-tooltip={fmtTooltip(c.iso, completed, goals.length)}
            aria-label={fmtTooltip(c.iso, completed, goals.length)}
          />
        );
      })}
    </div>
  );
}
