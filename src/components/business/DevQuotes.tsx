import { getDailyContent } from "@/server/queries/daily-content";
import { recordClick } from "@/server/actions/clicks";
import { isBookmarked } from "@/server/queries/bookmarks";
import { TrackedAnchor } from "./TrackedAnchor";
import { ArticleActions } from "@/components/bookmarks/ArticleActions";

export async function DevQuotes({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const quotes = content.business.quotes;
  if (!quotes.length) return null;

  const track = recordClick.bind(null, { userId, iso, section: "business" });
  const marks = await Promise.all(
    quotes.map((q) => (q.url ? isBookmarked(userId, q.url) : Promise.resolve(false))),
  );

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-eyebrow">Voice of the devs</div>
          <div className="card-title">What people are saying</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {quotes.map((q, i) => {
          if (q.url) {
            return (
              <div className="article-card-frame" key={i}>
                <TrackedAnchor href={q.url} cat="business" onTrack={track} className="quote-card linked">
                  <div className="quote-text">"{q.text}"</div>
                  <div className="quote-meta">
                    — {q.source}
                    {q.target ? <span style={{ marginLeft: 6 }}>· {q.target}</span> : null}
                  </div>
                </TrackedAnchor>
                <ArticleActions
                  userId={userId}
                  url={q.url}
                  title={`${q.source}: "${q.text}"`}
                  source="quotes"
                  excerpt={q.text}
                  initialBookmarked={marks[i]}
                />
              </div>
            );
          }
          return (
            <div key={i} className="quote-card">
              <div className="quote-text">"{q.text}"</div>
              <div className="quote-meta">
                — <span>{q.source}</span>
                {q.target ? <span style={{ marginLeft: 6 }}>· {q.target}</span> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
