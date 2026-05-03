export type BadgeTuple = [string, string];

export function Badge({ tuple }: { tuple: BadgeTuple }) {
  const [cls, label] = tuple;
  return (
    <span
      className={`badge ${cls}`}
      style={{
        display: "inline-block",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: ".04em",
        padding: "2px 8px",
        borderRadius: 999,
        border: "1px solid var(--line)",
        marginRight: 6,
      }}
    >
      {label}
    </span>
  );
}

export function BadgeRow({ badges }: { badges: BadgeTuple[] }) {
  if (!badges?.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
      {badges.map((b, i) => (
        <Badge key={`${b[0]}-${b[1]}-${i}`} tuple={b} />
      ))}
    </div>
  );
}
