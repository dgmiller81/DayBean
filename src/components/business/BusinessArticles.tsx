import { getDailyContent } from "@/server/queries/daily-content";
import { recordClick } from "@/server/actions/clicks";
import { BadgeRow } from "./Badge";
import { TrackedAnchor } from "./TrackedAnchor";

export async function BusinessArticles({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const articles = content.business.articles;
  if (!articles.length) return null;

  const track = recordClick.bind(null, { userId, iso, section: "business" });

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-eyebrow">AI / Engineering reading</div>
          <div className="card-title">Curated picks</div>
        </div>
      </div>
      <div className="cards-grid">
        {articles.map((a) => (
          <TrackedAnchor
            key={a.url}
            href={a.url}
            cat="business"
            onTrack={track}
            className="article-card"
          >
            <BadgeRow badges={a.badges ?? []} />
            <h3>{a.title}</h3>
            <p>{a.summary}</p>
            <div className="src">{a.src}</div>
          </TrackedAnchor>
        ))}
      </div>
    </div>
  );
}
