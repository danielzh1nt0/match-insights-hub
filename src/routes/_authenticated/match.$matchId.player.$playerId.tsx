import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { MatchShell } from "@/components/ip/match-shell";
import { Card } from "@/components/ip/primitives";
import { HeatBlobs, Pitch, Visual } from "@/components/ip/visual";
import { useMatch } from "@/hooks/use-match";

export const Route = createFileRoute("/_authenticated/match/$matchId/player/$playerId")({
  head: () => ({
    meta: [
      { title: "Player page — Ipanema" },
      { name: "description", content: "One player's own numbers from this match, nothing else." },
      { property: "og:title", content: "Player page — Ipanema" },
      { property: "og:description", content: "Touches, passes, losses and where they played." },
    ],
  }),
  component: PlayerPage,
});

function PlayerPage() {
  const { matchId, playerId } = Route.useParams();
  const { match, data } = useMatch(matchId);
  const [scope, setScope] = useState<TeamScope>("a");
  const [period, setPeriod] = useState<Period>("full");
  const player = data?.players.find((p) => p.id === playerId);

  return (
    <MatchShell
      matchId={matchId}
      match={match}
      scope={scope}
      setScope={setScope}
      period={period}
      setPeriod={setPeriod}
    >
      {!player && data && (
        <Card>
          <p className="text-[13px] text-text-dim">That player wasn't in this match.</p>
        </Card>
      )}
      {player && data && (
        <>
          <Card className="flex items-center gap-4">
            <span className="num flex h-14 w-14 shrink-0 items-center justify-center rounded-[12px] bg-surface-3 text-[24px] text-cream">
              {player.shirt}
            </span>
            <div className="min-w-0">
              <h1 className="display truncate text-[22px] text-text">{player.name}</h1>
              <p className="text-[12px] text-text-faint">
                {player.position} · {player.minutes} {player.minutes === 1 ? "minute" : "minutes"} played
              </p>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Touches", value: `${player.touches}` },
              { label: "Passes", value: `${player.passes}` },
              { label: "Passes found a team-mate", value: `${player.passAccuracy}%` },
              { label: "Balls given away", value: `${player.losses}` },
              { label: "Balls won", value: `${player.regains}` },
              { label: "Distance covered", value: `${player.distanceKm} km` },
            ].map((s) => (
              <Card key={s.label} small className="flex flex-col gap-1">
                <span className="num text-[24px] leading-none text-cream">{s.value}</span>
                <span className="text-[11.5px] leading-snug text-text-faint">{s.label}</span>
              </Card>
            ))}
          </div>

          <Visual
            question="Where did this player play?"
            caption="Brighter areas are where they spent more time."
            info={{
              title: "Where did this player play?",
              rows: [
                { label: "What it counts", value: "Time in each area" },
                { label: "Player", value: `${player.shirt} ${player.name}`, cream: true },
                { label: "Minutes", value: `${player.minutes}` },
                { label: "Touches", value: `${player.touches}`, cream: true },
                { label: "Target", value: "No target" },
              ],
            }}
          >
            <Pitch arrowLabel={`${match?.teamA ?? "Team A"} attack →`}>
              <HeatBlobs points={data.heat.slice(2, 16)} color="var(--team-a)" />
            </Pitch>
          </Visual>
        </>
      )}
    </MatchShell>
  );
}
