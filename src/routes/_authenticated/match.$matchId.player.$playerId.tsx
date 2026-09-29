import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { MatchShell } from "@/components/ip/match-shell";
import { PlayerReport } from "@/components/ip/player-report";
import { Card } from "@/components/ip/primitives";
import { useAnalysis } from "@/hooks/use-match";

export const Route = createFileRoute("/_authenticated/match/$matchId/player/$playerId")({
  head: () => ({
    meta: [
      { title: "Player page — Ipanema" },
      { name: "description", content: "One player's own numbers from this match, nothing else." },
      { property: "og:title", content: "Player page — Ipanema" },
      { property: "og:description", content: "Touches, passes, losses and the moments behind them." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlayerPage,
});

function PlayerPage() {
  const { matchId, playerId } = Route.useParams();
  const { match, players, events, loading } = useAnalysis(matchId, "a");
  const [scope, setScope] = useState<TeamScope>("a");
  const [period, setPeriod] = useState<Period>("full");

  const shirt = Number(playerId);
  const player = players.find((row) => row.id === shirt);

  return (
    <MatchShell
      matchId={matchId}
      match={match}
      scope={scope}
      setScope={setScope}
      period={period}
      setPeriod={setPeriod}
    >
      {!loading && !player && (
        <Card>
          <p className="text-[13px] text-text-dim">
            {players.length === 0
              ? "This match file has no per-player rows, so there are no player pages for it yet."
              : `Shirt ${playerId} is not in this match file.`}
          </p>
        </Card>
      )}
      {player && match && <PlayerReport player={player} events={events} matchId={matchId} />}
    </MatchShell>
  );
}
