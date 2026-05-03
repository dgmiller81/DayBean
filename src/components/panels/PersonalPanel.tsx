import { PersonalHeadline } from "@/components/personal/PersonalHeadline";
import { Motivation } from "@/components/personal/Motivation";
import { PersonalArticles } from "@/components/personal/PersonalArticles";
import { StatGrid } from "@/components/personal/StatGrid";
import { PersonalGoals } from "@/components/personal/PersonalGoals";
import { getCurrentUserId } from "@/server/auth-context";
import { todayISO } from "@/lib/dates";

export async function PersonalPanel() {
  const userId = await getCurrentUserId();
  const iso = todayISO();

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <PersonalHeadline userId={userId} iso={iso} />
      <Motivation userId={userId} iso={iso} />
      <StatGrid userId={userId} iso={iso} />
      <PersonalArticles userId={userId} iso={iso} />
      <PersonalGoals userId={userId} iso={iso} />
    </div>
  );
}
