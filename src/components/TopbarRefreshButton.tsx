"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshTodayAction } from "@/server/actions/refresh";

type Props = {
  /** True when env override OR a DB credential exists. Disables the button when false. */
  llmConfigured: boolean;
  /** Most recent log status, used for the dot color. */
  lastStatus: "ok" | "failed" | "none";
};

export function TopbarRefreshButton({ llmConfigured, lastStatus }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState<string | null>(null);

  const onClick = () => {
    if (pending || !llmConfigured) return;
    setFlash(null);
    startTransition(async () => {
      const r = await refreshTodayAction();
      if (r.ok) {
        setFlash("Refreshed");
        router.refresh();
      } else {
        const msg =
          r.code === "no-credential"
            ? "No LLM configured"
            : r.code === "validation-error"
              ? "Validation failed"
              : "Provider error";
        setFlash(msg);
        router.refresh();
      }
      setTimeout(() => setFlash(null), 3000);
    });
  };

  const dotColor =
    !llmConfigured ? "var(--ink-muted)"
    : lastStatus === "ok" ? "var(--sage)"
    : lastStatus === "failed" ? "var(--rose)"
    : "var(--gold)";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!llmConfigured || pending}
      title={
        !llmConfigured
          ? "Set OPENAI_API_KEY in .env or add a credential in Settings"
          : pending
            ? "Refreshing — this can take 10–30 seconds"
            : "Generate today's content via your configured LLM"
      }
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        height: 38,
        padding: "0 14px",
        border: "1px solid var(--line)",
        background: "var(--surface)",
        backdropFilter: "blur(20px)",
        color: "var(--ink-soft)",
        borderRadius: 12,
        cursor: !llmConfigured || pending ? "not-allowed" : "pointer",
        opacity: !llmConfigured ? 0.6 : 1,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: ".04em",
        transition: "all .15s ease",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: dotColor,
          flexShrink: 0,
        }}
      />
      <span>{pending ? "Refreshing…" : flash ?? "Refresh"}</span>
      {pending && (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          style={{ animation: "spin 1.2s linear infinite" }}
        >
          <path d="M21 12a9 9 0 1 1-3-6.7" />
          <polyline points="21 4 21 10 15 10" />
        </svg>
      )}
    </button>
  );
}
