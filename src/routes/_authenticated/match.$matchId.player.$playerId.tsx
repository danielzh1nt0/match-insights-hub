import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { MatchShell } from "@/components/ip/match-shell";
import { PlayerReport } from "@/components/ip/player-report";
import { Card } from "@/components/ip/primitives";
import { ShareButton } from "@/components/ip/share-button";
import { useMatch } from "@/hooks/use-match";
import { encodeShareToken } from "@/lib/share";

export const Route = createFileRoute("/_authenticated/match/$matchId/player/$playerId")({
  head: () => ({
    meta: [
      { title: "Player page — Ipanema" },
      { name: "description", content: "One player's own numbers from this match, nothing else." },
      { property: "og:title", content: "Player page — Ipanema" },
      { property: "og:description", content: "Touches, passes, losses and where they played." },
       { property: "og:type", content: "website" },
       { name: "twitter:card", content: "summary_large_image" },
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
      {player && data && match && (
        <>
          <PlayerReport player={player} events={data.events} teamA={match.teamA} matchId={matchId} />
          <Card className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-[12.5px] leading-relaxed text-text-dim">
              Send this page to the player or their parents. They see these numbers only — nobody else's.
            </p>
            <ShareButton
              path={`/s/player/${encodeShareToken({
                m: match.id,
                d: match.durationS,
                a: match.teamA,
                b: match.teamB,
                sa: match.scoreA,
                sb: match.scoreB,
                p: player.id,
              })}`}
              what={`${player.name}'s numbers`}
            />
          </Card>
        </>
      )}
    </MatchShell>
  );
}
