import { redirect } from "next/navigation";
import { readEnv } from "@/server/env";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const env = readEnv();
  if (env.AUTH_MODE === "none") {
    redirect("/");
  }
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
      }}
    >
      <div
        className="card"
        style={{
          width: "min(420px, 100%)",
          padding: 32,
          background: "var(--surface-solid)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 className="serif" style={{ fontSize: 28, fontWeight: 500, margin: 0, color: "var(--ink)" }}>
            DayBeans
          </h1>
          <p style={{ marginTop: 8, color: "var(--ink-soft)", fontSize: 14 }}>
            Enter your password to continue.
          </p>
        </div>
        <LoginForm />
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <a
            href="/privacy"
            style={{
              color: "var(--ink-muted)",
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            Privacy
          </a>
        </div>
      </div>
    </main>
  );
}
