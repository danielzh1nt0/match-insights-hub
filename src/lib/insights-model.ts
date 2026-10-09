import type { Finding } from "@/lib/match-data";

/**
 * The insights model: which of the four moments of the game each finding
 * belongs to, and which one the coach should deal with first.
 *
 * The four phases are the taxonomy because every coach already thinks in them
 * and each maps to metrics the pipeline actually emits. The priority is taken
 * from the findings, never hardcoded: a finding exists only because a real
 * number crossed a threshold the coach set, and `buildFindings` returns them
 * worst-first.
 */

export type PhaseKey = "possession" | "out" | "attack" | "defence";
export type MomentState = "keep" | "watch" | "fix";

export const PHASE_NAME: Record<PhaseKey, string> = {
  possession: "In possession",
  out: "Out of possession",
  attack: "Transition to attack",
  defence: "Transition to defence",
};

/** Which moment of the game each finding is about. */
const PHASE_OF: Record<string, PhaseKey> = {
  // losing the ball and the reaction to it
  slow_press: "defence",
  no_regain: "defence",
  press_alone: "defence",
  // winning the ball and what happens next
  slow_forward: "attack",
  won_and_lost: "attack",
  // on the ball
  better_option: "possession",
  risky_passing: "possession",
  // without the ball, settled
  long_block: "out",
  low_tilt: "out",
  no_high_turnovers: "out",
};

export type PhaseModel = {
  key: PhaseKey;
  name: string;
  /** Findings that fired for this phase, worst first. */
  findings: Finding[];
  state: MomentState;
  /** This is the one to deal with first. */
  priority: boolean;
};

export type InsightsModel = {
  phases: PhaseModel[];
  /** The single most important finding, or null when every target was met. */
  top: Finding | null;
  /** Findings the pipeline produced that no phase claims. */
  unmapped: Finding[];
};

/**
 * Phases come back in the order the coach should read them: the priority first,
 * then anything else that fired, then the phases that were fine.
 */
export function buildInsightsModel(findings: Finding[]): InsightsModel {
  const top = findings[0] ?? null;
  const topPhase = top ? PHASE_OF[top.id] : undefined;

  const phases: PhaseModel[] = (Object.keys(PHASE_NAME) as PhaseKey[]).map((key) => {
    const own = findings.filter((f) => PHASE_OF[f.id] === key);
    const priority = topPhase === key;
    return {
      key,
      name: PHASE_NAME[key],
      findings: own,
      state: own.length === 0 ? "keep" : priority ? "fix" : "watch",
      priority,
    };
  });

  const rank = (phase: PhaseModel) => (phase.priority ? 0 : phase.findings.length > 0 ? 1 : 2);
  phases.sort((a, b) => rank(a) - rank(b));

  return {
    phases,
    top,
    unmapped: findings.filter((f) => !PHASE_OF[f.id]),
  };
}

/**
 * The headline for the top of the screen. With no findings this says so
 * plainly rather than reaching for something dramatic to fill the space.
 */
export function verdict(model: InsightsModel): { headline: string; sub: string | null } {
  if (!model.top) {
    return {
      headline: "Every target you set was met.",
      sub: "Nothing in this match crossed a threshold. The phases below show what the numbers were.",
    };
  }
  // The quote has to be about *this* match. The headline is the coaching
  // instruction and reads the same on any match where the same threshold is
  // crossed — three in a row said "press faster when we lose the ball", which
  // looks like a canned app sentence even though it was honestly derived. The
  // interpretation is the same finding stated in this match's own figures, so
  // it leads, and the instruction follows it.
  return { headline: model.top.interpretation, sub: model.top.headline };
}

/**
 * A card must never say "keep doing" while the number it is showing misses the
 * target it is showing right underneath.
 *
 * State normally comes from the findings, which is right: a finding means a
 * real threshold was crossed. But if the findings engine ever misses one, the
 * card would reassure the coach against its own printed evidence. This is the
 * backstop, not the primary path.
 */
export function guardState(
  state: MomentState,
  value: number | null,
  target: number | null,
  higherIsBetter: boolean,
): MomentState {
  if (state !== "keep" || value === null || target === null) return state;
  const missed = higherIsBetter ? value < target : value > target;
  return missed ? "watch" : state;
}

/* ---------------- What went right ---------------- */

export type Strength = {
  id: string;
  /** What the team did, in the coach's words. */
  label: string;
  /** The figure behind it. */
  value: string;
  /** What it was measured against. */
  basis: string;
};

/**
 * The things that worked.
 *
 * The findings engine only ever produces problems — a finding exists because a
 * threshold was crossed — so a debrief built from findings alone tells a coach
 * nothing but what he got wrong. That is not how anyone runs a review, and it
 * is not what the match data says either: the same file that shows a missed
 * target shows every target that was met.
 *
 * Each entry has to clear the same bar as a finding: a real number, measured
 * against something, with nothing inferred. A target met is a strength; a
 * target absent is not.
 */
export function buildStrengths({
  row,
  thresholds,
  shots,
  otherShots,
  goals,
  highTurnovers,
  completion,
}: {
  row: Record<string, unknown> | null;
  thresholds: { pressWithin2s: number; regainWithin5s: number; blockCeilingM: number };
  shots: number;
  otherShots: number;
  goals: number;
  highTurnovers: number;
  /** Pass completion over the judged passes in the match, the KPI's figure. */
  completion: number | null;
}): Strength[] {
  const num = (key: string) => {
    const value = row?.[key];
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  };
  const out: Strength[] = [];

  const press = num("pressed_within_2s_pct");
  if (press !== null && press >= thresholds.pressWithin2s)
    out.push({
      id: "press_met",
      label: "We pressed on time",
      value: `${Math.round(press)}%`,
      basis: `inside two seconds, against a ${thresholds.pressWithin2s}% target`,
    });

  const regain = num("regained_within_5s_pct");
  if (regain !== null && regain >= thresholds.regainWithin5s)
    out.push({
      id: "regain_met",
      label: "We won it back quickly",
      value: `${Math.round(regain)}%`,
      basis: `back inside five seconds, against a ${thresholds.regainWithin5s}% target`,
    });

  const block = num("block_length_median_m");
  if (block !== null && block <= thresholds.blockCeilingM)
    out.push({
      id: "block_met",
      label: "We stayed compact",
      value: `${Math.round(block)} m`,
      basis: `back to front, under your ${thresholds.blockCeilingM} m ceiling`,
    });

  // "Better chances" needs a margin, not 1-0 on shots: at least three more
  // than them and half as many again.
  if (shots >= otherShots + 3 && shots >= otherShots * 1.5)
    out.push({
      id: "shots_won",
      label: "We had more of the chances",
      value: `${shots}–${otherShots}`,
      basis: "shots, us against them",
    });

  if (goals > 0)
    out.push({
      id: "scored",
      label: goals === 1 ? "We took our chance" : "We took our chances",
      value: `${goals}`,
      basis: goals === 1 ? "goal scored" : "goals scored",
    });

  if (highTurnovers > 2)
    out.push({
      id: "high_wins",
      label: "We won it high up the pitch",
      value: `${highTurnovers}`,
      basis: "balls won in their half",
    });

  // The same completion the KPI card scores, not the team row's, so one
  // match does not print two completion figures.
  if (completion !== null && completion >= 75)
    out.push({
      id: "passing",
      label: "We kept the ball well",
      value: `${Math.round(completion)}%`,
      basis: "of our passes found a team-mate",
    });

  return out;
}
