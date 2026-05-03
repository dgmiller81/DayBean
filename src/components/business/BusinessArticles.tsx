import { getDailyContent } from "@/server/queries/daily-content";
import { recordClick } from "@/server/actions/clicks";
import { BadgeRow } from "./Badge";
import { TrackedAnchor } from "./TrackedAnchor";
import { ArticleActions } from "@/components/bookmarks/ArticleActions";
import { isBookmarked } from "@/server/queries/bookmarks";

export async function BusinessArticles({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const articles = content.business.articles;
  if (!articles.length) return null;

  const track = recordClick.bind(null, { userId, iso, section: "business" });
  const marks = await Promise.all(articles.map((a) => isBookmarked(userId, a.url)));

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-eyebrow">AI / Engineering reading</div>
          <div className="card-title">Curated picks</div>
        </div>
      </div>
      <div className="cards-grid">
        {articles.map((a, i) => (
          <div className="article-card-frame" key={a.url}>
            <TrackedAnchor
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
            <ArticleActions
              userId={userId}
              url={a.url}
              title={a.title}
              source="business"
              excerpt={a.summary}
              initialBookmarked={marks[i]}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
