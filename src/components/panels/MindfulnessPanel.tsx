import { GodCard } from "@/components/mindfulness/GodCard";
import { ScriptureWithModal } from "@/components/mindfulness/ScriptureWithModal";
import { selectScriptureForUser } from "@/server/queries/scripture";
import { Reflections } from "@/components/mindfulness/Reflections";
import { Journal } from "@/components/mindfulness/Journal";
import { BreathTimer } from "@/components/mindfulness/BreathTimer";
import { MindfulnessArticles } from "@/components/mindfulness/MindfulnessArticles";
import { MindfulnessGoals } from "@/components/mindfulness/MindfulnessGoals";
import { getDayOrEmpty } from "@/server/queries/days";
import { getCurrentUserId } from "@/server/auth-context";
import { todayISO } from "@/lib/dates";

export async function MindfulnessPanel() {
  const userId = await getCurrentUserId();
  const iso = todayISO();

  const [day, scripture] = await Promise.all([
    getDayOrEmpty(userId, iso),
    selectScriptureForUser(userId, iso),
  ]);

  return (
    <>
      <GodCard userId={userId} iso={iso} />
      <ScriptureWithModal passage={scripture.passage} hint={scripture.hint} />
      <div className="grid-2">
        <div>
          <div style={{ marginBottom: 22 }}>
            <Reflections iso={iso} />
          </div>
          <div style={{ marginBottom: 22 }}>
            <MindfulnessArticles userId={userId} iso={iso} />
          </div>
          <div>
            <Journal userId={userId} iso={iso} initial={day.notes} />
          </div>
        </div>
        <div>
          <div style={{ marginBottom: 22 }}>
            <MindfulnessGoals userId={userId} iso={iso} />
          </div>
          <BreathTimer />
        </div>
      </div>
    </>
  );
}
