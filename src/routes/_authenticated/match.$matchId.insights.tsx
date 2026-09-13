import { createFileRoute } from "@tanstack/react-router";
import { AppHeader, FloatingNav, MatchBar, PeriodSelector, Screen, TeamSelector } from "@/components/ip/chrome";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { Card } from "@/components/ip/primitives";
import { useState } from "react";
import { formatClock } from "@/lib/sample-data";
import { useApp } from "@/store/app-store";

export const Route = createFileRoute("/_authenticated/match/$matchId/insights")({
  head: () => ({
    meta: [
      { title: "Match insights — Ipanema" },
      { name: "description", content: "The match in three sentences, with findings you can train on Tuesday." },
      { property: "og:title", content: "Match insights — Ipanema" },
      { property: "og:description", content: "Findings, targets and the moments behind them." },
    ],
  }),
  component: Insights,
});

function Insights() {
  const { matchId } = Route.useParams();
  const match = useApp((s) => s.matches.find((m) => m.id === matchId));
  const [scope, setScope] = useState<TeamScope>("both");
  const [period, setPeriod] = useState<Period>("full");

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader backTo="/library" />
      <Screen withNav className="pt-4">
        {match ? (
          <>
            <MatchBar
              teamA={match.teamA}
              teamB={match.teamB}
              scoreA={match.scoreA}
              scoreB={match.scoreB}
              periodLine={`1st half · ${match.teamA.split(" ").at(-1)} attack →  ·  ${formatClock(match.durationS)}`}
            />
            <div className="mt-3 flex flex-col gap-2 md:flex-row">
              <TeamSelector value={scope} onChange={setScope} teamA={match.teamA} teamB={match.teamB} />
              <PeriodSelector value={period} onChange={setPeriod} periods={1} />
            </div>
          </>
        ) : (
          <p className="text-[13px] text-text-dim">That match isn't in your library.</p>
        )}

        <Card className="mt-4">
          <h1 className="display text-[19px] text-cream">Insights arrive in phase 2</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-text-dim">
            The pitch maps, possession ribbon, three-sentence summary and findings are the next phase of the
            build. The match bar, team selector and bottom navigation above are already in place.
          </p>
        </Card>
      </Screen>
      <FloatingNav matchId={matchId} />
    </div>
  );
}
