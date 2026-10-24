import { expect, test } from "bun:test";
import { statsTakeaway, type TakeawayInput } from "./stats-takeaway";

const input: TakeawayInput = { tab: "passes", name: "SFK", team: "A", frames: [], passes: [], events: [], shots: [], heights: [] };

test("ungraded passes are excluded from completion denominator", () => {
  const result = statsTakeaway({ ...input, passes: [{ completed: true }, { completed: false }, {}] });
  expect(result.headline).toContain("1 of 2 graded passes (50%)");
});

test("possession uses selected team rather than event order", () => {
  const frames = ["A", "B", "B", null].map((possession, t) => ({ t, possession, players: [] })) as TakeawayInput["frames"];
  expect(statsTakeaway({ ...input, tab: "ball", team: "B", frames }).headline).toContain("67%");
});

test("defensive line median handles an even number of real samples", () => {
  expect(statsTakeaway({ ...input, tab: "shape", heights: [11, 59, 34, 36] }).headline).toContain("35.0 m");
});

test("no evidence does not produce a zero-performance claim", () => {
  expect(statsTakeaway(input).headline).toContain("isn't enough measured evidence");
});