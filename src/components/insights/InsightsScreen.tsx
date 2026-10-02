import { Link } from "@tanstack/react-router";
import { CalendarCheck, Scissors } from "lucide-react";
import { ChapterRail, type ChapterCell } from "@/components/insights/ChapterRail";
import { ClipStrip } from "@/components/insights/ClipStrip";
import { VerdictBlock } from "@/components/insights/VerdictBlock";
import { MatchFlow } from "@/components/insights/MatchFlow";
import { MatchNumbersGrid } from "@/components/insights/MatchNumbersGrid";
import { FindingsList } from "@/components/insights/FindingsList";
import { Beat, Drawer, WhatWorked } from "@/components/insights/Narrative";
import { actionLinkClass } from "@/components/ip/touchline";
import type { TeamIdentity } from "@/components/team/TeamToken";
import type { ReviewedEvent } from "@/lib/event-reviews";
import type { Finding } from "@/lib/match-data";
import { useMatchModel } from "@/hooks/use-match-model";
import type { StatsFile, TeamKey, Thresholds } from "@/lib/match-analysis";
import type { ChapterId } from "@/lib/story-chapters";
import type { LibraryMatch } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

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
  videoUrl,
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
  /** The signed match video, so clips play on this page rather than linking away. */
  videoUrl?: string | undefined;
  onReview: (input: {
    eventId: string;
    verdict: "confirmed" | "deleted" | "retimed";
    tCorrected?: number | null;
    teamCorrected?: string | null;
  }) => void;
}) {
  const {
    duration,
    moments,
    lossEvents,
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
    cells,
    shots,
    otherShots,
  } = useMatchModel({ match, findings, events, stats, team, thresholds });

  const chapterCells: Partial<Record<ChapterId, ChapterCell>> = {
    score: {
      title: `The result (${match.scoreA}-${match.scoreB})`,
      sub: match.competition || match.date,
    },
    strength: {
      title: shots >= otherShots ? "We made the chances" : "They made the chances",
      sub: `${shots} shots to ${otherShots}`,
    },
    turned: pressureWindow
      ? { title: "When it turned", sub: pressureWindow.label }
      : { title: "The losses never clustered", sub: `${lossEvents.length} given away in all` },
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
        <FindingsList findings={findings} matchId={matchId} videoUrl={videoUrl} />
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
            summary={`${model.top.events} moments, each playable where it sits`}
          >
            <ClipStrip
              matchId={matchId}
              timestamps={model.top.timestamps}
              total={model.top.events}
              label={model.top.headline}
              videoUrl={videoUrl}
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
