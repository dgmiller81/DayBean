import { ThemeToggle, type Theme } from "./primitives/ThemeToggle";
import { StreakPill } from "./primitives/StreakPill";
import { EditContentLink } from "./content/EditContentLink";
import { SettingsButton } from "./settings/SettingsButton";
import { TopbarRefreshButton } from "./TopbarRefreshButton";
import { BrandMark } from "./primitives/BrandMark";
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
  refreshStatusSlot,
}: {
  theme: Theme;
  name: string;
  iso: string;
  dailyContent: DailyContent;
  settings: SettingsSummary;
  latestRefresh: LatestRefresh | null;
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
        <StreakPill count={0} />
        <TopbarRefreshButton llmConfigured={llmConfigured} lastStatus={lastStatus} />
        <EditContentLink iso={iso} initialContent={dailyContent} latestRefresh={latestRefresh} />
        <SettingsButton initial={settings} initialTheme={theme} refreshStatusSlot={refreshStatusSlot} />
        <ThemeToggle initial={theme} />
      </div>
    </div>
  );
}
