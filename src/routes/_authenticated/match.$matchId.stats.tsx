import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { MatchShell } from "@/components/ip/match-shell";
import { Chip } from "@/components/ip/primitives";
import { StatsVisuals } from "@/components/ip/stats-visuals";
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
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0"
            role="tablist"
            aria-label="Stat groups"
          >
            {sections.map((t) => (
              <Chip key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
                {t.label}
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
            />
          )}

          <p className="text-[12px] text-text-faint">{active.caption}</p>

          {teamA && teamB && active.rows.length > 0 && (
            <HeadToHeadBand rows={active.rows} teamA={teamA} teamB={teamB} title={active.label} />
          )}

          {teamA && teamB && (
            <StatsVisuals
              tab={active.key}
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
              ballGrade={
                (row?.summary?.["ball_grade"] as
                  { possession_ok?: boolean; events_ok?: boolean } | undefined) ?? null
              }
            />
          )}
        </>
      )}
    </MatchShell>
  );
}
