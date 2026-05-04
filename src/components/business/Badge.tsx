export type BadgeShape = { className: string; label: string };

export function Badge({ badge }: { badge: BadgeShape }) {
  return <span className={`badge ${badge.className}`}>{badge.label}</span>;
}

export function BadgeRow({ badges }: { badges: BadgeShape[] }) {
  if (!badges?.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {badges.map((b, i) => (
        <Badge key={`${b.className}-${b.label}-${i}`} badge={b} />
      ))}
    </div>
  );
}
