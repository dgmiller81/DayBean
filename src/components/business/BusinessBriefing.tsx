import { getDailyContent } from "@/server/queries/daily-content";
import { RawHtml } from "./RawHtml";

export async function BusinessBriefing({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const briefing = content.business.briefing;
  if (!briefing) return null;

  return (
    <section className="card">
      <div style={{ color: "var(--accent)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        BRIEFING
      </div>
      <RawHtml
        html={briefing}
        style={{
          marginTop: 10,
          fontSize: "1rem",
          lineHeight: 1.65,
          color: "var(--ink)",
        }}
      />
    </section>
  );
}
