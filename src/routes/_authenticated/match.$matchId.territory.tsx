import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type CSSProperties } from "react";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { MatchShell } from "@/components/ip/match-shell";
import { Chip } from "@/components/ip/primitives";
import { ScopeChips } from "@/components/ip/scope-chips";
import { PhasePicker } from "@/components/phases/PhasePicker";
import { PhasePitch, type PhaseView } from "@/components/phases/PhasePitch";
import { Panel, PhaseMoments, PhaseNumbers, PhaseRibbon } from "@/components/phases/PhasePanels";
import { useAnalysis } from "@/hooks/use-match";
import { attacksRight } from "@/lib/match-analysis";
import { buildPhases, type PhaseKey } from "@/lib/phases";
import { setPitchContext } from "@/lib/pitch-coords";
import { teamIdentities } from "@/lib/team-identity";

export const Route = createFileRoute("/_authenticated/match/$matchId/territory")({
  head: () => ({
    meta: [
      { title: "Phases — Ipanema" },
      {
        name: "description",
        content: "The four moments of the game: our shape, where it happened and the numbers.",
      },
      { property: "og:title", content: "Phases — Ipanema" },
      {
        property: "og:description",
        content: "In possession, losing it, out of possession, winning it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PhasesScreen,
});

function PhasesScreen() {
  const { matchId } = Route.useParams();
  const navigate = Route.useNavigate();
  const [scope, setScope] = useState<TeamScope>("a");
  const [period, setPeriod] = useState<Period>("full");
  const [phaseKey, setPhaseKey] = useState<PhaseKey>("defend");
  const [view, setView] = useState<PhaseView>("shape");

  const { match, row, label, file, team, colours, thresholds, events, stats, loading } =
    useAnalysis(matchId, scope);
  const chosenTeam = team ?? "A";
  const duration = row?.duration_s ?? match?.durationS ?? 1;
  const from = period === "2nd" ? duration / 2 : 0;
  const to = period === "1st" ? duration / 2 : duration;

  setPitchContext(file);

  const inPeriod = useMemo(
    () => events.filter((event) => event.t >= from && event.t <= to),
    [events, from, to],
  );
  const phases = useMemo(
    () => buildPhases({ stats, events: inPeriod, team: chosenTeam, thresholds }),
    [stats, inPeriod, chosenTeam, thresholds],
  );
  const phase = phases.find((candidate) => candidate.key === phaseKey) ?? phases[0]!;

  const frames = useMemo(() => {
    const all = (file?.frames ?? []).filter((frame) => frame.t >= from && frame.t <= to);
    return all.filter((frame) =>
      phase.wantsBall ? frame.possession === chosenTeam : frame.possession !== chosenTeam,
    );
  }, [file?.frames, from, to, phase.wantsBall, chosenTeam]);

  const phaseEvents = useMemo(
    () =>
      inPeriod.filter(
        (event) => event.team === chosenTeam && phase.eventTypes.includes(event.type),
      ),
    [inPeriod, chosenTeam, phase.eventTypes],
  );

  const identities = match ? teamIdentities(match, colours) : null;
  const attackRight =
    attacksRight(row?.attack_right, label?.attack_right_override, chosenTeam) ===
    (period !== "2nd");
  const teamName = chosenTeam === "B" ? match?.teamB : match?.teamA;
  const screenVars = { "--team-a": colours.A, "--team-b": colours.B } as CSSProperties;
  const watch = (t: number) =>
    void navigate({ to: "/match/$matchId/match", params: { matchId }, search: { t } });

  return (
    <MatchShell
      matchId={matchId}
      match={match}
      scope={scope}
      setScope={(next) => setScope(next === "both" ? "a" : next)}
      period={period}
      setPeriod={setPeriod}
      showSelectors={false}
    >
      <div style={screenVars} className="flex flex-col gap-3 pb-24">
        {loading && (
          <div
            className="h-[3px] w-full overflow-hidden bg-surface-2"
            role="status"
            aria-label="Loading phases"
          >
            <div className="h-full w-1/3 animate-[loadbar_1.1s_ease-in-out_infinite] bg-cream" />
          </div>
        )}

        {match && (
          <>
            <div>
              <h1 className="display-i text-[clamp(26px,6vw,34px)] uppercase leading-none text-cream">
                Phases
              </h1>
              <p className="mt-2 max-w-[62ch] text-[13px] leading-normal text-text-dim">
                The four moments of the game. Pick one to see how we played it: our shape, where it
                happened, the numbers and the best and worst example.
              </p>
            </div>

            {identities && (
              <ScopeChips
                scope={scope}
                onScope={(next) => setScope(next === "both" ? "a" : next)}
                period={period}
                onPeriod={setPeriod}
                teamA={identities.A}
                teamB={identities.B}
                allowBoth={false}
              />
            )}

            <PhasePicker phases={phases} active={phase.key} onPick={setPhaseKey} />

            <div className="grid items-start gap-3 min-[1100px]:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <Panel
                title={
                  view === "shape"
                    ? "Average shape"
                    : view === "zones"
                      ? "Where it happened"
                      : "Where we spent the time"
                }
                question={
                  view === "shape"
                    ? `Average positions ${phase.name.toLowerCase()}, from the tracked frames.`
                    : view === "zones"
                      ? `Share of ${phase.name.toLowerCase()} moments in each zone.`
                      : `Every tracked position ${phase.name.toLowerCase()}, darker where we were more often.`
                }
                right={
                  <div className="flex shrink-0 gap-2" role="group" aria-label="Pitch view">
                    <Chip active={view === "shape"} onClick={() => setView("shape")}>
                      Shape
                    </Chip>
                    <Chip active={view === "zones"} onClick={() => setView("zones")}>
                      Zones
                    </Chip>
                    <Chip active={view === "heat"} onClick={() => setView("heat")}>
                      Heat
                    </Chip>
                  </div>
                }
                note={
                  view === "zones"
                    ? `${phaseEvents.length} moments of this phase`
                    : `${frames.length} tracked frames of this phase`
                }
              >
                <PhasePitch
                  view={view}
                  frames={frames}
                  events={phaseEvents}
                  team={chosenTeam}
                  colour={chosenTeam === "B" ? colours.B : colours.A}
                  attackLabel={`${teamName ?? "Team"} attack ${attackRight ? "right" : "left"}`}
                  length={Math.max(file?.pitch?.length ?? 105, 1)}
                  width={Math.max(file?.pitch?.width ?? 68, 1)}
                  file={file}
                />
              </Panel>

              <Panel title="The numbers" question={`${phase.name}, ${teamName ?? "this team"}.`}>
                <PhaseNumbers
                  numbers={phase.numbers}
                  phaseName={phase.name}
                  onWatch={phase.worst ? () => watch(phase.worst!.t) : null}
                />
              </Panel>
            </div>

            <Panel
              title="Over the match"
              question={
                phase.series
                  ? `${phase.series.label}, through the match. Red is outside your target.`
                  : undefined
              }
            >
              {phase.series ? (
                <PhaseRibbon series={phase.series} duration={duration} />
              ) : (
                <p className="text-[12.5px] text-text-faint">
                  This match file holds nothing to plot for {phase.name.toLowerCase()} over time.
                </p>
              )}
            </Panel>

            <Panel title="Best and worst moment" question="Tap one to watch it on the Match page.">
              <PhaseMoments phase={phase} onWatch={watch} />
            </Panel>
          </>
        )}
      </div>
    </MatchShell>
  );
}
