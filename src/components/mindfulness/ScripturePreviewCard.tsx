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
    <div className="scripture-card">
      <svg
        className="scripture-decor"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" />
      </svg>
      <div className="scripture-info">
        <div className="scripture-eyebrow">Daily scripture · KJV</div>
        <div className="scripture-ref">{passage.ref}</div>
        <div className="scripture-snippet">"{snippet}"</div>
        <div className="scripture-theme">
          {passage.theme}
          {hint ? ` · biased by your journal (${hint})` : ""}
        </div>
      </div>
      <div className="scripture-cta">
        Open
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </div>
  );
}
