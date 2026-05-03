import { getDailyContent } from "@/server/queries/daily-content";

export async function Watchlist({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const items = content.business.watchlist;
  if (!items.length) return null;

  return (
    <section className="card">
      <div style={{ color: "var(--accent)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        WATCHLIST
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0", display: "grid", gap: 6 }}>
        {items.map((line, i) => (
          <li
            key={i}
            style={{
              fontSize: 13.5,
              lineHeight: 1.5,
              color: "var(--ink-soft)",
              padding: "6px 0",
              borderBottom: i < items.length - 1 ? "1px solid var(--line)" : "none",
              display: "flex",
              gap: 10,
            }}
          >
            <span aria-hidden style={{ color: "var(--ink-muted)" }}>›</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
