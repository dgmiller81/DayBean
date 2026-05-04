// S3-T04 — Slow Sip rotating cards (Personal panel).
//
// Server component. Reads today's three deterministic picks from
// pickSlowSipCards() and renders them as a responsive 3-up grid that
// reflows to a single column on narrow viewports.

import { pickSlowSipCards } from "@/server/actions/slow-sip";

const CATEGORY_LABEL: Record<string, string> = {
  family: "Family",
  finance: "Finance",
  hobby: "Hobby",
  fitness: "Body",
  faith: "Faith",
  work: "Work",
};

export async function SlowSipCards({
  userId,
  iso,
}: {
  userId: string;
  iso: string;
}) {
  const cards = await pickSlowSipCards({ userId, iso });
  if (cards.length === 0) return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 16,
        marginBottom: 22,
      }}
    >
      {cards.map((c) => (
        <div key={c.id} className="card" style={{ padding: 22 }}>
          <div
            className="card-eyebrow"
            style={{ color: "var(--ink-muted)", marginBottom: 8 }}
          >
            {CATEGORY_LABEL[c.category] ?? c.category}
          </div>
          <div
            className="card-title"
            style={{
              fontFamily: "var(--font-serif), Georgia, serif",
              fontSize: "1.18rem",
              lineHeight: 1.3,
              marginBottom: 10,
            }}
          >
            {c.title}
          </div>
          <p
            style={{
              color: "var(--ink-soft)",
              fontSize: ".95rem",
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            {c.body}
          </p>
          {c.meta ? (
            <div
              style={{
                marginTop: 12,
                fontSize: ".7rem",
                textTransform: "uppercase",
                letterSpacing: ".12em",
                color: "var(--ink-muted)",
              }}
            >
              {c.meta}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
