"use client";

import { useTransition } from "react";
import { setPartnerActive } from "@/server/actions/admin-partners";

export function TogglePartnerActive({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        start(async () => {
          try {
            await setPartnerActive({ id, active: !active });
          } catch (e) {
            // eslint-disable-next-line no-alert
            alert(e instanceof Error ? e.message : "Could not update partner.");
          }
        });
      }}
      style={{
        background: active ? "var(--surface-2)" : "var(--sage)",
        color: active ? "var(--ink)" : "white",
        border: "1px solid var(--line)",
        padding: "6px 12px",
        borderRadius: "var(--radius-sm)",
        cursor: pending ? "default" : "pointer",
        opacity: pending ? 0.6 : 1,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {pending ? "…" : active ? "Archive" : "Reactivate"}
    </button>
  );
}
