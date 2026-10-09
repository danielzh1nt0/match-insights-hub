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

/**
 * Where a moment happened, from its own coordinates or the ball at that time.
 *
 * The export writes metres: `x_m`/`y_m` on set pieces, shots, goals and high
 * turnovers, `from_m` on pass moments. Those go through metresToPct so the
 * team's attacking direction is respected. A pixel pair (`px`/`py`) is scaled
 * by the video size. Anything else falls back to the tracked ball nearest in
 * time. The old reading took a metres value under 105 as a percentage, which
 * squeezed every marker into the top two-thirds of the pitch.
 */
export const eventPoint = (event: ReviewedEvent, file?: MatchDataFile): Point | null => {
  const p = event.payload ?? {};
  const team = event.team === "A" || event.team === "B" ? event.team : null;
  const xm = finite(p["x_m"]);
  const ym = finite(p["y_m"]);
  if (xm !== null && ym !== null) return metresToPct([xm, ym], team);
  const from = p["from_m"] ?? p["m"];
  if (Array.isArray(from)) {
    const fromPct = metresToPct(from, team);
    if (fromPct) return fromPct;
  }
  const px = finite(p["px"]);
  const py = finite(p["py"]);
  if (px !== null && py !== null) {
    const w = Math.max(file?.width ?? 1920, 1);
    const h = Math.max(file?.height ?? 1080, 1);
    return { x: clamp((px / w) * 100), y: clamp((py / h) * 100) };
  }
  const xp = finite(p["x"] ?? p["start_x"]);
  const yp = finite(p["y"] ?? p["start_y"]);
  if (xp !== null && yp !== null && xp <= 100 && yp <= 100) return { x: clamp(xp), y: clamp(yp) };
  let nearest: Frame | undefined;
  for (const frame of file?.frames ?? []) {
    if (!nearest || Math.abs(frame.t - event.t) < Math.abs(nearest.t - event.t)) nearest = frame;
  }
  const metres = nearest?.ball?.m;
  return metres ? metresToPct(metres, team) : null;
};
