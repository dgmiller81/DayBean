import { getDailyContent } from "@/server/queries/daily-content";

export async function GodCard({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const { opening, prayer, carry } = content.god;

  return (
    <article
      className="card"
      style={{
        background:
          "radial-gradient(120% 80% at 0% 0%, var(--gold-soft), transparent 60%), var(--surface-solid)",
      }}
    >
      <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        DAILY · GOD
      </div>
      <p className="serif" style={{ fontSize: "1.05rem", lineHeight: 1.65, marginTop: 12, color: "var(--ink)" }}>
        {opening}
      </p>
      <blockquote
        className="serif"
        style={{
          margin: "16px 0 0",
          padding: "16px 20px",
          borderLeft: "3px solid var(--gold)",
          background: "var(--surface-2)",
          borderRadius: "var(--radius-sm)",
          fontSize: "1.02rem",
          lineHeight: 1.65,
          color: "var(--ink)",
        }}
      >
        {prayer}
      </blockquote>
      <p style={{ marginTop: 12, fontSize: 13, color: "var(--ink-soft)", fontStyle: "italic" }}>
        Carry today: {carry}
      </p>
    </article>
  );
}
