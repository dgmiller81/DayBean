import { getDailyContent } from "@/server/queries/daily-content";
import { recordClick } from "@/server/actions/clicks";
import { TrackedAnchor } from "./TrackedAnchor";

export async function DevQuotes({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const quotes = content.business.quotes;
  if (!quotes.length) return null;

  const track = recordClick.bind(null, { userId, iso, section: "business" });

  return (
    <section className="card">
      <div style={{ color: "var(--accent)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        DEV QUOTES
      </div>
      <div style={{ display: "grid", gap: 14, marginTop: 12 }}>
        {quotes.map((q, i) => (
          <blockquote
            key={i}
            className="quote-card"
            style={{
              margin: 0,
              padding: "12px 16px",
              borderLeft: "3px solid var(--gold)",
              background: "var(--surface-2)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <p
              className="serif"
              style={{ fontSize: "1rem", lineHeight: 1.6, fontStyle: "italic", margin: 0, color: "var(--ink)" }}
            >
              “{q.text}”
            </p>
            <footer style={{ marginTop: 6, fontSize: 12, color: "var(--ink-muted)" }}>
              — {q.url ? (
                <TrackedAnchor href={q.url} cat="business" onTrack={track}
                  style={{ color: "var(--ink-soft)", textDecoration: "underline" }}>
                  {q.source}
                </TrackedAnchor>
              ) : (
                <span>{q.source}</span>
              )}
              {q.target ? <span style={{ marginLeft: 6, color: "var(--ink-muted)" }}>· {q.target}</span> : null}
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}
