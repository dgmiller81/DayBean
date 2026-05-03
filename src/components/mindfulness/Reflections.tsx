import { pickReflections } from "@/lib/reflections";

export function Reflections({ iso }: { iso: string }) {
  const items = pickReflections(iso);
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-eyebrow">Today's reflections</div>
          <div className="card-title">A few thoughts to carry</div>
        </div>
      </div>
      <div>
        {items.map((r, i) => (
          <div key={i} className="reflection">
            <div className="reflection-head">
              <div className="reflection-num">No. {String(i + 1).padStart(2, "0")}</div>
              <div className="reflection-title">{r.title}</div>
            </div>
            <div className="reflection-body">{r.body}</div>
            <div className="reflection-practice">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{r.practice}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
