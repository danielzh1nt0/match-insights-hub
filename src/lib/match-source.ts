import { MATCHES_BUCKET, matchesDb } from "@/integrations/matches/client";
import type { LibraryMatch, MatchStatus } from "@/lib/sample-data";

export type MatchFiles = {
  video: string;
  match_data: string;
  stats: string;
  kit_A?: string;
  kit_B?: string;
  thumb?: string;
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
};

export async function fetchMatches(): Promise<MatchListItem[]> {
  const [{ data: rows, error }, { data: labels, error: labelError }] = await Promise.all([
    matchesDb.from("matches").select("*").order("created_at", { ascending: false }),
    matchesDb.from("match_labels").select("*"),
  ]);
  if (error) throw error;
  if (labelError) throw labelError;
  const byId = new Map<string, MatchLabelRow>(
    ((labels ?? []) as MatchLabelRow[]).map((l) => [l.match_id, l]),
  );
  return ((rows ?? []) as MatchRow[]).map((row) => ({ row, label: byId.get(row.id) ?? null }));
}

export async function fetchMatch(id: string): Promise<MatchListItem | null> {
  const [{ data: row, error }, { data: label }] = await Promise.all([
    matchesDb.from("matches").select("*").eq("id", id).maybeSingle(),
    matchesDb.from("match_labels").select("*").eq("match_id", id).maybeSingle(),
  ]);
  if (error) throw error;
  if (!row) return null;
  return { row: row as MatchRow, label: (label as MatchLabelRow | null) ?? null };
}

export async function saveMatchLabel(patch: Partial<MatchLabelRow> & { match_id: string }) {
  const { data, error } = await matchesDb
    .from("match_labels")
    .upsert(patch, { onConflict: "match_id" })
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as MatchLabelRow;
}

/* ---------- signed URLs, cached for the session ---------- */

const SIGN_TTL_S = 3600;
const signedCache = new Map<string, { url: string; expires: number }>();

export function isAbsoluteUrl(path: string) {
  return /^https?:\/\//.test(path);
}

export async function signedUrl(path: string): Promise<string> {
  if (isAbsoluteUrl(path)) return path;
  const hit = signedCache.get(path);
  const now = Date.now();
  if (hit && hit.expires > now) return hit.url;
  const { data, error } = await matchesDb.storage
    .from(MATCHES_BUCKET)
    .createSignedUrl(path, SIGN_TTL_S);
  if (error || !data?.signedUrl) throw error ?? new Error(`Could not sign ${path}`);
  signedCache.set(path, { url: data.signedUrl, expires: now + (SIGN_TTL_S - 120) * 1000 });
  return data.signedUrl;
}

/* ---------- json payloads, cached for the session ---------- */

const jsonCache = new Map<string, Promise<any>>();

function loadJson<T>(path: string): Promise<T> {
  const cached = jsonCache.get(path);
  if (cached) return cached as Promise<T>;
  const promise = signedUrl(path)
    .then((url) => fetch(url))
    .then((res) => {
      if (!res.ok) throw new Error(`Could not load ${path}`);
      return res.json();
    })
    .catch((err) => {
      jsonCache.delete(path);
      throw err;
    });
  jsonCache.set(path, promise);
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
  const file = await loadJson<MatchDataFile>(row.files.match_data);
  return { ...file, events: normaliseEvents(file.events), frames: file.frames ?? [] };
}

export function fetchMatchStats(row: MatchRow): Promise<Record<string, any>> {
  return loadJson<Record<string, any>>(row.files.stats);
}

export function videoSrc(row: MatchRow): Promise<string> {
  return signedUrl(row.files.video);
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
