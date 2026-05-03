import type { HealthFlags, Finance } from "@/types";

export function parseGoalsJson(s: string): Record<string, boolean | number> {
  try {
    const v = JSON.parse(s);
    return v && typeof v === "object" && !Array.isArray(v)
      ? (v as Record<string, boolean | number>)
      : {};
  } catch {
    return {};
  }
}

export function serializeGoalsJson(v: Record<string, boolean | number>): string {
  return JSON.stringify(v);
}

export function parseHealthJson(s: string): HealthFlags {
  try {
    const v = JSON.parse(s);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as HealthFlags) : {};
  } catch {
    return {};
  }
}

export function serializeHealthJson(v: HealthFlags): string {
  return JSON.stringify(v);
}

export function parseFinJson(s: string): Finance {
  try {
    const v = JSON.parse(s);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Finance) : {};
  } catch {
    return {};
  }
}

export function serializeFinJson(v: Finance): string {
  return JSON.stringify(v);
}

export function parseStringList(s: string | null | undefined): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function serializeStringList(v: string[]): string {
  return JSON.stringify(v);
}
