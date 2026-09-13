import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AppHeader, FloatingNav, PeriodSelector, Screen, TeamSelector } from "@/components/ip/chrome";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { MatchHeader } from "@/components/ip/match-header";
import { Card } from "@/components/ip/primitives";
import { formatClock } from "@/lib/sample-data";
import type { LibraryMatch } from "@/lib/sample-data";
import { crestForTeam } from "@/lib/team-crests";
import { useApp } from "@/store/app-store";

export function MatchShell({
  matchId,
  match,
  scope,
  setScope,
  period,
  setPeriod,
  children,
  showSelectors = true,
}: {
  matchId: string;
  match: LibraryMatch | undefined;
  scope?: TeamScope;
  setScope?: (v: TeamScope) => void;
  period?: Period;
  setPeriod?: (v: Period) => void;
  children: ReactNode;
  showSelectors?: boolean;
}) {
  const team = useApp((s) => s.teams[0]);
  const [setupOpen, setSetupOpen] = useState(false);
  const selectorsVisible = showSelectors && Boolean(scope && setScope && period && setPeriod);
  const crestA = match ? crestForTeam(match.teamA) : undefined;
  const crestB = match ? crestForTeam(match.teamB) : undefined;

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader backTo="/library" />
      <Screen withNav className="pt-4">
        {match ? (
          <>
            <MatchHeader
              teamA={match.teamA}
              teamB={match.teamB}
              scoreA={match.status === "ready" ? match.scoreA : null}
              scoreB={match.status === "ready" ? match.scoreB : null}
              colourA={team?.colorA ?? "var(--team-a)"}
              colourB={team?.colorB ?? "var(--team-b)"}
               {...(crestA ? { crestA } : {})}
               {...(crestB ? { crestB } : {})}
              {...(match.status === "ready"
                ? {
                    periodLine: `${period === "2nd" ? "2nd half" : "1st half"} · ${match.teamA} attack ${
                      period === "2nd" ? "left" : "right"
                    } · ${formatClock(match.durationS)}`,
                  }
                : { metaLine: `${match.date} · ${match.competition}` })}
              {...(setScope ? { onSelectTeamA: () => setScope("a"), onSelectTeamB: () => setScope("b") } : {})}
              onSetup={() => setSetupOpen((v) => !v)}
            />
            {selectorsVisible && (
              <div className="mt-3 flex flex-col gap-2 md:flex-row">
                <TeamSelector value={scope!} onChange={setScope!} teamA={match.teamA} teamB={match.teamB} />
                <PeriodSelector value={period!} onChange={setPeriod!} periods={match.durationS > 1500 ? 2 : 1} />
              </div>
            )}
            {setupOpen && (
              <Card className="mt-3">
                <h2 className="display text-[15px] text-text">Match setup</h2>
                <p className="mt-1 text-[12px] text-text-dim">
                  {match.teamA} in {team?.colorA ? "your first kit" : "red"}, {match.teamB} in the second kit.
                  Kit colours and targets live in your club settings.
                </p>
              </Card>
            )}
            <div className="mt-4 flex flex-col gap-3">{children}</div>
          </>
        ) : (
          <Card className="mt-2">
            <h1 className="display text-[19px] text-text">That match isn't in your library</h1>
            <p className="mt-2 text-[13px] text-text-dim">
              It may have been removed.{" "}
              <Link to="/library" className="text-cream underline">
                Back to your library
              </Link>
              .
            </p>
          </Card>
        )}
      </Screen>
      <FloatingNav matchId={matchId} />
    </div>
  );
}
