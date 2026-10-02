import { expect, test } from "bun:test";
import { PITCH, metresToPct, metresToPctAt, mirroredAt, setPitchContext } from "./pitch-coords";

/**
 * Teams change ends at half-time.
 *
 * `attack_right` is one flag for the whole match, so any picture covering both
 * halves drew the second one backwards — a team's own shape laid over its
 * mirror image, which averages towards the middle and looks like a side that
 * played everywhere. The export marks the second period mirrored; these pin
 * down that we read it.
 */

const file = {
  pitch: { length: 105, width: 68 },
  attack_right: { A: true, B: false },
  frames: [],
  events: [],
  periods: [
    { t_start: 0, t_end: 2820 },
    { t_start: 3600, t_end: 6480, mirrored: true },
  ],
} as never;

test("knows which half a moment is in", () => {
  expect(mirroredAt(file, 1200)).toBe(false);
  expect(mirroredAt(file, 4000)).toBe(true);
  expect(mirroredAt(undefined, 4000)).toBe(false);
});

test("turns the second half round so both halves share an end", () => {
  setPitchContext(file);
  // A ball 84 m up the pitch is 80% of the way towards the goal we attack.
  const first = metresToPctAt([84, 17], "A", 1200, file);
  expect(first!.x).toBeCloseTo(80, 5);

  // The same metres in the second half are at the other end, because the
  // teams have swapped. Drawn our way round, that is 20%.
  const second = metresToPctAt([84, 17], "A", 4000, file);
  expect(second!.x).toBeCloseTo(20, 5);
  expect(second!.y).toBeCloseTo(75, 5);
});

test("the half-blind conversion is what smeared the maps", () => {
  setPitchContext(file);
  const blind = metresToPct([84, 17], "A");
  const aware = metresToPctAt([84, 17], "A", 4000, file);
  expect(blind!.x).toBeCloseTo(80, 5);
  expect(aware!.x).not.toBeCloseTo(blind!.x, 1);
});

test("a side attacking left still reads left to right", () => {
  setPitchContext(file);
  expect(PITCH.attackRight["B"]).toBe(false);
  // B attacks the other way, so 84 m in raw metres is only 20% of B's journey.
  expect(metresToPct([84, 17], "B")!.x).toBeCloseTo(20, 5);
});

test("without periods nothing is flipped", () => {
  const noPeriods = { pitch: { length: 105, width: 68 }, frames: [], events: [] } as never;
  setPitchContext(noPeriods);
  expect(metresToPctAt([84, 17], "A", 4000, noPeriods)!.x).toBeCloseTo(80, 5);
});
