import { ThemeToggle } from "./primitives/ThemeToggle";
import { StreakPill } from "./primitives/StreakPill";

export function Topbar({ theme, name }: { theme: "light" | "dark"; name: string }) {
  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 0 28px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span className="serif" style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)" }}>
          The Daily Mind
        </span>
        <span style={{ color: "var(--ink-muted)", fontSize: 12 }}>· for {name}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <StreakPill count={0} />
        <ThemeToggle initial={theme} />
      </div>
    </header>
  );
}
