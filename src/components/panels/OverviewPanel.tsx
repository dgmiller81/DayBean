export function OverviewPanel() {
  return (
    <div className="card">
      <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        GOALS OVERVIEW
      </div>
      <h2 className="serif" style={{ fontSize: "1.35rem", fontWeight: 500, margin: "8px 0 0" }}>
        Coming in Phase 5
      </h2>
      <p style={{ color: "var(--ink-muted)", marginTop: 8 }}>
        All goals across sections in one place — progress, streaks, and edits.
      </p>
    </div>
  );
}
