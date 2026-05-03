import { listGoals } from "@/server/queries/goals";
import { getDayOrEmpty, getDaysRange } from "@/server/queries/days";
import { getClicksForDay } from "@/server/queries/clicks";
import { progressFor, streakFor } from "@/lib/progress";
import {
  bestStreakAcrossGoals,
  daysJournaled,
  ringFraction,
} from "@/lib/progress-overview";
import { isoOffset } from "@/lib/dates";
import { Ring } from "@/components/primitives/Ring";
import type { Section, Goal, DayRecord, ClickCounts } from "@/types";

function completedFor(goals: Goal[], day: DayRecord, clicks?: ClickCounts): number {
  return goals.filter((g) => progressFor(g, day, clicks).pct >= 100).length;
}

export async function RingStats({ userId, iso }: { userId: string; iso: string }) {
  const sevenAgo = isoOffset(iso, -6);
  const thirtyAgo = isoOffset(iso, -29);
  const sixtyAgo = isoOffset(iso, -59);

  const [allGoals, today, last7, last30, last60, clicksToday] = await Promise.all([
    listGoals(userId),
    getDayOrEmpty(userId, iso),
    getDaysRange(userId, sevenAgo, iso),
    getDaysRange(userId, thirtyAgo, iso),
    getDaysRange(userId, sixtyAgo, iso),
    getClicksForDay(userId, iso),
  ]);

  const dayByIso = new Map(last60.map((d) => [d.iso, d]));
  dayByIso.set(today.iso, today);
  const lookupDay = (i: string) => dayByIso.get(i);

  const totalGoals = allGoals.length;
  const completedToday = completedFor(allGoals, today, clicksToday);

  const bySection = (sec: Section) => {
    const goals = allGoals.filter((g) => g.section === sec);
    const completed = completedFor(goals, today, clicksToday);
    return { goals, completed };
  };
  const m = bySection("mindfulness");
  const b = bySection("business");
  const p = bySection("personal");

  const avg = (days: DayRecord[]) => {
    if (allGoals.length === 0 || days.length === 0) return 0;
    const sum = days.reduce(
      (acc, d) => acc + completedFor(allGoals, d) / allGoals.length,
      0,
    );
    return sum / days.length;
  };
  const sevenAvg = avg(last7);
  const thirtyAvg = avg(last30);

  const best = bestStreakAcrossGoals(allGoals, (id) => {
    const goal = allGoals.find((g) => g.id === id);
    if (!goal) return 0;
    return streakFor(goal, iso, lookupDay);
  });

  const journaled = daysJournaled(last60);

  return (
    <div className="rings-grid" style={{ gridTemplateColumns: "repeat(8, minmax(0, 1fr))" }}>
      {/* Row 1 — today + by section */}
      <Ring pct={ringFraction(completedToday, totalGoals)} variant="sage" big={`${completedToday}/${totalGoals}`} small="Today" />
      <Ring pct={ringFraction(m.completed, m.goals.length)} variant="sage" big={`${m.completed}/${m.goals.length}`} small="Mindfulness" />
      <Ring pct={ringFraction(b.completed, b.goals.length)} variant="sage" big={`${b.completed}/${b.goals.length}`} small="Business" />
      <Ring pct={ringFraction(p.completed, p.goals.length)} variant="sage" big={`${p.completed}/${p.goals.length}`} small="Personal" />

      {/* Row 2 — averages + streaks */}
      <Ring pct={sevenAvg} variant="sage" big={`${Math.round(sevenAvg * 100)}%`} small="Last 7 days" />
      <Ring pct={thirtyAvg} variant="sage" big={`${Math.round(thirtyAvg * 100)}%`} small="Last 30 days" />
      <Ring pct={Math.min(1, best / 30)} variant="gold" big={`${best}d`} small="Best streak" />
      <Ring pct={journaled / 60} variant="gold" big={`${journaled}`} small="Days journaled" />
    </div>
  );
}
