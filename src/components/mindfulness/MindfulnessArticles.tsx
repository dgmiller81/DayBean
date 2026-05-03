import { getDailyContent } from "@/server/queries/daily-content";
import { TrackedArticleLink } from "./TrackedArticleLink";

export async function MindfulnessArticles({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const articles = content.mindfulness.articles;
  if (articles.length === 0) return null;

  return (
    <section className="card">
      <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        TODAY'S READING
      </div>
      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
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
    </section>
  );
}
