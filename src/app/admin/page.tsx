import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { getCurrentUserIdOrNull } from "@/server/auth-context";
import { CreateUserForm } from "./CreateUserForm";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) notFound();

  const me = await db.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  if (!me?.isAdmin) notFound();

  const users = await db.user.findMany({
    orderBy: [{ isAdmin: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      email: true,
      name: true,
      isAdmin: true,
      onboardedAt: true,
      createdAt: true,
    },
  });

  return (
    <main style={{ minHeight: "100vh", padding: "48px 24px", maxWidth: 720, margin: "0 auto" }}>
      <header style={{ marginBottom: 32 }}>
        <h1 className="serif" style={{ fontSize: 28, fontWeight: 500, margin: 0, color: "var(--ink)" }}>
          Admin
        </h1>
        <p style={{ marginTop: 4, color: "var(--ink-soft)", fontSize: 14 }}>
          Manage users for this DayBeans deployment.
        </p>
      </header>

      <section
        className="card"
        style={{ padding: 24, marginBottom: 24, background: "var(--surface-solid)" }}
      >
        <h2 style={{ fontSize: 16, margin: "0 0 12px", color: "var(--ink)" }}>Add user</h2>
        <CreateUserForm />
      </section>

      <section className="card" style={{ padding: 24, background: "var(--surface-solid)" }}>
        <h2 style={{ fontSize: 16, margin: "0 0 12px", color: "var(--ink)" }}>
          Users ({users.length})
        </h2>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
          {users.map((u) => (
            <li
              key={u.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                alignItems: "center",
                padding: "10px 12px",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <div>
                <div style={{ color: "var(--ink)", fontSize: 14 }}>
                  {u.email ?? <em style={{ color: "var(--ink-soft)" }}>(no email)</em>}{" "}
                  {u.name && <span style={{ color: "var(--ink-soft)" }}>· {u.name}</span>}
                </div>
                <div style={{ color: "var(--ink-soft)", fontSize: 12 }}>
                  Joined {u.createdAt.toISOString().slice(0, 10)}
                  {u.onboardedAt ? " · onboarded" : " · onboarding pending"}
                </div>
              </div>
              {u.isAdmin && (
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "var(--sage)",
                    color: "white",
                  }}
                >
                  admin
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
