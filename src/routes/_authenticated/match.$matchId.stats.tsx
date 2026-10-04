import { cn } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { MatchShell } from "@/components/ip/match-shell";
import { Chip } from "@/components/ip/primitives";
import { NotVerifiedYet, StatsVisuals } from "@/components/ip/stats-visuals";
import { ScopeChips } from "@/components/ip/scope-chips";
import { HeadToHeadBand } from "@/components/ip/head-to-head-band";
import type { StatsTeamIdentity } from "@/components/ip/stats-team-selector";
import { useAnalysis } from "@/hooks/use-match";
import { crestForTeam } from "@/lib/team-crests";
import { shortTeamCode } from "@/components/team/TeamToken";

export const Route = createFileRoute("/_authenticated/match/$matchId/stats")({
  head: () => ({
    meta: [
      { title: "Match stats — Ipanema" },
      {
        name: "description",
        content: "Ball, pressing, shape, shooting, players and passes in plain numbers.",
      },
      { property: "og:title", content: "Match stats — Ipanema" },
      { property: "og:description", content: "Every number next to the target you set." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Stats,
});

function Stats() {
  const { matchId } = Route.useParams();
  const [scope, setScope] = useState<TeamScope>("a");
  const [period, setPeriod] = useState<Period>("full");
  const {
    match,
    row,
    team,
    colours,
    thresholds,
    sections,
    players,
    loading,
    events,
    stats,
    file,
    lineDefending,
    territory,
  } = useAnalysis(matchId, scope);
  // Ball opens with possession, which is the least actionable number in the
  // product. Pressing is where the findings come from, so it leads.
  const [tab, setTab] = useState("pressing");

  const active = sections.find((t) => t.key === tab);

  const crestA = match ? crestForTeam(match.teamA) : undefined;
  const crestB = match ? crestForTeam(match.teamB) : undefined;
  const teamA: StatsTeamIdentity | null = match
    ? {
        name: match.teamA,
        shortCode: shortTeamCode(match.teamA),
        kitColour: colours.A,
        ...(crestA ? { crestUrl: crestA } : {}),
      }
    : null;
  const teamB: StatsTeamIdentity | null = match
    ? {
        name: match.teamB,
        shortCode: shortTeamCode(match.teamB),
        kitColour: colours.B,
        ...(crestB ? { crestUrl: crestB } : {}),
      }
    : null;

  const grade = row?.summary?.["ball_grade"] as
    { possession_ok?: boolean; events_ok?: boolean } | undefined;
  // Absent means an older file we never graded, which stays allowed. Only an
  // explicit false withholds anything.
  const possessionOk = grade?.possession_ok !== false;

  /** Tabs that rest on the ball being tracked well enough to believe. */
  const NEEDS_BALL = new Set(["ball", "pressing", "passes", "setpieces"]);
  /** Rows inside the surviving tabs that rest on the same thing. */
  const NEEDS_BALL_ROW = /possession|loss|lost|turnover|pass|tilt|third|press|set piece|sequence/i;

  // The tabs stay on screen either way. Removing four of them made the app
  // look broken rather than careful — you could not tell whether pressing had
  // been dropped from the product or was simply not ready for this match.
  const shownSections = sections.map((section) => ({
    ...section,
    locked: !possessionOk && NEEDS_BALL.has(section.key),
    rows: possessionOk ? section.rows : section.rows.filter((r) => !NEEDS_BALL_ROW.test(r.label)),
  }));
  const shownActive = shownSections.find((s) => s.key === tab) ?? shownSections[0];
  const locked = Boolean(shownActive?.locked);

  return (
    <MatchShell
      matchId={matchId}
      match={match}
      scope={scope}
      setScope={setScope}
      period={period}
      setPeriod={setPeriod}
      showSelectors={false}
    >
      {loading && (
        <div
          className="h-[3px] w-full overflow-hidden bg-surface-2"
          role="status"
          aria-label="Loading"
        >
          <div className="h-full w-1/3 animate-[loadbar_1.1s_ease-in-out_infinite] bg-cream" />
        </div>
      )}

      {match && active && (
        <>
          <div
            className="tab-rail -mx-4 px-4 pb-1 md:mx-0 md:px-0"
            role="tablist"
            aria-label="Stat groups"
          >
            {shownSections.map((t) => (
              <Chip
                key={t.key}
                active={tab === t.key}
                onClick={() => setTab(t.key)}
                className={cn(t.locked && tab !== t.key && "opacity-45")}
                title={t.locked ? "Still being verified for this match" : undefined}
              >
                {t.label}
                {t.locked && (
                  <span className="label-xs text-text-faint" aria-label="not verified yet">
                    ·
                  </span>
                )}
              </Chip>
            ))}
          </div>

          {teamA && teamB && (
            <ScopeChips
              scope={scope}
              onScope={setScope}
              period={period}
              onPeriod={setPeriod}
              teamA={teamA}
              teamB={teamB}
              halves={file?.periods?.length}
            />
          )}

          {locked ? (
            <NotVerifiedYet
              what={`${shownActive?.label} is still being verified for this match — the ball was not tracked well enough here to stand behind these numbers, so they are not shown. Score, shots, shape and the tracked players on the video are unaffected.`}
            />
          ) : (
            <p className="text-[12px] text-text-faint">{shownActive?.caption}</p>
          )}

          {!locked && teamA && teamB && shownActive && shownActive.rows.length > 0 && (
            <HeadToHeadBand
              rows={shownActive.rows}
              teamA={teamA}
              teamB={teamB}
              title={shownActive.label}
            />
          )}

          {!locked && teamA && teamB && (
            <StatsVisuals
              tab={shownActive?.key ?? "shooting"}
              players={players}
              stats={stats}
              file={file}
              events={events}
              team={team ?? "A"}
              scopeBoth={team === null}
              colours={colours}
              thresholds={thresholds}
              matchId={matchId}
              period={period}
              territory={territory}
              lineDefending={lineDefending}
              teamA={teamA}
              teamB={teamB}
              ballGrade={grade ?? null}
            />
          )}
        </>
      )}
    </MatchShell>
  );
}
