import { getDailyContent } from "@/server/queries/daily-content";
import { recordClick } from "@/server/actions/clicks";
import { BadgeRow } from "./Badge";
import { TrackedAnchor } from "./TrackedAnchor";

export async function TopStories({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const stories = content.business.topStories;
  if (!stories.length) return null;

  const track = recordClick.bind(null, { userId, iso, section: "business" });

  return (
    <div className="top-stories">
      {stories.map((s, i) => {
        const isLead = s.kind === "lead";
        return (
          <TrackedAnchor
            key={s.url + i}
            href={s.url}
            cat="business"
            onTrack={track}
            className={`top-card${isLead ? " lead" : ""}`}
          >
            <div className="top-eyebrow">{s.eyebrow}</div>
            <BadgeRow badges={s.badges ?? []} />
            <h3>{s.title}</h3>
            <p>{s.body}</p>
            <div className="src">{s.src}</div>
          </TrackedAnchor>
        );
      })}
    </div>
  );
}
