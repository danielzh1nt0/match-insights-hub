import type { MatchDataFile } from "@/lib/match-source";
import type { StatsFile, TeamKey } from "@/lib/match-analysis";

/**
 * The match as a sequence rather than a set of totals.
 *
 * A total says the team had 33% of the ball. It does not say they had 55% for
 * twenty minutes and then stopped, which is the thing a coach can actually do
 * something about. Everything here shares one clock so the charts stack: the
 * same minute is the same place on every one of them.
 *
 * Nothing is invented. A window the file cannot fill is left out of the series
 * rather than drawn as zero, because a zero in a possession chart reads as
 * "they had none", not as "we don't know".
 */

export type Periods = { t_start: number; t_end: number; mirrored?: boolean }[];

export type Span = { fromS: number; toS: number };

/** A value at a moment. Null means the file could not answer for that window. */
export type Point = { t: number; value: number | null };

export type GoalMark = { t: number; team: TeamKey; score: string };

export type Bar = { fromS: number; toS: number; a: number; b: number };

export type MatchTimeline = {
  /** Only the parts of the clock that were actually played. */
  spans: Span[];
  startS: number;
  endS: number;
  goals: GoalMark[];
  /** SFK's share of the ball, 0–1, smoothed. */
  possession: Point[];
  /** Five-minute blocks, for reading a number off. */
  possessionBars: Bar[];
  /** Share of final-third play at the attacking end, 0–1. */
  tilt: Point[];
  /** Pressures applied per five minutes, each side. */
  pressure: Bar[];
  /** Balls won in the opponent half per five minutes. */
  highTurnovers: Bar[];
  /** Back-to-front length per minute, each side. */
  length: { a: Point[]; b: Point[] };
  /** Defensive line height per minute, each side. */
  lineHeight: { a: Point[]; b: Point[] };
  /** Who had the ball, as blocks. */
  sequences: { fromS: number; toS: number; team: TeamKey }[];
  passes: Bar[];
  /** Said plainly when there is nothing to draw. */
  empty: boolean;
};

const BAR_S = 5 * 60;

function finite(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function inSpans(t: number, spans: Span[]) {
  return spans.length === 0 || spans.some((s) => t >= s.fromS - 5 && t <= s.toS + 5);
}

/** A rolling median over a window of seconds, so jitter does not become shape. */
function smooth(points: Point[], windowS: number): Point[] {
  const known = points.filter((p) => p.value !== null) as { t: number; value: number }[];
  if (known.length === 0) return [];
  return known.map((point) => {
    const near = known
      .filter((other) => Math.abs(other.t - point.t) <= windowS / 2)
      .map((other) => other.value)
      .sort((a, b) => a - b);
    return { t: point.t, value: near[Math.floor(near.length / 2)]! };
  });
}

function bars(spans: Span[], startS: number, endS: number) {
  const out: { fromS: number; toS: number }[] = [];
  for (let from = startS; from < endS; from += BAR_S) {
    const toS = Math.min(from + BAR_S, endS);
    if (spans.some((s) => toS > s.fromS && from < s.toS)) out.push({ fromS: from, toS });
  }
  return out;
}

function countPer(
  items: { t: number }[],
  slots: { fromS: number; toS: number }[],
  pick: (item: never) => boolean,
) {
  return slots.map((slot) => ({
    ...slot,
    n: items.filter((item) => item.t >= slot.fromS && item.t < slot.toS && pick(item as never))
      .length,
  }));
}

export function buildTimeline({
  stats,
  file,
  team,
}: {
  stats: StatsFile | undefined;
  file: MatchDataFile | undefined;
  team: TeamKey;
}): MatchTimeline {
  const periods = (file?.periods ?? []) as Periods;
  const spans: Span[] = periods.map((p) => ({ fromS: p.t_start, toS: p.t_end }));
  const startS = spans.length ? Math.min(...spans.map((s) => s.fromS)) : 0;
  const endS = spans.length
    ? Math.max(...spans.map((s) => s.toS))
    : Math.max(file?.frames.at(-1)?.t ?? 0, 1);

  const metrics = (stats?.metrics ?? {}) as Record<string, unknown>;
  const other: TeamKey = team === "A" ? "B" : "A";
  const ours = (value: unknown) => (team === "A" ? value : 1 - (finite(value) ?? 0));

  /* ---- possession and tilt, from the 15 s windows ---- */
  const windows = Array.isArray(metrics["tilt_windows"])
    ? (metrics["tilt_windows"] as Record<string, unknown>[])
    : [];

  const windowPoints = (key: string): Point[] =>
    windows
      .map((w) => ({ t: finite(w["t"]) ?? 0, raw: finite(w[key]) }))
      .filter((w) => inSpans(w.t, spans))
      .map((w) => ({
        t: w.t,
        value: w.raw === null ? null : team === "A" ? w.raw : 1 - w.raw,
      }));

  const possession = smooth(windowPoints("possession_A"), 5 * 60);
  const tilt = smooth(windowPoints("tilt_A"), 5 * 60);

  /* ---- goals, with the score as it stood ---- */
  const shots = Array.isArray(metrics["shots"])
    ? (metrics["shots"] as Record<string, unknown>[])
    : [];
  let a = 0;
  let b = 0;
  const goals: GoalMark[] = shots
    .filter((shot) => shot["goal"] === true && inSpans(finite(shot["t"]) ?? -1, spans))
    .map((shot) => ({
      t: finite(shot["t"]) ?? 0,
      team: (shot["team"] === "B" ? "B" : "A") as TeamKey,
    }))
    .sort((x, y) => x.t - y.t)
    .map((goal) => {
      if (goal.team === "A") a += 1;
      else b += 1;
      return { ...goal, score: `${a}-${b}` };
    });

  /* ---- five-minute blocks ---- */
  const slots = bars(spans, startS, endS);

  const possessionBars: Bar[] = slots.map((slot) => {
    const inside = windows
      .map((w) => ({ t: finite(w["t"]) ?? 0, raw: finite(w["possession_A"]) }))
      .filter((w) => w.raw !== null && w.t >= slot.fromS && w.t < slot.toS);
    if (inside.length === 0) return { ...slot, a: 0, b: 0 };
    const share = inside.reduce((sum, w) => sum + w.raw!, 0) / inside.length;
    const mine = team === "A" ? share : 1 - share;
    return { ...slot, a: Math.round(mine * 100), b: Math.round((1 - mine) * 100) };
  });

  const pressurePoints = Array.isArray(metrics["pressure_points"])
    ? (metrics["pressure_points"] as Record<string, unknown>[])
    : [];
  const pressure: Bar[] = slots.map((slot) => ({
    ...slot,
    a: pressurePoints.filter(
      (p) =>
        (finite(p["t"]) ?? -1) >= slot.fromS &&
        (finite(p["t"]) ?? -1) < slot.toS &&
        p["pressing_team"] === team,
    ).length,
    b: pressurePoints.filter(
      (p) =>
        (finite(p["t"]) ?? -1) >= slot.fromS &&
        (finite(p["t"]) ?? -1) < slot.toS &&
        p["pressing_team"] === other,
    ).length,
  }));

  const highs = Array.isArray(metrics["high_turnovers"])
    ? (metrics["high_turnovers"] as Record<string, unknown>[])
    : [];
  const highTurnovers: Bar[] = slots.map((slot) => ({
    ...slot,
    a: highs.filter(
      (h) =>
        (finite(h["t"]) ?? -1) >= slot.fromS &&
        (finite(h["t"]) ?? -1) < slot.toS &&
        h["team"] === team,
    ).length,
    b: highs.filter(
      (h) =>
        (finite(h["t"]) ?? -1) >= slot.fromS &&
        (finite(h["t"]) ?? -1) < slot.toS &&
        h["team"] === other,
    ).length,
  }));

  const passList = Array.isArray(stats?.passes) ? (stats.passes as Record<string, unknown>[]) : [];
  const passes: Bar[] = slots.map((slot) => {
    const mine = passList.filter(
      (pass) =>
        pass["team"] === team &&
        (finite(pass["t"] ?? pass["time"] ?? pass["start_t"]) ?? -1) >= slot.fromS &&
        (finite(pass["t"] ?? pass["time"] ?? pass["start_t"]) ?? -1) < slot.toS,
    );
    const done = mine.filter((pass) => pass["completed"] === true).length;
    return {
      ...slot,
      a: mine.length,
      b: mine.length === 0 ? 0 : Math.round((done / mine.length) * 100),
    };
  });

  /* ---- shape, per minute ---- */
  const shapeOf = (side: TeamKey, key: string): Point[] => {
    const series = (metrics["shape_timeline"] as Record<string, unknown> | undefined)?.[side];
    if (!Array.isArray(series)) return [];
    const points = (series as Record<string, unknown>[])
      .map((row) => ({ t: finite(row["t"]) ?? 0, value: finite(row[key]) }))
      .filter((row) => inSpans(row.t, spans));
    return smooth(points, 60);
  };

  /* ---- who had it ---- */
  const sequences = (
    Array.isArray(stats?.sequences) ? (stats.sequences as Record<string, unknown>[]) : []
  )
    .map((seq) => ({
      fromS: finite(seq["t_start"]) ?? 0,
      toS: finite(seq["t_end"]) ?? 0,
      team: (seq["team"] === "B" ? "B" : "A") as TeamKey,
    }))
    .filter((seq) => seq.toS > seq.fromS && inSpans(seq.fromS, spans));

  return {
    spans,
    startS,
    endS,
    goals,
    possession,
    possessionBars,
    tilt,
    pressure,
    highTurnovers,
    length: { a: shapeOf(team, "length"), b: shapeOf(other, "length") },
    lineHeight: { a: shapeOf(team, "line_height"), b: shapeOf(other, "line_height") },
    sequences,
    passes,
    empty:
      possession.length === 0 &&
      tilt.length === 0 &&
      sequences.length === 0 &&
      pressurePoints.length === 0,
  };
}

/** Where a second sits on a chart, with half-time closed up. */
export function playedScale(timeline: MatchTimeline) {
  const spans = timeline.spans.length
    ? timeline.spans
    : [{ fromS: timeline.startS, toS: timeline.endS }];
  const total = spans.reduce((sum, s) => sum + (s.toS - s.fromS), 0) || 1;
  return (t: number) => {
    let before = 0;
    for (const span of spans) {
      if (t < span.fromS) return (before / total) * 100;
      if (t <= span.toS) return ((before + (t - span.fromS)) / total) * 100;
      before += span.toS - span.fromS;
    }
    return 100;
  };
}
