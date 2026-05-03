"use client";

import { useState } from "react";
import type { DailyContent } from "@/types/daily-content";
import type { LatestRefresh } from "@/server/queries/refresh-log";
import { HandEditModal } from "./HandEditModal";

type Props = {
  iso: string;
  initialContent: DailyContent;
  latestRefresh: LatestRefresh | null;
};

export function EditContentLink({ iso, initialContent, latestRefresh }: Props) {
  const [open, setOpen] = useState(false);
  // Serialize Date → ISO string for client (Server Components send Date objects fine,
  // but pass-through to a Client child needs primitive types).
  const serialized = latestRefresh
    ? {
        ...latestRefresh,
        startedAt: latestRefresh.startedAt.toISOString(),
        finishedAt: latestRefresh.finishedAt?.toISOString() ?? null,
      }
    : null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        title="Edit today's content"
        style={{
          background: "transparent",
          border: "1px solid var(--line)",
          color: "var(--ink-soft)",
          padding: "6px 10px",
          borderRadius: 999,
          cursor: "pointer",
          fontSize: 12,
          letterSpacing: "0.04em",
        }}
      >
        edit content
      </button>
      <HandEditModal
        iso={iso}
        initialContent={initialContent}
        latestRefresh={serialized}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
