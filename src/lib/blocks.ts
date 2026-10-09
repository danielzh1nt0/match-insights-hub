import { insidePeriods } from "@/lib/export-contract";
import type { Frame, MatchDataFile } from "@/lib/match-source";
import type { TeamKey } from "@/lib/match-analysis";

/**
 * How far apart the three blocks were, through the match.
 *
 * A team defends as three groups — the back line, the midfield and whoever is
 * left up front — and the distance between them is the thing a coach actually
 * watches. Pulled apart, the ball goes through the gap and the next thing that
 * happens is a shot at your goal. "Stay compact" is the instruction; this is
 * the picture of whether they did.
 *
 * Positions come from the tracked frames, measured up the pitch from our own
 * goal, so a bigger number is further forward whichever way the team is
 * kicking. Keepers are left out — a keeper on his line would drag the back
 * group ten metres deeper than it really was.
 */

export type BlockSample = {
  t: number;
  /** Metres up the pitch from our own goal. */
  def: number;
  mid: number;
  att: number;
  /** Back to front. The figure the coach's ceiling is set against. */
  length: number;
};

export type Stretch = {
  fromS: number;
  toS: number;
  /** The widest the team got during this spell. */
  maxM: number;
  /** A shot or a ball through the line against us, during or just after. */
  punished: { t: number; kind: "shot" | "break" } | null;
};

export type Blocks = {
  samples: BlockSample[];
  stretches: Stretch[];
  /** How long the whole match's samples cover, for the axis. */
  durationS: number;
  medianLength: number | null;
  /** Set when the frames cannot support this at all. */
  unavailable: string | null;
};

/** A spell has to last this long before it is a spell and not a wobble. */
const MIN_STRETCH_S = 3;
/** How soon after the blocks pull apart a goal threat still counts as the cost. */
const PUNISH_WINDOW_S = 12;
/** Fewer tracked outfielders than this and the groups are guesswork. */
const MIN_PLAYERS = 7;

function mean(values: number[]) {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

/**
 * The three groups in one frame.
 *
 * Split by where players actually are rather than by what shirt they wear: sort
 * up the pitch, take the deepest four as the back line, the highest three as
 * the front, and whatever sits between them as the midfield. A back four that
 * has pushed into midfield reads as midfield, which is the truth of the moment
 * and the point of measuring it.
 */
function groupsIn(frame: Frame, team: TeamKey, attackRight: boolean, length: number) {
  const up = (x: number) => (attackRight ? x : length - x);
  const xs = frame.players
    .filter((p) => p.team === team && !p.gk && p.state !== "stale")
    .map((p) => up(p.m[0]))
    .sort((a, b) => a - b);

  if (xs.length < MIN_PLAYERS) return null;

  const back = xs.slice(0, Math.min(4, xs.length - 3));
  const front = xs.slice(Math.max(xs.length - 3, back.length));
  const middle = xs.slice(back.length, xs.length - front.length);

  const def = mean(back);
  const att = mean(front);
  return {
    def,
    att,
    mid: middle.length > 0 ? mean(middle) : (def + att) / 2,
    length: att - def,
  };
}

export function buildBlocks({
  file,
  team,
  ceilingM,
  events,
}: {
  file: MatchDataFile | undefined;
  team: TeamKey;
  /** The coach's own back-to-front ceiling. */
  ceilingM: number;
  /** Everything that happened, so a stretch can be tied to what it cost. */
  events: { t: number; type: string; team: string | null }[];
}): Blocks {
  // Inside the periods only: a block measured during the warm-up or at
  // half-time is not a stretch of the match.
  const frames = (file?.frames ?? []).filter((frame) => insidePeriods(frame.t, file?.periods));
  const length = file?.pitch?.length ?? 105;
  const attackRight = file?.attack_right?.[team] ?? team === "A";
  const durationS = Math.max(frames.at(-1)?.t ?? 0, 1);

  if (frames.length === 0)
    return {
      samples: [],
      stretches: [],
      durationS,
      medianLength: null,
      unavailable: "This match has no tracked frames loaded, so the blocks cannot be measured.",
    };

  const samples: BlockSample[] = [];
  for (const frame of frames) {
    const groups = groupsIn(frame, team, attackRight, length);
    if (groups) samples.push({ t: frame.t, ...groups });
  }

  if (samples.length < 30)
    return {
      samples: [],
      stretches: [],
      durationS,
      medianLength: null,
      unavailable: `Only ${samples.length} frames have enough of our outfield players in view to measure the blocks. The camera has to see at least ${MIN_PLAYERS} of them at once.`,
    };

  // Spells where the team was longer than the coach's own ceiling.
  const stretches: Stretch[] = [];
  let open: { fromS: number; toS: number; maxM: number } | null = null;
  for (const sample of samples) {
    if (sample.length > ceilingM) {
      if (open) {
        open.toS = sample.t;
        open.maxM = Math.max(open.maxM, sample.length);
      } else open = { fromS: sample.t, toS: sample.t, maxM: sample.length };
    } else if (open) {
      if (open.toS - open.fromS >= MIN_STRETCH_S) stretches.push({ ...open, punished: null });
      open = null;
    }
  }
  if (open && open.toS - open.fromS >= MIN_STRETCH_S) stretches.push({ ...open, punished: null });

  // What it cost: a shot against, or a ball played through our line, while the
  // team was stretched or in the seconds straight after it closed up again.
  const other = team === "A" ? "B" : "A";
  const against = events
    .filter(
      (event) =>
        (event.type === "shot" && event.team === other) ||
        (event.type === "goal" && event.team === other) ||
        event.type === "line_break_against",
    )
    .map((event) => ({
      t: event.t,
      kind: (event.type === "line_break_against" ? "break" : "shot") as "shot" | "break",
    }))
    .sort((a, b) => a.t - b.t);

  for (const stretch of stretches) {
    stretch.punished =
      against.find((hit) => hit.t >= stretch.fromS && hit.t <= stretch.toS + PUNISH_WINDOW_S) ??
      null;
  }

  return {
    samples,
    stretches,
    durationS,
    medianLength: median(samples.map((s) => s.length)),
    unavailable: null,
  };
}
