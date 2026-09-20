import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Visual } from "./visual";
import type { LineDefending } from "@/lib/match-analysis";
import { cn } from "@/lib/utils";

function Honesty({ confirmed, detected }: { confirmed: number; detected: number }) {
  if (detected === 0) return null;
  return <p className="-mx-4 -mb-3 mt-3 border-t border-wire-2 px-4 py-2 text-[10.5px] font-medium text-text-faint before:mr-1.5 before:inline-block before:h-[5px] before:w-[5px] before:rounded-full before:bg-text-faint">{confirmed} confirmed · {detected} detected</p>;
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

export function LineBreakHero({ data, matchId }: { data: LineDefending; matchId: string }) {
  const count = data.lineBreakCount;
  const delta = count !== null && data.lineBreakLast5Avg !== null ? Math.round((count - data.lineBreakLast5Avg) * 10) / 10 : null;
  return (
    <Visual framing="custom" question="Did they get in behind us?" caption="Times they played a pass or carried the ball past our deepest defender." info={{ title: "Getting in behind", rows: [{ label: "What it counts", value: "Passes or carries beyond the last defender" }, { label: "This match", value: count === null ? "Not available" : `${count} times`, cream: true }, { label: "Last five average", value: data.lineBreakLast5Avg === null ? "—" : `${data.lineBreakLast5Avg}` }] }}>
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
      ) : null}
      <div className="mt-4 flex items-center justify-between border-t border-wire-2 pt-2 text-[11.5px] font-semibold"><span className="text-text-faint">vs last 5 matches</span><span className={cn(delta !== null && delta > 0 ? "text-cream" : "text-text-faint")}>{delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta}`}</span></div>
      <Honesty confirmed={data.lineBreakConfirmed} detected={data.lineBreaks.length} />
    </Visual>
  );
}

export function LineTimeline({ data, matchId }: { data: LineDefending; matchId: string }) {
  const maxT = Math.max(data.timeline.at(-1)?.t ?? 1, 1);
  const maxH = Math.max(...data.timeline.map((point) => point.height), 50);
  const points = data.timeline.map((point) => `${(point.t / maxT) * 100},${40 - (point.height / maxH) * 36}`).join(" ");
  return (
    <Visual framing="custom" question="Where was our line when they scored?" caption="Line height in metres while defending. Only the shots are marked." info={{ title: "Line at conceded shots", rows: [{ label: "Shots marked", value: `${data.shots.length}`, cream: true }, { label: "Under 30 m", value: `${data.shotsUnder30}` }, { label: "Timeline samples", value: `${data.timeline.length}` }] }}>
      <div className="relative mt-1 h-[120px] border-b border-l border-wire-2" role="img" aria-label={`Defensive line height with ${data.shots.length} conceded shots`}>
        <div className="absolute inset-x-0 bottom-[30%] h-[20%] border-y border-dashed border-cream/20 bg-cream/[.06]" />
        {data.timeline.length > 1 && <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="absolute inset-0 h-full w-full"><polyline points={points} fill="none" stroke="var(--cream)" strokeOpacity=".4" strokeWidth="1" vectorEffect="non-scaling-stroke" /></svg>}
        {data.shots.map((shot, index) => <Link key={shot.id} to="/match/$matchId/match" params={{ matchId }} search={{ t: Math.max(0, shot.t - 2) }} aria-label={`Watch conceded ${shot.goal ? "goal" : "shot"} ${index + 1}`} className="tap absolute top-1/2 z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center" style={{ left: `${(shot.t / maxT) * 100}%` }}><span className="block h-3.5 w-3.5 rotate-45 bg-quality-bad" /></Link>)}
      </div>
      <div className="mt-1 flex justify-between text-[10px] font-semibold text-text-faint"><span>0'</span><span>45'</span><span>90'</span></div>
      <p className={cn("mt-3 border-l-[3px] border-cream bg-surface-2 px-3 py-2.5 text-[12.5px]", data.shots.length > 0 && data.shotsUnder30 / data.shots.length >= .5 ? "text-cream" : "text-text-dim")}>{data.shots.length ? `${data.shotsUnder30} of ${data.shots.length} shots happened when our line was under 30 m.` : "No conceded shots could be matched to the line."}</p>
      <Honesty confirmed={data.shotConfirmed} detected={data.shots.length} />
    </Visual>
  );
}

export function DeepAnswer({ data }: { data: LineDefending }) {
  const delta = data.medianM !== null && data.usualM !== null ? data.usualM - data.medianM : null;
  const answer = delta === null ? "—" : delta > 4 ? "Yes" : delta >= 2 ? "Sometimes" : "No";
  const tone = answer === "Yes" ? "border-quality-bad/50 bg-quality-bad/15 text-quality-bad" : answer === "Sometimes" ? "border-quality-risky/50 bg-quality-risky/15 text-quality-risky" : answer === "No" ? "border-quality-good/50 bg-quality-good/15 text-quality-good" : "border-wire bg-surface-2 text-text-faint";
  return (
    <Visual framing="custom" question="Did we defend too deep?" caption="A direct answer based on this match versus our usual line." info={{ title: "Defensive depth", rows: [{ label: "Our median", value: data.medianM === null ? "—" : `${data.medianM} m`, cream: true }, { label: "Usual", value: data.usualM === null ? "—" : `${data.usualM} m` }] }}>
      <span className={cn("display-i inline-flex min-h-11 items-center rounded-full border px-6 text-[24px]", tone)}>{answer}</span>
      <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-text-dim">{`We defended lower than our usual ${data.usualM} m average for ${data.belowUsualPct}% of their possession.`}</p>
      <p className="mt-2 text-[11px] text-text-faint">Our median: {data.medianM === null ? "—" : `${data.medianM} m`} · Usual: {data.usualM === null ? "—" : `${data.usualM} m`}</p>
      <Honesty confirmed={data.shotConfirmed} detected={data.shots.length} />
    </Visual>
  );
}
