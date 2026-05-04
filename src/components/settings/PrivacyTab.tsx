"use client";

// Privacy & account controls.
// S7-T02 — "Export your data" (above): mints a 24h tokenized download link
//          and emails it to the user.
// S7-T03 — "Delete your account" (below): button → first confirmation modal
//          → typed-DELETE confirmation → server action sets a 24h grace
//          timer. While the timer is running the section becomes a
//          "Deletion scheduled — cancel?" block.

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  cancelAccountDeletion,
  requestAccountDeletion,
} from "@/server/actions/account";
import { signOutAction } from "@/server/actions/auth";
import { requestDataExport } from "@/server/actions/export";
import { formatRelative } from "@/lib/relative-time";

type Step = null | "confirm-1" | "confirm-2";

export function PrivacyTab({
  initial,
}: {
  initial: { pendingDeletionAt: string | null };
}) {
  const router = useRouter();
  const [pendingDeletionAt, setPendingDeletionAt] = useState<string | null>(
    initial.pendingDeletionAt,
  );
  const [step, setStep] = useState<Step>(null);
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string>("");

  // Export-flow state lives separately from the deletion state so a pending
  // export request doesn't disable the deletion controls or vice versa.
  const [exportPending, setExportPending] = useState(false);
  const [exportStatus, setExportStatus] = useState("");

  const onRequestExport = async () => {
    if (exportPending) return;
    setExportPending(true);
    setExportStatus("");
    try {
      const r = await requestDataExport();
      if (r.ok) {
        setExportStatus(
          r.reused
            ? "You already have an active export — we just re-sent the link."
            : "Sent. Check your inbox — the link works once and expires in 24 hours.",
        );
      } else {
        setExportStatus(r.error);
      }
    } catch (e) {
      setExportStatus(`Request failed: ${(e as Error).message}`);
    } finally {
      setExportPending(false);
    }
  };

  const onSubmitDelete = async () => {
    if (typed !== "DELETE" || pending) return;
    setPending(true);
    setStatus("");
    try {
      const r = await requestAccountDeletion();
      setPendingDeletionAt(r.pendingDeletionAt);
      setStep(null);
      setTyped("");
      // Sign the user out so the next page render forces them to log back in
      // before they can re-touch deletion. signOutAction redirects to /login.
      await signOutAction();
      router.push("/login");
    } catch (e) {
      setStatus(`Failed: ${(e as Error).message}`);
      setPending(false);
    }
  };

  const onCancelDeletion = async () => {
    if (pending) return;
    setPending(true);
    setStatus("");
    try {
      await cancelAccountDeletion();
      setPendingDeletionAt(null);
      setStatus("Deletion canceled.");
    } catch (e) {
      setStatus(`Failed: ${(e as Error).message}`);
    } finally {
      setPending(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <p style={{ color: "var(--ink-soft)", fontSize: 13, margin: 0 }}>
        Direct, no metaphors. See{" "}
        <a href="/privacy" style={{ color: "var(--sage-deep)" }}>
          the full privacy page
        </a>{" "}
        for what's stored and shared.
      </p>

      <section style={{ display: "grid", gap: 8 }}>
        <h3
          className="serif"
          style={{ margin: 0, fontSize: "1rem", color: "var(--ink)" }}
        >
          Export your data
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "var(--ink-soft)",
            lineHeight: 1.5,
          }}
        >
          Download everything DayBeans has stored on your behalf. We'll email
          a link valid for 24 hours; it works once.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={onRequestExport}
            disabled={exportPending}
            style={{
              background: "var(--sage)",
              color: "white",
              border: 0,
              padding: "8px 16px",
              borderRadius: "var(--radius-sm)",
              cursor: exportPending ? "default" : "pointer",
              opacity: exportPending ? 0.6 : 1,
              fontWeight: 600,
            }}
          >
            {exportPending ? "Sending…" : "Email my export"}
          </button>
          {exportStatus && (
            <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>
              {exportStatus}
            </span>
          )}
        </div>
      </section>

      <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "4px 0" }} />

      <section style={{ display: "grid", gap: 8 }}>
        <h3
          className="serif"
          style={{ margin: 0, fontSize: "1rem", color: "var(--ink)" }}
        >
          Delete your account
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "var(--ink-soft)",
            lineHeight: 1.5,
          }}
        >
          Permanently remove everything — journal entries, goals, bookmarks,
          settings. We hold your record for 24 hours after you confirm so you
          can change your mind.
        </p>

        {pendingDeletionAt ? (
          <div
            style={{
              display: "grid",
              gap: 8,
              padding: 12,
              border: "1px solid var(--line-strong)",
              borderRadius: "var(--radius-sm)",
              background: "var(--surface-2)",
            }}
          >
            <div style={{ fontSize: 13, color: "var(--ink)" }}>
              Deletion scheduled — completes {formatRelative(pendingDeletionAt)}.
            </div>
            <div>
              <button
                type="button"
                onClick={onCancelDeletion}
                disabled={pending}
                style={{
                  background: "var(--sage)",
                  color: "white",
                  border: 0,
                  padding: "8px 16px",
                  borderRadius: "var(--radius-sm)",
                  cursor: pending ? "default" : "pointer",
                  opacity: pending ? 0.6 : 1,
                  fontWeight: 600,
                }}
              >
                Cancel deletion
              </button>
            </div>
            {status && (
              <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                {status}
              </span>
            )}
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => setStep("confirm-1")}
              style={{
                background: "transparent",
                color: "var(--danger, #b3261e)",
                border: "1px solid var(--danger, #b3261e)",
                padding: "8px 16px",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Delete account
            </button>
          </div>
        )}
      </section>

      {step !== null && (
        <ConfirmModal onClose={() => !pending && setStep(null)}>
          {step === "confirm-1" && (
            <>
              <h3
                className="serif"
                style={{ margin: 0, fontSize: "1.05rem", color: "var(--ink)" }}
              >
                This deletes everything.
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "var(--ink-soft)",
                  lineHeight: 1.5,
                }}
              >
                Your journal entries, goals, bookmarks, and preferences will be
                erased. You'll have 24 hours to change your mind before the
                erase becomes permanent.
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setStep(null)}
                  style={{
                    background: "transparent",
                    color: "var(--ink-soft)",
                    border: "1px solid var(--line)",
                    padding: "8px 14px",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setStep("confirm-2")}
                  style={{
                    background: "var(--danger, #b3261e)",
                    color: "white",
                    border: 0,
                    padding: "8px 14px",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  I understand
                </button>
              </div>
            </>
          )}

          {step === "confirm-2" && (
            <>
              <h3
                className="serif"
                style={{ margin: 0, fontSize: "1.05rem", color: "var(--ink)" }}
              >
                Type <code>DELETE</code> to confirm.
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "var(--ink-soft)",
                  lineHeight: 1.5,
                }}
              >
                After you confirm, we'll sign you out and start the 24-hour
                grace timer. You can cancel during that window from your
                Privacy settings.
              </p>
              <input
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                aria-label='Type "DELETE" to confirm'
                autoFocus
                style={{
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--line)",
                  background: "var(--surface-2)",
                  color: "var(--ink)",
                  fontFamily: "monospace",
                }}
              />
              {status && (
                <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                  {status}
                </span>
              )}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => {
                    if (pending) return;
                    setStep(null);
                    setTyped("");
                  }}
                  disabled={pending}
                  style={{
                    background: "transparent",
                    color: "var(--ink-soft)",
                    border: "1px solid var(--line)",
                    padding: "8px 14px",
                    borderRadius: "var(--radius-sm)",
                    cursor: pending ? "default" : "pointer",
                    opacity: pending ? 0.6 : 1,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSubmitDelete}
                  disabled={typed !== "DELETE" || pending}
                  style={{
                    background: "var(--danger, #b3261e)",
                    color: "white",
                    border: 0,
                    padding: "8px 14px",
                    borderRadius: "var(--radius-sm)",
                    cursor:
                      typed !== "DELETE" || pending ? "default" : "pointer",
                    opacity: typed !== "DELETE" || pending ? 0.6 : 1,
                    fontWeight: 600,
                  }}
                >
                  Schedule deletion
                </button>
              </div>
            </>
          )}
        </ConfirmModal>
      )}
    </div>
  );
}

// Lightweight backdrop + dialog — mirrors the SettingsModal scrim/dialog
// shape so it visually slots into the same surface stack.
function ConfirmModal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
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
          zIndex: 100,
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          left: "50%",
          top: "50%",
          transform: "translate(-50%,-50%)",
          width: "min(440px, 92vw)",
          background: "var(--surface-solid)",
          border: "1px solid var(--line-strong)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow-md)",
          padding: 20,
          display: "grid",
          gap: 12,
          zIndex: 101,
        }}
      >
        {children}
      </div>
    </>
  );
}
