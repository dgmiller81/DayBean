import { getDailyContent } from "@/server/queries/daily-content";

export async function ScanList({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const items = content.business.scan;
  if (!items.length) return null;

  return (
    <section className="card">
      <div style={{ color: "var(--accent)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        TODAY'S SCAN
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0", display: "grid", gap: 6 }}>
        {items.map((line, i) => (
          <li
            key={i}
            style={{
              fontSize: 14,
              lineHeight: 1.5,
              color: "var(--ink)",
              padding: "6px 0",
              borderBottom: i < items.length - 1 ? "1px solid var(--line)" : "none",
              display: "flex",
              gap: 10,
            }}
          >
            <span aria-hidden style={{ color: "var(--accent)", fontWeight: 700 }}>·</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
