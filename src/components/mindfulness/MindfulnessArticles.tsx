import { getDailyContent } from "@/server/queries/daily-content";
import { TrackedArticleLink } from "./TrackedArticleLink";
import { ArticleActions } from "@/components/bookmarks/ArticleActions";
import { isBookmarked } from "@/server/queries/bookmarks";

export async function MindfulnessArticles({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const articles = content.mindfulness.articles;
  if (articles.length === 0) return null;

  const marks = await Promise.all(articles.map((a) => isBookmarked(userId, a.url)));

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-eyebrow">Today's reading</div>
          <div className="card-title">Three small windows</div>
        </div>
        <span style={{ fontSize: ".78rem", color: "var(--ink-muted)" }}>
          Click an article to count it toward goals
        </span>
      </div>
      <div className="cards-grid">
        {articles.map((a, i) => (
          <div className="article-card-frame" key={a.url}>
            <TrackedArticleLink
              userId={userId}
              iso={iso}
              section="mindfulness"
              href={a.url}
              title={a.title}
              summary={a.summary}
              source={a.source}
            />
            <ArticleActions
              userId={userId}
              url={a.url}
              title={a.title}
              source="mindfulness"
              excerpt={a.summary}
              initialBookmarked={marks[i]}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
