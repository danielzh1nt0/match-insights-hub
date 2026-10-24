import type { ReviewedEvent } from "./event-reviews";
import { passCompleted, type Shot } from "./export-contract";
import type { Frame } from "./match-source";

export type StatsTakeaway = { headline: string; evidence: string };
export type TakeawayInput = {
  tab: string;
  name: string;
  team: "A" | "B";
  frames: Frame[];
  passes: Record<string, unknown>[];
  events: ReviewedEvent[];
  shots: Shot[];
  heights: number[];
};

const median = (numbers: number[]) => {
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? (sorted[mid] ?? 0) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
};

/** Inputs are already team/period filtered by the Stats visual data path. */
export function statsTakeaway(input: TakeawayInput): StatsTakeaway {
  const { tab, name, team, frames, passes, events, shots, heights } = input;
  if (tab === "ball") {
    const known = frames.filter((frame) => frame.possession === "A" || frame.possession === "B");
    const own = known.filter((frame) => frame.possession === team);
    if (known.length) return {
      headline: `${name} had the ball in ${Math.round(own.length / known.length * 100)}% of tracked possession moments.`,
      evidence: `${known.length.toLocaleString()} moments with a known team in possession; tracking gaps are excluded.`,
    };
  }
  if (tab === "pressing") {
    const losses = events.filter((event) => event.type === "turnover_lost");
    const measured = losses.flatMap((event) => {
      const seconds = event.payload?.["time_to_press"];
      return typeof seconds === "number" && Number.isFinite(seconds) && seconds >= 0 ? [seconds] : [];
    });
    if (measured.length) return {
      headline: `${name} pressed within 2 seconds after ${measured.filter((s) => s <= 2).length} of ${measured.length} measured losses.`,
      evidence: `${losses.filter((e) => e.status === "confirmed").length} confirmed · ${losses.length} detected losses · ${losses.length - measured.length} without a reaction time.`,
    };
  }
  if (tab === "shape" && heights.length) return {
    headline: `${name}'s median defensive line was ${median(heights).toFixed(1)} m from their own goal.`,
    evidence: `${heights.length.toLocaleString()} line-height samples in the selected period.`,
  };
  if (tab === "shooting" && shots.length) return {
    headline: `${name} recorded ${shots.length} shots, including ${shots.filter((shot) => shot.goal).length} goals.`,
    evidence: `${shots.filter((shot) => shot.onTarget !== null).length} of ${shots.length} shots have a recorded on-target outcome.`,
  };
  if (tab === "passes" && passes.length) {
    const judged = passes.filter((pass) => passCompleted(pass) !== null);
    const completed = judged.filter((pass) => passCompleted(pass) === true).length;
    return {
      headline: judged.length
        ? `${name} completed ${completed} of ${judged.length} graded passes (${Math.round(completed / judged.length * 100)}%).`
        : `${name} recorded ${passes.length} passes; completion outcomes are still ungraded.`,
      evidence: `${passes.length} timed passes · ${passes.length - judged.length} ungraded.`,
    };
  }
  if (tab === "players") {
    const ids = new Set(frames.flatMap((frame) => frame.players.filter((p) => p.state !== "stale").map((p) => p.id)));
    if (ids.size) return {
      headline: `${name} had ${ids.size} distinct player tracks in this period.`,
      evidence: "Tracks are not verified player identities; the individual totals below cover the full match.",
    };
  }
  if (tab === "setpieces") {
    const restarts = events.filter((event) => event.type === "set_piece");
    if (restarts.length) return {
      headline: `${name} had ${restarts.length} detected restarts in this period.`,
      evidence: `${restarts.filter((event) => event.status === "confirmed").length} confirmed · ${restarts.length} detected.`,
    };
  }
  return { headline: "There isn't enough measured evidence for a reliable takeaway yet.", evidence: "Selected team and period only." };
}