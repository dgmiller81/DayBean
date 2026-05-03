import { getDailyContent } from "@/server/queries/daily-content";

export async function Motivation({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const m = content.personal.motivation;
  if (!m?.text) return null;

  return (
    <section className="card">
      <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        MOTIVATION
      </div>
      <blockquote
        className="serif"
        style={{
          margin: "12px 0 0",
          padding: "12px 16px",
          borderLeft: "3px solid var(--gold)",
          background: "var(--surface-2)",
          borderRadius: "var(--radius-sm)",
          fontStyle: "italic",
          fontSize: "1.05rem",
          lineHeight: 1.6,
          color: "var(--ink)",
        }}
      >
        “{m.text}”
        <footer style={{ marginTop: 8, fontSize: 12, color: "var(--ink-muted)", fontStyle: "normal" }}>
          — {m.author}
        </footer>
      </blockquote>
    </section>
  );
}
