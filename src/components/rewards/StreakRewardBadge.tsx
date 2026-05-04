"use client";
// S5-T03 — A milestone CTA that appears in the topbar once the user has
// crossed a 7-day streak. S5-T04 wired the real RewardModal in place of
// the original placeholder.
import { useState } from "react";
import { RewardModal } from "./RewardModal";

const REWARD_THRESHOLD = 7;

export function StreakRewardBadge({ streakLength }: { streakLength: number }) {
  const [open, setOpen] = useState(false);
  if (streakLength < REWARD_THRESHOLD) return null;

  // "Crema gold" tier color — derived inline because --crema isn't a
  // brand token yet. Keep brand-token-only references so any theme
  // (light/dark/warm/etc.) carries through automatically.
  const cremaGold =
    "color-mix(in oklab, var(--sage) 30%, var(--surface-2))";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`${streakLength}-day streak reward — tap to view`}
        aria-label={`Streak reward: ${streakLength} days`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          borderRadius: 999,
          border: "1px solid var(--sage-deep)",
          background: cremaGold,
          color: "var(--ink)",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          transition: "filter 120ms ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.06)")}
        onMouseLeave={(e) => (e.currentTarget.style.filter = "")}
      >
        <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor" aria-hidden>
          <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z" />
        </svg>
        Streak reward · {streakLength} days
      </button>
      {open && (
        <RewardModal
          open={open}
          onClose={() => setOpen(false)}
          streakLength={streakLength}
        />
      )}
    </>
  );
}
