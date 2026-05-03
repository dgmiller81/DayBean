import type { ReactNode } from "react";
import type { Goal, DayRecord, ClickCounts } from "@/types";
import { GoalRow } from "./GoalRow";

export function GoalList({
  userId,
  iso,
  goals,
  day,
  clicks,
  showSectionDot = false,
  emptyMessage = "No goals yet.",
  footer,
}: {
  userId: string;
  iso: string;
  goals: Goal[];
  day: DayRecord;
  clicks: ClickCounts;
  showSectionDot?: boolean;
  emptyMessage?: string;
  footer?: ReactNode;
}) {
  return (
    <>
      {goals.length === 0 ? (
        <p style={{ color: "var(--ink-muted)", fontSize: 13, margin: "8px 0", fontStyle: "italic" }}>
          {emptyMessage}
        </p>
      ) : (
        <div>
          {goals.map((g) => (
            <GoalRow
              key={g.id}
              userId={userId}
              iso={iso}
              goal={g}
              day={day}
              clicks={clicks}
              showSectionDot={showSectionDot}
            />
          ))}
        </div>
      )}
      {footer}
    </>
  );
}
