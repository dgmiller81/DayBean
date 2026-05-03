import { recordClick } from "@/server/actions/clicks";
import { getGitHubBuzz, type GitHubRepo } from "@/server/queries/github-buzz";
import { TrackedAnchor } from "./TrackedAnchor";

function RepoCard({
  r,
  showVelocity,
  track,
}: {
  r: GitHubRepo;
  showVelocity: boolean;
  track: () => Promise<void>;
}) {
  return (
    <TrackedAnchor
      key={r.url}
      href={r.url}
      cat="business"
      onTrack={track}
      className="repo"
    >
      <div style={{ flex: 1 }}>
        <div className="repo-name">
          <span className="org">{r.org}/</span>
          <strong>{r.name}</strong>
        </div>
        {r.description && <div className="repo-pitch">{r.description}</div>}
        <div className="repo-meta">
          <span><strong>★ {r.starsDisplay}</strong></span>
          {showVelocity && r.starsPerWeekDisplay && (
            <span style={{ color: "var(--gold)", fontWeight: 600 }}>
              {r.starsPerWeekDisplay}
            </span>
          )}
          {r.language && <span>· {r.language}</span>}
          {r.license && <span>· {r.license}</span>}
        </div>
      </div>
    </TrackedAnchor>
  );
}

export async function Repos({ userId, iso }: { userId: string; iso: string }) {
  const buzz = await getGitHubBuzz();
  const track = recordClick.bind(null, { userId, iso, section: "business" });

  const empty = buzz.topStarred.length === 0 && buzz.fastestGrowing.length === 0;

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-eyebrow">GitHub buzz</div>
          <div className="card-title">What devs are starring</div>
        </div>
        <span style={{ fontSize: ".7rem", color: "var(--ink-muted)", letterSpacing: ".06em" }}>
          updated daily
        </span>
      </div>

      {buzz.error && (
        <div
          role="alert"
          style={{
            padding: 10,
            background: "rgba(201,123,110,0.10)",
            border: "1px solid rgba(201,123,110,0.35)",
            borderRadius: "var(--radius-sm)",
            color: "var(--rose)",
            fontSize: 12,
            marginBottom: 12,
          }}
        >
          GitHub API error: {buzz.error}
        </div>
      )}

      {empty && !buzz.error && (
        <p style={{ color: "var(--ink-muted)", fontSize: 13, fontStyle: "italic" }}>
          No repos returned today. The query refreshes once a day.
        </p>
      )}

      {buzz.topStarred.length > 0 && (
        <section style={{ marginBottom: 18 }}>
          <h4
            style={{
              fontSize: ".65rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".16em",
              color: "var(--gold)",
              margin: "0 0 8px",
            }}
          >
            Highest-starred AI
          </h4>
          {buzz.topStarred.map((r) => (
            <RepoCard key={r.url} r={r} showVelocity={false} track={track} />
          ))}
        </section>
      )}

      {buzz.fastestGrowing.length > 0 && (
        <section>
          <h4
            style={{
              fontSize: ".65rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".16em",
              color: "var(--gold)",
              margin: "0 0 8px",
            }}
          >
            Fastest-growing (last 180 days)
          </h4>
          {buzz.fastestGrowing.map((r) => (
            <RepoCard key={r.url} r={r} showVelocity={true} track={track} />
          ))}
        </section>
      )}
    </div>
  );
}
