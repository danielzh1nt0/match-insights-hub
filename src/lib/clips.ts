import type { ReviewedEvent } from "@/lib/event-reviews";
import type { TeamKey } from "@/lib/match-analysis";

/**
 * The clip reel, built from real tracked events.
 *
 * Every clip here is a moment that exists in the match file, at the timestamp
 * the file gives it. Nothing is generated. If the file holds no moments worth
 * showing, the reel is empty and says so — that is a truthful answer, not a
 * reason to invent a highlight.
 */

export type ReelClip = {
  id: string;
  t: number;
  title: string;
  tag: string;
  reason: string;
  team: TeamKey | null;
  /** The coach reviewed this moment and kept it. */
  confirmed: boolean;
};

/** Plain-language labels for the event types the pipeline emits. */
const TAG: Record<string, string> = {
  goal: "Goal",
  shot: "Shot",
  shot_blocked: "Shot blocked",
  turnover_lost: "Ball given away",
  turnover_won: "Ball won",
  high_turnover: "Won it high up",
  set_piece: "Set piece",
  better_option: "Better pass was open",
  line_break_against: "Played through us",
  pass_bad: "Bad pass",
  pass_risky: "Risky pass",
  sequence_end: "Attack ended",
};

/** Types worth putting in front of a squad, most telling first. */
const WORTH_SHOWING = [
  "goal",
  "high_turnover",
  "shot",
  "shot_blocked",
  "line_break_against",
  "turnover_lost",
  "turnover_won",
  "set_piece",
  "better_option",
];

function reasonFor(event: ReviewedEvent, ownTeam: TeamKey): string {
  if (event.subtitle) return event.subtitle;
  const ours = event.team === ownTeam;
  switch (event.type) {
    case "goal":
      return ours ? "A goal for us." : "A goal against us.";
    case "shot":
    case "shot_blocked":
      return ours ? "A shot we got away." : "A shot we allowed.";
    case "turnover_lost":
      return "We gave the ball away here.";
    case "turnover_won":
      return "We won the ball back here.";
    case "high_turnover":
      return "We won it in their half.";
    case "line_break_against":
      return "They got past our deepest defender.";
    case "set_piece":
      return ours ? "Our set piece." : "Their set piece.";
    case "better_option":
      return "A better pass was open.";
    default:
      return "A tracked moment from this match.";
  }
}

/**
 * Chronological, because a reel is watched in match order. Confirmed moments
 * come first only when the list has to be trimmed — a moment the coach has
 * already reviewed outranks one that is merely detected.
 */
export function buildClips(events: ReviewedEvent[], ownTeam: TeamKey, limit = 12): ReelClip[] {
  const candidates = events.filter((event) => event.status !== "deleted" && WORTH_SHOWING.includes(event.type));

  const trimmed =
    candidates.length <= limit
      ? candidates
      : [...candidates]
          .sort((a, b) => {
            const byStatus = Number(b.status === "confirmed") - Number(a.status === "confirmed");
            if (byStatus !== 0) return byStatus;
            return WORTH_SHOWING.indexOf(a.type) - WORTH_SHOWING.indexOf(b.type);
          })
          .slice(0, limit);

  return trimmed
    .slice()
    .sort((a, b) => a.t - b.t)
    .map((event) => ({
      id: event.id,
      t: event.t,
      title: event.title,
      tag: TAG[event.type] ?? "Moment",
      reason: reasonFor(event, ownTeam),
      team: event.team,
      confirmed: event.status === "confirmed",
    }));
}
