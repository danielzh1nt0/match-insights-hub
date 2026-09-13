import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Play } from "lucide-react";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { MatchShell } from "@/components/ip/match-shell";
import { StoryLauncher } from "@/components/ip/story-launcher";
import { Card, Pill } from "@/components/ip/primitives";
import { CoachMark, HeatBlobs, Pitch, Visual } from "@/components/ip/visual";
import { useAnalysis } from "@/hooks/use-match";
import { formatClock } from "@/lib/sample-data";
import { teamRow } from "@/lib/match-analysis";
import type { Finding } from "@/lib/match-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/match/$matchId/insights")({
  head: () => ({
    meta: [
      { title: "Match insights — Ipanema" },
      { name: "description", content: "The match in three sentences, with findings you can train on Tuesday." },
      { property: "og:title", content: "Match insights — Ipanema" },
      { property: "og:description", content: "Findings, targets and the moments behind them." },
    ],
  }),
  component: Insights,
});

function Insights() {
  const { matchId } = Route.useParams();
  const [scope, setScope] = useState<TeamScope>("a");
  const [period, setPeriod] = useState<Period>("full");
  const { match, team, stats, findings, summary, territory, loading } = useAnalysis(matchId, scope);

  const rowA = teamRow(stats, "A");
  const rowB = teamRow(stats, "B");
  const teamName = team === "B" ? match?.teamB : match?.teamA;

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

      {match && territory && (
        <>
          <StoryLauncher matchId={matchId} />

          <CoachMark id="insights">
            Start with the three sentences, then open a finding to see the moments behind it.
          </CoachMark>

          <Visual
            question="Where was the ball?"
            caption="Brighter areas are where the team spent more time."
            info={{
              title: "Where was the ball?",
              glossaryId: "heat-map",
              rows: [
                { label: "What it counts", value: "Player time per area" },
                { label: "Team", value: teamName ?? "Both teams", cream: true },
                { label: "Players tracked", value: `${territory.playerCount}` },
                { label: "Frames used", value: territory.frameCount.toLocaleString() },
                { label: "Read it as", value: "Where play settled" },
              ],
            }}
          >
            <Pitch arrowLabel={`${match.teamA} attack →`}>
              <HeatBlobs points={territory.heat} color={team === "B" ? colours.B : colours.A} />
            </Pitch>
            <p className="num mt-2 text-[11.5px] text-text-faint">
              n = {territory.playerCount} players · {territory.frameCount.toLocaleString()} frames
            </p>
          </Visual>

          <Card>
            <h2 className="display text-[17px] uppercase text-cream">Who had the ball?</h2>
            <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-surface-3">
              <span
                className="h-full"
                style={{ width: `${rowA?.possession_pct ?? 50}%`, background: colours.A }}
              />
              <span className="h-full flex-1" style={{ background: colours.B }} />
            </div>
            <p className="num mt-2 text-[12px] text-text-dim">
              {match.teamA} {rowA?.possession_pct ?? 0}% · {match.teamB} {rowB?.possession_pct ?? 0}%
            </p>
          </Card>

          <Card>
            <h2 className="display text-[17px] uppercase text-cream">The match in three sentences</h2>
            <ol className="mt-2 flex flex-col gap-2">
              {summary.map((line, i) => (
                <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed text-text-dim">
                  <span className="num shrink-0 text-cream">{i + 1}</span>
                  {line}
                </li>
              ))}
            </ol>
          </Card>

          <h2 className="display mt-1 text-[19px] uppercase text-text">Findings</h2>
          {findings.length === 0 && (
            <Card>
              <p className="text-[13px] leading-relaxed text-text-dim">
                Nothing in this match broke the targets you set for {teamName}. There is no finding to train
                from — switch team to see the other side.
              </p>
            </Card>
          )}
          {findings.map((f) => (
            <FindingCard key={f.id} finding={f} matchId={matchId} />
          ))}
        </>
      )}
    </MatchShell>
  );
}

function FindingCard({ finding, matchId }: { finding: Finding; matchId: string }) {
  const ratio = Math.min(1, finding.value / Math.max(finding.target, finding.value, 1));
  const missed = finding.higherIsWorse ? finding.value > finding.target : finding.value < finding.target;
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[14.5px] font-semibold leading-snug text-text">{finding.headline}</h3>
        <Pill tone={missed ? "bad" : "good"}>{missed ? "Off target" : "On target"}</Pill>
      </div>

      <div className="flex items-end gap-4">
        <span className="num text-[34px] leading-none text-cream">
          {finding.value}
          <span className="text-[15px] text-cream-dim">{finding.unit === "%" ? "%" : ` ${finding.unit}`}</span>
        </span>
        <span className="text-[11.5px] text-text-faint">
          Target {finding.target}
          {finding.unit === "%" ? "%" : ` ${finding.unit}`}
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className={cn("h-full rounded-full", missed ? "bg-quality-bad" : "bg-quality-good")}
          style={{ width: `${Math.max(6, ratio * 100)}%` }}
        />
      </div>

      <p className="text-[13px] leading-relaxed text-text-dim">{finding.interpretation}</p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11.5px] text-text-faint">{finding.events} moments</span>
        {finding.timestamps.map((t) => (
          <Link
            key={t}
            to="/match/$matchId/match"
            params={{ matchId }}
            search={{ t }}
            className="tap inline-flex items-center gap-1.5 rounded-[8px] border border-wire px-2.5 text-[11.5px] text-cream hover:border-cream/50"
          >
            <Play size={12} aria-hidden="true" />
            <span className="num">{formatClock(t)}</span> Watch
          </Link>
        ))}
      </div>

      <div className="flex gap-2">
        <Link
          to="/match/$matchId/session"
          params={{ matchId }}
          search={{ finding: finding.id }}
          className="tap flex flex-1 items-center justify-center rounded-[12px] bg-cream px-5 text-sm font-semibold text-[#111315] hover:bg-cream-dim"
        >
          Build session
        </Link>
        <Link
          to="/match/$matchId/reel"
          params={{ matchId }}
          className="tap flex flex-1 items-center justify-center rounded-[12px] border border-cream/60 px-5 text-sm font-semibold text-cream hover:bg-cream/10"
        >
          Clip reel
        </Link>
      </div>
    </Card>
  );
}
