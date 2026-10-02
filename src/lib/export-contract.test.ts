import { expect, test } from "bun:test";
import {
  completionOf,
  finalThirdEntries,
  passCompleted,
  periodWindow,
  shotsOf,
} from "./export-contract";

/**
 * These are the failures that never threw.
 *
 * Each one produced a plausible number from a field the export does not write,
 * which is why they survived so long: a shot map where every shot sat at the
 * same spot, a completion rate that rose as the pipeline learned less, a
 * final-third count that had read a missing key since the day it was added.
 */

/* ---------------- shots ---------------- */

test("reads shot positions in metres as well as percent", () => {
  const stats = {
    pitch: { length: 105, width: 68 },
    metrics: {
      shots: [
        { team: "A", x_m: 94.5, y_m: 34, outcome: "goal" },
        { team: "A", x: 50, y: 50, on_target: true },
      ],
    },
  } as never;

  const [metres, percent] = shotsOf(stats);
  // 94.5 m along a 105 m pitch is 90% of the way, not "94.5%".
  expect(metres!.x).toBeCloseTo(90, 5);
  expect(metres!.y).toBeCloseTo(50, 5);
  expect(percent!.x).toBe(50);
});

test("reads the outcome word as well as the booleans", () => {
  const stats = {
    metrics: {
      shots: [
        { team: "A", x_m: 90, y_m: 34, outcome: "goal" },
        { team: "A", x_m: 80, y_m: 30, outcome: "saved" },
        { team: "B", x_m: 20, y_m: 30, outcome: "off_target" },
        { team: "A", x: 70, y: 40, goal: true },
      ],
    },
  } as never;

  const a = shotsOf(stats, "A");
  expect(a).toHaveLength(3);
  expect(a.filter((s) => s.goal)).toHaveLength(2);
  expect(a.filter((s) => s.onTarget)).toHaveLength(3);
  expect(shotsOf(stats, "B")[0]!.onTarget).toBe(false);
});

test("a shot with no position stays unplaced rather than taking a default", () => {
  const stats = { metrics: { shots: [{ team: "A", outcome: "goal" }] } } as never;
  expect(shotsOf(stats)[0]!.x).toBeNull();
});

/* ---------------- passes ---------------- */

test("an unjudged pass is not a completed one", () => {
  expect(passCompleted({ quality: "unknown" })).toBeNull();
  expect(passCompleted({})).toBeNull();
  expect(passCompleted({ completed: false })).toBe(false);
  expect(passCompleted({ completed: true })).toBe(true);
  expect(passCompleted({ outcome: "intercepted" })).toBe(false);
  expect(passCompleted({ quality: "bad_lost" })).toBe(false);
});

test("completion is measured over the passes that were judged", () => {
  // The shape of a real export: most passes carry no verdict.
  const passes = [
    ...Array.from({ length: 911 }, () => ({ quality: "unknown" })),
    ...Array.from({ length: 800 }, () => ({ completed: true })),
    ...Array.from({ length: 232 }, () => ({ completed: false })),
  ];
  const result = completionOf(passes);

  expect(result.judged).toBe(1032);
  expect(result.unknown).toBe(911);
  // 800 of 1032, not 1711 of 1943 — the old rule counted every unknown as good.
  expect(result.pct).toBeCloseTo(77.5, 1);
  expect(result.pct).not.toBeCloseTo(88.1, 1);
});

test("completion is withheld when nothing was judged", () => {
  expect(completionOf([{ quality: "unknown" }]).pct).toBeNull();
});

/* ---------------- final third ---------------- */

test("counts the entries array, and still reads the old key", () => {
  const withArray = {
    metrics: { field: { A: { final_third_entries: [{ t: 1 }, { t: 2 }, { t: 3 }] } } },
  } as never;
  expect(finalThirdEntries(withArray, "A")).toBe(3);

  const withCount = { metrics: { field: { A: { entries_count: 7 } } } } as never;
  expect(finalThirdEntries(withCount, "A")).toBe(7);

  expect(finalThirdEntries({ metrics: { field: {} } } as never, "A")).toBeNull();
});

/* ---------------- periods ---------------- */

test("splits halves where the match actually split them", () => {
  const file = {
    periods: [
      { t_start: 0, t_end: 2820 },
      { t_start: 3600, t_end: 6480, mirrored: true },
    ],
  } as never;

  // A 47-minute first half: halving 6480 would file minute 46 in the second.
  expect(periodWindow(file, "1st", 6480)).toEqual([0, 2820]);
  expect(periodWindow(file, "2nd", 6480)).toEqual([3600, 6480]);
  expect(periodWindow(file, "full", 6480)).toEqual([0, 6480]);
});

test("the second half is the mirrored period, whatever its order", () => {
  const file = {
    periods: [
      { t_start: 3000, t_end: 6000, mirrored: true },
      { t_start: 0, t_end: 2700 },
    ],
  } as never;
  expect(periodWindow(file, "2nd", 6000)).toEqual([3000, 6000]);
  expect(periodWindow(file, "1st", 6000)).toEqual([0, 2700]);
});

test("falls back to halving the clock when the file has no periods", () => {
  expect(periodWindow(undefined, "1st", 5400)).toEqual([0, 2700]);
  expect(periodWindow({ periods: [] } as never, "2nd", 5400)).toEqual([2700, 5400]);
});
