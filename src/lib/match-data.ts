/**
 * Mock analysis data for the match screens. Deterministic per match id so the
 * same match always renders the same pitch maps, events and findings.
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
  interpretation: string;
  timestamps: number[];
};

export type PlayerRow = {
  id: string;
  shirt: number;
  name: string;
  position: string;
  minutes: number;
  touches: number;
  passes: number;
  passAccuracy: number;
  losses: number;
  regains: number;
  distanceKm: number;
};

export type StatRow = { label: string; a: string; b: string; target?: string };
export type StatTab = { key: string; label: string; caption: string; rows: StatRow[] };

export type Snapshot = { t: number; players: { x: number; y: number; shirt: number }[] };

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
  clips: { t: number; title: string; tag: string }[];
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

export function buildMatchData(matchId: string, durationS: number): MatchData {
  const rand = rng(seedFrom(matchId));
  const span = Math.max(40, durationS);

  /* events */
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
    events.push({
      id: `${matchId}-e${i}`,
      t: Math.round((span * (i + 0.5)) / eventCount),
      kind,
      team,
      x: Math.round(12 + rand() * 76),
      y: Math.round(10 + rand() * 80),
      player: `${FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]}`,
      note: "",
    });
  }
  events.push({
    id: `${matchId}-goal`,
    t: Math.round(span * 0.62),
    kind: "goal",
    team: "a",
    x: 88,
    y: 46,
    player: "Luca Braun",
    note: "Second ball after the corner, low finish.",
  });
  events.sort((a, b) => a.t - b.t);

  /* possession ribbon */
  const possession: { t: number; len: number; team: Team }[] = [];
  let cursor = 0;
  while (cursor < span) {
    const len = Math.max(2, Math.round(2 + rand() * (span / 8)));
    possession.push({ t: cursor, len: Math.min(len, span - cursor), team: rand() > 0.46 ? "a" : "b" });
    cursor += len;
  }

  /* momentum */
  const momentum = Array.from({ length: 40 }, (_, i) => {
    const wave = Math.sin((i / 40) * Math.PI * 2.2);
    return Math.max(-1, Math.min(1, wave * 0.6 + (rand() - 0.5) * 0.7));
  });

  /* zones: 6 x 4 */
  const rawZones = Array.from({ length: 24 }, (_, i) => {
    const col = i % 6;
    const centreBias = 1 - Math.abs(Math.floor(i / 6) - 1.5) / 2.4;
    return (0.4 + rand() * 0.6) * (0.5 + col / 6) * centreBias;
  });
  const zoneTotal = rawZones.reduce((s, v) => s + v, 0);
  const zones = rawZones.map((v) => Math.round((v / zoneTotal) * 1000) / 10);

  const heat = Array.from({ length: 26 }, () => ({
    x: Math.round(20 + rand() * 68),
    y: Math.round(12 + rand() * 76),
    w: Math.round((0.35 + rand() * 0.65) * 100) / 100,
  }));

  const losses = Array.from({ length: 14 }, () => ({
    x: Math.round(30 + rand() * 60),
    y: Math.round(10 + rand() * 80),
  }));
  const recoveries = Array.from({ length: 12 }, () => ({
    x: Math.round(18 + rand() * 62),
    y: Math.round(10 + rand() * 80),
  }));

  const snapshots: Snapshot[] = Array.from(
    { length: Math.max(2, Math.min(8, Math.round(span / 30) + 1)) },
    (_, i) => ({
      t: i * 30,
      players: Array.from({ length: 10 }, (_, p) => ({
        shirt: p + 2,
        x: Math.round(14 + (p % 4) * 20 + (rand() - 0.5) * 12),
        y: Math.round(12 + Math.floor(p / 4) * 26 + (rand() - 0.5) * 14),
      })),
    }),
  );

  const players: PlayerRow[] = Array.from({ length: 11 }, (_, i) => ({
    id: `p${i + 1}`,
    shirt: i + 1,
    name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[i % LAST_NAMES.length]}`,
    position: POSITIONS[i] as string,
    minutes: Math.round(span / 60) || 1,
    touches: 8 + Math.round(rand() * 40),
    passes: 5 + Math.round(rand() * 32),
    passAccuracy: 62 + Math.round(rand() * 30),
    losses: Math.round(rand() * 6),
    regains: Math.round(rand() * 7),
    distanceKm: Math.round((0.4 + rand() * 1.2) * 100) / 100,
  }));

  const findings: Finding[] = [
    {
      id: "better-option",
      headline: "A clearly better pass was available and wasn't played",
      value: 3,
      target: 1,
      unit: "times",
      higherIsWorse: true,
      events: 4,
      interpretation:
        "Three times the ball went sideways while a forward pass was open. Each one gave the opponent time to get back into shape.",
      timestamps: [12, 24, 39],
    },
    {
      id: "press-2s",
      headline: "First pressure after losing the ball",
      value: 48,
      target: 60,
      unit: "%",
      higherIsWorse: false,
      events: 14,
      interpretation:
        "Just under half of the losses got pressure inside two seconds. The nearest player often waited instead of stepping in.",
      timestamps: [8, 19, 33, 41],
    },
    {
      id: "block-length",
      headline: "How stretched the team got from back to front",
      value: 42,
      target: 38,
      unit: "m",
      higherIsWorse: true,
      events: 6,
      interpretation:
        "In six spells the team was longer than the ceiling you set, so the middle of the pitch was left open.",
      timestamps: [15, 28, 44],
    },
  ];

  const stats: StatTab[] = [
    {
      key: "ball",
      label: "Ball",
      caption: "Who kept the ball and how long they kept it for.",
      rows: [
        { label: "Time with the ball", a: "52%", b: "48%" },
        { label: "Longest spell with the ball", a: "38 s", b: "31 s" },
        { label: "Passes played", a: "184", b: "167" },
        { label: "Passes that found a team-mate", a: "81%", b: "77%" },
        { label: "Times the ball was given away", a: "14", b: "11" },
      ],
    },
    {
      key: "pressing",
      label: "Pressing",
      caption: "How quickly the team reacted after losing the ball.",
      rows: [
        { label: "Pressure inside 2 s", a: "48%", b: "55%", target: "60%" },
        { label: "Ball back inside 5 s", a: "41%", b: "52%", target: "60%" },
        { label: "Balls won in the opponent half", a: "6", b: "9" },
        { label: "Opponent passes per ball won", a: "9.4", b: "7.1" },
        { label: "Counter-attacks allowed", a: "3", b: "5" },
      ],
    },
    {
      key: "shape",
      label: "Shape",
      caption: "How compact the team stayed with and without the ball.",
      rows: [
        { label: "Length back to front", a: "42 m", b: "36 m", target: "38 m" },
        { label: "Width side to side", a: "48 m", b: "44 m" },
        { label: "Distance between the lines", a: "12 m", b: "10 m" },
        { label: "Time in a settled shape", a: "63%", b: "71%" },
        { label: "Defensive line height", a: "38 m", b: "44 m" },
      ],
    },
    {
      key: "shooting",
      label: "Shooting",
      caption: "Where the shots came from and what happened to them.",
      rows: [
        { label: "Shots", a: "6", b: "3" },
        { label: "Shots on target", a: "3", b: "1" },
        { label: "Shots from inside the box", a: "4", b: "1" },
        { label: "Goals", a: "1", b: "0" },
        { label: "Shots after a ball won high up", a: "2", b: "0" },
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
        { label: "Passes forward", a: "62", b: "58" },
        { label: "Passes that broke a line", a: "17", b: "12" },
        { label: "Risky passes", a: "9", b: "13" },
        { label: "Bad passes", a: "6", b: "8" },
        { label: "Better option available", a: "3", b: "5", target: "1" },
      ],
    },
  ];

  const clips = [
    { t: Math.round(span * 0.26), title: "Sideways pass, forward pass open", tag: "Better option" },
    { t: Math.round(span * 0.4), title: "Two seconds without pressure", tag: "Pressing" },
    { t: Math.round(span * 0.62), title: "Goal from the second ball", tag: "Goal" },
    { t: Math.round(span * 0.78), title: "Team too long, middle open", tag: "Shape" },
  ];

  const summary = [
    "You had a little more of the ball and were calmer than the opponent in the middle of the pitch.",
    "The goal came from a second ball after a corner, which is the one moment the team reacted fastest.",
    "The cost was the reaction after losing the ball: pressure arrived late in about half of the losses.",
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
    compactBandM: 26,
    blockLengthM: 42,
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
