"use client";

import type { Tab } from "@/components/Tabs";
import { TAB_LABELS } from "@/lib/constants";

export const TAB_ORDER: Tab[] = ["mindfulness", "business", "personal", "overview"];

// S1-T02 — Coffee-named labels read from constants. Kept as a Record<Tab,string>
// for backward compat with consumers (NextUpFooter, StickyHeader).
export const TAB_LABEL: Record<Tab, string> = TAB_LABELS;

export const TAB_EVENT = "db:set-tab";

// S1-T05 — Cookie prefix migration mm_* → db_*. Writes use the new prefix;
// reads on the server side accept either (see src/app/layout.tsx + page.tsx).
const TAB_COOKIE_NEW = "db_tab";
const TAB_COOKIE_OLD = "mm_tab";

export function setActiveTab(tab: Tab) {
  if (typeof document !== "undefined") {
    document.cookie = `${TAB_COOKIE_NEW}=${tab}; path=/; max-age=31536000; SameSite=Lax`;
    // Clear the legacy cookie if present so the migration completes cleanly.
    if (document.cookie.includes(`${TAB_COOKIE_OLD}=`)) {
      document.cookie = `${TAB_COOKIE_OLD}=; path=/; max-age=0; SameSite=Lax`;
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<Tab>(TAB_EVENT, { detail: tab }));
  }
}

export function nextTab(current: Tab): Tab {
  const i = TAB_ORDER.indexOf(current);
  return TAB_ORDER[(i + 1) % TAB_ORDER.length];
}
