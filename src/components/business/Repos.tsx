import { getDailyContent } from "@/server/queries/daily-content";
import { recordClick } from "@/server/actions/clicks";
import { TrackedAnchor } from "./TrackedAnchor";

export async function Repos({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const repos = content.business.repos;
  if (!repos.length) return null;

  const track = recordClick.bind(null, { userId, iso, section: "business" });

  return (
    <section className="card">
      <div style={{ color: "var(--accent)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        GITHUB BUZZ
      </div>
      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {repos.map((r) => (
          <TrackedAnchor
            key={r.url}
            href={r.url}
            cat="business"
            onTrack={track}
            className="repo"
            style={{
              display: "block",
              padding: 14,
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-sm)",
              background: "var(--surface-2)",
              color: "var(--ink)",
              textDecoration: "none",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
              <div>
                <div className="serif" style={{ fontSize: "1.05rem", fontWeight: 500 }}>
                  {r.org}/<span style={{ fontWeight: 600 }}>{r.name}</span>
                </div>
                <p style={{ marginTop: 4, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.55 }}>
                  {r.pitch}
                </p>
              </div>
              <div style={{ textAlign: "right", fontSize: 11, color: "var(--ink-muted)", whiteSpace: "nowrap" }}>
                <div style={{ color: "var(--gold)", fontWeight: 600 }}>★ {r.stars}</div>
                <div>{r.weekly}</div>
              </div>
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 12, fontSize: 11, color: "var(--ink-muted)" }}>
              <span>{r.lang}</span>
              <span>·</span>
              <span>{r.license}</span>
            </div>
          </TrackedAnchor>
        ))}
      </div>
    </section>
  );
}
