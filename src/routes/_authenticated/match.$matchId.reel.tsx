import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { ClipList } from "@/components/ip/clip-list";
import { MatchShell } from "@/components/ip/match-shell";
import { useAnalysis } from "@/hooks/use-match";
import { buildClips } from "@/lib/clips";

export const Route = createFileRoute("/_authenticated/match/$matchId/reel")({
  head: () => ({
    meta: [
      { title: "Clip reel — Ipanema" },
      { name: "description", content: "The handful of moments worth showing the team." },
      { property: "og:title", content: "Clip reel — Ipanema" },
      { property: "og:description", content: "Every clip comes from a tracked moment, with the reason for each." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Reel,
});

function Reel() {
  const { matchId } = Route.useParams();
  const { match, events, team } = useAnalysis(matchId, "a");
  const [scope, setScope] = useState<TeamScope>("both");
  const [period, setPeriod] = useState<Period>("full");

  const clips = useMemo(() => buildClips(events, team ?? "A"), [events, team]);
  const confirmed = clips.filter((clip) => clip.confirmed).length;

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
      {match && (
        <>
          <div>
            <h1 className="display text-[22px] uppercase text-text">Clip reel</h1>
            <p className="mt-1 text-[12.5px] text-text-dim">
              {clips.length === 0
                ? "No tracked moments in this match qualify for the reel yet."
                : `${clips.length} tracked ${clips.length === 1 ? "moment" : "moments"}, in match order${confirmed > 0 ? ` · ${confirmed} confirmed by you` : ""}.`}
            </p>
          </div>
          <ClipList clips={clips} matchId={matchId} />
        </>
      )}
    </MatchShell>
  );
}
