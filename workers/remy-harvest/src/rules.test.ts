import { describe, expect, test } from "bun:test";
import { MAX_PER_CATCH, OFFENSIVE_AT, QUESTIONS, decodeName, nameKey, normalizeName, screenName, validateSubmission } from "./rules";

const run = (caught: number, extra: Record<string, unknown> = {}) => ({
  name: "Remy",
  score: caught * 10,
  caught,
  level: 1 + Math.floor(caught / 25),
  sisters: 0,
  ...extra,
});

describe("names", () => {
  test("normalizes spacing and width, keeps 2–16 letters/digits with light punctuation", () => {
    expect(normalizeName("  Corn   King ")).toBe("Corn King");
    expect(normalizeName("ＲＥＭＹ")).toBe("REMY");
    expect(normalizeName("O'Neil-Jr.")).toBe("O'Neil-Jr.");
    expect(normalizeName("Søren")).toBe("Søren");
    expect(normalizeName("x")).toBeNull();
    expect(normalizeName("a".repeat(17))).toBeNull();
    expect(normalizeName("<script>")).toBeNull();
    expect(normalizeName("--__--")).toBeNull();
    expect(normalizeName(42)).toBeNull();
  });

  test("leaderboard key ignores case and separators; decoding reads leetspeak through spacing", () => {
    expect(nameKey("Corn King")).toBe(nameKey("corn_king"));
    expect(decodeName("sh1t h3ad")).toBe("shithead");
  });
});

describe("submissions", () => {
  test("accepts a possible run", () => {
    expect(validateSubmission(run(149, { score: 4575, sisters: 2 }))).toEqual({
      name: "Remy",
      score: 4575,
      caught: 149,
      level: 6,
      sisters: 2,
    });
  });

  test("level must follow from the catches", () => {
    expect(validateSubmission(run(24, { level: 1 }))).not.toBeNull();
    expect(validateSubmission(run(25, { level: 1 }))).toBeNull();
    expect(validateSubmission(run(25, { level: 2 }))).not.toBeNull();
  });

  test("score can't beat every catch at the maximum plus the Three Sisters bonuses", () => {
    expect(validateSubmission(run(10, { score: 10 * MAX_PER_CATCH }))).not.toBeNull();
    expect(validateSubmission(run(10, { score: 10 * MAX_PER_CATCH + 1 }))).toBeNull();
    expect(validateSubmission(run(9, { score: 9 * MAX_PER_CATCH + 300, sisters: 1 }))).not.toBeNull();
    expect(validateSubmission(run(9, { sisters: 4 }))).toBeNull();
  });

  test("rejects non-integers, zero scores and junk", () => {
    expect(validateSubmission(run(10, { score: 10.5 }))).toBeNull();
    expect(validateSubmission(run(10, { score: 0 }))).toBeNull();
    expect(validateSubmission(run(10, { caught: "10" }))).toBeNull();
    expect(validateSubmission(null)).toBeNull();
  });
});

describe("clef-flash screen", () => {
  const answer = (p: Record<string, number>) => ({
    answers: Object.fromEntries(Object.keys(QUESTIONS).map((id) => [id, { type: "noul", noul: p[id] ?? 0.05 }])),
  });

  test("refuses when any category in either reading reaches the threshold", async () => {
    let call = 0;
    const verdict = await screenName(async () => (call++ === 0 ? answer({}) : answer({ slur: OFFENSIVE_AT })), "inj un");
    expect(verdict).toEqual({ ok: false, p: OFFENSIVE_AT, worst: "slur" });
    expect((await screenName(async () => answer({ sexual: OFFENSIVE_AT - 0.01 }), "Cassie")).ok).toBe(true);
  });

  test("sends the decoded spelling to the model", async () => {
    const states: unknown[] = [];
    await screenName(async (input) => {
      states.push(input.state);
      return answer({});
    }, "sh1t h3ad");
    expect(states).toContainEqual(expect.objectContaining({ letters_only: "shithead" }));
  });

  test("retries a failed call once, then throws instead of passing an unscreened name", async () => {
    let calls = 0;
    const flaky = async () => {
      if (calls++ === 0) throw new Error("3040: Capacity temporarily exceeded");
      return answer({});
    };
    expect((await screenName(flaky, "Remy")).ok).toBe(true);
    await expect(screenName(async () => ({ answers: {} }), "Remy")).rejects.toThrow("no slur answer");
    await expect(
      screenName(async () => {
        throw new Error("down");
      }, "Remy"),
    ).rejects.toThrow("down");
  });
});
