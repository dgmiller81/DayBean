"use client";

import { TAB_LABEL, nextTab, setActiveTab } from "@/lib/tab-bus";
import type { Tab } from "@/components/Tabs";

export function NextUpFooter({ current }: { current: Tab }) {
  const next = nextTab(current);
  return (
    <div className="next-up-row">
      <button
        type="button"
        className="next-up"
        onClick={() => {
          setActiveTab(next);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      >
        <span className="next-up-label">Next up</span>
        <span className="next-up-name">{TAB_LABEL[next]}</span>
        <span className="next-up-arrow" aria-hidden>→</span>
      </button>
    </div>
  );
}
