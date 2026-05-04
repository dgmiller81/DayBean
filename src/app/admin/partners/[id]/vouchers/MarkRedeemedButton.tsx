"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markVoucherRedeemed } from "@/server/actions/admin-partners";

export function MarkRedeemedButton({ voucherId }: { voucherId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      try {
        await markVoucherRedeemed(voucherId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not mark redeemed.");
      }
    });
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        style={{
          background: "transparent",
          color: "var(--ink)",
          border: "1px solid var(--line)",
          padding: "4px 10px",
          borderRadius: "var(--radius-sm)",
          cursor: pending ? "default" : "pointer",
          opacity: pending ? 0.6 : 1,
          fontSize: 12,
        }}
      >
        {pending ? "…" : "Mark redeemed"}
      </button>
      {error && (
        <span role="alert" style={{ color: "var(--rose)", fontSize: 11 }}>
          {error}
        </span>
      )}
    </span>
  );
}
