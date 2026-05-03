import { getDailyContent } from "@/server/queries/daily-content";
import { recordClick } from "@/server/actions/clicks";
import { isBookmarked } from "@/server/queries/bookmarks";
import { ScanLink } from "./ScanLink";

export async function ScanList({ userId, iso }: { userId: string; iso: string }) {
  const content = await getDailyContent(userId, iso);
  const items = content.business.scan;
  if (!items.length) return null;

  const track = recordClick.bind(null, { userId, iso, section: "business" });
  const marks = await Promise.all(items.map((s) => isBookmarked(userId, s.url)));

  return (
    <div className="card" style={{ marginBottom: 22 }}>
      <div className="card-header">
        <div>
          <div className="card-eyebrow">Quick scan</div>
          <div className="card-title">Today, in {items.length} {items.length === 1 ? "line" : "lines"}</div>
        </div>
      </div>
      <ol className="scan-grid">
        {items.map((item, i) => (
          <ScanLink
            key={item.url + i}
            userId={userId}
            href={item.url}
            title={item.title}
            src={item.src}
            initialBookmarked={marks[i]}
            onTrack={track}
          />
        ))}
      </ol>
    </div>
  );
}
