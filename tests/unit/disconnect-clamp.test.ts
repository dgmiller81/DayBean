import { describe, expect, it } from "vitest";
import { subtractFloor, clampNonNegative } from "@/lib/clamp";

describe("subtractFloor", () => {
  it("subtracts when result is positive", () => {
    expect(subtractFloor(60, 15)).toBe(45);
  });
  it("returns 0 when subtracting more than current", () => {
    expect(subtractFloor(10, 15)).toBe(0);
  });
  it("returns 0 when current is 0", () => {
    expect(subtractFloor(0, 15)).toBe(0);
  });
});

describe("clampNonNegative", () => {
  it("returns 0 for negatives", () => {
    expect(clampNonNegative(-5)).toBe(0);
  });
  it("returns the value for non-negatives", () => {
    expect(clampNonNegative(7)).toBe(7);
  });
});
