"use client";

export function Fab({
  openCount,
  onOpen,
}: {
  openCount: number;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className="fab"
      onClick={onOpen}
      aria-label={`Open tasks drawer${openCount > 0 ? ` (${openCount} open)` : ""}`}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
      {openCount > 0 && <span className="badge">{openCount}</span>}
    </button>
  );
}
