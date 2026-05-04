import { describe, it, expect } from "vitest";
import { testDb } from "../test-db";
import { fixtureFor } from "@/lib/daily-content-fixture";
import { dedupeContent } from "@/lib/dedupe-content";
import { setDailyContent } from "@/server/actions/daily-content";
import { DailyContentValidationError } from "@/server/errors/daily-content";
import { getDailyContent, getDailyContentWithMeta } from "@/server/queries/daily-content";
import { makeUser } from "../factories";

const ISO = "2026-05-02";

describe("setDailyContent — validation", () => {
  it("rejects malformed date format", async () => {
    const userId = await makeUser("u_baddate");
    const bad = { ...fixtureFor(ISO), date: "May 2" };
    await expect(setDailyContent(userId, ISO, bad)).rejects.toBeInstanceOf(
      DailyContentValidationError,
    );
    expect(await testDb.dailyContent.count()).toBe(0);
  });

  it("rejects when god.prayer is missing", async () => {
    const userId = await makeUser("u_missing");
    const bad = fixtureFor(ISO) as unknown as { god: { prayer?: string } };
    delete bad.god.prayer;
    await expect(setDailyContent(userId, ISO, bad)).rejects.toThrow(/god\.prayer/);
  });

  // URL well-formedness is intentionally NOT enforced by the Zod schema
  // (see DailyContentSchema's note — OpenAI structured outputs reject
  // `format: 'uri'`). Render-time anchor handling tolerates bad URLs.
  it("accepts non-URL strings in url fields", async () => {
    const userId = await makeUser("u_url");
    const lax = fixtureFor(ISO);
    lax.mindfulness.articles[0].url = "not a url";
    await expect(setDailyContent(userId, ISO, lax)).resolves.toBeDefined();
  });

  it("rejects when payload.date does not match the iso row key", async () => {
    const userId = await makeUser("u_mismatch");
    const stale = fixtureFor("2026-05-01");
    await expect(setDailyContent(userId, ISO, stale)).rejects.toThrow(/does not match/);
  });
});

describe("setDailyContent — round trip", () => {
  it("writes a valid payload and reads it back identical", async () => {
    const userId = await makeUser("u_roundtrip");
    const fixture = fixtureFor(ISO);
    const written = await setDailyContent(userId, ISO, fixture);
    expect(written).toEqual(fixture);

    const row = await testDb.dailyContent.findUnique({
      where: { userId_iso: { userId, iso: ISO } },
    });
    expect(row).not.toBeNull();
    expect(row!.source).toBe("manual");

    const readBack = await getDailyContent(userId, ISO);
    // Read path applies dedupeContent — compare against the deduped form.
    expect(readBack).toEqual(dedupeContent(fixture));
  });

  it("upserts on second write (single row per user-day)", async () => {
    const userId = await makeUser("u_upsert");
    const a = fixtureFor(ISO);
    const b = { ...fixtureFor(ISO), subhead: "edited subhead" };

    await setDailyContent(userId, ISO, a);
    await setDailyContent(userId, ISO, b);

    expect(await testDb.dailyContent.count({ where: { userId } })).toBe(1);
    const readBack = await getDailyContent(userId, ISO);
    expect(readBack.subhead).toBe("edited subhead");
  });

  it("records source='llm' when called from the LLM path", async () => {
    const userId = await makeUser("u_llm");
    await setDailyContent(userId, ISO, fixtureFor(ISO), "llm");
    const row = await testDb.dailyContent.findUniqueOrThrow({
      where: { userId_iso: { userId, iso: ISO } },
    });
    expect(row.source).toBe("llm");
  });
});

describe("getDailyContent / getDailyContentWithMeta — fallback", () => {
  it("returns the fixture when no row exists, with source='fixture'", async () => {
    const userId = await makeUser("u_nofallback");
    const meta = await getDailyContentWithMeta(userId, ISO);
    expect(meta.source).toBe("fixture");
    expect(meta.content).toEqual(dedupeContent(fixtureFor(ISO)));
  });

  it("returns the DB row when one exists, with source='primary'", async () => {
    const userId = await makeUser("u_dbhit");
    const custom = { ...fixtureFor(ISO), subhead: "from DB" };
    await setDailyContent(userId, ISO, custom, "manual");
    const meta = await getDailyContentWithMeta(userId, ISO);
    expect(meta.source).toBe("primary");
    expect(meta.content.subhead).toBe("from DB");
  });

  it("isolates rows per user", async () => {
    const a = await makeUser("u_a");
    const b = await makeUser("u_b");
    const customA = { ...fixtureFor(ISO), subhead: "A's content" };
    await setDailyContent(a, ISO, customA);

    const metaA = await getDailyContentWithMeta(a, ISO);
    const metaB = await getDailyContentWithMeta(b, ISO);
    expect(metaA.source).toBe("primary");
    expect(metaA.content.subhead).toBe("A's content");
    expect(metaB.source).toBe("fixture");
  });

  it("falls back to fixture when stored JSON is corrupt", async () => {
    const userId = await makeUser("u_corrupt");
    await testDb.dailyContent.create({
      data: {
        userId,
        iso: ISO,
        contentJson: "not valid json {{{",
        source: "manual",
      },
    });
    const meta = await getDailyContentWithMeta(userId, ISO);
    expect(meta.source).toBe("fixture");
    expect(meta.content).toEqual(dedupeContent(fixtureFor(ISO)));
  });
});
