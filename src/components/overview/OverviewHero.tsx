import { RingStats } from "./RingStats";
import { Heatmap } from "./Heatmap";

export async function OverviewHero({ userId, iso }: { userId: string; iso: string }) {
  return (
    <div className="card" style={{ marginBottom: 22 }}>
      <div className="card-header">
        <div>
          <div className="card-eyebrow">Progress</div>
          <div className="card-title">How you're showing up</div>
        </div>
      </div>
      <RingStats userId={userId} iso={iso} />
      <div style={{ marginTop: 22 }}>
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
          Last 60 days
        </div>
        <Heatmap userId={userId} iso={iso} />
        <div className="heat-legend">
          <span>Less</span>
          <div className="dots">
            <span style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }} />
            <span style={{ background: "color-mix(in oklab, var(--sage) 20%, var(--surface-2))" }} />
            <span style={{ background: "color-mix(in oklab, var(--sage) 40%, var(--surface-2))" }} />
            <span style={{ background: "color-mix(in oklab, var(--sage) 65%, var(--surface-2))" }} />
            <span style={{ background: "var(--sage)" }} />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
