import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { InsightsScreen } from "@/components/insights/InsightsScreen";
import { MatchShell } from "@/components/ip/match-shell";
import { useAnalysis } from "@/hooks/use-match";

export const Route = createFileRoute("/_authenticated/match/$matchId/insights")({
  head: () => ({
    meta: [
      { title: "Match insights — Ipanema" },
      { name: "description", content: "The match in three sentences, with findings you can train on Tuesday." },
      { property: "og:title", content: "Match insights — Ipanema" },
      { property: "og:description", content: "Findings, targets and the moments behind them." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Insights,
});

function Insights() {
  const { matchId } = Route.useParams();
  const [scope, setScope] = useState<TeamScope>("a");
  const [period, setPeriod] = useState<Period>("full");
  const { match, colours, findings, summary, loading, events, review, stats, team } = useAnalysis(matchId, scope);

  return (
    <MatchShell matchId={matchId} match={match} scope={scope} setScope={setScope} period={period} setPeriod={setPeriod}>
      {loading && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2" role="status" aria-label="Loading">
          <div className="h-full w-1/3 animate-[loadbar_1.1s_ease-in-out_infinite] rounded-full bg-cream" />
        </div>
      )}

      {match && (
        <>
          <InsightsScreen matchId={matchId} match={match} findings={findings} summary={summary} events={events} stats={stats} team={team} iconColour={scope === "b" ? colours.B : colours.A} onReview={(input) => review.setVerdict.mutate(input)} />
        </>
      )}
    </MatchShell>
  );
}