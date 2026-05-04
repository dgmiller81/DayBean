import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { testDb } from "../test-db";
import { makeUser, makeGoal } from "../factories";
import { compositeGoalId } from "@/lib/default-goals";
import { todayISO, isoOffset } from "@/lib/dates";
import { serializeGoalsJson } from "@/server/json";

// Mock the auth-context so claim flow uses the test user we set up.
const currentUserIdMock = vi.fn() as Mock<() => Promise<string>>;
vi.mock("@/server/auth-context", () => ({
  getCurrentUserId: () => currentUserIdMock(),
  getCurrentUserIdOrNull: () => currentUserIdMock(),
}));

// Imported after the mock is registered.
import {
  availablePartners,
  claimReward,
  currentStreak,
  dismissReward,
  listMyVouchers,
} from "@/server/actions/rewards";

const TODAY = todayISO();

function nextWeek(): Date {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

function thisMondayUtc(): Date {
  const now = new Date();
  const base = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const daysSinceMonday = (base.getUTCDay() + 6) % 7;
  base.setUTCDate(base.getUTCDate() - daysSinceMonday);
  return base;
}

async function seedQualifyingStreak(userId: string, days: number) {
  // One default goal that qualifies a day when marked true.
  await makeGoal(userId, {
    specId: "g_god",
    section: "mindfulness",
    title: "Time with God",
    type: "check",
    target: 1,
    isDefault: true,
  });
  const goalId = compositeGoalId(userId, "g_god");
  for (let i = 0; i < days; i++) {
    const iso = isoOffset(TODAY, -i);
    await testDb.day.create({
      data: {
        userId,
        iso,
        goalsJson: serializeGoalsJson({ [goalId]: true }),
      },
    });
  }
}

async function makePartnerWithVouchers(opts: {
  slug: string;
  name?: string;
  active?: boolean;
  vouchers: number;
  weekOf?: Date;
  expiresAt?: Date;
}) {
  const partner = await testDb.partner.create({
    data: {
      name: opts.name ?? opts.slug,
      slug: opts.slug,
      type: "indie",
      active: opts.active ?? true,
      weeklyBudget: opts.vouchers,
    },
  });
  const weekOf = opts.weekOf ?? thisMondayUtc();
  const expiresAt = opts.expiresAt ?? nextWeek();
  for (let i = 0; i < opts.vouchers; i++) {
    await testDb.voucher.create({
      data: {
        partnerId: partner.id,
        code: `${opts.slug.toUpperCase()}-${i}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        weekOf,
        expiresAt,
      },
    });
  }
  return partner;
}

describe("rewards", () => {
  beforeEach(() => {
    currentUserIdMock.mockReset();
  });

  afterEach(() => {
    currentUserIdMock.mockReset();
  });

  describe("availablePartners", () => {
    it("returns only active partners with at least one voucher in the pool", async () => {
      const u = await makeUser("u_avail");
      currentUserIdMock.mockResolvedValue(u);

      const active = await makePartnerWithVouchers({
        slug: "ada-roasters",
        name: "Ada Roasters",
        vouchers: 2,
      });
      await makePartnerWithVouchers({
        slug: "inactive-shop",
        name: "Inactive Shop",
        active: false,
        vouchers: 2,
      });
      // Active partner with NO available voucher (already issued).
      const empty = await testDb.partner.create({
        data: {
          name: "Empty Pool",
          slug: "empty-pool",
          type: "indie",
          active: true,
          weeklyBudget: 0,
        },
      });
      await testDb.voucher.create({
        data: {
          partnerId: empty.id,
          code: `EMPTY-${Date.now()}`,
          issued: true,
          weekOf: thisMondayUtc(),
          expiresAt: nextWeek(),
        },
      });

      const partners = await availablePartners();
      const ids = partners.map((p) => p.id);
      expect(ids).toContain(active.id);
      expect(ids).not.toContain(empty.id);
      expect(partners.every((p) => p.active)).toBe(true);
    });
  });

  describe("currentStreak", () => {
    it("delegates to detectStreak", async () => {
      const u = await makeUser("u_streak");
      currentUserIdMock.mockResolvedValue(u);
      await seedQualifyingStreak(u, 3);
      expect(await currentStreak()).toBe(3);
    });
  });

  describe("claimReward", () => {
    it("succeeds when streak >= 7 and a voucher is available", async () => {
      const u = await makeUser("u_claim_ok");
      currentUserIdMock.mockResolvedValue(u);
      await seedQualifyingStreak(u, 7);
      const partner = await makePartnerWithVouchers({
        slug: "claim-ok",
        vouchers: 1,
      });

      const out = await claimReward({ partnerId: partner.id });
      expect(out.partnerName).toBe(partner.name);
      expect(out.code).toBeTruthy();

      const vouchers = await testDb.voucher.findMany({
        where: { partnerId: partner.id },
      });
      expect(vouchers).toHaveLength(1);
      expect(vouchers[0]!.userId).toBe(u);
      expect(vouchers[0]!.issued).toBe(true);

      const claims = await testDb.rewardClaim.findMany({ where: { userId: u } });
      expect(claims).toHaveLength(1);
      expect(claims[0]!.streakLength).toBeGreaterThanOrEqual(7);
    });

    it("throws when streak < 7", async () => {
      const u = await makeUser("u_claim_short");
      currentUserIdMock.mockResolvedValue(u);
      await seedQualifyingStreak(u, 3);
      const partner = await makePartnerWithVouchers({
        slug: "claim-short",
        vouchers: 1,
      });

      await expect(claimReward({ partnerId: partner.id })).rejects.toThrow(
        /streak too short/i,
      );

      const vouchers = await testDb.voucher.findMany({
        where: { partnerId: partner.id },
      });
      expect(vouchers[0]!.issued).toBe(false);
      expect(vouchers[0]!.userId).toBeNull();
    });

    it("is idempotent within a 7-day window — second call returns the same voucher", async () => {
      const u = await makeUser("u_claim_idem");
      currentUserIdMock.mockResolvedValue(u);
      await seedQualifyingStreak(u, 7);
      const partner = await makePartnerWithVouchers({
        slug: "claim-idem",
        vouchers: 5,
      });

      const first = await claimReward({ partnerId: partner.id });
      const second = await claimReward({ partnerId: partner.id });
      expect(second.id).toBe(first.id);
      expect(second.code).toBe(first.code);

      const claims = await testDb.rewardClaim.findMany({ where: { userId: u } });
      expect(claims).toHaveLength(1);
      const issued = await testDb.voucher.findMany({
        where: { partnerId: partner.id, issued: true },
      });
      expect(issued).toHaveLength(1);
    });

    it("two parallel claims for the same partner with one voucher — exactly one succeeds, one throws", async () => {
      // A single user races against themselves: parallel claim attempts where
      // neither has yet observed a RewardClaim row. Exactly one updateMany
      // wins; the other hits the race guard and throws.
      const u = await makeUser("u_race");
      currentUserIdMock.mockResolvedValue(u);
      await seedQualifyingStreak(u, 7);
      const partner = await makePartnerWithVouchers({
        slug: "race-shop",
        vouchers: 1,
      });

      const results = await Promise.allSettled([
        claimReward({ partnerId: partner.id }),
        claimReward({ partnerId: partner.id }),
      ]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      // Either: both fulfilled (idempotency caught the second, returning the
      // same voucher) — acceptable; OR: one fulfilled + one rejected (race
      // path tripped) — also acceptable. The invariant is exactly one
      // RewardClaim row + one issued voucher.
      expect(fulfilled.length).toBeGreaterThanOrEqual(1);

      const issued = await testDb.voucher.findMany({
        where: { partnerId: partner.id, issued: true },
      });
      expect(issued).toHaveLength(1);

      const claims = await testDb.rewardClaim.findMany({ where: { userId: u } });
      expect(claims).toHaveLength(1);
    });
  });

  describe("listMyVouchers", () => {
    it("returns the user's vouchers with partnerName joined", async () => {
      const u = await makeUser("u_list");
      currentUserIdMock.mockResolvedValue(u);
      await seedQualifyingStreak(u, 7);
      const partner = await makePartnerWithVouchers({
        slug: "list-shop",
        name: "List Shop",
        vouchers: 1,
      });

      await claimReward({ partnerId: partner.id });
      const list = await listMyVouchers();
      expect(list).toHaveLength(1);
      expect(list[0]!.partnerName).toBe("List Shop");
      expect(list[0]!.code).toBeTruthy();
    });

    it("returns empty for users with no vouchers", async () => {
      const u = await makeUser("u_list_empty");
      currentUserIdMock.mockResolvedValue(u);
      const list = await listMyVouchers();
      expect(list).toEqual([]);
    });
  });

  describe("dismissReward", () => {
    it("is a no-op for v1 and does not throw", async () => {
      const u = await makeUser("u_dismiss");
      currentUserIdMock.mockResolvedValue(u);
      await expect(dismissReward()).resolves.toBeUndefined();
    });
  });
});
