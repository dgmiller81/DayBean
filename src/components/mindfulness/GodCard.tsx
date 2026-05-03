import { getDailyContent } from "@/server/queries/daily-content";

export async function GodCard({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const { opening, prayer, carry } = content.god;

  return (
    <div className="god-card">
      <div className="god-card-inner">
        <div className="card-eyebrow">Begin here</div>
        <div className="card-title" style={{ marginTop: 2 }}>
          Daily God, My Savior
        </div>
        <p className="opening">{opening}</p>
        <div className="prayer">{prayer}</div>
        <div className="carry">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>{carry}</span>
        </div>
      </div>
    </div>
  );
}
