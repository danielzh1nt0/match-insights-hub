import { MATCHES_BUCKET, matchesDb } from "@/integrations/matches/client";
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
  shape: Record<
    string,
    { hull_m: [number, number][]; n: number; length: number; width: number }
  > | null;
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
  /** The real half boundaries. The second period is the mirrored one. */
  periods?: { t_start: number; t_end: number; mirrored?: boolean }[];
};

/**
 * Demo allow-list for the library. Empty = list every match.
 * Hidden matches still open by direct URL; they are just not listed.
 */
export const DEMO_MATCH_IDS: string[] = [
  "SFKBP1109",
  "p15u-vs-aik-2026-09-21-bd09",
  "p15u-vs-vallentuna-2026-10-03-6cce",
];
export const DEMO_MATCH_TITLES: Record<string, string> = {
  SFKBP1109: "SFK – BP · first half",
  "p15u-vs-aik-2026-09-21-bd09": "SFK – AIK · first half",
  "p15u-vs-vallentuna-2026-10-03-6cce": "SFK – Vallentuna · full match",
};

/** Types the event list may show when a file carries no tier. */
const LISTED_TYPES = new Set(["goal", "shot"]);

export function listableEvents<E extends { type: string }>(events: E[], showBeta = false): E[] {
  return events.filter((e) => {
    const tier = (e as { tier?: string }).tier;
    if (tier) return tier === "verified" || (showBeta && tier === "beta");
    return LISTED_TYPES.has(e.type);
  });
}

/** True when t sits inside the video and inside some period window (±5 s). */
export function inVideo(
  t: number,
  durationS: number | null | undefined,
  periods?: MatchDataFile["periods"],
) {
  if (typeof t !== "number") return true;
  if (durationS && t > durationS) return false;
  if (periods?.length) return periods.some((p) => t >= p.t_start - 5 && t <= p.t_end + 5);
  return true;
}

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
  let list = (rows ?? []) as MatchRow[];
  if (DEMO_MATCH_IDS.length) {
    list = DEMO_MATCH_IDS.map((id) => list.find((r) => r.id === id)).filter((r): r is MatchRow =>
      Boolean(r),
    );
  }
  return list.map((row) => ({ row, label: byId.get(row.id) ?? null }));
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

/**
 * A match file, keyed by the version of the match it belongs to.
 *
 * The exports are rewritten in place, so the path alone is not an identity:
 * the app was holding a stats file from before the shot positions were redone
 * and had no way to notice. The row's `updated_at` goes into the cache key and
 * onto the request, so a new export invalidates both our own cache and the
 * browser's.
 */
function loadJson<T>(path: string, version?: string | null): Promise<T> {
  const key = version ? `${path}@${version}` : path;
  const cached = jsonCache.get(key);
  if (cached) return cached as Promise<T>;
  const promise = signedUrl(path)
    .then((url) =>
      fetch(
        version ? `${url}${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}` : url,
      ),
    )
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

/** What makes one version of a match's files different from the next. */
function versionOf(row: MatchRow) {
  return (row as { updated_at?: string }).updated_at ?? row.created_at ?? null;
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
  const file = await loadJson<MatchDataFile>(row.files.match_data, versionOf(row));
  const events = normaliseEvents(file.events).filter((e) =>
    inVideo(e.t, row.duration_s, file.periods),
  );
  return { ...file, events, frames: file.frames ?? [] };
}

export async function fetchMatchStats(row: MatchRow): Promise<Record<string, any>> {
  const [stats, file] = await Promise.all([
    loadJson<Record<string, any>>(row.files.stats, versionOf(row)),
    loadJson<MatchDataFile>(row.files.match_data, versionOf(row)).catch(() => null),
  ]);
  const shots = stats?.["metrics"]?.["shots"];
  const withShots = !Array.isArray(shots)
    ? stats
    : {
        ...stats,
        metrics: {
          ...stats["metrics"],
          shots: shots.filter((s: { t?: number }) =>
            inVideo(s?.t as number, row.duration_s, file?.periods),
          ),
        },
      };
  return withholdDisownedPossession(withShots);
}

/**
 * When the pipeline's own ball grade says possession is not trustworthy
 * (`summary.ball_grade.possession_ok === false`), the possession figures are
 * removed from the file before anything reads them, so every screen shows a
 * dash instead of a number the exporter has disowned. On Vallentuna the dark
 * SFK players near the ball are missed more often than the red ones, which
 * pulled SFK's share from a by-eye 56% to a printed 36%.
 */
export function withholdDisownedPossession<T extends Record<string, any>>(stats: T): T {
  const grade = stats?.["summary"]?.["ball_grade"];
  if (!grade || grade.possession_ok !== false) return stats;
  const teams = Array.isArray(stats["teams"])
    ? stats["teams"].map((row: Record<string, unknown>) => {
        const { possession_pct: _p, possession_s: _s, ...rest } = row;
        return rest;
      })
    : stats["teams"];
  const metrics = stats["metrics"];
  const windows = Array.isArray(metrics?.["tilt_windows"])
    ? metrics["tilt_windows"].map((w: Record<string, unknown>) => ({ ...w, possession_A: null }))
    : metrics?.["tilt_windows"];
  return {
    ...stats,
    teams,
    ...(metrics ? { metrics: { ...metrics, tilt_windows: windows } } : {}),
  };
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
    // "Setup needed" only when the teams are not named yet; a named match with
    // no competition filled in just leaves the field out.
    competition: label?.competition || (isLabelled(label) ? "" : "Setup needed"),
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
export async function fetchFrameChunk(files: MatchFiles, key: string): Promise<Frame[]> {
  const path = files[key];
  if (!path) return [];
  const res = await fetch(await signedUrl(path));
  if (!res.ok) throw new Error(`Could not load ${key}`);
  const body = (await res.json()) as { frames?: Frame[] };
  return body.frames ?? [];
}

/**
 * Every frame of a full match, thinned, for the views that read the whole game
 * (stats, insights, territory, story). Full matches keep frames only in
 * 5-minute files, so `match_data.frames` is empty and every frame-based card
 * used to say "not enough evidence". Every `step`-th frame is kept (the export
 * is 10 a second, so 3 keeps ~3 a second) and the per-frame pass lanes and
 * pitch lines are dropped: nothing outside the live video reads them.
 */
/**
 * The pipeline's own thinned whole-match file (frames_lite.json: ~3 frames a
 * second, no lanes or pitch lines), one download instead of twenty. Falls
 * back to the 5-minute files on matches exported before it existed.
 */
export async function fetchWholeMatchFrames(
  files: MatchFiles,
  chunks: { key: string; t_start: number }[],
): Promise<Frame[]> {
  if (files["frames_lite"]) {
    try {
      const res = await fetch(await signedUrl(files["frames_lite"]));
      if (res.ok) {
        const body = (await res.json()) as { frames?: Frame[] };
        if (Array.isArray(body.frames) && body.frames.length) return body.frames;
      }
    } catch {
      /* fall through to the chunk files */
    }
  }
  return fetchAllFrames(files, chunks);
}

export async function fetchAllFrames(
  files: MatchFiles,
  chunks: { key: string; t_start: number }[],
  step = 3,
  parallel = 3,
): Promise<Frame[]> {
  const ordered = [...chunks].sort((a, b) => a.t_start - b.t_start);
  const out: Frame[][] = new Array(ordered.length);
  let next = 0;
  const worker = async () => {
    while (next < ordered.length) {
      const i = next++;
      const frames = await fetchFrameChunk(files, ordered[i]!.key).catch(() => [] as Frame[]);
      out[i] = frames
        .filter((_, k) => k % step === 0)
        .map((f) => ({ ...f, lanes: null, pitch_lines: null }));
    }
  };
  await Promise.all(Array.from({ length: Math.min(parallel, ordered.length) }, worker));
  return out.flat();
}
