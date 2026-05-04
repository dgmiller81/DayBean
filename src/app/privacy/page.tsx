export const dynamic = "force-static";

export const metadata = {
  title: "Privacy — DayBeans",
  description:
    "What we store, what we send to providers, and how to delete or export your data.",
};

const sectionStyle: React.CSSProperties = {
  marginTop: 32,
};

const h2Style: React.CSSProperties = {
  fontSize: 21,
  fontWeight: 500,
  margin: "0 0 8px 0",
  color: "var(--ink)",
};

const pStyle: React.CSSProperties = {
  margin: "8px 0",
  color: "var(--ink-soft)",
};

const ulStyle: React.CSSProperties = {
  margin: "8px 0",
  paddingLeft: 20,
  color: "var(--ink-soft)",
};

const liStyle: React.CSSProperties = {
  margin: "4px 0",
};

export default function PrivacyPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "48px 24px",
        maxWidth: 720,
        margin: "0 auto",
        fontSize: 16,
        lineHeight: 1.6,
        color: "var(--ink)",
      }}
    >
      <header>
        <h1
          className="serif"
          style={{
            fontSize: 30,
            fontWeight: 500,
            margin: 0,
            color: "var(--ink)",
          }}
        >
          Privacy
        </h1>
        <p style={{ ...pStyle, marginTop: 12 }}>
          Direct, no metaphors. Here&apos;s what DayBeans stores, sends, and
          never sees.
        </p>
      </header>

      <section style={sectionStyle}>
        <h2 className="serif" style={h2Style}>
          What we store on our servers
        </h2>
        <ul style={ulStyle}>
          <li style={liStyle}>
            Your account: email, name, password hash (argon2id), timezone,
            theme, and refresh hour.
          </li>
          <li style={liStyle}>
            Your inputs: journal entries, goals, bookmarks, daily progress
            notes, hobbies, who you live with, and finance numbers (display
            only — we do not connect to your bank).
          </li>
          <li style={liStyle}>
            Your derived signals: extracted journal themes (single-word tokens
            like &quot;rest&quot; or &quot;presence&quot;). You can see these
            in Settings under &quot;What we heard.&quot;
          </li>
          <li style={liStyle}>
            Your activity: refresh log, click history, voucher claim history,
            and which suggested goals you accepted or dismissed.
          </li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 className="serif" style={h2Style}>
          What we send to your LLM provider
        </h2>
        <p style={pStyle}>
          We send themes only, plus your role, job title, hobbies, and who you
          live with — when you have provided them. We do not send the verbatim
          text of your journal.
        </p>
        <p style={pStyle}>
          Excerpts may be passed as soft context, with a strict no-four-or-more
          word substring rule. A 100-iteration test in CI verifies this on
          every build. Whatever your LLM provider receives is governed by
          their terms.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 className="serif" style={h2Style}>
          What we send to coffee partners
        </h2>
        <p style={pStyle}>
          Only anonymous counts. When you redeem a voucher, the partner sees
          the redemption code — nothing else. They never see your name, your
          email, or anything that identifies you. Aggregate redemption stats
          are visible to admins only.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 className="serif" style={h2Style}>
          What we never share
        </h2>
        <p style={pStyle}>
          Your journal text, your prayer or reflection content, your goal
          lists, and your click history. None of this leaves the server in
          identifiable form.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 className="serif" style={h2Style}>
          Export your data
        </h2>
        <p style={pStyle}>
          You&apos;ll be able to download everything at any time from Settings
          → Export. The export covers your account, your inputs, your derived
          themes, and your activity history.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 className="serif" style={h2Style}>
          Delete your account
        </h2>
        <p style={pStyle}>
          You&apos;ll be able to delete your account from Settings → Delete
          account. The flow uses two-step confirmation followed by a 24-hour
          grace period, then a cascade delete that removes your data from our
          database.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 className="serif" style={h2Style}>
          Cookies we set
        </h2>
        <ul style={ulStyle}>
          <li style={liStyle}>
            <code>mm_session</code> — HTTP-only, secure on Railway. A signed
            iron-session cookie that proves you&apos;re logged in.
          </li>
          <li style={liStyle}>
            <code>db_theme</code> / <code>mm_theme</code> — your chosen color
            theme. Not personal.
          </li>
          <li style={liStyle}>
            <code>db_onboarded</code> — a 1/0 flag so middleware can skip the
            database lookup. Not personal.
          </li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 className="serif" style={h2Style}>
          No tracking
        </h2>
        <p style={pStyle}>
          No analytics scripts. No ad pixels. No third-party telemetry. We may
          add a privacy-respecting analytics tool like Plausible later — and
          if we do, it will be opt-in only.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 className="serif" style={h2Style}>
          Changes to this policy
        </h2>
        <p style={pStyle}>
          We&apos;ll show a notice in the app before any change that affects
          what we store or share. We won&apos;t quietly start sending more.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 className="serif" style={h2Style}>
          Contact
        </h2>
        <p style={pStyle}>
          Questions about your data? Reach out and we&apos;ll respond. A
          dedicated contact page is coming; for now, email the address listed
          in your account confirmation.
        </p>
      </section>

      <footer
        style={{
          marginTop: 48,
          paddingTop: 16,
          borderTop: "1px solid var(--line)",
          color: "var(--ink-muted)",
          fontSize: 13,
        }}
      >
        <a
          href="/login"
          style={{ color: "var(--sage)", textDecoration: "none" }}
        >
          ← Back to sign in
        </a>
      </footer>
    </main>
  );
}
