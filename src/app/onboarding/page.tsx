import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { getCurrentUserIdOrNull } from "@/server/auth-context";
import { FirstPour } from "./FirstPour";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, onboardedAt: true },
  });
  if (user?.onboardedAt) redirect("/");

  return (
    <main style={{ minHeight: "100vh", padding: "48px 24px", maxWidth: 720, margin: "0 auto" }}>
      <header style={{ marginBottom: 24, textAlign: "center" }}>
        <h1 className="serif" style={{ fontSize: 32, fontWeight: 500, margin: 0, color: "var(--ink)" }}>
          Your First Pour
        </h1>
        <p style={{ marginTop: 8, color: "var(--ink-soft)", fontSize: 14 }}>
          A few questions so we can pour you a morning that fits.
        </p>
      </header>
      <FirstPour />
    </main>
  );
}
