"use client";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { TAB_EVENT, setActiveTab as broadcastTab } from "@/lib/tab-bus";
import { TAB_LABELS, TAB_EYEBROWS } from "@/lib/constants";

export type Tab = "mindfulness" | "business" | "personal" | "overview";

// S1-T02 — Coffee-named tab labels read from src/lib/constants.ts. Tab IDs
// stay the same to preserve cookies + routes; only the human-readable
// labels change.
const TAB_DEFS: Array<{
  id: Tab;
  label: string;
  eyebrow: string;
  icon: ReactNode;
}> = [
  {
    id: "mindfulness",
    label: TAB_LABELS.mindfulness, // "Pour Over"
    eyebrow: TAB_EYEBROWS.mindfulness, // "Mindful Soul"
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12c4 0 6 3 9 3s5-3 9-3M12 3v18" />
      </svg>
    ),
  },
  {
    id: "business",
    label: TAB_LABELS.business, // "Daily Grind"
    eyebrow: TAB_EYEBROWS.business, // "Professional"
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    id: "personal",
    label: TAB_LABELS.personal, // "Slow Sip"
    eyebrow: TAB_EYEBROWS.personal, // "Personal"
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.78 10-10 10z" />
        <path d="M2 21c0-3 1.85-5.36 5.08-6" />
      </svg>
    ),
  },
  {
    id: "overview",
    label: TAB_LABELS.overview, // "Bean Count"
    eyebrow: TAB_EYEBROWS.overview, // "Goals overview"
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
];

type Props = {
  initial?: Tab;
  mindfulnessPanel: ReactNode;
  businessPanel: ReactNode;
  personalPanel: ReactNode;
  overviewPanel: ReactNode;
};

export function Tabs({
  initial = "mindfulness",
  mindfulnessPanel,
  businessPanel,
  personalPanel,
  overviewPanel,
}: Props) {
  const [active, setActive] = useState<Tab>(initial);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Tab>).detail;
      if (detail) setActive(detail);
    };
    window.addEventListener(TAB_EVENT, handler);
    return () => window.removeEventListener(TAB_EVENT, handler);
  }, []);

  const slot: Record<Tab, ReactNode> = {
    mindfulness: mindfulnessPanel,
    business: businessPanel,
    personal: personalPanel,
    overview: overviewPanel,
  };

  return (
    <>
      <div className="tabs" role="tablist">
        {TAB_DEFS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            data-tab={t.id}
            className="tab-btn"
            onClick={() => {
              setActive(t.id);
              broadcastTab(t.id);
            }}
          >
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-meta">
              <span className="eyebrow">{t.eyebrow}</span>
              <span className="name">{t.label}</span>
            </span>
          </button>
        ))}
      </div>
      <section className={`panel ${active ? "active" : ""}`} key={active}>
        {slot[active]}
      </section>
    </>
  );
}
