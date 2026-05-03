import { getDailyContent } from "@/server/queries/daily-content";
import { recordClick } from "@/server/actions/clicks";
import { TrackedAnchor } from "@/components/business/TrackedAnchor";

export async function PersonalArticles({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const articles = content.personal.articles;
  if (articles.length === 0) return null;

  const track = recordClick.bind(null, { userId, iso, section: "personal" });

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-eyebrow">Self-help reading</div>
          <div className="card-title">Three to start with</div>
        </div>
      </div>
      <div className="cards-grid">
        {articles.map((a) => (
          <TrackedAnchor
            key={a.url}
            href={a.url}
            cat="personal"
            onTrack={track}
            className="article-card"
          >
            <h3>{a.title}</h3>
            <p>{a.summary}</p>
            <div className="src">{a.source}</div>
          </TrackedAnchor>
        ))}
      </div>
    </div>
  );
}
