"use client";

import { useState, useTransition } from "react";
import type { DailyContent } from "@/types/daily-content";
import { saveDailyContentAction } from "@/server/actions/daily-content";
import { refreshTodayAction } from "@/server/actions/refresh";

type RefreshHistory = {
  source: "manual" | "cron" | "cold-start";
  status: string;
  errorCode: string | null;
  errorDetail: string | null;
  startedAt: string;
  finishedAt: string | null;
};

type Props = {
  iso: string;
  initialContent: DailyContent;
  latestRefresh: RefreshHistory | null;
  open: boolean;
  onClose: () => void;
};

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const min = Math.round(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const d = Math.round(hr / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export function HandEditModal({ iso, initialContent, latestRefresh, open, onClose }: Props) {
  const [text, setText] = useState(() => JSON.stringify(initialContent, null, 2));
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  const onSave = () => {
    setError(null);
    setSavedAt(null);
    startTransition(async () => {
      const r = await saveDailyContentAction(iso, text);
      if (r.ok) {
        const t = new Date().toLocaleTimeString();
        setSavedAt(t);
        setTimeout(() => onClose(), 600);
      } else {
        setError(r.error);
      }
    });
  };

  const onRefresh = () => {
    setError(null);
    setSavedAt(null);
    startTransition(async () => {
      const r = await refreshTodayAction();
      if (r.ok) {
        const t = new Date().toLocaleTimeString();
        setSavedAt(`Refreshed via LLM · ${t}`);
        setTimeout(() => onClose(), 800);
      } else {
        switch (r.code) {
          case "no-credential":
            setError("(refresh): no LLM provider configured. Open Settings → LLM Provider.");
            break;
          case "validation-error":
            setError(`(refresh, validation-error): ${r.message}`);
            break;
          case "provider-error":
            setError(`(refresh, provider-error): ${r.message}`);
            break;
        }
      }
    });
  };

  // Render the persisted last-refresh status (separate from in-flight error/savedAt above)
  const renderHistory = () => {
    if (!latestRefresh) return null;
    const isOk = latestRefresh.status === "ok";
    const when = relativeTime(latestRefresh.startedAt);
    return (
      <div
        style={{
          padding: 10,
          background: isOk ? "var(--sage-soft)" : "rgba(201,123,110,0.10)",
          border: `1px solid ${isOk ? "var(--sage)" : "rgba(201,123,110,0.35)"}`,
          borderRadius: "var(--radius-sm)",
          fontSize: 12,
          color: isOk ? "var(--sage-deep)" : "var(--rose)",
          lineHeight: 1.5,
        }}
      >
        <strong>Last refresh:</strong>{" "}
        {isOk ? "succeeded" : `failed (${latestRefresh.errorCode ?? latestRefresh.status})`}{" "}
        — {when} · source: {latestRefresh.source}
        {!isOk && latestRefresh.errorDetail && (
          <div
            style={{
              marginTop: 6,
              fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
              fontSize: 11,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {latestRefresh.errorDetail}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(20,15,5,.6)",
          backdropFilter: "blur(2px)", zIndex: 90,
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hand-edit-title"
        onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
        style={{
          position: "fixed", left: "50%", top: "50%",
          transform: "translate(-50%,-50%)",
          width: "min(900px, 92vw)", maxHeight: "86vh",
          background: "var(--surface-solid)",
          border: "1px solid var(--line-strong)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow-md)",
          padding: 20,
          display: "grid", gridTemplateRows: "auto auto 1fr auto auto", gap: 12,
          zIndex: 91,
        }}
      >
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 id="hand-edit-title" className="serif" style={{ margin: 0, fontSize: "1.25rem" }}>
            Edit today's content
          </h2>
          <button
            type="button" onClick={onClose} aria-label="Close"
            style={{ background: "transparent", border: 0, fontSize: 22, cursor: "pointer", color: "var(--ink-muted)" }}
          >×</button>
        </header>

        {renderHistory()}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          style={{
            width: "100%", height: "100%", minHeight: 320,
            fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
            fontSize: 13, lineHeight: 1.5,
            padding: 12,
            background: "var(--surface-2)",
            color: "var(--ink)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
            resize: "vertical",
          }}
        />

        {error && (
          <div role="alert"
            style={{
              padding: 10,
              background: "rgba(201,123,110,0.10)",
              color: "var(--rose)",
              border: "1px solid rgba(201,123,110,0.35)",
              borderRadius: "var(--radius-sm)",
              fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
              fontSize: 12,
              whiteSpace: "pre-wrap",
            }}
          >{error}</div>
        )}

        <footer style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={{ color: "var(--ink-muted)", fontSize: 13 }}>
            {savedAt ? `Saved · ${savedAt}` : "Edit the JSON, then Save."}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button" onClick={onRefresh} disabled={pending}
              title="Generate via configured LLM"
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid var(--gold)",
                background: "var(--gold-soft)",
                color: "var(--gold)",
                cursor: pending ? "wait" : "pointer",
                opacity: pending ? 0.7 : 1,
                fontWeight: 600,
              }}
            >Refresh today's content</button>
            <button
              type="button" onClick={onSave} disabled={pending}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: 0,
                background: "var(--sage)",
                color: "white",
                cursor: pending ? "wait" : "pointer",
                opacity: pending ? 0.7 : 1,
              }}
            >{pending ? "Saving…" : "Save"}</button>
          </div>
        </footer>
      </div>
    </>
  );
}
