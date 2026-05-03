import { getDailyContent } from "@/server/queries/daily-content";

export async function PersonalHeadline({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const headline = content.personal.headline;
  if (!headline) return null;

  return (
    <article
      className="card pulse-hero"
      style={{
        background:
          "radial-gradient(120% 80% at 0% 0%, var(--gold-soft), transparent 60%), var(--surface-solid)",
      }}
    >
      <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        PERSONAL · TODAY
      </div>
      <h2 className="serif" style={{ fontSize: "1.5rem", margin: "8px 0 0", lineHeight: 1.3, color: "var(--ink)" }}>
        {headline}
      </h2>
    </article>
  );
}
