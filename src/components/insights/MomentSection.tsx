import type { ReactNode } from "react";
import { Button } from "@/components/ip/primitives";
import { MomentumStrip, type MomentumMarker, type MomentumSegment } from "@/components/visuals/MomentumStrip";
import { Sparkline } from "@/components/visuals/Sparkline";
import { cn } from "@/lib/utils";

export type MomentState = "keep" | "watch" | "fix";
export type Tone = "good" | "warn" | "bad";
export type Clip = { t: string; seconds: number };
export type MomentProps = {
  id: string;
  name: string;
  state: MomentState;
  timeSample: string;
  value: string;
  valueColour?: Tone;
  sample: string;
  claim: string;
  sub: string;
  comparisons: { target: string; vsOpp: string; vsL5: string; vsOppTone: Tone; vsL5Tone: Tone; trend: number[] };
  visual: ReactNode;
  whereVisual?: ReactNode;
  consequence?: ReactNode;
  cause?: string;
  clips: Clip[];
  allClipCount?: number;
  onTrain?: () => void;
  onClip: (seconds: number) => void;
  expanded: boolean;
  onToggle: () => void;
  priority?: boolean;
  whenSegments: MomentumSegment[];
  whenMarkers: MomentumMarker[];
  durationSeconds: number;
};

const stateLabel = { keep: "Keep doing", watch: "Watch", fix: "Fix first" } as const;
const stateClasses = { keep: "bg-reaction-good/15 text-reaction-good", watch: "bg-reaction-warn/15 text-reaction-warn", fix: "bg-reaction-bad/15 text-reaction-bad" } as const;
const borderClasses = { keep: "border-l-team-a", watch: "border-l-team-b", fix: "border-l-reaction-bad" } as const;
const valueClasses = { good: "text-reaction-good", warn: "text-reaction-warn", bad: "text-reaction-bad" } as const;
const toneClasses = { good: "text-reaction-good", warn: "text-reaction-warn", bad: "text-reaction-bad" } as const;

export function MomentSection(props: MomentProps) {
  const { id, name, state, timeSample, value, valueColour, sample, claim, sub, comparisons, visual, whereVisual, consequence, cause, clips, allClipCount, onTrain, onClip, expanded, onToggle, priority, whenSegments, whenMarkers, durationSeconds } = props;
  return <article id={id} className={cn("overflow-hidden rounded-[14px] border border-l-[3px] border-wire bg-surface", borderClasses[state], priority && "shadow-priority")}>
    <Button type="button" variant="ghost" aria-expanded={expanded} aria-controls={`${id}-details`} onClick={onToggle} className="h-auto min-h-11 w-full justify-between rounded-none px-4 pb-2 pt-3.5 text-left hover:bg-surface-2">
      <span className="flex min-w-0 flex-col items-start gap-1.5"><span className="display text-[13px] text-text-dim">{name}</span><span className={cn("inline-flex items-center gap-1.5 rounded-[6px] px-[9px] py-1 text-[10px] font-bold uppercase", stateClasses[state])}><span className="h-1.5 w-1.5 rounded-full bg-current" />{stateLabel[state]}</span></span>
      <span className="display shrink-0 self-start pt-0.5 text-[11px] text-text-faint">{timeSample}</span>
    </Button>

    <div id={`${id}-details`}>
      {expanded && <p className="px-4 pb-2 pt-1 text-[15px] font-semibold leading-[1.35] text-text">{claim}</p>}
      <div className="flex items-baseline gap-2.5 px-4 pb-2 pt-1"><strong className={cn("display-i text-[44px] leading-[.9]", valueColour ? valueClasses[valueColour] : "text-cream", "md:text-[36px]")}>{value}</strong><span className="whitespace-pre-line text-[11px] font-semibold leading-[1.4] text-text-faint">{sample}</span></div>
      {!expanded && <p className="px-4 pb-3 text-[12.5px] leading-normal text-text-dim">{sub}</p>}

      <div className="px-4 pb-3">{visual}</div>

      <div className="flex flex-wrap gap-5 px-4 pb-3 pt-2">
        <Compare label="Target" value={comparisons.target} />
        <Compare label="vs Opp" value={comparisons.vsOpp} tone={comparisons.vsOppTone} />
        <span className="flex flex-col gap-0.5"><span className="text-[9px] font-bold uppercase text-text-faint">vs L5</span><span className="flex items-center gap-2"><strong className={cn("display text-[14px]", toneClasses[comparisons.vsL5Tone])}>{comparisons.vsL5}</strong><Sparkline values={comparisons.trend} colour={`var(--reaction-${comparisons.vsL5Tone})`} /></span></span>
      </div>

      {expanded && <>
        {consequence && <div className="mx-4 mb-3 rounded-[8px] border border-wire-2 bg-cream/[.03] px-3 py-2.5 text-[12px] leading-normal text-text-dim"><span className="mb-1 block text-[9.5px] font-bold uppercase text-text-faint">What it led to</span>{consequence}</div>}
        {whereVisual && <div className="px-4 pb-3"><p className="mb-1.5 text-[9.5px] font-bold uppercase text-text-faint">Where</p>{whereVisual}</div>}
        <div className="px-4 pb-3"><p className="mb-1.5 text-[9.5px] font-bold uppercase text-text-faint">When they happened</p><MomentumStrip segments={whenSegments} markers={whenMarkers} durationSeconds={durationSeconds} currentTime={0} onSeek={onClip} /><div className="mt-1 flex justify-between text-[9px] font-semibold text-text-faint"><span>0′</span><span>45′</span><span>90′</span></div></div>
        {cause && <div className="mx-4 mb-3 rounded-[8px] border border-wire-2 bg-cream/[.03] px-3 py-2.5 text-[12px] leading-normal text-text-dim"><span className="mb-1 block text-[9.5px] font-bold uppercase text-text-faint">Likely cause · hypothesis</span>{cause}</div>}
        <p className="px-4 pb-2 text-[9.5px] font-bold uppercase text-text-faint">Three clearest clips</p>
      </>}

      <div className="grid grid-cols-3 gap-1.5 px-4 pb-3">{clips.map((clip) => <Button key={`${id}-${clip.seconds}`} type="button" variant="ghost" aria-label={`Play clip at ${clip.t}`} onClick={() => onClip(clip.seconds)} className="relative aspect-[16/10] h-auto min-h-11 rounded-[8px] border border-wire bg-pitch-insight p-0 hover:bg-pitch-insight"><span className="absolute bottom-1 left-1 rounded-[3px] bg-ink/80 px-1 font-display text-[9px] font-bold text-cream">{clip.t}</span><span className="absolute left-1/2 top-1/2 h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cream/40" /></Button>)}</div>
      {expanded && allClipCount && <div className="px-4 pb-3"><Button type="button" variant="ghost" onClick={() => clips[0] && onClip(clips[0].seconds)} className="w-full rounded-[8px] border border-dashed border-wire text-[11.5px] font-semibold text-text-dim">Show all {allClipCount} →</Button></div>}
      {state === "fix" && onTrain && <div className="px-4 pb-4 pt-1"><Button type="button" onClick={onTrain} className="w-full">Train it · counter-press after loss →</Button></div>}
    </div>
  </article>;
}

function Compare({ label, value, tone }: { label: string; value: string; tone?: Tone }) {
  return <span className="flex flex-col gap-0.5"><span className="text-[9px] font-bold uppercase text-text-faint">{label}</span><strong className={cn("display text-[14px]", tone ? toneClasses[tone] : "text-cream")}>{value}</strong></span>;
}
