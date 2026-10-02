import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  ArrowLeftRight,
  CalendarCheck,
  Goal,
  PieChart,
  Route,
  Ruler,
  Scissors,
  Timer,
} from "lucide-react";
import { ChapterRail, type ChapterCell } from "@/components/insights/ChapterRail";
import { ClipStrip } from "@/components/insights/ClipStrip";
import { VerdictBlock } from "@/components/insights/VerdictBlock";
import { MatchFlow, type FlowGoal } from "@/components/insights/MatchFlow";
import { MatchNumbersGrid, type NumberCell } from "@/components/insights/MatchNumbersGrid";
import { FindingsList } from "@/components/insights/FindingsList";
import { Beat, Drawer, WhatWorked } from "@/components/insights/Narrative";
import { actionLinkClass } from "@/components/ip/touchline";
import type { TeamIdentity } from "@/components/team/TeamToken";
import type { ReviewedEvent } from "@/lib/event-reviews";
import type { Finding } from "@/lib/match-data";
import { buildInsightsModel, buildStrengths, verdict } from "@/lib/insights-model";
import { teamRow, type StatsFile, type TeamKey, type Thresholds } from "@/lib/match-analysis";
import type { ChapterId } from "@/lib/story-chapters";
import type { LibraryMatch } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

function numeric(row: Record<string, unknown> | null, key: string) {
  const value = row?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function shown(value: number | null, suffix = "") {
  return value === null ? "—" : `${Math.round(value * 10) / 10}${suffix}`;
}

/**
 * Insights: the match as a debrief.
 *
 * The page reads top to bottom the way a coach talks. Here is the story in five
 * chapters; here is the verdict and the three figures it rests on; here is when
 * the game turned; here are the counts; here is every finding with its
 * evidence; here is who to speak to. Nothing on it is invented — a figure this
 * match file cannot support says so rather than appearing as a number.
 */
export function InsightsScreen({
  matchId,
  match,
  findings,
  events,
  stats,
  team,
  thresholds,
  identities,
}: {
  matchId: string;
  match: LibraryMatch;
  findings: Finding[];
  summary: string[];
  events: ReviewedEvent[];
  stats: StatsFile | undefined;
  team: TeamKey | null;
  thresholds: Thresholds;
  iconColour: string;
  identities: { A: TeamIdentity; B: TeamIdentity };
  onReview: (input: {
    eventId: string;
    verdict: "confirmed" | "deleted" | "retimed";
    tCorrected?: number | null;
    teamCorrected?: string | null;
  }) => void;
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

  const chapterCells: Partial<Record<ChapterId, ChapterCell>> = {
    score: {
      title: `The result (${match.scoreA}-${match.scoreB})`,
      sub: match.competition || match.date,
    },
    strength: {
      title: shots >= otherShots ? "We made the chances" : "They made the chances",
      sub: `${shots} shots to ${otherShots}`,
    },
    player: {
      title: players.length
        ? `Who stood out: ${players.map((p) => `#${p.shirtNumber}`).join(", ")}`
        : "No shirt numbers yet",
      sub: players.length ? "From the tracking file" : "Tracking did not identify players",
    },
    improve: model.top
      ? {
          title: model.top.headline,
          sub: `${model.top.value}${model.top.unit === "%" ? "%" : ` ${model.top.unit}`} against ${model.top.target}${model.top.unit === "%" ? "%" : ""}`,
          flagged: true,
        }
      : { title: "Every target met", sub: "Nothing crossed a threshold" },
    verdict: {
      title: "Tuesday plan",
      sub: model.top ? "Built from the finding above" : "Keep what worked",
    },
  };

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

  return (
    <>
      {/* The page is a debrief, in the order a coach gives one: how it went,
          what we got right, what we got wrong and why, what we do about it.
          The counts and the full list of moments are what he reaches for once
          he disagrees with something, so they fold away at the bottom rather
          than opening the page. */}

      <VerdictBlock
        teamA={identities.A}
        teamB={identities.B}
        scoreLine={scoreLine}
        headline={headline}
        finding={model.top}
        matchId={matchId}
      />

      <Beat
        step={1}
        question="How did the match go?"
        title={flowTitle}
        aside={`${confirmed} of ${moments.length} moments confirmed`}
      >
        <MatchFlow
          momentum={momentum}
          durationS={duration}
          goals={goals}
          turnovers={lossEvents.map((event) => event.t)}
          window={pressureWindow}
          teamA={identities.A}
          teamB={identities.B}
          confirmed={confirmed}
          detected={Math.max(moments.length - confirmed, 0)}
        />

        <div className="mt-4">
          <MatchNumbersGrid cells={cells} matchId={matchId} />
        </div>
      </Beat>

      <Beat
        step={2}
        question="What did we get right?"
        title={
          strengths.length === 0
            ? "Nothing cleared a target"
            : strengths.length === 1
              ? "One thing held up"
              : `${strengths.length} things held up`
        }
      >
        <WhatWorked strengths={strengths} matchId={matchId} />
      </Beat>

      <Beat
        step={3}
        question="What went wrong, and why?"
        title={
          findings.length === 0
            ? "Every target was met"
            : findings.length === 1
              ? "One thing to fix"
              : `${findings.length} things to fix, worst first`
        }
        aside="Each one carries the moments behind it"
      >
        <FindingsList findings={findings} matchId={matchId} />
      </Beat>

      <Beat
        step={4}
        question="What do we do about it?"
        title={model.top ? "Tuesday, built from the finding above" : "Keep what worked"}
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
          <div className="flex flex-col gap-3 border border-wire bg-surface p-5">
            <p className="text-[14px] leading-relaxed text-text-dim">
              {model.top
                ? `The session is built from "${model.top.headline.toLowerCase()}" — the drills, their durations and the pitch diagrams all come from that finding and the ${model.top.events} moments behind it.`
                : "No threshold was crossed in this match, so there is nothing to build a corrective session from. The plan keeps what already works."}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/match/$matchId/session" params={{ matchId }} className="btn btn-primary">
                <CalendarCheck size={16} aria-hidden="true" />
                Build Tuesday session
              </Link>
              <Link to="/match/$matchId/reel" params={{ matchId }} className="btn btn-secondary">
                <Scissors size={15} aria-hidden="true" />
                Cut a reel to share
              </Link>
            </div>
          </div>

          {players.length > 0 && (
            <div className="border border-wire bg-surface">
              <p className="border-b border-wire px-4 py-3 text-[11.5px] leading-snug text-text-faint sm:px-5">
                Shirt numbers from the tracking file. Match them to your own team sheet — the
                pipeline does not know who wears what.
              </p>
              <ul className="rule-y">
                {players.map((player) => (
                  <li key={player.shirtNumber} className="px-4 py-3 sm:px-5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="flex items-baseline gap-2">
                        <span className="num text-[18px] leading-none text-text-dim">
                          #{player.shirtNumber}
                        </span>
                        <span className="text-[13.5px] font-semibold text-text-bright">
                          {player.descriptor}
                        </span>
                      </span>
                      <span className="num-flat shrink-0 text-[11.5px] text-text-faint">
                        {player.count}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Beat>

      {/* Everything below here is for checking, not for reading. */}
      <div className="flex flex-col gap-3">
        {model.top && model.top.timestamps.length > 0 && (
          <Drawer
            label={`Every moment behind "${model.top.headline.toLowerCase()}"`}
            summary={`${model.top.events} moments, each opening the video at its own second`}
          >
            <ClipStrip
              matchId={matchId}
              timestamps={model.top.timestamps}
              total={model.top.events}
              label={model.top.headline}
              bare
            />
          </Drawer>
        )}

        <Drawer label="The match as a story" summary="Five chapters, for showing the squad">
          <ChapterRail matchId={matchId} cells={chapterCells} bare />
        </Drawer>
      </div>

      <p className="sr-only">
        {match.teamA} versus {match.teamB}. {findings.length} coaching findings.
      </p>
      <Link
        to="/match/$matchId/stats"
        params={{ matchId }}
        className={cn(actionLinkClass(), "sr-only")}
      >
        Open all match stats
      </Link>
    </>
  );
}
