import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { ChapterRail } from "@/components/insights/ChapterRail";
import { OneThingPoster } from "@/components/insights/OneThingPoster";
import { MatchNumbersGrid, type NumberCell } from "@/components/insights/MatchNumbersGrid";
import { FindingsList } from "@/components/insights/FindingsList";
import { PlayerChip } from "@/components/visuals/PlayerChip";
import type { ReviewedEvent } from "@/lib/event-reviews";
import type { Finding } from "@/lib/match-data";
import { buildInsightsModel, verdict } from "@/lib/insights-model";
import { teamRow, type StatsFile, type TeamKey, type Thresholds } from "@/lib/match-analysis";
import type { LibraryMatch } from "@/lib/sample-data";

function numeric(row: Record<string, unknown> | null, key: string) {
  const value = row?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function shown(value: number | null, suffix = "") {
  return value === null ? "—" : `${Math.round(value * 10) / 10}${suffix}`;
}

/**
 * Insights, in the prototype's shape.
 *
 * The poster carries the verdict, the grid carries the numbers with their
 * certainty on the same line, and the list carries every finding with its
 * evidence. The four-phase cards that used to sit here came from a different
 * design and have been replaced.
 */
export function InsightsScreen({
  matchId,
  match,
  findings,
  events,
  stats,
  team,
  thresholds,
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
  onReview: (input: {
    eventId: string;
    verdict: "confirmed" | "deleted" | "retimed";
    tCorrected?: number | null;
    teamCorrected?: string | null;
  }) => void;
}) {
  const navigate = useNavigate();
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

  const moments = useMemo(() => events.filter((event) => event.status !== "deleted"), [events]);
  const lossEvents = moments.filter(
    (event) => event.team === ownTeam && event.type === "turnover_lost",
  );
  const shots = moments.filter((event) => event.team === ownTeam && event.type === "shot").length;
  const otherShots = moments.filter(
    (event) => event.team === otherTeam && event.type === "shot",
  ).length;
  const setPieces = moments.filter((event) => event.type === "set_piece").length;
  const confirmed = moments.filter((event) => event.status === "confirmed").length;

  const model = useMemo(() => buildInsightsModel(findings), [findings]);
  const { headline, sub } = verdict(model);

  /** One bar per thirtieth of the match: our tracked moments against theirs. */
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

  const playerTalks = useMemo(() => {
    const unique = new Map<string, { shirtNumber: number; team: "A" | "B"; descriptor: string }>();
    for (const event of moments) {
      const raw =
        event.payload?.["shirt"] ??
        event.payload?.["shirt_number"] ??
        event.payload?.["player_shirt"];
      const shirtNumber = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(shirtNumber) || !event.team) continue;
      const key = `${event.team}-${shirtNumber}`;
      if (!unique.has(key))
        unique.set(key, {
          shirtNumber,
          team: event.team,
          descriptor: event.type === "turnover_lost" ? "nearest loss" : "review moment",
        });
      if (unique.size === 3) break;
    }
    return [...unique.values()];
  }, [moments]);

  const cells: NumberCell[] = [
    {
      label: "Shots",
      value: `${shots}–${otherShots}`,
      sub: shots + otherShots === 0 ? "None recorded in this match" : undefined,
    },
    {
      label: "Possession",
      // A possession share needs enough tracked ball to mean anything.
      value:
        possession === null ? null : `${shown(possession, "%")}–${shown(otherPossession, "%")}`,
      withheldNote: `The ball was not tracked well enough. ${confirmed} of ${moments.length} moments confirmed.`,
    },
    {
      label: "Pressed within 2 s",
      value: pressPct === null ? null : shown(pressPct, "%"),
      sub: `Target ${thresholds.pressWithin2s}%`,
      ...(pressPct !== null && pressPct < thresholds.pressWithin2s ? { tone: "bad" as const } : {}),
      withheldNote: "No loss in this match carries a time to first pressure.",
    },
    { label: "Balls lost", value: `${lossEvents.length}`, sub: `${setPieces} set pieces detected` },
    {
      label: "Block, back to front",
      value: blockLength === null ? null : `${shown(blockLength)} m`,
      sub: `Your ceiling is ${thresholds.blockCeilingM} m`,
      ...(blockLength !== null && blockLength > thresholds.blockCeilingM
        ? { tone: "warn" as const }
        : {}),
      withheldNote: "Shape is not tracked for this match.",
    },
  ];


  /** A small drawing per chapter, all of it read off this match. */
  const chapterFigures = useMemo(() => {
    const step = momentum.length ? 100 / momentum.length : 100;
    return {
      score: (
        <svg viewBox="0 0 100 44" className="h-full w-full" aria-hidden="true">
          <line x1="0" y1="22" x2="100" y2="22" stroke="rgba(255,255,255,.35)" strokeWidth=".5" />
          {momentum.map((v, i) => {
            const h = Math.max(Math.abs(v) * 18, 0.8);
            return (
              <rect
                key={i}
                x={i * step + step * 0.2}
                y={v >= 0 ? 22 - h : 22}
                width={step * 0.6}
                height={h}
                fill={v >= 0 ? "var(--team-a)" : "var(--team-b)"}
              />
            );
          })}
        </svg>
      ),
      strength: (
        <svg viewBox="0 0 100 44" className="h-full w-full" aria-hidden="true">
          <rect x="18" y={44 - Math.max(shots, 1) * 4} width="24" height={Math.max(shots, 1) * 4} fill="var(--team-a)" />
          <rect x="58" y={44 - Math.max(otherShots, 1) * 4} width="24" height={Math.max(otherShots, 1) * 4} fill="var(--team-b)" opacity=".7" />
        </svg>
      ),
      player: (
        <span className="display-i text-[26px] leading-none text-white">
          {playerTalks[0] ? `#${playerTalks[0].shirtNumber}` : "—"}
        </span>
      ),
      improve: (
        <span className="display-i text-[22px] leading-none text-white">
          {model.top ? `${model.top.value}${model.top.unit === "%" ? "%" : ""}` : "—"}
        </span>
      ),
      verdict: (
        <svg viewBox="0 0 100 44" className="h-full w-full" aria-hidden="true">
          <circle cx="50" cy="22" r="13" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="2" />
          <path d="M43 22l5 5 9-10" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    };
  }, [momentum, shots, otherShots, playerTalks, model.top]);

  return (
    <div className="flex flex-col gap-4">
      <ChapterRail matchId={matchId} figures={chapterFigures} />

      <OneThingPoster
        kicker={`${model.top ? "The one thing" : "This match"} · ${match.teamA} ${match.scoreA}–${match.scoreB} ${match.teamB}`}
        headline={headline}
        body={sub}
        finding={model.top}
        matchId={matchId}
        momentum={momentum}
        momentumLine={`${possession === null ? "Possession withheld" : `${shown(possession, "%")} possession`} · ${shots} ${shots === 1 ? "shot" : "shots"} · ${lossEvents.length} balls lost`}
        chaptersLine={`${confirmed} of ${moments.length} moments confirmed`}
      />

      <MatchNumbersGrid cells={cells} matchId={matchId} />

      <FindingsList findings={findings} matchId={matchId} />

      {playerTalks.length > 0 && (
        <section
          className="rounded-[14px] border border-wire bg-surface p-5"
          aria-labelledby="players-to-talk-to"
        >
          <h2 id="players-to-talk-to" className="display text-[20px] text-text">
            Players to talk to
          </h2>
          <p className="mt-1 text-[11.5px] text-text-faint">
            Shirt numbers from the tracking file. Match them to your own team sheet.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {playerTalks.map((player) => (
              <PlayerChip key={`${player.team}-${player.shirtNumber}`} {...player} />
            ))}
          </div>
        </section>
      )}

      <span className="sr-only">
        {match.teamA} versus {match.teamB}. {findings.length} coaching findings.
      </span>
      <button
        type="button"
        className="sr-only"
        onClick={() => void navigate({ to: "/match/$matchId/stats", params: { matchId } })}
      >
        Open all match stats
      </button>
    </div>
  );
}
