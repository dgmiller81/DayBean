import { aggregateForSection } from "@/lib/progress";
import { listGoals } from "@/server/queries/goals";
import { getDayOrEmpty } from "@/server/queries/days";
import { getClicksForDay } from "@/server/queries/clicks";
import type { Section } from "@/types";

const SECTIONS: Array<{ id: Section; label: string }> = [
  { id: "mindfulness", label: "Mindfulness" },
  { id: "business", label: "Business / AI" },
  { id: "personal", label: "Personal" },
];

export async function SectionBars({ userId, iso }: { userId: string; iso: string }) {
  const [allGoals, day, clicks] = await Promise.all([
    listGoals(userId),
    getDayOrEmpty(userId, iso),
    getClicksForDay(userId, iso),
  ]);

  return (
    <div>
      {SECTIONS.map((sec) => {
        const pct = aggregateForSection(sec.id, allGoals, day, clicks);
        const fraction = Math.max(0, Math.min(1, pct / 100));
        return (
          <div key={sec.id} className="section-pct">
            <span className={`sec-dot sec-${sec.id}`} aria-hidden />
            <span className="name">{sec.label}</span>
            <div
              className="bar-track"
              role="progressbar"
              aria-valuenow={Math.round(fraction * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="bar-fill" style={{ width: `${fraction * 100}%` }} />
            </div>
            <span className="num">{Math.round(fraction * 100)}%</span>
          </div>
        );
      })}
    </div>
  );
}
