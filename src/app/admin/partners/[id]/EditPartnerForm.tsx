"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPartnerActive, updatePartner } from "@/server/actions/admin-partners";

const inputStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--line)",
  background: "var(--surface-2)",
  color: "var(--ink)",
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
};

const labelTextStyle: React.CSSProperties = { fontSize: 12, color: "var(--ink-soft)" };

type PartnerEditState = {
  id: string;
  name: string;
  slug: string;
  type: "chain" | "indie";
  city: string | null;
  state: string | null;
  logoUrl: string | null;
  blurb: string | null;
  weeklyBudget: number;
  active: boolean;
};

export function EditPartnerForm({ partner }: { partner: PartnerEditState }) {
  const router = useRouter();
  const [name, setName] = useState(partner.name);
  const [slug, setSlug] = useState(partner.slug);
  const [type, setType] = useState<"chain" | "indie">(partner.type);
  const [city, setCity] = useState(partner.city ?? "");
  const [state, setState] = useState(partner.state ?? "");
  const [logoUrl, setLogoUrl] = useState(partner.logoUrl ?? "");
  const [blurb, setBlurb] = useState(partner.blurb ?? "");
  const [weeklyBudget, setWeeklyBudget] = useState(String(partner.weeklyBudget));
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [togglePending, startToggleTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(null);
    const budget = Number(weeklyBudget);
    if (!Number.isFinite(budget) || !Number.isInteger(budget) || budget < 0) {
      setError("Weekly budget must be a non-negative integer.");
      return;
    }
    startTransition(async () => {
      try {
        await updatePartner({
          id: partner.id,
          name: name.trim(),
          slug: slug.trim(),
          type,
          city: city.trim() || null,
          state: state.trim() || null,
          logoUrl: logoUrl.trim() || null,
          blurb: blurb.trim() || null,
          weeklyBudget: budget,
        });
        setOk("Saved.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save partner.");
      }
    });
  }

  function onToggleActive() {
    setError(null);
    setOk(null);
    startToggleTransition(async () => {
      try {
        await setPartnerActive({ id: partner.id, active: !partner.active });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update partner.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <label style={{ display: "grid", gap: 4 }}>
        <span style={labelTextStyle}>Name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={120}
          style={inputStyle}
        />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={labelTextStyle}>Slug</span>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            minLength={2}
            maxLength={64}
            pattern="[A-Za-z0-9\-]+"
            style={inputStyle}
          />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={labelTextStyle}>Type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "chain" | "indie")}
            style={inputStyle}
          >
            <option value="chain">chain</option>
            <option value="indie">indie</option>
          </select>
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={labelTextStyle}>City</span>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={120}
            style={inputStyle}
          />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={labelTextStyle}>State</span>
          <input
            type="text"
            value={state}
            onChange={(e) => setState(e.target.value)}
            maxLength={120}
            style={inputStyle}
          />
        </label>
      </div>

      <label style={{ display: "grid", gap: 4 }}>
        <span style={labelTextStyle}>Logo URL</span>
        <input
          type="url"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          style={inputStyle}
          placeholder="https://"
        />
      </label>

      <label style={{ display: "grid", gap: 4 }}>
        <span style={labelTextStyle}>Blurb</span>
        <textarea
          value={blurb}
          onChange={(e) => setBlurb(e.target.value)}
          maxLength={500}
          rows={3}
          style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }}
        />
      </label>

      <label style={{ display: "grid", gap: 4 }}>
        <span style={labelTextStyle}>Weekly budget (vouchers/week)</span>
        <input
          type="number"
          value={weeklyBudget}
          onChange={(e) => setWeeklyBudget(e.target.value)}
          min={0}
          max={100000}
          step={1}
          required
          style={inputStyle}
        />
      </label>

      {error && (
        <p role="alert" style={{ margin: 0, color: "var(--rose)", fontSize: 13 }}>
          {error}
        </p>
      )}
      {ok && (
        <p role="status" style={{ margin: 0, color: "var(--sage)", fontSize: 13 }}>
          {ok}
        </p>
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="submit"
          disabled={pending}
          style={{
            background: "var(--sage)",
            color: "white",
            border: 0,
            padding: "10px 16px",
            borderRadius: "var(--radius-sm)",
            cursor: pending ? "default" : "pointer",
            opacity: pending ? 0.6 : 1,
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onToggleActive}
          disabled={togglePending}
          style={{
            background: "transparent",
            color: "var(--ink)",
            border: "1px solid var(--line)",
            padding: "10px 16px",
            borderRadius: "var(--radius-sm)",
            cursor: togglePending ? "default" : "pointer",
            opacity: togglePending ? 0.6 : 1,
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {togglePending ? "…" : partner.active ? "Deactivate" : "Reactivate"}
        </button>
      </div>
    </form>
  );
}
