export type BadgeTuple = [string, string];

export function Badge({ tuple }: { tuple: BadgeTuple }) {
  const [cls, label] = tuple;
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function BadgeRow({ badges }: { badges: BadgeTuple[] }) {
  if (!badges?.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {badges.map((b, i) => (
        <Badge key={`${b[0]}-${b[1]}-${i}`} tuple={b} />
      ))}
    </div>
  );
}
