"use client";
import { useState } from "react";
import type { ReactNode } from "react";

export type Tab = "mindfulness" | "business" | "personal" | "overview";

const TABS: Array<{ id: Tab; label: string; eyebrow: string; dotClass: string }> = [
  { id: "mindfulness", label: "Mindfulness", eyebrow: "Stillpoint", dotClass: "sec-mindfulness" },
  { id: "business",    label: "Business / AI", eyebrow: "Pulse", dotClass: "sec-business" },
  { id: "personal",    label: "Personal", eyebrow: "Compass", dotClass: "sec-personal" },
  { id: "overview",    label: "Goals Overview", eyebrow: "All-up", dotClass: "sec-general" },
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
  return (
    <>
      <div
        role="tablist"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          margin: "0 0 24px",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            onClick={() => {
              setActive(t.id);
              document.cookie = `mm_tab=${t.id}; path=/; max-age=31536000; SameSite=Lax`;
            }}
            className="card"
            style={{
              cursor: "pointer",
              padding: "14px 16px",
              textAlign: "left",
              outline: active === t.id ? "2px solid var(--sage)" : "none",
              outlineOffset: -2,
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <span className={`sec-dot ${t.dotClass}`} />
              <span style={{ color: "var(--gold)", fontSize: 11, letterSpacing: ".16em", fontWeight: 600 }}>
                {t.eyebrow.toUpperCase()}
              </span>
            </div>
            <div className="serif" style={{ fontSize: 18, marginTop: 4 }}>
              {t.label}
            </div>
          </button>
        ))}
      </div>
      <section>
        {active === "mindfulness" && mindfulnessPanel}
        {active === "business" && businessPanel}
        {active === "personal" && personalPanel}
        {active === "overview" && overviewPanel}
      </section>
    </>
  );
}
