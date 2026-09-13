import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Play } from "lucide-react";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { MatchShell } from "@/components/ip/match-shell";
import { StoryLauncher } from "@/components/ip/story-launcher";
import { Card, Pill } from "@/components/ip/primitives";
import { CoachMark, MomentumStrip, Pitch, PossessionRibbon, Visual, ZoneGrid } from "@/components/ip/visual";
import { useMatch } from "@/hooks/use-match";
import { formatClock } from "@/lib/sample-data";
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
  const { match, data } = useMatch(matchId);
  const [scope, setScope] = useState<TeamScope>("both");
  const [period, setPeriod] = useState<Period>("full");

  const total = match?.durationS ?? 1;

  return (
    <MatchShell
      matchId={matchId}
      match={match}
      scope={scope}
      setScope={setScope}
      period={period}
      setPeriod={setPeriod}
    >
      {data && match && (
        <>
          <StoryLauncher matchId={matchId} />

          <CoachMark id="insights">
            Start with the three sentences, then open a finding to see the moments behind it.
          </CoachMark>

          <Visual
            question="Where was the ball?"
            caption="Darker squares are where the ball spent more time."
            info={{
              title: "Where was the ball?",
              glossaryId: "heat-map",
              rows: [
                { label: "What it counts", value: "Ball time per square" },
                { label: "Squares", value: "24 (6 across, 4 down)" },
                { label: "Your busiest square", value: `${Math.max(...data.zones).toFixed(1)}%`, cream: true },
                { label: "Target", value: "No target", cream: true },
                { label: "Read it as", value: "Where play settled" },
              ],
            }}
          >
            <Pitch arrowLabel={`${match.teamA} attack →`}>
              <ZoneGrid values={data.zones} />
            </Pitch>
          </Visual>

          <Visual
            question="Who had the ball?"
            caption="Each block is one spell with the ball, in order."
            info={{
              title: "Who had the ball?",
              glossaryId: "possession",
              rows: [
                { label: "What it counts", value: "Spells with the ball" },
                { label: `${match.teamA}`, value: `${match.summary.possession[0]}%`, cream: true },
                { label: `${match.teamB}`, value: `${match.summary.possession[1]}%` },
                { label: "Longest spell", value: "38 s" },
                { label: "Target", value: "No target", cream: true },
              ],
            }}
          >
            <PossessionRibbon segments={data.possession} total={total} />
            <MomentumStrip values={data.momentum} className="mt-2" />
            <div className="mt-1 flex justify-between text-[11px] text-text-faint">
              <span>0:00</span>
              <span className="num">{formatClock(total)}</span>
            </div>
          </Visual>

          <Card>
            <h2 className="display text-[17px] uppercase text-cream">The match in three sentences</h2>
            <ol className="mt-2 flex flex-col gap-2">
              {data.summary.map((line, i) => (
                <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed text-text-dim">
                  <span className="num shrink-0 text-cream">{i + 1}</span>
                  {line}
                </li>
              ))}
            </ol>
          </Card>

          <h2 className="display mt-1 text-[19px] uppercase text-text">Findings</h2>
          {data.findings.map((f) => (
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
