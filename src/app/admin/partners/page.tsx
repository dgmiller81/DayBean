import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { getCurrentUserIdOrNull } from "@/server/auth-context";
import { TogglePartnerActive } from "./TogglePartnerActive";

export const dynamic = "force-dynamic";

export default async function PartnersAdminPage() {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) notFound();

  const me = await db.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  if (!me?.isAdmin) notFound();

  const partners = await db.partner.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          vouchers: true,
        },
      },
    },
  });

  // Count issued vouchers per partner with a separate group-by since the Prisma
  // _count selector doesn't support filtered counts.
  const issuedRows = await db.voucher.groupBy({
    by: ["partnerId"],
    where: { issued: true },
    _count: { _all: true },
  });
  const issuedByPartner = new Map<string, number>();
  for (const row of issuedRows) issuedByPartner.set(row.partnerId, row._count._all);

  return (
    <main style={{ minHeight: "100vh", padding: "48px 24px", maxWidth: 720, margin: "0 auto" }}>
      <header style={{ marginBottom: 32 }}>
        <h1 className="serif" style={{ fontSize: 28, fontWeight: 500, margin: 0, color: "var(--ink)" }}>
          Partners
        </h1>
        <p style={{ marginTop: 4, color: "var(--ink-soft)", fontSize: 14 }}>
          Coffee partners that show up in the streak rewards modal.
        </p>
      </header>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <a
          href="/admin/partners/new"
          style={{
            background: "var(--sage)",
            color: "white",
            padding: "10px 16px",
            borderRadius: "var(--radius-sm)",
            fontWeight: 600,
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          + New partner
        </a>
      </div>

      <section className="card" style={{ padding: 24, background: "var(--surface-solid)" }}>
        <h2 style={{ fontSize: 16, margin: "0 0 12px", color: "var(--ink)" }}>
          All partners ({partners.length})
        </h2>

        {partners.length === 0 ? (
          <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 14 }}>
            No partners yet. Add one to seed the rewards pool.
          </p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
            {partners.map((p) => {
              const totalVouchers = p._count.vouchers;
              const issued = issuedByPartner.get(p.id) ?? 0;
              return (
                <li
                  key={p.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius-sm)",
                    background: p.active ? "transparent" : "var(--surface-2)",
                    opacity: p.active ? 1 : 0.7,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <a
                        href={`/admin/partners/${p.id}`}
                        style={{ color: "var(--ink)", fontSize: 14, fontWeight: 600, textDecoration: "none" }}
                      >
                        {p.name}
                      </a>
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: p.type === "chain" ? "var(--surface-2)" : "var(--sand)",
                          color: "var(--ink)",
                          border: "1px solid var(--line)",
                        }}
                      >
                        {p.type}
                      </span>
                      {!p.active && (
                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "var(--ink-soft)",
                            color: "white",
                          }}
                        >
                          archived
                        </span>
                      )}
                    </div>
                    <div style={{ color: "var(--ink-soft)", fontSize: 12, marginTop: 4 }}>
                      {p.slug}
                      {(p.city || p.state) && (
                        <>
                          {" · "}
                          {[p.city, p.state].filter(Boolean).join(", ")}
                        </>
                      )}
                      {" · "}budget {p.weeklyBudget}/wk
                    </div>
                    <div style={{ color: "var(--ink-soft)", fontSize: 12, marginTop: 2 }}>
                      Vouchers: {issued}/{totalVouchers} issued
                    </div>
                  </div>
                  <TogglePartnerActive id={p.id} active={p.active} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
