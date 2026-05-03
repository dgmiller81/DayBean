"use client";

import { ArticleActions } from "@/components/bookmarks/ArticleActions";

export function ScanLink({
  userId,
  href,
  title,
  src,
  initialBookmarked,
  onTrack,
}: {
  userId: string;
  href: string;
  title: string;
  src?: string;
  initialBookmarked: boolean;
  onTrack: () => Promise<void>;
}) {
  return (
    <li className="scan-row">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="scan-link"
        onClick={() => {
          void onTrack();
        }}
      >
        <span className="scan-title">{title}</span>
        {src && <span className="scan-src">{src}</span>}
      </a>
      <ArticleActions
        userId={userId}
        url={href}
        title={title}
        source="quick-scan"
        initialBookmarked={initialBookmarked}
      />
    </li>
  );
}
