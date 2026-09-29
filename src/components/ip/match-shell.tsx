import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AppHeader, FloatingNav, Screen } from "@/components/ip/chrome";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { MatchSetupSheet } from "@/components/ip/match-setup-sheet";
import { Card } from "@/components/ip/primitives";
import { formatClock } from "@/lib/sample-data";
import type { LibraryMatch } from "@/lib/sample-data";
import { isLabelled } from "@/lib/match-source";
import { teamColours } from "@/lib/match-analysis";
import { shortTeamCode } from "@/components/team/TeamToken";
import { useMatchRecord } from "@/hooks/use-match";
import { colourForTeam, crestForTeam } from "@/lib/team-crests";
import { useApp } from "@/store/app-store";

/** Win, draw or loss from the coach's own side; null when the labels do not say which side that is. */
function matchResult(match: LibraryMatch): "W" | "D" | "L" | null {
  if (match.status !== "ready" || !match.clubTeam) return null;
  const ours = match.clubTeam === "A" ? match.scoreA : match.scoreB;
  const theirs = match.clubTeam === "A" ? match.scoreB : match.scoreA;
  return ours === theirs ? "D" : ours > theirs ? "W" : "L";
}

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
  const colourA = match
    ? colourForTeam(match.teamA, record?.label?.colour_a ?? team?.colorA ?? colours.A)
    : colours.A;
  const colourB = match
    ? colourForTeam(match.teamB, record?.label?.colour_b ?? team?.colorB ?? colours.B)
    : colours.B;
  const crestA = match ? crestForTeam(match.teamA) : undefined;
  const crestB = match ? crestForTeam(match.teamB) : undefined;

  useEffect(() => {
    if (!record || prompted) return;
    if (!isLabelled(record.label)) {
      setSetupOpen(true);
      setPrompted(true);
    }
  }, [record, prompted]);

  const headerMatch = match
    ? {
        teamA: match.teamA,
        teamB: match.teamB,
        codeA: shortTeamCode(match.teamA),
        codeB: shortTeamCode(match.teamB),
        ...(crestA ? { crestA } : {}),
        ...(crestB ? { crestB } : {}),
        colourA,
        colourB,
        scoreA: match.status === "ready" ? match.scoreA : null,
        scoreB: match.status === "ready" ? match.scoreB : null,
        meta: [
          match.competition,
          match.date,
          match.status === "ready" ? formatClock(match.durationS) : null,
        ]
          .filter(Boolean)
          .join(" · "),
        result: matchResult(match),
        onSetup: () => setSetupOpen((v) => !v),
      }
    : undefined;

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader backTo="/library" {...(headerMatch ? { match: headerMatch } : {})} />
      <FloatingNav matchId={matchId} />
      <Screen withNav className="pt-3">
        {match ? (
          <>
            {record && (
              <MatchSetupSheet
                key={record.label ? "labelled" : "unlabelled"}
                item={record}
                open={setupOpen}
                onClose={() => setSetupOpen(false)}
              />
            )}

            {/* gap-4 is the prototype's --gap: the rhythm between sections on every match screen. */}
            <div className="flex flex-col gap-4">{children}</div>
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
