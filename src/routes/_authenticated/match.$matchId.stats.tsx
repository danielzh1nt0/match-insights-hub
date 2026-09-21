import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { MatchShell } from "@/components/ip/match-shell";
import { Chip } from "@/components/ip/primitives";
import { StatsVisuals } from "@/components/ip/stats-visuals";
import { StatsTeamSelector, type StatsTeamIdentity } from "@/components/ip/stats-team-selector";
import { useAnalysis } from "@/hooks/use-match";
import { crestForTeam } from "@/lib/team-crests";

function shortCode(name: string) {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter(Boolean);
  if (words.length <= 1) return (words[0] ?? name).slice(0, 3).toUpperCase();
  return words.map((word) => word[0]).join("").slice(0, 3).toUpperCase();
}

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
  const [scope, setScope] = useState<TeamScope>("a");
  const [period, setPeriod] = useState<Period>("full");
  const { match, team, colours, thresholds, sections, players, loading, events, stats, file, lineDefending, territory } = useAnalysis(
    matchId,
    scope,
  );
  const [tab, setTab] = useState("ball");

  const active = sections.find((t) => t.key === tab);
  const teamA: StatsTeamIdentity | null = match ? { name: match.teamA, code: shortCode(match.teamA), colour: colours.A, ...(crestForTeam(match.teamA) ? { crest: crestForTeam(match.teamA) } : {}) } : null;
  const teamB: StatsTeamIdentity | null = match ? { name: match.teamB, code: shortCode(match.teamB), colour: colours.B, ...(crestForTeam(match.teamB) ? { crest: crestForTeam(match.teamB) } : {}) } : null;

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
      {loading && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2" role="status" aria-label="Loading">
          <div className="h-full w-1/3 animate-[loadbar_1.1s_ease-in-out_infinite] rounded-full bg-cream" />
        </div>
      )}

      {match && active && (
        <>
          {teamA && teamB && <div className="grid gap-2 md:grid-cols-[minmax(360px,1fr)_minmax(260px,.55fr)]"><StatsTeamSelector value={scope} onChange={setScope} teamA={teamA} teamB={teamB} /><div className="hidden md:block" /></div>}
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
            {sections.map((t) => (
              <Chip key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
                {t.label}
              </Chip>
            ))}
          </div>

          {teamA && teamB && <StatsVisuals tab={active.key} players={players} stats={stats} file={file} events={events} team={team ?? "A"} scopeBoth={team === null} colours={colours} thresholds={thresholds} matchId={matchId} period={period} territory={territory} lineDefending={lineDefending} teamA={teamA} teamB={teamB} />}
          {import.meta.env.DEV && <section className="border border-dashed border-wire bg-surface px-4 py-4" aria-label="Stats screen anatomy reference"><p className="section-kicker">Team reference</p><h2 className="display mt-2 text-[17px] text-cream">Stats screen anatomy</h2><ol className="mt-3 grid gap-2 text-[12px] text-text-dim sm:grid-cols-3"><li>1. Team pill</li><li>2. Chart title</li><li>3. Subtitle</li><li>4. Visual</li><li>5. Comparison row</li><li>6. Honesty marker</li></ol></section>}
        </>
      )}
    </MatchShell>
  );
}
