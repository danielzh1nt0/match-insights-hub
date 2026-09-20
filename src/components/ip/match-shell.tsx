import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AppHeader, FloatingNav, PeriodSelector, Screen, TeamSelector } from "@/components/ip/chrome";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { MatchHeader } from "@/components/ip/match-header";
import { MatchSetupSheet } from "@/components/ip/match-setup-sheet";
import { Card } from "@/components/ip/primitives";
import { formatClock } from "@/lib/sample-data";
import type { LibraryMatch } from "@/lib/sample-data";
import { isLabelled } from "@/lib/match-source";
import { attacksRight, teamColours } from "@/lib/match-analysis";
import { useMatchRecord } from "@/hooks/use-match";
import { colourForTeam, crestForTeam } from "@/lib/team-crests";
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
  const { data: record } = useMatchRecord(matchId);
  const [setupOpen, setSetupOpen] = useState(false);
  const [prompted, setPrompted] = useState(false);
  const selectorsVisible = showSelectors && Boolean(scope && setScope && period && setPeriod);
  const colours = teamColours(record?.label ?? null);
  const colourA = match ? colourForTeam(match.teamA, record?.label?.colour_a ?? team?.colorA ?? colours.A) : colours.A;
  const colourB = match ? colourForTeam(match.teamB, record?.label?.colour_b ?? team?.colorB ?? colours.B) : colours.B;
  const crestA = match ? crestForTeam(match.teamA) : undefined;
  const crestB = match ? crestForTeam(match.teamB) : undefined;

  useEffect(() => {
    if (!record || prompted) return;
    if (!isLabelled(record.label)) {
      setSetupOpen(true);
      setPrompted(true);
    }
  }, [record, prompted]);


  return (
    <div className="min-h-screen bg-bg">
      <AppHeader backTo="/library" />
      <FloatingNav matchId={matchId} />
      <Screen withNav className="pt-4">
        {match ? (
          <>
            <MatchHeader
              teamA={match.teamA}
              teamB={match.teamB}
              scoreA={match.status === "ready" ? match.scoreA : null}
              scoreB={match.status === "ready" ? match.scoreB : null}
               colourA={colourA}
               colourB={colourB}
               {...(crestA ? { crestA } : {})}
               {...(crestB ? { crestB } : {})}
              {...(match.status === "ready"
                ? {
                    periodLine: `${period === "2nd" ? "2nd half" : "1st half"} · ${match.teamA} attack ${
                      attacksRight(
                        record?.row.attack_right,
                        record?.label?.attack_right_override,
                        "A",
                      ) === (period !== "2nd")
                        ? "right"
                        : "left"
                    } · ${formatClock(match.durationS)}`,
                  }
                : { metaLine: `${match.date} · ${match.competition}` })}
              {...(setScope ? { onSelectTeamA: () => setScope("a"), onSelectTeamB: () => setScope("b") } : {})}
              onSetup={() => setSetupOpen((v) => !v)}
            />
            {selectorsVisible && (
              <div className="mt-3 flex flex-col gap-2 md:flex-row">
                <TeamSelector
                  value={scope!}
                  onChange={setScope!}
                  teamA={match.teamA}
                  teamB={match.teamB}
                   colourA={colourA}
                   colourB={colourB}
                />
                <PeriodSelector value={period!} onChange={setPeriod!} periods={match.durationS > 1500 ? 2 : 1} />
              </div>
            )}
            {record && (
              <MatchSetupSheet
                key={record.label ? "labelled" : "unlabelled"}
                item={record}
                open={setupOpen}
                onClose={() => setSetupOpen(false)}
              />
            )}

            <div className="mt-4 flex flex-col gap-3 md:mt-5">{children}</div>
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
    </div>
  );
}
