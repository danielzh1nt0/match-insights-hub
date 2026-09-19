import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronDown, Play, TriangleAlert, X } from "lucide-react";
import { useState } from "react";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { EventReviewControls } from "@/components/ip/event-review";
import { MatchShell } from "@/components/ip/match-shell";
import { Card, Pill } from "@/components/ip/primitives";
import { StatIcon, type StatIconName } from "@/components/ip/stat-icon";
import { StoryLauncher } from "@/components/ip/story-launcher";
import { useAnalysis } from "@/hooks/use-match";
import type { ReviewedEvent } from "@/lib/event-reviews";
import type { Finding } from "@/lib/match-data";
import { formatClock } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/match/$matchId/insights")({
  head: () => ({
    meta: [
      { title: "Match insights — Ipanema" },
      { name: "description", content: "The match in three sentences, with findings you can train on Tuesday." },
      { property: "og:title", content: "Match insights — Ipanema" },
      { property: "og:description", content: "Findings, targets and the moments behind them." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Insights,
});

function Insights() {
  const { matchId } = Route.useParams();
  const [scope, setScope] = useState<TeamScope>("a");
  const [period, setPeriod] = useState<Period>("full");
  const { match, colours, findings, summary, loading, events, review } = useAnalysis(matchId, scope);

  return (
    <MatchShell matchId={matchId} match={match} scope={scope} setScope={setScope} period={period} setPeriod={setPeriod}>
      {loading && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2" role="status" aria-label="Loading">
          <div className="h-full w-1/3 animate-[loadbar_1.1s_ease-in-out_infinite] rounded-full bg-cream" />
        </div>
      )}

      {match && (
        <>
          <StoryLauncher matchId={matchId} />

          <Card>
            <h2 className="display text-[17px] uppercase text-cream">The match in three sentences</h2>
            <ol className="mt-3 flex flex-col gap-2.5">
              {summary.slice(0, 3).map((line, index) => (
                <li key={line} className="grid grid-cols-[24px_1fr] gap-2.5 text-[13.5px] leading-relaxed text-text-dim">
                  <span className="num text-[18px] leading-snug text-cream">{index + 1}</span>
                  <span>{line}</span>
                </li>
              ))}
            </ol>
          </Card>

          <section aria-labelledby="findings-title">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 id="findings-title" className="display text-[19px] uppercase text-text">Findings</h2>
              <span className="text-[11px] text-text-faint">{findings.length} to review</span>
            </div>
            {findings.length === 0 ? (
              <Card><p className="text-[13px] leading-relaxed text-text-dim">Nothing in this match broke the targets you set. Switch team to review the other side.</p></Card>
            ) : (
              <div className="overflow-hidden rounded-[16px] border border-wire bg-surface">
                {findings.map((finding, index) => (
                  <FindingRow
                    key={finding.id}
                    finding={finding}
                    matchId={matchId}
                    moments={events.filter((event) => finding.eventIds.includes(event.id)).slice(0, 6)}
                    defaultOpen={index === 0}
                    iconColour={scope === "b" ? colours.B : colours.A}
                    onReview={(input) => review.setVerdict.mutate(input)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </MatchShell>
  );
}

type FindingState = "track" | "warning" | "critical";

const FINDING_ICONS: Record<string, StatIconName> = {
  slow_press: "pressing-intensity",
  no_regain: "counterpress",
  press_alone: "pressing-intensity",
  slow_forward: "progressive-passes",
  won_and_lost: "turnovers-lost",
  better_option: "better-option",
  risky_passing: "passes",
  long_block: "block-length",
  low_tilt: "field-tilt",
  no_high_turnovers: "high-turnovers",
};

function findingState(finding: Finding): FindingState {
  const missed = finding.higherIsWorse ? finding.value > finding.target : finding.value < finding.target;
  if (!missed) return "track";
  if (finding.id === "low_tilt" || finding.id === "no_high_turnovers") return "critical";
  return "warning";
}

function FindingRow({ finding, matchId, moments, defaultOpen, iconColour, onReview }: {
  finding: Finding;
  matchId: string;
  moments: ReviewedEvent[];
  defaultOpen: boolean;
  iconColour: string;
  onReview: (input: { eventId: string; verdict: "confirmed" | "deleted" | "retimed"; tCorrected?: number | null; teamCorrected?: string | null }) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const state = findingState(finding);
  const icon = FINDING_ICONS[finding.id] ?? "attempts";
  const ratio = Math.min(1, finding.value / Math.max(finding.target, finding.value, 1));
  const stateLabel = state === "track" ? "On track" : state === "warning" ? "Off target" : "Critical";

  return (
    <article className="border-b border-wire-2 last:border-0">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="tap grid w-full grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-3.5 text-left hover:bg-surface-2">
        <span className="grid h-11 w-11 place-items-center rounded-full border border-wire bg-surface-2">
          <StatIcon name={icon} style={{ color: iconColour }} />
        </span>
        <span className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-text">{finding.headline}</span>
        <span className="flex items-center gap-2">
          <ResultPill state={state} label={stateLabel} />
          <ChevronDown size={16} className={cn("text-text-faint transition-transform", open && "rotate-180")} aria-hidden="true" />
        </span>
      </button>

      {open && (
        <div className="border-t border-wire-2 px-4 pb-4 pt-3">
          <div className="flex items-end gap-4">
            <span className="display-i text-[34px] leading-none text-cream">{finding.value}<span className="ml-1 text-[15px] text-cream-dim">{finding.unit === "%" ? "%" : finding.unit}</span></span>
            <span className="pb-0.5 text-[11.5px] text-text-faint">Target {finding.target}{finding.unit === "%" ? "%" : ` ${finding.unit}`}</span>
            {finding.basis === "detected" && <Pill tone="risky" className="ml-auto">detected</Pill>}
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-3"><div className={cn("h-full rounded-full", state === "track" ? "bg-cream" : state === "warning" ? "bg-quality-risky" : "bg-text-faint")} style={{ width: `${Math.max(6, ratio * 100)}%` }} /></div>
          <p className="mt-3 text-[13px] leading-relaxed text-text-dim">{finding.interpretation}</p>
          <div className="mt-3 flex flex-col gap-1.5">
            <span className="text-[11.5px] text-text-faint">{finding.events} moments</span>
            {moments.map((event) => (
              <div key={event.id} className="flex items-center gap-2">
                <Link to="/match/$matchId/match" params={{ matchId }} search={{ t: Math.round(event.t * 10) / 10 }} className="tap inline-flex flex-1 items-center gap-1.5 rounded-[8px] border border-wire px-2.5 text-[11.5px] text-cream hover:border-cream/50"><Play size={12} aria-hidden="true" /><span className="num">{formatClock(event.t)}</span><span className="truncate text-text-faint">{event.status}</span></Link>
                <EventReviewControls event={event} onReview={onReview} />
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Link to="/match/$matchId/session" params={{ matchId }} search={{ finding: finding.id }} className="tap flex flex-1 items-center justify-center rounded-[12px] bg-cream px-4 text-sm font-semibold text-primary-foreground">Build session</Link>
            <Link to="/match/$matchId/reel" params={{ matchId }} className="tap flex flex-1 items-center justify-center rounded-[12px] border border-cream/60 px-4 text-sm font-semibold text-cream hover:bg-cream/10">Clip reel</Link>
          </div>
        </div>
      )}
    </article>
  );
}

function ResultPill({ state, label }: { state: FindingState; label: string }) {
  const Icon = state === "track" ? Check : state === "warning" ? TriangleAlert : X;
  return <span className={cn("inline-flex min-h-7 items-center gap-1 rounded-full px-2.5 text-[10.5px] font-semibold", state === "track" && "bg-cream text-primary-foreground", state === "warning" && "bg-quality-risky/10 text-quality-risky", state === "critical" && "bg-surface-3 text-text-faint")}><Icon size={12} aria-hidden="true" /><span className="hidden min-[360px]:inline">{label}</span></span>;
}