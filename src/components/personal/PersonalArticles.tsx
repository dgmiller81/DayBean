import { getDailyContent } from "@/server/queries/daily-content";
import { recordClick } from "@/server/actions/clicks";
import { TrackedAnchor } from "@/components/business/TrackedAnchor";

export async function PersonalArticles({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const articles = content.personal.articles;
  if (!articles.length) return null;

  const track = recordClick.bind(null, { userId, iso, section: "personal" });

  return (
    <section className="card">
      <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        SELF-HELP READING
      </div>
      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {articles.map((a) => (
          <TrackedAnchor
            key={a.url}
            href={a.url}
            cat="personal"
            onTrack={track}
            className="article-card"
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
            <div className="serif" style={{ fontSize: "1.05rem", fontWeight: 500 }}>{a.title}</div>
            <p style={{ marginTop: 4, fontSize: 13, color: "var(--ink-soft)" }}>{a.summary}</p>
            <div style={{ marginTop: 6, fontSize: 11, color: "var(--ink-muted)" }}>{a.source}</div>
          </TrackedAnchor>
        ))}
      </div>
    </section>
  );
}
