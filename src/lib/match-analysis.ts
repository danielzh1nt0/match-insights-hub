/**
 * Everything the match screens show is derived here, from the open match's own
 * files: match_data.json (frames + the single events list) and stats.json.
 *
 * Team is always the literal "A" or "B" in the data. Label-map names and
 * colours are display only and are never compared against.
 */

import type { TeamScope } from "@/components/ip/chrome";
import type { Finding } from "@/lib/match-data";
import type { FeedEvent, Frame, FramePlayer, MatchDataFile, MatchLabelRow } from "@/lib/match-source";

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

function num(v: unknown, fallback: number) {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
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
    players: { x: number; y: number; shirt: number; predicted: boolean }[];
    lengthM: number;
    widthM: number;
  }[];
  losses: { x: number; y: number }[];
  recoveries: { x: number; y: number }[];
  blockLengthM: number;
  compactBandM: number;
  lineHeightM: number;
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
  const frames = data.frames ?? [];
  const cells = new Float64Array(HEAT_COLS * HEAT_ROWS);
  const ids = new Set<number>();
  let frameCount = 0;

  for (const frame of frames) {
    let counted = false;
    for (const p of frame.players) {
      if (team && p.team !== team) continue;
      if (p.state === "stale") continue;
      counted = true;
      ids.add(p.id);
      const col = Math.min(HEAT_COLS - 1, Math.max(0, Math.floor((p.m[0] / length) * HEAT_COLS)));
      const row = Math.min(HEAT_ROWS - 1, Math.max(0, Math.floor((p.m[1] / width) * HEAT_ROWS)));
      cells[row * HEAT_COLS + col] += 1;
    }
    if (counted) frameCount += 1;
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
        ...toPercent(p.m, length, width),
        shirt: p.id,
        predicted: p.state === "predicted",
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
  const positionAt = (t: number) => {
    const frame = frameAt(frames, t);
    const m = frame?.ball?.m;
    if (m) return toPercent(m as [number, number], length, width);
    const carrier = frame?.players.find((p) => p.id === (frame as any)?.carrier);
    return carrier ? toPercent(carrier.m, length, width) : null;
  };
  const pick = (type: string) =>
    (data.events ?? [])
      .filter((e) => e.type === type && (!team || e.team === team))
      .map((e) => positionAt(e.t))
      .filter((p): p is { x: number; y: number } => p !== null);

  const row = teamRow(stats, shapeTeam);
  return {
    heat,
    frameCount,
    playerCount: ids.size,
    snapshots,
    losses: pick("turnover_lost"),
    recoveries: pick("turnover_won"),
    blockLengthM: Math.round(num(row?.block_length_median_m, 0)),
    compactBandM: Math.round(num(row?.block_width_median_m, 0)),
    lineHeightM: Math.round(num(row?.def_line_height_median_m, 0)),
  };
}

/* ---------------- findings, from this match's numbers ---------------- */

function eventsFor(data: MatchDataFile | undefined, team: TeamKey, type: string) {
  return (data?.events ?? []).filter((e) => e.type === type && e.team === team);
}

function pressSorted(events: FeedEvent[]) {
  return [...events].sort((a, b) => {
    const av = a.payload?.["time_to_press"];
    const bv = b.payload?.["time_to_press"];
    if (av == null && bv == null) return a.t - b.t;
    if (av == null) return -1; // nulls first
    if (bv == null) return 1;
    return bv - av;
  });
}

function finding(
  id: string,
  headline: string,
  value: number,
  target: number,
  unit: string,
  higherIsWorse: boolean,
  interpretation: string,
  moments: FeedEvent[],
): Finding {
  return {
    id,
    headline,
    value: Math.round(value * 10) / 10,
    target,
    unit,
    higherIsWorse,
    events: moments.length,
    eventIds: moments.map((e) => e.id),
    interpretation,
    timestamps: moments.slice(0, 6).map((e) => Math.round(e.t * 10) / 10),
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
      finding(
        "slow_press",
        `First pressure after losing the ball: ${pressed}% within 2 s (target ${thresholds.pressWithin2s}%)`,
        pressed,
        thresholds.pressWithin2s,
        "%",
        false,
        `Of ${lost.length} balls lost, only ${pressed}% got pressure inside two seconds. In the rest the nearest player waited instead of stepping in.`,
        pressSorted(lost),
      ),
    );
  }

  const regained = num(row.regained_within_5s_pct, 100);
  if (regained < thresholds.regainWithin5s) {
    out.push(
      finding(
        "no_regain",
        "The ball rarely came back inside five seconds",
        regained,
        thresholds.regainWithin5s,
        "%",
        false,
        `${regained}% of losses were won back inside five seconds, so the opponent had time to settle after most turnovers.`,
        lost.filter((e) => e.payload?.["regained_within_5s"] === false),
      ),
    );
  }

  const alone = num(row.near_at_2s_median, 9);
  if (alone < 2) {
    out.push(
      finding(
        "press_alone",
        "The first presser was on their own",
        alone,
        2,
        "players",
        false,
        `Two seconds after losing the ball there were typically ${alone} team-mates within five metres, so the press could be played around.`,
        pressSorted(lost),
      ),
    );
  }

  const forward = num(row.forward_within_3s_pct, 100);
  if (forward < 50) {
    out.push(
      finding(
        "slow_forward",
        "Winning the ball rarely led forward",
        forward,
        50,
        "%",
        false,
        `After winning the ball, only ${forward}% of the time did a forward pass follow inside three seconds.`,
        won,
      ),
    );
  }

  const lostBack = num(row.lost_back_5s_pct, 0);
  if (lostBack > 40) {
    out.push(
      finding(
        "won_and_lost",
        "Won the ball, then gave it straight back",
        lostBack,
        40,
        "%",
        true,
        `${lostBack}% of the balls won were lost again inside five seconds.`,
        won,
      ),
    );
  }

  if (better.length >= 3) {
    out.push(
      finding(
        "better_option",
        "A clearly better pass was available and wasn't played",
        better.length,
        1,
        "times",
        true,
        `${better.length} times the ball went sideways or backwards while a better forward pass was open.`,
        better,
      ),
    );
  }

  const passes = (stats?.passes ?? []).filter((p: any) => p?.team === team);
  const rough = passes.filter(
    (p: any) => p?.quality === "risky_completed" || p?.quality === "bad_lost",
  );
  const roughShare = passes.length ? Math.round((rough.length / passes.length) * 100) : 0;
  if (roughShare > 30) {
    out.push(
      finding(
        "risky_passing",
        "Too many passes were risky or lost",
        roughShare,
        30,
        "%",
        true,
        `${rough.length} of ${passes.length} passes were risky or given away.`,
        [],
      ),
    );
  }

  const block = num(row.block_length_median_m, 0);
  if (block > thresholds.blockCeilingM) {
    out.push(
      finding(
        "long_block",
        "The team was stretched from back to front",
        block,
        thresholds.blockCeilingM,
        "m",
        true,
        `Typical distance from the deepest to the highest player was ${block} m, above the ${thresholds.blockCeilingM} m ceiling you set.`,
        [],
      ),
    );
  }

  const tilt = num(stats?.metrics?.["field"]?.[team]?.field_tilt_pct, 100);
  if (tilt < 30) {
    out.push(
      finding(
        "low_tilt",
        "Little time spent in the opponent's third",
        tilt,
        30,
        "%",
        false,
        `Only ${tilt}% of the play in the final thirds was in the opponent's third.`,
        [],
      ),
    );
  }

  const highWon = num(stats?.metrics?.["high_turnover_counts"]?.[team], 0);
  if (highWon === 0 && won.length >= 5) {
    out.push(
      finding(
        "no_high_turnovers",
        "No ball was won high up the pitch",
        0,
        1,
        "times",
        false,
        `All ${won.length} balls won came in your own half, so nothing started close to their goal.`,
        won,
      ),
    );
  }

  return out;
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
  const shots = (stats?.metrics?.["shots"] ?? []).filter((s: any) => s?.team === team).length;
  const lost = eventsFor(data, team, "turnover_lost").length;
  const won = eventsFor(data, team, "turnover_won").length;
  const lines = [
    `${names.own} had the ball ${num(row.possession_pct, 0)}% of the time against ${
      names.other
    }'s ${num(otherRow?.possession_pct, 0)}%, from ${num(row.sequences, 0)} spells of ${num(
      row.passes_per_sequence,
      0,
    )} passes each.`,
    `The ball was given away ${lost} times and won back ${won} times, with first pressure arriving inside two seconds ${num(
      row.pressed_within_2s_pct,
      0,
    )}% of the time.`,
    `${shots} shot${shots === 1 ? "" : "s"} came from ${num(
      stats?.metrics?.["field"]?.[team]?.entries_count,
      0,
    )} entries into the final third, with the team typically ${num(
      row.block_length_median_m,
      0,
    )} m long from back to front.`,
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

export function buildStatSections(
  data: MatchDataFile | undefined,
  stats: StatsFile | undefined,
  thresholds: Thresholds,
): StatSection[] {
  const a = teamRow(stats, "A");
  const b = teamRow(stats, "B");
  const shotsOf = (team: TeamKey) =>
    (stats?.metrics?.["shots"] ?? []).filter((s: any) => s?.team === team);
  const eventCount = (team: TeamKey, type: string) =>
    (data?.events ?? []).filter((e) => e.type === type && e.team === team).length;
  const passesOf = (team: TeamKey) => (stats?.passes ?? []).filter((p: any) => p?.team === team);
  const quality = (team: TeamKey, kinds: string[]) =>
    passesOf(team).filter((p: any) => kinds.includes(p?.quality)).length;

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
          a: `${shotsOf("A").filter((s: any) => s?.goal).length}`,
          b: `${shotsOf("B").filter((s: any) => s?.goal).length}`,
        },
        {
          label: "Time in their third",
          a: fmt(stats?.metrics?.["field"]?.["A"]?.field_tilt_pct, "%"),
          b: fmt(stats?.metrics?.["field"]?.["B"]?.field_tilt_pct, "%"),
        },
        {
          label: "Entries into the final third",
          a: fmt(stats?.metrics?.["field"]?.["A"]?.entries_count),
          b: fmt(stats?.metrics?.["field"]?.["B"]?.entries_count),
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
      minutes: Math.round(num(p.time_visible_s, 0) / 60),
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
  return value === true;
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
