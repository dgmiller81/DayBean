"use client";
import { useEffect, useRef } from "react";
import type { Scripture } from "@/lib/scriptures";

export function BibleModal({
  passage,
  hint,
  open,
  onClose,
}: {
  passage: Scripture;
  hint: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,15,5,.78)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bible-ref"
        style={{
          width: "min(900px, 100%)",
          maxHeight: "90vh",
          overflow: "auto",
          background:
            "radial-gradient(60% 40% at 30% 20%, rgba(58,46,28,0.06), transparent 60%), radial-gradient(60% 40% at 70% 80%, rgba(58,46,28,0.06), transparent 60%), linear-gradient(180deg, var(--paper) 0%, var(--paper-2) 100%)",
          color: "var(--paper-ink)",
          border: "1px solid var(--paper-line)",
          borderRadius: 8,
          boxShadow: "0 40px 100px rgba(0,0,0,.65), 0 0 0 1px rgba(58,46,28,.18)",
          padding: "20px 28px",
        }}
      >
        <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: ".18em", fontWeight: 600, color: "var(--gold)" }}>
              HOLY BIBLE · KING JAMES VERSION
            </div>
            <h2 id="bible-ref" className="serif" style={{ fontSize: "1.4rem", margin: "4px 0 0" }}>
              {passage.ref}
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {hint ? (
              <span
                style={{
                  background: "rgba(58,46,28,0.08)",
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: 11,
                  letterSpacing: ".08em",
                }}
              >
                Theme: {passage.theme} · biased ({hint})
              </span>
            ) : (
              <span style={{ fontSize: 11, opacity: 0.7 }}>Theme: {passage.theme}</span>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{ background: "none", border: 0, cursor: "pointer", color: "var(--paper-ink)", fontSize: 22 }}
            >
              ×
            </button>
          </div>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
            marginTop: 18,
            paddingTop: 18,
            borderTop: "1px solid var(--paper-line)",
          }}
        >
          <section>
            <div style={{ fontSize: 11, letterSpacing: ".16em", fontWeight: 600, color: "var(--gold)", marginBottom: 10 }}>
              THE PASSAGE
            </div>
            <div className="serif" style={{ fontSize: "1.05rem", lineHeight: 1.85 }}>
              {passage.passage.map((v) => (
                <p key={v.v} style={{ paddingLeft: "1.6em", textIndent: "-1.6em", margin: "0 0 8px" }}>
                  <span
                    style={{
                      color: "var(--gold)",
                      fontFamily: "var(--font-inter)",
                      fontSize: 11,
                      verticalAlign: "super",
                      marginRight: 4,
                    }}
                  >
                    {v.v}
                  </span>
                  {v.text}
                </p>
              ))}
            </div>
          </section>

          <section style={{ borderLeft: "1px solid var(--paper-line)", paddingLeft: 24 }}>
            <div style={{ fontSize: 11, letterSpacing: ".16em", fontWeight: 600, color: "var(--gold)", marginBottom: 10 }}>
              NOTES &amp; COMMENTARY
            </div>
            {passage.commentary.map((c, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <h3 className="serif" style={{ fontSize: "1rem", margin: "0 0 4px" }}>
                  {c.title}
                </h3>
                <p style={{ fontSize: "0.92rem", lineHeight: 1.65, margin: 0 }}>{c.body}</p>
              </div>
            ))}
          </section>
        </div>

        <footer
          style={{
            marginTop: 18,
            paddingTop: 14,
            borderTop: "1px solid var(--paper-line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 12,
          }}
        >
          <span style={{ opacity: 0.7 }}>
            Mention a theme in your journal — tomorrow's pick adapts.
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "var(--paper-ink)",
              color: "var(--paper)",
              border: 0,
              padding: "6px 14px",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
