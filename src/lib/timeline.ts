import type { MatchDataFile } from "@/lib/match-source";
import type { StatsFile, TeamKey } from "@/lib/match-analysis";
import { completionOf } from "@/lib/export-contract";

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

/**
 * A five-minute block. Null means the file could not fill it.
 *
 * This module's own rule, stated at the top of the file: a window the file
 * cannot fill is left out rather than drawn as zero, because a zero reads as
 * "they had none", not as "we don't know". The bars were the one series that
 * broke it -- an empty block came back as 0/0 possession and as a 0 pressing
 * count, both of which print as a measured figure.
 */
export type Bar = { fromS: number; toS: number; a: number | null; b: number | null };

export type MatchTimeline = {
  /** Only the parts of the clock that were actually played. */
  spans: Span[];
  startS: number;
  endS: number;
  /** The side every "ours" series belongs to. */
  team: TeamKey;
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

/**
 * Five-minute blocks, cut inside each period from its own kick-off, so no
 * block straddles half-time. Cut from the start of the recording, the block
 * across the second kick-off belonged to neither half and first + second
 * never equalled the total. The last block of a period is shorter.
 */
function bars(spans: Span[], startS: number, endS: number) {
  const out: { fromS: number; toS: number }[] = [];
  const cuts = spans.length ? spans : [{ fromS: startS, toS: endS }];
  for (const span of cuts) {
    for (let from = span.fromS; from < span.toS; from += BAR_S) {
      out.push({ fromS: from, toS: Math.min(from + BAR_S, span.toS) });
    }
  }
  return out;
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
    if (inside.length === 0) return { ...slot, a: null, b: null };
    const share = inside.reduce((sum, w) => sum + w.raw!, 0) / inside.length;
    const mine = team === "A" ? share : 1 - share;
    return { ...slot, a: Math.round(mine * 100), b: Math.round((1 - mine) * 100) };
  });

  const pressurePoints = Array.isArray(metrics["pressure_points"])
    ? (metrics["pressure_points"] as Record<string, unknown>[])
    : [];
  // With no pressure_points at all, counting gives 0 for every block, and the
  // card prints "Pressures applied 0 -> 0" as though it had measured a team
  // that never pressed. No points means no answer.
  const hasPressure = pressurePoints.length > 0;
  const pressure: Bar[] = slots.map((slot) => ({
    ...slot,
    a: hasPressure
      ? pressurePoints.filter(
          (p) =>
            (finite(p["t"]) ?? -1) >= slot.fromS &&
            (finite(p["t"]) ?? -1) < slot.toS &&
            p["pressing_team"] === team,
        ).length
      : null,
    b: hasPressure
      ? pressurePoints.filter(
          (p) =>
            (finite(p["t"]) ?? -1) >= slot.fromS &&
            (finite(p["t"]) ?? -1) < slot.toS &&
            p["pressing_team"] === other,
        ).length
      : null,
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
    // Completion over the passes this file judged, never over all of them.
    // `completed === true` alone treated a pass graded by `quality` or
    // `outcome`, and every pass with no verdict, as one that did not arrive --
    // the rule export-contract exists to stop being rewritten per call site.
    const split = completionOf(mine);
    return {
      ...slot,
      a: mine.length,
      b: split.pct,
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
    team,
    empty:
      possession.length === 0 &&
      tilt.length === 0 &&
      sequences.length === 0 &&
      pressurePoints.length === 0,
  };
}

/**
 * What a series did in each half.
 *
 * A coach reads a match in halves — what we did, what changed after the break.
 * A line that wanders is a picture of that; two numbers are the answer. Null
 * when a half carries nothing, so the row says so rather than printing a zero.
 */
export function halves(points: Point[], spans: Span[]) {
  const mean = (values: number[]) =>
    values.length === 0 ? null : values.reduce((sum, v) => sum + v, 0) / values.length;
  const inSpan = (span: Span | undefined) =>
    span === undefined
      ? []
      : points
          .filter((p) => p.value !== null && p.t >= span.fromS && p.t <= span.toS)
          .map((p) => p.value!);
  return { first: mean(inSpan(spans[0])), second: mean(inSpan(spans[1])) };
}

/** The same, for things counted into five-minute blocks. */
export function barHalves(bars: Bar[], spans: Span[], side: "a" | "b" = "a") {
  const sum = (span: Span | undefined) =>
    span === undefined
      ? null
      : (() => {
          const inside = bars
            .filter((bar) => bar.fromS >= span.fromS - 1 && bar.toS <= span.toS + BAR_S)
            .map((bar) => bar[side])
            .filter((value): value is number => value !== null);
          // No block the file could answer means no half total, rather than a
          // zero that reads as a measured nothing.
          return inside.length === 0 ? null : inside.reduce((total, v) => total + v, 0);
        })();
  const first = sum(spans[0]);
  const second = sum(spans[1]);
  return { first, second };
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

/* ---------------- the match as spells ---------------- */

export type SpellTone = "strong" | "even" | "lost";

export type Spell = {
  fromS: number;
  toS: number;
  tone: SpellTone;
  /** What this spell was, in a coach's words. */
  title: string;
  /** The figure that makes the point. */
  headline: string;
  /** What else was true while it ran. */
  detail: string | null;
};

/** A spell shorter than this is a wobble, not a passage of play. */
const MIN_SPELL_S = 4 * 60;
const BLOCK_S = 150;

function toneOf(share: number): SpellTone {
  if (share >= 0.58) return "strong";
  if (share <= 0.42) return "lost";
  return "even";
}

/**
 * The match as a handful of spells a coach would describe out loud.
 *
 * Nobody watches a match and thinks "possession averaged 46%". They think: we
 * were on top for twenty minutes, lost the middle of the first half, came out
 * better after the break. So the clock is cut into blocks, each block is called
 * strong, even or lost on who had the ball, neighbouring blocks that agree are
 * joined, and anything too short to be a passage of play is absorbed.
 *
 * The naming is positional, because that is how the same figures mean different
 * things: 60% in the opening ten minutes is a strong start, the same 60% after
 * being on top of the game for an hour is just more of the same.
 */
export function buildStory(timeline: MatchTimeline): Spell[] {
  const points = timeline.possession.filter((p) => p.value !== null) as {
    t: number;
    value: number;
  }[];
  if (points.length < 4) return [];

  type Block = { fromS: number; toS: number; share: number };
  const blocks: Block[] = [];
  for (const span of timeline.spans.length
    ? timeline.spans
    : [{ fromS: timeline.startS, toS: timeline.endS }]) {
    for (let from = span.fromS; from < span.toS; from += BLOCK_S) {
      const toS = Math.min(from + BLOCK_S, span.toS);
      const inside = points.filter((p) => p.t >= from && p.t < toS);
      if (inside.length === 0) continue;
      blocks.push({
        fromS: from,
        toS,
        share: inside.reduce((sum, p) => sum + p.value, 0) / inside.length,
      });
    }
  }
  if (blocks.length === 0) return [];

  // Join neighbours that agree.
  const joined: { fromS: number; toS: number; tone: SpellTone; shares: number[] }[] = [];
  for (const block of blocks) {
    const tone = toneOf(block.share);
    const last = joined.at(-1);
    if (last && last.tone === tone && block.fromS - last.toS < BLOCK_S) {
      last.toS = block.toS;
      last.shares.push(block.share);
    } else joined.push({ fromS: block.fromS, toS: block.toS, tone, shares: [block.share] });
  }

  // Absorb anything too short to be a passage of play into its neighbour.
  const kept: typeof joined = [];
  for (const spell of joined) {
    const short = spell.toS - spell.fromS < MIN_SPELL_S;
    const last = kept.at(-1);
    if (short && last) {
      last.toS = spell.toS;
      last.shares.push(...spell.shares);
    } else kept.push(spell);
  }

  const highs = timeline.highTurnovers;

  let seenLost = false;
  return kept.map((spell, i) => {
    const share = spell.shares.reduce((sum, v) => sum + v, 0) / spell.shares.length;
    const first = i === 0;
    const last = i === kept.length - 1;

    let title: string;
    if (spell.tone === "strong")
      title = first ? "Strong start" : seenLost ? "Took it back" : "On top";
    else if (spell.tone === "lost")
      title = first ? "Slow start" : last ? "Late pressure" : "Lost control";
    else title = first ? "Even start" : last ? "Even finish" : "Even spell";
    if (spell.tone === "lost") seenLost = true;

    // Blocks that fall inside the spell. The old +300 slack pulled in a whole
    // five-minute block past the end, so "3 balls won in their half" under a
    // spell could count balls won minutes after it finished -- evidence
    // outside the claim it is offered for.
    const won = highs
      .filter((bar) => bar.fromS >= spell.fromS - 1 && bar.toS <= spell.toS + 1)
      .reduce((sum, bar) => sum + (bar.a ?? 0), 0);
    // Balls won in their half either way: a number a coach can picture, and a
    // zero during a bad spell says more than a four-figure pressure count.
    return {
      fromS: spell.fromS,
      toS: spell.toS,
      tone: spell.tone,
      title,
      headline: `${Math.round(share * 100)}% of the ball`,
      detail:
        won > 0
          ? `${won} ${won === 1 ? "ball" : "balls"} won in their half`
          : spell.toS - spell.fromS > MIN_SPELL_S
            ? "no balls won in their half"
            : null,
    };
  });
}

/**
 * The match in one sentence, from the spells rather than from an average.
 *
 * An average across ninety minutes hides exactly the thing worth saying: a team
 * can be on top for twenty minutes, lose the next fifteen, and come out at 50%.
 * This names the longest spell each way, which is what anyone who watched it
 * would tell you first.
 */
export function storyLine(story: Spell[]): string {
  if (story.length === 0) return "There is not enough in this file to tell the match's story yet.";
  const longest = (tone: SpellTone) =>
    story
      .filter((spell) => spell.tone === tone)
      .sort((a, b) => b.toS - b.fromS - (a.toS - a.fromS))[0];
  const best = longest("strong");
  const worst = longest("lost");
  const mins = (spell: Spell) =>
    `${Math.round(spell.fromS / 60)}\u2013${Math.round(spell.toS / 60)}'`;

  if (best && worst)
    return `On top for ${Math.round((best.toS - best.fromS) / 60)} minutes, and second best between ${mins(worst)}.`;
  if (best) return `On top for ${Math.round((best.toS - best.fromS) / 60)} minutes, ${mins(best)}.`;
  if (worst)
    return `Second best for ${Math.round((worst.toS - worst.fromS) / 60)} minutes, ${mins(worst)}.`;
  return "An even match throughout — neither side held the ball for long.";
}

/* ---------------- the moments worth opening ---------------- */

export type KeyMoment = {
  t: number;
  tone: SpellTone;
  /** Two or three words. */
  label: string;
  /** The figure or score behind it. */
  note: string;
};

/**
 * The two or three moments a coach should actually watch.
 *
 * Goals pick themselves. Past those, the thing worth opening is the turn: the
 * minute a good spell started and the minute a bad one did, because that is
 * where the cause is. Anything more than four and it stops being a shortlist
 * and becomes another list to read.
 */
export function keyMoments(timeline: MatchTimeline, story: Spell[]): KeyMoment[] {
  const out: KeyMoment[] = [];

  const worst = story
    .filter((spell) => spell.tone === "lost")
    .sort((a, b) => b.toS - b.fromS - (a.toS - a.fromS))[0];
  if (worst)
    out.push({
      t: worst.fromS,
      tone: "lost",
      label: worst.title,
      note: worst.headline,
    });

  const best = story
    .filter((spell) => spell.tone === "strong")
    .sort((a, b) => b.toS - b.fromS - (a.toS - a.fromS))[0];
  if (best) out.push({ t: best.fromS, tone: "strong", label: best.title, note: best.headline });

  // The goal that changed the match: the last one, which settled the score.
  const decisive = timeline.goals.at(-1);
  if (decisive)
    out.push({
      t: decisive.t,
      tone: decisive.team === timeline.team ? "strong" : "lost",
      label: "Goal",
      note: decisive.score,
    });

  return out.sort((a, b) => a.t - b.t).slice(0, 4);
}
