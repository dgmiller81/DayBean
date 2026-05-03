import { friendlyDate } from "@/lib/dates";

export function Hero({ name, iso, sub }: { name: string; iso: string; sub?: string }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h1 className="serif" style={{ fontSize: 36, fontWeight: 500, margin: 0, color: "var(--ink)" }}>
        Good morning, {name}
      </h1>
      <p className="serif" style={{ color: "var(--ink-soft)", margin: "6px 0 0", fontSize: 18 }}>
        {friendlyDate(iso)}
      </p>
      {sub ? (
        <p style={{ color: "var(--ink-muted)", margin: "8px 0 0", fontSize: 14 }}>{sub}</p>
      ) : null}
    </section>
  );
}
