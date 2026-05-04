import { type Theme } from "./primitives/ThemeToggle";
import { StreakPill } from "./primitives/StreakPill";
import { StreakRewardBadge } from "./rewards/StreakRewardBadge";
import { TopbarRefreshButton } from "./TopbarRefreshButton";
import { BrandMark } from "./primitives/BrandMark";
import { ProfileMenu } from "./ProfileMenu";
import { APP_NAME } from "@/lib/constants";
import type { ReactNode } from "react";
import type { DailyContent } from "@/types/daily-content";
import type { SettingsSummary } from "@/server/actions/settings";
import type { LatestRefresh } from "@/server/queries/refresh-log";

export function Topbar({
  theme,
  name,
  iso,
  dailyContent,
  settings,
  latestRefresh,
  streakLength,
  refreshStatusSlot,
}: {
  theme: Theme;
  name: string;
  iso: string;
  dailyContent: DailyContent;
  settings: SettingsSummary;
  latestRefresh: LatestRefresh | null;
  streakLength: number;
  refreshStatusSlot?: ReactNode;
}) {
  const llmConfigured = settings.credentials.length > 0 || !!settings.envOverride;
  const lastStatus: "ok" | "failed" | "none" = !latestRefresh
    ? "none"
    : latestRefresh.status === "ok"
      ? "ok"
      : "failed";

  return (
    <div className="topbar">
      <div className="brand">
        {/* S1-T01 — BrandMark replaces the legacy plus-sign mark; centralized in
            src/components/primitives/BrandMark.tsx so a future logo swap touches
            one file. */}
        <BrandMark size={36} ariaLabel={APP_NAME} />
        <div className="brand-name">
          {APP_NAME} <span>· for {name}</span>
        </div>
      </div>
      <div className="topbar-tools">
        <StreakPill count={streakLength} />
        <StreakRewardBadge streakLength={streakLength} />
        <TopbarRefreshButton llmConfigured={llmConfigured} lastStatus={lastStatus} />
        {/* Profile menu replaces the previous quartet of icons (settings,
            edit-content, theme-toggle, sign-out). All four entry points live
            inside the dropdown now. */}
        <ProfileMenu
          name={name}
          initialTheme={theme}
          settings={settings}
          refreshStatusSlot={refreshStatusSlot}
          iso={iso}
          dailyContent={dailyContent}
          latestRefresh={latestRefresh}
        />
      </div>
    </div>
  );
}
