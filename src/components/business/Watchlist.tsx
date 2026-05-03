import { getDailyContent } from "@/server/queries/daily-content";

export async function Watchlist({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const items = content.business.watchlist;
  if (!items.length) return null;

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-eyebrow">R&amp;D watchlist</div>
          <div className="card-title">Things to watch</div>
        </div>
      </div>
      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8, padding: 0, margin: 0 }}>
        {items.map((line, i) => (
          <li key={i} style={{ fontSize: ".9rem", color: "var(--ink-soft)", paddingLeft: 14, position: "relative" }}>
            <span style={{ position: "absolute", left: 0, color: "var(--accent)", fontWeight: 700 }}>›</span>
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}
