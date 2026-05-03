import { friendlyDate } from "@/lib/dates";

function splitDateForHero(iso: string): { weekday: string; rest: string } {
  const d = new Date(iso + "T00:00:00");
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const rest = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return { weekday, rest };
}

export function Hero({
  name,
  iso,
  sub,
  showFixtureHint = false,
}: {
  name: string;
  iso: string;
  sub?: string;
  showFixtureHint?: boolean;
}) {
  const { weekday, rest } = splitDateForHero(iso);
  return (
    <div className="hero">
      <div className="greeting">Good morning, {name}</div>
      <h1>
        {weekday}
        <br />
        <em>{rest}</em>
      </h1>
      {sub ? <div className="date-sub">{sub}</div> : null}
      {showFixtureHint && (
        <div className="date-sub" style={{ fontStyle: "italic", marginTop: 4 }}>
          Showing default content — paste or generate yours.
        </div>
      )}
      <span hidden>{friendlyDate(iso)}</span>
    </div>
  );
}
