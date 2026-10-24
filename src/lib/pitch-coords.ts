import type { ReviewedEvent } from "@/lib/event-reviews";
import type { TeamKey } from "@/lib/match-analysis";
import type { Frame, MatchDataFile } from "@/lib/match-source";

/**
 * Turning the pipeline's pitch coordinates into something a card can draw.
 *
 * The pipeline writes metres on the real pitch, and each team attacks its own
 * way. Every card draws left to right with the selected team attacking right,
 * so everything goes through here first.
 */

export type Point = { x: number; y: number };

export const finite = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

/** The pitch of the match currently on screen. Set it before drawing. */
export const PITCH = {
  length: 105,
  width: 68,
  attackRight: { A: true, B: false } as Record<TeamKey, boolean>,
};

export function setPitchContext(file: MatchDataFile | undefined) {
  PITCH.length = finite(file?.pitch?.length) ?? 105;
  PITCH.width = finite(file?.pitch?.width) ?? 68;
  PITCH.attackRight = {
    A: file?.attack_right?.["A"] ?? true,
    B: file?.attack_right?.["B"] ?? false,
  };
}

export const metresToPct = (m: unknown, team: TeamKey | null): Point | null => {
  if (!Array.isArray(m) || m.length < 2) return null;
  const mx = finite(m[0]);
  const my = finite(m[1]);
  if (mx === null || my === null) return null;
  const right = team ? PITCH.attackRight[team] : true;
  return {
    x: clamp(((right ? mx : PITCH.length - mx) / PITCH.length) * 100),
    y: clamp(((right ? my : PITCH.width - my) / PITCH.width) * 100),
  };
};

/**
 * Whether the export marks this moment as being in the mirrored period.
 *
 * Kept for anything that needs to know which half a moment is in. It is **not**
 * a reason to flip coordinates: as of the 4 Oct export the pipeline writes
 * every position already turned the right way round, with team A always
 * attacking towards x = length. Flipping again on top of that drew the second
 * half backwards, which is the bug this used to be the fix for.
 */
export const mirroredAt = (file: MatchDataFile | undefined, t: number): boolean =>
  (file?.periods ?? []).some(
    (period) => period.mirrored === true && t >= period.t_start && t <= period.t_end,
  );

/** Where a moment happened, from its own coordinates or the ball at that time. */
export const eventPoint = (event: ReviewedEvent, file?: MatchDataFile): Point | null => {
  const p = event.payload ?? {};
  const x = finite(p["x"] ?? p["px"] ?? p["start_x"]);
  const y = finite(p["y"] ?? p["py"] ?? p["start_y"]);
  if (x !== null && y !== null)
    return { x: clamp(x > 105 ? x / 19.2 : x), y: clamp(y > 100 ? y / 10.8 : y) };
  let nearest: Frame | undefined;
  for (const frame of file?.frames ?? []) {
    if (!nearest || Math.abs(frame.t - event.t) < Math.abs(nearest.t - event.t)) nearest = frame;
  }
  const metres = nearest?.ball?.m;
  return metres
    ? metresToPct(metres, event.team === "A" || event.team === "B" ? event.team : null)
    : null;
};
