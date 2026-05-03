import type { Scripture } from "@/lib/scriptures";

export function ScripturePreview({
  passage,
  hint,
}: {
  passage: Scripture;
  hint: string | null;
}) {
  const first = passage.passage[0];
  const snippet =
    first.text.length > 140 ? first.text.slice(0, 137).trimEnd() + "…" : first.text;

  return (
    <div
      className="card"
      style={{
        background:
          "linear-gradient(180deg, var(--paper) 0%, var(--paper-2) 100%)",
        color: "var(--paper-ink)",
        borderColor: "var(--paper-line)",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <BookSvg />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, letterSpacing: ".16em", fontWeight: 600, color: "var(--gold)" }}>
            DAILY SCRIPTURE · KJV
          </div>
          <div className="serif" style={{ fontSize: "1.15rem", marginTop: 2 }}>
            {passage.ref}
          </div>
          <p
            className="serif"
            style={{
              margin: "8px 0 0",
              fontStyle: "italic",
              fontSize: "0.98rem",
              lineHeight: 1.6,
            }}
          >
            “{snippet}”
          </p>
          <p style={{ marginTop: 8, fontSize: 12, color: "var(--paper-ink)", opacity: 0.75 }}>
            Theme: {passage.theme}
            {hint ? ` · biased by your journal (${hint})` : ""}
          </p>
        </div>
        <span aria-hidden style={{ fontSize: 18, opacity: 0.6 }}>›</span>
      </div>
    </div>
  );
}

function BookSvg() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4z" />
      <path d="M4 17a3 3 0 0 1 3-3h12" />
    </svg>
  );
}
