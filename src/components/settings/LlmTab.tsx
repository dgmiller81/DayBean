"use client";
import { useState } from "react";
import {
  saveLlmCredential,
  deleteLlmCredential,
  testLlmConnection,
  type LlmCredentialSummary,
} from "@/server/actions/settings";
import type { LlmProvider } from "@/server/llm";

const PROVIDER_LABELS: Record<LlmProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  lmstudio: "LM Studio (local)",
};

const DEFAULT_MODELS: Record<LlmProvider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-4-5",
  lmstudio: "lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF",
};

const PROVIDERS: LlmProvider[] = ["lmstudio", "openai", "anthropic"];

export function LlmTab({
  initial,
  envOverride,
}: {
  initial: LlmCredentialSummary[];
  envOverride: { provider: LlmProvider; model: string } | null;
}) {
  const [credentials, setCredentials] = useState<LlmCredentialSummary[]>(initial);
  const [provider, setProvider] = useState<LlmProvider>("lmstudio");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(DEFAULT_MODELS.lmstudio);
  const [pending, setPending] = useState(false);
  const [testResult, setTestResult] = useState<string>("");

  const handleProviderChange = (p: LlmProvider) => {
    setProvider(p);
    setModel(DEFAULT_MODELS[p]);
    setApiKey("");
    setTestResult("");
  };

  const onSave = async () => {
    if (pending) return;
    setPending(true);
    setTestResult("");
    try {
      const keyToSend = provider === "lmstudio" && !apiKey.trim() ? "local" : apiKey.trim();
      if (!keyToSend) {
        setTestResult("API key required");
        return;
      }
      const r = await saveLlmCredential({ provider, apiKey: keyToSend, model: model.trim() });
      setCredentials((prev) => {
        const filtered = prev.filter((c) => c.provider !== r.provider);
        return [...filtered, r];
      });
      setApiKey("");
      setTestResult("Saved.");
    } catch (e) {
      setTestResult(`Save failed: ${(e as Error).message}`);
    } finally {
      setPending(false);
    }
  };

  const onTest = async () => {
    if (pending) return;
    setPending(true);
    setTestResult("Testing…");
    try {
      const r = await testLlmConnection({ provider });
      setTestResult(r.ok ? "Connected." : `Failed: ${r.reason}`);
    } finally {
      setPending(false);
    }
  };

  const onDelete = async (p: LlmProvider) => {
    await deleteLlmCredential({ provider: p });
    setCredentials((prev) => prev.filter((c) => c.provider !== p));
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <p style={{ color: "var(--ink-soft)", fontSize: 13, margin: 0 }}>
        Configure an LLM provider to enable the "Refresh today's content" button. Keys are
        encrypted at rest with AES-256-GCM and never returned to the browser.
      </p>

      {envOverride && (
        <div
          role="status"
          style={{
            padding: "10px 14px",
            background: "var(--gold-soft)",
            border: "1px solid var(--gold)",
            borderRadius: "var(--radius-sm)",
            color: "var(--ink)",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: "var(--gold)" }}>Using .env override:</strong>{" "}
          <code>{PROVIDER_LABELS[envOverride.provider]}</code> with model{" "}
          <code>{envOverride.model}</code>. Settings below are ignored until you remove{" "}
          <code>LLM_DEFAULT</code> from your <code>.env</code>.
        </div>
      )}

      {credentials.length > 0 && (
        <section>
          <h3 style={{ fontSize: 12, letterSpacing: ".16em", color: "var(--gold)", margin: "0 0 8px", fontWeight: 600 }}>
            CONFIGURED
          </h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
            {credentials.map((c) => (
              <li
                key={c.provider}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 12px",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--surface-2)",
                }}
              >
                <span style={{ flex: 1, fontSize: 14, color: "var(--ink)" }}>
                  <strong>{PROVIDER_LABELS[c.provider]}</strong>
                  <span style={{ color: "var(--ink-soft)", marginLeft: 8 }}>
                    · {c.model} · key …{c.last4}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onDelete(c.provider)}
                  style={{ background: "transparent", border: 0, color: "var(--ink-muted)", cursor: "pointer", fontSize: 12 }}
                >Remove</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 style={{ fontSize: 12, letterSpacing: ".16em", color: "var(--gold)", margin: "0 0 8px", fontWeight: 600 }}>
          ADD / UPDATE
        </h3>
        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Provider</span>
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value as LlmProvider)}
              style={{
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--line)",
                background: "var(--surface-2)",
                color: "var(--ink)",
              }}
            >
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
              API key {provider === "lmstudio" && "(any value — LM Studio runs locally with no auth)"}
            </span>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === "lmstudio" ? "leave blank — local only" : "sk-…"}
              autoComplete="off"
              style={{
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--line)",
                background: "var(--surface-2)",
                color: "var(--ink)",
                fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                fontSize: 13,
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Model</span>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              maxLength={200}
              style={{
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--line)",
                background: "var(--surface-2)",
                color: "var(--ink)",
                fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                fontSize: 13,
              }}
            />
          </label>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={onSave}
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
            >Save</button>
            <button
              type="button"
              onClick={onTest}
              disabled={pending}
              style={{
                background: "transparent",
                color: "var(--sage-deep)",
                border: "1px solid var(--sage)",
                padding: "8px 16px",
                borderRadius: "var(--radius-sm)",
                cursor: pending ? "default" : "pointer",
              }}
            >Test connection</button>
            {testResult && (
              <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>{testResult}</span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
