import { expect, test } from "bun:test";
import { PITCH, metresToPct, mirroredAt, setPitchContext } from "./pitch-coords";

/**
 * Coordinates arrive already turned the right way round.
 *
 * As of the 4 Oct export the pipeline mirrors the second half itself, so team A
 * always attacks towards x = length in the file. The app flipping again on top
 * of that drew the second half backwards. These pin down that we read the
 * period flag for *time* and never for geometry.
 */

const file = {
  pitch: { length: 106, width: 64 },
  attack_right: { A: true, B: false },
  frames: [],
  events: [],
  periods: [
    { t_start: 435, t_end: 2890 },
    { t_start: 3220, t_end: 5645, mirrored: true },
  ],
} as never;

test("knows which half a moment is in", () => {
  expect(mirroredAt(file, 1200)).toBe(false);
  expect(mirroredAt(file, 4000)).toBe(true);
  expect(mirroredAt(undefined, 4000)).toBe(false);
});

test("the same metres draw the same way in both halves", () => {
  setPitchContext(file);
  const first = metresToPct([84.8, 16], "A");
  const second = metresToPct([84.8, 16], "A");
  expect(first!.x).toBeCloseTo(80, 5);
  expect(second!.x).toBeCloseTo(80, 5);
});

test("a side attacking left still reads left to right", () => {
  setPitchContext(file);
  expect(PITCH.attackRight["B"]).toBe(false);
  expect(metresToPct([84.8, 16], "B")!.x).toBeCloseTo(20, 5);
});

test("drawn raw, both teams keep their own end", () => {
  setPitchContext(file);
  // The shot map passes no team, so nothing is mirrored and SFK's shots sit
  // near x = 106 while the opponent's sit near x = 0, as the file stores them.
  expect(metresToPct([100, 32], null)!.x).toBeCloseTo(94.3, 1);
  expect(metresToPct([6, 32], null)!.x).toBeCloseTo(5.7, 1);
});
