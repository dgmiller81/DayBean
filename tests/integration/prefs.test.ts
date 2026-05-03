import { describe, expect, it } from "vitest";
import { makeUser } from "../factories";
import { setTheme, setFilter } from "@/server/actions/prefs";
import { getPref } from "@/server/queries/prefs";

describe("pref actions", () => {
  it("setTheme persists and getPref reflects", async () => {
    const u = await makeUser();
    expect((await getPref(u)).theme).toBe("light");
    await setTheme({ userId: u, theme: "dark" });
    expect((await getPref(u)).theme).toBe("dark");
  });

  it("setFilter accepts only the four valid values", async () => {
    const u = await makeUser();
    await setFilter({ userId: u, filter: "business" });
    expect((await getPref(u)).filter).toBe("business");
    // @ts-expect-error invalid value
    await expect(setFilter({ userId: u, filter: "garbage" })).rejects.toThrow();
  });
});
