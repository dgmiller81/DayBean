"use client";

import { useActionState } from "react";
import { signInWithPasswordAction } from "@/server/actions/auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInWithPasswordAction, null);

  return (
    <form action={formAction} style={{ display: "grid", gap: 12 }}>
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Email</span>
        <input
          name="email"
          type="email"
          autoFocus
          autoComplete="username"
          required
          style={{
            padding: "10px 14px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--line)",
            background: "var(--surface-2)",
            color: "var(--ink)",
            fontSize: 14,
          }}
        />
      </label>
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          style={{
            padding: "10px 14px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--line)",
            background: "var(--surface-2)",
            color: "var(--ink)",
            fontSize: 14,
          }}
        />
      </label>
      {state?.error && (
        <p
          role="alert"
          style={{
            margin: 0,
            color: "var(--rose)",
            fontSize: 13,
          }}
        >
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        style={{
          background: "var(--sage)",
          color: "white",
          border: 0,
          padding: "10px 16px",
          borderRadius: "var(--radius-sm)",
          cursor: pending ? "default" : "pointer",
          opacity: pending ? 0.6 : 1,
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
