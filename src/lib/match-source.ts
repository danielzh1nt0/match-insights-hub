import { getMatch, listMatches, saveLabel, signMatchFile } from "@/lib/matches.functions";
import type { LibraryMatch, MatchStatus } from "@/lib/sample-data";

export type MatchFiles = {
  video: string;
  match_data: string;
  stats: string;
  kit_A?: string;
  kit_B?: string;
  thumb?: string;
  /** full matches: frames_000 … frames_020, one file per 5 minutes */
  [key: string]: string | undefined;
};

export type MatchRow = {
  id: string;
  created_at: string;
  status: MatchStatus;
  duration_s: number;
  fps: number | null;
  schema_version: number | null;
  summary: Record<string, any> | null;
  attack_right: Record<string, boolean> | null;
  attack_right_confidence: Record<string, number> | null;
  files: MatchFiles;
};

export type MatchLabelRow = {
  match_id: string;
  club_team: "A" | "B" | null;
  name_a: string | null;
  name_b: string | null;
  colour_a: string | null;
  colour_b: string | null;
  opponent: string | null;
  score_a: number | null;
  score_b: number | null;
  date: string | null;
  competition: string | null;
  tags: string[] | null;
  attack_right_override: Record<string, boolean> | null;
  thresholds: Record<string, number> | null;
};

export type MatchListItem = { row: MatchRow; label: MatchLabelRow | null };

/** The single events list from match_data.json. */
export type FeedEvent = {
  id: string;
  t: number;
  type: string;
  team: "A" | "B" | null;
  title: string;
  subtitle: string | null;
  payload: Record<string, any> | null;
};

export type FramePlayer = {
  id: number;
  team: "A" | "B";
  gk: boolean;
  state: "observed" | "predicted" | "stale";
  conf: number;
  m: [number, number];
  px: [number, number] | null;
};

export type Lane = { to: number; open: boolean; forward: boolean };

export type Frame = {
  t: number;
  players: FramePlayer[];
  ball: { m?: [number, number]; px?: [number, number] | null; state?: string } | null;
  possession: "A" | "B" | null;
  phase: "control" | "loose" | "dead" | null;
  carrier?: number | null;
  pressure_m?: number | null;
  near_opps?: number | null;
  lanes?: Lane[] | null;
  /** 3x3 homography, row-major, metres -> pixels. */
  pitch_lines?: number[] | null;
  shape: Record<string, { hull_m: [number, number][]; n: number; length: number; width: number }> | null;
};

export type MatchDataFile = {
  schema_version?: number;
  fps?: number;
  width?: number;
  height?: number;
  pitch?: { length: number; width: number };
  teams?: Record<string, string>;
  attack_right?: Record<string, boolean>;
  frames: Frame[];
  events: FeedEvent[];
  /** full matches: frames live in separate files, loaded as the video reaches them */
  frame_chunks?: { key: string; t_start: number; t_end: number }[];
};

export async function fetchMatches(): Promise<MatchListItem[]> {
  return listMatches();
}

export async function fetchMatch(id: string): Promise<MatchListItem | null> {
  return getMatch({ data: { matchId: id } });
}

export async function saveMatchLabel(patch: Partial<MatchLabelRow> & { match_id: string }) {
  const { match_id, ...rest } = patch;
  await saveLabel({ data: { matchId: match_id, patch: rest as Record<string, unknown> } });
  return patch as MatchLabelRow;
}

/* ---------- signed URLs, cached for the session ---------- */

const SIGN_TTL_S = 3600;
const signedCache = new Map<string, { url: string; expires: number }>();

export function isAbsoluteUrl(path: string) {
  return /^https?:\/\//.test(path);
}

export async function signedUrl(matchId: string, path: string): Promise<string> {
  if (isAbsoluteUrl(path)) return path;
  const key = `${matchId}::${path}`;
  const hit = signedCache.get(key);
  const now = Date.now();
  if (hit && hit.expires > now) return hit.url;
  const url = await signMatchFile({ data: { matchId, path } });
  signedCache.set(key, { url, expires: now + (SIGN_TTL_S - 120) * 1000 });
  return url;
}

/* ---------- json payloads, cached for the session ---------- */

const jsonCache = new Map<string, Promise<any>>();

function loadJson<T>(matchId: string, path: string): Promise<T> {
  const key = `${matchId}::${path}`;
  const cached = jsonCache.get(key);
  if (cached) return cached as Promise<T>;
  const promise = signedUrl(matchId, path)
    .then((url) => fetch(url))
    .then((res) => {
      if (!res.ok) throw new Error(`Could not load ${path}`);
      return res.json();
    })
    .catch((err) => {
      jsonCache.delete(key);
      throw err;
    });
  jsonCache.set(key, promise);
  return promise as Promise<T>;
}

/** Sorted by t, deduped by id — the only events list in the app. */
export function normaliseEvents(events: FeedEvent[] | undefined): FeedEvent[] {
  const seen = new Set<string>();
  return (events ?? [])
    .filter((e) => {
      if (!e || seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    })
    .sort((a, b) => a.t - b.t);
}

export async function fetchMatchData(row: MatchRow): Promise<MatchDataFile> {
  const file = await loadJson<MatchDataFile>(row.id, row.files.match_data);
  return { ...file, events: normaliseEvents(file.events), frames: file.frames ?? [] };
}

export function fetchMatchStats(row: MatchRow): Promise<Record<string, any>> {
  return loadJson<Record<string, any>>(row.id, row.files.stats);
}

export function videoSrc(row: MatchRow): Promise<string> {
  return signedUrl(row.id, row.files.video);
}

export function hasCurrentSchema(row: MatchRow) {
  return row.schema_version === 1;
}

/* ---------- shaping for the existing UI ---------- */

function pair(value: unknown): [number, number] {
  if (value && typeof value === "object") {
    const v = value as Record<string, number>;
    return [Math.round(v["A"] ?? 0), Math.round(v["B"] ?? 0)];
  }
  return [0, 0];
}

export function isLabelled(label: MatchLabelRow | null) {
  return Boolean(label && label.name_a && label.name_b);
}

export function toLibraryMatch({ row, label }: MatchListItem): LibraryMatch {
  const summary = row.summary ?? {};
  const turnovers = pair(summary["high_turnovers"]);
  const totalTurnovers = typeof summary["turnovers"] === "number" ? summary["turnovers"] : null;
  return {
    id: row.id,
    teamA: label?.name_a || "Team A",
    teamB: label?.name_b || label?.opponent || "Team B",
    ...(label?.competition ? { label: label.competition } : {}),
    date: label?.date || row.created_at.slice(0, 10),
    competition: label?.competition || "Setup needed",
    durationS: Math.round(row.duration_s ?? 0),
    status: row.status,
    scoreA: label?.score_a ?? 0,
    scoreB: label?.score_b ?? 0,
    ...(label?.colour_a ? { colourA: label.colour_a } : {}),
    ...(label?.colour_b ? { colourB: label.colour_b } : {}),
    ...(label?.club_team ? { clubTeam: label.club_team } : {}),
    tags: label?.tags ?? [],
    summary: {
      possession: pair(summary["possession_pct"]),
      turnovers: totalTurnovers != null ? [totalTurnovers, 0] : turnovers,
      shots: pair(summary["shots"]),
    },
  };
}

export const EVENT_GROUPS = [
  { key: "all", label: "All", types: null as string[] | null },
  { key: "turnovers", label: "Turnovers", types: ["turnover_lost", "turnover_won"] },
  { key: "passes", label: "Passes", types: ["pass_bad", "pass_risky", "better_option"] },
  { key: "setpieces", label: "Set pieces", types: ["set_piece"] },
  { key: "sequences", label: "Sequences", types: ["sequence_end"] },
];

export function groupTypes(key: string) {
  return EVENT_GROUPS.find((g) => g.key === key)?.types ?? null;
}

export const FEED_LABEL: Record<string, string> = {
  turnover_lost: "Ball lost",
  turnover_won: "Ball won",
  high_turnover: "Ball won high",
  better_option: "Better pass available",
  pass_bad: "Poor pass",
  pass_risky: "Risky pass",
  set_piece: "Set piece",
  sequence_end: "Sequence ended",
  shot: "Shot",
  goal: "Goal",
};

export function feedLabel(type: string) {
  return FEED_LABEL[type] ?? type.replace(/_/g, " ");
}

/** One 5-minute frame file of a full match. Not kept in the JSON cache, so files you've moved away from can be freed. */
export async function fetchFrameChunk(matchId: string, files: MatchFiles, key: string): Promise<Frame[]> {
  const path = files[key];
  if (!path) return [];
  const res = await fetch(await signedUrl(matchId, path));
  if (!res.ok) throw new Error(`Could not load ${key}`);
  const body = (await res.json()) as { frames?: Frame[] };
  return body.frames ?? [];
}
