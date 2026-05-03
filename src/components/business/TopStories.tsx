import { getDailyContent } from "@/server/queries/daily-content";
import { recordClick } from "@/server/actions/clicks";
import { BadgeRow } from "./Badge";
import { TrackedAnchor } from "./TrackedAnchor";

export async function TopStories({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const stories = content.business.topStories;
  if (!stories.length) return null;

  const track = recordClick.bind(null, { userId, iso, section: "business" });

  return (
    <section className="card">
      <div style={{ color: "var(--accent)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        TOP STORIES
      </div>
      <div style={{ display: "grid", gap: 14, marginTop: 12 }}>
        {stories.map((s, i) => {
          const isLead = s.kind === "lead";
          return (
            <TrackedAnchor
              key={s.url + i}
              href={s.url}
              cat="business"
              onTrack={track}
              className={isLead ? "top-card" : "article-card"}
              style={{
                display: "block",
                padding: isLead ? 18 : 14,
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-sm)",
                background: isLead
                  ? "linear-gradient(180deg, var(--accent-soft) 0%, var(--surface-2) 60%)"
                  : "var(--surface-2)",
                color: "var(--ink)",
                textDecoration: "none",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: ".14em",
                  color: "var(--accent)",
                  marginBottom: 6,
                }}
              >
                {s.eyebrow}
              </div>
              <BadgeRow badges={s.badges ?? []} />
              <div
                className="serif"
                style={{
                  fontSize: isLead ? "1.25rem" : "1.05rem",
                  fontWeight: 500,
                  lineHeight: 1.3,
                }}
              >
                {s.title}
              </div>
              <p style={{ marginTop: 6, fontSize: 13.5, lineHeight: 1.6, color: "var(--ink-soft)" }}>
                {s.body}
              </p>
              <div style={{ marginTop: 6, fontSize: 11, color: "var(--ink-muted)" }}>{s.src}</div>
            </TrackedAnchor>
          );
        })}
      </div>
    </section>
  );
}
