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
      className="article-card"
      data-track-cat={section}
      onClick={() => {
        void recordClick({ userId, iso, section });
      }}
    >
      <h3>{title}</h3>
      <p>{summary}</p>
      <div className="src">{source}</div>
    </a>
  );
}
