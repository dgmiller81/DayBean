import { describe, expect, it } from "vitest";
import {
  parseGoalsJson,
  serializeGoalsJson,
  parseHealthJson,
  parseFinJson,
  parseStringList,
  serializeStringList,
} from "@/server/json";

describe("json helpers", () => {
  it("parseGoalsJson rejects malformed and array inputs", () => {
    expect(parseGoalsJson("")).toEqual({});
    expect(parseGoalsJson("not json")).toEqual({});
    expect(parseGoalsJson("null")).toEqual({});
    expect(parseGoalsJson("[]")).toEqual({});
  });

  it("goals round-trip", () => {
    const v = { "u::g_god": true, "u::g_learn": 2, "u::g_disconnect": 45 };
    expect(parseGoalsJson(serializeGoalsJson(v))).toEqual(v);
  });

  it("health and finance default to empty objects on bad input", () => {
    expect(parseHealthJson("")).toEqual({});
    expect(parseFinJson("garbage")).toEqual({});
  });

  it("string list filters non-strings and tolerates null", () => {
    expect(parseStringList(null)).toEqual([]);
    expect(parseStringList(undefined)).toEqual([]);
    expect(parseStringList(serializeStringList(["ai", "ml"]))).toEqual(["ai", "ml"]);
    expect(parseStringList(JSON.stringify(["ok", 7, null, "fine"]))).toEqual(["ok", "fine"]);
  });
});
