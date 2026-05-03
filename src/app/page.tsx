import { cookies } from "next/headers";
import { Topbar } from "@/components/Topbar";
import { Hero } from "@/components/Hero";
import { Tabs } from "@/components/Tabs";
import { MindfulnessPanel } from "@/components/panels/MindfulnessPanel";
import { BusinessPanel } from "@/components/panels/BusinessPanel";
import { PersonalPanel } from "@/components/panels/PersonalPanel";
import { OverviewPanel } from "@/components/panels/OverviewPanel";
import { todayISO } from "@/lib/dates";
import { db } from "@/server/db";
import type { Tab } from "@/components/Tabs";

export default async function Page() {
  const c = await cookies();
  const theme: "light" | "dark" = c.get("mm_theme")?.value === "dark" ? "dark" : "light";
  const tab = (c.get("mm_tab")?.value as Tab | undefined) ?? "mindfulness";

  // Single-user local default — Phase 7 generalizes this
  const user = await db.user.findUnique({ where: { id: "local-default" } });
  const name = user?.name ?? "Friend";

  return (
    <main className="app">
      <Topbar theme={theme} name={name} />
      <Hero name={name} iso={todayISO()} sub="A fresh page." />
      <Tabs
        initial={tab}
        mindfulnessPanel={<MindfulnessPanel />}
        businessPanel={<BusinessPanel />}
        personalPanel={<PersonalPanel />}
        overviewPanel={<OverviewPanel />}
      />
      <footer
        className="serif"
        style={{
          marginTop: 48,
          textAlign: "center",
          color: "var(--ink-muted)",
          fontStyle: "italic",
          lineHeight: 1.7,
        }}
      >
        I am here. I am enough. I am loved. I am loving.
        <br />
        I am exactly where I need to be.
      </footer>
    </main>
  );
}
