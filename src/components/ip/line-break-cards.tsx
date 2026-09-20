import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Visual } from "./visual";
import type { LineDefending, LineState } from "@/lib/match-analysis";
import { cn } from "@/lib/utils";

function Honesty({ detected }: { detected: number }) {
  return <p className="mt-3 border-t border-wire-2 pt-2 text-[10.5px] font-semibold text-text-faint">{detected} detected</p>;
}

function MiniPitch({ x, y, checked = false }: { x?: number; y?: number; checked?: boolean }) {
  return (
    <svg viewBox="0 0 44 30" className="h-[30px] w-11" role="img" aria-label={checked ? "No line breaks" : "Line-break location"}>
      <rect x=".5" y=".5" width="43" height="29" rx="5.5" fill="var(--surface-2)" stroke="var(--wire)" />
      <g fill="none" stroke="var(--cream)" strokeOpacity=".28" strokeWidth=".7">
        <rect x="3" y="3" width="38" height="24" rx="1" /><line x1="22" y1="3" x2="22" y2="27" /><circle cx="22" cy="15" r="4" />
      </g>
      {checked ? <path d="m16 15 4 4 8-9" fill="none" stroke="var(--quality-good)" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" /> : <circle cx={3 + ((x ?? 50) / 100) * 38} cy={3 + ((y ?? 50) / 100) * 24} r="2.5" fill="var(--quality-bad)" />}
    </svg>
  );
}

function LineBreakHero({ data, matchId }: { data: LineDefending; matchId: string }) {
  const count = data.lineBreakCount;
  const delta = count !== null && data.lineBreakLast5Avg !== null ? Math.round((count - data.lineBreakLast5Avg) * 10) / 10 : null;
  return (
    <Visual question="Did they get in behind us?" caption="Times they played a pass or carried the ball past our deepest defender." info={{ title: "Getting in behind", rows: [{ label: "What it counts", value: "Passes or carries beyond the last defender" }, { label: "This match", value: count === null ? "Not available" : `${count} times`, cream: true }, { label: "Last five average", value: data.lineBreakLast5Avg === null ? "—" : `${data.lineBreakLast5Avg}` }] }}>
      <div className="text-center">
        <strong className="display-i block text-[72px] leading-[.85] text-cream">{count ?? "—"}</strong>
        <span className="text-[11px] font-semibold text-text-faint">times</span>
      </div>
      {count === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2"><MiniPitch checked /><span className="inline-flex items-center gap-1.5 text-[12.5px] text-quality-good"><Check size={15} aria-hidden="true" />Clean sheet behind the line.</span></div>
      ) : data.lineBreaks.length > 0 ? (
        <div className="mt-4 flex flex-wrap justify-center gap-2" aria-label="Line-break moments">
          {data.lineBreaks.map((incident, index) => <Link key={incident.id} to="/match/$matchId/match" params={{ matchId }} search={{ t: Math.max(0, incident.t - 2) }} className="tap grid place-items-center rounded-[6px]" aria-label={`Watch line break ${index + 1}`}><MiniPitch x={incident.x} y={incident.y} /></Link>)}
        </div>
      ) : <p className="mt-4 text-center text-[11.5px] text-text-faint">Incident locations were not supplied.</p>}
      <div className="mt-4 flex items-center justify-between border-t border-wire-2 pt-2 text-[11.5px] font-semibold"><span className="text-text-faint">vs last 5 matches</span><span className={cn(delta !== null && delta > 0 ? "text-cream" : "text-text-faint")}>{delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta}`}</span></div>
      <Honesty detected={data.lineBreaks.length} />
    </Visual>
  );
}

function LineTimeline({ data, matchId }: { data: LineDefending; matchId: string }) {
  const maxT = Math.max(data.timeline.at(-1)?.t ?? 1, 1);
  const maxH = Math.max(...data.timeline.map((point) => point.height), 50);
  const points = data.timeline.map((point) => `${(point.t / maxT) * 100},${40 - (point.height / maxH) * 36}`).join(" ");
  return (
    <Visual question="Where was our line when they scored?" caption="Line height in metres while defending. Only the shots are marked." info={{ title: "Line at conceded shots", rows: [{ label: "Shots marked", value: `${data.shots.length}`, cream: true }, { label: "Under 30 m", value: `${data.shotsUnder30}` }, { label: "Timeline samples", value: `${data.timeline.length}` }] }}>
      <div className="relative mt-1 h-10 border-b border-cream/60" role="img" aria-label={`Defensive line height with ${data.shots.length} conceded shots`}>
        {data.timeline.length > 1 && <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="absolute inset-0 h-full w-full"><polyline points={points} fill="none" stroke="var(--cream)" strokeOpacity=".4" strokeWidth="1" vectorEffect="non-scaling-stroke" /></svg>}
        {data.shots.map((shot, index) => <Link key={shot.id} to="/match/$matchId/match" params={{ matchId }} search={{ t: Math.max(0, shot.t - 2) }} aria-label={`Watch conceded ${shot.goal ? "goal" : "shot"} ${index + 1}`} className="tap absolute top-1/2 z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center" style={{ left: `${(shot.t / maxT) * 100}%` }}><span className="block h-3.5 w-3.5 rotate-45 bg-quality-bad" /></Link>)}
      </div>
      <p className={cn("mt-3 text-[12.5px]", data.shots.length > 0 && data.shotsUnder30 / data.shots.length >= .5 ? "text-cream" : "text-text-dim")}>{data.shots.length ? `${data.shotsUnder30} of ${data.shots.length} shots happened when our line was under 30 m.` : "No conceded shots could be matched to the line."}</p>
      <Honesty detected={data.shots.length} />
    </Visual>
  );
}

function DeepAnswer({ data }: { data: LineDefending }) {
  const delta = data.medianM !== null && data.usualM !== null ? data.usualM - data.medianM : null;
  const answer = delta === null ? "—" : delta > 4 ? "Yes" : delta >= 2 ? "Sometimes" : "No";
  const tone = answer === "Yes" ? "border-quality-bad/50 bg-quality-bad/15 text-quality-bad" : answer === "Sometimes" ? "border-quality-risky/50 bg-quality-risky/15 text-quality-risky" : answer === "No" ? "border-quality-good/50 bg-quality-good/15 text-quality-good" : "border-wire bg-surface-2 text-text-faint";
  return (
    <Visual question="Did we defend too deep?" caption="A direct answer based on this match versus our usual line." info={{ title: "Defensive depth", rows: [{ label: "Our median", value: data.medianM === null ? "—" : `${data.medianM} m`, cream: true }, { label: "Usual", value: data.usualM === null ? "—" : `${data.usualM} m` }] }}>
      <span className={cn("display-i inline-flex min-h-11 items-center rounded-full border px-6 text-[24px]", tone)}>{answer}</span>
      <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-text-dim">{data.belowUsualPct === null || data.usualM === null ? "A usual line-height baseline was not supplied for this match." : `We defended lower than our usual ${data.usualM} m average for ${data.belowUsualPct}% of their possession.`}</p>
      <p className="mt-2 text-[11px] text-text-faint">Our median: {data.medianM === null ? "—" : `${data.medianM} m`} · Usual: {data.usualM === null ? "—" : `${data.usualM} m`}</p>
      <Honesty detected={data.timeline.length} />
    </Visual>
  );
}

const STATE_LABEL: Record<LineState, string> = { high: "High", mid: "Mid", low: "Low" };

function StatePitch({ state }: { state: LineDefending["states"][number] }) {
  const x = Math.max(18, Math.min(82, (state.height / 52) * 100));
  return <svg viewBox="0 0 90 60" className="aspect-[3/2] w-full" role="img" aria-label={`${STATE_LABEL[state.key]} defensive line at ${state.height} metres`}><rect x=".5" y=".5" width="89" height="59" rx="4" fill="var(--surface-2)" stroke="var(--wire)" /><g fill="none" stroke="var(--cream)" strokeOpacity=".22"><rect x="5" y="5" width="80" height="50" /><line x1="45" y1="5" x2="45" y2="55" /><circle cx="45" cy="30" r="8" /></g><path d={`M8 14 L${x} 9 L${x} 51 L8 46 Z`} fill="var(--cream)" fillOpacity=".15" /><line x1={x} y1="8" x2={x} y2="52" stroke="var(--cream)" strokeWidth="1.4" strokeDasharray="3 3" /></svg>;
}

function LineStates({ data, matchId }: { data: LineDefending; matchId: string }) {
  const worst = Math.max(...data.states.map((state) => state.goals));
  const high = data.states.find((state) => state.key === "high");
  const low = data.states.find((state) => state.key === "low");
  return (
    <Visual question="What happened when we pushed up?" caption="Same match, three line heights. What we conceded in each." info={{ title: "Line-height outcomes", rows: data.states.map((state) => ({ label: STATE_LABEL[state.key], value: `${state.goals} conceded · ${state.shots} shots`, cream: state.key === "high" })) }}>
      <div className="grid grid-cols-3 gap-2">
        {data.states.map((state) => <Link key={state.key} to="/match/$matchId/reel" params={{ matchId }} search={{ line: state.key }} className={cn("tap min-w-0 border-b-2 bg-surface-2 p-2", worst > 0 && state.goals === worst ? "border-quality-bad" : "border-transparent")} aria-label={`Open ${state.key} line moments`}><span className="block truncate text-[10px] font-bold uppercase text-text-faint">{STATE_LABEL[state.key]} {state.height} m</span><div className="mt-2"><StatePitch state={state} /></div><strong className="display-i mt-2 block text-[24px] leading-none text-cream">{state.goals}</strong><span className="mt-1 block text-[10.5px] font-semibold text-text-faint">{state.shots} shot{state.shots === 1 ? "" : "s"}</span></Link>)}
      </div>
      <p className="mt-3 text-[12.5px] text-text-dim">Pushing high: <span className="text-cream">{high?.goals ?? 0} conceded.</span> Sitting deep: <span className="text-cream">{low?.goals ?? 0} conceded.</span></p>
      <Honesty detected={data.shots.length} />
    </Visual>
  );
}

export function LineBreakCards({ data, matchId }: { data: LineDefending; matchId: string }) {
  return <section className="flex flex-col gap-3" aria-label="Defensive line review"><LineBreakHero data={data} matchId={matchId} /><LineTimeline data={data} matchId={matchId} /><DeepAnswer data={data} /><LineStates data={data} matchId={matchId} /></section>;
}