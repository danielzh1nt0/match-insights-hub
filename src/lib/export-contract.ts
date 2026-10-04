import type { MatchDataFile } from "@/lib/match-source";
import type { StatsFile, TeamKey } from "@/lib/match-analysis";

/**
 * Where the app meets the pipeline's spellings.
 *
 * The export and the UI drifted apart one field at a time, and the failures
 * were quiet: a shot map that planted every shot at a default position, a pass
 * completion figure that counted every unmeasured pass as completed, a
 * final-third count reading a key that was never written. None of them threw;
 * they all produced a plausible number.
 *
 * So the spellings live here rather than at each call site. When the pipeline
 * settles on one, this is the only file that changes — and anything it cannot
 * answer returns null, so the screen says "withheld" instead of guessing.
 */

function finite(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

/** The pitch the figures were measured on. Metres. */
export function pitchOf(stats: StatsFile | undefined) {
  return {
    length: finite(stats?.pitch?.length) ?? 105,
    width: finite(stats?.pitch?.width) ?? 68,
  };
}

/* ---------------- shots ---------------- */

export type Shot = {
  id: string;
  team: TeamKey;
  /** Percent across the pitch, 0 at our goal line. Null when unplaceable. */
  x: number | null;
  y: number | null;
  t: number;
  goal: boolean;
  onTarget: boolean;
};

/** Outcome words that mean the ball was heading in. */
const ON_TARGET = new Set(["goal", "on_target", "saved", "scored"]);

/**
 * One shot, whichever way this export spells it.
 *
 * Coordinates arrive either as a percentage (`x`) or in metres (`x_m`), and
 * reading metres as a percentage puts a shot from the far post inside the six
 * yard box. Outcome arrives either as two booleans or as one word.
 *
 * A shot we cannot place keeps a null position rather than being dropped onto
 * a default spot, which is what the old reader did to every shot in a
 * metres-based export.
 */
export function normaliseShot(
  raw: Record<string, unknown>,
  index: number,
  pitch: { length: number; width: number },
): Shot {
  const percentX = finite(raw["x"] ?? raw["px"]);
  const metreX = finite(raw["x_m"]);
  const percentY = finite(raw["y"] ?? raw["py"]);
  const metreY = finite(raw["y_m"]);

  const outcome = String(raw["outcome"] ?? "").toLowerCase();
  const goal = raw["goal"] === true || outcome === "goal" || outcome === "scored";

  return {
    id: String(raw["id"] ?? `shot-${index}`),
    team: raw["team"] === "B" ? "B" : "A",
    x: percentX ?? (metreX === null ? null : (metreX / pitch.length) * 100),
    y: percentY ?? (metreY === null ? null : (metreY / pitch.width) * 100),
    t: finite(raw["t"]) ?? 0,
    goal,
    onTarget: goal || raw["on_target"] === true || ON_TARGET.has(outcome),
  };
}

export function shotsOf(stats: StatsFile | undefined, team?: TeamKey): Shot[] {
  const raw = stats?.metrics?.["shots"];
  if (!Array.isArray(raw)) return [];
  const pitch = pitchOf(stats);
  const all = raw.map((shot, i) => normaliseShot(shot as Record<string, unknown>, i, pitch));
  return team ? all.filter((shot) => shot.team === team) : all;
}

/** A moment counts towards the match if it falls inside a period, with slack. */
const PERIOD_SLACK_S = 5;

export type Periods = { t_start: number; t_end: number; mirrored?: boolean }[] | undefined;

export function insidePeriods(t: number, periods: Periods): boolean {
  if (!periods || periods.length === 0) return true;
  return periods.some(
    (period) => t >= period.t_start - PERIOD_SLACK_S && t <= period.t_end + PERIOD_SLACK_S,
  );
}

/**
 * The score, counted from the shots that went in.
 *
 * There is a score on the match label, but nobody fills it in and every screen
 * was showing 0–0 because of it. The goals are in the file: a shot with
 * `goal: true` at a time inside one of the match periods. Counting them is the
 * only way the scoreline and the shot map can agree, because they are then the
 * same records.
 *
 * Moments outside the periods are warm-up and stoppages, and are not goals.
 */
export function goalsFrom(stats: StatsFile | undefined, periods: Periods) {
  let a = 0;
  let b = 0;
  for (const shot of shotsOf(stats)) {
    if (!shot.goal || !insidePeriods(shot.t, periods)) continue;
    if (shot.team === "A") a += 1;
    else b += 1;
  }
  return { a, b };
}

/** Shots on the record for one side, inside the periods. */
export function shotCount(stats: StatsFile | undefined, team: TeamKey, periods: Periods) {
  return shotsOf(stats, team).filter((shot) => insidePeriods(shot.t, periods)).length;
}

/* ---------------- passes ---------------- */

/**
 * Whether a pass found a team-mate.
 *
 * Null means the file does not say. That distinction is the whole point: the
 * old rule treated anything not explicitly marked lost as completed, so a
 * `quality` of "unknown" — which most passes in a real export carry — counted
 * as a success. The figure was not a completion rate, it was the share of
 * passes nobody had marked as failures.
 */
export function passCompleted(pass: Record<string, unknown>): boolean | null {
  if (typeof pass["completed"] === "boolean") return pass["completed"];
  if (typeof pass["success"] === "boolean") return pass["success"];

  const outcome = String(pass["outcome"] ?? "").toLowerCase();
  if (outcome) {
    if (["complete", "completed", "success", "successful"].includes(outcome)) return true;
    if (["incomplete", "lost", "failed", "intercepted"].includes(outcome)) return false;
  }

  const quality = String(pass["quality"] ?? "").toLowerCase();
  if (quality === "bad_lost" || quality === "incomplete") return false;
  if (quality === "risky_completed" || quality === "good" || quality === "safe") return true;

  return null;
}

/** Completion over the passes that were actually judged, never over all of them. */
export function completionOf(passes: Record<string, unknown>[]) {
  let judged = 0;
  let complete = 0;
  for (const pass of passes) {
    const result = passCompleted(pass);
    if (result === null) continue;
    judged += 1;
    if (result) complete += 1;
  }
  return {
    judged,
    complete,
    unknown: passes.length - judged,
    pct: judged === 0 ? null : Math.round((complete / judged) * 1000) / 10,
  };
}

/* ---------------- final third ---------------- */

/**
 * Entries into the final third.
 *
 * `entries_count` was never written by the export; the entries arrive as an
 * array and the count is its length. Reading the key that does not exist meant
 * the tile had been showing a dash since the field was added.
 */
export function finalThirdEntries(stats: StatsFile | undefined, team: TeamKey): number | null {
  const side = stats?.metrics?.["field"]?.[team] as Record<string, unknown> | undefined;
  if (!side) return null;
  const list = side["final_third_entries"];
  if (Array.isArray(list)) return list.length;
  return finite(side["entries_count"]);
}

/* ---------------- periods ---------------- */

export type Period = "1st" | "2nd" | "full";

/**
 * The seconds a half actually covers.
 *
 * Halves are never equal: stoppage time, a delayed restart and a long half-time
 * all move the boundary, and splitting the duration in two filed late
 * first-half moments into the second half. The export marks the real
 * boundaries, and the second period is the one it marks `mirrored` because the
 * sides have changed ends.
 */
export function periodWindow(
  file: MatchDataFile | undefined,
  period: Period,
  durationS: number,
): [number, number] {
  const end = Math.max(durationS, 1);
  if (period === "full") return [0, end];

  const periods = file?.periods ?? [];
  if (periods.length >= 2) {
    const second = periods.find((p) => p.mirrored) ?? periods[1]!;
    const first = periods.find((p) => p !== second) ?? periods[0]!;
    const chosen = period === "1st" ? first : second;
    return [chosen.t_start, chosen.t_end];
  }

  // No periods in the file: halve the clock and accept that moments near the
  // break may fall on the wrong side of it.
  return period === "1st" ? [0, end / 2] : [end / 2, end];
}
