import { getDailyContent } from "@/server/queries/daily-content";

export async function ScanList({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const items = content.business.scan;
  if (!items.length) return null;

  return (
    <div className="card" style={{ marginBottom: 22 }}>
      <div className="card-header">
        <div>
          <div className="card-eyebrow">Quick scan</div>
          <div className="card-title">Today, in {items.length} {items.length === 1 ? "line" : "lines"}</div>
        </div>
      </div>
      <ol className="scan-grid">
        {items.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ol>
    </div>
  );
}
