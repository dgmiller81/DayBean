"use client";

import type { Tab } from "@/components/Tabs";

export const TAB_ORDER: Tab[] = ["mindfulness", "business", "personal", "overview"];

export const TAB_LABEL: Record<Tab, string> = {
  mindfulness: "Mindfulness",
  business: "Business / AI",
  personal: "Personal",
  overview: "Goals Overview",
};

export const TAB_EVENT = "mm:set-tab";

export function setActiveTab(tab: Tab) {
  if (typeof document !== "undefined") {
    document.cookie = `mm_tab=${tab}; path=/; max-age=31536000; SameSite=Lax`;
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<Tab>(TAB_EVENT, { detail: tab }));
  }
}

export function nextTab(current: Tab): Tab {
  const i = TAB_ORDER.indexOf(current);
  return TAB_ORDER[(i + 1) % TAB_ORDER.length];
}
