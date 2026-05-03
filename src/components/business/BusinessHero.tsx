import { getDailyContent } from "@/server/queries/daily-content";
import { RawHtml } from "./RawHtml";

export async function BusinessHero({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const headline = content.business.headline;
  const briefing = content.business.briefing;
  if (!headline && !briefing) return null;

  return (
    <div className="pulse-hero">
      <div className="card-eyebrow" style={{ color: "var(--accent)" }}>
        Edge of the day
      </div>
      {headline && <h2>{headline}</h2>}
      {briefing && (
        <RawHtml className="briefing" html={briefing} />
      )}
    </div>
  );
}
