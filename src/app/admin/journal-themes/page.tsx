import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { getCurrentUserIdOrNull } from "@/server/auth-context";

export const dynamic = "force-dynamic";

type SortKey = "users" | "avg" | "max" | "theme";

type ThemeBucket = {
  theme: string;
  /** # of users who have this theme as a non-muted JournalTheme row. */
  userCount: number;
  /** Average weight across users (only the ones who have it). */
  avgWeight: number;
  /** Highest single user's weight, for eyeballing outliers. */
  maxWeight: number;
};

function parseSort(raw: string | undefined): SortKey {
  if (raw === "avg" || raw === "max" || raw === "theme") return raw;
  return "users";
}

function sortBuckets(buckets: ThemeBucket[], sort: SortKey): ThemeBucket[] {
  const copy = [...buckets];
  switch (sort) {
    case "avg":
      copy.sort((a, b) => b.avgWeight - a.avgWeight);
      break;
    case "max":
      copy.sort((a, b) => b.maxWeight - a.maxWeight);
      break;
    case "theme":
      copy.sort((a, b) => a.theme.localeCompare(b.theme));
      break;
    case "users":
    default:
      copy.sort((a, b) => b.userCount - a.userCount);
      break;
  }
  return copy;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) notFound();

  const me = await db.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  if (!me?.isAdmin) notFound();

  const { sort: rawSort } = await searchParams;
  const sort = parseSort(rawSort);

  // Group JournalTheme rows by theme; aggregate user count + weight stats.
  const groups = await db.journalTheme.groupBy({
    by: ["theme"],
    where: { muted: false },
    _count: { userId: true },
    _avg: { weight: true },
    _max: { weight: true },
    orderBy: { _count: { userId: "desc" } },
    take: 50,
  });

  const buckets: ThemeBucket[] = groups
    .map((g) => ({
      theme: g.theme,
      userCount: g._count.userId,
      avgWeight: g._avg.weight ?? 0,
      maxWeight: g._max.weight ?? 0,
    }))
    .filter((b) => b.userCount > 0);

  const sorted = sortBuckets(buckets, sort);

  const sortLinkStyle = (key: SortKey): React.CSSProperties => ({
    color: sort === key ? "var(--ink)" : "var(--ink-soft)",
    fontWeight: sort === key ? 600 : 400,
    textDecoration: "none",
    fontSize: 13,
  });

  const cellStyle: React.CSSProperties = {
    padding: "8px 12px",
    borderBottom: "1px solid var(--line)",
    fontSize: 14,
    color: "var(--ink)",
  };

  const headerCellStyle: React.CSSProperties = {
    padding: "8px 12px",
    borderBottom: "1px solid var(--line)",
    fontSize: 12,
    fontWeight: 600,
    textAlign: "left",
    color: "var(--ink-soft)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };

  return (
    <main style={{ minHeight: "100vh", padding: "48px 24px", maxWidth: 720, margin: "0 auto" }}>
      <header style={{ marginBottom: 32 }}>
        <h1
          className="serif"
          style={{ fontSize: 28, fontWeight: 500, margin: 0, color: "var(--ink)" }}
        >
          Journal themes — what we&apos;re hearing
        </h1>
        <p style={{ marginTop: 4, color: "var(--ink-soft)", fontSize: 14 }}>
          Anonymized aggregate. Each row is one extracted theme; counts are unique users with that
          non-muted theme.
        </p>
      </header>

      <section className="card" style={{ padding: 24, background: "var(--surface-solid)" }}>
        {sorted.length === 0 ? (
          <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 14 }}>
            No journal themes extracted yet.
          </p>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                marginBottom: 12,
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: 12, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Sort:
              </span>
              <a href="?sort=users" style={sortLinkStyle("users")}>
                Users
              </a>
              <span style={{ color: "var(--ink-soft)" }}>·</span>
              <a href="?sort=avg" style={sortLinkStyle("avg")}>
                Avg weight
              </a>
              <span style={{ color: "var(--ink-soft)" }}>·</span>
              <a href="?sort=max" style={sortLinkStyle("max")}>
                Max weight
              </a>
              <span style={{ color: "var(--ink-soft)" }}>·</span>
              <a href="?sort=theme" style={sortLinkStyle("theme")}>
                Theme
              </a>
            </div>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "1px solid var(--line)",
              }}
            >
              <thead>
                <tr>
                  <th style={headerCellStyle}>Theme</th>
                  <th style={{ ...headerCellStyle, textAlign: "right" }}>Users</th>
                  <th style={{ ...headerCellStyle, textAlign: "right" }}>Avg weight</th>
                  <th style={{ ...headerCellStyle, textAlign: "right" }}>Max weight</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((b, i) => (
                  <tr
                    key={b.theme}
                    style={{
                      background: i % 2 === 1 ? "var(--surface-2)" : "transparent",
                    }}
                  >
                    <td style={cellStyle}>{b.theme}</td>
                    <td style={{ ...cellStyle, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {b.userCount}
                    </td>
                    <td style={{ ...cellStyle, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {b.avgWeight.toFixed(2)}
                    </td>
                    <td style={{ ...cellStyle, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {b.maxWeight.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>
    </main>
  );
}
