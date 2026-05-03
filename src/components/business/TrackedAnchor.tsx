"use client";
import type { ReactNode, CSSProperties } from "react";

export type TrackCat = "business" | "personal";

export function TrackedAnchor({
  href,
  cat,
  onTrack,
  children,
  className,
  style,
}: {
  href: string;
  cat: TrackCat;
  onTrack: () => Promise<void>;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-track-cat={cat}
      className={className}
      style={style}
      onClick={() => {
        // Fire-and-forget; the anchor still navigates in the new tab.
        void onTrack();
      }}
    >
      {children}
    </a>
  );
}
