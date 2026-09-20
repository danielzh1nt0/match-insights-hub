import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { ClipList } from "@/components/ip/clip-list";
import { MatchShell } from "@/components/ip/match-shell";
import { Card } from "@/components/ip/primitives";
import { ShareButton } from "@/components/ip/share-button";
import { useMatch } from "@/hooks/use-match";
import { encodeShareToken } from "@/lib/share";

export const Route = createFileRoute("/_authenticated/match/$matchId/reel")({
  head: () => ({
    meta: [
      { title: "Clip reel — Ipanema" },
      { name: "description", content: "The handful of moments worth showing the team." },
      { property: "og:title", content: "Clip reel — Ipanema" },
      { property: "og:description", content: "Every clip comes from a finding, with the reason for each." },
       { property: "og:type", content: "website" },
       { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Reel,
});

function Reel() {
  const { matchId } = Route.useParams();
  const { match, data } = useMatch(matchId);
  const [scope, setScope] = useState<TeamScope>("both");
  const [period, setPeriod] = useState<Period>("full");

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
      {data && match && (
        <>
          <div>
            <h1 className="display text-[22px] uppercase text-text">Clip reel</h1>
            <p className="mt-1 text-[12.5px] text-text-dim">
              {data.clips.length} moments, in order, each one taken from a finding.
            </p>
          </div>
          <ClipList clips={data.clips} matchId={matchId} />
          <Card className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-[12.5px] leading-relaxed text-text-dim">
              Share the reel with your staff or the squad. No account needed to open it.
            </p>
            <ShareButton
              path={`/s/reel/${encodeShareToken({
                m: match.id,
                d: match.durationS,
                a: match.teamA,
                b: match.teamB,
                sa: match.scoreA,
                sb: match.scoreB,
              })}`}
              what="this reel"
            />
          </Card>
        </>
      )}
    </MatchShell>
  );
}
