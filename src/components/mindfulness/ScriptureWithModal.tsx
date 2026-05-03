"use client";
import { useState } from "react";
import { ScripturePreview } from "./ScripturePreviewCard";
import { BibleModal } from "./BibleModal";
import type { Scripture } from "@/lib/scriptures";

export function ScriptureWithModal({
  passage,
  hint,
}: {
  passage: Scripture;
  hint: string | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={`Open ${passage.ref}`}
      >
        <ScripturePreview passage={passage} hint={hint} />
      </div>
      <BibleModal passage={passage} hint={hint} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
