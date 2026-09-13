import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { MatchShell } from "@/components/ip/match-shell";
import { Card, Chip } from "@/components/ip/primitives";
import { HeatBlobs, Pitch, PitchDots, PitchShirts, Visual } from "@/components/ip/visual";
import { useAnalysis } from "@/hooks/use-match";
import { formatClock } from "@/lib/sample-data";

export const Route = createFileRoute("/_authenticated/match/$matchId/territory")({
  head: () => ({
    meta: [
      { title: "Territory — Ipanema" },
      { name: "description", content: "Where the team lived, where it lost the ball and where it won it back." },
      { property: "og:title", content: "Territory — Ipanema" },
      { property: "og:description", content: "Heat maps, losses, recoveries and a shape replay." },
    ],
  }),
  component: Territory,
});

function Territory() {
  const { matchId } = Route.useParams();
  const [scope, setScope] = useState<TeamScope>("a");
  const [period, setPeriod] = useState<Period>("full");
  const { match, team, colours, territory, loading } = useAnalysis(matchId, scope);
  const [snapIndex, setSnapIndex] = useState(0);

  const teamName = team === "B" ? match?.teamB : team === "A" ? match?.teamA : "Both teams";
  const teamColour = team === "B" ? colours.B : colours.A;
  const snapshot = territory?.snapshots[Math.min(snapIndex, territory.snapshots.length - 1)];

  return (
    <MatchShell
      matchId={matchId}
      match={match}
      scope={scope}
      setScope={setScope}
      period={period}
      setPeriod={setPeriod}
    >
      {loading && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2" role="status" aria-label="Loading">
          <div className="h-full w-1/3 animate-[loadbar_1.1s_ease-in-out_infinite] rounded-full bg-cream" />
        </div>
      )}

      {territory && match && (
        <>
          <Visual
            question="Where did the team live?"
            caption="Brighter areas are where players spent more time."
            info={{
              title: "Where did the team live?",
              glossaryId: "heat-map",
              rows: [
                { label: "What it counts", value: "Player time per area" },
                { label: "Team", value: teamName ?? "Both teams", cream: true },
                { label: "Players tracked", value: `${territory.playerCount}` },
                { label: "Frames used", value: territory.frameCount.toLocaleString() },
                { label: "Height of the last line", value: `${territory.lineHeightM} m`, cream: true },
              ],
            }}
          >
            <Pitch arrowLabel={`${match.teamA} attack →`}>
              <HeatBlobs points={territory.heat} color={teamColour} />
            </Pitch>
            <p className="num mt-2 text-[11.5px] text-text-faint">
              n = {territory.playerCount} players · {territory.frameCount.toLocaleString()} frames
            </p>
          </Visual>

          <Card className="flex items-center justify-between gap-4">
            <div>
              <h2 className="display text-[17px] uppercase text-cream">How compact?</h2>
              <p className="mt-1 text-[11.5px] text-text-faint">
                Typical width side to side for {teamName}.
              </p>
            </div>
            <span className="num text-[30px] leading-none text-cream">
              {territory.compactBandM}
              <span className="text-[14px] text-cream-dim"> m</span>
            </span>
          </Card>

          <div className="grid gap-3 md:grid-cols-2">
            <Visual
              question="Where was the ball lost?"
              caption="Each dot is one giveaway, at the ball's position."
              info={{
                title: "Where was the ball lost?",
                glossaryId: "turnover",
                rows: [
                  { label: "What it counts", value: "Balls given away" },
                  { label: "Team", value: teamName ?? "Both teams", cream: true },
                  { label: "Total", value: `${territory.losses.length}`, cream: true },
                  { label: "Read it as", value: "Where possession broke down" },
                ],
              }}
            >
              <Pitch>
                <PitchDots points={territory.losses} color="var(--quality-bad)" />
              </Pitch>
              <p className="num mt-2 text-[11.5px] text-text-faint">
                {territory.losses.length} losses · {territory.recoveries.length} recoveries
              </p>
            </Visual>

            <Visual
              question="Where was the ball won back?"
              caption="Each dot is one ball recovered, at the ball's position."
              info={{
                title: "Where was the ball won back?",
                glossaryId: "high-turnover",
                rows: [
                  { label: "What it counts", value: "Balls recovered" },
                  { label: "Team", value: teamName ?? "Both teams", cream: true },
                  { label: "Total", value: `${territory.recoveries.length}`, cream: true },
                  { label: "Read it as", value: "Where pressure paid off" },
                ],
              }}
            >
              <Pitch>
                <PitchDots points={territory.recoveries} color="var(--quality-good)" />
              </Pitch>
              <p className="num mt-2 text-[11.5px] text-text-faint">
                {territory.recoveries.length} recoveries · {territory.losses.length} losses
              </p>
            </Visual>
          </div>

          <Visual
            question="How did the shape move?"
            caption="A snapshot of positions every thirty seconds."
            info={{
              title: "How did the shape move?",
              glossaryId: "shape-snapshot",
              rows: [
                { label: "What it shows", value: "Player positions" },
                { label: "Team", value: teamName ?? "Both teams", cream: true },
                { label: "Snapshots", value: `${territory.snapshots.length}` },
                { label: "Length back to front", value: `${snapshot?.lengthM ?? 0} m`, cream: true },
                { label: "Width side to side", value: `${snapshot?.widthM ?? 0} m` },
              ],
            }}
          >
            <Pitch arrowLabel={`${match.teamA} attack →`}>
              {snapshot && <PitchShirts players={snapshot.players} color={teamColour} />}
            </Pitch>
            <p className="num mt-2 text-[11.5px] text-text-faint">
              {snapshot?.players.length ?? 0} players on the pitch · {snapshot?.lengthM ?? 0} m long
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {territory.snapshots.map((s, i) => (
                <Chip key={s.t} active={i === snapIndex} onClick={() => setSnapIndex(i)}>
                  {formatClock(s.t)}
                </Chip>
              ))}
            </div>
          </Visual>
        </>
      )}
    </MatchShell>
  );
}
