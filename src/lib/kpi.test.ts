import { expect, test } from "bun:test";
import { buildKpi, KPI_DEFAULTS, kpiTargetsFrom } from "./kpi";
import type { MatchTimeline } from "./timeline";

const timeline = (shareA: number) =>
  ({ possession: [{ t: 100, value: shareA }] }) as unknown as MatchTimeline;

const file = { periods: [{ t_start: 0, t_end: 3000 }] } as never;

test("an unmeasured target is not a failed one", () => {
  // The file carries nothing at all. A score of 0 would read as a team that
  // met none of its targets rather than a file that cannot answer.
  const kpi = buildKpi({
    stats: undefined,
    file,
    team: "A",
    timeline: undefined,
    targets: KPI_DEFAULTS,
  });
  expect(kpi.attack.score).toBeNull();
  expect(kpi.defence.score).toBeNull();
  expect(kpi.overall.score).toBeNull();
  expect(kpi.attack.measured).toBe(0);
  expect(kpi.attack.total).toBe(4);
});

test("scores over the targets the file can answer", () => {
  const stats = {
    metrics: {
      shots: [
        { team: "A", t: 100, outcome: "goal" },
        { team: "A", t: 200, outcome: "wide" },
        { team: "B", t: 300, outcome: "goal" },
      ],
      field: { A: { final_third_entries: [1, 2, 3] }, B: { final_third_entries: [1] } },
    },
  } as never;

  const kpi = buildKpi({
    stats,
    file,
    team: "A",
    timeline: timeline(0.6),
    targets: { ...KPI_DEFAULTS, possessionPct: 50, shots: 2, finalThirdEntries: 3 },
  });

  // Possession 60 >= 50, shots 2 >= 2, entries 3 >= 3 all met; completion has
  // no passes in the file, so it is measured as null and left out.
  expect(kpi.attack.measured).toBe(3);
  expect(kpi.attack.met).toBe(3);
  expect(kpi.attack.score).toBe(100);

  // One shot conceded against a target of 10, one goal against a target of 1,
  // one entry conceded against 15.
  expect(kpi.defence.score).toBe(100);
  // Overall counts every target once rather than averaging the two scores.
  expect(kpi.overall.measured).toBe(6);
});

test("possession is read for the selected team, not always for A", () => {
  const forA = buildKpi({
    stats: undefined,
    file,
    team: "A",
    timeline: timeline(0.7),
    targets: KPI_DEFAULTS,
  });
  const forB = buildKpi({
    stats: undefined,
    file,
    team: "B",
    timeline: timeline(0.7),
    targets: KPI_DEFAULTS,
  });
  expect(forA.attack.measures.find((m) => m.key === "possession")?.value).toBe(70);
  expect(forB.attack.measures.find((m) => m.key === "possession")?.value).toBe(30);
});

test("a defensive target is met by being under it", () => {
  const stats = {
    metrics: { shots: [{ team: "B", t: 100, outcome: "wide" }] },
  } as never;
  const kpi = buildKpi({
    stats,
    file,
    team: "A",
    timeline: undefined,
    targets: { ...KPI_DEFAULTS, shotsConceded: 1 },
  });
  const conceded = kpi.defence.measures.find((m) => m.key === "shots_conceded");
  expect(conceded?.value).toBe(1);
  expect(conceded?.met).toBe(true);
});

test("saved targets fall back to the defaults one field at a time", () => {
  const targets = kpiTargetsFrom({ kpi_shots: 14, kpi_possession_pct: "nonsense" });
  expect(targets.shots).toBe(14);
  expect(targets.possessionPct).toBe(KPI_DEFAULTS.possessionPct);
});

test("a measured zero is scored, a missing record is not", () => {
  // `shotCount(...) || null` read a real 0 as "not measured", dropped the
  // target out of the denominator, and so scored a side that took no shots
  // HIGHER than one that took a single shot against a target of ten.
  const tookNone = {
    metrics: { shots: [{ team: "B", t: 100, outcome: "wide" }] },
  } as never;
  const kpi = buildKpi({
    stats: tookNone,
    file,
    team: "A",
    timeline: undefined,
    targets: { ...KPI_DEFAULTS, shots: 10 },
  });
  const shots = kpi.attack.measures.find((m) => m.key === "shots");
  expect(shots?.value).toBe(0);
  expect(shots?.met).toBe(false);

  // No shot record at all is still withheld.
  const noRecord = buildKpi({
    stats: { metrics: {} } as never,
    file,
    team: "A",
    timeline: undefined,
    targets: KPI_DEFAULTS,
  });
  expect(noRecord.attack.measures.find((m) => m.key === "shots")?.met).toBeNull();
});
