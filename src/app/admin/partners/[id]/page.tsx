import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { getCurrentUserIdOrNull } from "@/server/auth-context";
import { EditPartnerForm } from "./EditPartnerForm";

export const dynamic = "force-dynamic";

/** Monday-aligned start-of-week (UTC) for the given date. */
function startOfWeekMonday(d: Date): Date {
  const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = out.getUTCDay(); // 0 = Sun
  const offset = (dow + 6) % 7; // days since Monday
  out.setUTCDate(out.getUTCDate() - offset);
  return out;
}

export default async function PartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) notFound();

  const me = await db.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  if (!me?.isAdmin) notFound();

  const { id } = await params;
  const partner = await db.partner.findUnique({ where: { id } });
  if (!partner) notFound();

  const now = new Date();
  const weekStart = startOfWeekMonday(now);

  const [thisWeekCount, issuedCount, redeemedCount, expiredCount] = await Promise.all([
    db.voucher.count({ where: { partnerId: id, weekOf: weekStart } }),
    db.voucher.count({ where: { partnerId: id, issued: true } }),
    db.voucher.count({ where: { partnerId: id, redeemedAt: { not: null } } }),
    db.voucher.count({
      where: {
        partnerId: id,
        expiresAt: { lt: now },
        redeemedAt: null,
      },
    }),
  ]);

  const statCellStyle: React.CSSProperties = {
    padding: "12px 14px",
    border: "1px solid var(--line)",
    borderRadius: "var(--radius-sm)",
    background: "var(--surface-2)",
  };

  return (
    <main style={{ minHeight: "100vh", padding: "48px 24px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ marginBottom: 16 }}>
        <a
          href="/admin/partners"
          style={{ color: "var(--ink-soft)", fontSize: 13, textDecoration: "none" }}
        >
          ← All partners
        </a>
      </div>

      <header style={{ marginBottom: 32 }}>
        <h1 className="serif" style={{ fontSize: 28, fontWeight: 500, margin: 0, color: "var(--ink)" }}>
          {partner.name}
        </h1>
        <p style={{ marginTop: 4, color: "var(--ink-soft)", fontSize: 14 }}>
          {partner.slug} · {partner.type}
          {!partner.active && " · archived"}
        </p>
      </header>

      <section
        className="card"
        style={{ padding: 24, marginBottom: 24, background: "var(--surface-solid)" }}
      >
        <h2 style={{ fontSize: 16, margin: "0 0 12px", color: "var(--ink)" }}>Edit details</h2>
        <EditPartnerForm
          partner={{
            id: partner.id,
            name: partner.name,
            slug: partner.slug,
            type: partner.type as "chain" | "indie",
            city: partner.city,
            state: partner.state,
            logoUrl: partner.logoUrl,
            blurb: partner.blurb,
            weeklyBudget: partner.weeklyBudget,
            active: partner.active,
          }}
        />
      </section>

      <section className="card" style={{ padding: 24, background: "var(--surface-solid)" }}>
        <h2 style={{ fontSize: 16, margin: "0 0 12px", color: "var(--ink)" }}>Voucher pool</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12,
          }}
        >
          <div style={statCellStyle}>
            <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>This week</div>
            <div style={{ fontSize: 22, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
              {thisWeekCount}
            </div>
          </div>
          <div style={statCellStyle}>
            <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>Issued</div>
            <div style={{ fontSize: 22, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
              {issuedCount}
            </div>
          </div>
          <div style={statCellStyle}>
            <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>Redeemed</div>
            <div style={{ fontSize: 22, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
              {redeemedCount}
            </div>
          </div>
          <div style={statCellStyle}>
            <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>Expired</div>
            <div style={{ fontSize: 22, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
              {expiredCount}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
