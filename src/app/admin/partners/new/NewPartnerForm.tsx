"use client";

import { useState, useTransition } from "react";
import { createPartner } from "@/server/actions/admin-partners";

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

export function NewPartnerForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState<"chain" | "indie">("indie");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [blurb, setBlurb] = useState("");
  const [weeklyBudget, setWeeklyBudget] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const budget = Number(weeklyBudget);
    if (!Number.isFinite(budget) || !Number.isInteger(budget) || budget < 0) {
      setError("Weekly budget must be a non-negative integer.");
      return;
    }
    startTransition(async () => {
      try {
        const { id } = await createPartner({
          name: name.trim(),
          slug: slug.trim(),
          type,
          city: city.trim() || null,
          state: state.trim() || null,
          logoUrl: logoUrl.trim() || null,
          blurb: blurb.trim() || null,
          weeklyBudget: budget,
        });
        window.location.href = `/admin/partners/${id}`;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create partner.");
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
            placeholder="caribou-coffee"
          />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={labelTextStyle}>Type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "chain" | "indie")}
            style={inputStyle}
          >
            <option value="indie">indie</option>
            <option value="chain">chain</option>
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
          justifySelf: "start",
        }}
      >
        {pending ? "Creating…" : "Create partner"}
      </button>
    </form>
  );
}
