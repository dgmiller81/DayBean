import { ThemeToggle, type Theme } from "./primitives/ThemeToggle";
import { StreakPill } from "./primitives/StreakPill";
import { EditContentLink } from "./content/EditContentLink";
import { SettingsButton } from "./settings/SettingsButton";
import { TopbarRefreshButton } from "./TopbarRefreshButton";
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
}: {
  theme: Theme;
  name: string;
  iso: string;
  dailyContent: DailyContent;
  settings: SettingsSummary;
  latestRefresh: LatestRefresh | null;
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
        <div className="brand-mark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 2v20M2 12h20" />
          </svg>
        </div>
        <div className="brand-name">
          DayBeans <span>· for {name}</span>
        </div>
      </div>
      <div className="topbar-tools">
        <StreakPill count={0} />
        <TopbarRefreshButton llmConfigured={llmConfigured} lastStatus={lastStatus} />
        <EditContentLink iso={iso} initialContent={dailyContent} latestRefresh={latestRefresh} />
        <SettingsButton initial={settings} initialTheme={theme} />
        <ThemeToggle initial={theme} />
      </div>
    </div>
  );
}
