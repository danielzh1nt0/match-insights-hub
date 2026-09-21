import { Link } from "@tanstack/react-router";
import { createContext, useContext, useState } from "react";
import type { Period } from "./chrome";
import type { ReviewedEvent } from "@/lib/event-reviews";
import type { LineDefending, PlayerStat, StatsFile, TeamKey, Territory, Thresholds } from "@/lib/match-analysis";
import type { Frame, MatchDataFile } from "@/lib/match-source";
import { cn } from "@/lib/utils";
import { DeepAnswer, LineBreakHero, LineTimeline } from "./line-break-cards";
import { Button } from "./primitives";
import { StatsTeamPill, type StatsTeamIdentity } from "./stats-team-selector";

type Props = {
  tab: string;
  players: PlayerStat[];
  stats: StatsFile | undefined;
  file: MatchDataFile | undefined;
  events: ReviewedEvent[];
  team: TeamKey;
  scopeBoth: boolean;
  colours: { A: string; B: string };
  matchId: string;
  period: Period;
  territory: Territory | null;
  lineDefending: LineDefending | null;
  thresholds: Thresholds;
  teamA: StatsTeamIdentity;
  teamB: StatsTeamIdentity;
};

type Point = { x: number; y: number };
type Pass = Record<string, unknown>;
const finite = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const teamRow = (stats: StatsFile | undefined, team: TeamKey) => (stats?.teams ?? []).find((row: any) => row?.team === team) as Record<string, unknown> | undefined;
const value = (row: Record<string, unknown> | undefined, key: string) => finite(row?.[key]);
const eventPoint = (event: ReviewedEvent, file?: MatchDataFile): Point | null => {
  const p = event.payload ?? {};
  const x = finite(p["x"] ?? p["px"] ?? p["start_x"]);
  const y = finite(p["y"] ?? p["py"] ?? p["start_y"]);
  if (x !== null && y !== null) return { x: clamp(x > 105 ? x / 19.2 : x), y: clamp(y > 100 ? y / 10.8 : y) };
  const frames=file?.frames??[]; let nearest:Frame|undefined;
  for(const frame of frames){if(!nearest||Math.abs(frame.t-event.t)<Math.abs(nearest.t-event.t))nearest=frame;}
  const metres=nearest?.ball?.m;
  return metres?{x:clamp(metres[0]/105*100),y:clamp(metres[1]/68*100)}:null;
};
const passTeam = (pass: Pass): TeamKey | null => pass["team"] === "A" || pass["team"] === "B" ? pass["team"] : null;
const passTime = (pass: Pass) => finite(pass["t"] ?? pass["time"] ?? pass["start_t"]);
const passPlayer = (pass: Pass, side: "from" | "to") => finite(pass[side] ?? pass[`${side}_id`] ?? (side === "from" ? pass["player_id"] : pass["receiver_id"]));
const passPoint = (pass: Pass, side: "start" | "end"): Point | null => {
  const x = finite(pass[`${side}_x`] ?? pass[side === "start" ? "x" : "x2"] ?? pass[side === "start" ? "from_x" : "to_x"]);
  const y = finite(pass[`${side}_y`] ?? pass[side === "start" ? "y" : "y2"] ?? pass[side === "start" ? "from_y" : "to_y"]);
  return x === null || y === null ? null : { x: clamp(x), y: clamp(y) };
};
const passCompleted = (pass: Pass) => pass["completed"] === true || pass["success"] === true || !["bad_lost", "incomplete"].includes(String(pass["quality"] ?? pass["outcome"] ?? ""));
const periodRange = (file: MatchDataFile | undefined, period: Period) => {
  const end = Math.max(file?.frames.at(-1)?.t ?? 0, file?.events.at(-1)?.t ?? 0, 1);
  return period === "1st" ? [0, end / 2] : period === "2nd" ? [end / 2, end] : [0, end];
};
const inRange = (time: number | null, range: number[]) => time === null || (time >= (range[0] ?? 0) && time <= (range[1] ?? Infinity));
const fmt = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;

type Comparison = { target?: string; opponent?: string; last5?: string; tones?: ["good" | "warn" | "bad" | "neutral", "good" | "warn" | "bad" | "neutral", "good" | "warn" | "bad" | "neutral"] };
type StatsCardContextValue = { identity: StatsTeamIdentity; other: StatsTeamIdentity; both: boolean };
const StatsCardContext = createContext<StatsCardContextValue | null>(null);

function ComparisonRow({ comparison }: { comparison?: Comparison }) {
  const cells = [
    ["Target", comparison?.target ?? "—"],
    ["vs Opponent", comparison?.opponent ?? "—"],
    ["vs Last 5", comparison?.last5 ?? "—"],
  ] as const;
  return <div className="grid grid-cols-3 divide-x divide-wire-2 border-t border-wire-2" aria-label="Comparison"><>{cells.map(([label, amount], index) => <div key={label} className="px-2 py-2 text-right"><span className="block text-[8px] font-bold uppercase text-text-faint">{label}</span><strong className={cn("num mt-0.5 block text-[11px]", comparison?.tones?.[index] === "good" ? "text-reaction-good" : comparison?.tones?.[index] === "warn" ? "text-reaction-warn" : comparison?.tones?.[index] === "bad" ? "text-reaction-bad" : "text-text-dim")}>{amount}</strong></div>)}</></div>;
}

function Card({ question, caption, children, honesty, footer, comparison }: { question: string; caption: string; children: React.ReactNode; honesty?: string; footer?: string; comparison?: Comparison }) {
  const context = useContext(StatsCardContext);
  return <section className="overflow-hidden rounded-[8px] border border-wire bg-surface">
    <div className="px-4 pb-3 pt-3.5">
      {context && <StatsTeamPill identity={context.identity} {...(context.both ? { both: context.other } : {})} />}
      <h2 className="display mt-2 text-[17px] uppercase leading-tight text-cream">{question}</h2>
      <p className="mt-1 text-[11.5px] leading-[1.5] text-text-faint">{caption}</p>
    </div>
    <div className="px-4 pb-3">{children}</div>
    <ComparisonRow {...(comparison ? { comparison } : {})} />
    <div className="flex min-h-9 items-center justify-between gap-3 border-t border-wire-2 px-4 py-2 text-[10.5px] font-medium text-text-faint">
      <span className="inline-flex items-center gap-1.5 before:h-[5px] before:w-[5px] before:shrink-0 before:rounded-full before:bg-text-faint">{honesty ?? "Source: selected match"}</span>
      {footer && <span className="text-right">{footer}</span>}
    </div>
  </section>;
}

function StatsPitch({ children, portrait = false, attackLabel, ariaLabel }: { children?: React.ReactNode; portrait?: boolean; attackLabel: string; ariaLabel: string }) {
  const viewBox = portrait ? "0 0 64 100" : "0 0 100 64";
  return <div className={cn("relative mx-auto w-full", portrait ? "max-w-[300px]" : "max-w-[640px]")}>
    <svg viewBox={viewBox} className="block h-auto w-full rounded-[6px] bg-surface-2" role="img" aria-label={ariaLabel}>
      <rect x="0" y="0" width={portrait ? 64 : 100} height={portrait ? 100 : 64} fill="var(--surface-2)" />
      {portrait ? <g stroke="var(--cream)" strokeOpacity=".3" strokeWidth=".45" fill="none"><rect x="2" y="3" width="60" height="94"/><rect x="25" y="0.5" width="14" height="2.5"/><rect x="25" y="97" width="14" height="2.5"/><line x1="2" y1="50" x2="62" y2="50"/><circle cx="32" cy="50" r="8"/><rect x="14" y="3" width="36" height="12"/><rect x="14" y="85" width="36" height="12"/><line x1="2" y1="33.3" x2="62" y2="33.3" strokeDasharray="2 2"/><line x1="2" y1="66.6" x2="62" y2="66.6" strokeDasharray="2 2"/></g> : <g stroke="var(--cream)" strokeOpacity=".3" strokeWidth=".4" fill="none"><rect x="3" y="2" width="94" height="60"/><rect x=".5" y="25" width="2.5" height="14"/><rect x="97" y="25" width="2.5" height="14"/><line x1="50" y1="2" x2="50" y2="62"/><circle cx="50" cy="32" r="8"/><rect x="3" y="14" width="12" height="36"/><rect x="85" y="14" width="12" height="36"/><line x1="33.3" y1="2" x2="33.3" y2="62" strokeDasharray="2 2"/><line x1="66.6" y1="2" x2="66.6" y2="62" strokeDasharray="2 2"/></g>}
      {children}
    </svg>
    <span className="mt-1.5 block text-right text-[8px] font-bold uppercase text-text-faint">{portrait ? "↑" : "→"} {attackLabel} attack</span>
  </div>;
}

function Pitch({children}:{children?:React.ReactNode}){const context=useContext(StatsCardContext);return <StatsPitch attackLabel={context?.identity.code??"Selected team"} ariaLabel={`${context?.identity.name??"Selected team"} pitch evidence`}>{children}</StatsPitch>}
function PortraitPitch({children}:{children?:React.ReactNode;arrowLabel?:string}){const context=useContext(StatsCardContext);return <StatsPitch portrait attackLabel={context?.identity.code??"Selected team"} ariaLabel={`${context?.identity.name??"Selected team"} pitch evidence`}>{children}</StatsPitch>}

function EmptyTab() {
  return <div className="border border-dashed border-wire px-4 py-10 text-center text-[12.5px] text-text-faint">There is not enough reliable evidence for this view.</div>;
}

function EvidenceUnavailable({ question, caption }: { question: string; caption: string }) {
  return <Card question={question} caption={caption} footer="Evidence threshold not met">
    <div className="flex min-h-28 items-center border-l-2 border-text-faint bg-surface-2 px-4">
      <p className="max-w-[460px] text-[12.5px] leading-relaxed text-text-dim">This match does not contain enough reliable evidence to answer this coaching question.</p>
    </div>
  </Card>;
}

function Control({ stats, team, colours, teamA, teamB, events }: Props) {
  const a = value(teamRow(stats, "A"), "possession_pct");
  const b = value(teamRow(stats, "B"), "possession_pct");
  if (a === null && b === null) return null;
  const own = team === "A" ? a : b;
  const opponent = team === "A" ? b : a;
  const identity = team === "A" ? teamA : teamB;
  const otherIdentity = team === "A" ? teamB : teamA;
  return <Card question="Who controlled the ball?" caption="Share of reliable ball-control time for each team." comparison={{ opponent: opponent === null ? "—" : `${Math.round(opponent)}%`, last5: "—" }} honesty={`${events.filter(event => event.status === "confirmed").length} confirmed · ${events.length} detected`}>
    <strong className="display-i block text-[48px] leading-none text-cream">{own === null ? "—" : `${Math.round(own)}%`}</strong>
    <p className="mt-1 text-[11px] font-semibold text-text-dim">possession · {identity.name}</p>
    <div className="mt-4 flex h-3 overflow-hidden rounded-[3px] bg-surface-3" role="img" aria-label={`${identity.name} ${own ?? 0}%, ${otherIdentity.name} ${opponent ?? 0}%`}>
      <span style={{ width: `${own ?? 0}%`, background: colours[team] }} /><span className="bg-graphite" style={{ width: `${opponent ?? 0}%` }} />
    </div>
    <div className="mt-2 flex justify-between text-[11px] font-semibold text-text-faint"><span>{identity.code} {Math.round(own ?? 0)}%</span><span>{otherIdentity.code} {Math.round(opponent ?? 0)}%</span></div>
  </Card>;
}

function Thirds({ frames, team, colour }: { frames: Frame[]; team: TeamKey; colour: string }) {
  const counts = [0, 0, 0];
  frames.forEach(frame => frame.players.filter(player => player.team === team && player.state !== "stale").forEach(player => { const index = Math.min(2, Math.floor(clamp(player.m[0], 0, 104.99) / 35)); counts[index] = (counts[index] ?? 0) + 1; }));
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (!total) return null;
  return <Card question="Which third did we occupy?" caption="Where our observed players spent their tracked time." honesty={`${frames.length} tracked frames`}>
    <Pitch><g>{counts.map((count, index) => <g key={index}><rect x={2 + index * 32} y="2" width="32" height="60" fill={colour} opacity={0.08 + count / Math.max(...counts) * .38} /><text x={18 + index * 32} y="35" textAnchor="middle" fill="var(--cream)" fontSize="5" fontWeight="800">{Math.round(count / total * 100)}%</text></g>)}</g></Pitch>
    <div className="mt-2 grid grid-cols-3 text-center text-[10px] font-bold uppercase text-text-faint"><span>Own third</span><span>Middle</span><span>Final third</span></div>
  </Card>;
}

function SequenceLength({ stats, team }: Props) {
  const sequences = (stats?.sequences ?? []).filter((sequence: any) => !sequence?.team || sequence.team === team);
  const lengths = sequences.map((sequence: any) => finite(sequence?.passes ?? sequence?.pass_count ?? sequence?.length)).filter((n): n is number => n !== null);
  const rowMedian = value(teamRow(stats, team), "passes_per_sequence");
  if (!lengths.length && rowMedian === null) return null;
  const buckets = [lengths.filter(n => n <= 2).length, lengths.filter(n => n >= 3 && n <= 5).length, lengths.filter(n => n >= 6 && n <= 9).length, lengths.filter(n => n >= 10).length];
  return <Card question="How long did we keep it?" caption="Possession spells grouped by the number of passes." {...(lengths.length ? { honesty: `${lengths.length} sequences` } : {})}>
    <strong className="display-i block text-[56px] leading-none text-cream">{rowMedian === null ? "—" : Math.round(rowMedian * 10) / 10}</strong><span className="text-[11px] font-semibold text-text-faint">passes per spell</span>
    {lengths.length > 0 && <div className="mt-5 grid grid-cols-4 items-end gap-2" role="img" aria-label="Sequence length distribution">{buckets.map((count, index) => <div key={index} className="text-center"><span className="num text-[11px] text-text-dim">{count}</span><div className="mt-1 h-20 bg-surface-2 flex items-end"><span className="block w-full bg-cream/70" style={{ height: `${Math.max(3, count / Math.max(...buckets) * 100)}%` }} /></div><span className="mt-1 block text-[9px] text-text-faint">{["1–2", "3–5", "6–9", "10+"][index]}</span></div>)}</div>}
  </Card>;
}

function deriveRuns(frames: Frame[], team: TeamKey) {
  const runs: { id: number; start: Point; end: Point; speed: number; withBall: boolean }[] = [];
  const step = Math.max(1, Math.round(frames.length / 80));
  for (let i = step; i < frames.length; i += step) {
    const before = frames[i - step]; const after = frames[i]; if (!before || !after) continue;
    for (const player of after.players.filter(p => p.team === team && p.state === "observed")) {
      const previous = before.players.find(p => p.team === team && p.id === player.id && p.state === "observed");
      if (!previous) continue;
      const distance = Math.hypot(player.m[0] - previous.m[0], player.m[1] - previous.m[1]);
      const dt = Math.max(.1, after.t - before.t); const speed = distance / dt;
      if (speed < 5.5 || distance < 3) continue;
      runs.push({ id: player.id, start: { x: clamp(previous.m[0] / 105 * 100), y: clamp(previous.m[1] / 68 * 100) }, end: { x: clamp(player.m[0] / 105 * 100), y: clamp(player.m[1] / 68 * 100) }, speed, withBall: after.possession === team && after.carrier === player.id });
    }
  }
  return runs.slice(0, 40);
}

function Runs({ frames, team, colour }: { frames: Frame[]; team: TeamKey; colour: string }) {
  const runs = deriveRuns(frames, team); if (!runs.length) return null;
  return <Card question="Where did our runs go?" caption="Five fastest tracked runs. Solid had the ball; dashed were off it." honesty={`${runs.length} tracked runs`}>
    <PortraitPitch arrowLabel="attack">{[...runs].sort((a,b)=>b.speed-a.speed).slice(0,5).map((run, index) => <line key={`${run.id}-${index}`} x1={run.start.y / 100 * 64} y1={100 - run.start.x} x2={run.end.y / 100 * 64} y2={100 - run.end.x} stroke={colour} strokeWidth={run.withBall ? 1.4 : .8} strokeDasharray={run.withBall ? undefined : "2 2"} opacity={clamp(.3 + (run.speed - 5.5) / 5, .3, 1)} />)}</PortraitPitch>
  </Card>;
}

function Distance({ players, colour }: { players: PlayerStat[]; colour: string }) {
  const ranked = [...players].filter(p => p.minutes > 0 && p.distanceM > 0).sort((a,b) => b.distanceM / b.minutes - a.distanceM / a.minutes).slice(0, 10); if (!ranked.length) return null;
  const max = Math.max(...ranked.map(p => p.distanceM / p.minutes));
  return <Card question="Who covered the ground?" caption="Sorted by distance per visible minute. Bright segment marks the top-intensity share." honesty={`${ranked.length} observed players`}>
    <div className="divide-y divide-wire-2">{ranked.map(player => { const rate = player.distanceM / player.minutes; return <div key={`${player.team}-${player.id}`} className="grid grid-cols-[32px_1fr_62px] items-center gap-2 py-2"><span className="num text-center text-[14px]">{player.id}</span><div className="relative h-3 overflow-hidden rounded-[3px] bg-surface-2"><span className="absolute inset-y-0 left-0 opacity-30" style={{ width: `${rate/max*100}%`, background: colour }} /><span className="absolute inset-y-0 left-0" style={{ width: `${rate/max*35}%`, background: colour }} /></div><span className="num text-right text-[12px]">{Math.round(rate)} <small className="text-[9px] text-text-faint">m/min</small></span></div>; })}</div>
  </Card>;
}

function PressMap({ events, team, matchId, colour, file }: Props & { colour: string }) {
  const press = events.filter(event => event.team === team && ["pressure", "press", "turnover_won", "high_turnover"].includes(event.type)).map(event => ({ event, point: eventPoint(event,file) })).filter((item): item is { event: ReviewedEvent; point: Point } => item.point !== null);
  if (!press.length) return null;
  return <Card question="Where did we press?" caption="Each dot is one pressure or regain at the ball position." honesty={`${press.filter(p => p.event.status === "confirmed").length} confirmed · ${press.length} detected`}>
    <Pitch>{press.map(({event, point}) => <Link key={event.id} to="/match/$matchId/match" params={{matchId}} search={{t:event.t}} aria-label={`Watch pressure at ${fmt(event.t)}`}><circle cx={point.x} cy={point.y/100*64} r="1.8" fill={colour} opacity=".82" /></Link>)}</Pitch>
  </Card>;
}

function CounterPress({ events, team, stats, matchId, teamA, teamB }: Props) {
  const losses = events.filter(event => event.team === team && event.type === "turnover_lost");
  const reactions = losses.map(event => ({ event, seconds: finite(event.payload?.["time_to_press"]) })).filter((item): item is {event: ReviewedEvent; seconds: number} => item.seconds !== null);
  if (!reactions.length) return null;
  const sorted = reactions.map(r=>r.seconds).sort((a,b)=>a-b); const median = sorted[Math.floor(sorted.length/2)] ?? 0; const row = teamRow(stats, team);
  const identity=team==="A"?teamA:teamB;
  return <Card question="How fast did we react?" caption={`${identity.name} · ${losses.length} losses`} comparison={{target:"2 s",opponent:"—",last5:"—",tones:[median<=2?"good":"bad","neutral","neutral"]}} honesty={`${losses.filter(e=>e.status==="confirmed").length} confirmed · ${losses.length} detected`}>
    <div className="relative h-[108px] border-b border-wire" role="img" aria-label={`${identity.name} reaction time from zero to eight seconds`}><div className="absolute inset-x-0 top-14 h-px bg-wire" /><span className="absolute top-1 -translate-x-1/2 rounded-[3px] bg-surface-3 px-1.5 py-1 text-[9px] text-text-dim" style={{left:"25%"}}>Target 2 s</span><span className="absolute top-7 -translate-x-1/2 rounded-[3px] bg-cream px-1.5 py-1 text-[9px] text-ink" style={{left:`${clamp(median/8*100)}%`}}>Median {Math.round(median*100)/100} s</span>{reactions.map(({event,seconds}) => <Link key={event.id} to="/match/$matchId/match" params={{matchId}} search={{t:event.t}} aria-label={`Watch ${seconds} second reaction`} className="tap absolute top-[33px] -translate-x-1/2" style={{left:`${clamp(seconds/8*100)}%`}}><span className={cn("block h-3 w-3 rounded-full border border-bg",seconds<=2?"bg-quality-good":seconds<=4?"bg-quality-risky":"bg-quality-bad")} /></Link>)}<div className="absolute bottom-1 left-0 right-0 flex justify-between text-[9px] text-text-faint"><span>0 s</span><span>2 s</span><span>4 s</span><span>6 s</span><span>8 s</span></div></div>
    <div className="grid grid-cols-3 divide-x divide-wire-2 border border-wire-2"><Metric value={`${Math.round(value(row,"pressed_within_2s_pct") ?? 0)}%`} label="within 2 s"/><Metric value={`${Math.round(value(row,"regained_within_5s_pct") ?? 0)}%`} label="back in 5 s"/><Metric value={`${Math.round(median*10)/10}s`} label="median"/></div>
  </Card>;
}

function Metric({value,label}:{value:string;label:string}) { return <div className="p-2 text-center"><strong className="display-i block text-[24px] text-cream">{value}</strong><span className="text-[9px] uppercase text-text-faint">{label}</span></div>; }

function ShapeMultiples({ territory, colour, identity }: { territory: Territory; colour: string; identity: StatsTeamIdentity }) {
  const snapshots = territory.snapshots.filter(snapshot => snapshot.players.length >= 4); if (!snapshots.length) return null;
  const ids=[...new Set(snapshots.flatMap(snapshot=>snapshot.players.map(player=>player.id)))];
  const averages=ids.map(id=>{const points=snapshots.flatMap(snapshot=>snapshot.players.filter(player=>player.id===id));return points.length?{id,x:points.reduce((sum,p)=>sum+p.x,0)/points.length,y:points.reduce((sum,p)=>sum+p.y,0)/points.length}:null}).filter((point):point is {id:string;x:number;y:number}=>point!==null);
  if(averages.length<4)return null;
  const cx=averages.reduce((sum,p)=>sum+p.x,0)/averages.length,cy=averages.reduce((sum,p)=>sum+p.y,0)/averages.length;
  const polygon=[...averages].sort((a,b)=>Math.atan2(a.y-cy,a.x-cx)-Math.atan2(b.y-cy,b.x-cx)).map(point=>`${point.y/100*64},${100-point.x}`).join(" ");
  const length=Math.round(snapshots.reduce((sum,s)=>sum+s.lengthM,0)/snapshots.length*10)/10;
  const width=Math.round(snapshots.reduce((sum,s)=>sum+s.widthM,0)/snapshots.length*10)/10;
  return <Card question="How did our shape change?" caption={`Average shape · ${identity.name}`} comparison={{target:"—",opponent:"—",last5:"—"}} honesty={`${territory.frameCount} tracked frames`}>
    <StatsPitch portrait attackLabel={identity.code} ariaLabel={`${identity.name} average shape on the pitch`}><polygon points={polygon} fill={colour} fillOpacity=".25" stroke={colour} strokeWidth=".8"/><path d={`M${cy/100*64-2},${100-cx}h4M${cy/100*64},${98-cx}v4`} stroke={colour} strokeWidth="1"/>{averages.map(point=><circle key={point.id} cx={point.y/100*64} cy={100-point.x} r="1.5" fill={colour}/>)}</StatsPitch>
    <div className="mt-3 grid grid-cols-3 divide-x divide-wire-2 border border-wire-2"><Metric value={`${length} m`} label="Length"/><Metric value={`${width} m`} label="Width"/><Metric value={`${territory.lineHeightM || "—"}${territory.lineHeightM?" m":""}`} label="Line height"/></div>
  </Card>;
}

function ShapeOutcome({ lineDefending, colour }: { lineDefending: LineDefending; colour: string }) {
  const states = lineDefending.states; if (!states.length) return null; const worst = [...states].sort((a,b)=>b.shots-a.shots)[0]?.key;
  return <Card question="In which shape did we suffer?" caption="Defensive states compared by opponent shots and goals." honesty={`${lineDefending.timeline.length} shape samples`}>
    <div className="grid grid-cols-3 gap-2" role="img" aria-label="Defensive shape outcomes">{states.map(state=><div key={state.key} className={cn("border bg-surface-2 p-2",state.key===worst?"border-quality-bad":"border-wire")}><div className="flex justify-between"><strong className="display text-[12px] uppercase">{state.key}</strong><span className="num text-[11px] text-text-faint">{state.height}m</span></div><svg viewBox="0 0 70 46" className="my-2 w-full"><rect x="1" y="1" width="68" height="44" fill="none" stroke="var(--wire)"/><rect x={state.key==="low"?18:state.key==="mid"?14:10} y={state.key==="high"?7:12} width={state.key==="low"?34:state.key==="mid"?42:50} height={state.key==="low"?22:state.key==="mid"?28:32} fill={colour} fillOpacity=".16" stroke={colour} strokeDasharray="2 2"/></svg><div className="grid grid-cols-2 gap-1 text-center"><Metric value={`${state.shots}`} label="shots"/><Metric value={`${state.goals}`} label="goals"/></div></div>)}</div>
  </Card>;
}

function ShotMap({ stats, colours, matchId, events, file }: Props) {
  const metricShots = Array.isArray(stats?.metrics?.["shots"]) ? stats.metrics["shots"] as Record<string,unknown>[] : [];
  const eventShots=events.filter(event=>event.type==="shot"||event.type==="goal").map(event=>{const point=eventPoint(event,file);return {id:event.id,t:event.t,team:event.team,x:point?.x,y:point?.y,goal:event.type==="goal",on_target:event.payload?.["on_target"]===true}});
  const shots: Record<string, unknown>[] = metricShots.length ? metricShots : eventShots; if (!shots.length) return <EvidenceUnavailable question="Where did shots come from?" caption="The location and outcome of each reliable shot."/>;
  return <Card question="Where did shots come from?" caption="Filled means on target. A cream ring marks a goal." honesty={`${shots.length} shots`}>
    <Pitch>{shots.map((shot,index)=>{const shotTeam:TeamKey=shot["team"]==="B"?"B":"A";const x=finite(shot["x"]??shot["px"])??(shotTeam==="A"?25:75);const y=finite(shot["y"]??shot["py"])??50;const t=finite(shot["t"])??0;const goal=shot["goal"]===true;const on=goal||shot["on_target"]===true;return <Link key={String(shot["id"]??index)} to="/match/$matchId/match" params={{matchId}} search={{t}} aria-label={`Watch ${shotTeam} shot`}><circle cx={clamp(x)} cy={clamp(y)/100*64} r={goal?2.8:2.2} fill={on?colours[shotTeam]:"var(--surface-2)"} stroke={goal?"var(--cream)":colours[shotTeam]} strokeWidth={goal?1.2:.8}/></Link>})}</Pitch>
  </Card>;
}

function ShotSummary({ stats, team, events }: Props) {
  const metricShots = (Array.isArray(stats?.metrics?.["shots"]) ? stats.metrics["shots"] : []).filter((shot:any)=>shot?.team===team);
  const shots = metricShots.length?metricShots:events.filter(event=>event.team===team&&(event.type==="shot"||event.type==="goal")).map(event=>({goal:event.type==="goal",on_target:event.payload?.["on_target"]===true,x:event.payload?.["x"]})); if (!shots.length) return <EvidenceUnavailable question="What did our shooting produce?" caption="Shot volume, accuracy and penalty-area share."/>;
  const on = shots.filter((shot:any)=>shot?.on_target||shot?.goal).length; const goals=shots.filter((shot:any)=>shot?.goal).length; const box=shots.filter((shot:any)=>(finite(shot?.x)??50)<18||(finite(shot?.x)??50)>82).length;
  return <Card question="What did our shooting produce?" caption="The shot total, accuracy and penalty-area share without a score dial." honesty={`${shots.length} shot moments`}><div className="grid grid-cols-3 divide-x divide-wire border border-wire"><Metric value={`${shots.length}`} label="shots"/><Metric value={`${on}`} label="on target"/><Metric value={`${goals}`} label="goals"/></div><p className="mt-3 text-[12px] text-text-dim">{box} of {shots.length} attempts came from inside the penalty area.</p></Card>;
}

function EntriesConceded({ events, team, matchId, file }: Props) {
  const opponent=team==="A"?"B":"A"; const entries=events.filter(e=>e.team===opponent&&["final_third_entry","entry","shot","goal"].includes(e.type)).map(event=>({event,point:eventPoint(event,file)})).filter((x):x is {event:ReviewedEvent;point:Point}=>x.point!==null); if(!entries.length)return <EvidenceUnavailable question="Where did they get in?" caption="Opponent entries into our defensive third."/>;
  const lanes=[0,0,0,0,0];entries.forEach(({point})=>{const index=Math.min(4,Math.floor(point.y/20));lanes[index]=(lanes[index]??0)+1});
  return <Card question="Where did they get in?" caption="Opponent entries into our defensive third, grouped into five lanes." honesty={`${entries.length} entries and shots`}>
    <Pitch>{entries.slice(0,5).map(({event,point})=><Link key={event.id} to="/match/$matchId/match" params={{matchId}} search={{t:event.t}} aria-label={`Watch entry at ${fmt(event.t)}`}><line x1={point.x} y1={point.y/100*64} x2={Math.max(4,point.x-10)} y2={point.y/100*64} stroke="var(--graphite)" strokeWidth="1.2"/><circle cx={Math.max(4,point.x-10)} cy={point.y/100*64} r="1.8" fill={event.type==="shot"||event.type==="goal"?"var(--quality-bad)":"var(--text-faint)"}/></Link>)}</Pitch>
    <div className="mt-3 grid h-20 grid-cols-5 items-end gap-1" role="img" aria-label="Entries by lane">{lanes.map((count,index)=><div key={index} className="text-center"><span className="num text-[10px] text-text-dim">{count}</span><span className="mt-1 block bg-cream/50" style={{height:`${Math.max(2,count/Math.max(...lanes)*48)}px`}}/><span className="mt-1 block text-[8px] uppercase text-text-faint">{["Left","Half","Centre","Half","Right"][index]}</span></div>)}</div>
  </Card>;
}

function PlayerCards({ players, stats, matchId, colours }: Props) {
  const raw = stats?.players ?? []; if (!players.length) return null;
  return <div className="grid gap-3 md:grid-cols-2">{players.map(player=>{const detail=raw.find((p:any)=>p?.team===player.team&&p?.id===player.id)??{};const completion=player.passes?Math.round(player.passesCompleted/player.passes*100):0;const risky=finite(detail?.risky_passes??detail?.passes_risky)??0;const lost=Math.max(0,player.passes-player.passesCompleted);return <Link key={`${player.team}-${player.id}`} to="/match/$matchId/player/$playerId" params={{matchId,playerId:String(player.id)}} className="block border border-wire bg-surface p-4"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-[8px] display-i text-[22px] text-bg" style={{background:colours[player.team]}}>{player.id}</span><div><h2 className="display text-[16px] uppercase">Player {player.id}</h2><p className="text-[11px] text-text-faint">{player.minutes} visible minutes</p></div></div><div className="mt-4 grid grid-cols-5 gap-1">{[[Math.round(player.distanceM/Math.max(player.minutes,1)),"m/min"],[player.touches,"touches"],[`${player.passesCompleted}/${player.passes}`,"passes"],[player.betterOptions,"options"],[completion,"quality"]].map(([v,l])=><div key={l} className="bg-surface-2 p-2 text-center"><strong className="num block text-[14px] text-cream">{v}</strong><span className="text-[8px] uppercase text-text-faint">{l}</span></div>)}</div><div className="mt-3 flex h-2 overflow-hidden rounded-[2px] bg-surface-3" aria-label={`${completion}% completed, ${risky} risky, ${lost} lost`}><span className="bg-quality-good" style={{width:`${completion}%`}}/><span className="bg-quality-risky" style={{width:`${Math.min(100-completion,risky)}%`}}/><span className="bg-quality-bad" style={{flex:lost}}/></div></Link>})}</div>;
}

function passSet(stats: StatsFile|undefined,team:TeamKey,range:number[]){return (stats?.passes??[]).filter((pass:any)=>passTeam(pass)===team&&inRange(passTime(pass),range)) as Pass[];}
type PairCount={from:number;to:number;total:number;complete:number;gain:number;start:Point|null;end:Point|null};
function pairCounts(passes:Pass[]){const map=new Map<string,PairCount>();passes.forEach(pass=>{const from=passPlayer(pass,"from"),to=passPlayer(pass,"to");if(from===null||to===null)return;const key=`${from}-${to}`,start=passPoint(pass,"start"),end=passPoint(pass,"end"),item=map.get(key)??{from,to,total:0,complete:0,gain:0,start:null,end:null};item.total+=1;if(passCompleted(pass))item.complete+=1;if(start&&end){item.gain+=end.x-start.x;item.start={x:(item.start?.x??0)+start.x,y:(item.start?.y??0)+start.y};item.end={x:(item.end?.x??0)+end.x,y:(item.end?.y??0)+end.y};}map.set(key,item)});return [...map.values()].map(item=>({...item,start:item.start?{x:item.start.x/item.total,y:item.start.y/item.total}:null,end:item.end?{x:item.end.x/item.total,y:item.end.y/item.total}:null})).sort((a,b)=>b.total-a.total);}

function LaneEffectiveness({passes,colour,identity}:{passes:Pass[];colour:string;identity:StatsTeamIdentity}){const pairs=pairCounts(passes);const best=[...pairs].filter(pair=>pair.total>0).sort((a,b)=>b.complete/b.total-a.complete/a.total||b.total-a.total).slice(0,3);const worst=[...pairs].filter(pair=>pair.total>0&&!best.includes(pair)).sort((a,b)=>a.complete/a.total-b.complete/b.total||b.total-a.total).slice(0,3);const rows=[...best,...worst];const [selected,setSelected]=useState(0);const lane=rows[selected]??rows[0];if(!lane)return <EvidenceUnavailable question="Which lanes worked?" caption="Lane use and completion quality."/>;const renderRow=(pair:PairCount,index:number)=><Button key={`${pair.from}-${pair.to}`} variant="ghost" onClick={()=>setSelected(index)} aria-pressed={selected===index} className={cn("grid h-11 w-full grid-cols-[28px_1fr_auto] gap-3 rounded-none px-2 text-left",index%2===0?"bg-surface":"bg-surface-2",selected===index&&"border-l-2 border-cream")}><span className="text-[18px]" style={{color:colour}}>→</span><span className="num text-[14px] text-text">{pair.from} → {pair.to}</span><span className="text-right"><strong className={cn("num block text-[12px]",pair.complete/pair.total>=.7?"text-reaction-good":pair.complete/pair.total>=.5?"text-reaction-warn":"text-reaction-bad")}>{pair.complete}/{pair.total}</strong><small className="text-[10px] text-text-faint">{Math.round(pair.gain/Math.max(pair.total,1))} m avg</small></span></Button>;return <Card question="Which lanes worked?" caption="Tap a lane to isolate the real pass route." comparison={{target:"—",opponent:"—",last5:"—"}} honesty={`${passes.length} passes`}><StatsPitch portrait attackLabel={identity.code} ariaLabel={`${identity.name} selected passing lane`}>{lane.start&&lane.end&&<><line x1={lane.start.y/100*64} y1={100-lane.start.x} x2={lane.end.y/100*64} y2={100-lane.end.x} stroke={colour} strokeWidth="1.8"/><circle cx={lane.start.y/100*64} cy={100-lane.start.x} r="3" fill={colour}/><circle cx={lane.end.y/100*64} cy={100-lane.end.x} r="3" fill={colour}/><text x={lane.start.y/100*64} y={100-lane.start.x+1} textAnchor="middle" fontSize="3" fill="var(--ink)" fontWeight="700">{lane.from}</text><text x={lane.end.y/100*64} y={100-lane.end.x+1} textAnchor="middle" fontSize="3" fill="var(--ink)" fontWeight="700">{lane.to}</text></>}</StatsPitch><h3 className="section-kicker mt-3">Best lanes</h3><div className="mt-1">{best.map((pair,index)=>renderRow(pair,index))}</div><h3 className="section-kicker mt-3 border-t border-wire pt-3">Worst lanes</h3><div className="mt-1">{worst.map((pair,index)=>renderRow(pair,best.length+index))}</div></Card>}

function BetterOption({events,team,matchId,colour,teamA,teamB}:Props&{colour:string}){const moments=events.filter(e=>e.team===team&&e.type==="better_option");if(!moments.length)return null;const event=moments[0];if(!event)return null;const p=event.payload??{};const sx=finite(p["x"]??p["start_x"]),sy=finite(p["y"]??p["start_y"]),px=finite(p["played_x"]??p["end_x"]),py=finite(p["played_y"]??p["end_y"]),bx=finite(p["better_x"]??p["target_x"]),by=finite(p["better_y"]??p["target_y"]);if([sx,sy,px,py,bx,by].some(v=>v===null))return <EvidenceUnavailable question="Where were we open?" caption="The available moment has no reliable pitch coordinates."/>;const start={x:sx as number,y:sy as number},played={x:px as number,y:py as number},better={x:bx as number,y:by as number};const carrier=finite(p["carrier"]??p["from"]??p["player_id"]),receiver=finite(p["receiver"]??p["to"]??p["receiver_id"]),target=finite(p["better_receiver"]??p["target_player"]??p["better_to"]);const metres=(a:Point,b:Point)=>Math.round(Math.hypot((b.x-a.x)*1.05,(b.y-a.y)*.68));const direction=(a:Point,b:Point)=>b.x-a.x>4?"forward":b.x-a.x<-4?"backward":"across";const identity=team==="A"?teamA:teamB;const shirt=(n:number|null)=>n===null?"?":String(n);return <Card question="Where were we open?" caption={`${identity.name} · #${shirt(carrier)} with the ball`} comparison={{target:"—",opponent:"—",last5:"—"}} honesty={`${moments.filter(e=>e.status==="confirmed").length} confirmed · ${moments.length} detected`}><Link to="/match/$matchId/match" params={{matchId}} search={{t:event.t}} aria-label="Watch better option"><PortraitPitch><circle cx={start.y/100*64} cy={100-start.x} r="3.5" fill={colour}/><circle cx={played.y/100*64} cy={100-played.x} r="2.8" fill={colour}/><circle cx={better.y/100*64} cy={100-better.x} r="3" fill="var(--surface-2)" stroke="var(--cream)" strokeDasharray="1.4 1"/><line x1={start.y/100*64} y1={100-start.x} x2={played.y/100*64} y2={100-played.x} stroke={colour} strokeWidth="1.5"/><line x1={start.y/100*64} y1={100-start.x} x2={better.y/100*64} y2={100-better.x} stroke="var(--cream)" strokeDasharray="2 2" strokeWidth="1.2"/>{[[start,carrier,"var(--ink)"],[played,receiver,"var(--ink)"],[better,target,"var(--cream)"]].map(([point,id,fill],index)=><text key={index} x={(point as Point).y/100*64} y={100-(point as Point).x+1} textAnchor="middle" fontSize="3" fontWeight="800" fill={fill as string}>{shirt(id as number|null)}</text>)}</PortraitPitch></Link><div className="mt-3 space-y-1 text-[12px]"><p className="text-text-dim">Pass played: #{shirt(carrier)} → #{shirt(receiver)}, {direction(start,played)}, {metres(start,played)} m.</p><p className="text-cream">Better option: #{shirt(carrier)} → #{shirt(target)}, {direction(start,better)}, {metres(start,better)} m.</p></div></Card>}

function PassNetwork({passes,colour,identity,opponentPasses}:{passes:Pass[];colour:string;identity:StatsTeamIdentity;opponentPasses:number}){const pairs=pairCounts(passes).filter(pair=>pair.start&&pair.end).slice(0,14);if(!pairs.length)return null;const ids=[...new Set(pairs.flatMap(p=>[p.from,p.to]))].slice(0,11);const touches=new Map<number,number>(),sum=new Map<number,{x:number;y:number;n:number}>();pairs.forEach(p=>{touches.set(p.from,(touches.get(p.from)??0)+p.total);touches.set(p.to,(touches.get(p.to)??0)+p.total);if(p.start){const s=sum.get(p.from)??{x:0,y:0,n:0};s.x+=p.start.x;s.y+=p.start.y;s.n++;sum.set(p.from,s)}if(p.end){const s=sum.get(p.to)??{x:0,y:0,n:0};s.x+=p.end.x;s.y+=p.end.y;s.n++;sum.set(p.to,s)}});const pos=new Map(ids.flatMap(id=>{const s=sum.get(id);return s?[[id,{x:s.x/s.n,y:s.y/s.n/100*64}] as const]:[]}));const [selected,setSelected]=useState<string|null>(null);return <Card question="How did we build?" caption={`Pass network · ${identity.name} · ${passes.length} passes`} comparison={{opponent:`${opponentPasses} passes`,last5:"—"}} honesty={`${passes.length} pass records`}><div className="relative"><Pitch>{pairs.map(pair=>{const a=pos.get(pair.from),b=pos.get(pair.to),key=`${pair.from}-${pair.to}`;return a&&b?<g key={key} onClick={()=>setSelected(key)} className="cursor-pointer" role="button" aria-label={`${pair.from} to ${pair.to}, ${pair.total} passes`}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--cream)" strokeOpacity={selected===key?.9:.15+.55*pair.complete/pair.total} strokeWidth={Math.min(3,.3+pair.total/3)}/></g>:null})}{ids.map(id=>{const p=pos.get(id);if(!p)return null;const r=3+Math.min(4,(touches.get(id)??0)/8);return <g key={id}><circle cx={p.x} cy={p.y} r={r} fill={colour}/><text x={p.x} y={p.y+1.4} textAnchor="middle" fontSize="3.6" fontWeight="800" fill="var(--bg)">{id}</text></g>})}</Pitch>{selected&&<span className="absolute right-2 top-2 rounded-[3px] bg-cream px-2 py-1 text-[10px] font-bold text-ink">{pairs.find(p=>`${p.from}-${p.to}`===selected)?.total} passes</span>}</div></Card>}

function PassMap({passes,matchId,colour}:{passes:Pass[];matchId:string;colour:string}){const all=passes.map(pass=>({pass,start:passPoint(pass,"start"),end:passPoint(pass,"end")})).filter((x):x is {pass:Pass;start:Point;end:Point}=>x.start!==null&&x.end!==null);const mapped=all.slice(0,5);if(!mapped.length)return <EvidenceUnavailable question="Where did our passes go?" caption="Release and reception locations for reliable passes."/>;return <Card question="Where did our passes go?" caption="The first five located passes; open the log for the full sequence." honesty={`${all.length} located passes`}><Pitch>{mapped.map(({pass,start,end},index)=>{const t=passTime(pass)??0;return <Link key={index} to="/match/$matchId/match" params={{matchId}} search={{t}} aria-label={`Watch pass at ${fmt(t)}`}><line x1={start.x} y1={start.y/100*64} x2={end.x} y2={end.y/100*64} stroke={passCompleted(pass)?colour:"var(--text-faint)"} strokeWidth=".65" strokeDasharray={passCompleted(pass)?undefined:"2 1"} opacity=".55"/></Link>})}</Pitch></Card>}

function Interceptions({events,team,matchId,colour,file}:Props&{colour:string}){const items=events.filter(e=>e.team===team&&["interception","pass_intercepted","turnover_won"].includes(e.type)).map(event=>({event,point:eventPoint(event,file)})).filter((x):x is {event:ReviewedEvent;point:Point}=>x.point!==null);if(!items.length)return null;return <Card question="Where did we cut passes out?" caption="Each mark is an interception or pass-led regain." honesty={`${items.length} moments`}><Pitch>{items.map(({event,point})=><Link key={event.id} to="/match/$matchId/match" params={{matchId}} search={{t:event.t}} aria-label={`Watch interception at ${fmt(event.t)}`}><g transform={`translate(${point.x} ${point.y/100*64})`}><path d="M-2 -2 2 2M2 -2-2 2" stroke={colour} strokeWidth="1.2"/><path d="M2 0h5" stroke="var(--cream)" strokeWidth=".7"/></g></Link>)}</Pitch></Card>}

function PassLog({passes,matchId}:{passes:Pass[];matchId:string}){if(!passes.length)return null;return <Card question="Which passes should we review?" caption="A chronological log of player, direction, quality and outcome." honesty={`${passes.length} passes in this period`}><div className="divide-y divide-wire-2">{passes.slice(0,30).map((pass,index)=>{const t=passTime(pass)??0;const from=passPlayer(pass,"from"),to=passPlayer(pass,"to");const s=passPoint(pass,"start"),e=passPoint(pass,"end");const direction=s&&e?e.x-s.x>8?"Forward":e.x-s.x<-8?"Back":"Across":"Pass";return <Link key={index} to="/match/$matchId/match" params={{matchId}} search={{t}} className="grid min-h-11 grid-cols-[44px_1fr_auto] items-center gap-2 py-1.5"><span className="num text-[11px] text-text-faint">{fmt(t)}</span><span className="text-[12px]">{from??"—"} → {to??"—"} <small className="ml-1 text-text-faint">{direction}</small></span><span className={cn("text-[10px] font-bold uppercase",passCompleted(pass)?"text-quality-good":"text-quality-bad")}>{passCompleted(pass)?"Complete":"Lost"}</span></Link>})}</div></Card>}

export function StatsVisuals(props: Props) {
  const range=periodRange(props.file,props.period);
  const frames=(props.file?.frames??[]).filter(frame=>inRange(frame.t,range));
  const events=props.events.filter(event=>inRange(event.t,range));
  const passes=passSet(props.stats,props.team,range);
  const p={...props,events}; const colour=props.colours[props.team];
  const identity=props.team==="A"?props.teamA:props.teamB;
  const other=props.team==="A"?props.teamB:props.teamA;
  const opponentPasses=passSet(props.stats,props.team==="A"?"B":"A",range).length;
  let cards: React.ReactNode[]=[];
  if(props.tab==="ball")cards=[<Control key="control" {...p}/>,<Thirds key="thirds" frames={frames} team={props.team} colour={colour}/>,<SequenceLength key="sequence" {...p}/>,<Runs key="runs" frames={frames} team={props.team} colour={colour}/>,<Distance key="distance" players={props.players.filter(x=>x.team===props.team)} colour={colour}/>];
  if(props.tab==="pressing")cards=[<PressMap key="press" {...p} colour={colour}/>,<CounterPress key="counter" {...p}/>,props.lineDefending&&props.lineDefending.lineBreakCount!==0?<LineBreakHero key="breaks" data={props.lineDefending} matchId={props.matchId}/>:null];
  if(props.tab==="shape"){const line=props.lineDefending;cards=[line&&line.medianM!==null&&line.usualM!==null?<DeepAnswer key="depth" data={line}/>:<EvidenceUnavailable key="depth-empty" question="Did we defend too deep?" caption="Our defensive line compared with its usual height."/>,props.territory?<ShapeMultiples key="multiples" territory={props.territory} colour={colour} identity={identity}/>:<EvidenceUnavailable key="multiples-empty" question="How did our shape change?" caption="Observed moments show how our block expanded and contracted."/>,line?<ShapeOutcome key="outcome" lineDefending={line} colour={colour}/>:<EvidenceUnavailable key="outcome-empty" question="In which shape did we suffer?" caption="Defensive states compared with opponent outcomes."/>,line&&line.timeline.length?<LineTimeline key="timeline" data={line} matchId={props.matchId}/>:<EvidenceUnavailable key="timeline-empty" question="Where was our line over time?" caption="Defensive line height across the selected period."/>];}
  if(props.tab==="shooting")cards=[<ShotMap key="map" {...p}/>,<ShotSummary key="summary" {...p}/>,<EntriesConceded key="entries" {...p}/>];
  if(props.tab==="players")cards=[<PlayerCards key="players" {...p}/>];
  if(props.tab==="passes")cards=[<LaneEffectiveness key="lanes" passes={passes} colour={colour} identity={identity}/>,<BetterOption key="better" {...p} colour={colour}/>,<PassNetwork key="network" passes={passes} colour={colour} identity={identity} opponentPasses={opponentPasses}/>,<PassMap key="map" passes={passes} colour={colour} matchId={props.matchId}/>,<Interceptions key="interceptions" {...p} colour={colour}/>,<PassLog key="log" passes={passes} matchId={props.matchId}/>];
  const shown=cards.filter(Boolean); return <StatsCardContext.Provider value={{identity,other,both:props.scopeBoth}}><div className="flex flex-col gap-3">{shown.length?shown:<EmptyTab/>}</div></StatsCardContext.Provider>;
}