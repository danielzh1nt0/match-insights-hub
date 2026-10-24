import { expect, test } from "bun:test";
import { buildFindings, findingMiss } from "./match-analysis";
import type { Finding } from "./match-data";

/**
 * A finding is a claim about a subset.
 *
 * "Only 35% of losses got pressure inside two seconds" is a claim about the
 * other 65%, so the clips behind it have to be those losses. Attaching all 116
 * meant a coach checking the evidence could open a loss that was pressed
 * immediately — the clip disproving the headline it was filed under. Worse, the
 * old ordering put losses carrying no measurement first, so the opening clips
 * were the ones that proved least.
 *
 * These tests pin that down: the count, the membership, the order, and the
 * difference between "none of them failed" and "this export cannot tell us".
 */

const thresholds = { pressWithin2s: 60, regainWithin5s: 35, blockCeilingM: 38 };

function losses(n: number, press: (i: number) => number | null) {
  return Array.from({ length: n }, (_, i) => {
    const seconds = press(i);
    return {
      id: `l${i}`,
      t: 60 + i * 40,
      type: "turnover_lost",
      team: "A",
      title: "lost",
      subtitle: null,
      payload: seconds === null ? {} : { time_to_press: seconds },
    };
  });
}

function pressFinding(events: unknown[], pressedPct: number) {
  return buildFindings(
    { frames: [], events } as never,
    { teams: [{ team: "A", pressed_within_2s_pct: pressedPct }] } as never,
    "A",
    thresholds,
  ).find((f) => f.id === "slow_press")!;
}

test("carries only the losses that were actually slow", () => {
  // 41 of 116 pressed inside two seconds; the other 75 are the fault.
  const events = losses(116, (i) => (i < 41 ? 0.8 + (i % 10) * 0.1 : 2.4 + (i % 20) * 0.3));
  const finding = pressFinding(events, 35);

  expect(finding.events).toBe(75);
  expect(finding.population).toBe(116);
  expect(finding.evidence).toBe("exact");
  expect(finding.evidenceNote).toBeUndefined();

  const slow = new Set(
    events
      .filter((e) => (e.payload as { time_to_press?: number }).time_to_press! > 2)
      .map((e) => e.id),
  );
  expect(finding.eventIds.every((id) => slow.has(id))).toBe(true);
});

test("opens on the worst evidence, not the weakest", () => {
  const events = losses(116, (i) => (i < 41 ? 1 : 2.4 + (i % 20) * 0.3));
  const finding = pressFinding(events, 35);
  const seconds = new Map(
    events.map((e) => [
      Math.round(e.t * 10) / 10,
      (e.payload as { time_to_press?: number }).time_to_press,
    ]),
  );
  const shown = finding.timestamps.map((t) => seconds.get(t)!);

  expect(shown.every((s) => s > 2)).toBe(true);
  for (let i = 1; i < shown.length; i += 1) expect(shown[i - 1]!).toBeGreaterThanOrEqual(shown[i]!);
});

test("carries enough clips for the strip to expand into", () => {
  const finding = pressFinding(
    losses(116, () => 4),
    35,
  );
  expect(finding.timestamps.length).toBeGreaterThan(6);
});

test("admits when the export cannot say which losses were slow", () => {
  const finding = pressFinding(
    losses(116, () => null),
    35,
  );
  expect(finding.events).toBe(116);
  expect(finding.population).toBe(116);
  expect(finding.evidence).toBe("unfiltered");
  expect(finding.evidenceNote).toContain("time to first pressure");
});

test("judges only the losses it can measure", () => {
  // 50 unmeasured, 20 quick, 30 slow.
  const finding = pressFinding(
    losses(100, (i) => (i < 50 ? null : i < 70 ? 1.2 : 3.5)),
    35,
  );
  expect(finding.events).toBe(30);
  expect(finding.evidence).toBe("exact");
});

test("the finding order compares misses in different units", () => {
  // The order used to be the order these were written in the source, so a
  // press at 59% against a 60% target outranked a 55 m block against a 38 m
  // ceiling -- and findings[0] is the Insights verdict, the flagged chapter
  // and the session the squad trains on Tuesday.
  const near = findingMiss({
    value: 59,
    target: 60,
    unit: "%",
    higherIsWorse: false,
  } as Finding);
  const bad = findingMiss({
    value: 55,
    target: 38,
    unit: "m",
    higherIsWorse: true,
  } as Finding);

  expect(near).toBeCloseTo(1 / 60, 5);
  expect(bad).toBeCloseTo(17 / 38, 5);
  expect(bad!).toBeGreaterThan(near!);

  // A target that was met is not a miss.
  expect(
    findingMiss({ value: 70, target: 60, unit: "%", higherIsWorse: false } as Finding)!,
  ).toBeLessThan(0);

  // A bare count has no target to be a share of, so it cannot be ranked this
  // way and sorts after everything that can.
  expect(findingMiss({ value: 411, target: 1, unit: "times" } as Finding)).toBeNull();
});
