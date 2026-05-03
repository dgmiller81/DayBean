import { getDailyContent } from "@/server/queries/daily-content";
import { TrackedArticleLink } from "./TrackedArticleLink";

export async function MindfulnessArticles({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const articles = content.mindfulness.articles;
  if (articles.length === 0) return null;

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
        {articles.map((a) => (
          <TrackedArticleLink
            key={a.url}
            userId={userId}
            iso={iso}
            section="mindfulness"
            href={a.url}
            title={a.title}
            summary={a.summary}
            source={a.source}
          />
        ))}
      </div>
    </div>
  );
}
