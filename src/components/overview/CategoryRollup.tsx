// S3-T07 — Bean Count category rollup. Server component that groups the
// user's goals by `category` and renders a horizontal pill row of
// "category: completed/total today" counts.

import { listGoals } from "@/server/queries/goals";
import { getDayOrEmpty } from "@/server/queries/days";
import { getClicksForDay } from "@/server/queries/clicks";
import { progressFor } from "@/lib/progress";
import {
  CATEGORY_ORDER,
  chipForCategory,
  labelForCategory,
} from "@/lib/category-colors";
import type { GoalCategory } from "@/types";

export async function CategoryRollup({
  userId,
  iso,
}: {
  userId: string;
  iso: string;
}) {
  const [goals, day, clicks] = await Promise.all([
    listGoals(userId),
    getDayOrEmpty(userId, iso),
    getClicksForDay(userId, iso),
  ]);

  // Bail if no goals carry a category — keeps Overview uncluttered.
  const categorized = goals.filter((g) => !!g.category);
  if (categorized.length === 0) return null;

  // Tally completed / total per category.
  const stats = new Map<GoalCategory, { done: number; total: number }>();
  for (const g of categorized) {
    const cat = g.category as GoalCategory;
    const entry = stats.get(cat) ?? { done: 0, total: 0 };
    entry.total += 1;
    if (progressFor(g, day, clicks).pct >= 100) entry.done += 1;
    stats.set(cat, entry);
  }

  const rendered = CATEGORY_ORDER.filter((c) => stats.has(c));
  if (rendered.length === 0) return null;

  return (
    <div className="card" style={{ marginBottom: 22 }}>
      <div
        style={{
          fontSize: ".68rem",
          color: "var(--ink-muted)",
          textTransform: "uppercase",
          letterSpacing: ".12em",
          fontWeight: 600,
          marginBottom: 10,
        }}
      >
        Categories
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        {rendered.map((cat) => {
          const { done, total } = stats.get(cat)!;
          const chip = chipForCategory(cat);
          return (
            <span
              key={cat}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                background: chip.bg,
                border: "1px solid",
                borderColor: chip.border,
                borderRadius: "var(--radius-sm)",
                fontSize: 12,
                lineHeight: 1.2,
                color: chip.fg,
                fontWeight: 500,
              }}
            >
              <span>{labelForCategory(cat)}</span>
              <span style={{ color: "var(--ink-soft)", fontVariantNumeric: "tabular-nums" }}>
                {done} / {total}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
