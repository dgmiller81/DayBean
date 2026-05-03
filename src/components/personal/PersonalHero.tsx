import { getDailyContent } from "@/server/queries/daily-content";

export async function PersonalHero({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const headline = content.personal.headline;
  const motivation = content.personal.motivation;
  if (!headline && !motivation?.text) return null;

  return (
    <div
      className="pulse-hero"
      style={{
        background:
          "linear-gradient(135deg, rgba(93,122,108,.08) 0%, rgba(176,141,87,.05) 100%), var(--surface-solid)",
      }}
    >
      <div className="card-eyebrow" style={{ color: "var(--sage)" }}>
        Today's lift
      </div>
      {headline && <h2>{headline}</h2>}
      {motivation?.text && (
        <p style={{ marginTop: 14, fontStyle: "italic", color: "var(--ink-soft)" }}>
          "{motivation.text}"
          {motivation.author && (
            <span style={{ color: "var(--ink-muted)", fontStyle: "normal" }}> — {motivation.author}</span>
          )}
        </p>
      )}
    </div>
  );
}
