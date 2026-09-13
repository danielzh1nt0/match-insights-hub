import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { DrillCard } from "@/components/ip/drill-card";
import { MatchShell } from "@/components/ip/match-shell";
import { PrimaryButton } from "@/components/ip/primitives";
import { useMatch } from "@/hooks/use-match";
import { buildSessionPlan } from "@/lib/session-plan";

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
  const playerCount = data?.players.length;
  const drills = useMemo(
    () => (finding ? buildSessionPlan(finding, playerCount, seed) : []),
    [finding, playerCount, seed],
  );

  const metric = finding
    ? `${finding.value}${finding.unit === "%" ? "%" : ` ${finding.unit}`}`
    : "—";
  const target = finding
    ? `${finding.target}${finding.unit === "%" ? "%" : ` ${finding.unit}`}`
    : "—";

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
          <section className="border-b border-wire-2 px-1 pb-4 pt-1">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-text-faint">
              Session built from
            </span>
            <h1 className="display-i mt-1 max-w-[900px] text-[22px] leading-tight text-cream">{finding.headline}</h1>
            <p className="mt-2 text-[12px] text-text-dim">
              Your number {metric} · target {target} · {finding.events} moments
            </p>
          </section>

          {drills.map((drill) => (
            <DrillCard key={`${drill.id}-${seed}`} drill={drill} />
          ))}

          <PrimaryButton block className="min-h-12" onClick={() => setSeed((s) => s + 1)}>
            <RotateCcw size={15} aria-hidden="true" /> Regenerate session
          </PrimaryButton>
        </>
      )}
    </MatchShell>
  );
}
