"use client";
import { useEffect, useState } from "react";
import type { SettingsSummary } from "@/server/actions/settings";
import { ProfileTab } from "./ProfileTab";
import { LlmTab } from "./LlmTab";
import { JobInterestsTab } from "./JobInterestsTab";

type Tab = "profile" | "llm" | "context";

export function SettingsModal({
  initial,
  open,
  onClose,
}: {
  initial: SettingsSummary;
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("llm");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

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
        aria-labelledby="settings-title"
        style={{
          position: "fixed", left: "50%", top: "50%",
          transform: "translate(-50%,-50%)",
          width: "min(720px, 92vw)", maxHeight: "86vh",
          background: "var(--surface-solid)",
          border: "1px solid var(--line-strong)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow-md)",
          padding: 0,
          display: "grid", gridTemplateRows: "auto auto 1fr", gap: 0,
          zIndex: 91,
          overflow: "hidden",
        }}
      >
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid var(--line)",
        }}>
          <h2 id="settings-title" className="serif" style={{ margin: 0, fontSize: "1.25rem" }}>
            Settings
          </h2>
          <button
            type="button" onClick={onClose} aria-label="Close"
            style={{ background: "transparent", border: 0, fontSize: 22, cursor: "pointer", color: "var(--ink-muted)" }}
          >×</button>
        </header>

        <div role="tablist" style={{
          display: "flex", gap: 4, padding: "8px 12px",
          borderBottom: "1px solid var(--line)", background: "var(--surface-2)",
        }}>
          {([
            { id: "llm", label: "LLM Provider" },
            { id: "profile", label: "Profile" },
            { id: "context", label: "Job & Interests" },
          ] as const).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "8px 14px",
                border: "1px solid transparent",
                borderRadius: 999,
                background: tab === t.id ? "var(--sage)" : "transparent",
                color: tab === t.id ? "white" : "var(--ink-soft)",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
              }}
            >{t.label}</button>
          ))}
        </div>

        <div style={{ padding: 20, overflowY: "auto" }}>
          {tab === "llm" && <LlmTab initial={initial.credentials} envOverride={initial.envOverride} />}
          {tab === "profile" && <ProfileTab initial={{ name: initial.name, bio: initial.bio }} />}
          {tab === "context" && <JobInterestsTab initial={{ jobTitle: initial.jobTitle, contentInterests: initial.contentInterests, refreshHour: initial.refreshHour }} />}
        </div>
      </div>
    </>
  );
}
