"use client";

import { useActionState, useEffect, useRef } from "react";
import { createUserAction } from "@/server/actions/admin";

const inputStyle = {
  padding: "10px 14px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--line)",
  background: "var(--surface-2)",
  color: "var(--ink)",
  fontSize: 14,
} as const;

export function CreateUserForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(createUserAction, null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} style={{ display: "grid", gap: 12 }}>
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Email</span>
        <input name="email" type="email" required style={inputStyle} />
      </label>
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Name (optional)</span>
        <input name="name" type="text" style={inputStyle} />
      </label>
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Password (8+ chars)</span>
        <input name="password" type="text" minLength={8} required style={inputStyle} />
      </label>
      {state?.error && (
        <p role="alert" style={{ margin: 0, color: "var(--rose)", fontSize: 13 }}>
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" style={{ margin: 0, color: "var(--sage)", fontSize: 13 }}>
          {state.ok}
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
          justifySelf: "start",
        }}
      >
        {pending ? "Creating…" : "Create user"}
      </button>
    </form>
  );
}
