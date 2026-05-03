import { pickReflections } from "@/lib/reflections";

export function Reflections({ iso }: { iso: string }) {
  const items = pickReflections(iso);
  return (
    <section className="card">
      <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
        REFLECTIONS · TODAY
      </div>
      <div style={{ display: "grid", gap: 16, marginTop: 12 }}>
        {items.map((r, i) => (
          <article key={i}>
            <h3 className="serif" style={{ fontSize: "1.05rem", margin: "0 0 4px", color: "var(--ink)" }}>
              {r.title}
            </h3>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--ink-soft)" }}>{r.body}</p>
            <p style={{ marginTop: 6, fontSize: 13, color: "var(--sage-deep)", fontStyle: "italic" }}>
              Practice: {r.practice}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
