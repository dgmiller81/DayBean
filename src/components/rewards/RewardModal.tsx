"use client";
// S5-T04 — The reward claim modal. Lists this week's available roasters,
// runs the claim server action, and shows the voucher on success.
// Pattern mirrors SettingsModal (backdrop + Escape handler) but skinnier.
import { useEffect, useState } from "react";
import {
  availablePartners,
  claimReward,
} from "@/server/actions/rewards";
import type { Partner, VoucherForUser } from "@/types";

type Phase =
  | { kind: "loading" }
  | { kind: "pickPartner"; partners: Partner[] }
  | { kind: "claiming"; partners: Partner[]; partnerId: string }
  | { kind: "success"; voucher: VoucherForUser }
  | { kind: "error"; message: string; partners: Partner[] };

function relativeExpires(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return "expired";
  const days = Math.round(ms / (24 * 60 * 60 * 1000));
  if (days < 1) return "expires today";
  if (days === 1) return "expires tomorrow";
  if (days < 14) return `expires in ${days} days`;
  const weeks = Math.round(days / 7);
  return `expires in ${weeks} week${weeks === 1 ? "" : "s"}`;
}

export function RewardModal({
  open,
  onClose,
  streakLength,
}: {
  open: boolean;
  onClose: () => void;
  streakLength: number;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [copied, setCopied] = useState(false);

  // Load partners on open.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setPhase({ kind: "loading" });
    availablePartners()
      .then((partners) => {
        if (!alive) return;
        setPhase({ kind: "pickPartner", partners });
      })
      .catch((e: unknown) => {
        if (!alive) return;
        const message = e instanceof Error ? e.message : "Couldn't load roasters.";
        setPhase({ kind: "error", message, partners: [] });
      });
    return () => {
      alive = false;
    };
  }, [open]);

  // Escape closes (mirrors SettingsModal).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const onPick = async (partnerId: string) => {
    if (phase.kind !== "pickPartner") return;
    const partners = phase.partners;
    setPhase({ kind: "claiming", partners, partnerId });
    try {
      const voucher = await claimReward({ partnerId });
      setPhase({ kind: "success", voucher });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Something went wrong.";
      setPhase({ kind: "error", message, partners });
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard not available — ignore */
    }
  };

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(20,15,5,.6)",
          backdropFilter: "blur(2px)",
          zIndex: 90,
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Streak reward"
        style={{
          position: "fixed",
          left: "50%",
          top: "50%",
          transform: "translate(-50%,-50%)",
          width: "min(480px, 92vw)",
          maxHeight: "80vh",
          background: "var(--surface-solid)",
          color: "var(--ink)",
          border: "1px solid var(--line-strong)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow-md)",
          padding: 0,
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          zIndex: 91,
          overflow: "hidden",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: "20px 22px 12px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div>
            <h2
              className="serif"
              style={{ margin: 0, fontSize: "1.25rem", lineHeight: 1.25 }}
            >
              {phase.kind === "success"
                ? "Cup on the counter."
                : `You've brewed for ${streakLength} days.`}
            </h2>
            <div style={{ marginTop: 6, fontSize: 13, color: "var(--ink-soft)" }}>
              {phase.kind === "success"
                ? "Code in your inbox."
                : "Pick a roaster to thank yourself."}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: 0,
              fontSize: 22,
              cursor: "pointer",
              color: "var(--ink-muted)",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </header>

        <div style={{ padding: "16px 22px", overflowY: "auto" }}>
          {phase.kind === "loading" && (
            <div style={{ color: "var(--ink-soft)", fontSize: 14 }}>
              Pouring the menu...
            </div>
          )}

          {phase.kind === "pickPartner" && phase.partners.length === 0 && (
            <div style={{ color: "var(--ink-soft)", fontSize: 14 }}>
              No roasters available this week. Check back next week.
            </div>
          )}

          {(phase.kind === "pickPartner" || phase.kind === "claiming") &&
            phase.partners.length > 0 && (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
                {phase.partners.map((p) => {
                  const claiming = phase.kind === "claiming";
                  const isThisOne = phase.kind === "claiming" && phase.partnerId === p.id;
                  return (
                    <li
                      key={p.id}
                      style={{
                        border: "1px solid var(--line)",
                        borderRadius: "calc(var(--radius) - 4px)",
                        padding: 14,
                        background: "var(--surface-2)",
                        display: "grid",
                        gap: 6,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="serif" style={{ fontSize: "1.05rem", fontWeight: 600 }}>
                          {p.name}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 999,
                            border: "1px solid var(--line-strong)",
                            color: "var(--ink-soft)",
                            textTransform: "lowercase",
                          }}
                        >
                          {p.type}
                        </span>
                      </div>
                      {(p.city || p.state) && (
                        <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                          {[p.city, p.state].filter(Boolean).join(", ")}
                        </div>
                      )}
                      {p.blurb && (
                        <div style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.4 }}>
                          {p.blurb}
                        </div>
                      )}
                      <div style={{ marginTop: 4 }}>
                        <button
                          type="button"
                          onClick={() => onPick(p.id)}
                          disabled={claiming}
                          style={{
                            padding: "6px 14px",
                            borderRadius: 8,
                            border: "1px solid var(--sage-deep)",
                            background: isThisOne ? "var(--sage-soft)" : "var(--sage)",
                            color: "var(--surface-solid)",
                            fontSize: 13,
                            fontWeight: 500,
                            cursor: claiming ? "wait" : "pointer",
                            opacity: claiming && !isThisOne ? 0.5 : 1,
                          }}
                        >
                          {isThisOne ? "Pouring..." : "Claim"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

          {phase.kind === "error" && (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ color: "var(--ink)", fontSize: 14 }}>{phase.message}</div>
              <div>
                <button
                  type="button"
                  onClick={() =>
                    setPhase({ kind: "pickPartner", partners: phase.partners })
                  }
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    border: "1px solid var(--sage-deep)",
                    background: "var(--sage)",
                    color: "var(--surface-solid)",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {phase.kind === "success" && (
            <div style={{ display: "grid", gap: 12 }}>
              <div
                style={{
                  border: "1px solid var(--line-strong)",
                  borderRadius: "calc(var(--radius) - 4px)",
                  padding: 16,
                  background: "var(--surface-2)",
                  display: "grid",
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                  {phase.voucher.partnerName} · {relativeExpires(phase.voucher.expiresAt)}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <code
                    style={{
                      flex: 1,
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                      fontSize: 18,
                      letterSpacing: "0.06em",
                      padding: "10px 12px",
                      background: "var(--surface-solid)",
                      border: "1px solid var(--line)",
                      borderRadius: 8,
                      userSelect: "all",
                      wordBreak: "break-all",
                    }}
                  >
                    {phase.voucher.code}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyCode(phase.voucher.code)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--line-strong)",
                      background: "var(--surface-solid)",
                      color: "var(--ink)",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <footer
          style={{
            padding: "12px 22px 16px",
            borderTop: "1px solid var(--line)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid var(--line-strong)",
              background: "var(--surface-solid)",
              color: "var(--ink)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </footer>
      </div>
    </>
  );
}
