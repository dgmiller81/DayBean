import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { getCurrentUserIdOrNull } from "@/server/auth-context";
import { NewPartnerForm } from "./NewPartnerForm";

export const dynamic = "force-dynamic";

export default async function NewPartnerPage() {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) notFound();

  const me = await db.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  if (!me?.isAdmin) notFound();

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
          New partner
        </h1>
        <p style={{ marginTop: 4, color: "var(--ink-soft)", fontSize: 14 }}>
          Add a coffee partner that streak-rewarded users can pick from.
        </p>
      </header>

      <section className="card" style={{ padding: 24, background: "var(--surface-solid)" }}>
        <NewPartnerForm />
      </section>
    </main>
  );
}
