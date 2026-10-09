import { MatchTimelineCard } from "@/components/ip/match-timeline";
import { buildTimeline } from "@/lib/timeline";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { MatchShell } from "@/components/ip/match-shell";
import { Chip } from "@/components/ip/primitives";
import { StatsVisuals } from "@/components/ip/stats-visuals";
import { ScopeChips } from "@/components/ip/scope-chips";
import { HeadToHeadBand } from "@/components/ip/head-to-head-band";
import type { StatsTeamIdentity } from "@/components/ip/stats-team-selector";
import { useAnalysis } from "@/hooks/use-match";
import { TeamKpiCard } from "@/components/ip/team-kpi";
import { MatchSetupSheet } from "@/components/ip/match-setup-sheet";
import { buildKpi, kpiTargetsFrom } from "@/lib/kpi";
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
  const [targetsOpen, setTargetsOpen] = useState(false);
  const {
    match,
    item,
    label,
    row,
    team,
    colours,
    thresholds,
    sections,
    players,
    loading,
    framesLoading,
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

  // One timeline for both the story and the KPI card, so the possession the
  // scorecard grades is the possession the chart draws.
  const timeline = useMemo(
    () => buildTimeline({ stats, file, team: team ?? "A" }),
    [stats, file, team],
  );
  const kpi = useMemo(
    () =>
      buildKpi({
        stats,
        file,
        team: team ?? "A",
        timeline,
        targets: kpiTargetsFrom(label?.thresholds),
      }),
    [stats, file, team, timeline, label],
  );

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

  // Daniel, 4 Oct: don't hide stuff. Every tab and every card shows for every
  // match, with the Beta label on the match carrying the caveat. The data team
  // is fixing the numbers at source and the app picks up new files on its own.
  const shownSections = sections;
  const shownActive = shownSections.find((s) => s.key === tab) ?? shownSections[0];

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
          {teamA && teamB && (
            <TeamKpiCard
              kpi={kpi}
              teamName={(team === "B" ? teamB : teamA).name}
              onEditTargets={item ? () => setTargetsOpen(true) : undefined}
            />
          )}

          {teamA && teamB && (
            <MatchTimelineCard
              timeline={timeline}
              teamA={teamA}
              teamB={teamB}
              matchId={matchId}
              ours={team ?? "A"}
            />
          )}

          <div
            className="tab-rail -mx-4 px-4 pb-1 md:mx-0 md:px-0"
            role="tablist"
            aria-label="Stat groups"
          >
            {shownSections.map((t) => (
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
              halves={file?.periods?.length}
            />
          )}

          <p className="text-[12px] text-text-faint">{shownActive?.caption}</p>

          {teamA && teamB && shownActive && shownActive.rows.length > 0 && (
            <HeadToHeadBand
              rows={shownActive.rows}
              teamA={teamA}
              teamB={teamB}
              title={shownActive.label}
            />
          )}

          {teamA && teamB && (
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
              ballGrade={null}
              framesLoading={framesLoading}
            />
          )}
        </>
      )}

      {item && (
        <MatchSetupSheet item={item} open={targetsOpen} onClose={() => setTargetsOpen(false)} />
      )}
    </MatchShell>
  );
}
