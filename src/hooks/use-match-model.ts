import { useMemo } from "react";
import { ArrowLeftRight, Goal, PieChart, Route, Ruler, Timer } from "lucide-react";
import type { FlowGoal } from "@/components/insights/MatchFlow";
import type { NumberCell } from "@/components/insights/MatchNumbersGrid";
import type { ReviewedEvent } from "@/lib/event-reviews";
import type { Finding } from "@/lib/match-data";
import { buildInsightsModel, buildStrengths, verdict } from "@/lib/insights-model";
import { teamRow, type StatsFile, type TeamKey, type Thresholds } from "@/lib/match-analysis";
import type { LibraryMatch } from "@/lib/sample-data";

function numeric(row: Record<string, unknown> | null, key: string) {
  const value = row?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function shown(value: number | null, suffix = "") {
  return value === null ? "\u2014" : `${Math.round(value * 10) / 10}${suffix}`;
}

/**
 * Everything the app knows about one match, computed once.
 *
 * Insights and the story both report this match, and for a while they each
 * worked it out for themselves: the page listed the targets a team had met
 * while the story celebrated whichever metric beat the opponent by most, and
 * the two could name different things about the same ninety minutes. A recap
 * that contradicts the page it was launched from is worse than no recap, so
 * there is now one model and both read from it.
 *
 * Nothing here is invented. A figure the match file cannot support comes back
 * null and the tile that holds it says so.
 */
export function useMatchModel({
  match,
  findings,
  events,
  stats,
  team,
  thresholds,
}: {
  match: LibraryMatch;
  findings: Finding[];
  events: ReviewedEvent[];
  stats: StatsFile | undefined;
  team: TeamKey | null;
  thresholds: Thresholds;
}) {
  const duration = Math.max(match.durationS, 1);
  const ownTeam = team ?? "A";
  const otherTeam = ownTeam === "A" ? "B" : "A";
  const row = teamRow(stats, ownTeam) as Record<string, unknown> | null;
  const otherRow = teamRow(stats, otherTeam) as Record<string, unknown> | null;

  const possession = numeric(row, "possession_pct");
  const otherPossession = numeric(otherRow, "possession_pct");
  const completion = numeric(row, "pass_completion_pct");
  const blockLength = numeric(row, "block_length_median_m");
  const pressPct = numeric(row, "pressed_within_2s_pct");
  const betterOption = numeric(row, "better_option_count");

  const moments = useMemo(() => events.filter((event) => event.status !== "deleted"), [events]);
  const lossEvents = useMemo(
    () => moments.filter((event) => event.team === ownTeam && event.type === "turnover_lost"),
    [moments, ownTeam],
  );
  const shots = moments.filter((event) => event.team === ownTeam && event.type === "shot").length;
  const otherShots = moments.filter(
    (event) => event.team === otherTeam && event.type === "shot",
  ).length;
  const setPieces = moments.filter((event) => event.type === "set_piece").length;
  const confirmed = moments.filter((event) => event.status === "confirmed").length;

  const model = useMemo(() => buildInsightsModel(findings), [findings]);
  const { headline } = verdict(model);

  /** One value per thirtieth of the match: our tracked moments against theirs. */
  const momentum = useMemo(() => {
    const SLICES = 30;
    return Array.from({ length: SLICES }, (_, i) => {
      const from = (duration / SLICES) * i;
      const to = (duration / SLICES) * (i + 1);
      const inSlice = moments.filter((event) => event.t >= from && event.t < to);
      if (inSlice.length === 0) return 0;
      return (inSlice.filter((event) => event.team === ownTeam).length * 2) / inSlice.length - 1;
    });
  }, [moments, duration, ownTeam]);

  /** The goals, each carrying the score as it stood immediately after it. */
  const goals = useMemo<FlowGoal[]>(() => {
    const scored = moments
      .filter((event) => event.type === "goal" && (event.team === "A" || event.team === "B"))
      .sort((a, b) => a.t - b.t);
    let a = 0;
    let b = 0;
    return scored.map((event) => {
      if (event.team === "A") a += 1;
      else b += 1;
      return { t: event.t, team: event.team as "A" | "B", score: `${a}-${b}` };
    });
  }, [moments]);

  /**
   * The stretch in which we lost the ball most often.
   *
   * The window is measured, not chosen: a fourteen-minute frame slides across
   * the match and the busiest position wins. Too few losses to cluster and
   * there is no window at all, rather than one drawn around nothing.
   */
  const pressureWindow = useMemo(() => {
    if (lossEvents.length < 6) return undefined;
    const span = 14 * 60;
    let best = { from: 0, count: 0 };
    for (const event of lossEvents) {
      const count = lossEvents.filter(
        (other) => other.t >= event.t && other.t < event.t + span,
      ).length;
      if (count > best.count) best = { from: event.t, count };
    }
    if (best.count < 4) return undefined;
    return {
      fromS: best.from,
      toS: Math.min(best.from + span, duration),
      label: `${best.count} losses in 14 minutes`,
    };
  }, [lossEvents, duration]);

  /** Our own shirts, busiest first. Numbers only — the file does not know names. */
  const players = useMemo(() => {
    const unique = new Map<number, { shirtNumber: number; descriptor: string; count: number }>();
    for (const event of moments) {
      const raw =
        event.payload?.["shirt"] ??
        event.payload?.["shirt_number"] ??
        event.payload?.["player_shirt"];
      const shirtNumber = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(shirtNumber) || event.team !== ownTeam) continue;
      const existing = unique.get(shirtNumber);
      if (existing) {
        existing.count += 1;
        continue;
      }
      unique.set(shirtNumber, {
        shirtNumber,
        descriptor:
          event.type === "turnover_lost"
            ? "Nearest the loss"
            : event.type === "shot"
              ? "Took the shot"
              : "In the moment",
        count: 1,
      });
    }
    return [...unique.values()].sort((a, b) => b.count - a.count).slice(0, 3);
  }, [moments, ownTeam]);

  const scoreLine = `${match.teamA} ${match.scoreA}-${match.scoreB} ${match.teamB}`;

  const strengths = useMemo(
    () =>
      buildStrengths({
        row,
        thresholds,
        shots,
        otherShots,
        goals: goals.filter((goal) => goal.team === ownTeam).length,
        highTurnovers: moments.filter(
          (event) => event.team === ownTeam && event.type === "high_turnover",
        ).length,
      }),
    [row, thresholds, shots, otherShots, goals, moments, ownTeam],
  );

  /** How the match went, in one line, from the result and the shape of it. */
  const ourGoals = goals.filter((goal) => goal.team === ownTeam).length;
  const theirGoals = goals.length - ourGoals;
  const flowTitle =
    goals.length === 0
      ? "No goals tracked in this match"
      : ourGoals > theirGoals
        ? pressureWindow
          ? "We won it, but gave them a way back"
          : "We won it and held them off"
        : ourGoals < theirGoals
          ? "They found the gap we left"
          : "Even on the scoreline";

  const cells: NumberCell[] = [
    {
      label: "Shots",
      value: `${shots}-${otherShots}`,
      icon: Goal,
      sentence: shots + otherShots === 0 ? undefined : `${shots} for us, ${otherShots} against.`,
      basis: `${moments.length} moments logged from this match`,
      link: { label: "Review all shot events", to: "/match/$matchId/stats" },
    },
    {
      label: "Field possession",
      value: possession === null ? null : shown(possession, "%"),
      icon: PieChart,
      sentence:
        possession === null
          ? undefined
          : `${shown(otherPossession, "%")} to them${completion === null ? "" : `, ${shown(completion, "%")} of our passes completed`}.`,
      withheldNote: `The ball was not tracked well enough to measure this. ${confirmed} of ${moments.length} moments confirmed.`,
      link: { label: "Inspect phase distribution", to: "/match/$matchId/territory" },
    },
    {
      label: "Pressed within two seconds",
      value: pressPct === null ? null : shown(pressPct, "%"),
      icon: Timer,
      sentence:
        pressPct === null
          ? undefined
          : `Target ${thresholds.pressWithin2s}%. ${pressPct < thresholds.pressWithin2s ? "Short of it." : "Met."}`,
      basis: `${confirmed} of ${moments.length} moments confirmed`,
      withheldNote: "No loss in this match carries a time to first pressure.",
      link: { label: "View the delayed presses", to: "/match/$matchId/stats" },
    },
    {
      label: "Balls given away",
      value: `${lossEvents.length}`,
      icon: ArrowLeftRight,
      sentence: "Possessions lost, all thirds.",
      basis: `${setPieces} set pieces detected`,
      link: { label: "Filter by pitch sector", to: "/match/$matchId/territory" },
    },
    {
      label: "Block length",
      value: blockLength === null ? null : `${shown(blockLength)} m`,
      icon: Ruler,
      sentence:
        blockLength === null
          ? undefined
          : `Back to front. Your ceiling is ${thresholds.blockCeilingM} m.`,
      withheldNote: "Shape is not tracked for this match, so no distance can be measured.",
      link: { label: "Open the shape tab", to: "/match/$matchId/stats" },
    },
    {
      label: "A better pass was open",
      value: betterOption === null ? null : `${betterOption}`,
      icon: Route,
      sentence: betterOption === null ? undefined : "Clearer lanes neglected under pressure.",
      withheldNote: "Passing lanes need tracked team-mate positions, which this match lacks.",
      link: { label: "Review the passing clips", to: "/match/$matchId/stats" },
    },
  ];
  return {
    ownTeam,
    otherTeam,
    duration,
    moments,
    lossEvents,
    shots,
    otherShots,
    setPieces,
    confirmed,
    model,
    headline,
    momentum,
    goals,
    pressureWindow,
    players,
    strengths,
    scoreLine,
    flowTitle,
    ourGoals,
    theirGoals,
    cells,
    possession,
    pressPct,
    blockLength,
  };
}

export type MatchModel = ReturnType<typeof useMatchModel>;
