export function StreakPill({ count }: { count: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        background: "var(--gold-soft)",
        color: "var(--gold)",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 0.4,
      }}
    >
      <svg className="ic-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M12 2c1 4 4 6 4 10a4 4 0 1 1-8 0c0-2 1-3 1-5-2 1-3 3-3 5a6 6 0 0 0 12 0c0-5-4-7-6-10z" />
      </svg>
      <span>{count}</span>
    </span>
  );
}
