import { BusinessHero } from "@/components/business/BusinessHero";
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
    <>
      <BusinessHero userId={userId} iso={iso} />
      <TopStories userId={userId} iso={iso} />
      <ScanList userId={userId} iso={iso} />
      <div className="grid-2">
        <div>
          <div style={{ marginBottom: 22 }}>
            <BusinessArticles userId={userId} iso={iso} />
          </div>
          <Repos userId={userId} iso={iso} />
        </div>
        <div>
          <div style={{ marginBottom: 22 }}>
            <DevQuotes userId={userId} iso={iso} />
          </div>
          <div style={{ marginBottom: 22 }}>
            <Watchlist userId={userId} iso={iso} />
          </div>
          <BusinessGoals userId={userId} iso={iso} />
        </div>
      </div>
    </>
  );
}
