import { friendlyDate } from "@/lib/dates";

function splitDateForHero(iso: string): { weekday: string; rest: string } {
  const d = new Date(iso + "T00:00:00");
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const rest = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return { weekday, rest };
}

// S1-T04 — DayBean voice greetings, by hour bucket. Quiet-by-default tone;
// no exclamation points, no apologies, no mention of caffeine quantity.
function brandGreeting(name: string): string {
  const h = new Date().getHours();
  if (h < 11) return `Pour first, ${name}.`;
  if (h < 16) return `Steady pour, ${name}.`;
  if (h < 20) return `Steeping the evening, ${name}.`;
  return `That was a good cup, ${name}.`;
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
      <div className="greeting">{brandGreeting(name)}</div>
      <h1>
        {weekday}
        <br />
        <em>{rest}</em>
      </h1>
      {sub ? <div className="date-sub">{sub}</div> : null}
      {showFixtureHint && (
        <div className="date-sub" style={{ fontStyle: "italic", marginTop: 4 }}>
          Brewing the defaults — paste or generate your own batch.
        </div>
      )}
      <span hidden>{friendlyDate(iso)}</span>
    </div>
  );
}
