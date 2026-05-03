import { getDailyContent } from "@/server/queries/daily-content";
import { recordClick } from "@/server/actions/clicks";
import { TrackedAnchor } from "./TrackedAnchor";

export async function DevQuotes({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const quotes = content.business.quotes;
  if (!quotes.length) return null;

  const track = recordClick.bind(null, { userId, iso, section: "business" });

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-eyebrow">Voice of the devs</div>
          <div className="card-title">What people are saying</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {quotes.map((q, i) => (
          <div key={i} className="quote-card">
            <div className="quote-text">"{q.text}"</div>
            <div className="quote-meta">
              — {q.url ? (
                <TrackedAnchor href={q.url} cat="business" onTrack={track}>
                  {q.source}
                </TrackedAnchor>
              ) : (
                <span>{q.source}</span>
              )}
              {q.target ? <span style={{ marginLeft: 6 }}>· {q.target}</span> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
