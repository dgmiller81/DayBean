import type { Section, GoalType } from "@/types";

export type DefaultGoalSpec = {
  specId: string;
  section: Section;
  title: string;
  type: GoalType;
  target: number;
};

export const DEFAULT_GOALS: DefaultGoalSpec[] = [
  { specId: "g_god",            section: "mindfulness", title: "Time with God / prayer", type: "check", target: 1 },
  { specId: "g_meditate",       section: "mindfulness", title: "Meditate (5+ minutes)", type: "check", target: 1 },
  { specId: "g_present_kids",   section: "mindfulness", title: "Be fully present with my kids", type: "check", target: 1 },
  { specId: "g_family",         section: "mindfulness", title: "Connect with family or a friend", type: "check", target: 1 },
  { specId: "g_no_overcommit",  section: "mindfulness", title: "Said no to something I should have", type: "check", target: 1 },
  { specId: "g_selfless",       section: "mindfulness", title: "One selfless act today", type: "check", target: 1 },
  { specId: "g_walk",           section: "mindfulness", title: "Walk the dogs without my phone", type: "check", target: 1 },
  { specId: "g_mf_read",        section: "mindfulness", title: "Read 1 mindfulness article", type: "count", target: 1 },
  { specId: "g_learn",          section: "business",    title: "Continuous improvement — read 3+ AI articles", type: "count", target: 3 },
  { specId: "g_strategy",       section: "business",    title: "30 min on AI strategy & competitive scanning", type: "check", target: 1 },
  { specId: "g_customer",       section: "business",    title: "Talk to a customer (call, email, shadow)", type: "check", target: 1 },
  { specId: "g_product",        section: "business",    title: "Move the top product bet forward by one step", type: "check", target: 1 },
  { specId: "g_team",           section: "business",    title: "Unblock or coach one teammate", type: "check", target: 1 },
  { specId: "g_demos",          section: "business",    title: "Try one new AI tool / model / agent", type: "check", target: 1 },
  { specId: "g_money",          section: "personal",    title: "Check finances", type: "check", target: 1 },
  { specId: "g_move",           section: "personal",    title: "Move 30 minutes", type: "check", target: 1 },
  { specId: "g_disconnect",     section: "personal",    title: "Disconnect 60 minutes", type: "time",  target: 60 },
  { specId: "g_writing",        section: "personal",    title: "Write something (memo, doc, post, journal)", type: "check", target: 1 },
  { specId: "g_per_read",       section: "personal",    title: "Read 1 self-help / motivation article", type: "count", target: 1 },
];

export function compositeGoalId(userId: string, specId: string): string {
  return `${userId}::${specId}`;
}

export function specIdFromCompositeId(id: string): string {
  const ix = id.indexOf("::");
  return ix < 0 ? id : id.slice(ix + 2);
}

const DEFAULT_SPEC_IDS = new Set(DEFAULT_GOALS.map((g) => g.specId));
export function isDefaultGoal(specId: string): boolean {
  return DEFAULT_SPEC_IDS.has(specId);
}
