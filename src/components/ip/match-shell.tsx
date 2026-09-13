import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AppHeader, FloatingNav, MatchBar, PeriodSelector, Screen, TeamSelector } from "@/components/ip/chrome";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { Card } from "@/components/ip/primitives";
import { formatClock } from "@/lib/sample-data";
import type { LibraryMatch } from "@/lib/sample-data";

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
              periodLine={`1st half · ${match.teamA} attack right · ${formatClock(match.durationS)}`}
            />
            {showSelectors && scope && setScope && period && setPeriod && (
              <div className="mt-3 flex flex-col gap-2 md:flex-row">
                <TeamSelector value={scope} onChange={setScope} teamA={match.teamA} teamB={match.teamB} />
                <PeriodSelector value={period} onChange={setPeriod} periods={1} />
              </div>
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
