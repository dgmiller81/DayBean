"use client";

import { useEffect, useState } from "react";
import { TAB_ORDER, TAB_LABEL, TAB_EVENT, setActiveTab } from "@/lib/tab-bus";
import { TAB_ICON } from "@/components/tab-icons";
import type { Tab } from "@/components/Tabs";

const APPEAR_AFTER_PX = 220;

function formatLongDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function StickyHeader({
  iso,
  initialTab,
}: {
  iso: string;
  initialTab: Tab;
}) {
  const [active, setActive] = useState<Tab>(initialTab);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Tab>).detail;
      if (detail) setActive(detail);
    };
    window.addEventListener(TAB_EVENT, handler);
    return () => window.removeEventListener(TAB_EVENT, handler);
  }, []);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const evaluate = () => {
      const y = window.scrollY;
      const goingUp = y < lastY;
      const past = y > APPEAR_AFTER_PX;
      setVisible(past && goingUp);
      lastY = y;
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(evaluate);
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    evaluate();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onTabClick = (t: Tab) => {
    setActiveTab(t);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className={`sticky-header${visible ? " visible" : ""}`} aria-hidden={!visible}>
      <div className="sticky-header-inner">
        <div className="sticky-title">
          <span className="serif">DayBeans</span>
          <span className="sep" aria-hidden>~</span>
          <span className="sticky-date">{formatLongDate(iso)}</span>
        </div>
        <div className="sticky-tabs" role="tablist" aria-label="Sections">
          {TAB_ORDER.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              tabIndex={visible ? 0 : -1}
              className={`sticky-tab${active === t ? " active" : ""}`}
              aria-selected={active === t}
              onClick={() => onTabClick(t)}
            >
              <span className="sticky-tab-icon">{TAB_ICON[t]}</span>
              <span className="sticky-tab-label">{TAB_LABEL[t]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
