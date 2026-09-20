import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { MatchShell } from "@/components/ip/match-shell";
import { Chip } from "@/components/ip/primitives";
import { StatsVisuals } from "@/components/ip/stats-visuals";
import { useAnalysis } from "@/hooks/use-match";

export const Route = createFileRoute("/_authenticated/match/$matchId/stats")({
  head: () => ({
    meta: [
      { title: "Match stats — Ipanema" },
      { name: "description", content: "Ball, pressing, shape, shooting, players and passes in plain numbers." },
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
  const [scope, setScope] = useState<TeamScope>("both");
  const [period, setPeriod] = useState<Period>("full");
  const { match, team, colours, sections, players, loading, events, stats, file, lineDefending, territory } = useAnalysis(
    matchId,
    scope,
  );
  const [tab, setTab] = useState("ball");

  const active = sections.find((t) => t.key === tab);

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

      {match && active && (
        <>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
            {sections.map((t) => (
              <Chip key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
                {t.label}
              </Chip>
            ))}
          </div>

          <StatsVisuals tab={active.key} players={players} stats={stats} file={file} events={events} team={team ?? "A"} scopeBoth={team === null} colours={colours} matchId={matchId} period={period} territory={territory} lineDefending={lineDefending} />
        </>
      )}
    </MatchShell>
  );
}
