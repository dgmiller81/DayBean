export type Section = "mindfulness" | "business" | "personal";
export type SectionOrGeneral = Section | "general";
export type Filter = "all" | Section;
export type GoalType = "check" | "count" | "time";

import type { GoalCategory } from "./slow-sip";

export type Goal = {
  id: string;
  specId: string;
  userId: string;
  section: Section;
  title: string;
  type: GoalType;
  target: number;
  isDefault: boolean;
  createdAt: Date;
  category?: GoalCategory | null;
};

export type Task = {
  id: string;
  userId: string;
  title: string;
  section: SectionOrGeneral;
  done: boolean;
  createdAt: Date;
  completedOn: string | null;
};

export type HealthFlags = {
  slept?: boolean;
  moved?: boolean;
  ate?: boolean;
};

export type Finance = {
  net?: string;
  cash?: string;
  invest?: string;
};

export type DayRecord = {
  iso: string;
  userId: string;
  goals: Record<string, boolean | number>;
  notes: string;
  health: HealthFlags;
  disconnect: number;
  win: string;
  fin: Finance;
};

export type ClickCounts = {
  mindfulness: number;
  business: number;
  personal: number;
};

export type Pref = {
  userId: string;
  theme: "light" | "dark";
  filter: Filter;
  jobTitle: string | null;
  interests: string[];
  faith: string | null;
  scripturePref: string | null;
};

export type GoalProgress = { current: number; target: number; pct: number };

// S0-T03 — DayBean type contracts. Re-exported from focused modules so
// every consumer can import from "@/types".
export * from "./journal-theme";
export * from "./suggested-goal";
export * from "./partner";
export * from "./voucher";
export * from "./refresh";
export * from "./slow-sip";
export * from "./onboarding";
