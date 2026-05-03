"use client";

import { useActionState, useState } from "react";
import { completeOnboardingAction } from "@/server/actions/onboarding";

const inputStyle = {
  padding: "10px 14px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--line)",
  background: "var(--surface-2)",
  color: "var(--ink)",
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
} as const;

const labelStyle = {
  display: "grid",
  gap: 6,
} as const;

const labelTextStyle = {
  fontSize: 12,
  color: "var(--ink-soft)",
} as const;

const helpStyle = {
  fontSize: 12,
  color: "var(--ink-soft)",
  marginTop: -2,
} as const;

const buttonPrimary = {
  background: "var(--sage)",
  color: "white",
  border: 0,
  padding: "10px 18px",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 14,
} as const;

const buttonSecondary = {
  background: "transparent",
  color: "var(--ink-soft)",
  border: "1px solid var(--line)",
  padding: "10px 18px",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 14,
} as const;

const STEPS = ["Business", "Personal", "Spiritual"] as const;

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [faith, setFaith] = useState("none");
  const [state, formAction, pending] = useActionState(completeOnboardingAction, null);

  return (
    <form action={formAction} style={{ display: "grid", gap: 16 }}>
      <Stepper current={step} />

      <div className="card" style={{ padding: 24, background: "var(--surface-solid)" }}>
        <div style={{ display: step === 0 ? "grid" : "none", gap: 16 }}>
          <h2 style={{ fontSize: 18, margin: 0, color: "var(--ink)" }}>Business</h2>
          <label style={labelStyle}>
            <span style={labelTextStyle}>What is your role?</span>
            <input
              name="jobTitle"
              type="text"
              placeholder="e.g. Founder & engineer, Product designer at Figma"
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            <span style={labelTextStyle}>What kinds of business content excite you?</span>
            <textarea
              name="businessInterests"
              rows={3}
              placeholder="Comma-separated. e.g. AI agents, indie hacking, dev tooling, climate tech, design systems"
              style={inputStyle}
            />
            <span style={helpStyle}>
              The LLM uses these to pick stories, threads, and quotes for your Business tab each morning.
            </span>
          </label>
        </div>

        <div style={{ display: step === 1 ? "grid" : "none", gap: 16 }}>
          <h2 style={{ fontSize: 18, margin: 0, color: "var(--ink)" }}>Personal</h2>
          <label style={labelStyle}>
            <span style={labelTextStyle}>What matters most to you outside of work?</span>
            <textarea
              name="personalImportance"
              rows={4}
              placeholder="e.g. My wife and two kids (5 and 3). Long runs. Books on stoicism. Building things on weekends."
              style={inputStyle}
            />
            <span style={helpStyle}>
              Family, friends, growth, hobbies — anything that should colour your morning.
            </span>
          </label>
          <label style={labelStyle}>
            <span style={labelTextStyle}>Personal interests</span>
            <textarea
              name="personalInterests"
              rows={3}
              placeholder="Comma-separated. e.g. running, woodworking, jazz, travel, parenting"
              style={inputStyle}
            />
          </label>
        </div>

        <div style={{ display: step === 2 ? "grid" : "none", gap: 16 }}>
          <h2 style={{ fontSize: 18, margin: 0, color: "var(--ink)" }}>Spiritual</h2>
          <label style={labelStyle}>
            <span style={labelTextStyle}>Which best describes your daily practice?</span>
            <select
              name="faith"
              value={faith}
              onChange={(e) => setFaith(e.target.value)}
              style={inputStyle}
            >
              <option value="none">None — skip spiritual content</option>
              <option value="mindfulness">Mindfulness / meditation (secular)</option>
              <option value="christian">Christian</option>
              <option value="jewish">Jewish</option>
              <option value="muslim">Muslim</option>
              <option value="spiritual">Spiritual but not religious</option>
              <option value="custom">Other (write in)</option>
            </select>
          </label>
          {faith === "custom" && (
            <label style={labelStyle}>
              <span style={labelTextStyle}>How would you describe it?</span>
              <input name="faithCustom" type="text" maxLength={80} style={inputStyle} />
            </label>
          )}
          {faith === "christian" && (
            <label style={labelStyle}>
              <span style={labelTextStyle}>Scripture preference</span>
              <select name="scripturePref" defaultValue="kjv" style={inputStyle}>
                <option value="kjv">KJV — King James</option>
                <option value="niv">NIV — New International</option>
                <option value="esv">ESV — English Standard</option>
                <option value="nlt">NLT — New Living Translation</option>
                <option value="nasb">NASB — New American Standard</option>
                <option value="msg">The Message</option>
              </select>
            </label>
          )}
          {faith !== "none" && (
            <label style={labelStyle}>
              <span style={labelTextStyle}>
                Anything specific you'd like reflected each morning?
              </span>
              <textarea
                name="spiritualNote"
                rows={3}
                placeholder="e.g. Themes of grace and patience. Scripture from the Gospels. Short reflections."
                style={inputStyle}
              />
            </label>
          )}
        </div>
      </div>

      {state?.error && (
        <p role="alert" style={{ margin: 0, color: "var(--rose)", fontSize: 13 }}>
          {state.error}
        </p>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <button
          type="button"
          style={{ ...buttonSecondary, visibility: step === 0 ? "hidden" : "visible" }}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            style={buttonPrimary}
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            disabled={pending}
            style={{ ...buttonPrimary, opacity: pending ? 0.6 : 1, cursor: pending ? "default" : "pointer" }}
          >
            {pending ? "Saving…" : "Finish"}
          </button>
        )}
      </div>
    </form>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <ol
      style={{
        listStyle: "none",
        padding: 0,
        margin: 0,
        display: "grid",
        gridTemplateColumns: `repeat(${STEPS.length}, 1fr)`,
        gap: 8,
      }}
    >
      {STEPS.map((label, i) => {
        const active = i === current;
        const done = i < current;
        return (
          <li
            key={label}
            style={{
              padding: "8px 12px",
              borderRadius: "var(--radius-sm)",
              border: `1px solid ${active ? "var(--sage)" : "var(--line)"}`,
              background: done ? "var(--surface-2)" : "transparent",
              color: active ? "var(--ink)" : "var(--ink-soft)",
              fontSize: 12,
              fontWeight: active ? 600 : 400,
              textAlign: "center",
            }}
          >
            {i + 1}. {label}
          </li>
        );
      })}
    </ol>
  );
}
