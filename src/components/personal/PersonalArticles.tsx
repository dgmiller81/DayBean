import { getDailyContent } from "@/server/queries/daily-content";
import { recordClick } from "@/server/actions/clicks";
import { TrackedAnchor } from "@/components/business/TrackedAnchor";
import { ArticleActions } from "@/components/bookmarks/ArticleActions";
import { isBookmarked } from "@/server/queries/bookmarks";

export async function PersonalArticles({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const articles = content.personal.articles;
  if (articles.length === 0) return null;

  const track = recordClick.bind(null, { userId, iso, section: "personal" });
  const marks = await Promise.all(articles.map((a) => isBookmarked(userId, a.url)));

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-eyebrow">Self-help reading</div>
          <div className="card-title">Three to start with</div>
        </div>
      </div>
      <div className="cards-grid">
        {articles.map((a, i) => (
          <div className="article-card-frame" key={a.url}>
            <TrackedAnchor
              href={a.url}
              cat="personal"
              onTrack={track}
              className="article-card"
            >
              <h3>{a.title}</h3>
              <p>{a.summary}</p>
              <div className="src">{a.source}</div>
            </TrackedAnchor>
            <ArticleActions
              userId={userId}
              url={a.url}
              title={a.title}
              source="personal"
              excerpt={a.summary}
              initialBookmarked={marks[i]}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
