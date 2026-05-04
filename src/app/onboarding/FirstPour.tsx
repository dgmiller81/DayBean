"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Hobby, HouseholdMember } from "@/types";
import { completeOnboardingAction } from "@/server/actions/onboarding";
import { StepName } from "./steps/StepName";
import { StepWork } from "./steps/StepWork";
import { StepGrowing } from "./steps/StepGrowing";
import { StepHousehold } from "./steps/StepHousehold";
import { StepBean } from "./steps/StepBean";
import { StepMorning } from "./steps/StepMorning";

/**
 * The full state captured across the 6 steps. Every field is optional except
 * name (which the user can still leave blank if they really want to). This
 * is the shape the per-step components mutate via onChange.
 */
export type FirstPourState = {
  // Step 1
  name: string;

  // Step 2
  jobTitle: string;
  industry: string;
  companyStage: string; // 'pre-seed' | 'seed' | 'series-a' | ... | '' (free-form)

  // Step 3
  hobbies: Hobby[];

  // Step 4
  livesWith: HouseholdMember[];

  // Step 5
  faith:
    | ""
    | "christian"
    | "jewish"
    | "muslim"
    | "spiritual"
    | "secular"
    | "custom";
  faithCustom: string;
  scripturePref: string; // only meaningful when faith === "christian"

  // Step 6
  theme: string; // a valid theme id from globals.css (default 'light' = Dawn)
  refreshHour: number; // 0..23, default 4
  bgImageUrl: string; // optional, default ''
};

export type StepProps = {
  data: FirstPourState;
  /** Patch the global state. Only pass fields you want to change. */
  onChange: (patch: Partial<FirstPourState>) => void;
  /** Advance to the next step. The shell calls this; steps invoke it on Next click. */
  onNext: () => void;
  /** Go back. No-op on step 0. */
  onBack: () => void;
};

const STEPS = ["Name", "Work", "Growing", "Household", "Bean", "Morning"] as const;
type StepId = (typeof STEPS)[number];

const STEP_TITLES: Record<StepId, string> = {
  Name: "What should we call you?",
  Work: "What kind of work do you do?",
  Growing: "What are you growing into?",
  Household: "Who's your morning company?",
  Bean: "What's your bean?",
  Morning: "Which morning do you want?",
};

const INITIAL_STATE: FirstPourState = {
  name: "",
  jobTitle: "",
  industry: "",
  companyStage: "",
  hobbies: [],
  livesWith: [],
  faith: "",
  faithCustom: "",
  scripturePref: "",
  theme: "light",
  refreshHour: 4,
  bgImageUrl: "",
};

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

export function FirstPour() {
  const router = useRouter();
  const [data, setData] = useState<FirstPourState>(INITIAL_STATE);
  const [currentStep, setCurrentStep] = useState(0);
  // Steps the user has visited (for free-jump on the progress dots).
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onChange = (patch: Partial<FirstPourState>) =>
    setData((d) => ({ ...d, ...patch }));

  const goTo = (idx: number) => {
    const clamped = Math.max(0, Math.min(STEPS.length - 1, idx));
    setCurrentStep(clamped);
    setVisited((prev) => {
      if (prev.has(clamped)) return prev;
      const next = new Set(prev);
      next.add(clamped);
      return next;
    });
  };

  const onNext = () => {
    if (currentStep < STEPS.length - 1) {
      goTo(currentStep + 1);
    } else {
      submit();
    }
  };

  const onBack = () => {
    if (currentStep > 0) goTo(currentStep - 1);
  };

  const onSkip = () => {
    // Skip is only available on steps 1..5 (not step 0). Same as Next minus
    // any per-step validation, which the shell does not enforce anyway.
    onNext();
  };

  const submit = () => {
    setError(null);
    // S6-T04 — submit the full First Pour payload using the new field names
    // the action understands. The action handles '' / 'secular' / 'custom'
    // collapsing on the server side.
    const fd = new FormData();
    fd.set("name", data.name);
    fd.set("jobTitle", data.jobTitle);
    fd.set("industry", data.industry);
    fd.set("companyStage", data.companyStage);
    fd.set("hobbies", data.hobbies.join(", "));
    fd.set("livesWith", data.livesWith.join(", "));
    fd.set("faith", data.faith);
    if (data.faith === "custom") fd.set("faithCustom", data.faithCustom);
    if (data.faith === "christian" && data.scripturePref) {
      fd.set("scripturePref", data.scripturePref);
    }
    fd.set("theme", data.theme);
    fd.set("refreshHour", String(data.refreshHour));
    if (data.bgImageUrl) fd.set("bgImageUrl", data.bgImageUrl);

    startTransition(async () => {
      try {
        const result = await completeOnboardingAction(null, fd);
        if (result?.error) {
          setError(result.error);
          return;
        }
        // The action calls redirect() on success which throws NEXT_REDIRECT;
        // if we land here without an error it succeeded.
        router.push("/");
        router.refresh();
      } catch (e) {
        // Next.js redirect throws a special error we should let through.
        if (
          e &&
          typeof e === "object" &&
          "digest" in e &&
          typeof (e as { digest?: unknown }).digest === "string" &&
          (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
        ) {
          throw e;
        }
        setError(
          e instanceof Error ? e.message : "Something went wrong. Please try again.",
        );
      }
    });
  };

  const currentId = STEPS[currentStep];
  const StepComponent = STEP_COMPONENTS[currentId];
  const stepProps: StepProps = { data, onChange, onNext, onBack };
  const isLast = currentStep === STEPS.length - 1;

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        width: "min(100%, 640px)",
        margin: "0 auto",
      }}
    >
      <ProgressDots
        current={currentStep}
        visited={visited}
        onJump={(i) => {
          if (visited.has(i)) goTo(i);
        }}
      />

      <h2
        className="serif"
        style={{
          fontSize: 22,
          margin: 0,
          color: "var(--ink)",
          textAlign: "center",
          fontWeight: 500,
        }}
      >
        {STEP_TITLES[currentId]}
      </h2>

      <div
        className="card"
        style={{
          background: "var(--surface-solid)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius)",
          padding: "clamp(20px, 4vw, 32px)",
        }}
      >
        <StepComponent {...stepProps} />
      </div>

      {error && (
        <p role="alert" style={{ margin: 0, color: "var(--rose)", fontSize: 13 }}>
          {error}
        </p>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          style={{
            ...buttonSecondary,
            visibility: currentStep === 0 ? "hidden" : "visible",
          }}
          onClick={onBack}
          disabled={pending}
        >
          Back
        </button>

        <div style={{ display: "flex", gap: 8 }}>
          {currentStep > 0 && !isLast && (
            <button
              type="button"
              style={buttonSecondary}
              onClick={onSkip}
              disabled={pending}
            >
              Skip
            </button>
          )}
          {currentStep > 0 && isLast && (
            <button
              type="button"
              style={buttonSecondary}
              onClick={onSkip}
              disabled={pending}
            >
              Skip
            </button>
          )}
          <button
            type="button"
            style={{
              ...buttonPrimary,
              opacity: pending ? 0.6 : 1,
              cursor: pending ? "default" : "pointer",
            }}
            onClick={onNext}
            disabled={pending}
          >
            {isLast ? (pending ? "Pouring…" : "Pour my morning.") : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

const STEP_COMPONENTS: Record<StepId, (p: StepProps) => ReactNode> = {
  Name: StepName,
  Work: StepWork,
  Growing: StepGrowing,
  Household: StepHousehold,
  Bean: StepBean,
  Morning: StepMorning,
};

function ProgressDots({
  current,
  visited,
  onJump,
}: {
  current: number;
  visited: Set<number>;
  onJump: (i: number) => void;
}) {
  return (
    <ol
      style={{
        listStyle: "none",
        padding: 0,
        margin: 0,
        display: "flex",
        gap: 8,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {STEPS.map((label, i) => {
        const isCurrent = i === current;
        const isDone = i < current;
        const isVisited = visited.has(i);
        const filled = isCurrent || isDone;
        return (
          <li key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              aria-label={`Step ${i + 1}: ${label}`}
              aria-current={isCurrent ? "step" : undefined}
              onClick={() => onJump(i)}
              disabled={!isVisited}
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: filled ? "var(--sage)" : "transparent",
                border: filled
                  ? "1px solid var(--sage)"
                  : "1px solid var(--surface-2)",
                padding: 0,
                cursor: isVisited ? "pointer" : "default",
                opacity: isVisited || isCurrent ? 1 : 0.6,
              }}
            />
          </li>
        );
      })}
    </ol>
  );
}
