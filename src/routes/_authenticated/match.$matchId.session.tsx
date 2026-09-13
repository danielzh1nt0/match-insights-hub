import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { MatchShell } from "@/components/ip/match-shell";
import { Card, SecondaryButton } from "@/components/ip/primitives";
import { useMatch } from "@/hooks/use-match";

export const Route = createFileRoute("/_authenticated/match/$matchId/session")({
  validateSearch: (search: Record<string, unknown>): { finding?: string } =>
    typeof search["finding"] === "string" ? { finding: search["finding"] } : {},
  head: () => ({
    meta: [
      { title: "Tuesday's session — Ipanema" },
      { name: "description", content: "A session plan built from the finding, ready to print." },
      { property: "og:title", content: "Tuesday's session — Ipanema" },
      { property: "og:description", content: "Warm-up, main exercise, game and what to look for." },
    ],
  }),
  component: Session,
});

function Session() {
  const { matchId } = Route.useParams();
  const { finding: findingId } = Route.useSearch();
  const { match, data } = useMatch(matchId);
  const [scope, setScope] = useState<TeamScope>("a");
  const [period, setPeriod] = useState<Period>("full");
  const [seed, setSeed] = useState(0);

  const finding = data?.findings.find((f) => f.id === findingId) ?? data?.findings[0];

  const blocks = [
    {
      title: "Warm-up · 12 minutes",
      body: "Passing in fours with one player closing down. The moment the pass is played, the presser steps to the next receiver, so everyone feels the two-second clock.",
    },
    {
      title: "Main exercise · 20 minutes",
      body: "Six against six in the middle third with two small goals. Every time a team loses the ball, they have five seconds to win it back before play restarts with the other team.",
    },
    {
      title: "Game · 20 minutes",
      body: "Nine against nine, normal rules, one condition: pressure inside two seconds after a loss earns a free restart in the opponent half.",
    },
    {
      title: "What to look for",
      body: "The nearest player stepping in rather than dropping off, and the two players behind him sliding across so the middle stays closed.",
    },
  ];

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
      {finding && (
        <>
          <Card className="bg-surface-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-faint">
              Session built from
            </span>
            <h1 className="display mt-1 text-[20px] leading-tight text-cream">{finding.headline}</h1>
            <p className="mt-2 text-[12.5px] text-text-dim">
              Your number {finding.value}
              {finding.unit === "%" ? "%" : ` ${finding.unit}`} · target {finding.target}
              {finding.unit === "%" ? "%" : ` ${finding.unit}`} · {finding.events} moments
            </p>
          </Card>

          {blocks.map((b) => (
            <Card key={b.title}>
              <h2 className="display text-[17px] uppercase text-text">{b.title}</h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-text-dim">
                {b.body}
                {seed > 0 && " Keep the pitch narrow so the distances stay short."}
              </p>
            </Card>
          ))}

          <SecondaryButton className="h-12" onClick={() => setSeed((s) => s + 1)}>
            <RotateCcw size={15} aria-hidden="true" /> Regenerate session
          </SecondaryButton>
        </>
      )}
    </MatchShell>
  );
}
