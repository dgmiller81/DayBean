"use client";
import { recordClick } from "@/server/actions/clicks";
import type { Section } from "@/types";

export function TrackedArticleLink({
  userId,
  iso,
  section,
  href,
  title,
  summary,
  source,
}: {
  userId: string;
  iso: string;
  section: Section;
  href: string;
  title: string;
  summary: string;
  source: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        // Fire-and-forget — anchor still navigates; server action runs in parallel
        void recordClick({ userId, iso, section });
      }}
      style={{
        display: "block",
        padding: 14,
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-sm)",
        background: "var(--surface-2)",
        color: "var(--ink)",
        textDecoration: "none",
      }}
    >
      <div className="serif" style={{ fontSize: "1.05rem", fontWeight: 500 }}>{title}</div>
      <p style={{ marginTop: 4, fontSize: 13, color: "var(--ink-soft)" }}>{summary}</p>
      <div style={{ marginTop: 6, fontSize: 11, color: "var(--ink-muted)" }}>{source}</div>
    </a>
  );
}
