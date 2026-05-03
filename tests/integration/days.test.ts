import { describe, expect, it } from "vitest";
import { makeUser } from "../factories";
import {
  setNotes,
  setHealthFlag,
  setWin,
  setFinance,
  setDisconnect,
} from "@/server/actions/days";
import { getDayOrEmpty } from "@/server/queries/days";

const TODAY = "2026-05-02";

describe("day actions", () => {
  it("getDayOrEmpty returns a default record for a missing day", async () => {
    const u = await makeUser();
    const d = await getDayOrEmpty(u, TODAY);
    expect(d.notes).toBe("");
    expect(d.disconnect).toBe(0);
    expect(d.health).toEqual({});
  });

  it("setNotes upserts and getDayOrEmpty roundtrips", async () => {
    const u = await makeUser();
    await setNotes({ userId: u, iso: TODAY, notes: "Felt anxious about the demo." });
    const d = await getDayOrEmpty(u, TODAY);
    expect(d.notes).toBe("Felt anxious about the demo.");
  });

  it("setHealthFlag merges flags rather than overwriting", async () => {
    const u = await makeUser();
    await setHealthFlag({ userId: u, iso: TODAY, key: "slept", value: true });
    await setHealthFlag({ userId: u, iso: TODAY, key: "moved", value: true });
    const d = await getDayOrEmpty(u, TODAY);
    expect(d.health).toEqual({ slept: true, moved: true });
  });

  it("setWin and setFinance persist scalar/string values", async () => {
    const u = await makeUser();
    await setWin({ userId: u, iso: TODAY, win: "Shipped Phase 2." });
    await setFinance({ userId: u, iso: TODAY, fin: { net: "$1.2M", cash: "$50K", invest: "$1.1M" } });
    const d = await getDayOrEmpty(u, TODAY);
    expect(d.win).toBe("Shipped Phase 2.");
    expect(d.fin).toEqual({ net: "$1.2M", cash: "$50K", invest: "$1.1M" });
  });

  it("setDisconnect — set absolute", async () => {
    const u = await makeUser();
    await setDisconnect({ userId: u, iso: TODAY, minutes: 45 });
    const d = await getDayOrEmpty(u, TODAY);
    expect(d.disconnect).toBe(45);
  });

  it("rejects notes longer than 50k chars", async () => {
    const u = await makeUser();
    await expect(setNotes({ userId: u, iso: TODAY, notes: "x".repeat(50_001) }))
      .rejects.toThrow();
  });
});
