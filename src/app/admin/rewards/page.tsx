import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { getCurrentUserIdOrNull } from "@/server/auth-context";

export const dynamic = "force-dynamic";

type SortKey = "issued" | "redeemed" | "rate" | "pool";

type PartnerRow = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  issued: number;
  redeemed: number;
  rate: number; // 0..1
  pool: number;
};

type StateRow = {
  state: string;
  redeemed: number;
};

function parseSort(raw: string | undefined): SortKey {
  if (raw === "redeemed" || raw === "rate" || raw === "pool") return raw;
  return "issued";
}

function sortPartners(rows: PartnerRow[], sort: SortKey): PartnerRow[] {
  const copy = [...rows];
  switch (sort) {
    case "redeemed":
      copy.sort((a, b) => b.redeemed - a.redeemed);
      break;
    case "rate":
      copy.sort((a, b) => b.rate - a.rate);
      break;
    case "pool":
      copy.sort((a, b) => b.pool - a.pool);
      break;
    case "issued":
    default:
      copy.sort((a, b) => b.issued - a.issued);
      break;
  }
  return copy;
}

function pct(num: number, denom: number): string {
  if (denom <= 0) return "—";
  return `${((num / denom) * 100).toFixed(1)}%`;
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

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Headline numbers
  const [
    totalIssued,
    totalRedeemed,
    poolSize,
    totalVouchersAll,
    recentClaimCount,
  ] = await Promise.all([
    db.voucher.count({ where: { issued: true } }),
    db.voucher.count({ where: { redeemedAt: { not: null } } }),
    db.voucher.count({
      where: { issued: false, expiresAt: { gt: now } },
    }),
    db.voucher.count(),
    db.rewardClaim.count({ where: { claimedAt: { gte: sevenDaysAgo } } }),
  ]);

  const empty = totalVouchersAll === 0;

  // By partner
  const partners = await db.partner.findMany({
    where: { active: true },
    select: { id: true, name: true, city: true, state: true },
  });

  const [issuedGroups, redeemedGroups, poolGroups] = await Promise.all([
    db.voucher.groupBy({
      by: ["partnerId"],
      where: { issued: true },
      _count: { _all: true },
    }),
    db.voucher.groupBy({
      by: ["partnerId"],
      where: { redeemedAt: { not: null } },
      _count: { _all: true },
    }),
    db.voucher.groupBy({
      by: ["partnerId"],
      where: { issued: false, expiresAt: { gt: now } },
      _count: { _all: true },
    }),
  ]);

  const issuedByPartner = new Map<string, number>();
  for (const g of issuedGroups) issuedByPartner.set(g.partnerId, g._count._all);
  const redeemedByPartner = new Map<string, number>();
  for (const g of redeemedGroups) redeemedByPartner.set(g.partnerId, g._count._all);
  const poolByPartner = new Map<string, number>();
  for (const g of poolGroups) poolByPartner.set(g.partnerId, g._count._all);

  const partnerRows: PartnerRow[] = partners.map((p) => {
    const issued = issuedByPartner.get(p.id) ?? 0;
    const redeemed = redeemedByPartner.get(p.id) ?? 0;
    return {
      id: p.id,
      name: p.name,
      city: p.city,
      state: p.state,
      issued,
      redeemed,
      rate: issued > 0 ? redeemed / issued : 0,
      pool: poolByPartner.get(p.id) ?? 0,
    };
  });

  const sortedPartners = sortPartners(partnerRows, sort);

  // By state — in-memory bucketing of redeemed vouchers joined with partner.state.
  // Voucher volume is low for v1; if this gets noisy, swap to db.$queryRaw.
  const redeemedVouchers = await db.voucher.findMany({
    where: { redeemedAt: { not: null } },
    select: { partner: { select: { state: true } } },
  });

  const stateCounts = new Map<string, number>();
  for (const v of redeemedVouchers) {
    const s = v.partner.state;
    if (!s) continue;
    stateCounts.set(s, (stateCounts.get(s) ?? 0) + 1);
  }
  const stateRows: StateRow[] = Array.from(stateCounts.entries())
    .map(([state, redeemed]) => ({ state, redeemed }))
    .sort((a, b) => b.redeemed - a.redeemed)
    .slice(0, 10);

  // Styles
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

  const statCardStyle: React.CSSProperties = {
    background: "var(--surface-2)",
    padding: "16px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--line)",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  };

  const statNumberStyle: React.CSSProperties = {
    fontSize: 24,
    fontWeight: 600,
    color: "var(--ink)",
    fontVariantNumeric: "tabular-nums",
  };

  const statLabelStyle: React.CSSProperties = {
    fontSize: 12,
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
          Rewards
        </h1>
        <p style={{ marginTop: 4, color: "var(--ink-soft)", fontSize: 14 }}>
          Anonymized aggregate. We never display individual users.
        </p>
      </header>

      {empty ? (
        <section className="card" style={{ padding: 24, background: "var(--surface-solid)" }}>
          <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 14 }}>
            No reward activity yet.{" "}
            <a href="/admin/partners" style={{ color: "var(--ink)" }}>
              Add partners
            </a>{" "}
            to seed the rewards pool.
          </p>
        </section>
      ) : (
        <>
          {/* 1. Headline numbers */}
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <div style={statCardStyle}>
              <div style={statNumberStyle}>{totalIssued}</div>
              <div style={statLabelStyle}>Issued (lifetime)</div>
            </div>
            <div style={statCardStyle}>
              <div style={statNumberStyle}>{totalRedeemed}</div>
              <div style={statLabelStyle}>Redeemed</div>
            </div>
            <div style={statCardStyle}>
              <div style={statNumberStyle}>{pct(totalRedeemed, totalIssued)}</div>
              <div style={statLabelStyle}>Redemption rate</div>
            </div>
            <div style={statCardStyle}>
              <div style={statNumberStyle}>{poolSize}</div>
              <div style={statLabelStyle}>In pool now</div>
            </div>
          </section>

          {/* 2. By partner */}
          <section
            className="card"
            style={{ padding: 24, marginBottom: 24, background: "var(--surface-solid)" }}
          >
            <h2 style={{ fontSize: 16, margin: "0 0 12px", color: "var(--ink)" }}>By partner</h2>

            {partnerRows.length === 0 ? (
              <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 14 }}>
                No active partners yet.
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
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--ink-soft)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Sort:
                  </span>
                  <a href="?sort=issued" style={sortLinkStyle("issued")}>
                    Issued
                  </a>
                  <span style={{ color: "var(--ink-soft)" }}>·</span>
                  <a href="?sort=redeemed" style={sortLinkStyle("redeemed")}>
                    Redeemed
                  </a>
                  <span style={{ color: "var(--ink-soft)" }}>·</span>
                  <a href="?sort=rate" style={sortLinkStyle("rate")}>
                    Rate
                  </a>
                  <span style={{ color: "var(--ink-soft)" }}>·</span>
                  <a href="?sort=pool" style={sortLinkStyle("pool")}>
                    Pool
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
                      <th style={headerCellStyle}>Partner</th>
                      <th style={{ ...headerCellStyle, textAlign: "right" }}>Issued</th>
                      <th style={{ ...headerCellStyle, textAlign: "right" }}>Redeemed</th>
                      <th style={{ ...headerCellStyle, textAlign: "right" }}>Rate</th>
                      <th style={{ ...headerCellStyle, textAlign: "right" }}>Pool</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPartners.map((p, i) => {
                      const loc = [p.city, p.state].filter(Boolean).join(", ");
                      return (
                        <tr
                          key={p.id}
                          style={{
                            background: i % 2 === 1 ? "var(--surface-2)" : "transparent",
                          }}
                        >
                          <td style={cellStyle}>
                            <div style={{ color: "var(--ink)" }}>{p.name}</div>
                            {loc && (
                              <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{loc}</div>
                            )}
                          </td>
                          <td
                            style={{
                              ...cellStyle,
                              textAlign: "right",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {p.issued}
                          </td>
                          <td
                            style={{
                              ...cellStyle,
                              textAlign: "right",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {p.redeemed}
                          </td>
                          <td
                            style={{
                              ...cellStyle,
                              textAlign: "right",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {pct(p.redeemed, p.issued)}
                          </td>
                          <td
                            style={{
                              ...cellStyle,
                              textAlign: "right",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {p.pool}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </section>

          {/* 3. By state */}
          <section
            className="card"
            style={{ padding: 24, marginBottom: 24, background: "var(--surface-solid)" }}
          >
            <h2 style={{ fontSize: 16, margin: "0 0 4px", color: "var(--ink)" }}>By state</h2>
            <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--ink-soft)" }}>
              Top 10 states by redemptions. State-level only — never per-city.
            </p>

            {stateRows.length === 0 ? (
              <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 14 }}>
                No redemptions with state-tagged partners yet.
              </p>
            ) : (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  border: "1px solid var(--line)",
                }}
              >
                <thead>
                  <tr>
                    <th style={headerCellStyle}>State</th>
                    <th style={{ ...headerCellStyle, textAlign: "right" }}>Redemptions</th>
                  </tr>
                </thead>
                <tbody>
                  {stateRows.map((r, i) => (
                    <tr
                      key={r.state}
                      style={{
                        background: i % 2 === 1 ? "var(--surface-2)" : "transparent",
                      }}
                    >
                      <td style={cellStyle}>{r.state}</td>
                      <td
                        style={{
                          ...cellStyle,
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {r.redeemed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* 4. Email send health */}
          <section className="card" style={{ padding: 24, background: "var(--surface-solid)" }}>
            <h2 style={{ fontSize: 16, margin: "0 0 12px", color: "var(--ink)" }}>
              Email send health
            </h2>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={{ ...statNumberStyle, fontSize: 20 }}>{recentClaimCount}</span>
              <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>
                voucher emails (proxy: RewardClaim count) in the last 7 days
              </span>
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--ink-soft)" }}>
              Send-failure tracking lands in a future PR.
            </p>
          </section>
        </>
      )}
    </main>
  );
}
