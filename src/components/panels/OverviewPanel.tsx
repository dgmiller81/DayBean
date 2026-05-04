import { getCurrentUserId } from "@/server/auth-context";
import { todayISO } from "@/lib/dates";
import { OverviewHero } from "@/components/overview/OverviewHero";
import { CategoryRollup } from "@/components/overview/CategoryRollup";
import { SectionBars } from "@/components/overview/SectionBars";
import { FilterPills } from "@/components/overview/FilterPills";
import { MasterGoalList } from "@/components/overview/MasterGoalList";
import { NextUpFooter } from "@/components/NextUpFooter";

export async function OverviewPanel() {
  const userId = await getCurrentUserId();
  const iso = todayISO();

  return (
    <>
      <div className="pulse-hero">
        <div className="card-eyebrow">Whole-life view</div>
        <h2>Your goals, all in one place.</h2>
        <p style={{ marginTop: 14, color: "var(--ink-soft)" }}>
          Check goals off here or from any section — it all syncs. Articles read, disconnect minutes, and check-ins flow up automatically.
        </p>
      </div>

      <OverviewHero userId={userId} iso={iso} />

      <CategoryRollup userId={userId} iso={iso} />

      <div className="card" style={{ marginBottom: 22 }}>
        <div className="card-header">
          <div>
            <div className="card-eyebrow">By section</div>
            <div className="card-title">Today's progress</div>
          </div>
        </div>
        <SectionBars userId={userId} iso={iso} />
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-eyebrow">All goals</div>
            <div className="card-title">Filterable view</div>
          </div>
        </div>
        <FilterPills userId={userId} />
        <MasterGoalList userId={userId} iso={iso} />
      </div>
      <NextUpFooter current="overview" />
    </>
  );
}
