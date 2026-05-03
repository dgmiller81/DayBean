import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const DEFAULTS: Array<{ id: string; section: string; title: string; type: string; target: number }> = [
  { id: "g_god", section: "mindfulness", title: "Time with God / prayer", type: "check", target: 1 },
  { id: "g_meditate", section: "mindfulness", title: "Meditate (5+ minutes)", type: "check", target: 1 },
  { id: "g_present_kids", section: "mindfulness", title: "Be fully present with my kids", type: "check", target: 1 },
  { id: "g_family", section: "mindfulness", title: "Connect with family or a friend", type: "check", target: 1 },
  { id: "g_no_overcommit", section: "mindfulness", title: "Said no to something I should have", type: "check", target: 1 },
  { id: "g_selfless", section: "mindfulness", title: "One selfless act today", type: "check", target: 1 },
  { id: "g_walk", section: "mindfulness", title: "Walk the dogs without my phone", type: "check", target: 1 },
  { id: "g_mf_read", section: "mindfulness", title: "Read 1 mindfulness article", type: "count", target: 1 },
  { id: "g_learn", section: "business", title: "Continuous improvement — read 3+ AI articles", type: "count", target: 3 },
  { id: "g_strategy", section: "business", title: "30 min on AI strategy & competitive scanning", type: "check", target: 1 },
  { id: "g_customer", section: "business", title: "Talk to a customer (call, email, shadow)", type: "check", target: 1 },
  { id: "g_product", section: "business", title: "Move the top product bet forward by one step", type: "check", target: 1 },
  { id: "g_team", section: "business", title: "Unblock or coach one teammate", type: "check", target: 1 },
  { id: "g_demos", section: "business", title: "Try one new AI tool / model / agent", type: "check", target: 1 },
  { id: "g_money", section: "personal", title: "Check finances", type: "check", target: 1 },
  { id: "g_move", section: "personal", title: "Move 30 minutes", type: "check", target: 1 },
  { id: "g_disconnect", section: "personal", title: "Disconnect 60 minutes", type: "time", target: 60 },
  { id: "g_writing", section: "personal", title: "Write something (memo, doc, post, journal)", type: "check", target: 1 },
  { id: "g_per_read", section: "personal", title: "Read 1 self-help / motivation article", type: "count", target: 1 },
];

async function main() {
  // Single-user local default
  const user = await db.user.upsert({
    where: { id: "local-default" },
    update: {},
    create: { id: "local-default", name: "You" },
  });

  await db.pref.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  for (const g of DEFAULTS) {
    await db.goal.upsert({
      where: { id: `${user.id}::${g.id}` },
      update: {},
      create: {
        id: `${user.id}::${g.id}`,
        userId: user.id,
        section: g.section,
        title: g.title,
        type: g.type,
        target: g.target,
        isDefault: true,
      },
    });
  }

  console.log("Seeded default user + goals.");
}

main().finally(() => db.$disconnect());
