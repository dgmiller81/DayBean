import { BusinessHeadline } from "@/components/business/BusinessHeadline";
import { BusinessBriefing } from "@/components/business/BusinessBriefing";
import { TopStories } from "@/components/business/TopStories";
import { ScanList } from "@/components/business/ScanList";
import { BusinessArticles } from "@/components/business/BusinessArticles";
import { DevQuotes } from "@/components/business/DevQuotes";
import { Repos } from "@/components/business/Repos";
import { Watchlist } from "@/components/business/Watchlist";
import { BusinessGoals } from "@/components/business/BusinessGoals";
import { getCurrentUserId } from "@/server/auth-context";
import { todayISO } from "@/lib/dates";

export async function BusinessPanel() {
  const userId = await getCurrentUserId();
  const iso = todayISO();

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <BusinessHeadline userId={userId} iso={iso} />
      <BusinessBriefing userId={userId} iso={iso} />
      <TopStories userId={userId} iso={iso} />
      <ScanList userId={userId} iso={iso} />
      <BusinessArticles userId={userId} iso={iso} />
      <DevQuotes userId={userId} iso={iso} />
      <Repos userId={userId} iso={iso} />
      <Watchlist userId={userId} iso={iso} />
      <BusinessGoals userId={userId} iso={iso} />
    </div>
  );
}
