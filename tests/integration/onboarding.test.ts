import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { testDb } from "../test-db";
import { makeUser } from "../factories";

// --- Mocks for the action's runtime deps -----------------------------------
// completeOnboardingAction calls:
//   - getCurrentUserId() → must resolve to our test user id
//   - cookies()          → only used when `theme` is in the FormData; we stub
//                          a minimal API so c.set() is a no-op
//   - redirect("/")       → throws a NEXT_REDIRECT-style error; we mirror the
//                          real Next.js shape so the action's last line is
//                          observable from the test
//   - refreshDailyContent → returns no-credential early in tests because no
//                          LlmCredential rows are seeded and no env override
//                          exists; the action also catches any throw, so this
//                          is harmless either way

const currentUserIdMock = vi.fn() as Mock<() => Promise<string>>;
vi.mock("@/server/auth-context", () => ({
  getCurrentUserId: () => currentUserIdMock(),
  getCurrentUserIdOrNull: () => currentUserIdMock(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    set: () => {},
    get: () => undefined,
    delete: () => {},
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    const err = new Error(`NEXT_REDIRECT;${path}`);
    (err as { digest?: string }).digest = `NEXT_REDIRECT;${path}`;
    throw err;
  },
}));

// Imported AFTER mocks are registered.
import { completeOnboardingAction } from "@/server/actions/onboarding";

function isRedirect(e: unknown): boolean {
  return (
    !!e &&
    typeof e === "object" &&
    "digest" in e &&
    typeof (e as { digest?: unknown }).digest === "string" &&
    (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

/**
 * Drive the action with a FormData payload. The action throws NEXT_REDIRECT on
 * success — we swallow that and return either the action's `{ error }` value
 * (validation failure path) or null (success).
 */
async function run(
  fd: FormData,
): Promise<{ error?: string } | null | "redirected"> {
  try {
    return await completeOnboardingAction(null, fd);
  } catch (e) {
    if (isRedirect(e)) return "redirected";
    throw e;
  }
}

function fdFrom(obj: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(obj)) fd.set(k, v);
  return fd;
}

describe("completeOnboardingAction — First Pour integration", () => {
  beforeEach(() => {
    currentUserIdMock.mockReset();
  });

  afterEach(() => {
    currentUserIdMock.mockReset();
  });

  it("happy path — full payload populates User + Pref", async () => {
    const userId = await makeUser("u_full");
    currentUserIdMock.mockResolvedValue(userId);

    const fd = fdFrom({
      name: "Ada Lovelace",
      jobTitle: "Founder",
      industry: "Software",
      companyStage: "seed",
      hobbies: "woodworking, japanese, piano",
      livesWith: "partner, kids",
      faith: "christian",
      scripturePref: "ESV",
      theme: "dark",
      refreshHour: "5",
      bgImageUrl: "https://example.com/bg.jpg",
    });

    const result = await run(fd);
    expect(result).toBe("redirected");

    const user = await testDb.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.name).toBe("Ada Lovelace");
    expect(user.onboardedAt).not.toBeNull();

    const pref = await testDb.pref.findUniqueOrThrow({ where: { userId } });
    expect(pref.jobTitle).toBe("Founder");
    expect(pref.industry).toBe("Software");
    expect(pref.companyStage).toBe("seed");
    expect(JSON.parse(pref.hobbies!)).toEqual([
      "woodworking",
      "japanese",
      "piano",
    ]);
    expect(JSON.parse(pref.livesWith!)).toEqual(["partner", "kids"]);
    expect(pref.faith).toBe("christian");
    expect(pref.scripturePref).toBe("ESV");
    expect(pref.refreshHour).toBe(5);
    expect(pref.bgImageUrl).toBe("https://example.com/bg.jpg");
  });

  it("skip-everything path — only `name`, optional fields stay null/empty", async () => {
    const userId = await makeUser("u_skip");
    currentUserIdMock.mockResolvedValue(userId);

    const fd = fdFrom({ name: "Just A Name" });
    const result = await run(fd);
    expect(result).toBe("redirected");

    const user = await testDb.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.name).toBe("Just A Name");
    expect(user.onboardedAt).not.toBeNull();

    const pref = await testDb.pref.findUniqueOrThrow({ where: { userId } });
    expect(pref.jobTitle).toBeNull();
    expect(pref.industry).toBeNull();
    expect(pref.companyStage).toBeNull();
    expect(pref.hobbies).toBeNull();
    expect(pref.livesWith).toBeNull();
    // Empty / missing faith collapses to "none" per the action's resolution rule.
    expect(pref.faith).toBe("none");
    expect(pref.scripturePref).toBeNull();
    expect(pref.bgImageUrl).toBeNull();
  });

  it("faith=custom — stores the custom string as the faith value", async () => {
    const userId = await makeUser("u_custom");
    currentUserIdMock.mockResolvedValue(userId);

    const fd = fdFrom({
      name: "Friend",
      faith: "custom",
      faithCustom: "Quaker",
    });
    const result = await run(fd);
    expect(result).toBe("redirected");

    const pref = await testDb.pref.findUniqueOrThrow({ where: { userId } });
    expect(pref.faith).toBe("Quaker");
    // scripturePref is only persisted for faith === "christian"
    expect(pref.scripturePref).toBeNull();
  });

  it("faith=secular — collapses to 'none'", async () => {
    const userId = await makeUser("u_secular");
    currentUserIdMock.mockResolvedValue(userId);

    const fd = fdFrom({ name: "Sec", faith: "secular" });
    const result = await run(fd);
    expect(result).toBe("redirected");

    const pref = await testDb.pref.findUniqueOrThrow({ where: { userId } });
    expect(pref.faith).toBe("none");
  });

  it("validation error — missing `name` returns { error } and does NOT mutate", async () => {
    const userId = await makeUser("u_invalid");
    currentUserIdMock.mockResolvedValue(userId);

    // No `name` field at all.
    const fd = fdFrom({ jobTitle: "Engineer" });
    const result = await run(fd);

    expect(result).not.toBe("redirected");
    expect(result).toMatchObject({ error: expect.any(String) });

    const user = await testDb.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.onboardedAt).toBeNull();
    // makeUser pre-creates a Pref row; the failed action must not have written
    // jobTitle onto it.
    const pref = await testDb.pref.findUniqueOrThrow({ where: { userId } });
    expect(pref.jobTitle).toBeNull();
  });

  it("livesWith filter — bogus values are stripped before persisting", async () => {
    const userId = await makeUser("u_lw");
    currentUserIdMock.mockResolvedValue(userId);

    // The action's parseTagList → VALID_HOUSEHOLD filter drops `bogus`.
    const fd = fdFrom({
      name: "House",
      livesWith: "partner, kids, bogus, parents",
    });
    const result = await run(fd);
    expect(result).toBe("redirected");

    const pref = await testDb.pref.findUniqueOrThrow({ where: { userId } });
    const persisted = JSON.parse(pref.livesWith!);
    expect(persisted).toEqual(["partner", "kids", "parents"]);
    expect(persisted).not.toContain("bogus");
  });
});
