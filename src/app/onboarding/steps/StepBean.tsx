"use client";

import type { StepProps } from "../FirstPour";
import type { FirstPourState } from "../FirstPour";

export type { StepProps };

type FaithValue = FirstPourState["faith"];
// Card option: id "pass" is a virtual option that maps to faith === "".
type CardId = Exclude<FaithValue, ""> | "pass";

const CARDS: { id: CardId; title: string; desc: string }[] = [
  { id: "christian",  title: "Christian",    desc: "Scripture, prayer, weekly verse rotation." },
  { id: "jewish",     title: "Jewish",       desc: "Tanakh-anchored daily passage." },
  { id: "muslim",     title: "Muslim",       desc: "Qur'an passage + reflection." },
  { id: "spiritual",  title: "Spiritual",    desc: "Stoic, mindful, secular-curious." },
  { id: "secular",    title: "Secular",      desc: "Skip the spiritual block entirely." },
  { id: "custom",     title: "Custom",       desc: "Tell us your tradition." },
  { id: "pass",       title: "Pass for now", desc: "Decide later in Settings." },
];

const SCRIPTURES: { value: string; label: string }[] = [
  { value: "KJV",  label: "KJV"  },
  { value: "NIV",  label: "NIV"  },
  { value: "ESV",  label: "ESV"  },
  { value: "NRSV", label: "NRSV" },
  { value: "",     label: "—"    },
];

function selectedCardId(faith: FaithValue): CardId | null {
  if (faith === "") return null; // nothing picked yet (also: "pass" never persists as selected on remount)
  return faith;
}

/**
 * Step 5 — Bean (faith picker). Single-select cards. Christian → scripturePref
 * chip group below. Custom → free-text input below.
 */
export function StepBean({ data, onChange }: StepProps) {
  const active = selectedCardId(data.faith);

  const pickCard = (id: CardId) => {
    if (id === "pass") {
      onChange({ faith: "", faithCustom: "", scripturePref: "" });
      return;
    }
    if (id === "custom") {
      onChange({ faith: "custom", scripturePref: "" });
      return;
    }
    // christian / jewish / muslim / spiritual / secular
    const patch: Partial<FirstPourState> = { faith: id, faithCustom: "" };
    if (id !== "christian") patch.scripturePref = "";
    onChange(patch);
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <p
        style={{
          margin: 0,
          fontStyle: "italic",
          color: "var(--ink-soft)",
          fontSize: 13,
        }}
      >
        We won&apos;t preach. We won&apos;t argue. We carry it for those who
        carry it.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 10,
        }}
      >
        {CARDS.map((card) => {
          const isActive = active === card.id;
          return (
            <button
              key={card.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => pickCard(card.id)}
              style={{
                display: "grid",
                gap: 6,
                textAlign: "left",
                padding: "14px 16px",
                borderRadius: "var(--radius-sm)",
                border: isActive
                  ? "2px solid var(--sage)"
                  : "1px solid var(--line)",
                background: isActive
                  ? "var(--surface-solid)"
                  : "var(--surface-2)",
                color: "var(--ink)",
                cursor: "pointer",
              }}
            >
              <span
                className="serif"
                style={{ fontSize: 17, fontWeight: 500, color: "var(--ink)" }}
              >
                {card.title}
              </span>
              <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                {card.desc}
              </span>
            </button>
          );
        })}
      </div>

      {data.faith === "christian" && (
        <div style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
            Scripture preference
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {SCRIPTURES.map(({ value, label }) => {
              const isActive = data.scripturePref === value;
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onChange({ scripturePref: value })}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: isActive
                      ? "1px solid var(--sage)"
                      : "1px solid var(--line)",
                    background: isActive ? "var(--sage)" : "var(--surface-2)",
                    color: isActive ? "white" : "var(--ink-soft)",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {data.faith === "custom" && (
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
            Your tradition
          </span>
          <input
            type="text"
            value={data.faithCustom}
            onChange={(e) => onChange({ faithCustom: e.target.value })}
            maxLength={80}
            placeholder="e.g. Quaker, Bahá&apos;í, Buddhist"
            style={{
              padding: "8px 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--line)",
              background: "var(--surface-2)",
              color: "var(--ink)",
            }}
          />
        </label>
      )}
    </div>
  );
}
