"use client";

export function SideTab({
  openCount,
  visible,
  onOpen,
}: {
  openCount: number;
  visible: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className={`drawer-sidetab${visible ? " visible" : ""}`}
      onClick={onOpen}
      aria-label={`Open tasks drawer${openCount > 0 ? ` (${openCount} open)` : ""}`}
      // `inert` (not aria-hidden) when hidden — blocks focus AND hides from
      // assistive tech, avoiding the "aria-hidden on focused element" warning
      // when the user toggles visibility while this button has focus.
      inert={!visible}
    >
      <span className="drawer-sidetab-icon" aria-hidden>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </span>
      {openCount > 0 && <span className="drawer-sidetab-badge">{openCount > 9 ? "9+" : openCount}</span>}
    </button>
  );
}
