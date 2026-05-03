import { afterAll, beforeEach } from "vitest";
import { resetTestDb, closeTestDb } from "./test-db";

beforeEach(async () => {
  await resetTestDb();
});

afterAll(async () => {
  await closeTestDb();
});
