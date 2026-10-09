import { expect, test } from "bun:test";

import { withholdDisownedPossession } from "./match-source";

test("possession the pipeline disowned is withheld everywhere", () => {
  const stats = {
    summary: { ball_grade: { possession_ok: false } },
    teams: [
      { team: "A", possession_pct: 36, passes: 231 },
      { team: "B", possession_pct: 64, passes: 256 },
    ],
    metrics: { tilt_windows: [{ t: 0, tilt_A: 0.4, possession_A: 0.3 }] },
  };
  const out = withholdDisownedPossession(stats as any);
  expect(out.teams[0]).toEqual({ team: "A", passes: 231 });
  expect(out.metrics.tilt_windows[0]).toEqual({ t: 0, tilt_A: 0.4, possession_A: null });
  const ok = { ...stats, summary: { ball_grade: { possession_ok: true } } };
  expect(withholdDisownedPossession(ok as any)).toBe(ok);
});
