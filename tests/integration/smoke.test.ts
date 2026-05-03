import { describe, expect, it } from "vitest";
import { testDb } from "../test-db";
import { makeUser, seedDefaultGoals } from "../factories";

describe("integration smoke", () => {
  it("can create a user, seed goals, and query them", async () => {
    const userId = await makeUser();
    await seedDefaultGoals(userId);
    const goals = await testDb.goal.findMany({ where: { userId } });
    expect(goals).toHaveLength(19);
  });
});
