import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { getCurrentUserIdOrNull } from "@/server/auth-context";
import { BulkAddVouchersForm } from "./BulkAddVouchersForm";
import { MarkRedeemedButton } from "./MarkRedeemedButton";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

type VoucherSort = "expiresAt" | "issued" | "redeemedAt";

function parseSort(value: string | undefined): VoucherSort {
  if (value === "issued" || value === "redeemedAt") return value;
  return "expiresAt";
}

function parsePage(value: string | undefined): number {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return 1;
  return n;
}

function statusOf(v: {
  issued: boolean;
  redeemedAt: Date | null;
  expiresAt: Date;
}): "in pool" | "issued" | "redeemed" | "expired" {
  if (v.redeemedAt) return "redeemed";
  if (v.expiresAt.getTime() < Date.now()) return "expired";
  if (v.issued) return "issued";
  return "in pool";
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toISOString().slice(0, 10);
}

function maskUser(userId: string | null | undefined): string {
  if (!userId) return "—";
  return `${userId.slice(0, 8)}…`;
}

export default async function PartnerVouchersPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
}) {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) notFound();

  const me = await db.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  if (!me?.isAdmin) notFound();

  const { id } = await params;
  const sp = await searchParams;
  const sort = parseSort(sp.sort);
  const page = parsePage(sp.page);

  const partner = await db.partner.findUnique({ where: { id } });
  if (!partner) notFound();

  const orderBy: Prisma.VoucherOrderByWithRelationInput =
    sort === "issued"
      ? { issued: "desc" }
      : sort === "redeemedAt"
        ? { redeemedAt: "desc" }
        : { expiresAt: "asc" };

  const total = await db.voucher.count({ where: { partnerId: id } });
  const vouchers = await db.voucher.findMany({
    where: { partnerId: id },
    orderBy: [orderBy, { code: "asc" }],
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
    select: {
      id: true,
      code: true,
      issued: true,
      userId: true,
      // Vouchers carry a single timestamp for assignment via the implicit
      // "issued at" — we use createdAt-ish semantics via weekOf+issued, but
      // the schema doesn't store an explicit issuedAt. Show weekOf as the
      // closest proxy until that field is added.
      weekOf: true,
      redeemedAt: true,
      expiresAt: true,
    },
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const cellStyle: React.CSSProperties = {
    padding: "8px 10px",
    borderBottom: "1px solid var(--line)",
    fontSize: 13,
    color: "var(--ink)",
    verticalAlign: "middle",
  };
  const headStyle: React.CSSProperties = {
    ...cellStyle,
    color: "var(--ink-soft)",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    textAlign: "left",
  };

  function sortLink(s: VoucherSort, label: string) {
    const active = s === sort;
    const href = `/admin/partners/${id}/vouchers?sort=${s}`;
    return (
      <a
        href={href}
        style={{
          color: active ? "var(--ink)" : "var(--ink-soft)",
          textDecoration: active ? "underline" : "none",
        }}
      >
        {label}
      </a>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "48px 24px",
        maxWidth: 960,
        margin: "0 auto",
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <a
          href={`/admin/partners/${id}`}
          style={{ color: "var(--ink-soft)", fontSize: 13, textDecoration: "none" }}
        >
          ← {partner.name}
        </a>
      </div>

      <header style={{ marginBottom: 32 }}>
        <h1
          className="serif"
          style={{ fontSize: 28, fontWeight: 500, margin: 0, color: "var(--ink)" }}
        >
          Vouchers · {partner.name}
        </h1>
        <p style={{ marginTop: 4, color: "var(--ink-soft)", fontSize: 14 }}>
          {partner.slug}
        </p>
      </header>

      <section
        className="card"
        style={{ padding: 24, marginBottom: 24, background: "var(--surface-solid)" }}
      >
        <h2 style={{ fontSize: 16, margin: "0 0 12px", color: "var(--ink)" }}>
          Bulk-add codes
        </h2>
        <BulkAddVouchersForm partnerId={partner.id} />
      </section>

      <section
        className="card"
        style={{ padding: 24, background: "var(--surface-solid)" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 12,
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <h2 style={{ fontSize: 16, margin: 0, color: "var(--ink)" }}>
            Vouchers ({total.toLocaleString()})
          </h2>
          <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
            Sort: {sortLink("expiresAt", "expires")}
            {" · "}
            {sortLink("issued", "issued")}
            {" · "}
            {sortLink("redeemedAt", "redeemed")}
          </div>
        </div>

        {vouchers.length === 0 ? (
          <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 14 }}>
            No vouchers yet. Use the form above to seed the pool.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <thead>
                <tr>
                  <th style={headStyle}>Code</th>
                  <th style={headStyle}>Status</th>
                  <th style={headStyle}>User</th>
                  <th style={headStyle}>Issued (week of)</th>
                  <th style={headStyle}>Redeemed</th>
                  <th style={headStyle}>Expires</th>
                  <th style={headStyle}></th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((v) => {
                  const status = statusOf(v);
                  const canRedeem =
                    v.issued && !v.redeemedAt && status !== "expired";
                  return (
                    <tr key={v.id}>
                      <td
                        style={{
                          ...cellStyle,
                          fontFamily:
                            'ui-monospace, SFMono-Regular, Menlo, Monaco, "Courier New", monospace',
                        }}
                      >
                        {v.code}
                      </td>
                      <td style={cellStyle}>{status}</td>
                      <td
                        style={{
                          ...cellStyle,
                          fontFamily:
                            'ui-monospace, SFMono-Regular, Menlo, Monaco, "Courier New", monospace',
                          color: "var(--ink-soft)",
                        }}
                      >
                        {maskUser(v.userId)}
                      </td>
                      <td style={cellStyle}>
                        {v.issued ? fmtDate(v.weekOf) : "—"}
                      </td>
                      <td style={cellStyle}>{fmtDate(v.redeemedAt)}</td>
                      <td style={cellStyle}>{fmtDate(v.expiresAt)}</td>
                      <td style={{ ...cellStyle, textAlign: "right" }}>
                        {canRedeem && <MarkRedeemedButton voucherId={v.id} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 16,
              fontSize: 13,
              color: "var(--ink-soft)",
            }}
          >
            <div>
              Page {page} of {totalPages}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              {page > 1 && (
                <a
                  href={`/admin/partners/${id}/vouchers?page=${page - 1}&sort=${sort}`}
                  style={{ color: "var(--ink)" }}
                >
                  ← Prev
                </a>
              )}
              {page < totalPages && (
                <a
                  href={`/admin/partners/${id}/vouchers?page=${page + 1}&sort=${sort}`}
                  style={{ color: "var(--ink)" }}
                >
                  Next →
                </a>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
