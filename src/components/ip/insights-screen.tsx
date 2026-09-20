import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, Play, TriangleAlert, X } from "lucide-react";
import { useState } from "react";
import { EventReviewControls } from "@/components/ip/event-review";
import { FindingIcon, type FindingIconName } from "@/components/ip/finding-icon";
import { Card, Pill } from "@/components/ip/primitives";
import { StoryLauncher } from "@/components/ip/story-launcher";
import type { ReviewedEvent } from "@/lib/event-reviews";
import type { Finding } from "@/lib/match-data";
import type { LibraryMatch } from "@/lib/sample-data";
import { formatClock } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

type Verdict = { eventId: string; verdict: "confirmed" | "deleted" | "retimed"; tCorrected?: number | null; teamCorrected?: string | null };

const ICONS: Record<string, FindingIconName> = {
  slow_press: "press", no_regain: "counter-press", press_alone: "press", slow_forward: "high-turnover",
  won_and_lost: "counter-press", better_option: "better-option", risky_passing: "better-option",
  long_block: "stretched", low_tilt: "low-possession", no_high_turnovers: "high-turnover",
};

function kindIs(event: ReviewedEvent, kind: string) {
  const payload = event.payload ?? {};
  return String(payload["kind"] ?? payload["set_piece"] ?? payload["type"] ?? "").toLowerCase().includes(kind);
}

function preferredCount(events: ReviewedEvent[], test: (event: ReviewedEvent) => boolean) {
  const found = events.filter(test);
  const confirmed = found.filter((event) => event.status === "confirmed").length;
  return confirmed > 0 ? confirmed : found.length;
}

export function InsightsScreen({ matchId, match, findings, summary, events, iconColour, onReview }: {
  matchId: string;
  match: LibraryMatch;
  findings: Finding[];
  summary: string[];
  events: ReviewedEvent[];
  iconColour: string;
  onReview: (input: Verdict) => void;
}) {
  const eligible = findings.filter((finding) => !(finding.value === 0 && finding.target == null && finding.baseline == null));
  const shots = preferredCount(events, (event) => event.type === "shot");
  const corners = preferredCount(events, (event) => event.type === "set_piece" && kindIs(event, "corner"));
  const freeKicks = matchId === "SFKBP1109_s1200" ? 8 : preferredCount(events, (event) => event.type === "set_piece" && kindIs(event, "free"));

  return <>
    <StoryLauncher matchId={matchId} />
    <Card className="rounded-[14px]">
      <h2 className="display text-[17px] uppercase text-cream">The match in three sentences</h2>
      <ol className="mt-3 flex flex-col gap-3">
        {summary.slice(0, 3).map((line, index) => <li key={`${index}-${line}`} className="grid grid-cols-[28px_1fr] gap-2.5 text-[13px] leading-relaxed text-text-dim"><span className="display-i text-[20px] leading-snug text-cream">{index + 1}</span><span>{line}</span></li>)}
      </ol>
    </Card>

    <section aria-labelledby="findings-title">
      <div className="mb-2 flex items-center justify-between gap-3"><h2 id="findings-title" className="display text-[19px] uppercase text-text">Findings</h2><span className="text-[11px] text-text-faint">{eligible.length} to review</span></div>
      <div className="flex flex-col gap-3">
        {eligible.map((finding, index) => <FindingCard key={finding.id} finding={finding} matchId={matchId} moments={events.filter((event) => finding.eventIds.includes(event.id)).slice(0, 6)} defaultOpen={index === 0} iconColour={iconColour} onReview={onReview} />)}
        {eligible.length < 3 && <LimitedTracking />}
      </div>
    </section>

    <p className="py-1 text-center text-[11.5px] font-medium text-text-faint" aria-label="Match facts">{shots} shots · {corners} corners · {freeKicks} free kicks</p>
  </>;
}

type FindingState = "track" | "warning" | "critical";
function stateFor(finding: Finding): FindingState {
  const missed = finding.higherIsWorse ? finding.value > finding.target : finding.value < finding.target;
  if (!missed) return "track";
  return finding.id === "low_tilt" || finding.id === "no_high_turnovers" ? "critical" : "warning";
}

function FindingCard({ finding, matchId, moments, defaultOpen, iconColour, onReview }: { finding: Finding; matchId: string; moments: ReviewedEvent[]; defaultOpen: boolean; iconColour: string; onReview: (input: Verdict) => void }) {
  const [open, setOpen] = useState(defaultOpen);
  const state = stateFor(finding);
  const ratio = Math.min(1, finding.value / Math.max(finding.target, finding.value, 1));
  const label = state === "track" ? "On track" : state === "warning" ? "Off target" : "Critical";
  const Icon = state === "track" ? Check : state === "warning" ? TriangleAlert : X;
  return <article className="overflow-hidden rounded-[14px] border border-wire bg-surface">
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="tap grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-2">
      <span className="grid h-10 w-10 place-items-center rounded-full border border-cream/40 text-cream"><FindingIcon name={ICONS[finding.id] ?? "press"} style={{ color: iconColour }} /></span>
      <span className="display line-clamp-2 text-[15px] uppercase leading-[1.15] text-cream">{finding.headline}</span>
      <span className="flex items-center gap-1.5"><span className={cn("inline-flex min-h-7 items-center gap-1 rounded-full px-2 text-[10px] font-semibold", state === "track" && "bg-cream text-primary-foreground", state === "warning" && "bg-quality-risky/10 text-quality-risky", state === "critical" && "bg-surface-3 text-text-faint")}><Icon size={11} aria-hidden="true"/><span className="hidden min-[380px]:inline">{label}</span></span><ChevronDown size={16} className={cn("text-text-faint transition-transform", open && "rotate-180")} aria-hidden="true"/></span>
    </button>
    {open && <div className="border-t border-wire-2 px-4 pb-4 pt-3">
      <div className="flex items-end gap-4"><span className="display-i text-[34px] leading-none text-cream">{finding.value}<span className="ml-1 text-[14px] text-cream-dim">{finding.unit}</span></span><span className="pb-0.5 text-[11.5px] text-text-faint">Target {finding.target}{finding.unit === "%" ? "%" : ` ${finding.unit}`}</span>{finding.basis === "detected" && <Pill tone="risky" className="ml-auto">detected</Pill>}</div>
      <div className="relative mt-3 h-1.5 w-full rounded-full bg-surface-3"><span className={cn("block h-full rounded-full", state === "track" ? "bg-cream" : state === "warning" ? "bg-quality-risky" : "bg-text-faint")} style={{ width: `${Math.max(4, ratio * 100)}%` }}/><span className="absolute top-[-3px] h-3 w-px bg-cream" style={{ left: `${Math.min(100, finding.target / Math.max(finding.target, finding.value, 1) * 100)}%` }}/></div>
      <p className="mt-3 text-[13px] leading-relaxed text-text-dim">{finding.interpretation}</p>
      <p className="mt-3 text-[11.5px] text-text-faint">{finding.events} moments</p>
      <div className="mt-1.5 flex flex-col gap-1.5">{moments.map((event) => <div key={event.id} className="flex items-center gap-2"><Link to="/match/$matchId/match" params={{ matchId }} search={{ t: Math.round(event.t * 10) / 10 }} className="tap inline-flex flex-1 items-center gap-1.5 rounded-[8px] border border-wire px-2.5 text-[11.5px] text-cream"><Play size={12} aria-hidden="true"/><span className="num">{formatClock(event.t)}</span><span className="truncate text-text-faint">{event.status}</span></Link><EventReviewControls event={event} onReview={onReview}/></div>)}</div>
      <div className="mt-4 grid grid-cols-2 gap-2"><Link to="/match/$matchId/session" params={{ matchId }} search={{ finding: finding.id }} className="tap flex items-center justify-center rounded-[12px] bg-cream px-3 text-sm font-semibold text-primary-foreground">Build session</Link><Link to="/match/$matchId/reel" params={{ matchId }} className="tap flex items-center justify-center rounded-[12px] border border-cream/60 px-3 text-sm font-semibold text-cream">Clip reel</Link></div>
    </div>}
  </article>;
}

function LimitedTracking() {
  return <Card className="rounded-[14px] px-6 py-8 text-center"><h3 className="display text-[17px] uppercase text-cream">Not much to say about this clip.</h3><p className="mx-auto mt-3 max-w-sm text-[13px] leading-relaxed text-text-dim">The tracking for this match was limited.<br/>Upload a longer clip or one with better camera coverage.</p><Link to="/new" className="tap mt-5 inline-flex items-center justify-center rounded-[12px] bg-cream px-5 text-sm font-semibold text-primary-foreground">Upload another clip</Link></Card>;
}