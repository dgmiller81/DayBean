import { PersonalHero } from "@/components/personal/PersonalHero";
import { PersonalArticles } from "@/components/personal/PersonalArticles";
import { StatGrid } from "@/components/personal/StatGrid";
import { PersonalGoals } from "@/components/personal/PersonalGoals";
import { getCurrentUserId } from "@/server/auth-context";
import { todayISO } from "@/lib/dates";

export async function PersonalPanel() {
  const userId = await getCurrentUserId();
  const iso = todayISO();

  return (
    <>
      <PersonalHero userId={userId} iso={iso} />
      <StatGrid userId={userId} iso={iso} />
      <div className="grid-2">
        <PersonalArticles userId={userId} iso={iso} />
        <PersonalGoals userId={userId} iso={iso} />
      </div>
    </>
  );
}
