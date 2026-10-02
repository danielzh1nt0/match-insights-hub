import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Printer, RotateCcw } from "lucide-react";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { DrillCard } from "@/components/ip/drill-card";
import { MatchShell } from "@/components/ip/match-shell";
import { GhostButton, PrimaryButton } from "@/components/ip/primitives";
import { useAnalysis } from "@/hooks/use-match";
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
       { property: "og:type", content: "website" },
       { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Session,
});

function Session() {
  const { matchId } = Route.useParams();
  const { finding: findingId } = Route.useSearch();
  const [scope, setScope] = useState<TeamScope>("a");
  const [period, setPeriod] = useState<Period>("full");
  const [seed, setSeed] = useState(0);
  const { match, findings, players } = useAnalysis(matchId, scope);

  const finding = findings.find((f) => f.id === findingId) ?? findings[0];
  const playerCount = players.length || undefined;
  const drills = useMemo(
    () => (finding ? buildSessionPlan(finding, playerCount, seed) : []),
    [finding, playerCount, seed],
  );

  /** Durations read "12 minutes"; the coach needs the total before Tuesday. */
  const minutesOf = (duration: string) => {
    const found = /\d+/.exec(duration);
    return found ? Number(found[0]) : 0;
  };
  const totalMinutes = drills.reduce((sum, drill) => sum + minutesOf(drill.duration), 0);

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
        <div className="session-sheet">
          <section className="border-b border-wire-2 px-1 pb-4 pt-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-text-faint">
                  Session built from
                </span>
                <h1 className="display-i mt-1 max-w-[900px] text-[22px] leading-tight text-cream">{finding.headline}</h1>
                <p className="mt-2 text-[12px] text-text-dim">
                  Your number {metric} · target {target} · {finding.events} moments
                </p>
              </div>
              <div className="flex shrink-0 gap-2 print:hidden">
                <GhostButton className="h-11 px-3 text-[12.5px]" onClick={() => setSeed((value) => value + 1)}>
                  <RotateCcw size={15} aria-hidden="true" /> Regenerate
                </GhostButton>
                <PrimaryButton className="h-11 px-4 text-[12.5px]" onClick={() => window.print()}>
                  <Printer size={15} aria-hidden="true" /> Print
                </PrimaryButton>
              </div>
            </div>
          </section>

          {drills.length > 0 && (
            <section className="mt-4 border border-wire bg-surface px-4 py-3.5" aria-label="Session plan">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="display text-[11px] uppercase tracking-[0.08em] text-text-faint">The session</h2>
                <span className="display-i text-[18px] leading-none text-cream">{totalMinutes} min</span>
              </div>
              <ol className="mt-3 grid gap-2 md:grid-cols-3">
                {drills.map((drill, index) => (
                  <li key={drill.id}>
                    <a
                      href={`#drill-${drill.id}`}
                      className="tap flex min-h-11 items-center gap-3 border border-wire-2 bg-surface-2 px-3 py-2 text-left hover:border-cream/30"
                    >
                      <span className="display-i shrink-0 text-[16px] leading-none text-text-faint">{index + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-semibold text-text">{drill.title}</span>
                        <span className="block truncate text-[11px] text-text-faint">{drill.type}</span>
                      </span>
                      <span className="num shrink-0 text-[12px] text-cream">{minutesOf(drill.duration)}′</span>
                    </a>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {drills.map((drill, index) => (
            <div key={`${drill.id}-${seed}`} id={`drill-${drill.id}`} className="mt-4 scroll-mt-28">
              <DrillCard drill={drill} defaultExpanded={index === 0} />
            </div>
          ))}
        </div>
      )}
    </MatchShell>
  );
}
