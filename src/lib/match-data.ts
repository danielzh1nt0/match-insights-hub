/**
 * Event vocabulary, display labels and the shared `Finding` shape.
 *
 * This file used to also export `buildMatchData`, which fabricated players,
 * clips and a head-to-head stats table from a PRNG seeded on the match id. It
 * was removed: every screen now reads the real match file. Nothing here
 * generates data.
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
  /** Optional comparison supplied by the analysis pipeline; null means unavailable. */
  baseline?: number | null;
  unit: string;
  higherIsWorse: boolean;
  events: number;
  eventIds: string[];
  interpretation: string;
  timestamps: number[];
  /** Whether the numbers come from confirmed moments or raw detections. */
  basis?: "confirmed" | "detected";
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
