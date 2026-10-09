/**
 * Everything the match screens show is derived here, from the open match's own
 * files: match_data.json (frames + the single events list) and stats.json.
 *
 * Team is always the literal "A" or "B" in the data. Label-map names and
 * colours are display only and are never compared against.
 */

import type { TeamScope } from "@/components/ip/chrome";
import type { Finding } from "@/lib/match-data";
import {
  completionOf,
  finalThirdEntries,
  passCompleted,
  insidePeriods,
  shotsOf as contractShots,
} from "@/lib/export-contract";
import type {
  FeedEvent,
  Frame,
  FramePlayer,
  MatchDataFile,
  MatchLabelRow,
} from "@/lib/match-source";

export type TeamKey = "A" | "B";

/** "A", "B" or null for Both — the only place a selection becomes a data value. */
export function teamKey(scope: TeamScope | undefined): TeamKey | null {
  return scope === "a" ? "A" : scope === "b" ? "B" : null;
}

export type StatsFile = {
  players?: any[];
  teams?: any[];
  metrics?: Record<string, any>;
  passes?: any[];
  sequences?: any[];
  pitch?: { length: number; width: number };
  grid?: [number, number];
};

export type Thresholds = {
  pressWithin2s: number;
  regainWithin5s: number;
  blockCeilingM: number;
};

export function thresholdsFrom(label: MatchLabelRow | null | undefined): Thresholds {
  const t = label?.thresholds ?? {};
  return {
    pressWithin2s: num(t["press_within_2s"], 60),
    regainWithin5s: num(t["regain_within_5s"], 35),
    blockCeilingM: num(t["block_ceiling_m"], 38),
  };
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[mid] ?? 0)
    : Math.round(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2);
}

function num(v: unknown, fallback: number) {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

/**
 * Kit colours for drawing. These come from the saved match labels, so a club's
 * own colour is used everywhere (heat maps, dots, ticks, bars).
 */
export function teamColours(
  label: { colour_a?: string | null; colour_b?: string | null } | null | undefined,
) {
  return {
    A: label?.colour_a || "#ef4444",
    B: label?.colour_b || "#22c55e",
  };
}

export function pitchSize(data: MatchDataFile | undefined, stats: StatsFile | undefined) {
  const p = (data as any)?.pitch ?? stats?.pitch;
  return { length: num(p?.length, 105), width: num(p?.width, 68) };
}

export function teamRow(stats: StatsFile | undefined, team: TeamKey) {
  return (stats?.teams ?? []).find((t: any) => t?.team === team) ?? null;
}

/* ---------------- frame lookup ---------------- */

export function frameAt(frames: Frame[], t: number): Frame | null {
  if (frames.length === 0) return null;
  let lo = 0;
  let hi = frames.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (frames[mid]!.t <= t) lo = mid;
    else hi = mid - 1;
  }
  return frames[lo] ?? null;
}

export function playersOf(frame: Frame | null, team: TeamKey | null) {
  if (!frame) return [] as FramePlayer[];
  return frame.players.filter((p) => (team ? p.team === team : true));
}

/** Metres to percent of the pitch, 0-100 on both axes. */
export function toPercent(m: [number, number], length: number, width: number) {
  return {
    x: Math.max(0, Math.min(100, (m[0] / length) * 100)),
    y: Math.max(0, Math.min(100, (m[1] / width) * 100)),
  };
}

/* ---------------- territory ---------------- */

export type Territory = {
  heat: { x: number; y: number; w: number }[];
  frameCount: number;
  playerCount: number;
  snapshots: {
    t: number;
    players: {
      id: string;
      x: number;
      y: number;
      shirt: number;
      predicted: boolean;
      isGK: boolean;
    }[];
    lengthM: number;
    widthM: number;
  }[];
  losses: { x: number; y: number; t: number; high?: boolean }[];
  recoveries: { x: number; y: number; t: number; high?: boolean }[];
  blockLengthM: number;
  compactBandM: number;
  lineHeightM: number;
};

export type LineState = "high" | "mid" | "low";

export type LineDefending = {
  lineBreakCount: number | null;
  lineBreakLast5Avg: number | null;
  lineBreaks: { id: string; t: number; x: number; y: number }[];
  lineBreakConfirmed: number;
  timeline: { t: number; height: number }[];
  shots: { id: string; t: number; height: number; goal: boolean }[];
  shotConfirmed: number;
  shotsUnder30: number;
  medianM: number | null;
  usualM: number | null;
  belowUsualPct: number | null;
  states: { key: LineState; height: number; shots: number; goals: number }[];
};

const HEAT_COLS = 12;
const HEAT_ROWS = 8;

export function buildTerritory(
  data: MatchDataFile | undefined,
  stats: StatsFile | undefined,
  team: TeamKey | null,
): Territory | null {
  if (!data) return null;
  const { length, width } = pitchSize(data, stats);
  // Only the match: warm-up and half-time frames fed the heat map and the
  // shape snapshots before.
  const frames = (data.frames ?? []).filter((frame) => insidePeriods(frame.t, data.periods));
  const cells = new Float64Array(HEAT_COLS * HEAT_ROWS);
  const perFrame: number[] = [];
  let frameCount = 0;

  for (const frame of frames) {
    let counted = 0;
    for (const p of frame.players) {
      if (team && p.team !== team) continue;
      if (p.state === "stale") continue;
      counted += 1;
      const col = Math.min(HEAT_COLS - 1, Math.max(0, Math.floor((p.m[0] / length) * HEAT_COLS)));
      const row = Math.min(HEAT_ROWS - 1, Math.max(0, Math.floor((p.m[1] / width) * HEAT_ROWS)));
      const cell = row * HEAT_COLS + col;
      cells[cell] = (cells[cell] ?? 0) + 1;
    }
    if (counted > 0) {
      frameCount += 1;
      perFrame.push(counted);
    }
  }

  const max = Math.max(...Array.from(cells), 1);
  const heat: { x: number; y: number; w: number }[] = [];
  for (let row = 0; row < HEAT_ROWS; row += 1) {
    for (let col = 0; col < HEAT_COLS; col += 1) {
      const v = cells[row * HEAT_COLS + col]!;
      if (v <= 0) continue;
      heat.push({
        x: ((col + 0.5) / HEAT_COLS) * 100,
        y: ((row + 0.5) / HEAT_ROWS) * 100,
        w: Math.round((v / max) * 100) / 100,
      });
    }
  }

  /* shape replay — one snapshot every thirty seconds */
  const shapeTeam: TeamKey = team ?? "A";
  const last = frames.at(-1)?.t ?? 0;
  const snapshots: Territory["snapshots"] = [];
  for (let t = 0; t <= last; t += 30) {
    const frame = frameAt(frames, t);
    if (!frame) continue;
    const players = frame.players
      .filter((p) => p.team === shapeTeam && p.state !== "stale")
      .map((p) => ({
        id: `${p.team}-${p.id}`,
        ...toPercent(p.m, length, width),
        shirt: p.id,
        predicted: p.state === "predicted",
        isGK: p.gk,
      }));
    if (players.length === 0) continue;
    const shape = frame.shape?.[shapeTeam];
    snapshots.push({
      t: frame.t,
      players,
      lengthM: Math.round(num(shape?.length, 0)),
      widthM: Math.round(num(shape?.width, 0)),
    });
  }

  /* losses and recoveries — the ball's position at the turnover */
  const positionIn = (t: number) => {
    const frame = frameAt(frames, t);
    if (!frame) return null;
    const m = frame.ball?.m;
    if (m) return toPercent(m as [number, number], length, width);
    const carrierId = (frame as { carrier?: number | null }).carrier;
    const carrier =
      carrierId === null || carrierId === undefined
        ? undefined
        : frame.players.find((p) => p.id === carrierId);
    return carrier ? toPercent(carrier.m, length, width) : null;
  };
  /* the tracker loses the ball on some frames — look a little either side of the moment */
  const positionAt = (t: number) => {
    for (const offset of [0, -0.5, 0.5, -1, 1, -2, 2, -3, 3]) {
      const at = positionIn(t + offset);
      if (at) return at;
    }
    return null;
  };
  const pick = (type: string) =>
    (data.events ?? [])
      .filter((e) => e.type === type && (!team || e.team === team))
      .map((e) => {
        const position = positionAt(e.t);
        if (!position) return null;
        const attackingX = e.team === "B" ? 100 - position.x : position.x;
        return { ...position, t: e.t, ...(attackingX >= 66.67 ? { high: true } : {}) };
      })
      .filter((p): p is { x: number; y: number; t: number; high?: boolean } => p !== null);

  const row = teamRow(stats, shapeTeam);
  return {
    heat,
    frameCount,
    playerCount: median(perFrame),
    snapshots,
    losses: pick("turnover_lost"),
    recoveries: pick("turnover_won"),
    blockLengthM: Math.round(num(row?.block_length_median_m, 0)),
    compactBandM: Math.round(num(row?.block_width_median_m, 0)),
    lineHeightM: Math.round(num(row?.def_line_height_median_m, 0)),
  };
}

function optionalNum(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function metricForTeam(value: unknown, team: TeamKey): number | null {
  if (typeof value === "number") return optionalNum(value);
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return optionalNum(record[team] ?? record[team.toLowerCase()]);
}

function eventBelongsToOpponent(event: FeedEvent, ownTeam: TeamKey, opponent: TeamKey) {
  const wonBy = event.payload?.["won_by"];
  if (wonBy === opponent || wonBy === opponent.toLowerCase()) return true;
  if (wonBy === ownTeam || wonBy === ownTeam.toLowerCase()) return false;
  return event.team === opponent;
}

function lineState(height: number): LineState {
  if (height < 30) return "low";
  if (height <= 38) return "mid";
  return "high";
}

/** Coach-first answers about the selected team's defensive line. */
export function buildLineDefending(
  data: MatchDataFile | undefined,
  stats: StatsFile | undefined,
  ownTeam: TeamKey,
): LineDefending | null {
  if (!data) return null;
  const opponent: TeamKey = ownTeam === "A" ? "B" : "A";
  const metrics = stats?.metrics ?? {};
  const row = teamRow(stats, ownTeam);
  const { length, width } = pitchSize(data, stats);

  const rawTimeline = (metrics["shape_timeline"] as Record<string, unknown[]> | undefined)?.[
    ownTeam
  ];
  const timeline = Array.isArray(rawTimeline)
    ? rawTimeline
        .map((sample) => {
          const value = sample as Record<string, unknown>;
          return { t: optionalNum(value["t"]), height: optionalNum(value["line_height"]) };
        })
        .filter(
          (sample): sample is { t: number; height: number } =>
            sample.t !== null && sample.height !== null && insidePeriods(sample.t, data.periods),
        )
        .sort((a, b) => a.t - b.t)
    : [];

  const nearestHeight = (time: number) => {
    if (timeline.length === 0) return null;
    let nearest = timeline[0] ?? null;
    for (const sample of timeline) {
      if (!nearest || Math.abs(sample.t - time) < Math.abs(nearest.t - time)) nearest = sample;
    }
    // A sample from more than ten seconds away says nothing about this shot.
    if (!nearest || Math.abs(nearest.t - time) > 10) return null;
    return nearest.height;
  };

  const lineBreakEvents = (data.events ?? []).filter((event) => {
    if (event.type !== "line_break_against") return false;
    const against = event.payload?.["team"] ?? event.payload?.["against"];
    if (against === ownTeam || against === ownTeam.toLowerCase()) return true;
    if (against === opponent || against === opponent.toLowerCase()) return false;
    return event.team === opponent || event.team === ownTeam;
  });
  const lineBreaks = lineBreakEvents.map((event) => {
    const px = optionalNum(event.payload?.["px"]);
    const py = optionalNum(event.payload?.["py"]);
    const mx = optionalNum(event.payload?.["x"]);
    const my = optionalNum(event.payload?.["y"]);
    return {
      id: event.id,
      t: event.t,
      x:
        px !== null
          ? Math.max(0, Math.min(100, (px / Math.max(data.width ?? 100, 1)) * 100))
          : Math.max(0, Math.min(100, ((mx ?? length / 2) / length) * 100)),
      y:
        py !== null
          ? Math.max(0, Math.min(100, (py / Math.max(data.height ?? 100, 1)) * 100))
          : Math.max(0, Math.min(100, ((my ?? width / 2) / width) * 100)),
    };
  });

  const conceded = (data.events ?? [])
    .filter(
      (event) =>
        (event.type === "shot" || event.type === "goal") &&
        eventBelongsToOpponent(event, ownTeam, opponent),
    )
    .map((event) => ({ event, height: nearestHeight(event.t) }))
    .filter((item): item is { event: FeedEvent; height: number } => item.height !== null);
  const shots = conceded.map(({ event, height }) => ({
    id: event.id,
    t: event.t,
    height,
    goal: event.type === "goal",
  }));

  const medianM = optionalNum(row?.def_line_height_median_m);
  const usualM = optionalNum(row?.def_line_height_usual_m);
  const belowUsualPct =
    usualM !== null && timeline.length > 0
      ? Math.round(
          (timeline.filter((sample) => sample.height < usualM).length / timeline.length) * 100,
        )
      : null;
  // A state the line never sat in has no measured height; it is left out
  // rather than given a typical figure (42 / 34 / 26 m) and shown as measured.
  const states = (["high", "mid", "low"] as const).flatMap((key) => {
    const inState = timeline.filter((sample) => lineState(sample.height) === key);
    if (inState.length === 0) return [];
    const average = Math.round(
      inState.reduce((sum, sample) => sum + sample.height, 0) / inState.length,
    );
    const moments = conceded.filter((item) => lineState(item.height) === key);
    const state = {
      key,
      height: average,
      shots: moments.length,
      goals: moments.filter((item) => item.event.type === "goal").length,
    };
    return [state];
  });

  return {
    lineBreakCount:
      metricForTeam(metrics["line_breaks_against"], ownTeam) ??
      (lineBreakEvents.length ? lineBreakEvents.length : null),
    lineBreakLast5Avg: optionalNum(row?.line_breaks_against_last5_avg),
    lineBreaks,
    lineBreakConfirmed: lineBreakEvents.filter(
      (event) => (event as FeedEvent & { status?: string }).status === "confirmed",
    ).length,
    timeline,
    shots,
    shotConfirmed: conceded.filter(
      ({ event }) => (event as FeedEvent & { status?: string }).status === "confirmed",
    ).length,
    shotsUnder30: shots.filter((shot) => shot.height < 30).length,
    medianM,
    usualM,
    belowUsualPct,
    states,
  };
}

/* ---------------- findings, from this match's numbers ---------------- */

function eventsFor(data: MatchDataFile | undefined, team: TeamKey, type: string) {
  return (data?.events ?? []).filter((e) => e.type === type && e.team === team);
}

/** A number from a payload, or null when the file does not carry it. */
function payloadNum(event: FeedEvent, key: string): number | null {
  const value = event.payload?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * The moments that actually show a fault.
 *
 * A finding is a claim about a subset: "only 35% of losses got pressure inside
 * two seconds" is a claim about the other 65%, not about all 116. Attaching
 * every loss to it put clips behind the headline that contradicted it — a coach
 * opening one could easily land on a loss that was pressed immediately.
 *
 * Returns null when no moment in the set can be tested at all, which is the
 * difference between "none of them failed" and "this export cannot tell us".
 * The caller has to say which it is rather than quietly showing everything.
 */
function faulty(
  events: FeedEvent[],
  test: (event: FeedEvent) => boolean | null,
): FeedEvent[] | null {
  let measured = 0;
  const hit: FeedEvent[] = [];
  for (const event of events) {
    const result = test(event);
    if (result === null) continue;
    measured += 1;
    if (result) hit.push(event);
  }
  return measured === 0 ? null : hit;
}

/** Clips carried per finding. Enough for the strip to expand into. */
const CLIP_CAP = 60;

function finding({
  id,
  headline,
  value,
  target,
  unit,
  higherIsWorse,
  interpretation,
  population,
  moments,
  rank,
  evidenceNote,
}: {
  id: string;
  headline: string;
  value: number;
  target: number;
  unit: string;
  higherIsWorse: boolean;
  interpretation: string;
  /** Every moment the figure was measured over. */
  population: FeedEvent[];
  /** The ones that show the fault, or null when the file cannot say. */
  moments: FeedEvent[] | null;
  /** Bigger is worse — used to put the most damning evidence first. */
  rank?: (event: FeedEvent) => number | null;
  /** Required when `moments` is null: why the clips are not the faulty ones. */
  evidenceNote?: string;
}): Finding {
  const exact = moments !== null;
  const chosen = [...(moments ?? population)];

  // Worst first where there is a magnitude to sort by. Moments carrying no
  // measurement go last: they prove nothing, so they are the weakest evidence,
  // and leading with them was why the first clips matched the headline least.
  chosen.sort((a, b) => {
    if (rank) {
      const av = rank(a);
      const bv = rank(b);
      if (av !== null && bv !== null && av !== bv) return bv - av;
      if (av === null && bv !== null) return 1;
      if (bv === null && av !== null) return -1;
    }
    return a.t - b.t;
  });

  return {
    id,
    headline,
    value: Math.round(value * 10) / 10,
    target,
    unit,
    higherIsWorse,
    events: chosen.length,
    population: population.length,
    evidence: exact ? "exact" : "unfiltered",
    ...(exact ? {} : { evidenceNote }),
    eventIds: chosen.map((e) => e.id),
    interpretation,
    timestamps: chosen.slice(0, CLIP_CAP).map((e) => Math.round(e.t * 10) / 10),
  };
}

export function buildFindings(
  data: MatchDataFile | undefined,
  stats: StatsFile | undefined,
  team: TeamKey,
  thresholds: Thresholds,
): Finding[] {
  const row = teamRow(stats, team);
  if (!data || !row) return [];
  const out: Finding[] = [];
  const lost = eventsFor(data, team, "turnover_lost");
  const won = eventsFor(data, team, "turnover_won");
  const better = eventsFor(data, team, "better_option");

  const pressed = num(row.pressed_within_2s_pct, 100);
  if (pressed < thresholds.pressWithin2s) {
    out.push(
      finding({
        id: "slow_press",
        headline: "Press faster when we lose the ball.",
        value: pressed,
        target: thresholds.pressWithin2s,
        unit: "%",
        higherIsWorse: false,
        interpretation: `Of ${optionalNum(row.losses) ?? lost.length} balls lost, only ${pressed}% got pressure inside two seconds. In the rest the nearest player waited instead of stepping in.`,
        population: lost,
        // The claim is about the losses that were slow, so those are the clips.
        moments: faulty(lost, (event) => {
          const seconds = payloadNum(event, "time_to_press");
          return seconds === null ? null : seconds > 2;
        }),
        rank: (event) => payloadNum(event, "time_to_press"),
        evidenceNote:
          "This export records no time to first pressure on individual losses, so these are all the losses rather than the slow ones.",
      }),
    );
  }

  const regained = num(row.regained_within_5s_pct, 100);
  if (regained < thresholds.regainWithin5s) {
    out.push(
      finding({
        id: "no_regain",
        headline: "Win it back before they settle.",
        value: regained,
        target: thresholds.regainWithin5s,
        unit: "%",
        higherIsWorse: false,
        interpretation: `${regained}% of losses were won back inside five seconds, so the opponent had time to settle after most turnovers.`,
        population: lost,
        moments: faulty(lost, (event) => {
          const won = event.payload?.["regained_within_5s"];
          return typeof won === "boolean" ? !won : null;
        }),
        evidenceNote:
          "This export does not mark which losses were won back, so these are all the losses.",
      }),
    );
  }

  const alone = num(row.near_at_2s_median, 9);
  if (alone < 2) {
    out.push(
      finding({
        id: "press_alone",
        headline: "Support the first presser.",
        value: alone,
        target: 2,
        unit: "players",
        higherIsWorse: false,
        interpretation: `Two seconds after losing the ball there ${alone === 1 ? "was typically 1 team-mate" : `were typically ${alone} team-mates`} within five metres, so the press could be played around.`,
        population: lost,
        moments: faulty(lost, (event) => {
          const near = payloadNum(event, "near_at_2s");
          return near === null ? null : near < 2;
        }),
        rank: (event) => {
          const near = payloadNum(event, "near_at_2s");
          return near === null ? null : -near;
        },
        evidenceNote:
          "This export carries no count of team-mates near the ball per loss, only a match median, so these are all the losses rather than the isolated ones.",
      }),
    );
  }

  const forward = num(row.forward_within_3s_pct, 100);
  if (forward < 50) {
    out.push(
      finding({
        id: "slow_forward",
        headline: "Play forward after we win it.",
        value: forward,
        target: 50,
        unit: "%",
        higherIsWorse: false,
        interpretation: `After winning the ball, only ${forward}% of the time did a forward pass follow inside three seconds.`,
        population: won,
        moments: faulty(won, (event) => {
          const played = event.payload?.["forward_within_3s"];
          return typeof played === "boolean" ? !played : null;
        }),
        evidenceNote:
          "This export does not mark which regains were followed by a forward pass, so these are all the balls won.",
      }),
    );
  }

  const lostBack = num(row.lost_back_5s_pct, 0);
  if (lostBack > 40) {
    out.push(
      finding({
        id: "won_and_lost",
        headline: "Secure the first pass after regaining.",
        value: lostBack,
        target: 40,
        unit: "%",
        higherIsWorse: true,
        interpretation: `${lostBack}% of the balls won were lost again inside five seconds.`,
        population: won,
        moments: faulty(won, (event) => {
          const lostAgain = event.payload?.["lost_back_5s"] ?? event.payload?.["lost_within_5s"];
          return typeof lostAgain === "boolean" ? lostAgain : null;
        }),
        evidenceNote:
          "This export does not mark which regains were given away again, so these are all the balls won.",
      }),
    );
  }

  // The pass list is the record the stats card counts from; the events are
  // the clips. Counting the finding from the events let the two disagree.
  const betterCount = optionalNum(row.better_option_count) ?? better.length;
  if (betterCount >= 3) {
    out.push(
      finding({
        id: "better_option",
        headline: "Look for the forward option.",
        value: betterCount,
        target: 1,
        unit: "times",
        higherIsWorse: true,
        interpretation: `${betterCount} times a better pass was open than the one we played.`,
        // Every one of these events is itself an instance of the fault.
        population: better,
        moments: better,
        rank: (event) => payloadNum(event, "best_gain_m"),
      }),
    );
  }

  const passes = (stats?.passes ?? []).filter((p: any) => p?.team === team);
  // Only passes the file actually judged can be a share of anything. Dividing
  // by every pass, half of which carry no verdict, made the figure look better
  // the less the pipeline knew.
  const judged = passes.filter((p: any) => passCompleted(p) !== null);
  const rough = judged.filter(
    (p: any) => p?.quality === "risky_completed" || p?.quality === "bad_lost",
  );
  const roughShare = judged.length ? Math.round((rough.length / judged.length) * 100) : 0;
  if (judged.length >= 20 && roughShare > 30) {
    out.push(
      finding({
        id: "risky_passing",
        headline: "Choose safer passes under pressure.",
        value: roughShare,
        target: 30,
        unit: "%",
        higherIsWorse: true,
        interpretation: `${rough.length} of the ${judged.length} passes this file judged were risky or given away${
          passes.length > judged.length
            ? ` (${passes.length - judged.length} more carry no verdict and are left out)`
            : ""
        }.`,
        // Passes are not in the events list, so there is nothing to open.
        population: [],
        moments: [],
      }),
    );
  }

  const block = num(row.block_length_median_m, 0);
  if (block > thresholds.blockCeilingM) {
    out.push(
      finding({
        id: "long_block",
        headline: "Stay connected from back to front.",
        value: block,
        target: thresholds.blockCeilingM,
        unit: "m",
        higherIsWorse: true,
        interpretation: `Typical distance from the deepest to the highest player was ${block} m, above the ${thresholds.blockCeilingM} m ceiling you set.`,
        // A shape measured across the whole match has no single moment.
        population: [],
        moments: [],
      }),
    );
  }

  const tilt = num(stats?.metrics?.["field"]?.[team]?.field_tilt_pct, 100);
  if (tilt < 30) {
    out.push(
      finding({
        id: "low_tilt",
        headline: "Move the game into their third.",
        value: tilt,
        target: 30,
        unit: "%",
        higherIsWorse: false,
        interpretation: `Only ${tilt}% of the play in the final thirds was in the opponent's third.`,
        population: [],
        moments: [],
      }),
    );
  }

  // An absent bucket is not a zero. Defaulting it to 0 fired this finding --
  // "all 23 balls won came in your own half" -- on any export that simply does
  // not carry high_turnover_counts, and attached all 23 regains as evidence
  // for a claim nothing had measured. Every neighbouring finding defaults the
  // other way for exactly this reason.
  const highRaw = stats?.metrics?.["high_turnover_counts"]?.[team];
  const highWon = typeof highRaw === "number" && Number.isFinite(highRaw) ? highRaw : null;
  if (highWon === 0 && won.length >= 5) {
    out.push(
      finding({
        id: "no_high_turnovers",
        headline: "Win the ball higher up.",
        value: 0,
        target: 1,
        unit: "times",
        higherIsWorse: false,
        interpretation: `All ${won.length} balls won came in your own half, so nothing started close to their goal.`,
        // None of them were high, so every ball won is an instance.
        population: won,
        moments: won,
      }),
    );
  }

  // Worst first, as three screens promise. The miss is measured against the
  // target in the target's own units, so a 34% press against a 60% target
  // (missed by 43% of the target) outranks a 32% regain against 35% (9%).
  // Counts with no real target ("411 times") cannot be ranked that way, so
  // they come after the targeted findings, biggest count first.
  const miss = (f: Finding) => {
    if (f.unit === "times" || f.target <= 0) return null;
    return (f.higherIsWorse ? f.value - f.target : f.target - f.value) / f.target;
  };
  return out.sort((a, b) => {
    const ma = miss(a);
    const mb = miss(b);
    if (ma !== null && mb !== null) return mb - ma;
    if (ma === null && mb === null) return b.value - a.value;
    return ma === null ? 1 : -1;
  });
}

/**
 * A figure the file actually carries, or null.
 *
 * The summary used to read "had the ball 0% of the time … from 0 spells of 0
 * passes each … 0 m long from back to front" whenever the export was missing
 * those fields, which is a paragraph of confident nonsense about the team. A
 * sentence that cannot be written truthfully is not written.
 */
function possess(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
}

export function buildSummary(
  data: MatchDataFile | undefined,
  stats: StatsFile | undefined,
  team: TeamKey,
  findings: Finding[],
  names: { own: string; other: string },
): string[] {
  const row = teamRow(stats, team);
  if (!data || !row) return [];
  const other: TeamKey = team === "A" ? "B" : "A";
  const otherRow = teamRow(stats, other);
  const shots = contractShots(stats, team).length;
  const lost = eventsFor(data, team, "turnover_lost").length;
  const won = eventsFor(data, team, "turnover_won").length;
  const lines = [
    possess(row.possession_pct) === null
      ? `How much of the ball ${names.own} had is not in this match file.`
      : `${names.own} had the ball ${possess(row.possession_pct)}% of the time against ${
          names.other
        }'s ${possess(otherRow?.possession_pct) ?? "an unrecorded share"}%.`,
    `The ball was given away ${lost} times and won back ${won} times${
      possess(row.pressed_within_2s_pct) === null
        ? ", and no loss in this file carries a time to first pressure."
        : `, with first pressure arriving inside two seconds ${possess(row.pressed_within_2s_pct)}% of the time.`
    }`,
    `${shots} shot${shots === 1 ? "" : "s"} came from ${
      finalThirdEntries(stats, team) ?? "an unrecorded number of"
    } entries into the final third${
      possess(row.block_length_median_m) === null
        ? "."
        : `, with the team typically ${possess(row.block_length_median_m)} m long from back to front.`
    }`,
  ];
  if (findings.length === 0) {
    lines.push("Every target you set was met in this match, so there is nothing flagged to train.");
  }
  return lines;
}

/* ---------------- stats sections ---------------- */

export type StatRow = { label: string; a: string; b: string; target?: string };
export type StatSection = { key: string; label: string; caption: string; rows: StatRow[] };

function fmt(v: unknown, suffix = "") {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  const rounded = Math.round(v * 10) / 10;
  return `${rounded}${suffix}`;
}

/** The pipeline records the kind of set piece in the payload, under one of several keys. */
export function setPieceKind(event: { payload?: Record<string, unknown> | null | undefined }) {
  const payload = event.payload ?? {};
  const raw = String(
    payload["kind"] ?? payload["set_piece"] ?? payload["type"] ?? "",
  ).toLowerCase();
  // Normalised so "goal kick", "goal_kick" and "goalkick" all count once; an
  // unrecognised kind stays as written rather than vanishing into "".
  const kind = raw.replace(/[\s_-]+/g, " ").trim();
  if (kind.includes("corner")) return "corner";
  if (kind.includes("throw")) return "throw-in";
  if (kind.includes("goal")) return "goal kick";
  if (kind.includes("free") || kind.includes("foul")) return "free kick";
  if (kind.includes("penalty")) return "penalty";
  if (kind.includes("kick") && kind.includes("off")) return "kick-off";
  return kind || "other";
}

function setPieceCount(data: MatchDataFile | undefined, team: TeamKey, kind: string) {
  return (data?.events ?? []).filter(
    (event) =>
      event.type === "set_piece" && event.team === team && setPieceKind(event).includes(kind),
  ).length;
}

export function buildStatSections(
  data: MatchDataFile | undefined,
  stats: StatsFile | undefined,
  thresholds: Thresholds,
): StatSection[] {
  const a = teamRow(stats, "A");
  const b = teamRow(stats, "B");
  const shotsOf = (team: TeamKey) => contractShots(stats, team);
  const eventCount = (team: TeamKey, type: string) =>
    (data?.events ?? []).filter((e) => e.type === type && e.team === team).length;
  const passesOf = (team: TeamKey) => (stats?.passes ?? []).filter((p: any) => p?.team === team);
  // Passes the file actually marked as poor. A pass with no verdict is not
  // counted either way — it is unknown, not fine.
  const quality = (team: TeamKey, kinds: string[]) =>
    passesOf(team).filter((p: any) => kinds.includes(p?.quality)).length;
  const completion = (team: TeamKey) => completionOf(passesOf(team));

  const row = (label: string, key: string, suffix = "", target?: string): StatRow => ({
    label,
    a: fmt(a?.[key], suffix),
    b: fmt(b?.[key], suffix),
    ...(target ? { target } : {}),
  });

  return [
    {
      key: "ball",
      label: "Ball",
      caption: "Who kept the ball and how long they kept it for.",
      rows: [
        row("Time with the ball", "possession_pct", "%"),
        row("Seconds with the ball", "possession_s", " s"),
        row("Spells with the ball", "sequences"),
        row("Passes played", "passes"),
        row("Passes that found a team-mate", "pass_completion_pct", "%"),
        row("Passes per spell", "passes_per_sequence"),
      ],
    },
    {
      key: "pressing",
      label: "Pressing",
      caption: "How quickly the team reacted after losing the ball.",
      rows: [
        row("Pressure inside 2 s", "pressed_within_2s_pct", "%", `${thresholds.pressWithin2s}%`),
        row("Ball back inside 5 s", "regained_within_5s_pct", "%", `${thresholds.regainWithin5s}%`),
        row("Time to first pressure", "time_to_press_median_s", " s"),
        row("Team-mates near at 2 s", "near_at_2s_median"),
        row("Pressures applied", "pressures_applied"),
        row("Opponent passes per action", "ppda_opp_passes_per_def_action"),
      ],
    },
    {
      key: "shape",
      label: "Shape",
      caption: "How compact the team stayed with and without the ball.",
      rows: [
        row("Length back to front", "block_length_median_m", " m", `${thresholds.blockCeilingM} m`),
        row("Width side to side", "block_width_median_m", " m"),
        row("Height of the last line", "def_line_height_median_m", " m"),
        row("Distance covered", "distance_m_total_visible", " m"),
      ],
    },
    {
      key: "shooting",
      label: "Shooting",
      caption: "Shots, goals and how far play got up the pitch.",
      rows: [
        { label: "Shots", a: `${shotsOf("A").length}`, b: `${shotsOf("B").length}` },
        {
          label: "Goals",
          a: `${shotsOf("A").filter((shot) => shot.goal).length}`,
          b: `${shotsOf("B").filter((shot) => shot.goal).length}`,
        },
        {
          label: "Time in their third",
          a: fmt(stats?.metrics?.["field"]?.["A"]?.field_tilt_pct, "%"),
          b: fmt(stats?.metrics?.["field"]?.["B"]?.field_tilt_pct, "%"),
        },
        {
          label: "Entries into the final third",
          a: fmt(finalThirdEntries(stats, "A")),
          b: fmt(finalThirdEntries(stats, "B")),
        },
        {
          label: "Balls won high up",
          a: fmt(stats?.metrics?.["high_turnover_counts"]?.["A"]),
          b: fmt(stats?.metrics?.["high_turnover_counts"]?.["B"]),
        },
      ],
    },
    { key: "players", label: "Players", caption: "Each player's own numbers.", rows: [] },
    {
      key: "setpieces",
      label: "Set pieces",
      caption: "Corners and free kicks the pipeline found, and where they went.",
      rows: [
        {
          label: "Corners",
          a: `${setPieceCount(data, "A", "corner")}`,
          b: `${setPieceCount(data, "B", "corner")}`,
        },
        {
          label: "Free kicks",
          a: `${setPieceCount(data, "A", "free")}`,
          b: `${setPieceCount(data, "B", "free")}`,
        },
        {
          label: "Throw-ins",
          a: `${setPieceCount(data, "A", "throw")}`,
          b: `${setPieceCount(data, "B", "throw")}`,
        },
        {
          label: "Set pieces in all",
          a: `${eventCount("A", "set_piece")}`,
          b: `${eventCount("B", "set_piece")}`,
        },
      ],
    },
    {
      key: "passes",
      label: "Passes",
      caption: "How the passes were played and how they ended.",
      rows: [
        { label: "Passes played", a: `${passesOf("A").length}`, b: `${passesOf("B").length}` },
        row("Forward share", "forward_pass_share_pct", "%"),
        row("Progressive passes", "progressive_passes"),
        {
          label: "Risky or lost",
          a: `${quality("A", ["risky_completed", "bad_lost"])}`,
          b: `${quality("B", ["risky_completed", "bad_lost"])}`,
        },
        {
          label: "Better pass available",
          a: `${eventCount("A", "better_option")}`,
          b: `${eventCount("B", "better_option")}`,
        },
        {
          label: "Balls given away",
          a: `${eventCount("A", "turnover_lost")}`,
          b: `${eventCount("B", "turnover_lost")}`,
        },
      ],
    },
  ];
}

export type PlayerStat = {
  id: number;
  team: TeamKey;
  touches: number;
  passes: number;
  passesCompleted: number;
  betterOptions: number;
  distanceM: number;
  minutes: number;
};

export function buildPlayerStats(stats: StatsFile | undefined, team: TeamKey | null): PlayerStat[] {
  return (stats?.players ?? [])
    .filter((p: any) => (team ? p?.team === team : true))
    .map((p: any) => ({
      id: p.id,
      team: p.team,
      touches: num(p.touches, 0),
      passes: num(p.passes, 0),
      passesCompleted: num(p.passes_completed, 0),
      betterOptions: num(p.better_option_count, 0),
      distanceM: Math.round(num(p.distance_m, 0)),
      // One decimal: rounding to whole minutes made a 40-second cameo a
      // one-minute player and let it top the distance-per-minute table.
      minutes: Math.round(num(p.time_visible_s, 0) / 6) / 10,
    }))
    .sort((x, y) => y.touches - x.touches);
}

/** Attack direction for the header line, from the data or the label override. */
export function attacksRight(
  attackRight: Record<string, boolean> | null | undefined,
  override: Record<string, boolean> | null | undefined,
  team: TeamKey,
) {
  const value = override?.[team] ?? attackRight?.[team];
  // The export contract: A attacks right, B left, unless the file says otherwise.
  return typeof value === "boolean" ? value : team === "A";
}

/** Positions from the frame at a moment's time, for the recap illustration. */
export function buildMomentShape(
  data: MatchDataFile | undefined,
  t: number | undefined,
): {
  dots: { x: number; y: number; team: TeamKey }[];
  carrier?: { x: number; y: number };
  target?: { x: number; y: number };
} | null {
  if (!data || t == null) return null;
  const frame = frameAt(data.frames ?? [], t);
  if (!frame) return null;
  const { length, width } = pitchSize(data, undefined);
  const dots = frame.players
    .filter((p) => p.state !== "stale")
    .map((p) => ({ ...toPercent(p.m, length, width), team: p.team as TeamKey }));
  const carrierPlayer = frame.players.find((p) => p.id === frame.carrier);
  const openLane = (frame.lanes ?? []).find((l) => l.open && l.forward) ?? (frame.lanes ?? [])[0];
  const targetPlayer = openLane ? frame.players.find((p) => p.id === openLane.to) : undefined;
  return {
    dots,
    ...(carrierPlayer ? { carrier: toPercent(carrierPlayer.m, length, width) } : {}),
    ...(targetPlayer ? { target: toPercent(targetPlayer.m, length, width) } : {}),
  };
}
