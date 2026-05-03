import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { Hero } from "@/components/Hero";
import { Tabs } from "@/components/Tabs";
import { StickyHeader } from "@/components/StickyHeader";
import { DateNav } from "@/components/DateNav";
import { MindfulnessPanel } from "@/components/panels/MindfulnessPanel";
import { BusinessPanel } from "@/components/panels/BusinessPanel";
import { PersonalPanel } from "@/components/panels/PersonalPanel";
import { OverviewPanel } from "@/components/panels/OverviewPanel";
import { todayISO } from "@/lib/dates";
import { db } from "@/server/db";
import { getCurrentUserIdOrNull } from "@/server/auth-context";
import { getDailyContentWithMeta } from "@/server/queries/daily-content";
import { getSettings } from "@/server/actions/settings";
import { hasRefreshedToday } from "@/server/queries/refresh-status";
import { getLatestRefresh } from "@/server/queries/refresh-log";
import { refreshDailyContent } from "@/server/llm/refresh";
import type { Tab } from "@/components/Tabs";
import type { Theme } from "@/components/primitives/ThemeToggle";

const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const VALID_THEMES = new Set<Theme>([
  "light",
  "dark",
  "warm",
  "forest",
  "midnight",
  "black",
  "space",
  "ai",
  "snow",
  "sepia",
  "slate",
  "crimson",
  "aurora",
  "steel",
  "ember",
]);

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const params = await searchParams;
  const requested = params.d;
  const today = todayISO();
  let iso = today;

  if (requested) {
    if (!ISO_PATTERN.test(requested)) {
      redirect("/");
    }
    if (requested > today) {
      redirect("/");
    }
    iso = requested;
  }

  const c = await cookies();
  const rawTheme = c.get("mm_theme")?.value;
  const theme: Theme = rawTheme && VALID_THEMES.has(rawTheme as Theme) ? (rawTheme as Theme) : "light";
  const tab = (c.get("mm_tab")?.value as Tab | undefined) ?? "mindfulness";

  const userId = await getCurrentUserIdOrNull();
  if (!userId) {
    redirect("/login");
  }
  const meCheck = await db.user.findUnique({
    where: { id: userId },
    select: { onboardedAt: true },
  });
  if (!meCheck?.onboardedAt) {
    redirect("/onboarding");
  }
  const [user, settings] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    getSettings(),
  ]);
  const name = user?.name ?? "Friend";
  const isToday = iso === today;

  // Force a one-shot refresh on first session of the day past the user's
  // configured cutoff hour. Awaits the refresh so the page renders fresh
  // content (no stale fixture / yesterday's content). The single guard:
  // hasRefreshedToday — any successful RefreshLog row for today blocks
  // re-fire until the next ISO day rolls over.
  const llmConfigured = settings.credentials.length > 0 || !!settings.envOverride;
  if (isToday && llmConfigured) {
    const alreadyDone = await hasRefreshedToday(userId, today);
    const cutoffPassed = new Date().getHours() >= settings.refreshHour;
    if (!alreadyDone && cutoffPassed) {
      try {
        await refreshDailyContent(userId, today, "cold-start");
      } catch {
        // refreshDailyContent already writes a failed RefreshLog row;
        // surface it via the modal's "Last refresh" status block.
      }
    }
  }

  // Re-fetch content + latest log AFTER any forced refresh so the page
  // renders with the result of this run.
  const [{ content, source }, latestRefresh] = await Promise.all([
    getDailyContentWithMeta(userId, iso),
    getLatestRefresh(userId),
  ]);

  return (
    <main className="app">
      <StickyHeader iso={iso} initialTab={tab} />
      <Topbar theme={theme} name={name} iso={iso} dailyContent={content} settings={settings} latestRefresh={latestRefresh} />
      <Hero
        name={name}
        iso={iso}
        sub={content.subhead}
        showFixtureHint={isToday && source === "fixture"}
      />
      <DateNav iso={iso} />
      <div style={{ marginTop: 16 }}>
        <Tabs
          initial={tab}
          mindfulnessPanel={<MindfulnessPanel />}
          businessPanel={<BusinessPanel />}
          personalPanel={<PersonalPanel />}
          overviewPanel={<OverviewPanel />}
        />
      </div>
      <div className="closing">
        <div className="closing-divider" />
        <div className="closing-text">
          “I am here. I am enough. I am loved. I am loving.
          <br />
          I am exactly where I need to be.”
        </div>
      </div>
    </main>
  );
}
