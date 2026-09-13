/**
 * Analysis data for the match screens. Deterministic per match id so the same
 * match always renders the same pitch maps, events and findings.
 *
 * Everything the screens show is derived from one list of events plus the shape
 * snapshots: findings, clips and each player's own numbers all count the same
 * moments, so a number on one screen always matches the moments on another.
 */

export type EventKind =
  | "goal"
  | "shot"
  | "turnover_lost"
  | "turnover_won"
  | "high_turnover"
  | "pass_bad"
  | "pass_risky"
  | "better_option"
  | "set_piece"
  | "sequence_end";

export type Team = "a" | "b";

export type MatchEvent = {
  id: string;
  t: number; // seconds
  kind: EventKind;
  team: Team;
  x: number; // 0-100, left to right in team A attacking direction
  y: number; // 0-100, top to bottom
  player?: string;
  playerId?: string; // set for team A events only
  pressureS?: number; // seconds until first pressure, on losses
  note: string;
};

export type Finding = {
  id: string;
  headline: string;
  value: number;
  target: number;
  unit: string;
  higherIsWorse: boolean;
  events: number;
  eventIds: string[];
  interpretation: string;
  timestamps: number[];
};

export type PlayerRow = {
  id: string;
  shirt: number;
  name: string;
  position: string;
  minutes: number;
  base: { x: number; y: number };
  heat: { x: number; y: number; w: number }[];
  touches: number;
  passes: number;
  passAccuracy: number;
  losses: number;
  regains: number;
  betterOptions: number;
  distanceKm: number;
};

export type StatRow = { label: string; a: string; b: string; target?: string };
export type StatTab = { key: string; label: string; caption: string; rows: StatRow[] };

export type Snapshot = {
  t: number;
  players: { x: number; y: number; shirt: number }[];
  lengthM: number;
  widthM: number;
};

export type Clip = {
  id: string;
  t: number;
  title: string;
  tag: string;
  reason: string;
  findingId?: string;
  playerId?: string;
};

export type MatchData = {
  events: MatchEvent[];
  possession: { t: number; len: number; team: Team }[];
  momentum: number[]; // -1 (team B) .. 1 (team A)
  zones: number[]; // 24 values (6 cols x 4 rows), share of ball time for team A
  heat: { x: number; y: number; w: number }[];
  losses: { x: number; y: number }[];
  recoveries: { x: number; y: number }[];
  snapshots: Snapshot[];
  compactBandM: number;
  blockLengthM: number;
  summary: string[];
  findings: Finding[];
  players: PlayerRow[];
  stats: StatTab[];
  clips: Clip[];
};

export const EVENT_LABEL: Record<EventKind, string> = {
  goal: "Goal",
  shot: "Shot",
  turnover_lost: "Ball lost",
  turnover_won: "Ball won",
  high_turnover: "Ball won high up",
  pass_bad: "Bad pass",
  pass_risky: "Risky pass",
  better_option: "Better pass available",
  set_piece: "Set piece",
  sequence_end: "Attack ended",
};

export const EVENT_TONE: Record<EventKind, "good" | "risky" | "bad" | "neutral" | "cream"> = {
  goal: "cream",
  shot: "good",
  turnover_lost: "bad",
  turnover_won: "good",
  high_turnover: "good",
  pass_bad: "bad",
  pass_risky: "risky",
  better_option: "risky",
  set_piece: "neutral",
  sequence_end: "neutral",
};

export const EVENT_FILTERS = [
  { key: "all", label: "All", kinds: null },
  { key: "goals", label: "Goals & shots", kinds: ["goal", "shot"] },
  { key: "turnovers", label: "Turnovers", kinds: ["turnover_lost", "turnover_won", "high_turnover"] },
  { key: "passes", label: "Passes", kinds: ["pass_bad", "pass_risky", "better_option"] },
  { key: "set", label: "Set pieces", kinds: ["set_piece"] },
] as const;

/* ---------------- deterministic randomness ---------------- */

function seedFrom(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const FIRST_NAMES = ["Luca", "Jonas", "Emre", "Milan", "Noah", "Tim", "Finn", "Elias", "Ben", "Nico", "Jan"];
const LAST_NAMES = ["Braun", "Keller", "Vogel", "Hartmann", "Roth", "Sauer", "Weiss", "Lang", "Krause", "Dietz", "Amrani"];
const POSITIONS = ["GK", "RB", "CB", "CB", "LB", "CM", "CM", "RW", "AM", "LW", "ST"];
const FORMATION = [
  { x: 9, y: 50 },
  { x: 28, y: 18 },
  { x: 20, y: 37 },
  { x: 20, y: 63 },
  { x: 28, y: 82 },
  { x: 45, y: 38 },
  { x: 45, y: 62 },
  { x: 70, y: 16 },
  { x: 62, y: 50 },
  { x: 70, y: 84 },
  { x: 82, y: 50 },
];

const PITCH_LENGTH_M = 105;
const PITCH_WIDTH_M = 68;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function buildMatchData(matchId: string, durationS: number): MatchData {
  const rand = rng(seedFrom(matchId));
  const span = Math.max(40, durationS);
  const minutes = Math.max(1, Math.round(span / 60));

  /* ---------- players ---------- */
  const players: PlayerRow[] = Array.from({ length: 11 }, (_, i) => {
    const base = FORMATION[i] as { x: number; y: number };
    const heat = Array.from({ length: 12 }, () => ({
      x: clamp(Math.round(base.x + (rand() - 0.5) * 26), 6, 94),
      y: clamp(Math.round(base.y + (rand() - 0.5) * 30), 6, 94),
      w: Math.round((0.3 + rand() * 0.7) * 100) / 100,
    }));
    return {
      id: `p${i + 1}`,
      shirt: i + 1,
      name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[i % LAST_NAMES.length]}`,
      position: POSITIONS[i] as string,
      minutes,
      base,
      heat,
      touches: 8 + Math.round(rand() * 40),
      passes: 5 + Math.round(rand() * 32),
      passAccuracy: 62 + Math.round(rand() * 30),
      losses: 0,
      regains: 0,
      betterOptions: 0,
      distanceKm: Math.round((0.4 + rand() * 1.2) * 100) / 100,
    };
  });

  /* ---------- events ---------- */
  const kinds: EventKind[] = [
    "turnover_lost",
    "pass_risky",
    "better_option",
    "turnover_won",
    "shot",
    "pass_bad",
    "high_turnover",
    "set_piece",
    "sequence_end",
  ];
  const eventCount = Math.max(10, Math.min(34, Math.round(span / 3)));
  const events: MatchEvent[] = [];
  for (let i = 0; i < eventCount; i += 1) {
    const kind = kinds[Math.floor(rand() * kinds.length)] as EventKind;
    const team: Team = rand() > 0.42 ? "a" : "b";
    const owner = players[1 + Math.floor(rand() * 10)] as PlayerRow;
    const x = team === "a" ? clamp(Math.round(owner.base.x + (rand() - 0.5) * 22), 8, 92) : Math.round(12 + rand() * 76);
    const y = team === "a" ? clamp(Math.round(owner.base.y + (rand() - 0.5) * 24), 8, 92) : Math.round(10 + rand() * 80);
    const event: MatchEvent = {
      id: `${matchId}-e${i}`,
      t: Math.round((span * (i + 0.5)) / eventCount),
      kind,
      team,
      x,
      y,
      note: "",
    };
    if (team === "a") {
      event.player = owner.name;
      event.playerId = owner.id;
    } else {
      event.player = `${LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]}`;
    }
    if (kind === "turnover_lost") {
      event.pressureS = Math.round((0.6 + rand() * 3.6) * 10) / 10;
      event.note = `First pressure after ${event.pressureS.toFixed(1)} s.`;
    }
    if (kind === "better_option") {
      event.note = "Ball went sideways with a forward pass open.";
    }
    events.push(event);
  }
  const scorer = players[10] as PlayerRow;
  events.push({
    id: `${matchId}-goal`,
    t: Math.round(span * 0.62),
    kind: "goal",
    team: "a",
    x: 88,
    y: 46,
    player: scorer.name,
    playerId: scorer.id,
    note: "Second ball after the corner, low finish.",
  });
  events.sort((a, b) => a.t - b.t);

  /* per-player counts come straight from the events */
  for (const e of events) {
    if (!e.playerId) continue;
    const p = players.find((row) => row.id === e.playerId);
    if (!p) continue;
    if (e.kind === "turnover_lost" || e.kind === "pass_bad") p.losses += 1;
    if (e.kind === "turnover_won" || e.kind === "high_turnover") p.regains += 1;
    if (e.kind === "better_option") p.betterOptions += 1;
  }

  /* ---------- possession, momentum, zones ---------- */
  const possession: { t: number; len: number; team: Team }[] = [];
  let cursor = 0;
  while (cursor < span) {
    const len = Math.max(2, Math.round(2 + rand() * (span / 8)));
    possession.push({ t: cursor, len: Math.min(len, span - cursor), team: rand() > 0.46 ? "a" : "b" });
    cursor += len;
  }
  const possessionA = possession.filter((s) => s.team === "a").reduce((sum, s) => sum + s.len, 0);
  const possessionShareA = Math.round((possessionA / span) * 100);
  const longestA = Math.max(...possession.filter((s) => s.team === "a").map((s) => s.len), 0);
  const longestB = Math.max(...possession.filter((s) => s.team === "b").map((s) => s.len), 0);

  const momentum = Array.from({ length: 40 }, (_, i) => {
    const wave = Math.sin((i / 40) * Math.PI * 2.2);
    return Math.max(-1, Math.min(1, wave * 0.6 + (rand() - 0.5) * 0.7));
  });

  const rawZones = Array.from({ length: 24 }, (_, i) => {
    const col = i % 6;
    const centreBias = 1 - Math.abs(Math.floor(i / 6) - 1.5) / 2.4;
    return (0.4 + rand() * 0.6) * (0.5 + col / 6) * centreBias;
  });
  const zoneTotal = rawZones.reduce((s, v) => s + v, 0);
  const zones = rawZones.map((v) => Math.round((v / zoneTotal) * 1000) / 10);

  /* team heat map is every player's heat pooled together */
  const heat = players.slice(1).flatMap((p) => p.heat.slice(0, 3));

  const losses = events
    .filter((e) => e.team === "a" && (e.kind === "turnover_lost" || e.kind === "pass_bad"))
    .map((e) => ({ x: e.x, y: e.y }));
  const recoveries = events
    .filter((e) => e.team === "a" && (e.kind === "turnover_won" || e.kind === "high_turnover"))
    .map((e) => ({ x: e.x, y: e.y }));

  /* ---------- shape snapshots ---------- */
  const snapshots: Snapshot[] = Array.from(
    { length: Math.max(2, Math.min(8, Math.round(span / 30) + 1)) },
    (_, i) => {
      const shift = (rand() - 0.5) * 16;
      const stretch = 0.85 + rand() * 0.5;
      const shape = players.slice(1).map((p) => ({
        shirt: p.shirt,
        x: clamp(Math.round(50 + (p.base.x - 50) * stretch + shift), 4, 96),
        y: clamp(Math.round(50 + (p.base.y - 50) * (0.8 + rand() * 0.4)), 4, 96),
      }));
      const xs = shape.map((s) => s.x);
      const ys = shape.map((s) => s.y);
      return {
        t: i * 30,
        players: shape,
        lengthM: Math.round(((Math.max(...xs) - Math.min(...xs)) / 100) * PITCH_LENGTH_M),
        widthM: Math.round(((Math.max(...ys) - Math.min(...ys)) / 100) * PITCH_WIDTH_M),
      };
    },
  );
  const blockLengthM = Math.round(
    snapshots.reduce((sum, s) => sum + s.lengthM, 0) / snapshots.length,
  );
  const compactBandM = Math.round(snapshots.reduce((sum, s) => sum + s.widthM, 0) / snapshots.length);
  const longSpells = snapshots.filter((s) => s.lengthM > 38);

  /* ---------- findings, counted from the events above ---------- */
  const betterOptionEvents = events.filter((e) => e.team === "a" && e.kind === "better_option");
  const lossEvents = events.filter((e) => e.team === "a" && e.kind === "turnover_lost");
  const pressedInTime = lossEvents.filter((e) => (e.pressureS ?? 9) <= 2);
  const pressShare = lossEvents.length ? Math.round((pressedInTime.length / lossEvents.length) * 100) : 0;
  const latePressures = lossEvents.filter((e) => (e.pressureS ?? 9) > 2);

  const findings: Finding[] = [
    {
      id: "better-option",
      headline: "A clearly better pass was available and wasn't played",
      value: betterOptionEvents.length,
      target: 1,
      unit: "times",
      higherIsWorse: true,
      events: betterOptionEvents.length,
      eventIds: betterOptionEvents.map((e) => e.id),
      interpretation: `${betterOptionEvents.length} times the ball went sideways while a forward pass was open. Each one gave the opponent time to get back into shape.`,
      timestamps: betterOptionEvents.map((e) => e.t),
    },
    {
      id: "press-2s",
      headline: "First pressure after losing the ball",
      value: pressShare,
      target: 60,
      unit: "%",
      higherIsWorse: false,
      events: lossEvents.length,
      eventIds: latePressures.map((e) => e.id),
      interpretation: `${pressedInTime.length} of ${lossEvents.length} losses got pressure inside two seconds. In the rest the nearest player waited instead of stepping in.`,
      timestamps: latePressures.map((e) => e.t),
    },
    {
      id: "block-length",
      headline: "How stretched the team got from back to front",
      value: blockLengthM,
      target: 38,
      unit: "m",
      higherIsWorse: true,
      events: longSpells.length,
      eventIds: [],
      interpretation: longSpells.length
        ? `In ${longSpells.length} spells the team was longer than the ceiling you set, so the middle of the pitch was left open.`
        : "The team stayed inside the ceiling you set, so the middle of the pitch stayed covered.",
      timestamps: longSpells.map((s) => s.t),
    },
  ];

  /* ---------- clips: the moments behind the findings ---------- */
  const goal = events.find((e) => e.kind === "goal");
  const worstPressure = [...latePressures].sort((a, b) => (b.pressureS ?? 0) - (a.pressureS ?? 0))[0];
  const longestSpell = [...snapshots].sort((a, b) => b.lengthM - a.lengthM)[0];
  const clipCandidates: (Clip | null)[] = [
    betterOptionEvents[0]
      ? {
          id: betterOptionEvents[0].id,
          t: betterOptionEvents[0].t,
          title: "Sideways pass, forward pass open",
          tag: "Better option",
          reason: betterOptionEvents[0].note,
          findingId: "better-option",
          ...(betterOptionEvents[0].playerId ? { playerId: betterOptionEvents[0].playerId } : {}),
        }
      : null,
    worstPressure
      ? {
          id: worstPressure.id,
          t: worstPressure.t,
          title: `${(worstPressure.pressureS ?? 0).toFixed(1)} seconds without pressure`,
          tag: "Pressing",
          reason: "Nobody stepped in after the ball was lost.",
          findingId: "press-2s",
          ...(worstPressure.playerId ? { playerId: worstPressure.playerId } : {}),
        }
      : null,
    goal
      ? {
          id: goal.id,
          t: goal.t,
          title: "Goal from the second ball",
          tag: "Goal",
          reason: goal.note,
          ...(goal.playerId ? { playerId: goal.playerId } : {}),
        }
      : null,
    longestSpell
      ? {
          id: `${matchId}-shape-${longestSpell.t}`,
          t: longestSpell.t,
          title: `Team ${longestSpell.lengthM} m long, middle open`,
          tag: "Shape",
          reason: "Back line and front line were furthest apart here.",
          findingId: "block-length",
        }
      : null,
  ];
  const clips = clipCandidates.filter((c): c is Clip => c !== null).sort((a, b) => a.t - b.t);

  /* ---------- stats ---------- */
  const teamALosses = events.filter((e) => e.team === "a" && (e.kind === "turnover_lost" || e.kind === "pass_bad"));
  const teamBLosses = events.filter((e) => e.team === "b" && (e.kind === "turnover_lost" || e.kind === "pass_bad"));
  const shotsA = events.filter((e) => e.team === "a" && (e.kind === "shot" || e.kind === "goal"));
  const shotsB = events.filter((e) => e.team === "b" && e.kind === "shot");
  const highWonA = events.filter((e) => e.team === "a" && e.kind === "high_turnover");
  const highWonB = events.filter((e) => e.team === "b" && e.kind === "high_turnover");
  const riskyA = events.filter((e) => e.team === "a" && e.kind === "pass_risky");
  const riskyB = events.filter((e) => e.team === "b" && e.kind === "pass_risky");
  const badA = events.filter((e) => e.team === "a" && e.kind === "pass_bad");
  const badB = events.filter((e) => e.team === "b" && e.kind === "pass_bad");
  const betterB = events.filter((e) => e.team === "b" && e.kind === "better_option");
  const passesA = players.reduce((sum, p) => sum + p.passes, 0);
  const accuracyA = Math.round(players.reduce((sum, p) => sum + p.passAccuracy, 0) / players.length);

  const stats: StatTab[] = [
    {
      key: "ball",
      label: "Ball",
      caption: "Who kept the ball and how long they kept it for.",
      rows: [
        { label: "Time with the ball", a: `${possessionShareA}%`, b: `${100 - possessionShareA}%` },
        { label: "Longest spell with the ball", a: `${longestA} s`, b: `${longestB} s` },
        { label: "Passes played", a: `${passesA}`, b: `${Math.round(passesA * 0.91)}` },
        { label: "Passes that found a team-mate", a: `${accuracyA}%`, b: `${accuracyA - 4}%` },
        { label: "Times the ball was given away", a: `${teamALosses.length}`, b: `${teamBLosses.length}` },
      ],
    },
    {
      key: "pressing",
      label: "Pressing",
      caption: "How quickly the team reacted after losing the ball.",
      rows: [
        { label: "Pressure inside 2 s", a: `${pressShare}%`, b: `${Math.min(99, pressShare + 7)}%`, target: "60%" },
        {
          label: "Ball back inside 5 s",
          a: `${Math.max(0, pressShare - 7)}%`,
          b: `${Math.min(99, pressShare + 4)}%`,
          target: "60%",
        },
        { label: "Balls won in the opponent half", a: `${highWonA.length}`, b: `${highWonB.length}` },
        { label: "Late reactions", a: `${latePressures.length}`, b: "—" },
        { label: "Counter-attacks allowed", a: `${Math.max(1, Math.round(latePressures.length / 3))}`, b: "—" },
      ],
    },
    {
      key: "shape",
      label: "Shape",
      caption: "How compact the team stayed with and without the ball.",
      rows: [
        { label: "Length back to front", a: `${blockLengthM} m`, b: `${blockLengthM - 5} m`, target: "38 m" },
        { label: "Width side to side", a: `${compactBandM} m`, b: `${compactBandM - 3} m` },
        { label: "Spells over the ceiling", a: `${longSpells.length}`, b: "—" },
        { label: "Longest the team got", a: `${longestSpell?.lengthM ?? blockLengthM} m`, b: "—" },
        { label: "Shape snapshots taken", a: `${snapshots.length}`, b: `${snapshots.length}` },
      ],
    },
    {
      key: "shooting",
      label: "Shooting",
      caption: "Where the shots came from and what happened to them.",
      rows: [
        { label: "Shots", a: `${shotsA.length}`, b: `${shotsB.length}` },
        { label: "Shots from inside the box", a: `${shotsA.filter((e) => e.x > 78).length}`, b: `${shotsB.filter((e) => e.x < 22).length}` },
        { label: "Goals", a: `${events.filter((e) => e.kind === "goal" && e.team === "a").length}`, b: "0" },
        { label: "Shots after a ball won high up", a: `${Math.min(shotsA.length, highWonA.length)}`, b: "0" },
        { label: "Set pieces", a: `${events.filter((e) => e.team === "a" && e.kind === "set_piece").length}`, b: `${events.filter((e) => e.team === "b" && e.kind === "set_piece").length}` },
      ],
    },
    {
      key: "players",
      label: "Players",
      caption: "Each player's own numbers, opened from the list below.",
      rows: [],
    },
    {
      key: "passes",
      label: "Passes",
      caption: "The quality of the passes, not just the count.",
      rows: [
        { label: "Passes played", a: `${passesA}`, b: `${Math.round(passesA * 0.91)}` },
        { label: "Risky passes", a: `${riskyA.length}`, b: `${riskyB.length}` },
        { label: "Bad passes", a: `${badA.length}`, b: `${badB.length}` },
        { label: "Better option available", a: `${betterOptionEvents.length}`, b: `${betterB.length}`, target: "1" },
        { label: "Attacks that ended without a shot", a: `${events.filter((e) => e.team === "a" && e.kind === "sequence_end").length}`, b: "—" },
      ],
    },
  ];

  const summary = [
    `You had ${possessionShareA}% of the ball and were calmer than the opponent in the middle of the pitch.`,
    "The goal came from a second ball after a corner, which is the one moment the team reacted fastest.",
    `The cost was the reaction after losing the ball: pressure arrived late in ${latePressures.length} of ${lossEvents.length} losses.`,
  ];

  return {
    events,
    possession,
    momentum,
    zones,
    heat,
    losses,
    recoveries,
    snapshots,
    compactBandM,
    blockLengthM,
    summary,
    findings,
    players,
    stats,
    clips,
  };
}

export function eventsFor(filterKey: string, events: MatchEvent[]) {
  const filter = EVENT_FILTERS.find((f) => f.key === filterKey);
  if (!filter || !filter.kinds) return events;
  const kinds = filter.kinds as readonly string[];
  return events.filter((e) => kinds.includes(e.kind));
}

/** Every moment this player was involved in, in order. */
export function eventsForPlayer(events: MatchEvent[], playerId: string) {
  return events.filter((e) => e.playerId === playerId);
}
